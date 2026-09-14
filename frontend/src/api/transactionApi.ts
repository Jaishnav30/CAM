import { apiFetch } from './client';
import {
  ArchiveTransactionRequest,
  CreateTransactionRequest,
  PagedResponse,
  Transaction,
  TransactionFilterParams,
  UpdateTransactionRequest,
} from '../types';

export const transactionApi = {
  async getTransactions(params: TransactionFilterParams = {}): Promise<PagedResponse<Transaction>> {
    const query = new URLSearchParams();

    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.type) query.set('type', params.type);
    if (params.categoryId) query.set('categoryId', params.categoryId);
    if (params.paymentMode) query.set('paymentMode', params.paymentMode);
    if (params.status) query.set('status', params.status);
    if (params.includeArchived) query.set('includeArchived', 'true');
    if (params.createdById) query.set('createdById', params.createdById);
    if (params.page !== undefined) query.set('page', params.page.toString());
    if (params.size !== undefined) query.set('size', params.size.toString());
    if (params.sort) {
      query.set('sort', params.sort);
    } else if (params.sortBy) {
      query.set('sort', `${params.sortBy},${params.sortDir || 'desc'}`);
    }

    const queryString = query.toString();
    const endpoint = `/api/v1/transactions${queryString ? `?${queryString}` : ''}`;
    const res = await apiFetch<PagedResponse<Transaction>>(endpoint);
    return res.data;
  },

  async getTransactionById(id: string): Promise<Transaction> {
    const res = await apiFetch<Transaction>(`/api/v1/transactions/${id}`);
    return res.data;
  },

  async createTransaction(request: CreateTransactionRequest): Promise<Transaction> {
    const res = await apiFetch<Transaction>('/api/v1/transactions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return res.data;
  },

  async updateTransaction(id: string, request: UpdateTransactionRequest): Promise<Transaction> {
    const res = await apiFetch<Transaction>(`/api/v1/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
    return res.data;
  },

  async archiveTransaction(id: string, request: ArchiveTransactionRequest): Promise<Transaction> {
    const res = await apiFetch<Transaction>(`/api/v1/transactions/${id}`, {
      method: 'DELETE',
      body: JSON.stringify(request),
    });
    return res.data;
  },
};
