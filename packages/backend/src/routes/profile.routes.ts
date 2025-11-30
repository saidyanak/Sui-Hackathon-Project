import { Router } from 'express';
import { Transaction } from '@mysten/sui/transactions';
import { authMiddleware } from '../middlewares/auth.middleware';
import { executeSponsoredTransaction, PACKAGE_ID, PROFILE_REGISTRY_ID } from '../config/sponsor';
import prisma from '../config/database';

const router = Router();

// Kullanıcı stats'larını getir
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    
    const userData: any = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        nftAchievements: true,
      },
    });

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Claimed achievement type'larını number array olarak döndür
    const claimedAchievements = (userData.nftAchievements || []).map((a: any) => parseInt(a.achievementType));

    res.json({
      success: true,
      stats: {
        tasksCreated: userData.tasksCreated || 0,
        tasksParticipated: userData.tasksParticipated || 0,
        votesCount: userData.votesCount || 0,
        donationsCount: userData.donationsCount || 0,
        totalDonated: userData.totalDonated?.toString() || '0',
        reputationScore: userData.reputationScore || 0,
      },
      profileId: userData.profileId,
      claimedAchievements,
      nftAchievements: userData.nftAchievements,
    });
  } catch (error) {
    console.error('Failed to get user stats:', error);
    res.status(500).json({ error: 'Failed to get stats', details: (error as Error).message });
  }
});

// Topluluk bağışı stats güncelleme
router.post('/add-donation', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Geçerli bir miktar girin' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        donationsCount: { increment: 1 },
        totalDonated: { increment: BigInt(amount) },
        reputationScore: { increment: 15 },
      },
    });

    res.json({ success: true, message: 'Bağış kaydedildi' });
  } catch (error) {
    console.error('Failed to add donation:', error);
    res.status(500).json({ error: 'Bağış kaydedilemedi' });
  }
});

// Sponsorlu profil oluşturma (yeni kullanıcılar için)
router.post('/create-sponsored', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;

    // Kullanıcının zaten profili varsa hata döndür
    if (user.profileId) {
      return res.status(400).json({ error: 'Profile already exists', profileId: user.profileId });
    }

    const { intraId, email, displayName } = req.body;

    if (!intraId || !email || !displayName) {
      // Eğer gönderilmediyse user objesinden al
      const intraIdValue = intraId || String(user.intraId || '');
      const emailValue = email || user.email;
      const displayNameValue = displayName || user.username;

      if (!intraIdValue || !emailValue || !displayNameValue) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Build transaction - sponsorlu profil oluşturma
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::profile::create_profile_sponsored`,
        arguments: [
          tx.object(PROFILE_REGISTRY_ID),
          tx.pure.address(user.realWalletAddress), // Kullanıcının zkLogin wallet adresi
          tx.pure.string(intraIdValue),
          tx.pure.string(emailValue),
          tx.pure.string(displayNameValue),
        ],
      });

      // Execute with sponsor wallet (backend pays gas)
      const result = await executeSponsoredTransaction(tx);

      // Extract profile ID from object changes
      const profileObject: any = result.objectChanges?.find(
        (obj: any) =>
          obj.type === 'created' &&
          obj.objectType?.includes('::profile::UserProfile')
      );

      if (!profileObject || !profileObject.objectId) {
        throw new Error('Profile creation failed - no profile object found');
      }

      const profileId = (profileObject as any)?.objectId;

      // Update user in database with profileId
      await prisma.user.update({
        where: { id: user.id },
        data: { profileId },
      });

      res.json({
        success: true,
        profileId,
        digest: result.digest,
      });
    } else {
      // Build transaction - sponsorlu profil oluşturma
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::profile::create_profile_sponsored`,
        arguments: [
          tx.object(PROFILE_REGISTRY_ID),
          tx.pure.address(user.realWalletAddress), // Kullanıcının zkLogin wallet adresi
          tx.pure.string(intraId),
          tx.pure.string(email),
          tx.pure.string(displayName),
        ],
      });

      // Execute with sponsor wallet (backend pays gas)
      const result = await executeSponsoredTransaction(tx);

      // Extract profile ID from object changes
      const profileObject: any = result.objectChanges?.find(
        (obj: any) =>
          obj.type === 'created' &&
          obj.objectType?.includes('::profile::UserProfile')
      );

      if (!profileObject || !profileObject.objectId) {
        throw new Error('Profile creation failed - no profile object found');
      }

      const profileId = (profileObject as any)?.objectId;

      // Update user in database with profileId
      await prisma.user.update({
        where: { id: user.id },
        data: { profileId },
      });

      res.json({
        success: true,
        profileId,
        digest: result.digest,
      });
    }
  } catch (error) {
    console.error('Failed to create sponsored profile:', error);
    res.status(500).json({ error: 'Failed to create profile', details: (error as Error).message });
  }
});

