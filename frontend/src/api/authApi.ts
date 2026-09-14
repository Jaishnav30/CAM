import { apiFetch, setAccessToken } from './client';
import { AuthUser, RegisterRequest } from '../types';

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: AuthUser;
}

export const authApi = {
  async sendVerificationOtp(email: string, username?: string): Promise<string> {
    const res = await apiFetch<void>('/api/v1/auth/send-verification-otp', {
      method: 'POST',
      body: JSON.stringify({ email, username }),
    });
    return res.message || 'Verification code sent to your email address.';
  },

  async register(data: RegisterRequest): Promise<string> {
    const res = await apiFetch<void>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.message || 'Registration submitted successfully. Your account is pending administrator approval.';
  },

  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await apiFetch<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.data?.accessToken) {
      setAccessToken(res.data.accessToken);
    }
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
    }
  },

  async getMe(): Promise<AuthUser> {
    const res = await apiFetch<AuthUser>('/api/v1/auth/me');
    return res.data;
  },

  async refresh(): Promise<string> {
    const res = await apiFetch<LoginResponse>('/api/v1/auth/refresh', { method: 'POST' });
    if (res.data?.accessToken) {
      setAccessToken(res.data.accessToken);
      return res.data.accessToken;
    }
    throw new Error('Refresh failed: no token returned');
  }
};
