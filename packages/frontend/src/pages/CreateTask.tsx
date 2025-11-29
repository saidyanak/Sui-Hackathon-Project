import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

export default function CreateTask() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    taskType: '0', // 0: PARTICIPATION, 1: PROPOSAL
    budgetAmount: '',
    participantLimit: '', // Tek katılımcı limiti
    votingEndDate: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Backend'e sponsorlu task oluşturma isteği gönder
      const response = await api.post('/api/tasks/create-sponsored', {
        title: formData.title,
        description: formData.description,
        taskType: parseInt(formData.taskType),
        budgetAmount: formData.taskType === '1' 
          ? Math.floor(parseFloat(formData.budgetAmount || '0') * 1_000_000_000) // Convert SUI to MIST
          : 0,
        participantLimit: parseInt(formData.participantLimit || '0'),
        votingEndDate: formData.votingEndDate,
      });

      if (response.data.success) {
        toast.success('Teklif başarıyla oluşturuldu!');
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        navigate('/');
      }
    } catch (err: any) {
      console.error("İşlem sırasında hata oluştu:", err);
      const errorMessage = err.response?.data?.error || err.response?.data?.details || "İşlem sırasında bir hata oluştu.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Minimum voting end date (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateString = minDate.toISOString().slice(0, 16);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 text-transparent bg-clip-text">
            Community Platform
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-white/70 text-sm">
              {user?.username || user?.email}
            </span>
            <Link 
              to="/" 
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              Geri Dön
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Yeni Teklif Oluştur</h1>
          <p className="text-white/60 mb-8">
            Topluluğa yeni bir etkinlik veya proje öner. Teklif oylamaya açılacak.
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Task Type */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Teklif Tipi
              </label>
              <select
                name="taskType"
                value={formData.taskType}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="0" className="bg-slate-800">🎮 Katılım (Halısaha, Hackathon vb.)</option>
                <option value="1" className="bg-slate-800">💰 Proje (Bütçe Gerektiren)</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Başlık
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Örn: Haftalık Halısaha Maçı"
                required
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Açıklama
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Teklif hakkında detaylı bilgi verin..."
                required
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Budget (only for PROPOSAL type) */}
            {formData.taskType === '1' && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Bütçe (SUI)
                </label>
                <input
                  type="number"
                  name="budgetAmount"
                  value={formData.budgetAmount}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <p className="mt-1 text-white/40 text-sm">
                  Onaylanırsa sponsor tarafından aktarılacak miktar
                </p>
              </div>
            )}

            {/* Participant Limit - Sadece katılım tipi için */}
            {formData.taskType === '0' && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  👥 Katılımcı Sayısı Limiti
                </label>
                <input
                  type="number"
                  name="participantLimit"
                  value={formData.participantLimit}
                  onChange={handleChange}
                  placeholder="0 (Sınırsız)"
                  min="0"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <p className="mt-1 text-white/40 text-sm">
                  0 girerseniz sınırsız katılım olur
                </p>
              </div>
            )}

            {/* Voting End Date */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Oylama Bitiş Tarihi
              </label>
              <input
                type="datetime-local"
                name="votingEndDate"
                value={formData.votingEndDate}
                onChange={handleChange}
                min={minDateString}
                required
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Oluşturuluyor...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Teklifi Oluştur</span>
                </>
              )}
            </button>

            <p className="text-center text-white/40 text-sm">
              ⛽ Gas ücreti sponsor tarafından karşılanmaktadır.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}