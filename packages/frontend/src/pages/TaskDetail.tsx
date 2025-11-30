import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSuiClient, useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { SuiObjectData } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { toast } from 'react-hot-toast';
import { userService } from '../services/userService';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import { TaskCompletionClaim } from '../components/TaskCompletionClaim';

const PACKAGE_ID = import.meta.env.VITE_SUI_PACKAGE_ID;
const SPONSOR_ADDRESS = '0xc41d4455273841e9cb81ae9f6034c0966a61bb540892a5fd8caa9614e2c44115';

// --- Interfaces ---
interface UserProfile {
  realWalletAddress: string;
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
  console.log('Raw fields.votes:', fields.votes); // <--- ADDED LOG
  
  // Votes'ları doğru şekilde parse et - vote_type number olarak kesinleştir
  const parsedVotes = (fields.votes || []).map((v: any) => {
    const voteFields = v.fields || v;
    return {
      voter: voteFields.voter,
      vote_type: Number(voteFields.vote_type), // String veya number olabilir, kesin number yap
      timestamp: voteFields.timestamp,
    };
  });
  
  console.log('Parsed votes:', parsedVotes);
  
  return {
    id: fields.id.id,
    title: fields.title,
    description: fields.description,
    task_type: Number(fields.task_type),
    status: Number(fields.status),
    participants: fields.participants,
    votes: parsedVotes,
    voting_end_date: Number(fields.voting_end_date),
    budget_amount: Number(fields.budget_amount),
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

  const { user } = useAuthStore((state) => ({ user: state.user })); // Extract user once

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
      const profilesMap = new Map(profiles.map(p => [p.realWalletAddress, p]));
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
          donorProfiles[profile.realWalletAddress] = { username: profile.username };
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
    staleTime: 30000, // 30 saniye boyunca cache'den oku
    refetchOnWindowFocus: false, // Pencere odaklanınca yeniden çekme
  });

  const { data: hasVotedStatus, isLoading: isLoadingHasVoted } = useQuery({
    queryKey: ['hasVoted', taskId, user?.realWalletAddress],
    queryFn: async () => {
      if (!taskId || !user?.realWalletAddress) return false;

      const tx = new Transaction();
      const target = `${PACKAGE_ID}::task::has_voted`;
      const args = [tx.object(taskId), tx.pure.address(user.realWalletAddress)];
      
      tx.moveCall({
        target: target,
        arguments: args,
      });

      const result = await client.devInspectTransactionBlock({
        sender: user.realWalletAddress,
        transactionBlock: tx,
      });

      if (result.results && result.results[0] && result.results[0].returnValues) {
        const [value, type] = result.results[0].returnValues[0];
        const hasVotedResult = value[0] === 1;
        return hasVotedResult;
      }
      return false;
    },
    enabled: !!taskId && !!user?.realWalletAddress && !!client,
    staleTime: 60000, // 1 dakika cache
    refetchOnWindowFocus: false,
  });

  const runMutation = (transaction: Transaction, successMessage: string) => {
    setIsSubmitting(true);
    signAndExecute({ transaction }, {
      onSuccess: () => {
        console.log(successMessage);
        queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        queryClient.invalidateQueries({ queryKey: ['hasVoted', taskId, user?.realWalletAddress] }); // Invalidate hasVoted query
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

  const handleJoin = async () => {
    if (!taskId) return;

    if (!user) {
      alert('Katılmak için giriş yapmalısınız.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Backend'e sponsorlu katılma isteği gönder
      const response = await api.post(`/api/tasks/${taskId}/join-sponsored`);

      if (response.data.success) {
        console.log('Göreve başarıyla katıldınız!');
        queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
    } catch (error: any) {
      console.error('Katılırken hata:', error);
      alert('Katılırken hata: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDonate = async () => {
    const amount = parseFloat(donationAmount);
    if (!taskId || isNaN(amount) || amount <= 0) {
      alert('Geçerli bir bağış miktarı girin');
      return;
    }

    if (!user) {
      alert('Bağış yapmak için giriş yapmalısınız.');
      return;
    }

    if (!user.realWalletAddress) {
      alert('Cüzdan bulunamadı! Lütfen zkLogin ile cüzdan bağlayın.');
      return;
    }

    const amountInMist = Math.floor(amount * 1_000_000_000);
    
    setIsSubmitting(true);
    try {
      // Harici cüzdan bağlıysa gerçek SUI transferi yap
      if (currentAccount?.address) {
        // Gerçek bağış - kullanıcının cüzdanından sponsor'a
        const tx = new Transaction();
        const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountInMist)]);
        
        tx.moveCall({
          target: `${PACKAGE_ID}::task::donate_to_sponsor`,
          arguments: [
            tx.object(taskId),
            coin,
            tx.pure.address(SPONSOR_ADDRESS),
            tx.pure.string(`${user.username || 'Anonim'} tarafından bağış`),
          ],
        });

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: () => {
              toast.success(`🎉 ${amount} SUI gerçek bağış yapıldı!`);
              setDonationAmount('');
              queryClient.invalidateQueries({ queryKey: ['task', taskId] });
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
              setIsSubmitting(false);
            },
            onError: (error: any) => {
              console.error('Gerçek bağış hatası:', error);
              toast.error('Bağış başarısız: ' + error.message);
              setIsSubmitting(false);
            },
          }
        );
      } else {
        // Harici cüzdan yok - Backend sponsored demo bağış
        const response = await api.post(`/api/tasks/${taskId}/donate-sponsored`, {
          amount: amountInMist,
        });

        if (response.data.success) {
          toast.success(`🎉 ${amount} SUI (demo) bağışlandı!`);
          setDonationAmount('');
          queryClient.invalidateQueries({ queryKey: ['task', taskId] });
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error('Bağış hatası:', error);
      alert('Bağış yapılırken hata: ' + (error.response?.data?.error || error.message));
      setIsSubmitting(false);
    }
  };
  
  const handleVote = async (voteType: number) => {
    if (!taskId) return;

    if (!user) {
      alert('Oy vermek için giriş yapmalısınız.');
      return;
    }

    if (!user.realWalletAddress) {
      alert('Cüzdan bulunamadı! Lütfen zkLogin ile cüzdan bağlayın.');
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
      }
    } catch (error: any) {
      console.error('Oy kullanılırken hata:', error);
      alert('Oy kullanılırken hata: ' + (error.response?.data?.error || error.message));
    } finally {
      // İşlem başarılı da olsa başarısız da olsa, en güncel veriyi çekmek için invalidate et.
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Ana sayfadaki listeyi de yenile
      queryClient.invalidateQueries({ queryKey: ['hasVoted', taskId, user?.realWalletAddress] });
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !taskId) return;

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
  const userVote = task?.votes.find(v => v.voter === user?.realWalletAddress);
  const hasVoted = hasVotedStatus; // Use the result from the new query

  // Check if user is participant - use user's wallet address from auth store
  const isParticipant = user?.realWalletAddress && task?.participants.includes(user.realWalletAddress);
  const canJoin = task?.task_type === 0 && task?.status === 1; // Only PARTICIPATION type and ACTIVE status
  const canDonate = task?.task_type === 1 || task?.task_type === 2;
  const isVoting = task?.status === 0;

  if (isLoading || isLoadingHasVoted) {
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${task?.creator.address}`);
              }}
              className="text-[#2AA5FE] hover:text-[#53bfff] text-xs font-mono hover:underline"
            >
              ({task?.creator.address.slice(0, 6)}...{task?.creator.address.slice(-4)})
            </button>
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

        {/* Task Completion Claim Component - Sadece profileId varsa göster */}
        {user && task && localStorage.getItem('userProfileId') && (
          <TaskCompletionClaim
            taskId={task.id}
            profileId={localStorage.getItem('userProfileId') || ''}
            taskTitle={task.title}
            isParticipant={!!isParticipant}
            isCreator={task.creator.address === user.realWalletAddress}
            taskType={task.task_type}
            taskStatus={task.status}
            onClaimed={() => {
              queryClient.invalidateQueries({ queryKey: ['task', taskId] });
              setTimeout(() => navigate('/profile'), 1500);
            }}
          />
        )}

        {/* Oylama Bölümü - Sadece VOTING durumunda göster */}
        {isVoting && (
          <div className="bg-gradient-to-r from-yellow-900 to-yellow-800 bg-opacity-50 backdrop-blur-lg rounded-2xl p-6 border-2 border-yellow-500 mb-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-yellow-100">🗳️ Topluluk Oylaması</h2>
              <div className="bg-yellow-700 bg-opacity-50 px-4 py-2 rounded-full border border-yellow-400">
                <span className="text-yellow-100 font-bold text-lg">
                  📊 {totalVotes} Toplam Oy
                </span>
              </div>
            </div>

            {/* Oy İstatistikleri Kartları */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Evet Oyları */}
              <div className="bg-green-900 bg-opacity-40 border-2 border-green-500 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-300 font-bold text-sm">👍 EVET</span>
                  <span className="text-green-200 text-xs font-semibold">{yesPercentage}%</span>
                </div>
                <div className="text-white font-bold text-3xl mb-1">{yesVotes}</div>
                <div className="text-green-300 text-xs">
                  {yesVotes === 1 ? 'kişi onayladı' : 'kişi onayladı'}
                </div>
              </div>

              {/* Hayır Oyları */}
              <div className="bg-red-900 bg-opacity-40 border-2 border-red-500 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-red-300 font-bold text-sm">👎 HAYIR</span>
                  <span className="text-red-200 text-xs font-semibold">{100 - yesPercentage}%</span>
                </div>
                <div className="text-white font-bold text-3xl mb-1">{noVotes}</div>
                <div className="text-red-300 text-xs">
                  {noVotes === 1 ? 'kişi reddetti' : 'kişi reddetti'}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-yellow-200 mb-2">
                <span className="font-semibold">Onay Oranı</span>
                <span className="font-semibold">
                  {yesPercentage >= 50 ? '✅ Onay Eşiği Geçildi' : `❌ %${50 - yesPercentage} daha gerekli`}
                </span>
              </div>
              <div className="relative w-full bg-gray-700 rounded-full h-6 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-400 h-full transition-all duration-500 shadow-lg flex items-center justify-center"
                  style={{ width: `${yesPercentage}%` }}
                >
                  {yesPercentage > 10 && (
                    <span className="text-white text-xs font-bold">{yesPercentage}%</span>
                  )}
                </div>
                {/* %50 İşareti */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-yellow-300 opacity-50"></div>
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                  <span className="text-xs text-yellow-300 font-semibold">↓ %50</span>
                </div>
              </div>
            </div>

            {/* Oylama Bitiş Tarihi */}
            <div className="mb-6 p-3 bg-yellow-800 bg-opacity-30 rounded-lg border border-yellow-600">
              <p className="text-yellow-200 text-sm text-center">
                ⏰ <strong>Oylama Bitiş:</strong> {task?.voting_end_date ? new Date(parseInt(task.voting_end_date.toString())).toLocaleString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Bilinmiyor'}
              </p>
            </div>

            {/* Oy Verme Butonları veya Durum */}
            {hasVoted ? (
              <div className="bg-gradient-to-r from-yellow-700 to-yellow-600 bg-opacity-50 border-2 border-yellow-400 rounded-xl p-6 shadow-lg">
                <div className="text-center">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-yellow-100 font-bold text-lg mb-1">
                    Oyunuzu Kullandınız
                  </p>
                  <p className="text-yellow-200 text-sm">
                    Tercihiniz: <span className="font-bold text-white">
                      {userVote?.vote_type === 1 ? '👍 Evet' : '👎 Hayır'}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleVote(1)}
                    disabled={isSubmitting || !user}
                    className="group relative overflow-hidden px-6 py-5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-2">
                      <span className="text-2xl">👍</span>
                      <span>{isSubmitting ? 'İşleniyor...' : 'Evet'}</span>
                    </div>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  </button>
                  <button
                    onClick={() => handleVote(0)}
                    disabled={isSubmitting || !user}
                    className="group relative overflow-hidden px-6 py-5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-2">
                      <span className="text-2xl">👎</span>
                      <span>{isSubmitting ? 'İşleniyor...' : 'Hayır'}</span>
                    </div>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  </button>
                </div>

                {!user && (
                  <div className="bg-orange-900 bg-opacity-30 border border-orange-400 rounded-lg p-3">
                    <p className="text-orange-200 text-sm text-center font-semibold">
                      ⚠️ Oy kullanmak için giriş yapmalasanız
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Bilgilendirme */}
            <div className="mt-6 p-4 bg-blue-900 bg-opacity-30 border border-blue-400 rounded-xl">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div className="flex-1">
                  <p className="text-blue-200 text-sm font-semibold mb-1">Onay Koşulu</p>
                  <p className="text-blue-300 text-xs leading-relaxed">
                    Bu teklif <strong>%50'den fazla evet oy</strong> alırsa onaylanır ve aktif hale gelir.
                    {task?.task_type === 1 && (
                      <span className="block mt-1">
                        💰 Onaylanırsa <strong className="text-green-300">{(task.budget_amount / 1_000_000_000).toFixed(2)} SUI</strong> bütçe teklif sahibine transfer edilir.
                      </span>
                    )}
                  </p>
                </div>
              </div>
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
                disabled={!user || isParticipant || isSubmitting}
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
                  disabled={!user || isSubmitting}
                />
                <button
                  onClick={handleDonate}
                  disabled={!user || isSubmitting || !donationAmount || parseFloat(donationAmount) <= 0}
                  className="w-1/2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'İşleniyor...' : 'Bağış Yap'}
                </button>
              </div>
            )}
          </div>
          {!canJoin && !canDonate && task?.status === 0 && (
            <p className="text-yellow-400 text-sm text-center mt-2">
              ⏳ Bu teklif henüz oylamada. Onaylandıktan sonra katılabilirsiniz.
            </p>
          )}
          <p className="text-green-400 text-sm text-center mt-4">
            ⛽ Gas ücreti sponsor tarafından karşılanmaktadır.
          </p>
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
              {user?.avatar && (
                <img src={user?.avatar} alt="Your avatar" className="w-10 h-10 rounded-full"/>
              )}
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Yorumunuzu buraya yazın..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={!user || isSubmitting}
                />
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-green-400">
                    ✨ Yorum yapma ücretsizdir! Gas fee'leri platform tarafından karşılanmaktadır.
                  </p>
                  <button
                    type="submit"
                    disabled={!user || !newComment.trim() || isSubmitting}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Gönderiliyor...' : 'Yorum Yap'}
                  </button>
                </div>
              </div>
            </div>
            {!user && (
              <p className="text-sm text-yellow-400 mt-2">Yorum yapmak için giriş yapmalısınız.</p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
