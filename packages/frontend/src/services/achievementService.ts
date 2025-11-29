import api from './api';

export const achievementService = {
  mintAchievement: async (data: {
    achievementType: string;
    taskId?: string;
    tasksCompleted?: number;
    donationsMade?: number;
    totalDonatedAmount?: number;
  }) => {
    const response = await api.post('/api/user/mint-achievement', data);
    return response.data;
  },

  getUserAchievements: async () => {
    const response = await api.get('/api/user/achievements');
    return response.data;
  },
};
