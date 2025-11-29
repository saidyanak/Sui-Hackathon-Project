import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { profileService } from '../services/profileService';
import { toast } from 'react-hot-toast';

// Achievement rarity colors
const RARITY_COLORS: { [key: string]: string } = {
  Common: 'from-gray-400 to-gray-600',
  Rare: 'from-blue-400 to-blue-600',
  Epic: 'from-purple-400 to-purple-600',
  Legendary: 'from-yellow-400 to-orange-600',
};

const RARITY_GLOW: { [key: string]: string } = {
  Common: 'shadow-gray-500/50',
  Rare: 'shadow-blue-500/50',
  Epic: 'shadow-purple-500/50',
  Legendary: 'shadow-yellow-500/50',
};

export default function ProfileNew() {
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [profile, setProfile] = useState<any>(null);
  const [nfts, setNFTs] = useState<any[]>([]);
  const [eligibleAchievements, setEligibleAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);

  // Profile ID'yi local storage'dan al veya registry'den bul
  const [profileId, setProfileId] = useState<string | null>(
    localStorage.getItem('userProfileId')
  );

  useEffect(() => {
    loadUserProfile();
  }, [currentAccount]);

  const loadUserProfile = async () => {
    if (!currentAccount?.address) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Eğer profileId yoksa, registry'den bul
      if (!profileId) {
        const registryId = import.meta.env.VITE_PROFILE_REGISTRY_ID;
        const foundProfileId = await profileService.findProfileByAddress(
          registryId,
          currentAccount.address
        );

        if (foundProfileId) {
          setProfileId(foundProfileId);
          localStorage.setItem('userProfileId', foundProfileId);
        } else {
          // Profil yok, oluşturması gerekiyor
          toast.error('Profil bulunamadı! Lütfen profil oluşturun.');
          setLoading(false);
          return;
        }
      }

      // Profil bilgilerini getir
      const userProfile = await profileService.getProfile(profileId);
      setProfile(userProfile);

      // NFT'leri getir
      const userNFTs = await profileService.getUserNFTs(currentAccount.address);
      setNFTs(userNFTs);

      // Eligible achievements kontrolü
      const eligible = profileService.checkAchievementEligibility(userProfile);
      setEligibleAchievements(eligible);

      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Profil yüklenirken hata oluştu');
      setLoading(false);
    }
  };

  const handleClaimAchievement = async (achievementType: number) => {
    if (!profileId) {
      toast.error('Profil ID bulunamadı');
      return;
    }

    try {
      setClaiming(achievementType);

      const tx = await profileService.claimAchievement(profileId, achievementType);

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: () => {
            toast.success('Achievement NFT claim edildi! 🎉');
            // Reload profile data
            setTimeout(() => loadUserProfile(), 2000);
          },
          onError: (error) => {
            console.error('Claim error:', error);
            toast.error('Claim işlemi başarısız');
          },
        }
      );
    } catch (error) {
      console.error('Error claiming achievement:', error);
      toast.error('Achievement claim edilemedi');
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1A2F] via-[#0C2238] to-[#071018] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-16 w-16 border-4 border-[#2AA5FE] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[#8BD7FF]">Profil yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1A2F] via-[#0C2238] to-[#071018] text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Profil Bulunamadı</h2>
          <p className="text-gray-400 mb-6">
            Henüz bir profiliniz yok. Lütfen önce profil oluşturun.
          </p>
          <button
            onClick={() => navigate('/profile/create')}
            className="bg-[#2AA5FE] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#53bfff] transition"
          >
            Profil Oluştur
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1A2F] via-[#0C2238] to-[#071018] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#8BD7FF]">Profilim</h1>
          <button
            onClick={() => navigate('/')}
            className="text-gray-300 hover:text-white transition"
          >
            ← Ana Sayfa
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Profile Overview */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 mb-8">
          <div className="flex items-start gap-8">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#2AA5FE] to-[#8BD7FF] flex items-center justify-center text-5xl font-bold text-white shadow-xl">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-yellow-500 rounded-full px-3 py-1 text-xs font-bold text-black shadow-lg">
                ⭐ {profile.reputationScore}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-[#8BD7FF] mb-2">
                {profile.displayName}
              </h2>
              <p className="text-gray-400 mb-1">{profile.email}</p>
              <p className="text-gray-500 text-sm mb-4">42 Intra: {profile.intraId}</p>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#2AA5FE]">
                    {profile.stats.tasksCreated}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Oluşturulan</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {profile.stats.tasksCompleted}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Tamamlanan</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-purple-400">
                    {profile.stats.tasksParticipated}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Katılım</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-orange-400">
                    {(profile.stats.totalDonatedAmount / 1_000_000_000).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">SUI Bağış</p>
                </div>
              </div>

              {/* Secondary Stats */}
              <div className="flex gap-6 mt-4 text-sm">
                <div>
                  <span className="text-gray-400">Oy Sayısı:</span>{' '}
                  <span className="text-white font-semibold">
                    {profile.stats.votesCast}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Onaylanan Proposal:</span>{' '}
                  <span className="text-white font-semibold">
                    {profile.stats.proposalsApproved}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Bağış Sayısı:</span>{' '}
                  <span className="text-white font-semibold">
                    {profile.stats.donationsMade}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Claimable Achievements */}
        {eligibleAchievements.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#2AA5FE] mb-4 flex items-center gap-2">
              🎁 Kazanılabilir Achievement'lar
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {eligibleAchievements.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eligibleAchievements.map((achievement) => (
                <div
                  key={achievement.type}
                  className="bg-white/10 backdrop-blur-xl border-2 border-yellow-500/50 rounded-xl p-6 hover:border-yellow-500 transition animate-pulse"
                >
                  <h3 className="text-lg font-bold text-yellow-400 mb-2">
                    {achievement.name}
                  </h3>
                  <p className="text-gray-300 text-sm mb-4">
                    {achievement.description}
                  </p>
                  <button
                    onClick={() => handleClaimAchievement(achievement.type)}
                    disabled={claiming === achievement.type}
                    className="w-full bg-yellow-500 text-black font-bold py-2 rounded-lg hover:bg-yellow-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {claiming === achievement.type ? 'Claim ediliyor...' : '🏆 Claim Et'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NFT Collection */}
        <div>
          <h2 className="text-2xl font-bold text-[#2AA5FE] mb-4">
            NFT Koleksiyonu ({nfts.length})
          </h2>

          {nfts.length === 0 ? (
            <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center">
              <p className="text-gray-400 text-lg">Henüz NFT'niz yok</p>
              <p className="text-gray-500 text-sm mt-2">
                Task'lara katılıp tamamlayarak achievement kazanın!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nfts.map((nft) => {
                const rarity = nft.metadata?.rarity || 'Common';
                return (
                  <div
                    key={nft.id}
                    className={`bg-gradient-to-br ${RARITY_COLORS[rarity]} rounded-xl p-1 shadow-xl hover:scale-105 transition transform ${RARITY_GLOW[rarity]}`}
                  >
                    <div className="bg-[#0C2238] rounded-lg p-6">
                      {/* Image */}
                      {nft.imageUrl && (
                        <img
                          src={nft.imageUrl}
                          alt={nft.name}
                          className="w-full h-48 object-cover rounded-lg mb-4"
                        />
                      )}

                      {/* Name & Rarity */}
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-bold text-white">{nft.name}</h3>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r ${RARITY_COLORS[rarity]}`}
                        >
                          {rarity}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-gray-300 text-sm mb-4">{nft.description}</p>

                      {/* Metadata Stats */}
                      {nft.metadata && (
                        <div className="bg-white/10 rounded-lg p-3 text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Tasks Completed:</span>
                            <span className="text-white font-semibold">
                              {nft.metadata.tasksCompleted}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Donations:</span>
                            <span className="text-white font-semibold">
                              {nft.metadata.donationsMade}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Reputation:</span>
                            <span className="text-white font-semibold">
                              {nft.metadata.reputationScore}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Earned At */}
                      <p className="text-gray-500 text-xs mt-3">
                        Kazanıldı: {new Date(nft.earnedAt).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