// Tüm kullanıcılar için profil oluşturma (migration)
router.post('/migrate-all', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        realWalletAddress: { not: null },
        profileId: null, // Henüz profili olmayanlar
      },
    });

    const results = [];

    for (const user of users) {
      try {
        const tx = new Transaction();
        tx.moveCall({
          target: `${PACKAGE_ID}::profile::create_profile_sponsored`,
          arguments: [
            tx.object(PROFILE_REGISTRY_ID),
            tx.pure.address(user.realWalletAddress), // Kullanıcının zkLogin wallet adresi
            tx.pure.string(String(user.intraId || '')),
            tx.pure.string(user.email),
            tx.pure.string(user.username || ''),
          ],
        });

        const result = await executeSponsoredTransaction(tx);

        // Extract profile ID
        const profileObject: any = result.objectChanges?.find(
          (obj: any) =>
            obj.type === 'created' &&
            obj.objectType?.includes('::profile::UserProfile')
        );

        if (profileObject && (profileObject as any).objectId) {
          await prisma.user.update({
            where: { id: user.id },
            data: { profileId: (profileObject as any).objectId },
          });
          results.push({
            userId: user.id,
            email: user.email,
            profileId: (profileObject as any).objectId,
            status: 'success',
          });
        } else {
          results.push({
            userId: user.id,
            email: user.email,
            status: 'failed',
            error: 'No profile object found',
          });
        }
      } catch (error) {
        results.push({
          userId: user.id,
          email: user.email,
          status: 'error',
          error: (error as Error).message,
        });
      }
    }

    res.json({
      success: true,
      migrated: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status !== 'success').length,
      results,
    });
  } catch (error) {
    console.error('Failed to migrate users:', error);
    res.status(500).json({ error: 'Migration failed', details: (error as Error).message });
  }
});

