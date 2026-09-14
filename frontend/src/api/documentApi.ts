import { apiFetch, getAccessToken, getApiUrl } from './client';
import { DocumentResponse, DocumentType } from '../types';

export const documentApi = {
  async uploadDocument(
    transactionId: string,
    documentType: DocumentType,
    file: File
  ): Promise<DocumentResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('transactionId', transactionId);
    formData.append('documentType', documentType);

    const res = await apiFetch<DocumentResponse>('/api/v1/documents/upload', {
      method: 'POST',
      body: formData,
    });
    return res.data;
  },

  async getDocumentsForTransaction(transactionId: string): Promise<DocumentResponse[]> {
    const res = await apiFetch<DocumentResponse[]>(`/api/v1/documents/transaction/${transactionId}`);
    return res.data;
  },

  async deleteDocument(id: string): Promise<void> {
    await apiFetch<void>(`/api/v1/documents/${id}`, {
      method: 'DELETE',
    });
  },

  async downloadDocument(id: string, filename: string): Promise<void> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(getApiUrl(`/api/v1/documents/${id}/download`), {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async getPreviewBlobUrl(id: string): Promise<{ url: string; contentType: string }> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(getApiUrl(`/api/v1/documents/${id}/preview`), {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to load document preview: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    return { url, contentType };
  },
};
