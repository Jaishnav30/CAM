import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  AlertCircle,
  Check,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Lock,
  Receipt,
  FileCheck2,
  Trash2,
  Info,
} from 'lucide-react';
import {
  AuthUser,
  Category,
  CreateTransactionRequest,
  DocumentResponse,
  InvoiceStatus,
  PaymentMode,
  Transaction,
  TransactionType,
  UpdateTransactionRequest,
} from '../types';
import { documentApi } from '../api/documentApi';
import { userApi } from '../api/userApi';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (savedTxn: Transaction) => void;
  onSubmit: (data: CreateTransactionRequest | UpdateTransactionRequest) => Promise<Transaction>;
  transaction?: Transaction | null;
  categories: Category[];
  paymentModes: PaymentMode[];
  currentUser: AuthUser | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSubmit,
  transaction,
  categories,
  paymentModes,
  currentUser,
}) => {
  const isEditing = !!transaction;
  const isAdmin = Boolean(currentUser?.roles?.includes('ADMIN'));
  const isMember =
    currentUser?.roles?.includes('MEMBER') &&
    !currentUser?.roles?.includes('ADMIN') &&
    !currentUser?.roles?.includes('ACCOUNTANT');

  // Fixed Payer: current authenticated user's name
  const fixedPayerName = currentUser?.fullName || currentUser?.email || 'Logged In User';

  const [registeredUsers, setRegisteredUsers] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch approved registered users for admin payer suggestions
  useEffect(() => {
    if (isAdmin && isOpen) {
      userApi
        .getAllUsers()
        .then((users) => {
          const list = users
            .filter((u) => u.approvalStatus === 'APPROVED' && !u.deleted)
            .map((u) => ({
              id: u.id,
              name: u.fullName?.trim() || u.username,
            }));
          setRegisteredUsers(list);
        })
        .catch(() => {
          // Graceful fallback if user directory fails
        });
    }
  }, [isAdmin, isOpen]);

  // Primary fields (Top section)
  const [amount, setAmount] = useState<string>('');
  const [recipientTo, setRecipientTo] = useState<string>('');
  const [transactionType, setTransactionType] = useState<TransactionType>('OUT');
  const [categoryId, setCategoryId] = useState<string>('');

  // Secondary fields (Bottom section)
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [payerFrom, setPayerFrom] = useState<string>(fixedPayerName);
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>('AVAILABLE');
  const [comments, setComments] = useState<string>('');
  const [requestReimbursement, setRequestReimbursement] = useState<boolean>(false);

  // Document upload state
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [billFile, setBillFile] = useState<File | null>(null);
  const [billPreview, setBillPreview] = useState<string | null>(null);

  // Drag & hover states
  const [isDraggingScreenshot, setIsDraggingScreenshot] = useState<boolean>(false);
  const [isHoveredScreenshot, setIsHoveredScreenshot] = useState<boolean>(false);
  const [isDraggingBill, setIsDraggingBill] = useState<boolean>(false);
  const [isHoveredBill, setIsHoveredBill] = useState<boolean>(false);

  // Existing documents when editing
  const [existingDocs, setExistingDocs] = useState<DocumentResponse[]>([]);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    amount?: string;
    recipientTo?: string;
    payerFrom?: string;
    categoryId?: string;
    paymentMode?: string;
    transactionDate?: string;
    screenshot?: string;
    bill?: string;
  }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('Saving...');

  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const billInputRef = useRef<HTMLInputElement>(null);

  // Reset or load data on modal open / transaction change
  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString());
      setRecipientTo(transaction.recipientTo);
      setTransactionType(transaction.transactionType);
      setCategoryId(transaction.category?.id || '');
      setTransactionDate(transaction.transactionDate);
      setPaymentMode(transaction.paymentMode?.code || 'UPI');
      // For existing transactions, keep recorded payer or fallback to current user
      setPayerFrom(transaction.payerFrom || fixedPayerName);
      setInvoiceStatus(transaction.invoiceStatus);
      setComments(transaction.comments || '');
      setRequestReimbursement(false);

      // Load existing documents
      documentApi
        .getDocumentsForTransaction(transaction.id)
        .then((docs) => setExistingDocs(docs))
        .catch(() => setExistingDocs([]));
    } else {
      setAmount('');
      setRecipientTo('');
      setTransactionType('OUT');
      setCategoryId('');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setPaymentMode(
  paymentModes.some((pm) => pm.code === 'UPI') ? 'UPI' : (paymentModes[0]?.code || 'UPI')
);

      setPayerFrom(fixedPayerName);
      setInvoiceStatus('AVAILABLE');
      setComments('');
      setRequestReimbursement(false);
      setExistingDocs([]);
    }

    // Clear staged files
    setScreenshotFile(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview(null);

    setBillFile(null);
    if (billPreview) URL.revokeObjectURL(billPreview);
    setBillPreview(null);

    setError(null);
    setFieldErrors({});
    setLoading(false);
    setIsHoveredScreenshot(false);
    setIsHoveredBill(false);
  }, [transaction, isOpen, categories, paymentModes, currentUser, fixedPayerName]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
      if (billPreview) URL.revokeObjectURL(billPreview);
    };
  }, [screenshotPreview, billPreview]);

  if (!isOpen) return null;

  // Filter categories: Admin sees all categories (including income ones); members see filtered by transaction type
  const availableCategories = isAdmin
    ? categories
    : categories.filter(
        (c) => c.type === 'BOTH' || (transactionType === 'IN' ? c.type === 'INCOME' : c.type === 'EXPENSE')
      );

  // Auto-sync invoice status based on bill upload
  const handleSetBillFile = (file: File | null) => {
    setBillFile(file);
    if (file) {
      setFieldErrors((prev) => ({ ...prev, bill: undefined }));
    }
    if (billPreview) URL.revokeObjectURL(billPreview);
    if (file) {
      if (file.type.startsWith('image/')) {
        setBillPreview(URL.createObjectURL(file));
      } else {
        setBillPreview(null);
      }
      setInvoiceStatus('AVAILABLE');
    } else {
      setBillPreview(null);
    }
  };

  const handleSetScreenshotFile = (file: File | null) => {
    setScreenshotFile(file);
    if (file) {
      setFieldErrors((prev) => ({ ...prev, screenshot: undefined }));
    }
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    if (file) {
      if (file.type.startsWith('image/')) {
        setScreenshotPreview(URL.createObjectURL(file));
      } else {
        setScreenshotPreview(null);
      }
    } else {
      setScreenshotPreview(null);
    }
  };

  const validateFile = (file: File): string | null => {
    if (file.size > 10 * 1024 * 1024) {
      return 'File size exceeds maximum allowed limit of 10 MB.';
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
      return 'Invalid file format. Only PDF, JPG, and PNG files are accepted.';
    }
    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: {
      amount?: string;
      recipientTo?: string;
      payerFrom?: string;
      categoryId?: string;
      paymentMode?: string;
      transactionDate?: string;
      screenshot?: string;
      bill?: string;
    } = {};

    const parsedAmount = parseFloat(amount);
    if (!amount.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.amount = 'Amount is required and must be greater than ₹0';
    }

    if (!recipientTo.trim()) {
      errors.recipientTo = 'Recipient (To) name is required';
    }

    // Payer validation: System admin can write/select any custom name; others use fixed account name
    const finalPayerFrom = (isAdmin ? payerFrom.trim() : fixedPayerName).trim();
    if (isAdmin && !finalPayerFrom) {
      errors.payerFrom = 'Payer / Sender name is required';
    }

    if (!categoryId) {
      errors.categoryId = 'Please select a category';
    }

    if (!paymentMode) {
      errors.paymentMode = 'Please select a payment mode';
    }

    if (!transactionDate) {
      errors.transactionDate = 'Please select a transaction date';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.payerFrom) {
        setError('Payer / Sender name is required.');
      } else {
        setError('Please fill in all mandatory fields highlighted below.');
      }
      return;
    }

    setFieldErrors({});

    // Validate staged files if provided
    if (screenshotFile) {
      const fileErr = validateFile(screenshotFile);
      if (fileErr) {
        setError(`Transaction Screenshot: ${fileErr}`);
        return;
      }
    }

    if (billFile) {
      const fileErr = validateFile(billFile);
      if (fileErr) {
        setError(`Bill Document: ${fileErr}`);
        return;
      }
    }

    setLoading(true);
    setLoadingText(isEditing ? 'Updating transaction...' : 'Recording transaction...');

    try {
      // 1. Create or update transaction
      const payload: CreateTransactionRequest = {
        transactionDate,
        transactionType: isMember ? 'OUT' : transactionType,
        amount: parsedAmount,
        payerFrom: finalPayerFrom,
        recipientTo: recipientTo.trim(),
        categoryId,
        paymentMode,
        invoiceStatus,
        status: 'COMPLETED',
        comments: comments.trim() || undefined,
        requestReimbursement:
          !isEditing && (isMember || transactionType === 'OUT') ? requestReimbursement : undefined,
      };

      const savedTxn = await onSubmit(payload);

      // 2. Upload supporting documents if staged
      if (screenshotFile && savedTxn?.id) {
        setLoadingText('Uploading transaction screenshot...');
        try {
          await documentApi.uploadDocument(savedTxn.id, 'PAYMENT_SCREENSHOT', screenshotFile);
        } catch (uploadErr) {
          console.error('Failed to upload screenshot', uploadErr);
          throw new Error('Transaction saved, but payment screenshot upload failed: ' + (uploadErr instanceof Error ? uploadErr.message : 'Upload failed'));
        }
      }

      if (billFile && savedTxn?.id) {
        setLoadingText('Uploading bill / invoice document...');
        try {
          await documentApi.uploadDocument(savedTxn.id, 'BILL', billFile);
        } catch (uploadErr) {
          console.error('Failed to upload bill', uploadErr);
          throw new Error('Transaction saved, but bill document upload failed: ' + (uploadErr instanceof Error ? uploadErr.message : 'Upload failed'));
        }
      }

      if (onSuccess) {
        onSuccess(savedTxn);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '760px',
          maxHeight: '92vh',
          backgroundColor: 'var(--bg-surface)',
          padding: 0,
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header - Fixed at Top */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--accent-primary-subtle)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Receipt size={18} />
              </div>
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, margin: 0 }}>
                {isEditing ? `Edit Transaction (${transaction.transactionNumber})` : 'New Financial Transaction'}
              </h2>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '0.35rem', margin: 0 }}>
              {isMember
                ? 'Record your out-of-pocket expenses and attach proofs for review & reimbursement.'
                : 'Enter financial details to record an authorized transaction'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              color: 'var(--text-secondary)',
              padding: '0.35rem',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            title="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Scrollable Form Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem 1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
          >
            {/* Global Error Banner */}
            {error && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: 'var(--radius-md)',
                  color: '#f87171',
                  fontSize: 'var(--font-size-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}
          {/* ========================================================================= */}
          {/* 1. TOP HIGHLIGHTED SECTION: AMOUNT & RECIPIENT (HERO MANDATORY FIELDS)   */}
          {/* ========================================================================= */}
          <div
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.04)',
              border: '1.5px solid rgba(16, 185, 129, 0.35)',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.08)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              position: 'relative',
            }}
          >
            {/* Attention Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--color-income)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '1rem',
              }}
            >
              <span>Mandatory Primary Details</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {/* Amount (Hero Input) */}
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: '0.4rem',
                  }}
                >
                  <span>Amount (INR ₹)</span>
                  <span style={{ fontSize: '0.72rem', color: fieldErrors.amount ? '#ef4444' : 'var(--color-income)', fontWeight: 600 }}>
                    {fieldErrors.amount ? 'Required' : 'Required'}
                  </span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '0.9rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: fieldErrors.amount ? '#ef4444' : 'var(--color-income)',
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="form-input"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (fieldErrors.amount) setFieldErrors((prev) => ({ ...prev, amount: undefined }));
                    }}
                    style={{
                      paddingLeft: '2.5rem',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      height: '3.1rem',
                      borderColor: fieldErrors.amount ? '#ef4444' : 'rgba(16, 185, 129, 0.5)',
                      backgroundColor: 'var(--bg-surface)',
                      boxShadow: fieldErrors.amount
                        ? '0 0 0 2px rgba(239, 68, 68, 0.2)'
                        : '0 0 0 1px rgba(16, 185, 129, 0.2)',
                    }}
                    autoFocus
                  />
                </div>
                {fieldErrors.amount && (
                  <div style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                    <AlertCircle size={13} style={{ flexShrink: 0 }} />
                    <span>{fieldErrors.amount}</span>
                  </div>
                )}
              </div>

              {/* Recipient (To) */}
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: '0.4rem',
                  }}
                >
                  <span>Recipient (To)</span>
                  <span style={{ fontSize: '0.72rem', color: fieldErrors.recipientTo ? '#ef4444' : 'var(--color-income)', fontWeight: 600 }}>
                    Required
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. JUMBO Xerox"
                  className="form-input"
                  value={recipientTo}
                  onChange={(e) => {
                    setRecipientTo(e.target.value);
                    if (fieldErrors.recipientTo) setFieldErrors((prev) => ({ ...prev, recipientTo: undefined }));
                  }}
                  maxLength={150}
                  style={{
                    height: '3.1rem',
                    fontSize: 'var(--font-size-base)',
                    fontWeight: 600,
                    borderColor: fieldErrors.recipientTo ? '#ef4444' : 'rgba(16, 185, 129, 0.5)',
                    backgroundColor: 'var(--bg-surface)',
                    boxShadow: fieldErrors.recipientTo ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined,
                  }}
                />
                {fieldErrors.recipientTo && (
                  <div style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                    <AlertCircle size={13} style={{ flexShrink: 0 }} />
                    <span>{fieldErrors.recipientTo}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Type & Category (Associated with Primary Details) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.25rem',
                marginTop: '1rem',
                paddingTop: '0.85rem',
                borderTop: '1px dashed rgba(16, 185, 129, 0.2)',
              }}
            >
              {/* Type */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                  }}
                >
                  Transaction Type *
                </label>
                <select
                  className="form-input"
                  value={transactionType}
                  onChange={(e) => {
                    const newType = e.target.value as TransactionType;
                    setTransactionType(newType);
                    if (!isAdmin) {
                      setCategoryId('');
                    }
                  }}
                  disabled={isMember}
                  style={{ height: '2.65rem', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}
                >
                  <option value="OUT">OUT (Expense / Disbursement)</option>
                  {!isMember && <option value="IN">IN (Income / Deposit)</option>}
                </select>
              </div>

              {/* Category */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                  }}
                >
                  Category *
                </label>
                <select
                  className="form-input"
                  value={categoryId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setCategoryId(selectedId);
                    if (fieldErrors.categoryId) setFieldErrors((prev) => ({ ...prev, categoryId: undefined }));

                    // If category is INCOME and current type is OUT, auto-select IN
                    const chosen = categories.find((c) => c.id === selectedId);
                    if (chosen) {
                      if (chosen.type === 'INCOME' && transactionType === 'OUT') {
                        setTransactionType('IN');
                      } else if (chosen.type === 'EXPENSE' && transactionType === 'IN') {
                        setTransactionType('OUT');
                      }
                    }
                  }}
                  style={{
                    height: '2.65rem',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: categoryId ? 600 : 400,
                    borderColor: fieldErrors.categoryId ? '#ef4444' : undefined,
                    boxShadow: fieldErrors.categoryId ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined,
                  }}
                >
                  <option value="" disabled>Select Category</option>
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
                {fieldErrors.categoryId && (
                  <div style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                    <AlertCircle size={13} style={{ flexShrink: 0 }} />
                    <span>{fieldErrors.categoryId}</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', marginTop: '0.6rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  Supporting Documents <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(Optional)</span>
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  PNG, JPG, PDF up to 10MB
                </span>
              </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1rem' }}>
             {/* Card 1: Transaction / Payment Screenshot */}
              <div
                style={{
                  border: fieldErrors.screenshot
                    ? '1.5px solid #ef4444'
                    : screenshotFile
                    ? '1.5px solid #10b981'
                    : isDraggingScreenshot
                    ? '2px dashed #0284c7'
                    : isHoveredScreenshot
                    ? '1.5px dashed #0284c7'
                    : '1.5px dashed #94a3b8',
                  background: fieldErrors.screenshot
                    ? 'linear-gradient(135deg, rgba(254, 242, 242, 0.85) 0%, rgba(254, 226, 226, 0.4) 100%)'
                    : screenshotFile
                    ? 'linear-gradient(135deg, rgba(240, 253, 244, 0.8) 0%, rgba(220, 252, 231, 0.4) 100%)'
                    : isDraggingScreenshot
                    ? 'linear-gradient(135deg, rgba(224, 242, 254, 0.85) 0%, rgba(186, 230, 253, 0.5) 100%)'
                    : isHoveredScreenshot
                    ? 'linear-gradient(135deg, rgba(240, 249, 255, 0.75) 0%, rgba(241, 245, 249, 0.6) 100%)'
                    : 'linear-gradient(135deg, rgba(248, 250, 252, 0.7) 0%, rgba(241, 245, 249, 0.4) 100%)',
                  backdropFilter: 'blur(6px)',
                  boxShadow: fieldErrors.screenshot
                    ? '0 2px 10px rgba(239, 68, 68, 0.15)'
                    : screenshotFile
                    ? '0 2px 10px rgba(16, 185, 129, 0.12)'
                    : isDraggingScreenshot || isHoveredScreenshot
                    ? '0 4px 14px rgba(2, 132, 199, 0.1)'
                    : '0 1px 3px rgba(0, 0, 0, 0.03)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '160px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onMouseEnter={() => setIsHoveredScreenshot(true)}
                onMouseLeave={() => setIsHoveredScreenshot(false)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingScreenshot(true);
                }}
                onDragLeave={() => setIsDraggingScreenshot(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingScreenshot(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const file = e.dataTransfer.files[0];
                    const err = validateFile(file);
                    if (err) setError(`Screenshot: ${err}`);
                    else handleSetScreenshotFile(file);
                  }
                }}
                onClick={() => screenshotInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={screenshotInputRef}
                  style={{ display: 'none' }}
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const err = validateFile(file);
                      if (err) setError(`Screenshot: ${err}`);
                      else handleSetScreenshotFile(file);
                    }
                  }}
                />

                {/* Card Top / Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: fieldErrors.screenshot
                          ? 'rgba(239, 68, 68, 0.15)'
                          : screenshotFile
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(59, 130, 246, 0.15)',
                        color: fieldErrors.screenshot
                          ? '#ef4444'
                          : screenshotFile
                          ? 'var(--color-income)'
                          : 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <ImageIcon size={19} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>Transaction Screenshot</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: fieldErrors.screenshot ? '#ef4444' : 'var(--text-muted)', fontWeight: fieldErrors.screenshot ? 600 : 400 }}>
                        {fieldErrors.screenshot || 'UPI receipt/payment confirmation (Optional)'}
                      </div>
                    </div>
                  </div>

                  {screenshotFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetScreenshotFile(null);
                        if (screenshotInputRef.current) screenshotInputRef.current.value = '';
                      }}
                      style={{
                        padding: '0.25rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      title="Remove screenshot"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Card Content: Preview or Empty Dropzone */}
                {screenshotFile ? (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      padding: '0.6rem 0.8rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    {screenshotPreview ? (
                      <img
                        src={screenshotPreview}
                        alt="Screenshot thumbnail"
                        style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ) : (
                      <FileText size={28} style={{ color: 'var(--accent-primary)' }} />
                    )}
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {screenshotFile.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-income)' }}>
                        ✓ Ready to upload • {formatFileSize(screenshotFile.size)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '0.75rem 0',
                      color: fieldErrors.screenshot ? '#ef4444' : 'var(--text-secondary)',
                    }}
                  >
                    <UploadCloud size={24} style={{ margin: '0 auto 0.35rem', color: fieldErrors.screenshot ? '#ef4444' : 'var(--accent-primary)' }} />
                    <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                      Click or drag payment screenshot here
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Bill / Invoice Document */}
              <div
                style={{
                  border: fieldErrors.bill
                    ? '1.5px solid #ef4444'
                    : billFile
                    ? '1.5px solid #10b981'
                    : isDraggingBill
                    ? '2px dashed #d97706'
                    : isHoveredBill
                    ? '1.5px dashed #d97706'
                    : '1.5px dashed #94a3b8',
                  background: fieldErrors.bill
                    ? 'linear-gradient(135deg, rgba(254, 242, 242, 0.85) 0%, rgba(254, 226, 226, 0.4) 100%)'
                    : billFile
                    ? 'linear-gradient(135deg, rgba(240, 253, 244, 0.8) 0%, rgba(220, 252, 231, 0.4) 100%)'
                    : isDraggingBill
                    ? 'linear-gradient(135deg, rgba(254, 243, 199, 0.85) 0%, rgba(253, 230, 138, 0.5) 100%)'
                    : isHoveredBill
                    ? 'linear-gradient(135deg, rgba(255, 251, 235, 0.75) 0%, rgba(241, 245, 249, 0.6) 100%)'
                    : 'linear-gradient(135deg, rgba(248, 250, 252, 0.7) 0%, rgba(241, 245, 249, 0.4) 100%)',
                  backdropFilter: 'blur(6px)',
                  boxShadow: fieldErrors.bill
                    ? '0 2px 10px rgba(239, 68, 68, 0.15)'
                    : billFile
                    ? '0 2px 10px rgba(16, 185, 129, 0.12)'
                    : isDraggingBill || isHoveredBill
                    ? '0 4px 14px rgba(217, 119, 6, 0.1)'
                    : '0 1px 3px rgba(0, 0, 0, 0.03)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '160px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onMouseEnter={() => setIsHoveredBill(true)}
                onMouseLeave={() => setIsHoveredBill(false)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingBill(true);
                }}
                onDragLeave={() => setIsDraggingBill(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingBill(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const file = e.dataTransfer.files[0];
                    const err = validateFile(file);
                    if (err) setError(`Bill Document: ${err}`);
                    else handleSetBillFile(file);
                  }
                }}
                onClick={() => billInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={billInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const err = validateFile(file);
                      if (err) setError(`Bill Document: ${err}`);
                      else handleSetBillFile(file);
                    }
                  }}
                />

                {/* Card Top / Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: fieldErrors.bill
                          ? 'rgba(239, 68, 68, 0.15)'
                          : billFile
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(245, 158, 11, 0.15)',
                        color: fieldErrors.bill
                          ? '#ef4444'
                          : billFile
                          ? 'var(--color-income)'
                          : '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <FileCheck2 size={19} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>Bill / Invoice Document</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: fieldErrors.bill ? '#ef4444' : 'var(--text-muted)', fontWeight: fieldErrors.bill ? 600 : 400 }}>
                        {fieldErrors.bill || 'Store receipt, vendor invoice (Optional)'}
                      </div>
                    </div>
                  </div>

                  {billFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetBillFile(null);
                        if (billInputRef.current) billInputRef.current.value = '';
                      }}
                      style={{
                        padding: '0.25rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      title="Remove bill file"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Card Content: Preview or Empty Dropzone */}
                {billFile ? (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      padding: '0.6rem 0.8rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    {billPreview ? (
                      <img
                        src={billPreview}
                        alt="Bill thumbnail"
                        style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ) : (
                      <FileText size={28} style={{ color: '#f59e0b' }} />
                    )}
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {billFile.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-income)' }}>
                        ✓ Ready to upload • {formatFileSize(billFile.size)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '0.75rem 0',
                      color: fieldErrors.bill ? '#ef4444' : 'var(--text-secondary)',
                    }}
                  >
                    <UploadCloud size={24} style={{ margin: '0 auto 0.35rem', color: fieldErrors.bill ? '#ef4444' : '#f59e0b' }} />
                    <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                      Click or drag vendor bill / invoice here
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Display existing documents if editing */}
            {isEditing && existingDocs.length > 0 && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.6rem 0.85rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: 'var(--font-size-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Info size={14} style={{ color: 'var(--accent-primary)' }} />
                <span>
                  <strong>{existingDocs.length} existing document(s)</strong> already attached to this transaction: {existingDocs.map((d) => d.originalFilename).join(', ')}. Staged files above will be added as additional proofs.
                </span>
              </div>
            )}
          </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. SUPPORTING PROOF UPLOAD CARDS (TRANSACTION SCREENSHOT & BILL DOCS)     */}
          {/* ========================================================================= */}
          

          {/* ========================================================================= */}
          {/* 3. BOTTOM SECTION: TRANSACTION DATE, PAYMENT MODE, PAYER & INVOICE STATUS */}
          {/* ========================================================================= */}
          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Transaction Particulars
            </div>

            {/* Row: Date & Payment Mode */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {/* Transaction Date */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                  }}
                >
                  Transaction Date *
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={transactionDate}
                  onChange={(e) => {
                    setTransactionDate(e.target.value);
                    if (fieldErrors.transactionDate) setFieldErrors((prev) => ({ ...prev, transactionDate: undefined }));
                  }}
                  style={{
                    height: '2.65rem',
                    fontSize: 'var(--font-size-sm)',
                    borderColor: fieldErrors.transactionDate ? '#ef4444' : undefined,
                    boxShadow: fieldErrors.transactionDate ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined,
                  }}
                />
                {fieldErrors.transactionDate && (
                  <div style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                    <AlertCircle size={13} style={{ flexShrink: 0 }} />
                    <span>{fieldErrors.transactionDate}</span>
                  </div>
                )}
              </div>

              {/* Payment Mode */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                  }}
                >
                  Payment Mode *
                </label>
                <select
                  className="form-input"
                  value={paymentMode}
                  onChange={(e) => {
                    setPaymentMode(e.target.value);
                    if (fieldErrors.paymentMode) setFieldErrors((prev) => ({ ...prev, paymentMode: undefined }));
                  }}
                  style={{
                    height: '2.65rem',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 600,
                    borderColor: fieldErrors.paymentMode ? '#ef4444' : undefined,
                    boxShadow: fieldErrors.paymentMode ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined,
                  }}
                >
                  {paymentModes.map((pm) => (
                    <option key={pm.id} value={pm.code}>
                      {pm.name} ({pm.code})
                    </option>
                  ))}
                </select>
                {fieldErrors.paymentMode && (
                  <div style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                    <AlertCircle size={13} style={{ flexShrink: 0 }} />
                    <span>{fieldErrors.paymentMode}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Row: Payer (From) & Invoice Status */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {/* Payer (From) - Editable ONLY by System Admin; Strictly locked for others */}
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                  }}
                >
                  <span>Payer / Sender (From) *</span>
                  {isAdmin ? (
                    <span
                      className="badge"
                      style={{
                        fontSize: '0.65rem',
                        padding: '0.1rem 0.45rem',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        fontWeight: 700,
                      }}
                    >
                      Admin Editable
                    </span>
                  ) : (
                    <span
                      className="badge"
                      style={{
                        fontSize: '0.65rem',
                        padding: '0.1rem 0.4rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                      }}
                    >
                      <Lock size={10} />
                      Non-Editable
                    </span>
                  )}
                </label>
                <div style={{ position: 'relative' }}>
                  {isAdmin ? (
                    <>
                      <input
                        type="text"
                        className="form-input"
                        list="admin-payer-options"
                        value={payerFrom}
                        onChange={(e) => {
                          setPayerFrom(e.target.value);
                          if (fieldErrors.payerFrom) {
                            setFieldErrors((prev) => ({ ...prev, payerFrom: undefined }));
                          }
                        }}
                        placeholder="Type or select payer/sender name"
                        style={{
                          height: '2.5rem',
                          fontSize: 'var(--font-size-sm)',
                          borderColor: fieldErrors.payerFrom ? '#ef4444' : undefined,
                        }}
                      />
                      <datalist id="admin-payer-options">
                        {fixedPayerName && (
                          <option value={fixedPayerName}>{fixedPayerName} (Current Admin)</option>
                        )}
                        {registeredUsers.map((u) => (
                          <option key={u.id} value={u.name} />
                        ))}
                        <option value="Club Treasury" />
                        <option value="College Cashier / Accounts" />
                        <option value="External Sponsor" />
                        <option value="Student Council" />
                      </datalist>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        className="form-input"
                        value={fixedPayerName}
                        readOnly
                        disabled
                        style={{
                          height: '2.5rem',
                          fontSize: 'var(--font-size-sm)',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-primary)',
                          cursor: 'not-allowed',
                          opacity: 0.85,
                          paddingRight: '2rem',
                        }}
                      />
                      <Lock
                        size={14}
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--text-muted)',
                        }}
                      />
                    </>
                  )}
                </div>
                {isAdmin ? (
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: fieldErrors.payerFrom ? '#ef4444' : 'var(--text-muted)',
                      marginTop: '0.25rem',
                    }}
                  >
                    {fieldErrors.payerFrom ||
                      'As System Admin, you can write any custom payer name or select from registered members.'}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Fixed to your authenticated account. Only System Admins can customize the sender name.
                  </div>
                )}
              </div>

              {/* Invoice Status */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                  }}
                >
                  Invoice Status
                </label>
                <select
                  className="form-input"
                  value={invoiceStatus}
                  onChange={(e) => setInvoiceStatus(e.target.value as InvoiceStatus)}
                  style={{ height: '2.65rem', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}
                >
                  <option value="AVAILABLE">AVAILABLE (Bill / Invoice on file)</option>
                  <option value="NOT_AVAILABLE">NOT_AVAILABLE (No invoice)</option>
                  <option value="PENDING">PENDING (Awaiting submission)</option>
                  <option value="EXEMPT">EXEMPT (Invoice not required)</option>
                </select>
              </div>
            </div>

            {/* Comments / Itemized Breakdown */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  marginBottom: '0.35rem',
                }}
              >
                Comments / Notes
              </label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Add optional notes, itemized breakdown, or reference tags..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                maxLength={2000}
                style={{ fontSize: 'var(--font-size-sm)', resize: 'vertical' }}
              />
            </div>

            {/* Reimbursement Request Option (For OUT / Expense Transactions) */}
            {!isEditing && (isMember || transactionType === 'OUT') && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <input
                  type="checkbox"
                  id="requestReimbursement"
                  checked={requestReimbursement}
                  onChange={(e) => setRequestReimbursement(e.target.checked)}
                  style={{
                    width: '1.1rem',
                    height: '1.1rem',
                    marginTop: '0.15rem',
                    cursor: 'pointer',
                    accentColor: 'var(--accent-primary)',
                  }}
                />
                <label htmlFor="requestReimbursement" style={{ cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                    Request Reimbursement for this Expense
                  </span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    Automatically submit a reimbursement claim. Attached payment screenshots and bills will be available to reviewing accountants and administrators.
                  </span>
                </label>
              </div>
            )}
          </div>

          </div>
          {/* End Scrollable Form Body */}

          {/* Modal Footer Actions - Fixed at Bottom */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-subtle)',
              padding: '1rem 1.75rem',
              backgroundColor: '#f8fafc',
              flexShrink: 0,
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {loading ? (
                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{loadingText}</span>
              ) : (
                <span>* Mandatory fields must be completed</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
                disabled={loading}
                style={{ padding: '0.55rem 1.25rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  padding: '0.55rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 600,
                }}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        border: '2px solid white',
                        borderTopColor: 'transparent',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    {loadingText}
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    {isEditing ? 'Update Transaction' : 'Record Transaction'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
