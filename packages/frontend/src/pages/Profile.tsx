import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [achievements, setAchievements] = React.useState<any[]>([]);
  React.useEffect(() => {
    import('../services/achievementService').then(({ achievementService }) => {
      achievementService.getUserAchievements().then((data) => {
        setAchievements(data);
      });
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-800 to-gray-900 text-white">
      <header className="bg-gray-800 bg-opacity-50 backdrop-blur-lg border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Profilim</h1>
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition"
          >
            ← Ana Sayfa
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700">
          <div className="flex items-center gap-6">
            {user?.avatar && (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-24 h-24 rounded-full border-4 border-purple-500"
              />
            )}
            <div>
              <h2 className="text-3xl font-bold">{user?.username}</h2>
              <p className="text-gray-400">{user?.email}</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-400">First Name</p>
              <p className="text-lg">{user?.firstName || 'N/A'}</p>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-400">Last Name</p>
              <p className="text-lg">{user?.lastName || 'N/A'}</p>
            </div>
             <div className="bg-gray-700 p-4 rounded-lg col-span-1 md:col-span-2">
              <p className="text-sm text-gray-400">Sui Wallet Address</p>
              <p className="text-lg font-mono break-all">{user?.suiWalletAddress || 'Bağlı değil'}</p>
            </div>
          </div>

          {/* NFT Achievements */}
          <div className="mt-10">
            <h3 className="text-xl font-bold text-purple-300 mb-4">NFT Achievements</h3>
            <button
              className="mb-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
              onClick={async () => {
                const { achievementService } = await import('../services/achievementService');
                await achievementService.mintAchievement({
                  achievementType: 'FIRST_DONATION',
                  taskId: 'test-task',
                  tasksCompleted: 1,
                  donationsMade: 1,
                  totalDonatedAmount: 1000000000,
                });
                // Yeniden çek
                achievementService.getUserAchievements().then((data) => {
                  setAchievements(data);
                });
              }}
            >NFT Achievement Mintle (Test)</button>
            {achievements.length === 0 ? (
              <p className="text-gray-400">Henüz NFT achievement yok.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {achievements.map((nft) => (
                  <div key={nft.id} className="bg-gray-700 rounded-lg p-4 flex flex-col items-center">
                    {nft.imageUrl && (
                      <img src={nft.imageUrl} alt={nft.achievementType} className="w-24 h-24 rounded-lg mb-2" />
                    )}
                    <p className="font-bold text-purple-200 mb-1">{nft.achievementType}</p>
                    <p className="text-xs text-gray-300 mb-2">Task: {nft.taskId || '-'}</p>
                    <a href={nft.metadataUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 underline">Metadata</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
