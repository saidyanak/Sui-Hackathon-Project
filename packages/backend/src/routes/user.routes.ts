import { Router } from 'express';
import prisma from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middlewares/auth.middleware';
const router = Router();
// Achievement ve NFT mintleme endpointi
router.post('/mint-achievement', authMiddleware, async (req, res) => {
  try {
    const { achievementType, taskId, tasksCompleted, donationsMade, totalDonatedAmount } = req.body;
    const user = req.user as any;
    if (!user.suiWalletAddress) {
      return res.status(400).json({ error: 'Kullanıcının Sui wallet adresi yok.' });
    }

    // Move contract ile NFT mintle (örnek, gerçek Move fonksiyonunu çağırmak için Sui SDK ile entegrasyon gerekir)
    // Burada Move fonksiyonunu çağırdığını varsayalım
    // const result = await callMoveMintAchievement(...);

    // Benzersiz NFT ObjectId üret
    const nftObjectId = uuidv4();

    // Veritabanına NFTAchievement kaydı ekle
    try {
      const nftAchievement = await prisma.nFTAchievement.create({
        data: {
          userId: user.id,
          achievementType: achievementType,
          taskId: taskId,
          nftObjectId: nftObjectId, // Benzersiz NFT objesi
          metadataUrl: '',
          imageUrl: '',
        },
      });
      res.json({ success: true, nftAchievement });
    } catch (prismaError: any) {
      if (prismaError.code === 'P2002') {
        return res.status(409).json({ error: 'Bu NFT zaten mintlenmiş. Benzersiz bir NFT oluşturun.' });
      }
      throw prismaError;
    }
  } catch (error) {
    console.error('Failed to mint achievement NFT:', error);
    res.status(500).json({ error: 'Failed to mint achievement NFT' });
  }
});
// Achievement ve NFT mintleme endpointi
router.post('/mint-achievement', authMiddleware, async (req, res) => {
  try {
    const { achievementType, taskId, tasksCompleted, donationsMade, totalDonatedAmount } = req.body;
    const user = req.user as any;
    if (!user.suiWalletAddress) {
      return res.status(400).json({ error: 'Kullanıcının Sui wallet adresi yok.' });
    }

    // Move contract ile NFT mintle (örnek, gerçek Move fonksiyonunu çağırmak için Sui SDK ile entegrasyon gerekir)
    // Burada Move fonksiyonunu çağırdığını varsayalım
    // const result = await callMoveMintAchievement(...);

    // Veritabanına NFTAchievement kaydı ekle
    const prisma = require('../config/database').default;
    const nftAchievement = await prisma.nFTAchievement.create({
      data: {
        userId: user.id,
        achievementType: achievementType,
        taskId: taskId,
        nftObjectId: 'move_nft_id', // Move'dan dönen NFT objesinin ID'si
        metadataUrl: '',
        imageUrl: '',
      },
    });

    res.json({ success: true, nftAchievement });
  } catch (error) {
    console.error('Failed to mint achievement NFT:', error);
    res.status(500).json({ error: 'Failed to mint achievement NFT' });
  }
});

// Update user's real wallet address (when they connect Sui Wallet)
router.post('/wallet', authMiddleware, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const userId = (req.user as any).id;

    // Real wallet is saved separately from virtual wallet
    // suiWalletAddress = Virtual wallet (for sponsored transactions)
    // realWalletAddress = Real wallet (user's connected wallet)
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
