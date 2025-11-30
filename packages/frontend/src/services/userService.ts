import api from './api';

interface UserProfile {
  realWalletAddress: string;
  username: string;
  avatar: string;
  firstName: string | null;
  lastName: string | null;
}

const getProfilesByWalletAddresses = async (addresses: string[]): Promise<UserProfile[]> => {
  try {
    const response = await api.post('/api/user/profiles-by-wallets', { addresses });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user profiles by wallet addresses:', error);
    return [];
  }
};

export const userService = {
  getProfilesByWalletAddresses,
};
