import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSuiClient, useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { SuiObjectData } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { userService } from '../services/userService';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

const PACKAGE_ID = import.meta.env.VITE_SUI_PACKAGE_ID;

// --- Interfaces ---
interface UserProfile {
  suiWalletAddress: string;
  username: string;
  avatar: string;
}

interface Comment {
  author: string;
  content: string;
  timestamp: string;
  profile?: UserProfile;
}

interface Vote {
  voter: string;
  vote_type: number;
  timestamp: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  task_type: number;
  status: number;
  participants: string[];
  creator: {
    address: string;
    username?: string;
    avatar?: string;
  };
  comments: Comment[];
  votes: Vote[];
  voting_end_date: number;
  budget_amount: number;
  donations?: { donor: string; amount: number }[];
}

// --- Helper Functions ---
const parseTask = (object: SuiObjectData): Omit<Task, 'creator' | 'comments'> & { creatorAddress: string; rawComments: any[] } => {
  if (!object.content || object.content.dataType !== 'moveObject') {
    throw new Error('Invalid object content');
  }
  const fields = object.content.fields as any;
  return {
    id: fields.id.id,
    title: fields.title,
    description: fields.description,
    task_type: fields.task_type,
    status: fields.status,
    participants: fields.participants,
    votes: fields.votes || [],
    voting_end_date: fields.voting_end_date,
    budget_amount: fields.budget_amount,
    creatorAddress: fields.creator,
    rawComments: fields.comments,
  };
};

