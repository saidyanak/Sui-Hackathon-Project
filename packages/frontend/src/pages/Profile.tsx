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
        setAchievements(data || []);
      });
    });
  }, []);

  return (
<<<<<<< HEAD
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
          </div>

          {/* Wallet Bilgileri */}
          <div className="mt-8 space-y-4">
            <h3 className="text-xl font-bold text-purple-300 mb-4">💳 Cüzdan Bilgileri</h3>

            {/* Virtual Wallet Card */}
            <div className="bg-gradient-to-r from-purple-900 to-purple-800 bg-opacity-50 border-2 border-purple-500 p-6 rounded-xl">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-xl">🔐</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-purple-200">Virtual Wallet</h4>
                    <p className="text-xs text-purple-300">Sponsorlu işlemler için otomatik oluşturuldu</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-purple-600 rounded-full text-xs font-bold">Varsayılan</span>
              </div>
              <div className="bg-black bg-opacity-30 p-3 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Adres:</p>
                <p className="text-sm font-mono text-white break-all">
                  {user?.suiWalletAddress || 'Yükleniyor...'}
                </p>
              </div>
              <div className="mt-3 p-3 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg">
                <p className="text-xs text-blue-200">
                  <span className="font-bold">ℹ️ Bilgi:</span> Bu cüzdan oy verme, yorum yapma gibi işlemler için kullanılır.
                  Gas ücretleri platform tarafından karşılanır, sizin SUI göndermenize gerek yok.
                </p>
              </div>
            </div>

            {/* Real Wallet Card */}
            <div className={`bg-gradient-to-r ${user?.realWalletAddress ? 'from-green-900 to-green-800 border-green-500' : 'from-gray-800 to-gray-700 border-gray-600'} bg-opacity-50 border-2 p-6 rounded-xl`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 ${user?.realWalletAddress ? 'bg-green-600' : 'bg-gray-600'} rounded-full flex items-center justify-center`}>
                    <span className="text-xl">{user?.realWalletAddress ? '💎' : '⚪'}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-green-200">Real Wallet</h4>
                    <p className="text-xs text-green-300">Sui Wallet ile bağlandı</p>
                  </div>
                </div>
                {user?.realWalletAddress ? (
                  <span className="px-3 py-1 bg-green-600 rounded-full text-xs font-bold">✓ Bağlı</span>
                ) : (
                  <span className="px-3 py-1 bg-gray-600 rounded-full text-xs font-bold">Bağlı Değil</span>
                )}
              </div>
              {user?.realWalletAddress ? (
                <>
                  <div className="bg-black bg-opacity-30 p-3 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Adres:</p>
                    <p className="text-sm font-mono text-white break-all">
                      {user.realWalletAddress}
                    </p>
                  </div>
                  <div className="mt-3 p-3 bg-green-900 bg-opacity-30 border border-green-500 rounded-lg">
                    <p className="text-xs text-green-200">
                      <span className="font-bold">✅ Aktif:</span> Bu cüzdan NFT almak, bağış yapmak ve kendi varlıklarınızı yönetmek için kullanılır.
                    </p>
                  </div>
                </>
              ) : (
                <div className="mt-3 p-3 bg-orange-900 bg-opacity-30 border border-orange-500 rounded-lg">
                  <p className="text-xs text-orange-200">
                    <span className="font-bold">⚠️ Opsiyonel:</span> Sui Wallet bağlayarak NFT'leri kendi cüzdanınızda saklayabilir ve
                    bağış yapabilirsiniz. Üst menüden "Connect Wallet" butonuna tıklayın.
                  </p>
                </div>
              )}
            </div>
          </div>
=======
    <div className="min-h-screen bg-gradient-to-br from-[#0A1A2F] via-[#0C2238] to-[#071018] text-white flex">
>>>>>>> d8d8ca73fadcf830fbdf78b3496d20419b239425

      {/* LEFT SIDEBAR */}
      <aside className="w-[380px] bg-white/10 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col">

        {/* Profile */}
        <div className="flex items-center gap-4 mb-10">
          {user?.avatar ? (
            <img
              src={user.avatar}
              className="w-24 h-24 rounded-full border-4 border-[#2AA5FE]/70 shadow-md"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-700 border-4 border-[#2AA5FE]/60" />
          )}

          <div>
            <h2 className="text-3xl font-bold text-[#8BD7FF]">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-gray-300 text-sm">{user?.email}</p>
          </div>
        </div>

        {/* NFT Header */}
        <div className="flex-1 flex flex-col justify-start mt-10">
          <h3 className="text-lg font-semibold text-[#2AA5FE] mb-4">
            NFT Koleksiyonu
          </h3>

          {/* NFT Grid */}
          <div className="overflow-y-auto pr-2 flex-1">
            {achievements.length === 0 ? (
              <p className="text-gray-400">Henüz NFT yok.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {achievements.map((nft) => (
                  <div
                    key={nft.id}
                    className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-3 transition transform hover:-translate-y-1 hover:border-[#2AA5FE] hover:shadow-[0_0_20px_rgba(42,165,254,0.4)]"
                  >
                    {nft.imageUrl && (
                      <img
                        src={nft.imageUrl}
                        className="w-full h-24 rounded-lg object-cover mb-2"
                      />
                    )}
                    <p className="text-sm font-semibold text-[#8BD7FF]">
                      {nft.achievementType}
                    </p>
                    <a
                      href={nft.metadataUrl}
                      className="text-xs text-blue-300 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Metadata
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </aside>

      {/* MAIN FEED */}
      <main className="flex-1 p-10 space-y-12 overflow-y-auto">

        {/* TITLE + HOME BUTTON */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-[#8BD7FF]">
            Profil Akışı
          </h1>
          <button
            onClick={() => navigate('/')}
            className="text-gray-300 hover:text-white transition"
          >
            ← Ana Sayfa
          </button>
        </div>

        {/* MY OFFERS */}
        <section>
          <h2 className="text-2xl font-extrabold text-[#2AA5FE] mb-4">Sunduğum Teklifler</h2>

          {/* Sample Card – backend’den gelecek */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-lg hover:border-[#2AA5FE] hover:shadow-[0_0_20px_rgba(42,165,254,0.4)] transition">
            <h3 className="text-xl font-semibold text-[#8BD7FF] mb-2">
              Topluluk Etkinlik Önerisi
            </h3>
            <p className="text-gray-300 mb-4">
              Haftalık Sui hack geceleri düzenlemeyi teklif ettim.
            </p>
            <div className="flex justify-between text-sm text-gray-400">
              <span>12 Oy</span>
              <span>5 Yorum</span>
            </div>
          </div>
        </section>

        {/* COMMENTS & VOTES */}
        <section>
          <h2 className="text-2xl font-extrabold text-[#2AA5FE] mb-4">Yorumlarım & Oylarım</h2>

          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-5 hover:border-[#2AA5FE] hover:shadow-[0_0_15px_rgba(42,165,254,0.3)] transition">
              <p className="text-gray-300 mb-2">
                “Bu teklif topluluk için harika bir katkı olur!”
              </p>
              <p className="text-gray-500 text-sm">• 2 gün önce oy kullandı</p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
