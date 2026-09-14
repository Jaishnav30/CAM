import { apiFetch } from './client';
import { ApiResponse, AnalyticsSummary, AnalyticsBreakdowns, AnalyticsFilterParams } from '../types';

export const analyticsApi = {
  getSummary: async (params?: AnalyticsFilterParams): Promise<ApiResponse<AnalyticsSummary>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.startDate) queryParams.set('startDate', params.startDate);
      if (params.endDate) queryParams.set('endDate', params.endDate);
    }
    const queryString = queryParams.toString();
    const endpoint = `/api/v1/analytics/summary${queryString ? `?${queryString}` : ''}`;
    return apiFetch<AnalyticsSummary>(endpoint);
  },

  getBreakdowns: async (params?: AnalyticsFilterParams): Promise<ApiResponse<AnalyticsBreakdowns>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.startDate) queryParams.set('startDate', params.startDate);
      if (params.endDate) queryParams.set('endDate', params.endDate);
      if (params.groupBy) queryParams.set('groupBy', params.groupBy);
    }
    const queryString = queryParams.toString();
    const endpoint = `/api/v1/analytics/breakdowns${queryString ? `?${queryString}` : ''}`;
    return apiFetch<AnalyticsBreakdowns>(endpoint);
  },
};
