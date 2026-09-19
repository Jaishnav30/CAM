import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Edit,
  Archive,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Paperclip,
  Eye,
  Image as ImageIcon,
  Receipt,
  X,
  Download,
  Loader2,
} from 'lucide-react';
import { transactionApi } from '../api/transactionApi';
import { categoryApi } from '../api/categoryApi';
import { paymentModeApi } from '../api/paymentModeApi';
import { documentApi } from '../api/documentApi';
import {
  AuthUser,
  Category,
  CreateTransactionRequest,
  PaymentMode,
  Transaction,
  TransactionFilterParams,
  TransactionType,
  UpdateTransactionRequest,
} from '../types';
import { TransactionModal } from './TransactionModal';
import { ArchiveModal } from './ArchiveModal';
import { DocumentModal } from './DocumentModal';
import { useDialog } from '../context/DialogContext';

export const getCategoryBadgeStyle = (categoryName?: string) => {
  if (!categoryName) {
    return {
      color: '#94a3b8',
      backgroundColor: 'rgba(148, 163, 184, 0.1)',
      border: '1px solid rgba(148, 163, 184, 0.25)',
    };
  }

  const normalized = categoryName.trim().toLowerCase();

  if (normalized.includes('deco')) {
    return {
      color: '#c084fc', // purple / violet
      backgroundColor: 'rgba(192, 132, 252, 0.12)',
      border: '1px solid rgba(192, 132, 252, 0.35)',
    };
  }
  if (normalized.includes('collection')) {
    return {
      color: '#34d399', // emerald / mint
      backgroundColor: 'rgba(52, 211, 153, 0.12)',
      border: '1px solid rgba(52, 211, 153, 0.35)',
    };
  }
  if (normalized.includes('event')) {
    return {
      color: '#fb923c', // orange / coral
      backgroundColor: 'rgba(251, 146, 60, 0.12)',
      border: '1px solid rgba(251, 146, 60, 0.35)',
    };
  }
  if (normalized.includes('sponsor')) {
    return {
      color: '#60a5fa', // blue / sky
      backgroundColor: 'rgba(96, 165, 250, 0.12)',
      border: '1px solid rgba(96, 165, 250, 0.35)',
    };
  }
  if (normalized.includes('market')) {
    return {
      color: '#f472b6', // pink / rose
      backgroundColor: 'rgba(244, 114, 182, 0.12)',
      border: '1px solid rgba(244, 114, 182, 0.35)',
    };
  }

  // Fallback palettes for any other / future categories
  const fallbacks = [
    { color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.12)', border: 'rgba(45, 212, 191, 0.35)' },
    { color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)', border: 'rgba(167, 139, 250, 0.35)' },
    { color: '#facc15', bg: 'rgba(250, 204, 21, 0.12)', border: 'rgba(250, 204, 21, 0.35)' },
    { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.35)' },
    { color: '#fb7185', bg: 'rgba(251, 113, 133, 0.12)', border: 'rgba(251, 113, 133, 0.35)' },
  ];
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
  }
  const selected = fallbacks[Math.abs(hash) % fallbacks.length];
  return {
    color: selected.color,
    backgroundColor: selected.bg,
    border: `1px solid ${selected.border}`,
  };
};

interface TransactionLedgerProps {
  currentUser: AuthUser | null;
}

