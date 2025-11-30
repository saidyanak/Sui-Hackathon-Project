import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  intraId?: number;
  googleId?: string;
  role: string;
  // zkLogin cüzdanı (tek cüzdan)
  realWalletAddress?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

// Initialize from localStorage
const getInitialState = () => {
  if (typeof window === 'undefined') return { user: null, token: null, isAuthenticated: false };

  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      return { user, token, isAuthenticated: true };
    } catch {
      return { user: null, token: null, isAuthenticated: false };
    }
  }

  return { user: null, token: null, isAuthenticated: false };
};

export const useAuthStore = create<AuthState>((set) => ({
  ...getInitialState(),
  setAuth: (user: User, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  setToken: (token: string) => {
    localStorage.setItem('token', token);
    set({ token, isAuthenticated: true });
  },
  logout: () => {
    // Tüm auth ve kullanıcı verilerini temizle
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userProfileId');
    
    // zkLogin verilerini temizle
    localStorage.removeItem('zklogin_salt');
    localStorage.removeItem('zklogin_nonce');
    
    // Wallet connection bilgilerini temizle (dapp-kit storage)
    localStorage.removeItem('sui-dapp-kit:wallet-connection-info');
    
    // State'i sıfırla
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
