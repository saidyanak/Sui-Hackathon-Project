import { Router } from 'express';
import prisma from '../config/database';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Update user wallet address
router.post('/wallet', authMiddleware, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const userId = (req.user as any).userId;

    await prisma.user.update({
      where: { id: userId },
      data: { suiWalletAddress: walletAddress },
    });

    res.json({ success: true, walletAddress });
  } catch (error) {
    console.error('Failed to update wallet address:', error);
    res.status(500).json({ error: 'Failed to update wallet address' });
  }
});

export default router;
