import api from './api';

export const authService = {
  registerIntra: async (data: { intraId: string; email: string; displayName: string; username?: string; zkWalletAddress?: string }) => {
    const response = await api.post('/api/auth/register-intra', data);
    return response.data;
  },
  // zkLogin binding: start → server provides params (salt/nonce)
  startZkLogin: async () => {
    const response = await api.post('/api/auth/zklogin/start');
    return response.data; // { salt, jwtRandomness, nonce, ... }
  },
  // zkLogin binding: finish → send id_token + address
  finishZkLogin: async (payload: { idToken: string; address: string }) => {
    const response = await api.post('/api/auth/zklogin/finish', payload);
    return response.data; // { user }
  },
  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },
};
