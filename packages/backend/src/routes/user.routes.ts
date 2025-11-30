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

export default router;
