import api from './api';

export const taskService = {
  getTasks: async (filters?: { type?: string; status?: string; coalitionId?: string }) => {
    const params = new URLSearchParams(filters as any);
    const response = await api.get(`/api/tasks?${params}`);
    return response.data;
  },

  getTask: async (id: string) => {
    const response = await api.get(`/api/tasks/${id}`);
    return response.data;
  },

  createTask: async (taskData: any) => {
    const response = await api.post('/api/tasks', taskData);
    return response.data;
  },

  addComment: async (taskId: string, content: string, parentId?: string) => {
    const response = await api.post(`/api/tasks/${taskId}/comments`, { content, parentId });
    return response.data;
  },
};
