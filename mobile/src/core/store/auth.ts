import { create } from 'zustand';
import { apiClient } from '../api/client';
import { secureStorage } from '../storage/secure';

export interface User {
  id: string;
  name: string;
  email?: string;
  phoneNumber: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initializeAuth: () => Promise<void>;
  sendOtp: (phoneNumber: string) => Promise<boolean>;
  verifyOtp: (phoneNumber: string, code: string, name?: string, role?: string) => Promise<boolean>;
  login: (phoneNumber: string, password: string) => Promise<boolean>;
  register: (name: string, phoneNumber: string, password: string) => Promise<boolean>;
  verifyRegisterOtp: (phoneNumber: string, code: string) => Promise<boolean>;
  resendRegisterOtp: (phoneNumber: string) => Promise<boolean>;
  sendForgotPasswordOtp: (phoneNumber: string) => Promise<boolean>;
  resetPassword: (phoneNumber: string, code: string, newPassword: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      const accessToken = await secureStorage.getAccessToken();
      const refreshToken = await secureStorage.getRefreshToken();

      if (accessToken && refreshToken) {
        // Fetch profile to verify session is active
        const response = await apiClient.get('/profile');
        set({
          user: response.data.data.profile,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      console.log('Auto login failed, credentials expired or offline.');
      await secureStorage.clearTokens();
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    }
  },

  sendOtp: async (phoneNumber: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post('/auth/otp/send', { phoneNumber });
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      const msg = error.response?.data?.error || (error.request ? 'Connection failed. Please check if the backend server is running.' : error.message) || 'Failed to send OTP';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  verifyOtp: async (phoneNumber: string, code: string, name?: string, role?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/otp/verify', { phoneNumber, code, name, role });
      const { accessToken, refreshToken, user } = response.data.data;
      await secureStorage.saveTokens(accessToken, refreshToken);

      set({
        user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (error: any) {
      const msg = error.response?.data?.error || (error.request ? 'Connection failed. Please check if the backend server is running.' : error.message) || 'Failed to verify OTP';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  login: async (phoneNumber, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/login', { phoneNumber, password });
      const { accessToken, refreshToken, user } = response.data.data;
      await secureStorage.saveTokens(accessToken, refreshToken);
      set({
        user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (error: any) {
      const msg = error.response?.data?.error || (error.request ? 'Connection failed. Please check if the backend server is running.' : error.message) || 'Failed to login';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  register: async (name, phoneNumber, password) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post('/auth/register', { name, phoneNumber, password });
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      const msg = error.response?.data?.error || (error.request ? 'Connection failed. Please check if the backend server is running.' : error.message) || 'Failed to register';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  verifyRegisterOtp: async (phoneNumber, code) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/register/verify', { phoneNumber, code });
      const { accessToken, refreshToken, user } = response.data.data;
      await secureStorage.saveTokens(accessToken, refreshToken);
      set({
        user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (error: any) {
      const msg = error.response?.data?.error || (error.request ? 'Connection failed. Please check if the backend server is running.' : error.message) || 'Failed to verify registration code';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  resendRegisterOtp: async (phoneNumber) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post('/auth/register/resend', { phoneNumber });
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      const msg = error.response?.data?.error || (error.request ? 'Connection failed. Please check if the backend server is running.' : error.message) || 'Failed to resend registration code';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  sendForgotPasswordOtp: async (phoneNumber) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post('/auth/forgot-password/send', { phoneNumber });
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      const msg = error.response?.data?.error || (error.request ? 'Connection failed. Please check if the backend server is running.' : error.message) || 'Failed to send password reset OTP';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  resetPassword: async (phoneNumber, code, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post('/auth/forgot-password/reset', { phoneNumber, code, newPassword });
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      const msg = error.response?.data?.error || (error.request ? 'Connection failed. Please check if the backend server is running.' : error.message) || 'Failed to reset password';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    await secureStorage.clearTokens();
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },
}));
