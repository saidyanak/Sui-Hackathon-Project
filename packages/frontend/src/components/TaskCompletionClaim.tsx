import React, { useState } from 'react';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { profileService } from '../services/profileService';
import { toast } from 'react-hot-toast';

interface TaskCompletionClaimProps {
  taskId: string;
  profileId: string;
  taskTitle: string;
  isParticipant: boolean;
  isCreator: boolean;
  taskType: number; // 0: PARTICIPATION, 1: PROPOSAL
  taskStatus: number; // Status kontrolü için
  onClaimed?: () => void;
}

/**
 * Task Completion Claim Component
 *
 * Task tamamlandığında kullanıcıların profillerini güncellemelerini sağlar
 * - Katılımcılar: claim_task_completion() çağırır
 * - Creator (Proposal): claim_proposal_approval() çağırır
 */
export function TaskCompletionClaim({
  taskId,
  profileId,
  taskTitle,
  isParticipant,
  isCreator,
  taskType,
  taskStatus,
  onClaimed,
}: TaskCompletionClaimProps) {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  // Task tamamlanmış mı kontrol et
  const isCompleted = taskStatus === 3; // TASK_STATUS_COMPLETED
  const isActive = taskStatus === 1; // TASK_STATUS_ACTIVE

  // Katılımcı için: Task completed olmalı
  const canClaimAsParticipant = isParticipant && isCompleted;

  // Creator için: Task active veya completed olmalı (Proposal tipi)
  const canClaimAsCreator = isCreator && taskType === 1 && (isActive || isCompleted);

  const handleClaimCompletion = async () => {
    if (!profileId || claiming || claimed) return;

    try {
      setClaiming(true);

      const tx = await profileService.claimTaskCompletion(taskId, profileId);

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: () => {
            toast.success(
              `🎉 "${taskTitle}" görevi tamamlandı! İstatistikleriniz güncellendi.`,
              { duration: 5000 }
            );
            setClaimed(true);
            onClaimed?.();
          },
          onError: (error) => {
            console.error('Task completion claim error:', error);
            toast.error('Task tamamlama claim edilemedi');
            setClaiming(false);
          },
        }
      );
    } catch (error) {
      console.error('Error claiming task completion:', error);
      toast.error('Bir hata oluştu');
      setClaiming(false);
    }
  };

  const handleClaimProposalApproval = async () => {
    if (!profileId || claiming || claimed) return;

    try {
      setClaiming(true);

      const tx = await profileService.claimProposalApproval(taskId, profileId);

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: () => {
            toast.success(
              `🎉 "${taskTitle}" teklifiniz onaylandı! İstatistikleriniz güncellendi.`,
              { duration: 5000, icon: '🏆' }
            );
            setClaimed(true);
            onClaimed?.();
          },
          onError: (error) => {
            console.error('Proposal approval claim error:', error);
            toast.error('Proposal onay claim edilemedi');
            setClaiming(false);
          },
        }
      );
    } catch (error) {
      console.error('Error claiming proposal approval:', error);
      toast.error('Bir hata oluştu');
      setClaiming(false);
    }
  };

  // Hiçbir claim hakkı yoksa gösterme
  if (!canClaimAsParticipant && !canClaimAsCreator) {
    return null;
  }

  // Zaten claim edilmişse teşekkür mesajı göster
  if (claimed) {
    return (
      <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 text-center">
        <p className="text-green-400 font-semibold">✅ İstatistikleriniz güncellendi!</p>
        <p className="text-green-300 text-sm mt-1">
          Profilinizde yeni achievement'lar için kontrol edin
        </p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 text-4xl">🎁</div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-yellow-400 mb-2">
            {canClaimAsCreator ? 'Teklifiniz Onaylandı!' : 'Görevi Tamamladınız!'}
          </h3>
          <p className="text-gray-300 text-sm mb-4">
            {canClaimAsCreator
              ? 'Teklifiniz topluluk tarafından onaylandı. İstatistiklerinizi güncellemek için claim edin.'
              : 'Bu görevi tamamladınız! İstatistiklerinizi güncellemek ve achievement kazanmak için claim edin.'}
          </p>

          <div className="bg-white/10 rounded-lg p-3 mb-4 text-sm">
            <p className="text-gray-400 mb-2">Kazanacaklarınız:</p>
            <ul className="space-y-1 text-white">
              {canClaimAsCreator ? (
                <>
                  <li>✨ +1 Onaylanan Proposal</li>
                  <li>⭐ +20 Reputation Puanı</li>
                  <li>🏆 Potansiyel Achievement NFT'leri</li>
                </>
              ) : (
                <>
                  <li>✨ +1 Tamamlanan Task</li>
                  <li>⭐ +15 Reputation Puanı</li>
                  <li>🏆 Potansiyel Achievement NFT'leri</li>
                </>
              )}
            </ul>
          </div>

          <button
            onClick={
              canClaimAsCreator ? handleClaimProposalApproval : handleClaimCompletion
            }
            disabled={claiming}
            className="w-full bg-yellow-500 text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-yellow-500/50"
          >
            {claiming ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full"></div>
                Claim Ediliyor...
              </span>
            ) : (
              '🎁 Ödülü Claim Et'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
