import { apiFetch } from './client';
import { UserRegistrationItem, UserProfileStats } from '../types';

export const userApi = {
  async getAllUsers(): Promise<UserRegistrationItem[]> {
    const res = await apiFetch<UserRegistrationItem[]>('/api/v1/admin/users/all');
    return res.data || [];
  },

  async blockUser(id: string): Promise<UserRegistrationItem> {
    const res = await apiFetch<UserRegistrationItem>(`/api/v1/admin/users/${id}/block`, {
      method: 'POST',
    });
    return res.data;
  },

  async unblockUser(id: string): Promise<UserRegistrationItem> {
    const res = await apiFetch<UserRegistrationItem>(`/api/v1/admin/users/${id}/unblock`, {
      method: 'POST',
    });
    return res.data;
  },

  async deleteUser(id: string): Promise<UserRegistrationItem> {
    const res = await apiFetch<UserRegistrationItem>(`/api/v1/admin/users/${id}`, {
      method: 'DELETE',
    });
    return res.data;
  },

  async getRegistrations(status: string = 'PENDING'): Promise<UserRegistrationItem[]> {
    const res = await apiFetch<UserRegistrationItem[]>(`/api/v1/admin/users/registrations?status=${encodeURIComponent(status)}`);
    return res.data || [];
  },

  async approveRegistration(id: string, role?: string): Promise<UserRegistrationItem> {
    const res = await apiFetch<UserRegistrationItem>(`/api/v1/admin/users/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    return res.data;
  },

  async rejectRegistration(id: string, reason?: string): Promise<UserRegistrationItem> {
    const res = await apiFetch<UserRegistrationItem>(`/api/v1/admin/users/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res.data;
  },

  async getMyProfile(): Promise<UserProfileStats> {
    const res = await apiFetch<UserProfileStats>('/api/v1/users/me/profile');
    return res.data;
  },

  async getUserProfile(id: string): Promise<UserProfileStats> {
    const res = await apiFetch<UserProfileStats>(`/api/v1/users/${id}/profile`);
    return res.data;
  },
};
