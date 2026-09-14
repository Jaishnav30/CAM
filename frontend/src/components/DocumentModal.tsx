import React, { useState, useEffect, useRef } from 'react';
import { 
  Paperclip, 
  X, 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  FileCheck, 
  Trash2, 
  Download, 
  Eye, 
  AlertCircle, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { Transaction, DocumentResponse, DocumentType, AuthUser } from '../types';
import { documentApi } from '../api/documentApi';
import { useDialog } from '../context/DialogContext';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  currentUser: AuthUser | null;
  onDocumentChange?: () => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  transaction,
  currentUser,
  onDocumentChange,
}) => {
  const { confirm, alert } = useDialog();
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('BILL');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview state
  const [previewData, setPreviewData] = useState<{ url: string; contentType: string; filename: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const canUpload = currentUser?.permissions?.includes('documents:upload') ?? false;
  const canDelete = currentUser?.permissions?.includes('documents:delete') ?? false;

  useEffect(() => {
    if (isOpen && transaction) {
      loadDocuments();
      setError(null);
      setSuccess(null);
      setSelectedFile(null);
    } else {
      if (previewData?.url) {
        window.URL.revokeObjectURL(previewData.url);
      }
      setPreviewData(null);
    }
  }, [isOpen, transaction]);

  const loadDocuments = async () => {
    if (!transaction) return;
    setLoading(true);
    setError(null);
    try {
      const data = await documentApi.getDocumentsForTransaction(transaction.id);
      setDocuments(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    setSuccess(null);

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('File exceeds the maximum size limit of 10 MB');
      return;
    }

    // Check extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
      setError('Disallowed file format. Only PDF, JPG, and PNG files are allowed.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || !selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      await documentApi.uploadDocument(transaction.id, documentType, selectedFile);
      setSuccess(`File "${selectedFile.name}" attached successfully`);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadDocuments();
      if (onDocumentChange) {
        onDocumentChange();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, filename: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Attachment',
      message: `Are you sure you want to delete attachment "${filename}"? This file will be permanently removed from the ledger records.`,
      confirmText: 'Delete Attachment',
      cancelText: 'Cancel',
      variant: 'danger',
      customIcon: <Trash2 size={22} />,
    });

    if (!isConfirmed) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      await documentApi.deleteDocument(docId);
      setSuccess(`Attachment "${filename}" deleted successfully`);
      await loadDocuments();
      if (onDocumentChange) {
        onDocumentChange();
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to delete attachment';
      setError(errMsg);
      await alert({
        title: 'Delete Failed',
        message: errMsg,
        variant: 'danger',
      });
    }
  };

  const handleDownload = async (doc: DocumentResponse) => {
    try {
      await documentApi.downloadDocument(doc.id, doc.originalFilename);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to download document');
    }
  };

  const handlePreview = async (doc: DocumentResponse) => {
    setPreviewLoading(true);
    setError(null);
    try {
      if (previewData?.url) {
        window.URL.revokeObjectURL(previewData.url);
      }
      const { url, contentType } = await documentApi.getPreviewBlobUrl(doc.id);
      setPreviewData({ url, contentType, filename: doc.originalFilename });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to preview document');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewData?.url) {
      window.URL.revokeObjectURL(previewData.url);
    }
    setPreviewData(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getDocTypeBadge = (type: DocumentType) => {
    switch (type) {
      case 'BILL':
        return { label: 'Bill / Invoice', bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' };
      case 'PAYMENT_SCREENSHOT':
        return { label: 'Screenshot', bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'OTHER':
      default:
        return { label: 'Other Support', bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
    }
  };

  if (!isOpen || !transaction) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (previewData) closePreview();
          else onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#111827',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: previewData ? '900px' : '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          transition: 'max-width 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #111827, #1f2937)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
              }}
            >
              <Paperclip size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#f9fafb', margin: 0 }}>
                Transaction Attachments
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0.15rem 0 0 0' }}>
                Txn #{transaction.transactionNumber} &bull; ₹{transaction.amount.toLocaleString('en-IN')} &bull; {transaction.category.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (previewData) closePreview();
              else onClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Notifications */}
          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: '#f87171',
                fontSize: '0.85rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: '#34d399',
                fontSize: '0.85rem',
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          {/* Lightbox / Preview Mode */}
          {previewData && (
            <div
              style={{
                backgroundColor: '#030712',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: '#e5e7eb', fontWeight: 500 }}>
                  Preview: {previewData.filename}
                </span>
                <button
                  onClick={closePreview}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    color: '#9ca3af',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Close Preview
                </button>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '420px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#1f2937',
                }}
              >
                {previewData.contentType.includes('pdf') ? (
                  <iframe
                    src={previewData.url}
                    title={previewData.filename}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                ) : (
                  <img
                    src={previewData.url}
                    alt={previewData.filename}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Upload Area (if permitted and transaction not archived) */}
          {canUpload && transaction.status !== 'ARCHIVED' && (
            <form
              onSubmit={handleUpload}
              style={{
                backgroundColor: '#1f2937',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.35rem' }}>
                    Document Type
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                    style={{
                      width: '100%',
                      backgroundColor: '#111827',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '0.5rem 0.75rem',
                      color: '#f9fafb',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="BILL">Bill / Invoice</option>
                    <option value="PAYMENT_SCREENSHOT">Payment Screenshot</option>
                    <option value="OTHER">Other Supporting Document</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
                  <button
                    type="submit"
                    disabled={!selectedFile || uploading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      backgroundColor: selectedFile && !uploading ? '#2563eb' : 'rgba(37, 99, 235, 0.4)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.55rem 1.25rem',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      cursor: selectedFile && !uploading ? 'pointer' : 'not-allowed',
                      marginTop: '1.3rem',
                    }}
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud size={16} />
                        Attach File
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? '#3b82f6' : 'rgba(255, 255, 255, 0.15)'}`,
                  borderRadius: '10px',
                  padding: '1.25rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.05)' : 'rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                />
                {selectedFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#60a5fa' }}>
                    <FileCheck size={24} />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ margin: 0, fontWeight: 500, fontSize: '0.85rem' }}>{selectedFile.name}</p>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formatFileSize(selectedFile.size)}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={28} style={{ color: '#9ca3af', marginBottom: '0.4rem' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#d1d5db' }}>
                      <span style={{ color: '#60a5fa', fontWeight: 500 }}>Click to browse</span> or drag and drop
                    </p>
                    <span style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                      PDF, JPG, PNG up to 10 MB
                    </span>
                  </>
                )}
              </div>
            </form>
          )}

          {/* Attached Documents List */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e5e7eb', margin: 0 }}>
                Existing Documents ({documents.length})
              </h3>
            </div>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#9ca3af', gap: '0.5rem' }}>
                <Loader2 size={18} className="animate-spin" />
                <span style={{ fontSize: '0.85rem' }}>Loading documents...</span>
              </div>
            ) : documents.length === 0 ? (
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#9ca3af',
                }}
              >
                <Paperclip size={24} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>No supporting documents attached yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {documents.map((doc) => {
                  const badge = getDocTypeBadge(doc.documentType);
                  const isPdf = doc.contentType.includes('pdf');
                  return (
                    <div
                      key={doc.id}
                      style={{
                        backgroundColor: '#1f2937',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '10px',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isPdf ? '#f87171' : '#60a5fa',
                            flexShrink: 0,
                          }}
                        >
                          {isPdf ? <FileText size={18} /> : <ImageIcon size={18} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                color: '#f3f4f6',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '280px',
                              }}
                              title={doc.originalFilename}
                            >
                              {doc.originalFilename}
                            </p>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '9999px',
                                backgroundColor: badge.bg,
                                color: badge.text,
                                border: `1px solid ${badge.border}`,
                                fontWeight: 500,
                              }}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
                            <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{formatFileSize(doc.fileSizeBytes)}</span>
                            <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>&bull;</span>
                            <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </span>
                            {doc.fileHashSha256 && (
                              <>
                                <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>&bull;</span>
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    color: '#6b7280',
                                    fontFamily: 'monospace',
                                    cursor: 'help',
                                  }}
                                  title={`SHA-256: ${doc.fileHashSha256}`}
                                >
                                  SHA: {doc.fileHashSha256.substring(0, 8)}...
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        <button
                          onClick={() => handlePreview(doc)}
                          disabled={previewLoading}
                          title="Preview Document"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            border: 'none',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            padding: '0.45rem',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          title="Download Document"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            border: 'none',
                            color: '#60a5fa',
                            cursor: 'pointer',
                            padding: '0.45rem',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Download size={15} />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(doc.id, doc.originalFilename)}
                            title="Delete Attachment"
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              border: 'none',
                              color: '#f87171',
                              cursor: 'pointer',
                              padding: '0.45rem',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            backgroundColor: '#111827',
          }}
        >
          <button
            onClick={() => {
              if (previewData) closePreview();
              else onClose();
            }}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#d1d5db',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 1.25rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