// Sponsorlu NFT claim - Wallet bağlamadan achievement NFT al
router.post('/claim-nft-sponsored', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { achievementType } = req.body;

    console.log('NFT Claim request:', { achievementType, walletAddress: user.realWalletAddress });

    if (achievementType === undefined) {
      return res.status(400).json({ error: 'Achievement type is required' });
    }

    // Bu achievement zaten claim edilmiş mi kontrol et
    const existingClaim = await prisma.nFTAchievement.findFirst({
      where: {
        userId: user.id,
        achievementType: String(achievementType),
      },
    });

    if (existingClaim) {
      return res.status(400).json({ 
        error: 'Bu achievement zaten claim edilmiş!',
        nftId: existingClaim.nftObjectId,
      });
    }

    // Kullanıcının wallet adresi olmalı
    const userWalletAddress = user.realWalletAddress;
    if (!userWalletAddress) {
      return res.status(400).json({ error: 'User wallet address not found. Please login again.' });
    }

    // Backend'den user stats al
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        tasksCreated: true,
        tasksParticipated: true,
        votesCount: true,
        donationsCount: true,
        totalDonated: true,
        reputationScore: true,
      },
    });

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Eligibility check (backend'de)
    const stats = {
      tasksCreated: userData.tasksCreated || 0,
      tasksParticipated: userData.tasksParticipated || 0,
      votesCount: userData.votesCount || 0,
      donationsCount: userData.donationsCount || 0,
      totalDonated: Number(userData.totalDonated || 0),
      reputationScore: userData.reputationScore || 0,
    };

    // Achievement eligibility kontrolü
    let eligible = false;
    switch (achievementType) {
      case 0: // First Task (allow after first participation OR first creation)
        eligible = stats.tasksParticipated >= 1 || stats.tasksCreated >= 1;
        break;
      case 1: // First Donation
        eligible = stats.donationsCount >= 1;
        break;
      case 2: // Task Creator
        eligible = stats.tasksCreated >= 1;
        break;
      case 3: // Generous Donor (10 SUI = 10_000_000_000 MIST)
        eligible = stats.totalDonated >= 10_000_000_000;
        break;
      case 4: // Active Participant (10+ tasks)
        eligible = stats.tasksParticipated >= 10;
        break;
      case 5: // Community Leader (5+ tasks created)
        eligible = stats.tasksCreated >= 5;
        break;
      case 6: // Supporter (20+ donations)
        eligible = stats.donationsCount >= 20;
        break;
      case 7: // Super Volunteer (50+ tasks)
        eligible = stats.tasksParticipated >= 50;
        break;
      case 8: // Legendary
        eligible = stats.reputationScore >= 100 && stats.tasksParticipated >= 20;
        break;
      default:
        return res.status(400).json({ error: 'Invalid achievement type' });
    }

    if (!eligible) {
      return res.status(400).json({ 
        error: 'Not eligible for this achievement',
        stats,
        requiredFor: achievementType,
      });
    }

    console.log('Executing NFT claim with direct mint:', { 
      userWalletAddress, 
      achievementType, 
      stats,
      packageId: PACKAGE_ID 
    });

    // Direct NFT mint - UserProfile kullanmadan
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::nft::mint_achievement_direct_sponsored`,
      arguments: [
        tx.pure.address(userWalletAddress),
        tx.pure.u8(achievementType),
        tx.pure.u64(stats.tasksParticipated), // tasks_completed
        tx.pure.u64(stats.donationsCount),    // donations_made
        tx.pure.u64(stats.totalDonated),      // total_donated
        tx.pure.u64(stats.reputationScore),   // reputation_score
      ],
    });

    const result = await executeSponsoredTransaction(tx);

    // NFT object ID'yi bul
    const nftObject: any = result.objectChanges?.find(
      (obj: any) =>
        obj.type === 'created' &&
        obj.objectType?.includes('::nft::AchievementNFT')
    );

    // Achievement isimlerini tanımla
    const achievementNames = [
      'İlk Görev',
      'İlk Bağış', 
      'Görev Oluşturucu',
      'Cömert Bağışçı',
      'Aktif Katılımcı',
      'Topluluk Lideri',
      'Destekçi',
      'Süper Gönüllü',
      'Efsanevi 42'
    ];

    // NFTAchievement tablosuna kaydet
    await prisma.nFTAchievement.create({
      data: {
        userId: user.id,
        nftObjectId: (nftObject as any)?.objectId || null,
        achievementType: String(achievementType),
        imageUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=achievement-${achievementType}`,
      },
    });

    res.json({
      success: true,
      digest: result.digest,
      nftId: (nftObject as any)?.objectId || null,
      achievementName: achievementNames[achievementType] || 'Achievement',
      message: 'Achievement NFT başarıyla claim edildi!',
    });
  } catch (error) {
    console.error('Failed to claim NFT:', error);
    res.status(500).json({ error: 'Failed to claim NFT', details: (error as Error).message });
  }
});

export default router;
