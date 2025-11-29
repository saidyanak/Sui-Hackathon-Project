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
    taskType: '0', // 0: DONATION, 1: PARTICIPATION, 2: HYBRID
    targetAmount: '',
    endDate: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      // Backend'e sponsorlu transaction iste (backend gas ödeyecek!)
      const response = await api.post('/api/tasks/create-sponsored', {
        title: formData.title,
        description: formData.description,
        taskType: parseInt(formData.taskType),
        targetAmount: formData.taskType !== '1' ? formData.targetAmount : '0',
        endDate: formData.endDate,
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

  const getTaskTypeName = (type: string) => {
    switch (type) {
      case '0': return 'Bağış';
      case '1': return 'Katılım';
      case '2': return 'Karma';
      default: return '';
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
          <h2 className="text-3xl font-bold text-white mb-6">Yeni Teklif Oluştur</h2>

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
                placeholder="Teklifinize bir başlık verin"
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
                placeholder="Teklifinizi detaylı açıklayın"
                disabled={loading}
              />
            </div>

            {/* Teklif Tipi */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Teklif Tipi *
              </label>
              <div className="grid grid-cols-3 gap-4">
                {['0', '1', '2'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, taskType: type })}
                    disabled={loading}
                    className={`px-4 py-3 rounded-lg font-semibold transition ${
                      formData.taskType === type
                        ? type === '0'
                          ? 'bg-green-500 text-white'
                          : type === '1'
                          ? 'bg-blue-500 text-white'
                          : 'bg-purple-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {getTaskTypeName(type)}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-400">
                {formData.taskType === '0' && '💰 Bağış: Sadece bağış toplanır'}
                {formData.taskType === '1' && '👥 Katılım: Sadece katılımcı toplanır'}
                {formData.taskType === '2' && '🔄 Karma: Hem bağış hem katılımcı'}
              </p>
            </div>

            {/* Hedef Miktar (sadece DONATION ve HYBRID için) */}
            {formData.taskType !== '1' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hedef Miktar (SUI) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Örn: 10"
                  disabled={loading}
                />
              </div>
            )}

            {/* Bitiş Tarihi */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bitiş Tarihi *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
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
                  'Teklif Oluştur'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
