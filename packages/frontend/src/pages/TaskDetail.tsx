// === ENTIRE FILE TRANSLATED TO ENGLISH ===

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSuiClient, useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { SuiObjectData } from '@mysten/sui/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { userService } from '../services/userService';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import { TaskCompletionClaim } from '../components/TaskCompletionClaim';

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

  const parsedVotes = (fields.votes || []).map((v: any) => {
    const voteFields = v.fields || v;
    return {
      voter: voteFields.voter,
      vote_type: Number(voteFields.vote_type),
      timestamp: voteFields.timestamp,
    };
  });

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

  const { user } = useAuthStore((state) => ({ user: state.user }));

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
      if (object.data?.content &&
        'fields' in object.data.content &&
        Array.isArray((object.data.content as any).fields.donations)) {

        donations = (object.data.content as any).fields.donations.map((d: any) => ({
          donor: d.fields.donor,
          amount: Number(d.fields.amount),
        }));
        donorAddresses = donations.map(d => d.donor);
      }

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

  const { data: hasVotedStatus, isLoading: isLoadingHasVoted } = useQuery({
    queryKey: ['hasVoted', taskId, user?.suiWalletAddress],
    queryFn: async () => {
      if (!taskId || !user?.suiWalletAddress) return false;

      const tx = new TransactionBlock();
      tx.moveCall({
        target: `${PACKAGE_ID}::task::has_voted`,
        arguments: [
          tx.object(taskId),
          tx.pure.address(user.suiWalletAddress)
        ],
      });

      const result = await client.devInspectTransactionBlock({
        sender: user.suiWalletAddress,
        transactionBlock: tx,
      });

      if (result.results?.[0]?.returnValues) {
        const [value] = result.results[0].returnValues[0];
        return value[0] === 1;
      }
      return false;
    },
    enabled: !!taskId && !!user?.suiWalletAddress && !!client,
  });

  const runMutation = (transaction: TransactionBlock, successMessage: string) => {
    setIsSubmitting(true);
    signAndExecute({ transaction }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        queryClient.invalidateQueries({ queryKey: ['hasVoted', taskId, user?.suiWalletAddress] });
        setIsSubmitting(false);
        setDonationAmount('');
      },
      onError: () => setIsSubmitting(false)
    });
  };

  const handleJoin = async () => {
    if (!taskId) return;

    if (!user) {
      alert('You must be logged in to join.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post(`/api/tasks/${taskId}/join-sponsored`);
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
    } catch (error: any) {
      alert('Error while joining: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDonate = () => {
    const amount = parseFloat(donationAmount);
    if (!taskId || isNaN(amount) || amount <= 0) return;

    const amountInMist = Math.floor(amount * 1_000_000_000);
    const tx = new TransactionBlock();
    const coin = tx.splitCoins(tx.gas, [amountInMist]);

    tx.moveCall({
      target: `${PACKAGE_ID}::task::donate`,
      arguments: [tx.object(taskId), coin, tx.pure.string('Donation from frontend')],
    });

    runMutation(tx, 'Successfully donated!');
  };
  
  const handleVote = async (voteType: number) => {
    if (!taskId) return;

    if (!user) {
      alert('You must be logged in to vote.');
      return;
    }

    const profileId = localStorage.getItem('userProfileId');
    if (!profileId) {
      alert('Profile not found! Please log out and log back in.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/api/tasks/${taskId}/vote-sponsored`, { voteType, profileId });
    } catch (error: any) {
      alert('Error while voting: ' + (error.response?.data?.error || error.message));
    } finally {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['hasVoted', taskId, user?.suiWalletAddress] });
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !taskId) return;

    if (!user) {
      alert('You must be logged in to comment.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post(`/api/tasks/${taskId}/comment-sponsored`, {
        content: newComment,
      });

      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        setNewComment('');
      }
    } catch (error: any) {
      alert('Error adding comment: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper functions
  const getTaskStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-yellow-500';
      case 1: return 'bg-green-500';
      case 2: return 'bg-red-500';
      case 3: return 'bg-gray-500';
      case 4: return 'bg-gray-600';
      default: return 'bg-gray-500';
    }
  };

  const getTaskStatusName = (status: number) => {
    switch (status) {
      case 0: return 'Voting';
      case 1: return 'Active';
      case 2: return 'Rejected';
      case 3: return 'Completed';
      case 4: return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const getTaskTypeName = (taskType: number) => {
    switch (taskType) {
      case 0: return 'Participation';
      case 1: return 'Project';
      default: return 'Unknown';
    }
  };

  const yesVotes = task?.votes.filter(v => v.vote_type === 1).length || 0;
  const noVotes = task?.votes.filter(v => v.vote_type === 0).length || 0;
  const totalVotes = yesVotes + noVotes;
  const yesPercentage = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;

  const userVote = task?.votes.find(v => v.voter === user?.suiWalletAddress);
  const hasVoted = hasVotedStatus;
  const isParticipant = user?.suiWalletAddress && task?.participants.includes(user.suiWalletAddress);

  const canJoin = task?.task_type === 0 && task?.status === 1;
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
          <h2 className="text-2xl font-bold text-red-500 mb-4">Task Failed to Load</h2>
          <p className="text-gray-400">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

return (
  <div className="min-h-screen bg-gradient-to-br from-[#0A1A2F] via-[#0C2238] to-[#071018] text-white">

    {/* Header */}
    <header className="h-20 bg-white/5 backdrop-blur-xl border-b border-white/10 flex items-center px-10 sticky top-0 z-30">
      <button
        onClick={() => navigate(-1)}
        className="text-gray-300 hover:text-white transition"
      >
        ← Go Back
      </button>
    </header>

    <main className="max-w-4xl mx-auto px-6 pt-6 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#8BD7FF] mb-3">{task?.title}</h1>

        <div className="flex items-center gap-3 mb-4">
          {task?.creator.avatar && <img src={task.creator.avatar} className="w-8 h-8 rounded-full" />}
          <span className="text-gray-400">
            Created by {task?.creator.username || 'Unknown User'}
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
          <span className={`px-3 py-1 rounded-lg text-sm font-bold ${task?.task_type === 0 ? 'bg-blue-500/80' : 'bg-orange-500/80'}`}>
            {getTaskTypeName(task?.task_type || 0)}
          </span>
          <span className={`${getTaskStatusColor(task?.status || 0)} text-white px-3 py-1 rounded-lg`}>
            {getTaskStatusName(task?.status || 0)}
          </span>
        </div>
      </div>

      {/* CLAIM COMPONENT */}
      {user && task && (
        <TaskCompletionClaim
          taskId={task.id}
          profileId={localStorage.getItem('userProfileId') || ''}
          taskTitle={task.title}
          isParticipant={!!isParticipant}
          isCreator={task.creator.address === user.suiWalletAddress}
          taskType={task.task_type}
          taskStatus={task.status}
          onClaimed={() => {
            queryClient.invalidateQueries({ queryKey: ['task', taskId] });
            setTimeout(() => navigate('/profile'), 1500);
          }}
        />
      )}

      {/* Voting Section */}
      {isVoting && (
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-lg mb-10">
          <h2 className="text-2xl font-bold text-[#8BD7FF] mb-6 flex items-center gap-2">
            🗳️ Community Voting
            <span className="text-white/50 text-sm">({totalVotes} total votes)</span>
          </h2>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 mb-8">

            <div className="bg-green-500/20 border border-green-500/40 p-5 rounded-xl">
              <p className="text-green-300 font-semibold text-sm mb-1">👍 YES</p>
              <p className="text-3xl font-bold">{yesVotes}</p>
              <p className="text-xs text-gray-300 mt-1">{yesVotes} approved</p>
            </div>

            <div className="bg-red-500/20 border border-red-500/40 p-5 rounded-xl">
              <p className="text-red-300 font-semibold text-sm mb-1">👎 NO</p>
              <p className="text-3xl font-bold">{noVotes}</p>
              <p className="text-xs text-gray-300 mt-1">{noVotes} rejected</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-yellow-200 mb-2">
              <span className="font-semibold">Approval Rate</span>
              <span className="font-semibold">
                {yesPercentage >= 50
                  ? '✅ Approval Threshold Passed'
                  : `❌ ${50 - yesPercentage}% more required`}
              </span>
            </div>

            <div className="relative w-full bg-gray-700 rounded-full h-6 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-green-400 h-full transition-all duration-500 flex items-center justify-center"
                style={{ width: `${yesPercentage}%` }}
              >
                {yesPercentage > 10 && (
                  <span className="text-white text-xs font-bold">{yesPercentage}%</span>
                )}
              </div>

              <div className="absolute top-0 left-1/2 w-0.5 bg-yellow-300 opacity-50 h-full"></div>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-300 text-xs font-semibold">
                ↓ 50%
              </div>
            </div>
          </div>

          {/* Voting Deadline */}
          <div className="mb-6 p-3 bg-yellow-800 bg-opacity-30 rounded-lg border border-yellow-600">
            <p className="text-yellow-200 text-sm text-center">
              ⏰ <strong>Voting Ends:</strong>{' '}
              {task?.voting_end_date
                ? new Date(parseInt(task.voting_end_date.toString())).toLocaleString()
                : 'Unknown'}
            </p>
          </div>

          {/* Buttons */}
          {!hasVoted ? (
            <div className="flex gap-4">

              <button
                onClick={() => handleVote(1)}
                className="flex-1 py-3 bg-[#2AA5FE] hover:bg-[#53bfff] text-black font-bold rounded-xl"
              >
                👍 Yes
              </button>

              <button
                onClick={() => handleVote(0)}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl"
              >
                👎 No
              </button>

            </div>
          ) : (
            <p className="text-center text-green-400 font-semibold">
              👍 You voted — {userVote?.vote_type === 1 ? "Yes" : "No"}
            </p>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-900 bg-opacity-30 border border-blue-400 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div className="flex-1">
                <p className="text-blue-200 text-sm font-semibold mb-1">Approval Condition</p>
                <p className="text-blue-300 text-xs">
                  This proposal must receive <strong>over 50% yes votes</strong> to be approved.
                  {task?.task_type === 1 && (
                    <span className="block mt-1">
                      💰 If approved, <strong className="text-green-300">
                        {(task.budget_amount / 1_000_000_000).toFixed(2)} SUI
                      </strong> will be transferred to the proposer.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Take Action */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-lg mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Take Action</h2>
        <div className="flex flex-col md:flex-row gap-4">
          {canJoin && (
            <button
              onClick={handleJoin}
              disabled={!user || isParticipant || isSubmitting}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {isParticipant ? 'Already Joined' : (isSubmitting ? 'Processing...' : 'Join Task')}
            </button>
          )}

          {canDonate && (
            <div className="flex-1 flex gap-2">
              <input
                type="number"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                placeholder="SUI Amount"
                className="w-1/2 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                disabled={!user || isSubmitting}
              />
              <button
                onClick={handleDonate}
                disabled={!user || isSubmitting || !donationAmount || parseFloat(donationAmount) <= 0}
                className="w-1/2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : 'Donate'}
              </button>
            </div>
          )}
        </div>

        {!canJoin && !canDonate && task?.status === 0 && (
          <p className="text-yellow-400 text-sm text-center mt-2">
            ⏳ This proposal is currently in voting. You may join once it is approved.
          </p>
        )}

        <p className="text-green-400 text-sm text-center mt-4">
          ⛽ Gas fees are sponsored by the platform.
        </p>
      </div>

      {/* Comments */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">Comments ({task?.comments.length})</h2>

        <div className="space-y-6">
          {task?.comments.map((comment, index) => (
            <div key={index} className="flex items-start gap-4">
              <img src={comment.profile?.avatar} className="w-10 h-10 rounded-full"/>
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-purple-400">
                    {comment.profile?.username ||
                      `${comment.author.slice(0, 6)}...${comment.author.slice(-4)}`}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-300">{comment.content}</p>
              </div>
            </div>
          ))}

          {task?.comments.length === 0 && (
            <div className="text-center py-8 bg-gray-800 rounded-lg">
              <p className="text-gray-500">No comments yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Comment */}
      <form onSubmit={handleCommentSubmit}>
        <h3 className="text-xl font-bold text-white mb-4">Add a Comment</h3>

        <div className="flex items-start gap-4">
          {user?.avatar && <img src={user.avatar} className="w-10 h-10 rounded-full" />}

          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write your comment here..."
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#2AA5FE]"
              disabled={!user || isSubmitting}
            />

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-green-400">
                ✨ Commenting is free! Gas fees are sponsored by the platform.
              </p>
              <button
                type="submit"
                disabled={!user || !newComment.trim() || isSubmitting}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Submit Comment'}
              </button>
            </div>
          </div>
        </div>

        {!user && (
          <p className="text-sm text-yellow-400 mt-2">You must be logged in to comment.</p>
        )}
      </form>
    </main>
  </div>
);
}
