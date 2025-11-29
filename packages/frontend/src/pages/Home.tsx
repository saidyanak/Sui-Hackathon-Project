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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
       <header className="bg-gray-800 bg-opacity-50 backdrop-blur-lg border-b border-gray-700 sticky top-0 z-10">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
           <div className="flex justify-between items-center">
             <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
               42 Community Platform
             </h1>
            
             <div className="flex items-center gap-4">
               {/* Wallet Connect */}
               <WalletConnect />

               {/* 🟣 TEKLİF OLUŞTUR BUTONU */}
               <button
                 onClick={() => navigate('/tasks/create')}
                 className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-md"
                 >
                 + Teklif Oluştur
               </button>

               {/* Kullanıcı bilgisi */}
               <button onClick={() => navigate('/profile')} className="flex items-center gap-3 text-left hover:bg-gray-700 p-2 rounded-lg transition">
                 {user?.avatar && (
                   <img
                     src={user.avatar}
                     alt={user.username}
                     className="w-10 h-10 rounded-full border-2 border-purple-500"
                   />
                 )}
                 <div className="text-white">
                   <p className="font-semibold">{user?.username || user?.email}</p>
                   <p className="text-xs text-gray-400">{user?.role}</p>
                 </div>
               </button>
               
               <button
                 onClick={handleLogout}
                 className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
               >
                 Çıkış
               </button>
             </div>
           </div>
         </div>
       </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm font-medium">Toplam Teklif</p>
                <h3 className="text-4xl font-bold text-white mt-2">{tasks.length}</h3>
              </div>
              <div className="bg-white bg-opacity-20 rounded-full p-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm font-medium">Toplam Bağış</p>
                <h3 className="text-4xl font-bold text-white mt-2">
                  {tasks.reduce((sum, t) => sum + (t.currentAmount / 1_000_000_000), 0).toFixed(2)} SUI
                </h3>
              </div>
              <div className="bg-white bg-opacity-20 rounded-full p-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium">Toplam Katılımcı</p>
                <h3 className="text-4xl font-bold text-white mt-2">
                  {tasks.reduce((sum, t) => sum + t.participantsCount, 0)}
                </h3>
              </div>
              <div className="bg-white bg-opacity-20 rounded-full p-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-500 to-pink-700 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-200 text-sm font-medium">Toplam Yorum</p>
                <h3 className="text-4xl font-bold text-white mt-2">
                  {tasks.reduce((sum, t) => sum + t.commentsCount, 0)}
                </h3>
              </div>
              <div className="bg-white bg-opacity-20 rounded-full p-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">Açık Teklifler</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'all'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilter('participation')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'participation'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              👥 Katılım
            </button>
            <button
              onClick={() => setFilter('proposal')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'proposal'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              💰 Proje
            </button>
          </div>
        </div>

        {/* Tasks Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-4"></div>
            <p className="text-white text-xl">Sui Network'ten veriler çekiliyor...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-20 bg-gray-800 bg-opacity-50 rounded-2xl">
            <p className="text-gray-400 text-xl">Henüz teklif bulunmuyor</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task: Task) => (
              <div
                key={task.id}
                className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 hover:border-purple-500 transition cursor-pointer transform hover:scale-105 shadow-lg"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                  <div className="flex gap-2">
                    <span
                      className={`${getTaskTypeColor(
                        task.taskType
                      )} text-white px-3 py-1 rounded-full text-xs font-bold shadow-md`}
                    >
                      {getTaskTypeName(task.taskType)}
                    </span>
                    <span
                      className={`${getTaskStatusColor(
                        task.status
                      )} text-white px-3 py-1 rounded-full text-xs font-bold shadow-md`}
                    >
                      {getTaskStatusName(task.status)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(task.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{task.title}</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{task.description}</p>

                {task.taskType !== 1 && task.targetAmount > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">
                        <span className="text-green-400 font-semibold">{(task.currentAmount / 1_000_000_000).toFixed(2)}</span>
                        {' / '}
                        {(task.targetAmount / 1_000_000_000).toFixed(2)} SUI
                      </span>
                      <span className="text-purple-400 font-bold">
                        {task.targetAmount > 0 ? Math.round((task.currentAmount / task.targetAmount) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                      <div
                        className="bg-gradient-to-r from-green-500 via-green-400 to-green-300 h-3 rounded-full transition-all duration-500 shadow-md"
                        style={{
                          width: `${task.targetAmount > 0 ? Math.min((task.currentAmount / task.targetAmount) * 100, 100) : 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Bağış yapanlar listesi */}
                {task.donations && task.donations.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-bold text-green-400 mb-2">Bağış Yapanlar</h4>
                    <ul className="text-xs text-gray-300 space-y-1">
                      {task.donations.map((donation: { donor: string; amount: number; username?: string }, idx: number) => (
                        <li key={idx} className="flex justify-between">
                          <span>{donation.username ? donation.username : `${donation.donor.slice(0, 6)}...${donation.donor.slice(-4)}`}</span>
                          <span className="font-semibold text-green-300">{(donation.amount / 1_000_000_000).toFixed(2)} SUI</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Oylama durumu göstergesi - Sadece VOTING statüsündeyken */}
                {task.status === 0 && (
                  <div className="mb-4 p-3 bg-yellow-900 bg-opacity-30 border border-yellow-500 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-yellow-300">🗳️ Oylama Devam Ediyor</span>
                      <span className="text-xs text-yellow-400">
                        {task.yesVotes || 0} 👍 / {task.noVotes || 0} 👎
                      </span>
                    </div>
                    {(task.yesVotes !== undefined && task.noVotes !== undefined) && (
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-green-500 h-full transition-all duration-300"
                          style={{
                            width: `${(task.yesVotes + task.noVotes) > 0
                              ? (task.yesVotes / (task.yesVotes + task.noVotes)) * 100
                              : 0}%`
                          }}
                        ></div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-700 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold">
                      {task.creator.slice(2, 3).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-400">
                      {task.creator.slice(0, 6)}...{task.creator.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 text-xs">
                      <span className="flex items-center gap-1 text-gray-400">
                        <span className="text-pink-400">💬</span>
                        <span className="font-semibold">{task.commentsCount}</span>
                      </span>
                      <span className="flex items-center gap-1 text-gray-400">
                        <span className="text-blue-400">👥</span>
                        <span className="font-semibold">{task.participantsCount}</span>
                      </span>
                      {task.taskType !== 1 && (
                        <span className="flex items-center gap-1 text-gray-400">
                          <span className="text-green-400">💰</span>
                          <span className="font-semibold">{task.donationsCount}</span>
                        </span>
                      )}
                      {task.status === 0 && (task.yesVotes !== undefined || task.noVotes !== undefined) && (
                        <span className="flex items-center gap-1 text-gray-400">
                          <span className="text-yellow-400">🗳️</span>
                          <span className="font-semibold">{(task.yesVotes || 0) + (task.noVotes || 0)}</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.ceil((task.endDate - Date.now()) / (1000 * 60 * 60 * 24))} gün kaldı
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
