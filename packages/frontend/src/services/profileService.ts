import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = import.meta.env.VITE_SUI_PACKAGE_ID;
const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

export const profileService = {
  /**
   * Yeni kullanıcı profili oluştur (zkLogin ile ilk giriş)
   * @param registry_id - ProfileRegistry object ID
   * @param intraId - 42 Intra ID
   * @param email - Kullanıcı email
   * @param displayName - Görünen isim
   */
  createProfile: async (
    registry_id: string,
    intraId: string,
    email: string,
    displayName: string
  ) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::profile::create_profile`,
      arguments: [
        tx.object(registry_id),
        tx.pure.string(intraId),
        tx.pure.string(email),
        tx.pure.string(displayName),
      ],
    });

    return tx;
  },

  /**
   * Kullanıcı profilini getir (address'e göre)
   * @param profileId - UserProfile object ID
   */
  getProfile: async (profileId: string) => {
    try {
      const profileObject = await suiClient.getObject({
        id: profileId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (profileObject.data?.content && 'fields' in profileObject.data.content) {
        const fields = profileObject.data.content.fields as any;

        return {
          id: profileId,
          userAddress: fields.user_address,
          intraId: fields.intra_id,
          email: fields.email,
          displayName: fields.display_name,
          createdAt: fields.created_at,
          isActive: fields.is_active,
          reputationScore: fields.reputation_score,
          stats: {
            tasksCreated: fields.stats.fields.tasks_created,
            tasksCompleted: fields.stats.fields.tasks_completed,
            tasksParticipated: fields.stats.fields.tasks_participated,
            donationsMade: fields.stats.fields.donations_made,
            totalDonatedAmount: fields.stats.fields.total_donated_amount,
            votesCast: fields.stats.fields.votes_cast,
            proposalsApproved: fields.stats.fields.proposals_approved,
          },
          achievements: fields.achievements || [],
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  },

  /**
   * Kullanıcının sahip olduğu tüm NFT'leri getir
   * @param userAddress - Kullanıcı cüzdan adresi
   */
  getUserNFTs: async (userAddress: string) => {
    try {
      const ownedObjects = await suiClient.getOwnedObjects({
        owner: userAddress,
        filter: {
          StructType: `${PACKAGE_ID}::nft::AchievementNFT`,
        },
        options: {
          showContent: true,
          showType: true,
        },
      });

      const nfts = ownedObjects.data
        .map((obj) => {
          if (obj.data?.content && 'fields' in obj.data.content) {
            const fields = obj.data.content.fields as any;
            return {
              id: obj.data.objectId,
              name: fields.name,
              description: fields.description,
              achievementType: fields.achievement_type,
              imageUrl: fields.image_url,
              earnedAt: fields.earned_at,
              recipient: fields.recipient,
              metadata: {
                rarity: fields.metadata.fields.rarity,
                tasksCompleted: fields.metadata.fields.tasks_completed,
                donationsMade: fields.metadata.fields.donations_made,
                totalDonatedAmount: fields.metadata.fields.total_donated_amount,
                reputationScore: fields.metadata.fields.reputation_score,
              },
            };
          }
          return null;
        })
        .filter((nft) => nft !== null);

      return nfts;
    } catch (error) {
      console.error('Error fetching user NFTs:', error);
      return [];
    }
  },

  /**
   * Achievement NFT claim et
   * @param profileId - UserProfile object ID
   * @param achievementType - Achievement tipi (0-8 arası)
   */
  claimAchievement: async (profileId: string, achievementType: number) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::nft::claim_and_mint_achievement`,
      arguments: [tx.object(profileId), tx.pure.u8(achievementType)],
    });

    return tx;
  },

  /**
   * Görünen ismi güncelle
   * @param profileId - UserProfile object ID
   * @param newName - Yeni görünen isim
   */
  updateDisplayName: async (profileId: string, newName: string) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::profile::update_display_name`,
      arguments: [tx.object(profileId), tx.pure.string(newName)],
    });

    return tx;
  },

  /**
   * Profili deaktive et
   * @param profileId - UserProfile object ID
   */
  deactivateProfile: async (profileId: string) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::profile::deactivate_profile`,
      arguments: [tx.object(profileId)],
    });

    return tx;
  },

  /**
   * Task completion claim et (task tamamlandıktan sonra)
   * @param taskId - Task object ID
   * @param profileId - UserProfile object ID
   */
  claimTaskCompletion: async (taskId: string, profileId: string) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::task::claim_task_completion`,
      arguments: [tx.object(taskId), tx.object(profileId)],
    });

    return tx;
  },

  /**
   * Proposal approval claim et (proposal onaylandıktan sonra creator için)
   * @param taskId - Task object ID
   * @param profileId - UserProfile object ID
   */
  claimProposalApproval: async (taskId: string, profileId: string) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::task::claim_proposal_approval`,
      arguments: [tx.object(taskId), tx.object(profileId)],
    });

    return tx;
  },

  /**
   * Achievement eligibility kontrol et
   * Frontend tarafında kullanıcının hangi achievement'ları kazanabileceğini göstermek için
   */
  checkAchievementEligibility: (profile: any) => {
    if (!profile || !profile.stats) return [];

    const eligible = [];

    const ACHIEVEMENT_FIRST_TASK = 0;
    const ACHIEVEMENT_ACTIVE_PARTICIPANT = 4;
    const ACHIEVEMENT_GENEROUS_DONOR = 3;
    const ACHIEVEMENT_COMMUNITY_LEADER = 5;
    const ACHIEVEMENT_SUPPORTER = 6;
    const ACHIEVEMENT_VOLUNTEER = 7;
    const ACHIEVEMENT_LEGENDARY = 8;

    // First Task (1 task completed)
    if (profile.stats.tasksCompleted >= 1) {
      eligible.push({
        type: ACHIEVEMENT_FIRST_TASK,
        name: 'First Task Completed',
        description: 'Completed your first task in the 42 community',
      });
    }

    // Active Participant (10+ tasks participated)
    if (profile.stats.tasksParticipated >= 10) {
      eligible.push({
        type: ACHIEVEMENT_ACTIVE_PARTICIPANT,
        name: 'Active Participant',
        description: 'Participated in 10+ community tasks',
      });
    }

    // Generous Donor (10+ SUI donated = 10_000_000_000 MIST)
    if (profile.stats.totalDonatedAmount >= 10_000_000_000) {
      eligible.push({
        type: ACHIEVEMENT_GENEROUS_DONOR,
        name: 'Generous Donor',
        description: 'Donated more than 10 SUI to community tasks',
      });
    }

    // Community Leader (5+ proposals approved)
    if (profile.stats.proposalsApproved >= 5) {
      eligible.push({
        type: ACHIEVEMENT_COMMUNITY_LEADER,
        name: 'Community Leader',
        description: 'Created 5+ successful community tasks',
      });
    }

    // Community Supporter (20+ donations)
    if (profile.stats.donationsMade >= 20) {
      eligible.push({
        type: ACHIEVEMENT_SUPPORTER,
        name: 'Community Supporter',
        description: 'Donated to 20+ different tasks',
      });
    }

    // Super Volunteer (50+ tasks completed)
    if (profile.stats.tasksCompleted >= 50) {
      eligible.push({
        type: ACHIEVEMENT_VOLUNTEER,
        name: 'Super Volunteer',
        description: 'Completed 50+ participation tasks',
      });
    }

    // Legendary (100+ reputation & 20+ tasks completed)
    if (profile.reputationScore >= 100 && profile.stats.tasksCompleted >= 20) {
      eligible.push({
        type: ACHIEVEMENT_LEGENDARY,
        name: 'Legendary 42 Contributor',
        description: 'Made an extraordinary contribution to the 42 Turkey community',
      });
    }

    return eligible;
  },

  /**
   * ProfileRegistry'den kullanıcı profil ID'sini bul
   * @param registryId - ProfileRegistry object ID
   * @param userAddress - Kullanıcı cüzdan adresi
   */
  findProfileByAddress: async (registryId: string, userAddress: string) => {
    try {
      const registryObject = await suiClient.getObject({
        id: registryId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (registryObject.data?.content && 'fields' in registryObject.data.content) {
        const fields = registryObject.data.content.fields as any;

        // Table içinde address -> profile_id mapping var
        // Bu bilgiyi dynamic field olarak okumak gerekiyor
        const profilesTable = fields.profiles.fields.id.id;

        // Dynamic field ile profile ID'yi al
        const dynamicField = await suiClient.getDynamicFieldObject({
          parentId: profilesTable,
          name: {
            type: 'address',
            value: userAddress,
          },
        });

        if (dynamicField.data?.content && 'fields' in dynamicField.data.content) {
          const profileId = (dynamicField.data.content.fields as any).value;
          return profileId;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding profile by address:', error);
      return null;
    }
  },

  /**
   * Tüm kullanıcı sayısını getir
   * @param registryId - ProfileRegistry object ID
   */
  getTotalUsers: async (registryId: string) => {
    try {
      const registryObject = await suiClient.getObject({
        id: registryId,
        options: {
          showContent: true,
        },
      });

      if (registryObject.data?.content && 'fields' in registryObject.data.content) {
        const fields = registryObject.data.content.fields as any;
        return fields.total_users;
      }

      return 0;
    } catch (error) {
      console.error('Error getting total users:', error);
      return 0;
    }
  },
};
