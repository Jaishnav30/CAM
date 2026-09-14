import { apiFetch } from './client';
import { PaymentMode } from '../types';

export const paymentModeApi = {
  async getActivePaymentModes(): Promise<PaymentMode[]> {
    const res = await apiFetch<PaymentMode[]>('/api/v1/payment-modes');
    return res.data;
  },
};
