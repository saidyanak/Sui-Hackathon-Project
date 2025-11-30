import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { profileService } from '../services/profileService';
import { authService } from '../services/authService';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'react-hot-toast';
import api from '../services/api';

// Achievement tanımları
const ACHIEVEMENTS = [
  { type: 0, name: 'İlk Görev', description: 'İlk görevinizi tamamladınız', icon: '🎯', rarity: 'Common', requirement: 'İlk görevi tamamla' },
  { type: 1, name: 'İlk Bağış', description: 'İlk bağışınızı yaptınız', icon: '💝', rarity: 'Common', requirement: 'İlk bağışı yap' },
  { type: 2, name: 'Görev Oluşturucu', description: 'İlk görevinizi oluşturdunuz', icon: '📝', rarity: 'Rare', requirement: '1 görev oluştur' },
  { type: 3, name: 'Cömert Bağışçı', description: '10+ SUI bağışladınız', icon: '💎', rarity: 'Rare', requirement: '10 SUI bağışla' },
  { type: 4, name: 'Aktif Katılımcı', description: '10+ göreve katıldınız', icon: '⚡', rarity: 'Rare', requirement: '10 göreve katıl' },
  { type: 5, name: 'Topluluk Lideri', description: '5+ başarılı görev oluşturdunuz', icon: '👑', rarity: 'Epic', requirement: '5 onaylanan görev' },
  { type: 6, name: 'Destekçi', description: '20+ farklı göreve bağış yaptınız', icon: '🌟', rarity: 'Epic', requirement: '20 bağış yap' },
  { type: 7, name: 'Süper Gönüllü', description: '50+ görev tamamladınız', icon: '🏆', rarity: 'Legendary', requirement: '50 görev tamamla' },
  { type: 8, name: 'Efsanevi 42', description: 'Olağanüstü topluluk katkısı', icon: '🔥', rarity: 'Legendary', requirement: '100 rep + 20 görev' },
];

// Rarity renkleri
const RARITY_COLORS: { [key: string]: string } = {
  Common: 'from-gray-400 to-gray-600',
  Rare: 'from-blue-400 to-blue-600',
  Epic: 'from-purple-400 to-purple-600',
  Legendary: 'from-yellow-400 to-orange-600',
};

const RARITY_GLOW: { [key: string]: string } = {
  Common: 'shadow-gray-500/30',
  Rare: 'shadow-blue-500/50',
  Epic: 'shadow-purple-500/50',
  Legendary: 'shadow-yellow-500/50',
};