export const TransactionLedger: React.FC<TransactionLedgerProps> = ({ currentUser }) => {
  const { alert } = useDialog();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState<number>(0);
  const [size] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Filter state (Date range in filter card; Type, Category, Mode in header filters)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('');
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);

  // Sorting state (Date, Txn #, Amount)
  const [sortBy, setSortBy] = useState<'transactionDate' | 'transactionNumber' | 'amount'>('transactionDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Header filter popover toggle: 'type' | 'category' | 'mode' | null
  const [activeHeaderFilter, setActiveHeaderFilter] = useState<'type' | 'category' | 'mode' | null>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Responsive mobile detection (< 768px)
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [expandedMobileId, setExpandedMobileId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Modals state
  const [isTxnModalOpen, setIsTxnModalOpen] = useState<boolean>(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState<boolean>(false);
  const [archivingTxn, setArchivingTxn] = useState<Transaction | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [docTxn, setDocTxn] = useState<Transaction | null>(null);

  // Direct Preview Modal state (for screenshot & bill columns)
  const [directPreview, setDirectPreview] = useState<{
    isOpen: boolean;
    docId: string;
    title: string;
    url?: string;
    contentType?: string;
    loading: boolean;
    error?: string | null;
  } | null>(null);

  const handleViewDirectDocument = async (docId: string, title: string) => {
    setDirectPreview({
      isOpen: true,
      docId,
      title,
      loading: true,
      error: null,
    });
    try {
      const { url, contentType } = await documentApi.getPreviewBlobUrl(docId);
      setDirectPreview((prev) => (prev ? { ...prev, url, contentType, loading: false } : null));
    } catch (err: unknown) {
      setDirectPreview((prev) =>
        prev
          ? {
              ...prev,
              loading: false,
              error: err instanceof Error ? err.message : 'Failed to load document preview',
            }
          : null
      );
    }
  };

  const handleCloseDirectPreview = () => {
    if (directPreview?.url) {
      URL.revokeObjectURL(directPreview.url);
    }
    setDirectPreview(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && directPreview?.isOpen) {
        handleCloseDirectPreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [directPreview?.isOpen]);

  const canArchive = currentUser?.permissions?.includes('transactions:archive') || currentUser?.roles?.includes('ADMIN');
  const isMemberOnly = currentUser?.roles?.includes('MEMBER') && !currentUser?.roles?.includes('ADMIN') && !currentUser?.roles?.includes('ACCOUNTANT');

  const fetchReferenceData = async () => {
    try {
      const [cats, modes] = await Promise.all([
        categoryApi.getActiveCategories(),
        paymentModeApi.getActivePaymentModes(),
      ]);
      setCategories(cats);
      setPaymentModes(modes);
    } catch (err: unknown) {
      console.error('Failed to load reference metadata', err);
    }
  };

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: TransactionFilterParams = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        type: typeFilter || undefined,
        categoryId: categoryFilter || undefined,
        paymentMode: paymentModeFilter || undefined,
        includeArchived: includeArchived || undefined,
        sortBy,
        sortDir,
        page,
        size,
      };

      const response = await transactionApi.getTransactions(params);
      setTransactions(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, typeFilter, categoryFilter, paymentModeFilter, includeArchived, sortBy, sortDir, page, size]);

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Click outside listener for header filter popovers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setActiveHeaderFilter(null);
      }
    };
    if (activeHeaderFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeHeaderFilter]);

  const handleCreateNew = () => {
    setEditingTxn(null);
    setIsTxnModalOpen(true);
  };

  const handleEdit = (txn: Transaction) => {
    if (txn.status === 'ARCHIVED') {
      alert({
        title: 'Transaction Archived',
        message: 'Archived transactions are permanently sealed for audit purposes and cannot be modified.',
        variant: 'warning',
        confirmText: 'Understood',
      });
      return;
    }
    setEditingTxn(txn);
    setIsTxnModalOpen(true);
  };

  const handleOpenArchive = (txn: Transaction) => {
    setArchivingTxn(txn);
    setIsArchiveModalOpen(true);
  };

  const handleSaveTransaction = async (data: CreateTransactionRequest | UpdateTransactionRequest): Promise<Transaction> => {
    let result: Transaction;
    if (editingTxn) {
      result = await transactionApi.updateTransaction(editingTxn.id, data as UpdateTransactionRequest);
    } else {
      result = await transactionApi.createTransaction(data as CreateTransactionRequest);
    }
    return result;
  };

  const handleArchiveConfirm = async (reason: string) => {
    if (!archivingTxn) return;
    await transactionApi.archiveTransaction(archivingTxn.id, { reason });
    await fetchTransactions();
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setTypeFilter('');
    setCategoryFilter('');
    setPaymentModeFilter('');
    setIncludeArchived(false);
    setPage(0);
  };

  const handleToggleSort = (column: 'transactionDate' | 'transactionNumber' | 'amount') => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(column);
      setSortDir(column === 'transactionNumber' ? 'asc' : 'desc');
    }
    setPage(0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
            {isMemberOnly ? 'My Transactions' : 'Club Financial Ledger'}
          </h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            {isMemberOnly
              ? 'Record and track your personal club expenses and disbursements'
              : 'Real-time financial activity and cash/UPI ledger operations'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={() => fetchTransactions()} title="Refresh ledger">
            <RefreshCw size={16} />
          </button>
          <button className="btn btn-primary" onClick={handleCreateNew}>
            <Plus size={16} />
            New Transaction
          </button>
        </div>
      </div>

      {/* Filters Card: Only on Desktop. On mobile, all filters are hidden per user requirement */}
      {!isMobile ? (
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                <Filter size={16} />
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Date Range Filter
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>From:</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: 'auto', padding: '0.35rem 0.5rem' }}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(0);
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>To:</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: 'auto', padding: '0.35rem 0.5rem' }}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(0);
                  }}
                />
              </div>

              {(startDate || endDate || typeFilter || categoryFilter || paymentModeFilter) && (
                <button
                  className="btn btn-outline"
                  style={{ fontSize: 'var(--font-size-xs)', padding: '0.3rem 0.65rem' }}
                  onClick={handleResetFilters}
                >
                  Reset All Filters
                </button>
              )}
            </div>

            {canArchive && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => {
                    setIncludeArchived(e.target.checked);
                    setPage(0);
                  }}
                />
                Include Archived Transactions
              </label>
            )}
          </div>
        </div>
      ) : (
        /* Mobile Viewport Date Sort Toolbar: strictly date sorting button, no filters */
        <div
          className="card"
          style={{
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {totalElements} transactions
          </span>
          <button
            type="button"
            className="btn btn-outline"
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: 'var(--font-size-xs)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 600,
              borderColor: 'var(--excel-green)',
              color: 'var(--excel-green)',
            }}
            onClick={() => handleToggleSort('transactionDate')}
          >
            <span>Sort by Date: {sortBy === 'transactionDate' && sortDir === 'asc' ? 'Oldest First' : 'Newest First'}</span>
            {sortBy === 'transactionDate' && sortDir === 'asc' ? (
              <ArrowUp size={14} style={{ color: 'var(--excel-green)' }} />
            ) : (
              <ArrowDown size={14} style={{ color: 'var(--excel-green)' }} />
            )}
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#f87171',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {error}
        </div>
      )}

      {/* Ledger Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          Loading transactions...
        </div>
      ) : (
        <>
          {/* Mobile Single-Column Collapsed Brief View vs Desktop Excel Table View */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {transactions.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                  <Search size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4, color: 'var(--text-secondary)' }} />
                  <h4 style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No Transactions Found</h4>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    No transactions match the current view.
                  </p>
                  <button className="btn btn-primary" onClick={handleCreateNew} style={{ margin: '0 auto' }}>
                    <Plus size={14} /> Record Transaction
                  </button>
                </div>
              ) : (
                transactions.map((txn) => {
                  const isExpanded = expandedMobileId === txn.id;
                  return (
                    <div
                      key={txn.id}
                      className="card"
                      style={{
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem',
                        borderLeft: txn.transactionType === 'IN' ? '4px solid var(--color-income)' : '4px solid var(--excel-green)',
                        opacity: txn.status === 'ARCHIVED' ? 0.6 : 1,
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      {/* Top Header: Date, Txn #, and Amount */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{txn.transactionDate}</span>
                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>•</span>
                            <span style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {txn.transactionNumber}
                            </span>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                            {txn.recipientTo}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 'var(--font-size-base)',
                              color: txn.transactionType === 'IN' ? 'var(--color-income)' : 'var(--text-primary)',
                              fontVariantNumeric: 'tabular-nums lining-nums',
                            }}
                          >
                            {txn.transactionType === 'IN' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <span
                            className={`badge ${txn.transactionType === 'IN' ? 'badge-success' : 'badge-danger'}`}
                            style={{ fontSize: '0.68rem', padding: '0.12rem 0.4rem', marginTop: '0.2rem', display: 'inline-block' }}
                          >
                            {txn.transactionType === 'IN' ? 'INCOME' : 'EXPENSE'}
                          </span>
                        </div>
                      </div>

                      {/* Brief Metadata & Quick Actions */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          paddingTop: '0.4rem',
                          borderTop: '1px dashed var(--border-default)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              ...getCategoryBadgeStyle(txn.category?.name),
                              display: 'inline-block',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '5px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                            }}
                          >
                            {txn.category?.name || 'General'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
                            onClick={() => setExpandedMobileId(isExpanded ? null : txn.id)}
                            title="Toggle details"
                          >
                            {isExpanded ? 'Hide' : 'Details'}
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.45rem', color: '#60a5fa' }}
                            title="Receipts & Documents"
                            onClick={() => {
                              setDocTxn(txn);
                              setIsDocModalOpen(true);
                            }}
                          >
                            <Paperclip size={13} />
                          </button>
                          {txn.status !== 'ARCHIVED' && (
                            <button
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.45rem' }}
                              title="Edit transaction"
                              onClick={() => handleEdit(txn)}
                            >
                              <Edit size={13} />
                            </button>
                          )}
                          {canArchive && txn.status !== 'ARCHIVED' && (
                            <button
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.45rem', color: '#f87171' }}
                              title="Archive transaction"
                              onClick={() => handleOpenArchive(txn)}
                            >
                              <Archive size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Collapsed Details Section (Only shown when expanded) */}
                      {isExpanded && (
                        <div
                          style={{
                            marginTop: '0.2rem',
                            padding: '0.5rem 0.75rem',
                            backgroundColor: 'var(--bg-surface-elevated)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--font-size-xs)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem',
                            border: '1px solid var(--border-default)',
                          }}
                        >
                          <div><strong style={{ color: 'var(--text-muted)' }}>Payer:</strong> {txn.payerFrom}</div>
                          <div><strong style={{ color: 'var(--text-muted)' }}>Status:</strong> {txn.status}</div>
                          {txn.referenceNumber && <div><strong style={{ color: 'var(--text-muted)' }}>Ref:</strong> {txn.referenceNumber}</div>}
                          {txn.comments && <div><strong style={{ color: 'var(--text-muted)' }}>Comments:</strong> {txn.comments}</div>}

                          {/* Direct Document Quick Links in Mobile */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '0.25rem', paddingTop: '0.45rem', borderTop: '1px dashed var(--border-default)' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <ImageIcon size={13} style={{ color: 'var(--text-muted)' }} />
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Screenshot:</span>
                              {txn.screenshotDocumentId ? (
                                <button
                                  type="button"
                                  className="btn"
                                  style={{
                                    padding: '0.18rem 0.45rem',
                                    fontSize: '0.72rem',
                                    fontWeight: 500,
                                    borderRadius: '5px',
                                    color: '#38bdf8',
                                    backgroundColor: 'rgba(56, 189, 248, 0.12)',
                                    border: '1px solid rgba(56, 189, 248, 0.35)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => handleViewDirectDocument(txn.screenshotDocumentId!, `Screenshot - ${txn.transactionNumber}`)}
                                >
                                  <Eye size={12} /> View
                                </button>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '4px',
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    color: '#94a3b8',
                                    backgroundColor: 'rgba(148, 163, 184, 0.08)',
                                    border: '1px solid rgba(148, 163, 184, 0.16)',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  NA
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Receipt size={13} style={{ color: 'var(--text-muted)' }} />
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Bill:</span>
                              {txn.billDocumentId ? (
                                <button
                                  type="button"
                                  className="btn"
                                  style={{
                                    padding: '0.18rem 0.45rem',
                                    fontSize: '0.72rem',
                                    fontWeight: 500,
                                    borderRadius: '5px',
                                    color: '#fbbf24',
                                    backgroundColor: 'rgba(251, 191, 36, 0.12)',
                                    border: '1px solid rgba(251, 191, 36, 0.35)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => handleViewDirectDocument(txn.billDocumentId!, `Bill - ${txn.transactionNumber}`)}
                                >
                                  <Eye size={12} /> View
                                </button>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '4px',
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    color: '#94a3b8',
                                    backgroundColor: 'rgba(148, 163, 184, 0.08)',
                                    border: '1px solid rgba(148, 163, 184, 0.16)',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  NA
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Desktop Table View */
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="data-table">
                <thead>
                  <tr>
                    {/* Column 1: Date (Sortable) */}
                    <th style={{ whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleSort('transactionDate')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: sortBy === 'transactionDate' ? 'var(--accent-primary)' : 'inherit',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="Toggle Date Sort (Newest / Oldest)"
                      >
                        <span>Date</span>
                        {sortBy === 'transactionDate' ? (
                          sortDir === 'desc' ? <ArrowDown size={14} style={{ color: 'var(--accent-primary)' }} /> : <ArrowUp size={14} style={{ color: 'var(--accent-primary)' }} />
                        ) : (
                          <ArrowUpDown size={12} style={{ opacity: 0.4 }} />
                        )}
                      </button>
                    </th>

                    {/* Column 2: Txn # (Sortable) */}
                    <th style={{ whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleSort('transactionNumber')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: sortBy === 'transactionNumber' ? 'var(--accent-primary)' : 'inherit',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="Toggle Txn # Sort"
                      >
                        <span>Txn #</span>
                        {sortBy === 'transactionNumber' ? (
                          sortDir === 'desc' ? <ArrowDown size={14} style={{ color: 'var(--accent-primary)' }} /> : <ArrowUp size={14} style={{ color: 'var(--accent-primary)' }} />
                        ) : (
                          <ArrowUpDown size={12} style={{ opacity: 0.4 }} />
                        )}
                      </button>
                    </th>

                    {/* Column 3: Type (Header Filter) */}
                    <th style={{ position: 'relative', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>Type</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveHeaderFilter(activeHeaderFilter === 'type' ? null : 'type');
                          }}
                          style={{
                            padding: '0.2rem',
                            borderRadius: 'var(--radius-sm)',
                            color: typeFilter ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            backgroundColor: typeFilter ? 'var(--accent-primary-subtle)' : 'transparent',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                          title="Filter by Transaction Type"
                        >
                          <Filter size={12} />
                        </button>
                      </div>

                      {/* Type Filter Popover */}
                      {activeHeaderFilter === 'type' && (
                        <div
                          ref={filterDropdownRef}
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            marginTop: '0.25rem',
                            zIndex: 100,
                            minWidth: '150px',
                            backgroundColor: 'var(--bg-surface-elevated)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-lg)',
                            padding: '0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{
                              justifyContent: 'space-between',
                              padding: '0.35rem 0.5rem',
                              fontSize: 'var(--font-size-xs)',
                              border: 'none',
                              backgroundColor: typeFilter === '' ? 'var(--bg-surface-hover)' : 'transparent',
                            }}
                            onClick={() => {
                              setTypeFilter('');
                              setActiveHeaderFilter(null);
                              setPage(0);
                            }}
                          >
                            <span>All Types</span>
                            {typeFilter === '' && <Check size={14} style={{ color: 'var(--accent-primary)' }} />}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{
                              justifyContent: 'space-between',
                              padding: '0.35rem 0.5rem',
                              fontSize: 'var(--font-size-xs)',
                              border: 'none',
                              backgroundColor: typeFilter === 'IN' ? 'var(--bg-surface-hover)' : 'transparent',
                            }}
                            onClick={() => {
                              setTypeFilter('IN');
                              setActiveHeaderFilter(null);
                              setPage(0);
                            }}
                          >
                            <span style={{ color: 'var(--color-income)' }}>IN (Income)</span>
                            {typeFilter === 'IN' && <Check size={14} style={{ color: 'var(--accent-primary)' }} />}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{
                              justifyContent: 'space-between',
                              padding: '0.35rem 0.5rem',
                              fontSize: 'var(--font-size-xs)',
                              border: 'none',
                              backgroundColor: typeFilter === 'OUT' ? 'var(--bg-surface-hover)' : 'transparent',
                            }}
                            onClick={() => {
                              setTypeFilter('OUT');
                              setActiveHeaderFilter(null);
                              setPage(0);
                            }}
                          >
                            <span style={{ color: 'var(--color-expense)' }}>OUT (Expense)</span>
                            {typeFilter === 'OUT' && <Check size={14} style={{ color: 'var(--accent-primary)' }} />}
                          </button>
                        </div>
                      )}
                    </th>

                    {/* Column 4: Payer / Recipient */}
                    <th>Payer / Recipient</th>

                    {/* Column 5: Category (Header Filter) */}
                    <th style={{ position: 'relative', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>Category</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveHeaderFilter(activeHeaderFilter === 'category' ? null : 'category');
                          }}
                          style={{
                            padding: '0.2rem',
                            borderRadius: 'var(--radius-sm)',
                            color: categoryFilter ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            backgroundColor: categoryFilter ? 'var(--accent-primary-subtle)' : 'transparent',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                          title="Filter by Category"
                        >
                          <Filter size={12} />
                        </button>
                      </div>

                      {/* Category Filter Popover */}
                      {activeHeaderFilter === 'category' && (
                        <div
                          ref={filterDropdownRef}
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            marginTop: '0.25rem',
                            zIndex: 100,
                            minWidth: '180px',
                            maxHeight: '260px',
                            overflowY: 'auto',
                            backgroundColor: 'var(--bg-surface-elevated)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-lg)',
                            padding: '0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{
                              justifyContent: 'space-between',
                              padding: '0.35rem 0.5rem',
                              fontSize: 'var(--font-size-xs)',
                              border: 'none',
                              backgroundColor: categoryFilter === '' ? 'var(--bg-surface-hover)' : 'transparent',
                            }}
                            onClick={() => {
                              setCategoryFilter('');
                              setActiveHeaderFilter(null);
                              setPage(0);
                            }}
                          >
                            <span>All Categories</span>
                            {categoryFilter === '' && <Check size={14} style={{ color: 'var(--accent-primary)' }} />}
                          </button>
                          {categories.map((c) => {
                            const badgeStyle = getCategoryBadgeStyle(c.name);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                className="btn btn-outline"
                                style={{
                                  justifyContent: 'space-between',
                                  padding: '0.35rem 0.5rem',
                                  fontSize: 'var(--font-size-xs)',
                                  border: 'none',
                                  backgroundColor: categoryFilter === c.id ? 'var(--bg-surface-hover)' : 'transparent',
                                }}
                                onClick={() => {
                                  setCategoryFilter(c.id);
                                  setActiveHeaderFilter(null);
                                  setPage(0);
                                }}
                              >
                                <span style={{ color: badgeStyle.color, fontWeight: 500 }}>
                                  {c.name}
                                </span>
                                {categoryFilter === c.id && <Check size={14} style={{ color: 'var(--accent-primary)' }} />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </th>

                    {/* Column 6: Amount (Sortable) */}
                    <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleSort('amount')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: sortBy === 'amount' ? 'var(--accent-primary)' : 'inherit',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="Toggle Amount Sort"
                      >
                        <span>Amount (₹)</span>
                        {sortBy === 'amount' ? (
                          sortDir === 'desc' ? <ArrowDown size={14} style={{ color: 'var(--accent-primary)' }} /> : <ArrowUp size={14} style={{ color: 'var(--accent-primary)' }} />
                        ) : (
                          <ArrowUpDown size={12} style={{ opacity: 0.4 }} />
                        )}
                      </button>
                    </th>

                    {/* Column 7: Screenshot (Icon Header) */}
                    <th style={{ textAlign: 'center', width: '82px', whiteSpace: 'nowrap' }} title="Payment Screenshot">
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        <ImageIcon size={16} />
                      </div>
                    </th>

                    {/* Column 8: Bill / Invoice (Icon Header) */}
                    <th style={{ textAlign: 'center', width: '82px', whiteSpace: 'nowrap' }} title="Bill / Invoice Document">
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        <Receipt size={16} />
                      </div>
                    </th>

                    {/* Column 9: Actions */}
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <Search size={36} style={{ margin: '0 auto 1rem', opacity: 0.5, color: 'var(--text-secondary)' }} />
                          <h3 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Transactions Found</h3>
                          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                            No transactions match the selected criteria. Try adjusting your filters or record a new transaction.
                          </p>
                          <button className="btn btn-primary" onClick={handleCreateNew}>
                            <Plus size={16} /> Record Transaction
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((txn) => (
                    <tr key={txn.id} style={{ opacity: txn.status === 'ARCHIVED' ? 0.6 : 1 }}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        {txn.transactionDate}
                      </td>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>
                        {txn.transactionNumber}
                      </td>
                      <td>
                        <span
                          className={`badge ${txn.transactionType === 'IN' ? 'badge-success' : 'badge-danger'}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          {txn.transactionType === 'IN' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                          {txn.transactionType}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{txn.recipientTo}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>From: {txn.payerFrom}</div>
                      </td>
                      <td>
                        <span
                          style={{
                            ...getCategoryBadgeStyle(txn.category?.name),
                            display: 'inline-block',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            letterSpacing: '0.01em',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {txn.category?.name || '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 'var(--font-size-base)' }}>
                        <span style={{ color: txn.transactionType === 'IN' ? 'var(--color-income)' : 'var(--text-primary)' }}>
                          {txn.transactionType === 'IN' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Column 7: Screenshot Direct View Button or NA */}
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {txn.screenshotDocumentId ? (
                          <button
                            type="button"
                            className="btn"
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              color: '#38bdf8',
                              backgroundColor: 'rgba(56, 189, 248, 0.12)',
                              border: '1px solid rgba(56, 189, 248, 0.35)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              gap: '0.3rem',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              lineHeight: 1,
                            }}
                            onClick={() => handleViewDirectDocument(txn.screenshotDocumentId!, `Screenshot - ${txn.transactionNumber}`)}
                            title="View Payment Screenshot"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              color: '#94a3b8',
                              backgroundColor: 'rgba(148, 163, 184, 0.08)',
                              border: '1px solid rgba(148, 163, 184, 0.16)',
                              letterSpacing: '0.04em',
                            }}
                          >
                            NA
                          </span>
                        )}
                      </td>

                      {/* Column 8: Bill Direct View Button or NA */}
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {txn.billDocumentId ? (
                          <button
                            type="button"
                            className="btn"
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              color: '#fbbf24',
                              backgroundColor: 'rgba(251, 191, 36, 0.12)',
                              border: '1px solid rgba(251, 191, 36, 0.35)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              gap: '0.3rem',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              lineHeight: 1,
                            }}
                            onClick={() => handleViewDirectDocument(txn.billDocumentId!, `Bill - ${txn.transactionNumber}`)}
                            title="View Bill Document"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              color: '#94a3b8',
                              backgroundColor: 'rgba(148, 163, 184, 0.08)',
                              border: '1px solid rgba(148, 163, 184, 0.16)',
                              letterSpacing: '0.04em',
                            }}
                          >
                            NA
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.35rem 0.6rem', color: '#60a5fa' }}
                            title="Supporting documents & receipts"
                            onClick={() => {
                              setDocTxn(txn);
                              setIsDocModalOpen(true);
                            }}
                          >
                            <Paperclip size={14} />
                          </button>
                          {txn.status !== 'ARCHIVED' && (
                            <button
                              className="btn btn-outline"
                              style={{ padding: '0.35rem 0.6rem' }}
                              title="Edit transaction"
                              onClick={() => handleEdit(txn)}
                            >
                              <Edit size={14} />
                            </button>
                          )}
                          {canArchive && txn.status !== 'ARCHIVED' && (
                            <button
                              className="btn btn-outline"
                              style={{ padding: '0.35rem 0.6rem', color: '#f87171' }}
                              title="Archive transaction"
                              onClick={() => handleOpenArchive(txn)}
                            >
                              <Archive size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Pagination Controls */}
          {transactions.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                Showing {transactions.length} of {totalElements} transactions (Page {page + 1} of {Math.max(totalPages, 1)})
              </span>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={{ padding: '0.35rem 0.75rem' }}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
                  style={{ padding: '0.35rem 0.75rem' }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Transaction Modal (Create & Edit) */}
      <TransactionModal
        isOpen={isTxnModalOpen}
        onClose={() => {
          setIsTxnModalOpen(false);
          setEditingTxn(null);
          fetchTransactions();
        }}
        onSuccess={async () => {
          setIsTxnModalOpen(false);
          setEditingTxn(null);
          await fetchTransactions();
        }}
        onSubmit={handleSaveTransaction}
        transaction={editingTxn}
        categories={categories}
        paymentModes={paymentModes}
        currentUser={currentUser}
      />

      {/* Archive Modal */}
      <ArchiveModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        onConfirm={handleArchiveConfirm}
        transaction={archivingTxn}
      />

      {/* Document Attachments Modal */}
      <DocumentModal
        isOpen={isDocModalOpen}
        onClose={() => {
          setIsDocModalOpen(false);
          setDocTxn(null);
        }}
        transaction={docTxn}
        currentUser={currentUser}
        onDocumentChange={() => {
          fetchTransactions();
        }}
      />

      {/* Direct Document Preview Lightbox Modal */}
      {directPreview?.isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1.25rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseDirectPreview();
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated, #111827)',
              border: '1px solid var(--border-default, rgba(255, 255, 255, 0.12))',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border-default, rgba(255, 255, 255, 0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(to right, #111827, #1f2937)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8',
                  }}
                >
                  <Eye size={17} />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f9fafb', margin: 0 }}>
                  {directPreview.title}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {directPreview.url && (
                  <a
                    href={directPreview.url}
                    download={directPreview.title}
                    className="btn btn-outline"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    title="Download document"
                  >
                    <Download size={14} /> Download
                  </a>
                )}
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.35rem 0.5rem', color: 'var(--text-muted)' }}
                  onClick={handleCloseDirectPreview}
                  title="Close preview (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Lightbox Content Body */}
            <div
              style={{
                padding: '1.25rem',
                overflowY: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px',
                backgroundColor: '#0a0f1d',
              }}
            >
              {directPreview.loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                  <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '0.85rem' }}>Loading document preview...</span>
                </div>
              ) : directPreview.error ? (
                <div style={{ textAlign: 'center', color: '#f87171', padding: '2rem' }}>
                  <p style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>{directPreview.error}</p>
                  <button className="btn btn-outline" onClick={handleCloseDirectPreview}>Close</button>
                </div>
              ) : directPreview.contentType?.includes('pdf') ? (
                <iframe
                  src={directPreview.url}
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px' }}
                  title={directPreview.title}
                />
              ) : (
                <img
                  src={directPreview.url}
                  alt={directPreview.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '75vh',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
