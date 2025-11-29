
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
const PACKAGE_ID = import.meta.env.VITE_SUI_PACKAGE_ID;

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

export const taskService = {
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

              // Count votes
              const votes = fields.votes || [];
              const yesVotes = votes.filter((v: any) => v.fields?.vote_type === 1).length;
              const noVotes = votes.filter((v: any) => v.fields?.vote_type === 0).length;

              return {
                id: taskId,
                title: fields.title,
                description: fields.description,
                taskType: fields.task_type,
                status: fields.status,
                creator: fields.creator,
                targetAmount: fields.target_amount,
                currentAmount: fields.current_amount,
                participantsCount: fields.participants?.length || 0,
                donationsCount: fields.donations?.length || 0,
                commentsCount: fields.comments?.length || 0,
                votes: votes,
                yesVotes: yesVotes,
                noVotes: noVotes,
                startDate: fields.start_date,
                endDate: fields.end_date,
                createdAt: fields.created_at,
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
