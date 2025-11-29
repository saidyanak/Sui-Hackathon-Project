import { Router } from 'express';
import prisma from '../config/database';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Update user wallet address
router.post('/wallet', authMiddleware, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const userId = (req.user as any).id;

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

// Get user profiles by a list of wallet addresses
router.post('/profiles-by-wallets', async (req, res) => {
  try {
    const { addresses } = req.body;

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty addresses array' });
    }

    const users = await prisma.user.findMany({
      where: {
        suiWalletAddress: {
          in: addresses,
        },
      },
      select: {
        suiWalletAddress: true,
        username: true,
        avatar: true,
        firstName: true,
        lastName: true,
      },
    });

    res.json(users);
  } catch (error) {
    console.error('Failed to fetch user profiles:', error);
    res.status(500).json({ error: 'Failed to fetch user profiles' });
  }
});

export default router;