// --- Component ---
export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const queryClient = useQueryClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [donationAmount, setDonationAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');

  const { data: task, isLoading, error } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) throw new Error('Task ID is missing');

      const object = await client.getObject({ id: taskId, options: { showContent: true } });
      if (!object.data) throw new Error('Task not found');

      const parsedData = parseTask(object.data);
      const authorAddresses = [
        parsedData.creatorAddress,
        ...parsedData.rawComments.map(c => c.fields.author)
      ];
      const uniqueAddresses = [...new Set(authorAddresses)];
      
      const profiles = await userService.getProfilesByWalletAddresses(uniqueAddresses);
      const profilesMap = new Map(profiles.map(p => [p.suiWalletAddress, p]));
      const getProfile = (addr: string) => profilesMap.get(addr);
      const creatorProfile = getProfile(parsedData.creatorAddress);

      let donations: { donor: string; amount: number; username?: string }[] = [];
      let donorAddresses: string[] = [];
      if (
        object.data?.content &&
        'fields' in object.data.content &&
        Array.isArray((object.data.content as any).fields.donations)
      ) {
        donations = (object.data.content as any).fields.donations.map((d: any) => ({
          donor: d.fields.donor,
          amount: Number(d.fields.amount),
        }));
        donorAddresses = donations.map(d => d.donor);
      }

      // Donor profillerini çek
      let donorProfiles: { [address: string]: { username?: string } } = {};
      if (donorAddresses.length > 0) {
        const profiles = await userService.getProfilesByWalletAddresses(donorAddresses);
        profiles.forEach(profile => {
          donorProfiles[profile.suiWalletAddress] = { username: profile.username };
        });
        donations = donations.map(d => ({ ...d, username: donorProfiles[d.donor]?.username }));
      }
      return {
        id: parsedData.id,
        title: parsedData.title,
        description: parsedData.description,
        task_type: parsedData.task_type,
        status: parsedData.status,
        participants: parsedData.participants,
        votes: parsedData.votes,
        voting_end_date: parsedData.voting_end_date,
        budget_amount: parsedData.budget_amount,
        creator: {
          address: parsedData.creatorAddress,
          username: creatorProfile?.username,
          avatar: creatorProfile?.avatar,
        },
        comments: parsedData.rawComments.map((c: any) => ({
          author: c.fields.author,
          content: c.fields.content,
          timestamp: new Date(parseInt(c.fields.timestamp, 10)).toISOString(),
          profile: getProfile(c.fields.author),
        })).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
        donations,
      };
    },
    enabled: !!taskId && !!client,
  });

  const runMutation = (transaction: Transaction, successMessage: string) => {
    setIsSubmitting(true);
    signAndExecute({ transaction }, {
      onSuccess: () => {
        console.log(successMessage);
        queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        setIsSubmitting(false);
        setDonationAmount('');
      },
      onError: (err) => {
        console.error('Transaction failed', err);
        // You might want to show an error message to the user here
        setIsSubmitting(false);
      }
    });
  };

  const handleJoin = () => {
    if (!taskId) return;
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::task::join_task`,
      arguments: [tx.object(taskId)],
    });
    runMutation(tx, 'Successfully joined task!');
  };

  const handleDonate = () => {
    const amount = parseFloat(donationAmount);
    if (!taskId || isNaN(amount) || amount <= 0) return;

    const amountInMist = Math.floor(amount * 1_000_000_000);
    const tx = new Transaction();
    const coin = tx.splitCoins(tx.gas, [amountInMist]);
    tx.moveCall({
      target: `${PACKAGE_ID}::task::donate`,
      arguments: [tx.object(taskId), coin, tx.pure.string('Donation from frontend')],
    });
    runMutation(tx, 'Successfully donated to task!');
  };
  
  const handleVote = async (voteType: number) => {
    if (!taskId) return;

    const { user } = useAuthStore.getState();
    if (!user) {
      alert('Oy vermek için giriş yapmalısınız.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Backend'e sponsorlu oy isteği gönder
      const response = await api.post(`/api/tasks/${taskId}/vote-sponsored`, {
        voteType,
      });

      if (response.data.success) {
        console.log('Oy başarıyla kaydedildi!');
        queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      }
    } catch (error: any) {
      console.error('Oy kullanılırken hata:', error);
      alert('Oy kullanılırken hata: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !taskId) return;

    const { user } = useAuthStore.getState();
    if (!user) {
      alert('Yorum yapmak için giriş yapmalısınız.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Backend'e sponsorlu yorum isteği gönder
      const response = await api.post(`/api/tasks/${taskId}/comment-sponsored`, {
        content: newComment,
      });

      if (response.data.success) {
        console.log('Yorum başarıyla eklendi!');
        queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        setNewComment('');
      }
    } catch (error: any) {
      console.error('Yorum eklenirken hata:', error);
      alert('Yorum eklenirken hata: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper functions
  const getTaskStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-yellow-500';  // VOTING
      case 1: return 'bg-green-500';   // ACTIVE
      case 2: return 'bg-red-500';     // REJECTED
      case 3: return 'bg-gray-500';    // COMPLETED
      case 4: return 'bg-gray-600';    // CANCELLED
      default: return 'bg-gray-500';
    }
  };

  const getTaskStatusName = (status: number) => {
    switch (status) {
      case 0: return 'Oylamada';
      case 1: return 'Aktif';
      case 2: return 'Reddedildi';
      case 3: return 'Tamamlandı';
      case 4: return 'İptal';
      default: return 'Bilinmiyor';
    }
  };

  const getTaskTypeName = (taskType: number) => {
    switch (taskType) {
      case 0: return 'Katılım';
      case 1: return 'Proje';
      default: return 'Bilinmiyor';
    }
  };

  // Vote counts
  const yesVotes = task?.votes.filter(v => v.vote_type === 1).length || 0;
  const noVotes = task?.votes.filter(v => v.vote_type === 0).length || 0;
  const totalVotes = yesVotes + noVotes;
  const yesPercentage = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;

  // Check if user has voted
  const { user } = useAuthStore.getState();
  const userVote = task?.votes.find(v => v.voter === user?.suiWalletAddress);
  const hasVoted = !!userVote;

  const isParticipant = currentAccount && task?.participants.includes(currentAccount.address);
  const canJoin = task?.task_type === 1 || task?.task_type === 2;
  const canDonate = task?.task_type === 0 || task?.task_type === 2;
  const isVoting = task?.status === 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Görev Yüklenemedi</h2>
          <p className="text-gray-400">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-800 to-gray-900 text-white">
      <header className="bg-gray-800 bg-opacity-50 backdrop-blur-lg border-b border-gray-700 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition">
            ← Geri Dön
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{task?.title}</h1>
          <div className="flex items-center gap-3 mb-4">
            {task?.creator.avatar && <img src={task.creator.avatar} alt={task.creator.username} className="w-8 h-8 rounded-full" />}
            <span className="text-gray-400">
              {task?.creator.username || 'Bilinmeyen Kullanıcı'} tarafından oluşturuldu
            </span>
          </div>
          <div className="flex gap-2">
            <span className={`${task?.task_type === 0 ? 'bg-blue-500' : 'bg-orange-500'} text-white px-3 py-1 rounded-full text-sm font-bold`}>
              {getTaskTypeName(task?.task_type || 0)}
            </span>
            <span className={`${getTaskStatusColor(task?.status || 0)} text-white px-3 py-1 rounded-full text-sm font-bold`}>
              {getTaskStatusName(task?.status || 0)}
            </span>
          </div>
        </div>

        {/* Oylama Bölümü - Sadece VOTING durumunda göster */}
        {isVoting && (
          <div className="bg-gradient-to-r from-yellow-900 to-yellow-800 bg-opacity-50 backdrop-blur-lg rounded-2xl p-6 border-2 border-yellow-500 mb-8">
            <h2 className="text-2xl font-bold text-yellow-100 mb-4">🗳️ Topluluk Oylaması</h2>

            <div className="mb-6">
              <div className="flex justify-between text-sm text-yellow-200 mb-2">
                <span>Evet: {yesVotes} oy ({yesPercentage}%)</span>
                <span>Hayır: {noVotes} oy ({100 - yesPercentage}%)</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-green-500 h-full transition-all duration-300"
                  style={{ width: `${yesPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-yellow-200 mt-2">
                ⏰ Oylama bitiş: {task?.voting_end_date ? new Date(parseInt(task.voting_end_date.toString())).toLocaleString('tr-TR') : 'Bilinmiyor'}
              </p>
            </div>

            {hasVoted ? (
              <div className="bg-yellow-700 bg-opacity-50 border border-yellow-400 rounded-lg p-4">
                <p className="text-yellow-100 text-center font-semibold">
                  ✅ Oyunuzu kullandınız: {userVote?.vote_type === 1 ? '👍 Evet' : '👎 Hayır'}
                </p>
              </div>
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={() => handleVote(1)}
                  disabled={isSubmitting || !user}
                  className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'İşleniyor...' : '👍 Evet'}
                </button>
                <button
                  onClick={() => handleVote(0)}
                  disabled={isSubmitting || !user}
                  className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'İşleniyor...' : '👎 Hayır'}
                </button>
              </div>
            )}

            {!user && (
              <p className="text-sm text-yellow-300 mt-4 text-center">
                ⚠️ Oy kullanmak için giriş yapmalısınız
              </p>
            )}

            <div className="mt-4 p-3 bg-blue-500 bg-opacity-20 border border-blue-400 rounded-lg">
              <p className="text-blue-200 text-sm">
                💡 <strong>Onay Koşulu:</strong> %50'den fazla evet oy alırsa teklif onaylanır ve aktif hale gelir.
                {task?.task_type === 1 && ` Onaylanırsa ${(task.budget_amount / 1_000_000_000).toFixed(2)} SUI bütçe teklif sahibine transfer edilir.`}
              </p>
            </div>
          </div>
        )}

        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Açıklama</h2>
          <p className="text-gray-300 whitespace-pre-wrap">{task?.description}</p>
        </div>

        {/* Bağış yapanlar listesi */}
        {task?.donations && task.donations.length > 0 && (
          <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl p-6 border border-green-700 mb-8">
            <h2 className="text-xl font-bold text-green-400 mb-4">Bağış Yapanlar</h2>
            <ul className="text-xs text-gray-300 space-y-2">
              {task.donations.map((donation: { donor: string; amount: number; username?: string }, idx: number) => (
                <li key={idx} className="flex justify-between">
                  <span>{donation.username ? donation.username : `${donation.donor.slice(0, 6)}...${donation.donor.slice(-4)}`}</span>
                  <span className="font-semibold text-green-300">{(donation.amount / 1_000_000_000).toFixed(2)} SUI</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Eyleme Geç</h2>
          <div className="flex flex-col md:flex-row gap-4">
            {canJoin && (
              <button
                onClick={handleJoin}
                disabled={!currentAccount || isParticipant || isSubmitting}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isParticipant ? 'Zaten Katıldın' : (isSubmitting ? 'İşleniyor...' : 'Görevi Üstlen')}
              </button>
            )}
            {canDonate && (
              <div className="flex-1 flex gap-2">
                <input
                  type="number"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  placeholder="SUI Miktarı"
                  className="w-1/2 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={!currentAccount || isSubmitting}
                />
                <button
                  onClick={handleDonate}
                  disabled={!currentAccount || isSubmitting || !donationAmount || parseFloat(donationAmount) <= 0}
                  className="w-1/2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'İşleniyor...' : 'Bağış Yap'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Yorumlar ({task?.comments.length})</h2>
          <div className="space-y-6">
            {task?.comments.map((comment, index) => (
              <div key={index} className="flex items-start gap-4">
                <img src={comment.profile?.avatar} alt={comment.profile?.username} className="w-10 h-10 rounded-full"/>
                <div className="flex-1 bg-gray-800 bg-opacity-70 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-purple-400">{comment.profile?.username || `${comment.author.slice(0, 6)}...${comment.author.slice(-4)}`}</span>
                    <span className="text-xs text-gray-500">{new Date(comment.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-300">{comment.content}</p>
                </div>
              </div>
            ))}
            {task?.comments.length === 0 && (
              <div className="text-center py-8 bg-gray-800 bg-opacity-50 rounded-lg">
                <p className="text-gray-500">Henüz hiç yorum yapılmamış.</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <form onSubmit={handleCommentSubmit}>
            <h3 className="text-xl font-bold text-white mb-4">Yorum Ekle</h3>
            <div className="flex items-start gap-4">
              {useAuthStore.getState().user?.avatar && (
                <img src={useAuthStore.getState().user?.avatar} alt="Your avatar" className="w-10 h-10 rounded-full"/>
              )}
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Yorumunuzu buraya yazın..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={!useAuthStore.getState().user || isSubmitting}
                />
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-green-400">
                    ✨ Yorum yapma ücretsizdir! Gas fee'leri platform tarafından karşılanmaktadır.
                  </p>
                  <button
                    type="submit"
                    disabled={!useAuthStore.getState().user || !newComment.trim() || isSubmitting}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Gönderiliyor...' : 'Yorum Yap'}
                  </button>
                </div>
              </div>
            </div>
            {!useAuthStore.getState().user && (
              <p className="text-sm text-yellow-400 mt-2">Yorum yapmak için giriş yapmalısınız.</p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
