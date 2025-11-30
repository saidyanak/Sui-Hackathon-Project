import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface LeaderboardEntry {
  rank: number;
  address: string;
  username?: string;
  avatar?: string;
  tasksCreated: number;
  tasksParticipated: number;
  votesCount: number;
  donationsCount: number;
  totalDonated: string;
  reputationScore: number;
}

export default function Leaderboard() {
  const navigate = useNavigate();

  const { data: leaderboard = [], isLoading, error } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const response = await api.get('/api/user/leaderboard');
      return response.data.leaderboard as LeaderboardEntry[];
    },
    staleTime: 60000,
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

  const formatSUI = (mist: string) => {
    return (Number(mist) / 1_000_000_000).toFixed(2);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">An Error Occurred</h2>
          <p className="text-gray-400">There was an issue loading the leaderboard.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition"
          >
            Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <header className="bg-gray-800 bg-opacity-50 backdrop-blur-lg border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white transition"
            >
              ← Home
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              🏆 Leaderboard
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <p className="text-gray-300 text-lg">
            The most active community members and top contributors
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Ranking based on Reputation Score and Total Donations
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-white text-xl">Loading leaderboard...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-20 bg-gray-800 bg-opacity-50 rounded-2xl">
            <p className="text-gray-400 text-xl">No leaderboard data yet</p>
            <p className="text-gray-500 mt-2">Contribute to the community to earn your place!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {leaderboard.slice(0, 3).map((entry, index) => (
                <div
                  key={entry.address}
                  className={`${
                    index === 0
                      ? 'bg-gradient-to-br from-yellow-500 to-yellow-700 md:order-2 md:scale-110'
                      : index === 1
                      ? 'bg-gradient-to-br from-gray-400 to-gray-600 md:order-1'
                      : 'bg-gradient-to-br from-orange-500 to-orange-700 md:order-3'
                  } rounded-2xl p-6 shadow-2xl transform hover:scale-105 transition`}
                >
                  <div className="text-center">
                    <div className="text-6xl mb-4">{getMedalIcon(index + 1)}</div>

                    {entry.avatar ? (
                      <img
                        src={entry.avatar}
                        alt={entry.username || 'User'}
                        className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-white shadow-lg bg-gray-700 flex items-center justify-center text-3xl">
                        👤
                      </div>
                    )}

                    <h3 className="text-2xl font-bold text-white mb-2">
                      {entry.username ||
                        `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                    </h3>

                    <p className="text-white text-opacity-90 text-3xl font-bold mb-4">
                      {entry.reputationScore} points
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-sm text-white text-opacity-90">
                      <div className="bg-white/10 rounded-lg p-2">
                        <p className="font-semibold">💰 Donations</p>
                        <p className="text-lg">{formatSUI(entry.totalDonated)} SUI</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-2">
                        <p className="font-semibold">📝 Proposals</p>
                        <p className="text-lg">{entry.tasksCreated}</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-2">
                        <p className="font-semibold">🙋 Participation</p>
                        <p className="text-lg">{entry.tasksParticipated}</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-2">
                        <p className="font-semibold">🗳️ Votes</p>
                        <p className="text-lg">{entry.votesCount}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Table */}
            {leaderboard.length > 3 && (
              <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700 bg-opacity-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">
                          Rank
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase">
                          User
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase">
                          Score
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase">
                          Donations
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase">
                          Proposals
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase">
                          Participation
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase">
                          Votes
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-700">
                      {leaderboard.slice(3).map((entry) => (
                        <tr
                          key={entry.address}
                          className="hover:bg-gray-700 hover:bg-opacity-30 transition"
                        >
                          <td className="px-6 py-4">
                            <span
                              className={`text-2xl font-bold ${getMedalColor(entry.rank)}`}
                            >
                              #{entry.rank}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {entry.avatar ? (
                                <img
                                  src={entry.avatar}
                                  className="w-10 h-10 rounded-full border-2 border-purple-500"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full border-2 border-purple-500 bg-gray-700 flex items-center justify-center">
                                  👤
                                </div>
                              )}
                              <div>
                                <p className="text-white font-semibold">
                                  {entry.username ||
                                    `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                                </p>
                                <p className="text-gray-400 text-xs">
                                  {entry.address.slice(0, 10)}...
                                  {entry.address.slice(-6)}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className="text-xl font-bold text-purple-400">
                              {entry.reputationScore}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className="text-green-400 font-semibold">
                              {formatSUI(entry.totalDonated)} SUI
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className="text-blue-400 font-semibold">
                              {entry.tasksCreated}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className="text-cyan-400 font-semibold">
                              {entry.tasksParticipated}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className="text-yellow-400 font-semibold">
                              {entry.votesCount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700">
                <p className="text-3xl font-bold text-purple-400">{leaderboard.length}</p>
                <p className="text-gray-400 text-sm">Total Members</p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700">
                <p className="text-3xl font-bold text-green-400">
                  {formatSUI(
                    leaderboard
                      .reduce((sum, e) => sum + Number(e.totalDonated), 0)
                      .toString()
                  )}
                </p>
                <p className="text-gray-400 text-sm">Total Donations (SUI)</p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700">
                <p className="text-3xl font-bold text-blue-400">
                  {leaderboard.reduce((sum, e) => sum + e.tasksCreated, 0)}
                </p>
                <p className="text-gray-400 text-sm">Total Proposals</p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700">
                <p className="text-3xl font-bold text-yellow-400">
                  {leaderboard.reduce((sum, e) => sum + e.votesCount, 0)}
                </p>
                <p className="text-gray-400 text-sm">Total Votes</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
