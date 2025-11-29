import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export default function CreateTask() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    taskType: '0', // 0: PARTICIPATION, 1: PROPOSAL
    budgetAmount: '',
    minParticipants: '',
    maxParticipants: '',
    votingEndDate: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      // Backend'e sponsorlu transaction iste (backend gas öder!)
      const response = await api.post('/api/tasks/create-sponsored', {
        title: formData.title,
        description: formData.description,
        taskType: parseInt(formData.taskType),
        budgetAmount: formData.taskType === '1' ? formData.budgetAmount : '0',
        minParticipants: formData.minParticipants || '0',
        maxParticipants: formData.maxParticipants || '0',
        votingEndDate: formData.votingEndDate,
      });

      if (response.data.success) {
        console.log('Task oluşturuldu (sponsorlu):', response.data.digest);
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        navigate('/');
      } else {
        setError('Task oluşturulurken bir hata oluştu');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Task oluşturma hatası:', err);
      setError('Task oluşturulurken hata: ' + (err.response?.data?.error || err.message));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800 bg-opacity-50 backdrop-blur-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              42 Community Platform
            </h1>
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white transition"
            >
              ← Geri Dön
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700">
          <h2 className="text-3xl font-bold text-white mb-2">Yeni Teklif Oluştur</h2>
          <p className="text-gray-400 mb-6">Topluluk oylaması sonrası onaylanacak</p>

          <div className="mb-6 p-4 bg-blue-500 bg-opacity-20 border border-blue-500 rounded-lg">
            <p className="text-blue-200 text-sm">
              💡 <strong>Oylama Sistemi:</strong> Tüm teklifler topluluk tarafından oylanır. %50+ evet oy alırsa onaylanır ve aktif hale gelir.
            </p>
          </div>

          <div className="mb-6 p-4 bg-green-500 bg-opacity-20 border border-green-500 rounded-lg">
            <p className="text-green-200">
              ✨ Teklif oluşturma ücretsizdir! Gas fee'leri platform tarafından karşılanmaktadır.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Teklif Tipi */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Teklif Tipi *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, taskType: '0' })}
                  disabled={loading}
                  className={`px-6 py-6 rounded-xl font-semibold transition border-2 ${
                    formData.taskType === '0'
                      ? 'bg-blue-500 text-white border-blue-400 shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-2">👥</div>
                  <div className="text-lg mb-1">Katılım</div>
                  <div className="text-xs opacity-80">Etkinlik, Halısaha, Hackathon</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, taskType: '1' })}
                  disabled={loading}
                  className={`px-6 py-6 rounded-xl font-semibold transition border-2 ${
                    formData.taskType === '1'
                      ? 'bg-orange-500 text-white border-orange-400 shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-2">💰</div>
                  <div className="text-lg mb-1">Proje</div>
                  <div className="text-xs opacity-80">Tost Makinesi, Kampüs İyileştirme</div>
                </button>
              </div>
              <p className="mt-3 text-sm text-gray-400 bg-gray-700 bg-opacity-50 p-3 rounded-lg">
                {formData.taskType === '0'
                  ? '👥 Katılım: Sadece katılımcı toplanır (para yok). Onaylanırsa insanlar katılabilir.'
                  : '💰 Proje: Onaylanırsa sponsor cüzdandan size para transfer edilir ve projeyi yaparsınız.'
                }
              </p>
            </div>

            {/* Başlık */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Başlık *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={formData.taskType === '0' ? 'Örn: Voleybol Turnuvası' : 'Örn: Kampüse Tost Makinesi'}
                disabled={loading}
              />
            </div>

            {/* Açıklama */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Açıklama *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Teklifinizi detaylı açıklayın..."
                disabled={loading}
              />
            </div>

            {/* Bütçe (sadece PROPOSAL için) */}
            {formData.taskType === '1' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bütçe Miktarı (SUI) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.budgetAmount}
                  onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Örn: 100"
                  disabled={loading}
                />
                <p className="mt-2 text-xs text-gray-400">
                  💡 Teklif onaylanırsa, bu miktar sponsor cüzdandan size transfer edilecek
                </p>
              </div>
            )}

            {/* Katılımcı Limitleri (PARTICIPATION için) */}
            {formData.taskType === '0' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Minimum Katılımcı
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minParticipants}
                      onChange={(e) => setFormData({ ...formData, minParticipants: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Örn: 10"
                      disabled={loading}
                    />
                    <p className="mt-1 text-xs text-gray-400">Boş: sınırsız</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Maximum Katılımcı
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maxParticipants}
                      onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Örn: 22"
                      disabled={loading}
                    />
                    <p className="mt-1 text-xs text-gray-400">Boş: sınırsız</p>
                  </div>
                </div>
                <p className="text-sm text-gray-400 bg-blue-500 bg-opacity-10 border border-blue-500 rounded-lg p-3">
                  💡 <strong>Örnek:</strong> Halısaha için min: 10, max: 22
                </p>
              </div>
            )}

            {/* Oylama Bitiş Tarihi */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Oylama Bitiş Tarihi *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.votingEndDate}
                onChange={(e) => setFormData({ ...formData, votingEndDate: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading}
              />
              <p className="mt-2 text-xs text-gray-400">
                ⏰ Bu tarihte oylama kapanır ve sonuç belirlenir (%50+ evet = onay)
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Oluşturuluyor...
                  </span>
                ) : (
                  'Teklif Oluştur (Oylamaya Gönder)'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
