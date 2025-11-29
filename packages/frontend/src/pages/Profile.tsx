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
    <div className="min-h-screen bg-gradient-to-br from-[#0A1A2F] via-[#0C2238] to-[#071018] text-white flex">

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
