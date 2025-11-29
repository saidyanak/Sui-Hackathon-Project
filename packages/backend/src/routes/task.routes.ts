import { Router } from 'express';
import { Transaction } from '@mysten/sui/transactions';
import { authMiddleware } from '../middlewares/auth.middleware';
import { executeSponsoredTransaction, PACKAGE_ID } from '../config/sponsor';

const router = Router();

// Sponsorlu task oluşturma (kullanıcı wallet'a ihtiyaç duymaz, backend gas öder)
router.post('/create-sponsored', authMiddleware, async (req, res) => {
  try {
    const { title, description, taskType, budgetAmount, minParticipants, maxParticipants, votingEndDate } = req.body;

    if (!title || !description || taskType === undefined || !votingEndDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate task type (0: PARTICIPATION, 1: PROPOSAL)
    if (![0, 1].includes(taskType)) {
      return res.status(400).json({ error: 'Invalid task type' });
    }

    const votingEndDateTime = new Date(votingEndDate).getTime();
    const budgetAmountInMist = taskType === 1
      ? Math.floor(parseFloat(budgetAmount || '0') * 1_000_000_000)
      : 0;

    const minParticipantsCount = parseInt(minParticipants || '0');
    const maxParticipantsCount = parseInt(maxParticipants || '0');

    // Build transaction
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::task::create_task`,
      arguments: [
        tx.pure.string(title),
        tx.pure.string(description),
        tx.pure.u8(taskType),
        tx.pure.u64(budgetAmountInMist),
        tx.pure.u64(minParticipantsCount),
        tx.pure.u64(maxParticipantsCount),
        tx.pure.u64(votingEndDateTime),
      ],
    });

    // Execute with sponsor wallet (backend pays gas)
    const result = await executeSponsoredTransaction(tx);

    res.json({
      success: true,
      digest: result.digest,
      effects: result.effects,
      objectChanges: result.objectChanges,
    });
  } catch (error) {
    console.error('Failed to create sponsored task:', error);
    res.status(500).json({ error: 'Failed to create task', details: (error as Error).message });
  }
});

// Sponsorlu oy kullanma
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

    // Kullanıcının wallet adresi olmalı (her kullanıcı giriş yaparken otomatik alır)
    const userWalletAddress = user.suiWalletAddress;

    if (!userWalletAddress) {
      return res.status(400).json({ error: 'User wallet address not found. Please login again.' });
    }

    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::task::vote_task`,
      arguments: [
        tx.object(taskId),
        tx.pure.address(userWalletAddress), // Kullanıcının wallet adresi
        tx.pure.u8(voteType),
      ],
    });

    const result = await executeSponsoredTransaction(tx);

    res.json({
      success: true,
      digest: result.digest,
    });
  } catch (error) {
    console.error('Failed to vote on task:', error);
    res.status(500).json({ error: 'Failed to vote', details: (error as Error).message });
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

    // Kullanıcının wallet adresi olmalı (her kullanıcı giriş yaparken otomatik alır)
    const userWalletAddress = user.suiWalletAddress;

    if (!userWalletAddress) {
      return res.status(400).json({ error: 'User wallet address not found. Please login again.' });
    }

    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::task::add_comment`,
      arguments: [
        tx.object(taskId),
        tx.pure.address(userWalletAddress), // Kullanıcının virtual wallet adresi
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

export default router;
