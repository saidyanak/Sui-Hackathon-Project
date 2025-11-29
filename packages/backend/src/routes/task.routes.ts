import { Router } from 'express';
import { Transaction } from '@mysten/sui/transactions';
import { authMiddleware } from '../middlewares/auth.middleware';
import { executeSponsoredTransaction, PACKAGE_ID } from '../config/sponsor';

const router = Router();

// Sponsorlu task oluşturma (kullanıcı wallet'a ihtiyaç duymaz, backend gas öder)
router.post('/create-sponsored', authMiddleware, async (req, res) => {
  try {
    const { title, description, taskType, targetAmount, endDate } = req.body;

    if (!title || !description || taskType === undefined || !endDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate task type
    if (![0, 1, 2].includes(taskType)) {
      return res.status(400).json({ error: 'Invalid task type' });
    }

    const endDateTime = new Date(endDate).getTime();
    const targetAmountInMist = taskType !== 1
      ? Math.floor(parseFloat(targetAmount || '0') * 1_000_000_000)
      : 0;

    // Build transaction
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::task::create_task`,
      arguments: [
        tx.pure.string(title),
        tx.pure.string(description),
        tx.pure.u8(taskType),
        tx.pure.u64(targetAmountInMist),
        tx.pure.u64(endDateTime),
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

// Sponsorlu yorum ekleme
router.post('/:taskId/comment-sponsored', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;
    const user = (req as any).user;

    if (!content || !taskId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Kullanıcının wallet adresi olmalı (yoksa virtual wallet oluştur)
    let userWalletAddress = user.suiWalletAddress;

    if (!userWalletAddress) {
      // Eğer virtual wallet yoksa oluştur ve kaydet
      const { Ed25519Keypair } = await import('@mysten/sui/keypairs/ed25519');
      const keypair = Ed25519Keypair.generate();
      userWalletAddress = keypair.getPublicKey().toSuiAddress();

      await import('../config/database').then(({ default: prisma }) =>
        prisma.user.update({
          where: { id: user.id },
          data: { suiWalletAddress: userWalletAddress },
        })
      );
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