const RARITY_BG: { [key: string]: string } = {
  Common: 'bg-gray-500/20',
  Rare: 'bg-blue-500/20',
  Epic: 'bg-purple-500/20',
  Legendary: 'bg-yellow-500/20',
};

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [profile, setProfile] = useState<any>(null);
  const [nfts, setNFTs] = useState<any[]>([]);
  const [eligibleAchievements, setEligibleAchievements] = useState<any[]>([]);
  const [claimedAchievements, setClaimedAchievements] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'achievements' | 'nfts' | 'stats'>('achievements');

  // Profile ID'yi local storage'dan al
  const [profileId, setProfileId] = useState<string | null>(localStorage.getItem('userProfileId'));

  // Achievement eligibility hesapla - loadProfile'dan önce tanımlanmalı
  const calculateEligibleAchievements = (profile: any, claimed: number[] = []) => {
    if (!profile?.stats) return [];

    const eligible: any[] = [];
    // On-chain achievements + backend claimed achievements
    const earnedIds = [...(profile.achievements?.map((a: any) => a) || []), ...claimed];

    // İlk Görev (tasksParticipated veya tasksCompleted >= 1)
    if ((profile.stats.tasksCompleted >= 1 || profile.stats.tasksParticipated >= 1) && !earnedIds.includes(0)) {
      eligible.push(ACHIEVEMENTS[0]);
    }
    // İlk Bağış
    if (profile.stats.donationsMade >= 1 && !earnedIds.includes(1)) {
      eligible.push(ACHIEVEMENTS[1]);
    }
    // Görev Oluşturucu
    if (profile.stats.tasksCreated >= 1 && !earnedIds.includes(2)) {
      eligible.push(ACHIEVEMENTS[2]);
    }
    // Cömert Bağışçı (10 SUI = 10_000_000_000 MIST)
    if (profile.stats.totalDonatedAmount >= 10_000_000_000 && !earnedIds.includes(3)) {
      eligible.push(ACHIEVEMENTS[3]);
    }
    // Aktif Katılımcı
    if (profile.stats.tasksParticipated >= 10 && !earnedIds.includes(4)) {
      eligible.push(ACHIEVEMENTS[4]);
    }
    // Topluluk Lideri
    if (profile.stats.proposalsApproved >= 5 && !earnedIds.includes(5)) {
      eligible.push(ACHIEVEMENTS[5]);
    }
    // Destekçi
    if (profile.stats.donationsMade >= 20 && !earnedIds.includes(6)) {
      eligible.push(ACHIEVEMENTS[6]);
    }
    // Süper Gönüllü
    if (profile.stats.tasksCompleted >= 50 && !earnedIds.includes(7)) {
      eligible.push(ACHIEVEMENTS[7]);
    }
    // Efsanevi
    if (profile.reputationScore >= 100 && profile.stats.tasksCompleted >= 20 && !earnedIds.includes(8)) {
      eligible.push(ACHIEVEMENTS[8]);
    }

    return eligible;
  };

  useEffect(() => {
    loadProfile();
  }, [user, currentAccount]);

  const loadProfile = async () => {
    setLoading(true);

    try {
      // Backend'den user stats'larını al
      let backendStats = {
        tasksCreated: 0,
        tasksParticipated: 0,
        votesCount: 0,
        donationsCount: 0,
        totalDonated: '0',
        reputationScore: 0,
      };
      let claimed: number[] = [];

      try {
        const statsResponse = await api.get('/api/profile/stats');
        if (statsResponse.data.success) {
          backendStats = statsResponse.data.stats;
          // Claimed achievements'ları al
          claimed = statsResponse.data.claimedAchievements || [];
          setClaimedAchievements(claimed);
          // Backend'den profileId geliyorsa güncelle
          if (statsResponse.data.profileId && statsResponse.data.profileId !== profileId) {
            localStorage.setItem('userProfileId', statsResponse.data.profileId);
            setProfileId(statsResponse.data.profileId);
          }
        }
      } catch (e) {
        console.log('Backend stats not available:', e);
      }

      // 1. Önce on-chain profili dene (profileId varsa)
      const currentProfileId = localStorage.getItem('userProfileId');
      if (currentProfileId) {
        try {
          const onChainProfile = await profileService.getProfile(currentProfileId);
          if (onChainProfile) {
            // Backend stats'ları on-chain ile birleştir (backend'i öncelikli al)
            const mergedStats = {
              tasksCreated: backendStats.tasksCreated || onChainProfile.stats?.tasksCreated || 0,
              tasksCompleted: onChainProfile.stats?.tasksCompleted || 0,
              tasksParticipated: backendStats.tasksParticipated || onChainProfile.stats?.tasksParticipated || 0,
              donationsMade: backendStats.donationsCount || onChainProfile.stats?.donationsMade || 0,
              totalDonatedAmount: parseInt(backendStats.totalDonated) || onChainProfile.stats?.totalDonatedAmount || 0,
              votesCast: backendStats.votesCount || onChainProfile.stats?.votesCast || 0,
              proposalsApproved: onChainProfile.stats?.proposalsApproved || 0,
            };

            setProfile({
              ...onChainProfile,
              stats: mergedStats,
              reputationScore: backendStats.reputationScore || onChainProfile.reputationScore || 0,
              // Web2 bilgilerini ekle
              username: user?.username || onChainProfile.displayName,
              avatar: user?.avatar,
              firstName: user?.firstName,
              lastName: user?.lastName,
              email: user?.email || onChainProfile.email,
            });

            // NFT'leri yükle
            const walletAddress = currentAccount?.address || user?.realWalletAddress;
            if (walletAddress) {
              const userNFTs = await profileService.getUserNFTs(walletAddress);
              setNFTs(userNFTs);
            }

            // Eligible achievements hesapla (merged stats ile)
            const eligible = calculateEligibleAchievements({ ...onChainProfile, stats: mergedStats, reputationScore: backendStats.reputationScore }, claimed);
            setEligibleAchievements(eligible);

            setLoading(false);
            return;
          }
        } catch (profileError) {
          console.log('On-chain profile not found or invalid, will show Web2 profile:', profileError);
          // On-chain profil hatalıysa localStorage'dan sil
          localStorage.removeItem('userProfileId');
          setProfileId(null);
        }
      }

      // 2. On-chain profil yoksa, sadece Web2 bilgilerini ve backend stats'larını göster
      if (user) {
        const profileData = {
          id: null,
          displayName: user.username || `${user.firstName} ${user.lastName}` || user.email,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          firstName: user.firstName,
          lastName: user.lastName,
          intraId: user.intraId?.toString() || 'N/A',
          reputationScore: backendStats.reputationScore,
          stats: {
            tasksCreated: backendStats.tasksCreated,
            tasksCompleted: 0,
            tasksParticipated: backendStats.tasksParticipated,
            donationsMade: backendStats.donationsCount,
            totalDonatedAmount: parseInt(backendStats.totalDonated) || 0,
            votesCast: backendStats.votesCount,
            proposalsApproved: 0,
          },
          achievements: [],
          isWeb2Only: true, // On-chain profil yok
        };
        setProfile(profileData);
        
        // Eligible achievements hesapla (backend stats ile)
        const eligible = calculateEligibleAchievements(profileData, claimed);
        setEligibleAchievements(eligible);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Profil yüklenirken hata oluştu');
      setLoading(false);
    }
  };

  // On-chain profil oluştur
  const handleCreateProfile = async () => {
    if (!user) {
      toast.error('Giriş yapmanız gerekiyor');
      return;
    }

    try {
      setCreatingProfile(true);

      const response = await api.post('/api/profile/create-sponsored', {
        intraId: user.intraId?.toString() || '',
        email: user.email,
        displayName: user.username || user.firstName || user.email,
      });

      if (response.data.success) {
        toast.success('🎉 On-chain profil oluşturuldu!');
        // ProfileId'yi kaydet
        localStorage.setItem('userProfileId', response.data.profileId);
        setProfileId(response.data.profileId);
        // Profili yeniden yükle
        setTimeout(() => loadProfile(), 1000);
      } else {
        toast.error(response.data.error || 'Profil oluşturulamadı');
      }
    } catch (error: any) {
      console.error('Error creating profile:', error);
      const errorMessage = error.response?.data?.details || error.response?.data?.error || 'Profil oluşturulamadı';
      toast.error(errorMessage);
    } finally {
      setCreatingProfile(false);
    }
  };

  const handleClaimAchievement = async (achievementType: number) => {
    try {
      setClaiming(achievementType);

      // Backend üzerinden sponsored NFT claim
      const response = await api.post('/api/profile/claim-nft-sponsored', {
        achievementType,
      });

      if (response.data.success) {
        toast.success('🎉 Achievement NFT kazandınız!');
        setTimeout(() => loadProfile(), 2000);
      } else {
        toast.error(response.data.error || 'Claim işlemi başarısız');
      }
    } catch (error: any) {
      console.error('Error claiming achievement:', error);
      const errorMessage = error.response?.data?.details || error.response?.data?.error || 'Achievement claim edilemedi';
      toast.error(errorMessage);
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-16 w-16 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-cyan-300">Profil yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!profile && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Giriş Yapılmadı</h2>
          <p className="text-gray-400 mb-6">Profili görüntülemek için giriş yapmanız gerekiyor.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition"
          >
            Giriş Yap
          </button>
        </div>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-gradient-to-br from-[#0A1A2F] via-[#0C2238] to-[#071018] text-white">
    
    {/* Header */}
    <header className="border-b border-white/10 backdrop-blur-xl bg-white/5">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="text-gray-300 hover:text-white transition flex items-center gap-2"
        >
          ← Home
        </button>

        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#8BD7FF] to-[#2AA5FE] text-transparent bg-clip-text">
          My Profile
        </h1>

        <div className="w-20"></div>
      </div>
    </header>

    {/* MAIN CONTENT */}
    <main className="max-w-7xl mx-auto px-6 py-10">

      {/* PROFILE CARD */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-10 shadow-xl">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
          
          {/* Avatar */}
          <div className="relative">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.displayName}
                className="w-32 h-32 rounded-full border-4 border-[#2AA5FE] shadow-lg shadow-[#2AA5FE]/40 object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#2AA5FE] to-[#8BD7FF] flex items-center justify-center text-5xl font-bold shadow-lg shadow-[#2AA5FE]/40">
                {profile.displayName?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}

            {/* Reputation Badge */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-4 py-1 text-sm font-bold text-black shadow-md">
              ⭐ {profile.reputationScore || 0}
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl font-bold text-white">{profile.displayName}</h2>

            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-400 mt-4">
              {profile.email && <span>📧 {profile.email}</span>}
              {profile.intraId && profile.intraId !== 'N/A' && <span>🎓 42 ID: {profile.intraId}</span>}
            </div>

            {/* zkLogin Wallet */}
            {user?.realWalletAddress && (
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm font-mono mt-4">
                🪪 zkLogin: {user.realWalletAddress.slice(0, 10)}...{user.realWalletAddress.slice(-6)}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* STAT GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard icon="📝" label="Tasks Created" value={profile.stats?.tasksCreated || 0} color="cyan" />
        <StatCard icon="✅" label="Tasks Completed" value={profile.stats?.tasksCompleted || 0} color="green" />
        <StatCard icon="🙋" label="Participated" value={profile.stats?.tasksParticipated || 0} color="purple" />
        <StatCard icon="🗳️" label="Votes Cast" value={profile.stats?.votesCast || 0} color="blue" />
        <StatCard icon="💰" label="Donations" value={profile.stats?.donationsMade || 0} color="orange" />
        <StatCard icon="💎" label="Total Donated" value={`${((profile.stats?.totalDonatedAmount || 0) / 1_000_000_000).toFixed(2)} SUI`} color="pink" />
        <StatCard icon="🏆" label="Approved Proposals" value={profile.stats?.proposalsApproved || 0} color="yellow" />
        <StatCard icon="🎖️" label="NFT Count" value={nfts.length} color="indigo" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('achievements')}
          className={`px-4 py-2 rounded-t-lg transition ${
            activeTab === 'achievements'
              ? 'bg-white/10 text-[#8BD7FF] border-b-2 border-[#8BD7FF]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🏆 Achievements
        </button>

        <button
          onClick={() => setActiveTab('nfts')}
          className={`px-4 py-2 rounded-t-lg transition ${
            activeTab === 'nfts'
              ? 'bg-white/10 text-[#8BD7FF] border-b-2 border-[#8BD7FF]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🖼️ NFT Collection ({nfts.length})
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 rounded-t-lg transition ${
            activeTab === 'stats'
              ? 'bg-white/10 text-[#8BD7FF] border-b-2 border-[#8BD7FF]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📊 Detailed Stats
        </button>
      </div>

      {/* TAB CONTENT — Achievements */}
      {activeTab === 'achievements' && (
        <div className="space-y-8">

          {/* Claimable Achievements */}
          {eligibleAchievements.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                🎁 Claimable Achievements
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                  {eligibleAchievements.length}
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eligibleAchievements.map((achievement) => (
                  <div
                    key={achievement.type}
                    className={`bg-gradient-to-br ${RARITY_COLORS[achievement.rarity]} p-0.5 rounded-xl ${RARITY_GLOW[achievement.rarity]} shadow-lg`}
                  >
                    <div className="bg-[#0A1A2F] rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{achievement.icon}</span>

                        <div>
                          <h4 className="font-bold text-white">{achievement.name}</h4>
                          <span className={`text-xs ${RARITY_BG[achievement.rarity]} px-2 py-0.5 rounded-full`}>
                            {achievement.rarity}
                          </span>
                        </div>
                      </div>

                      <p className="text-gray-400 text-sm mb-4">{achievement.description}</p>

                      <button
                        onClick={() => handleClaimAchievement(achievement.type)}
                        disabled={claiming === achievement.type}
                        className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                      >
                        {claiming === achievement.type ? 'Claiming...' : '🏆 Claim NFT'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Achievements */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">🎯 All Achievements</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              {ACHIEVEMENTS.map((achievement) => {
                const isEarned =
                  nfts.some((n) => n.achievementType === achievement.type) ||
                  claimedAchievements.includes(achievement.type);

                const isEligible = eligibleAchievements.some((a) => a.type === achievement.type);

                return (
                  <div
                    key={achievement.type}
                    className={`rounded-xl p-4 border transition ${
                      isEarned
                        ? `bg-gradient-to-br ${RARITY_COLORS[achievement.rarity]} bg-opacity-20 border-white/20`
                        : isEligible
                        ? 'bg-yellow-500/10 border-yellow-500/40'
                        : 'bg-white/5 border-white/10 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-2xl ${!isEarned && !isEligible ? 'grayscale' : ''}`}>
                        {achievement.icon}
                      </span>

                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{achievement.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${RARITY_BG[achievement.rarity]}`}>
                          {achievement.rarity}
                        </span>
                      </div>

                      {isEarned && <span className="text-green-400 text-xl">✅</span>}
                    </div>

                    <p className="text-gray-400 text-sm">{achievement.description}</p>
                    <p className="text-xs text-gray-500 mt-2">📋 {achievement.requirement}</p>
                  </div>
                );
              })}

            </div>
          </div>
        </div>
      )}

      {/* NFT TAB */}
      {activeTab === 'nfts' && (
        <div>
          {nfts.length === 0 ? (
            <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center">
              <span className="text-6xl mb-4 block">🖼️</span>
              <h3 className="text-xl font-bold text-white mb-2">No NFTs Yet</h3>
              <p className="text-gray-400">Earn NFTs by claiming achievements!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {nfts.map((nft) => {
                const rarity = nft.metadata?.rarity || 'Common';
                return (
                  <div
                    key={nft.id}
                    className={`bg-gradient-to-br ${RARITY_COLORS[rarity]} p-0.5 rounded-xl ${RARITY_GLOW[rarity]} shadow-lg hover:scale-105 transition`}
                  >
                    <div className="bg-[#0A1A2F] rounded-xl p-4">
                      {nft.imageUrl && (
                        <img
                          src={nft.imageUrl}
                          alt={nft.name}
                          className="w-full h-32 rounded-lg object-cover mb-3"
                        />
                      )}
                      <h4 className="font-bold text-white text-sm truncate">{nft.name}</h4>
                      <p className="text-xs text-gray-400 truncate">{nft.description}</p>

                      <div className="flex justify-between items-center mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${RARITY_BG[rarity]}`}>{rarity}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(nft.earnedAt).toLocaleDateString('en-US')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DETAILED STATS */}
      {activeTab === 'stats' && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-[#8BD7FF] mb-6">📊 Detailed Statistics</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Tasks */}
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="font-semibold text-cyan-400 mb-4">📝 Task Stats</h4>
              <div className="space-y-3">
                <StatRow label="Tasks Created" value={profile.stats?.tasksCreated || 0} />
                <StatRow label="Tasks Completed" value={profile.stats?.tasksCompleted || 0} />
                <StatRow label="Tasks Participated" value={profile.stats?.tasksParticipated || 0} />
                <StatRow label="Approved Proposals" value={profile.stats?.proposalsApproved || 0} />
              </div>
            </div>

            {/* Donations */}
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="font-semibold text-orange-400 mb-4">💰 Donation Stats</h4>
              <div className="space-y-3">
                <StatRow label="Total Donations" value={profile.stats?.donationsMade || 0} />
                <StatRow
                  label="Total Donated Amount"
                  value={`${((profile.stats?.totalDonatedAmount || 0) / 1_000_000_000).toFixed(4)} SUI`}
                />
              </div>
            </div>

            {/* Votes */}
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="font-semibold text-purple-400 mb-4">🗳️ Voting Stats</h4>
              <div className="space-y-3">
                <StatRow label="Votes Cast" value={profile.stats?.votesCast || 0} />
              </div>
            </div>

            {/* General */}
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="font-semibold text-yellow-400 mb-4">⭐ General</h4>
              <div className="space-y-3">
                <StatRow label="Reputation Score" value={profile.reputationScore || 0} />
                <StatRow label="NFT Count" value={nfts.length} />
                <StatRow label="Achievements Earned" value={profile.achievements?.length || 0} />
              </div>
            </div>

          </div>
        </div>
      )}

    </main>
  </div>
);
}

// StatRow component
function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-lg px-4 py-2">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-white font-semibold">{value}</span>
    </div>
  );
}

// StatCard component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  color: string;
}) {
  const colorClasses: { [key: string]: string } = {
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400',
    green: 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
    orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-400',
    pink: 'from-pink-500/20 to-pink-500/5 border-pink-500/30 text-pink-400',
    yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 text-yellow-400',
    indigo: 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/30 text-indigo-400',
  };

  return (
    <div
      className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4 backdrop-blur-xl shadow-md`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className={`text-2xl font-bold`}>
        {value}
      </p>
    </div>
  );
}
