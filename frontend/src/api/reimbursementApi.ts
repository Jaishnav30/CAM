import { apiFetch } from './client';
import {
  PagedResponse,
  RejectReimbursementRequest,
  ReimbursementFilterParams,
  ReimbursementResponse,
  SubmitReimbursementRequest,
} from '../types';

export const reimbursementApi = {
  async getClaims(params: ReimbursementFilterParams = {}): Promise<PagedResponse<ReimbursementResponse>> {
    const query = new URLSearchParams();

    if (params.status) query.set('status', params.status);
    if (params.claimantId) query.set('claimantId', params.claimantId);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.page !== undefined) query.set('page', params.page.toString());
    if (params.size !== undefined) query.set('size', params.size.toString());
    if (params.sortBy) {
      query.set('sort', `${params.sortBy},${params.sortDir || 'desc'}`);
    }

    const queryString = query.toString();
    const endpoint = `/api/v1/reimbursements${queryString ? `?${queryString}` : ''}`;
    const res = await apiFetch<PagedResponse<ReimbursementResponse>>(endpoint);
    return res.data;
  },

  async getClaimById(id: string): Promise<ReimbursementResponse> {
    const res = await apiFetch<ReimbursementResponse>(`/api/v1/reimbursements/${id}`);
    return res.data;
  },

  async submitClaim(request: SubmitReimbursementRequest): Promise<ReimbursementResponse> {
    const res = await apiFetch<ReimbursementResponse>('/api/v1/reimbursements', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return res.data;
  },

  async approveClaim(id: string): Promise<ReimbursementResponse> {
    const res = await apiFetch<ReimbursementResponse>(`/api/v1/reimbursements/${id}/approve`, {
      method: 'POST',
    });
    return res.data;
  },

  async rejectClaim(id: string, request: RejectReimbursementRequest): Promise<ReimbursementResponse> {
    const res = await apiFetch<ReimbursementResponse>(`/api/v1/reimbursements/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return res.data;
  },

  async resubmitClaim(id: string): Promise<ReimbursementResponse> {
    const res = await apiFetch<ReimbursementResponse>(`/api/v1/reimbursements/${id}/resubmit`, {
      method: 'POST',
    });
    return res.data;
  },

  async markReimbursed(id: string): Promise<ReimbursementResponse> {
    const res = await apiFetch<ReimbursementResponse>(`/api/v1/reimbursements/${id}/mark-reimbursed`, {
      method: 'POST',
    });
    return res.data;
  },
};
