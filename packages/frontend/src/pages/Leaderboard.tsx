import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { taskService } from '../services/taskService';
import { userService } from '../services/userService';

interface Task {
  id: string;
  title: string;
  description: string;
  taskType: number;
  status: number;
  creator: string;
  targetAmount: number;
  currentAmount: number;
  participantsCount: number;
  donationsCount: number;
  commentsCount: number;
  startDate: number;
  endDate: number;
  createdAt: number;
}

interface UserProfile {
  realWalletAddress: string;
  username: string;
  avatar: string;
}

interface LeaderboardEntry {
  address: string;
  username?: string;
  avatar?: string;
  totalDonations: number;
  tasksCreated: number;
  tasksParticipated: number;
  totalComments: number;
  score: number;
}

export default function Leaderboard() {
  const navigate = useNavigate();

  const { data: leaderboard = [], isLoading, error } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      try {
        // Fetch all tasks from blockchain
        const tasks: Task[] = await taskService.getTasks();

        // Calculate stats per user
        const userStats = new Map<string, {
          totalDonations: number;
          tasksCreated: number;
          tasksParticipated: number;
          totalComments: number;
        }>();

        tasks.forEach((task) => {
          // Track task creators
          if (!userStats.has(task.creator)) {
            userStats.set(task.creator, {
              totalDonations: 0,
              tasksCreated: 0,
              tasksParticipated: 0,
              totalComments: 0,
            });
          }
          const creatorStats = userStats.get(task.creator)!;
          creatorStats.tasksCreated += 1;

          // Track donations (we don't have individual donation data from blockchain yet)
          // For now, we'll use currentAmount as proxy for donations
          if (task.currentAmount > 0 && task.donationsCount > 0) {
            creatorStats.totalDonations += task.currentAmount;
          }

          // Track participants
          // Note: We need to fetch actual participant addresses from blockchain
          // For now, using participantsCount as indicator
        });

        // Get all unique addresses
        const allAddresses = Array.from(userStats.keys());

        // Fetch user profiles
        const profiles = await userService.getProfilesByWalletAddresses(allAddresses);
        const profilesMap = new Map(profiles.map(p => [p.realWalletAddress, p]));

        // Build leaderboard entries
        const entries: LeaderboardEntry[] = Array.from(userStats.entries()).map(([address, stats]) => {
          const profile = profilesMap.get(address);
          const score =
            stats.totalDonations / 1_000_000_000 * 10 + // 10 points per SUI donated
            stats.tasksCreated * 50 + // 50 points per task created
            stats.tasksParticipated * 20 + // 20 points per task participated
            stats.totalComments * 5; // 5 points per comment

          return {
            address,
            username: profile?.username,
            avatar: profile?.avatar,
            totalDonations: stats.totalDonations,
            tasksCreated: stats.tasksCreated,
            tasksParticipated: stats.tasksParticipated,
            totalComments: stats.totalComments,
            score,
          };
        });

        // Sort by score descending
        entries.sort((a, b) => b.score - a.score);

        return entries;
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        throw err;
      }
    },
  });

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-gray-500';
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Bir Hata Oluştu</h2>
          <p className="text-gray-400">Liderlik tablosu yüklenirken bir sorun oluştu.</p>
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white transition"
            >
              ← Ana Sayfa
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              🏆 Liderlik Tablosu
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <p className="text-gray-300 text-lg">
            En aktif topluluk üyeleri ve en cömert bağışçılar
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Puanlama: 10 puan/SUI bağış • 50 puan/teklif oluşturma • 20 puan/katılım • 5 puan/yorum
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-white text-xl">Liderlik tablosu yükleniyor...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-20 bg-gray-800 bg-opacity-50 rounded-2xl">
            <p className="text-gray-400 text-xl">Henüz liderlik tablosu verisi yok</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top 3 - Special Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {leaderboard.slice(0, 3).map((entry, index) => (
                <div
                  key={entry.address}
                  className={`${
                    index === 0
                      ? 'bg-gradient-to-br from-yellow-500 to-yellow-700'
                      : index === 1
                      ? 'bg-gradient-to-br from-gray-400 to-gray-600'
                      : 'bg-gradient-to-br from-orange-500 to-orange-700'
                  } rounded-2xl p-6 shadow-2xl transform hover:scale-105 transition`}
                >
                  <div className="text-center">
                    <div className="text-6xl mb-4">{getMedalIcon(index + 1)}</div>
                    {entry.avatar && (
                      <img
                        src={entry.avatar}
                        alt={entry.username || 'User'}
                        className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-white shadow-lg"
                      />
                    )}
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {entry.username || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                    </h3>
                    <p className="text-white text-opacity-90 text-3xl font-bold mb-4">
                      {entry.score.toFixed(0)} puan
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-white text-opacity-80">
                      <div>
                        <p className="font-semibold">Bağış</p>
                        <p>{(entry.totalDonations / 1_000_000_000).toFixed(2)} SUI</p>
                      </div>
                      <div>
                        <p className="font-semibold">Teklif</p>
                        <p>{entry.tasksCreated}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Rest of the leaderboard - Table */}
            {leaderboard.length > 3 && (
              <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700 bg-opacity-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Sıra
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Kullanıcı
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Puan
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Bağış
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Teklif
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {leaderboard.slice(3).map((entry, index) => (
                        <tr
                          key={entry.address}
                          className="hover:bg-gray-700 hover:bg-opacity-30 transition"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-2xl font-bold ${getMedalColor(index + 4)}`}>
                              #{index + 4}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {entry.avatar && (
                                <img
                                  src={entry.avatar}
                                  alt={entry.username || 'User'}
                                  className="w-10 h-10 rounded-full border-2 border-purple-500"
                                />
                              )}
                              <div>
                                <p className="text-white font-semibold">
                                  {entry.username || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                                </p>
                                <p className="text-gray-400 text-xs">
                                  {entry.address.slice(0, 10)}...{entry.address.slice(-6)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-xl font-bold text-purple-400">
                              {entry.score.toFixed(0)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-green-400 font-semibold">
                              {(entry.totalDonations / 1_000_000_000).toFixed(2)} SUI
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-blue-400 font-semibold">
                              {entry.tasksCreated}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
