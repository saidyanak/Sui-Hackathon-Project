
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = import.meta.env.VITE_SUI_PACKAGE_ID;
export const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

export const taskService = {
  /**
   * Yeni task oluştur (Profile entegrasyonu ile)
   * @param profileId - UserProfile object ID
   * @param title - Task başlığı
   * @param description - Task açıklaması
   * @param taskType - 0: PARTICIPATION, 1: PROPOSAL
   * @param budgetAmount - Bütçe (MIST cinsinden)
   * @param minParticipants - Minimum katılımcı sayısı
   * @param maxParticipants - Maximum katılımcı sayısı
   * @param votingEndDate - Oylama bitiş tarihi (timestamp)
   */
  createTask: async (
    profileId: string,
    title: string,
    description: string,
    taskType: number,
    budgetAmount: number,
    minParticipants: number,
    maxParticipants: number,
    votingEndDate: number
  ) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::task::create_task`,
      arguments: [
        tx.object(profileId),
        tx.pure.string(title),
        tx.pure.string(description),
        tx.pure.u8(taskType),
        tx.pure.u64(budgetAmount),
        tx.pure.u64(minParticipants),
        tx.pure.u64(maxParticipants),
        tx.pure.u64(votingEndDate),
      ],
    });

    return tx;
  },

  /**
   * Task'a oy ver (Profile entegrasyonu ile)
   * @param taskId - Task object ID
   * @param profileId - UserProfile object ID
   * @param voteType - 1: YES, 0: NO
   */
  voteTask: async (taskId: string, profileId: string, voteType: number) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::task::vote_task`,
      arguments: [
        tx.object(taskId),
        tx.object(profileId),
        tx.pure.u8(voteType),
      ],
    });

    return tx;
  },

  /**
   * Task'a katıl (Profile entegrasyonu ile)
   * @param taskId - Task object ID
   * @param profileId - UserProfile object ID
   */
  joinTask: async (taskId: string, profileId: string) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::task::join_task`,
      arguments: [tx.object(taskId), tx.object(profileId)],
    });

    return tx;
  },

  /**
   * Task'a yorum ekle
   * @param taskId - Task object ID
   * @param content - Yorum içeriği
   */
  addComment: async (taskId: string, authorAddress: string, content: string) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::task::add_comment`,
      arguments: [
        tx.object(taskId),
        tx.pure.address(authorAddress),
        tx.pure.string(content),
      ],
    });

    return tx;
  },
  // Sui blockchain'den taskları çek (event'ler üzerinden)
  getTasks: async () => {
    try {
      // TaskCreated event'lerini query'le
      const events = await suiClient.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::task::TaskCreated`
        },
        limit: 50,
        order: 'descending'
      });

      // Her event için task objesini getir
      const tasks = await Promise.all(
        events.data.map(async (event: any) => {
          const taskId = event.parsedJson.task_id;
          try {
            const taskObject = await suiClient.getObject({
              id: taskId,
              options: {
                showContent: true,
                showType: true,
              }
            });

            if (taskObject.data?.content && 'fields' in taskObject.data.content) {
              const fields = taskObject.data.content.fields as any;

              // Count votes - vote_type 1 = YES, 0 = NO
              const votes = fields.votes || [];
              const yesVotes = votes.filter((v: any) => {
                const voteType = v.fields?.vote_type;
                return voteType === 1 || voteType === '1';
              }).length;
              const noVotes = votes.filter((v: any) => {
                const voteType = v.fields?.vote_type;
                return voteType === 0 || voteType === '0';
              }).length;

              return {
                id: taskId,
                title: fields.title,
                description: fields.description,
                taskType: Number(fields.task_type),
                status: Number(fields.status),
                creator: fields.creator,
                budgetAmount: Number(fields.budget_amount) || 0,
                targetAmount: Number(fields.budget_amount) || 0,
                currentAmount: 0,
                participantsCount: fields.participants?.length || 0,
                donationsCount: fields.donations?.length || 0,
                commentsCount: fields.comments?.length || 0,
                votes: votes,
                yesVotes: yesVotes,
                noVotes: noVotes,
                minParticipants: Number(fields.min_participants) || 0,
                maxParticipants: Number(fields.max_participants) || 0,
                votingEndDate: Number(fields.voting_end_date),
                endDate: Number(fields.voting_end_date), // Alias for backward compatibility
                createdAt: Number(fields.created_at),
              };
            }
            return null;
          } catch (err) {
            console.error('Error fetching task:', taskId, err);
            return null;
          }
        })
      );

      return tasks.filter((task): task is NonNullable<typeof task> => task !== null);
    } catch (error) {
      console.error('Error fetching tasks from Sui:', error);
      return [];
    }
  },

  // Tek bir task'ı blockchain'den çek
  getTask: async (id: string) => {
    try {
      const taskObject = await suiClient.getObject({
        id,
        options: {
          showContent: true,
          showType: true,
        }
      });

      if (taskObject.data?.content && 'fields' in taskObject.data.content) {
        const fields = taskObject.data.content.fields as any;
        return {
          id,
          title: fields.title,
          description: fields.description,
          taskType: fields.task_type,
          status: fields.status,
          creator: fields.creator,
          targetAmount: fields.target_amount,
          currentAmount: fields.current_amount,
          participants: fields.participants || [],
          donations: fields.donations || [],
          comments: fields.comments || [],
          startDate: fields.start_date,
          endDate: fields.end_date,
          createdAt: fields.created_at,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching task from Sui:', error);
      return null;
    }
  },
};
