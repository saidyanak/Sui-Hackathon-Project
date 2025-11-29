import { Router } from 'express';
import { Transaction } from '@mysten/sui/transactions';
import { authMiddleware } from '../middlewares/auth.middleware';
import { suiClient, sponsorKeypair, executeSponsoredTransaction, PACKAGE_ID } from '../config/sponsor';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import prisma from '../config/database';

const router = Router();

// Sponsorlu task oluşturma - Backend hem oluşturur hem gas öder
router.post('/create-sponsored', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { title, description, taskType, budgetAmount, participantLimit, votingEndDate } = req.body;

    // Validation
    if (!title || !description || taskType === undefined || !votingEndDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Kullanıcının wallet adresi olmalı
    const userWalletAddress = user.suiWalletAddress;
    if (!userWalletAddress) {
      return res.status(400).json({ error: 'User wallet address not found. Please login again.' });
    }

    // Create sponsored task transaction
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::task::create_task_sponsored`,
      arguments: [
        tx.pure.address(userWalletAddress),  // creator_address
        tx.pure.string(title),
        tx.pure.string(description),
        tx.pure.u8(taskType),
        tx.pure.u64(budgetAmount || 0),
        tx.pure.u64(participantLimit || 0), // max_participants (0 = sınırsız)
        tx.pure.u64(new Date(votingEndDate).getTime()),
      ],
    });

    // Execute with sponsor wallet (backend pays gas)
    const result = await executeSponsoredTransaction(tx);

    // Extract task ID from object changes
    const taskObject = result.objectChanges?.find(
      (obj: any) =>
        obj.type === 'created' &&
        obj.objectType?.includes('::task::Task')
    );

    if (!taskObject || !taskObject.objectId) {
      throw new Error('Task creation failed - no task object found');
    }

    const taskId = taskObject.objectId;

    // User stats güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tasksCreated: { increment: 1 },
        reputationScore: { increment: 10 },
      },
    });

    res.json({
      success: true,
      taskId,
      digest: result.digest,
      creator: userWalletAddress,
    });
  } catch (error) {
    console.error('Failed to create sponsored task:', error);
    res.status(500).json({ error: 'Failed to create task', details: (error as Error).message });
  }
});

// Sponsorlu oy kullanma - Yeni sponsored fonksiyon ile
router.post('/:taskId/vote-sponsored', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { voteType } = req.body;
    const user = (req as any).user;

    if (voteType === undefined || !taskId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate vote type (0: NO, 1: YES)
    if (![0, 1].includes(voteType)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    // Kullanıcının wallet adresi olmalı
    const userWalletAddress = user.suiWalletAddress;
    if (!userWalletAddress) {
      return res.status(400).json({ error: 'User wallet address not found. Please login again.' });
    }

    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::task::vote_task_sponsored`,
      arguments: [
        tx.object(taskId),
        tx.pure.address(userWalletAddress), // voter_address
        tx.pure.u8(voteType),
      ],
    });

    const result = await executeSponsoredTransaction(tx);

    // User stats güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: {
        votesCount: { increment: 1 },
        reputationScore: { increment: 2 },
      },
    });

    res.json({
      success: true,
      digest: result.digest,
    });
  } catch (error) {
    console.error('Failed to vote on task:', error);
    res.status(500).json({ error: 'Failed to vote', details: (error as Error).message });
  }
});

// Sponsorlu task'a katılma
router.post('/:taskId/join-sponsored', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    const user = (req as any).user;

    if (!taskId) {
      return res.status(400).json({ error: 'Missing taskId' });
    }

    // Kullanıcının wallet adresi olmalı
    const userWalletAddress = user.suiWalletAddress;
    if (!userWalletAddress) {
      return res.status(400).json({ error: 'User wallet address not found. Please login again.' });
    }

    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::task::join_task_sponsored`,
      arguments: [
        tx.object(taskId),
        tx.pure.address(userWalletAddress), // participant_address
      ],
    });

    const result = await executeSponsoredTransaction(tx);

    // User stats güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tasksParticipated: { increment: 1 },
        reputationScore: { increment: 5 },
      },
    });

    res.json({
      success: true,
      digest: result.digest,
    });
  } catch (error) {
    console.error('Failed to join task:', error);
    res.status(500).json({ error: 'Failed to join task', details: (error as Error).message });
  }
});

// Sponsorlu yorum ekleme
router.post('/:taskId/comment-sponsored', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;
    const user = (req as any).user;

    if (!content || !taskId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Kullanıcının wallet adresi olmalı
    const userWalletAddress = user.suiWalletAddress;
    if (!userWalletAddress) {
      return res.status(400).json({ error: 'User wallet address not found. Please login again.' });
    }

    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::task::add_comment`,
      arguments: [
        tx.object(taskId),
        tx.pure.address(userWalletAddress),
        tx.pure.string(content)
      ],
    });

    const result = await executeSponsoredTransaction(tx);

    res.json({
      success: true,
      digest: result.digest,
    });
  } catch (error) {
    console.error('Failed to add sponsored comment:', error);
    res.status(500).json({ error: 'Failed to add comment', details: (error as Error).message });
  }
});

// Sponsor wallet adresini getir (frontend'in bağış göndereceği adres)
router.get('/sponsor-wallet', async (req, res) => {
  try {
    if (!sponsorKeypair) {
      return res.status(500).json({ error: 'Sponsor wallet not configured' });
    }
    
    const sponsorAddress = sponsorKeypair.getPublicKey().toSuiAddress();
    res.json({ 
      success: true, 
      sponsorAddress,
      message: 'Bu adrese bağış yapabilirsiniz. Bağışlarınız proje fonlarına aktarılacaktır.'
    });
  } catch (error) {
    console.error('Failed to get sponsor wallet:', error);
    res.status(500).json({ error: 'Failed to get sponsor wallet' });
  }
});

// Sponsorlu bağış - Kullanıcının bağışını sponsor wallet'a yönlendir ve task'a kaydet
router.post('/:taskId/donate-sponsored', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { amount, message } = req.body;
    const user = (req as any).user;

    if (!taskId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userWalletAddress = user.suiWalletAddress;
    if (!userWalletAddress) {
      return res.status(400).json({ error: 'User wallet address not found. Please login again.' });
    }

    // Bağış kaydını blockchain'e yaz (sponsor wallet ile)
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::task::record_donation_sponsored`,
      arguments: [
        tx.object(taskId),
        tx.pure.address(userWalletAddress), // donor address
        tx.pure.u64(amount), // amount in MIST
        tx.pure.string(message || 'Donation'),
      ],
    });

    const result = await executeSponsoredTransaction(tx);

    // User stats güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: {
        donationsCount: { increment: 1 },
        totalDonated: { increment: BigInt(amount) },
        reputationScore: { increment: 3 },
      },
    });

    res.json({
      success: true,
      digest: result.digest,
      sponsorAddress: sponsorKeypair?.getPublicKey().toSuiAddress(),
      message: 'Bağış kaydedildi. Lütfen SUI transferini sponsor adresine gönderin.'
    });
  } catch (error) {
    console.error('Failed to record donation:', error);
    res.status(500).json({ error: 'Failed to record donation', details: (error as Error).message });
  }
});

export default router;
