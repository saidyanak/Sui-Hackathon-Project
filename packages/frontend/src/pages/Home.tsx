import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { WalletConnect } from '../components/WalletConnect';
import { taskService } from '../services/taskService';
import { useQuery } from '@tanstack/react-query';

// The frontend interface for a Task (from Sui blockchain)
interface Task {
  id: string;
  title: string;
  description: string;
  taskType: number; // 0: PARTICIPATION, 1: PROPOSAL
  status: number; // 0: VOTING, 1: ACTIVE, 2: REJECTED, 3: COMPLETED, 4: CANCELLED
  creator: string; // Sui address
  targetAmount: number;
  currentAmount: number;
  participantsCount: number;
  donationsCount: number;
  commentsCount: number;
  votes?: any[];
  yesVotes?: number;
  noVotes?: number;
  startDate: number;
  endDate: number;
  createdAt: number;
  donations?: Array<{ donor: string; amount: number }>;
}


export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [filter, setFilter] = useState<string>('all');

  const { data: tasks = [], isLoading: loading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      try {
        // Fetch tasks directly from Sui blockchain
        const response = await taskService.getTasks();

        // Tüm bağışçı adreslerini topla
        const allDonorAddresses: string[] = [];
        response.forEach((task: any) => {
          if (task.donations && Array.isArray(task.donations)) {
            task.donations.forEach((donation: any) => {
              if (donation.donor) allDonorAddresses.push(donation.donor);
            });
          }
        });

        // Profil bilgilerini çek
        let donorProfiles: { [address: string]: { username?: string } } = {};
        if (allDonorAddresses.length > 0) {
          const { userService } = await import('../services/userService');
          const profiles = await userService.getProfilesByWalletAddresses(allDonorAddresses);
          profiles.forEach((profile: any) => {
            donorProfiles[profile.suiWalletAddress] = { username: profile.username };
          });
        }

        // Her task'ın donations dizisine username ekle
        const tasksWithUsernames = response.map((task: any) => {
          if (task.donations && Array.isArray(task.donations)) {
            task.donations = task.donations.map((donation: any) => ({
              ...donation,
              username: donorProfiles[donation.donor]?.username,
            }));
          }
          return task;
        });
        return tasksWithUsernames || [];
      } catch (err) {
        console.error('Error fetching tasks:', err);
        throw err;
      }
    },
  });


  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getTaskTypeColor = (taskType: number) => {
    switch (taskType) {
      case 0: // PARTICIPATION
        return 'bg-blue-500';
      case 1: // PROPOSAL
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTaskTypeName = (taskType: number) => {
    switch (taskType) {
      case 0: // PARTICIPATION
        return 'Katılım';
      case 1: // PROPOSAL
        return 'Proje';
      default:
        return 'Bilinmiyor';
    }
  };

  const getTaskStatusColor = (status: number) => {
    switch (status) {
      case 0: // VOTING
        return 'bg-yellow-500';
      case 1: // ACTIVE
        return 'bg-green-500';
      case 2: // REJECTED
        return 'bg-red-500';
      case 3: // COMPLETED
        return 'bg-gray-500';
      case 4: // CANCELLED
        return 'bg-gray-600';
      default:
        return 'bg-gray-500';
    }
  };

  const getTaskStatusName = (status: number) => {
    switch (status) {
      case 0: // VOTING
        return 'Oylamada';
      case 1: // ACTIVE
        return 'Aktif';
      case 2: // REJECTED
        return 'Reddedildi';
      case 3: // COMPLETED
        return 'Tamamlandı';
      case 4: // CANCELLED
        return 'İptal';
      default:
        return 'Bilinmiyor';
    }
  };

  const filteredTasks = tasks.filter((task: Task) => {
    if (filter === 'all') return true;
    if (filter === 'participation') return task.taskType === 0;
    if (filter === 'proposal') return task.taskType === 1;
    return true;
  });

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Bir Hata Oluştu</h2>
          <p className="text-gray-400">Görevler yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.</p>
          <p className="text-xs text-gray-500 mt-2">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

return (
  <div className="min-h-screen flex bg-gradient-to-br from-[#0A1A2F] via-[#0C2238] to-[#071018] text-white">

    {/* 🌊 SOL SİDEBAR - Sui Temalı */}
    <aside className="w-[320px] border-r border-white/10 bg-white/5 backdrop-blur-xl p-6 flex flex-col shadow-xl">

      {/* Başlık */}
      <h1 className="text-xl font-bold text-[#8BD7FF] mb-8">
        42 Community Platform
      </h1>

      {/* Kullanıcı Bloğu */}
      <div className="flex items-center gap-4 mb-6">
        <img
          src={user?.avatar}
          className="w-16 h-16 rounded-full border-4 border-[#2AA5FE]/60 shadow-lg"
        />
        <div>
          <p className="font-bold text-lg">{user?.username}</p>
          <p className="text-gray-400 text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Wallet Info */}
      <div className="bg-white/10 border border-white/20 rounded-xl p-4 mb-6">
        <p className="text-sm text-gray-400">Sui Wallet</p>
        <p className="font-mono text-[#8BD7FF] text-sm mt-1">
          {user?.suiWalletAddress
            ? `${user.suiWalletAddress.slice(0, 6)}...${user.suiWalletAddress.slice(-4)}`
            : "Bağlı değil"}
        </p>
        <div className="mt-3">
          <WalletConnect />
        </div>
      </div>

      {/* Menü */}
      <nav className="flex flex-col gap-3 text-sm">
        <button
          onClick={() => navigate('/profile')}
          className="px-3 py-2 text-left rounded-lg hover:bg-white/10 transition"
        >
          Profilim
        </button>
        <button
          onClick={() => navigate('/tasks/create')}
          className="px-3 py-2 rounded-lg bg-[#2AA5FE]/20 border border-[#2AA5FE]/40 hover:bg-[#2AA5FE]/30 transition"
        >
          + Teklif Oluştur
        </button>
        <button
          onClick={handleLogout}
          className="px-3 py-2 text-left text-red-400 hover:bg-red-500/20 transition rounded-lg"
        >
          Çıkış Yap
        </button>
      </nav>

    </aside>

    {/* 🌟 SAĞ ANA BÖLÜM */}
    <main className="flex-1 p-10 overflow-y-auto">

      {/* Filtre */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setFilter('all')}
          className={`px-5 py-2 rounded-lg ${
            filter === 'all'
              ? 'bg-[#2AA5FE] text-black font-bold'
              : 'bg-white/10 text-gray-300'
          }`}
        >
          Tümü
        </button>
        <button
          onClick={() => setFilter('participation')}
          className={`px-5 py-2 rounded-lg ${
            filter === 'participation'
              ? 'bg-blue-500 text-black font-bold'
              : 'bg-white/10 text-gray-300'
          }`}
        >
          Katılım
        </button>
        <button
          onClick={() => setFilter('proposal')}
          className={`px-5 py-2 rounded-lg ${
            filter === 'proposal'
              ? 'bg-orange-500 text-black font-bold'
              : 'bg-white/10 text-gray-300'
          }`}
        >
          Proje
        </button>
      </div>

      {/* Teklifler */}
      {loading ? (
        <div className="text-center mt-20">
          <div className="animate-spin h-12 w-12 border-4 border-[#2AA5FE] border-t-transparent rounded-full mx-auto"></div>
          <p className="text-[#8BD7FF] mt-4">Sui Network'ten veriler yükleniyor...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10">
          <p className="text-gray-400">Henüz teklif yok</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* 🌊 YATAY TEKLİF KARTI */}
          {filteredTasks.map((task: Task) => (
            <div
              key={task.id}
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 cursor-pointer shadow-lg hover:border-[#2AA5FE] hover:shadow-[0_0_20px_rgba(42,165,254,0.4)] transition"
            >
              <div className="flex justify-between items-start mb-4">

                <div>
                  {/* Tür & Durum Badge */}
                  <div className="flex gap-2 mb-2">
                    <span className="px-3 py-1 bg-blue-500 text-xs rounded-full">
                      {getTaskTypeName(task.taskType)}
                    </span>
                    <span className="px-3 py-1 bg-green-600 text-xs rounded-full">
                      {getTaskStatusName(task.status)}
                    </span>
                  </div>

                  {/* Başlık */}
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {task.title}
                  </h3>

                  {/* Açıklama */}
                  <p className="text-gray-300 max-w-2xl mb-4">
                    {task.description}
                  </p>

                  {/* Bağış Progress (varsa) */}
                  {task.taskType !== 1 && task.targetAmount > 0 && (
                    <div className="w-full max-w-lg">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">
                          {(task.currentAmount / 1_000_000_000).toFixed(2)} / {(task.targetAmount / 1_000_000_000).toFixed(2)} SUI
                        </span>
                        <span className="text-[#8BD7FF] font-bold">
                          {Math.round((task.currentAmount / task.targetAmount) * 100)}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#2AA5FE] to-[#8BD7FF] transition-all"
                          style={{
                            width: `${Math.min((task.currentAmount / task.targetAmount) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Sağ üstte tarih */}
                <span className="text-xs text-gray-500">
                  {new Date(task.createdAt).toLocaleDateString('tr-TR')}
                </span>
              </div>

              {/* Alt istatistikler */}
              <div className="flex gap-6 text-sm text-gray-300 mt-4 border-t border-white/10 pt-4">
                <span>💬 {task.commentsCount}</span>
                <span>👥 {task.participantsCount}</span>
                {task.donationsCount > 0 && <span>💰 {task.donationsCount}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

    </main>
  </div>
);
}
