import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('tf_auth_token'),
  user: localStorage.getItem('tf_user') ? JSON.parse(localStorage.getItem('tf_user')!) : null,
  isAuthenticated: !!localStorage.getItem('tf_auth_token'),

  setAuth: (token: string, user: User) => {
    localStorage.setItem('tf_auth_token', token);
    localStorage.setItem('tf_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('tf_auth_token');
    localStorage.removeItem('tf_user');
    sessionStorage.removeItem('tf_admission_token');
    sessionStorage.removeItem('tf_admission_event');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
