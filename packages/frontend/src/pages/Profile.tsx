import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

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
        </div>
      </main>
    </div>
  );
}
