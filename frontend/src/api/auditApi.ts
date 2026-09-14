import { apiFetch } from './client';
import { ApiResponse, PagedResponse, AuditLogItem, AuditLogFilterParams } from '../types';

export const auditApi = {
  getAuditLogs: async (params?: AuditLogFilterParams): Promise<ApiResponse<PagedResponse<AuditLogItem>>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.entityType) queryParams.set('entityType', params.entityType);
      if (params.entityId) queryParams.set('entityId', params.entityId);
      if (params.action) queryParams.set('action', params.action);
      if (params.performedById) queryParams.set('performedById', params.performedById);
      if (params.startDate) queryParams.set('startDate', params.startDate);
      if (params.endDate) queryParams.set('endDate', params.endDate);
      if (params.page !== undefined) queryParams.set('page', params.page.toString());
      if (params.size !== undefined) queryParams.set('size', params.size.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = `/api/v1/audit-logs${queryString ? `?${queryString}` : ''}`;
    return apiFetch<PagedResponse<AuditLogItem>>(endpoint);
  },
};
