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
  // Virtual Wallet: Auto-generated for sponsored transactions
  suiWalletAddress?: string;
  // Real Wallet: User's connected Sui wallet (optional)
  realWalletAddress?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
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
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
