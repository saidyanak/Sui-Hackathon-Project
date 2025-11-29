import { useEffect, useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { profileService } from '../services/profileService';
import { toast } from 'react-hot-toast';

/**
 * Otomatik Achievement Claim Hook
 *
 * Bu hook, kullanıcının profilini sürekli kontrol eder ve
 * yeni kazanılabilir achievement'lar varsa otomatik olarak claim eder.
 *
 * Kullanım:
 * const { autoClaim, setAutoClaim, claimableCount } = useAutoClaimAchievements(profileId);
 *
 * @param profileId - UserProfile object ID
 * @param enabled - Otomatik claim aktif mi? (default: false)
 * @param checkInterval - Kontrol aralığı (ms) (default: 30000 = 30 saniye)
 */
export function useAutoClaimAchievements(
  profileId: string | null,
  enabled: boolean = false,
  checkInterval: number = 30000
) {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [autoClaim, setAutoClaim] = useState(enabled);
  const [claimableCount, setClaimableCount] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [claimedAchievements, setClaimedAchievements] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    if (!profileId || !currentAccount?.address || !autoClaim) {
      return;
    }

    const checkAndClaim = async () => {
      if (claiming) return;

      try {
        // Profil bilgilerini getir
        const profile = await profileService.getProfile(profileId);
        if (!profile) return;

        // Eligible achievements kontrolü
        const eligible = profileService.checkAchievementEligibility(profile);
        setClaimableCount(eligible.length);

        // Eğer auto-claim aktifse ve claim edilmemiş achievement varsa
        if (autoClaim && eligible.length > 0) {
          for (const achievement of eligible) {
            // Daha önce claim edilmemişse
            if (!claimedAchievements.has(achievement.type)) {
              await claimAchievement(achievement.type, achievement.name);
              // Bir sonraki claim için bekle
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }
        }
      } catch (error) {
        console.error('Error checking achievements:', error);
      }
    };

    // İlk kontrol
    checkAndClaim();

    // Periyodik kontrol
    const interval = setInterval(checkAndClaim, checkInterval);

    return () => clearInterval(interval);
  }, [profileId, currentAccount, autoClaim, claiming, checkInterval]);

  const claimAchievement = async (achievementType: number, achievementName: string) => {
    if (!profileId || claiming) return;

    try {
      setClaiming(true);

      const tx = await profileService.claimAchievement(profileId, achievementType);

      return new Promise<void>((resolve, reject) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: () => {
              toast.success(`🎉 ${achievementName} NFT otomatik claim edildi!`, {
                duration: 5000,
                icon: '🏆',
              });

              // Bu achievement'ı claimed listesine ekle
              setClaimedAchievements((prev) => new Set([...prev, achievementType]));
              setClaimableCount((prev) => Math.max(0, prev - 1));

              setClaiming(false);
              resolve();
            },
            onError: (error) => {
              console.error('Auto claim error:', error);
              toast.error(`${achievementName} otomatik claim edilemedi`);
              setClaiming(false);
              reject(error);
            },
          }
        );
      });
    } catch (error) {
      setClaiming(false);
      throw error;
    }
  };

  return {
    autoClaim,
    setAutoClaim,
    claimableCount,
    claiming,
  };
}

/**
 * Manuel Claim Hook (Daha kontrollü)
 *
 * Kullanıcı istediği zaman claim edebilir, otomatik değil
 */
export function useManualClaimAchievements(profileId: string | null) {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [claimableAchievements, setClaimableAchievements] = useState<any[]>([]);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const checkEligibility = async () => {
    if (!profileId || !currentAccount?.address) {
      setClaimableAchievements([]);
      return;
    }

    try {
      setLoading(true);

      const profile = await profileService.getProfile(profileId);
      if (!profile) {
        setClaimableAchievements([]);
        return;
      }

      const eligible = profileService.checkAchievementEligibility(profile);
      setClaimableAchievements(eligible);
    } catch (error) {
      console.error('Error checking eligibility:', error);
      setClaimableAchievements([]);
    } finally {
      setLoading(false);
    }
  };

  const claimAchievement = async (achievementType: number) => {
    if (!profileId || claiming !== null) return;

    try {
      setClaiming(achievementType);

      const tx = await profileService.claimAchievement(profileId, achievementType);

      return new Promise<void>((resolve, reject) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: () => {
              toast.success('Achievement NFT claim edildi! 🎉');

              // Eligible listesinden kaldır
              setClaimableAchievements((prev) =>
                prev.filter((a) => a.type !== achievementType)
              );

              setClaiming(null);
              resolve();
            },
            onError: (error) => {
              console.error('Claim error:', error);
              toast.error('Claim işlemi başarısız');
              setClaiming(null);
              reject(error);
            },
          }
        );
      });
    } catch (error) {
      setClaiming(null);
      throw error;
    }
  };

  return {
    claimableAchievements,
    claiming,
    loading,
    checkEligibility,
    claimAchievement,
  };
}
