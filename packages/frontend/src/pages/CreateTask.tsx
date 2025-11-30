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
    taskType: '0',
    budgetAmount: '',
    participantLimit: '',
    votingEndDate: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/tasks/create-sponsored', {
        title: formData.title,
        description: formData.description,
        taskType: parseInt(formData.taskType),
        budgetAmount:
          formData.taskType === '1'
            ? Math.floor(parseFloat(formData.budgetAmount || '0') * 1_000_000_000)
            : 0,
        participantLimit: parseInt(formData.participantLimit || '0'),
        votingEndDate: formData.votingEndDate,
      });

      if (response.data.success) {
        toast.success('Teklif başarıyla oluşturuldu!');
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        navigate('/');
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.details ||
        'İşlem sırasında bir hata oluştu.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateString = minDate.toISOString().slice(0, 16);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1A2F] via-[#0C2238] to-[#071018] text-white">

      {/* === HEADER (Home Style) === */}
      <header className="h-20 bg-white/5 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-10">
        <h1 className="text-xl font-bold text-[#8BD7FF]">Create New Proposal</h1>

        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">{user?.username}</span>

          <Link
            to="/"
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition"
          >
            Go Back
          </Link>
        </div>
      </header>

      {/* === MAIN CARD === */}
      <main className="max-w-2xl mx-auto px-4 pt-12 pb-24">
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-xl p-8 shadow-lg">

          <h2 className="text-2xl font-bold text-[#8BD7FF] mb-2">
            Proposal Details
          </h2>

          <p className="text-gray-300 mb-8">
            Propose a new event or project to the community.
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/40 text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Task Type */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Proposal Type
              </label>
              <select
                name="taskType"
                value={formData.taskType}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#2AA5FE]"
              >
                <option value="0" className="bg-[#0C2238]">
                  🎮 Participation (Sports, Hackathon, etc.)
                </option>
                <option value="1" className="bg-[#0C2238]">
                  💰 Project (Requires Budget)
                </option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-gray-300 text-sm mb-2">Title</label>
              <input
                type="text"
                name="title"
                placeholder="E.g.: Weekly Soccer Match"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#2AA5FE]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-gray-300 text-sm mb-2">Description</label>
              <textarea
                name="description"
                rows={4}
                placeholder="Provide detailed information about the proposal..."
                value={formData.description}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#2AA5FE] resize-none"
              />
            </div>

            {/* Budget */}
            {formData.taskType === '1' && (
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Budget (SUI)
                </label>
                <input
                  type="number"
                  name="budgetAmount"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={formData.budgetAmount}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#2AA5FE]"
                />
                <p className="text-gray-400 text-xs mt-1">
                  Will be transferred by the sponsor if approved.
                </p>
              </div>
            )}

            {/* Participant Limit */}
            {formData.taskType === '0' && (
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  👥 Participant Limit
                </label>
                <input
                  type="number"
                  name="participantLimit"
                  placeholder="0 (Unlimited)"
                  min="0"
                  value={formData.participantLimit}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#2AA5FE]"
                />
                <p className="text-gray-400 text-xs mt-1">
                  0 → unlimited participation
                </p>
              </div>
            )}

            {/* Voting End Date */}
            <div>
              <label className="block text-gray-300 text-sm mb-2">
                Voting End Date
              </label>
              <input
                type="datetime-local"
                name="votingEndDate"
                required
                min={minDateString}
                value={formData.votingEndDate}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white focus:ring-2 focus:ring-[#2AA5FE]"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#2AA5FE] text-black font-bold hover:bg-[#53bfff] transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "🚀 Create Proposal"}
            </button>

            <p className="text-center text-gray-400 text-sm">
              ⛽ Gas fee is covered by the sponsor.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
