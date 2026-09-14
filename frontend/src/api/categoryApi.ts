import { apiFetch } from './client';
import {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  BulkDeleteCategoryResponse,
} from '../types';

export const categoryApi = {
  async getActiveCategories(): Promise<Category[]> {
    const res = await apiFetch<Category[]>('/api/v1/categories');
    return res.data;
  },

  async getAllCategories(): Promise<Category[]> {
    const res = await apiFetch<Category[]>('/api/v1/admin/categories');
    return res.data;
  },

  async createCategory(request: CreateCategoryRequest): Promise<Category> {
    const res = await apiFetch<Category>('/api/v1/admin/categories', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return res.data;
  },

  async updateCategory(id: string, request: UpdateCategoryRequest): Promise<Category> {
    const res = await apiFetch<Category>(`/api/v1/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
    return res.data;
  },

  async deactivateCategory(id: string): Promise<Category> {
    const res = await apiFetch<Category>(`/api/v1/admin/categories/${id}/deactivate`, {
      method: 'PATCH',
    });
    return res.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await apiFetch<void>(`/api/v1/admin/categories/${id}`, {
      method: 'DELETE',
    });
  },

  async bulkDeleteCategories(ids: string[]): Promise<BulkDeleteCategoryResponse> {
    const res = await apiFetch<BulkDeleteCategoryResponse>('/api/v1/admin/categories/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    return res.data;
  },
};
