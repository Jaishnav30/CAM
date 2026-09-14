import { apiFetch } from './client';
import { RbacMatrixResponse, UpdateRbacMatrixRequest } from '../types';

export const rbacApi = {
  async getRbacMatrix(): Promise<RbacMatrixResponse> {
    const res = await apiFetch<RbacMatrixResponse>('/api/v1/admin/rbac/matrix');
    return res.data;
  },

  async updateRbacMatrix(request: UpdateRbacMatrixRequest): Promise<RbacMatrixResponse> {
    const res = await apiFetch<RbacMatrixResponse>('/api/v1/admin/rbac/matrix', {
      method: 'PUT',
      body: JSON.stringify(request),
    });
    return res.data;
  },
};
