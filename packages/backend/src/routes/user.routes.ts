import { Router } from 'express';
import prisma from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Achievement ve NFT mintleme endpointi (tek, temiz versiyon)
router.post('/mint-achievement', authMiddleware, async (req, res) => {
  try {
    const { achievementType, taskId } = req.body;
    const user = req.user as any;

    if (!user.realWalletAddress) {
      return res.status(400).json({ error: 'zkLogin cüzdanı bağlı değil. Lütfen giriş yapın.' });
    }

    // Benzersiz NFT ObjectId üret
    const nftObjectId = uuidv4();

    // Veritabanına NFTAchievement kaydı ekle
    try {
      const nftAchievement = await prisma.nFTAchievement.create({
        data: {
          userId: user.id,
          achievementType: achievementType,
          taskId: taskId,
          nftObjectId: nftObjectId,
          metadataUrl: '',
          imageUrl: '',
        },
      });
      res.json({ success: true, nftAchievement });
    } catch (prismaError: any) {
      if (prismaError.code === 'P2002') {
        return res.status(409).json({ error: 'Bu NFT zaten mintlenmiş.' });
      }
      throw prismaError;
    }
  } catch (error) {
    console.error('Failed to mint achievement NFT:', error);
    res.status(500).json({ error: 'NFT mintleme başarısız' });
  }
});

// Update user's real wallet address (when they connect Sui Wallet)
router.post('/wallet', authMiddleware, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const userId = (req.user as any).id;

    // realWalletAddress = zkLogin cüzdanı (tek cüzdan)
    await prisma.user.update({
      where: { id: userId },
      data: { realWalletAddress: walletAddress },
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
        realWalletAddress: {
          in: addresses,
        },
      },
      select: {
        realWalletAddress: true,
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

// Leaderboard - En çok katkıda bulunanlar
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        realWalletAddress: { not: null },
      },
      select: {
        realWalletAddress: true,
        username: true,
        avatar: true,
        tasksCreated: true,
        tasksParticipated: true,
        votesCount: true,
        donationsCount: true,
        totalDonated: true,
        reputationScore: true,
      },
      orderBy: [
        { reputationScore: 'desc' },
        { totalDonated: 'desc' },
      ],
      take: 50, // Top 50
    });

    // BigInt'leri string'e çevir
    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      address: user.realWalletAddress,
      username: user.username,
      avatar: user.avatar,
      tasksCreated: user.tasksCreated || 0,
      tasksParticipated: user.tasksParticipated || 0,
      votesCount: user.votesCount || 0,
      donationsCount: user.donationsCount || 0,
      totalDonated: user.totalDonated?.toString() || '0',
      reputationScore: user.reputationScore || 0,
    }));

    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
