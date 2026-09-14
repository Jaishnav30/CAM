import { apiFetch, getAccessToken, getApiUrl } from './client';
import { ApiResponse, TransactionReportRow, ReimbursementReportRow } from '../types';

export interface ReportFilterParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  categoryId?: string;
  paymentMode?: string;
}

export const reportApi = {
  getTransactionReport: async (params?: ReportFilterParams): Promise<ApiResponse<TransactionReportRow[]>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.startDate) queryParams.set('startDate', params.startDate);
      if (params.endDate) queryParams.set('endDate', params.endDate);
      if (params.status) queryParams.set('status', params.status);
      if (params.categoryId) queryParams.set('categoryId', params.categoryId);
      if (params.paymentMode) queryParams.set('paymentMode', params.paymentMode);
    }
    const queryString = queryParams.toString();
    const endpoint = `/api/v1/reports/transactions${queryString ? `?${queryString}` : ''}`;
    return apiFetch<TransactionReportRow[]>(endpoint);
  },

  getReimbursementReport: async (params?: ReportFilterParams): Promise<ApiResponse<ReimbursementReportRow[]>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.startDate) queryParams.set('startDate', params.startDate);
      if (params.endDate) queryParams.set('endDate', params.endDate);
      if (params.status) queryParams.set('status', params.status);
    }
    const queryString = queryParams.toString();
    const endpoint = `/api/v1/reports/reimbursements${queryString ? `?${queryString}` : ''}`;
    return apiFetch<ReimbursementReportRow[]>(endpoint);
  },

  downloadTransactionsCsv: async (params?: ReportFilterParams): Promise<void> => {
    const queryParams = new URLSearchParams();
    queryParams.set('format', 'csv');
    if (params) {
      if (params.startDate) queryParams.set('startDate', params.startDate);
      if (params.endDate) queryParams.set('endDate', params.endDate);
      if (params.status) queryParams.set('status', params.status);
      if (params.categoryId) queryParams.set('categoryId', params.categoryId);
      if (params.paymentMode) queryParams.set('paymentMode', params.paymentMode);
    }
    const token = getAccessToken();
    const response = await fetch(getApiUrl(`/api/v1/reports/transactions?${queryParams.toString()}`), {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      throw new Error('Failed to download transactions CSV');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  downloadReimbursementsCsv: async (params?: ReportFilterParams): Promise<void> => {
    const queryParams = new URLSearchParams();
    queryParams.set('format', 'csv');
    if (params) {
      if (params.startDate) queryParams.set('startDate', params.startDate);
      if (params.endDate) queryParams.set('endDate', params.endDate);
      if (params.status) queryParams.set('status', params.status);
    }
    const token = getAccessToken();
    const response = await fetch(getApiUrl(`/api/v1/reports/reimbursements?${queryParams.toString()}`), {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      throw new Error('Failed to download reimbursements CSV');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reimbursements_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
