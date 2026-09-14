import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  CheckCheck,
  RefreshCw,
  AlertCircle,
  Paperclip,
  Check,
  X,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { reimbursementApi } from '../api/reimbursementApi';
import {
  AuthUser,
  ReimbursementFilterParams,
  ReimbursementResponse,
  ReimbursementStatus,
  Transaction,
} from '../types';
import { DocumentModal } from './DocumentModal';

interface ReimbursementListProps {
  currentUser: AuthUser | null;
}

export const ReimbursementList: React.FC<ReimbursementListProps> = ({ currentUser }) => {
  const [claims, setClaims] = useState<ReimbursementResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Pagination & Filtering
  const [page, setPage] = useState<number>(0);
  const [size] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);

  const [statusFilter, setStatusFilter] = useState<ReimbursementStatus | ''>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'claimNumber' | 'createdAt' | 'amount'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Reject Modal State
  const [rejectingClaim, setRejectingClaim] = useState<ReimbursementResponse | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectSubmitting, setRejectSubmitting] = useState<boolean>(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Confirm Action State (Approve / Mark Reimbursed / Resubmit)
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'APPROVE' | 'MARK_REIMBURSED' | 'RESUBMIT';
    claim: ReimbursementResponse;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);

  // Document modal for viewing transaction attachments
  const [docModalTxn, setDocModalTxn] = useState<Transaction | null>(null);

  const isAdmin = currentUser?.roles?.includes('ADMIN') ?? false;
  const isAccountant = currentUser?.roles?.includes('ACCOUNTANT') ?? false;
  const canReview = (isAdmin || isAccountant) && (currentUser?.permissions?.includes('reimbursements:review') ?? false);
  const canApprove = (isAdmin || isAccountant) && (currentUser?.permissions?.includes('reimbursements:approve') ?? false);
  const canMarkPaid = (isAdmin || isAccountant) && (currentUser?.permissions?.includes('reimbursements:mark_paid') ?? false);
  const canSubmit = currentUser?.permissions?.includes('reimbursements:submit') ?? false;

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ReimbursementFilterParams = {
        status: statusFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        size,
        sortBy,
        sortDir,
      };

      const response = await reimbursementApi.getClaims(params);
      setClaims(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reimbursement claims');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startDate, endDate, page, size, sortBy, sortDir]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  // Handle Reject
  const handleOpenReject = (claim: ReimbursementResponse) => {
    setRejectingClaim(claim);
    setRejectionReason('');
    setRejectError(null);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingClaim) return;
    if (!rejectionReason.trim()) {
      setRejectError('Rejection reason cannot be blank');
      return;
    }

    setRejectSubmitting(true);
    setRejectError(null);
    try {
      await reimbursementApi.rejectClaim(rejectingClaim.id, { reason: rejectionReason.trim() });
      setRejectingClaim(null);
      setActionSuccess(`Claim ${rejectingClaim.claimNumber} was rejected.`);
      setTimeout(() => setActionSuccess(null), 5000);
      await fetchClaims();
    } catch (err: unknown) {
      setRejectError(err instanceof Error ? err.message : 'Failed to reject reimbursement claim');
    } finally {
      setRejectSubmitting(false);
    }
  };

  // Handle Confirm Dialog actions
  const handleExecuteConfirm = async () => {
    if (!confirmDialog) return;
    const { type, claim } = confirmDialog;
    setConfirmLoading(true);

    try {
      if (type === 'APPROVE') {
        await reimbursementApi.approveClaim(claim.id);
        setActionSuccess(`Claim ${claim.claimNumber} approved successfully.`);
      } else if (type === 'MARK_REIMBURSED') {
        await reimbursementApi.markReimbursed(claim.id);
        setActionSuccess(`Claim ${claim.claimNumber} marked as REIMBURSED.`);
      } else if (type === 'RESUBMIT') {
        await reimbursementApi.resubmitClaim(claim.id);
        setActionSuccess(`Claim ${claim.claimNumber} resubmitted for review.`);
      }
      setConfirmDialog(null);
      setTimeout(() => setActionSuccess(null), 5000);
      await fetchClaims();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleOpenAttachments = (claim: ReimbursementResponse) => {
    const dummyTxn: Transaction = {
      id: claim.transactionId,
      transactionNumber: claim.transactionNumber || 'TXN',
      transactionDate: claim.transactionDate || '',
      payerFrom: claim.payerFrom || '',
      recipientTo: claim.recipientTo || '',
      amount: claim.amount,
      transactionType: 'OUT',
      paymentMode: claim.paymentMode || { id: '', code: 'UPI', name: 'UPI', isActive: true },
      category: claim.category || { id: '', name: 'General', type: 'EXPENSE', isActive: true, createdAt: '' },
      invoiceStatus: 'AVAILABLE',
      status: 'COMPLETED',
      createdBy: claim.claimant,
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt,
    };
    setDocModalTxn(dummyTxn);
  };

  const getStatusBadge = (status: ReimbursementStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="badge badge-warning" style={{ gap: '0.35rem' }}>
            <Clock size={12} />
            Submitted
          </span>
        );
      case 'APPROVED':
        return (
          <span className="badge badge-info" style={{ gap: '0.35rem' }}>
            <CheckCircle size={12} />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="badge badge-danger" style={{ gap: '0.35rem' }}>
            <XCircle size={12} />
            Rejected
          </span>
        );
      case 'REIMBURSED':
        return (
          <span className="badge badge-success" style={{ gap: '0.35rem' }}>
            <CheckCheck size={12} />
            Reimbursed
          </span>
        );
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const isClaimant = (claim: ReimbursementResponse) => {
    return currentUser?.id === claim.claimant?.id;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
            Reimbursement Claims
          </h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Expense reimbursement lifecycle and approval tracking (1 Transaction ↔ 1 Reimbursement)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn btn-outline"
            onClick={() => fetchClaims()}
            title="Refresh Claims"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Action alerts */}
      {actionSuccess && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#34d399',
            fontSize: 'var(--font-size-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Check size={16} />
          {actionSuccess}
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
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Filter Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Status:
            </span>
            {(['', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(0);
                }}
                className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: 'var(--font-size-xs)',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {st === '' ? 'All Claims' : st}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>From:</label>
              <input
                type="date"
                className="form-input"
                style={{ padding: '0.3rem 0.5rem', width: 'auto', fontSize: 'var(--font-size-xs)' }}
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
                style={{ padding: '0.3rem 0.5rem', width: 'auto', fontSize: 'var(--font-size-xs)' }}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(0);
                }}
              />
            </div>

            {(statusFilter || startDate || endDate) && (
              <button
                className="btn btn-outline"
                style={{ padding: '0.3rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
                onClick={() => {
                  setStatusFilter('');
                  setStartDate('');
                  setEndDate('');
                  setPage(0);
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Claims Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSortBy('claimNumber');
                    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                  }}
                >
                  Claim # {sortBy === 'claimNumber' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th>Transaction Reference</th>
                <th
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSortBy('amount');
                    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                  }}
                >
                  Amount (₹) {sortBy === 'amount' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th>Claimant</th>
                <th>Status</th>
                <th>Rejection Reason / Notes</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && claims.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    Loading reimbursement claims...
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={32} style={{ color: 'var(--text-muted)' }} />
                      <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No Reimbursement Claims Found</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        {statusFilter || startDate || endDate
                          ? 'No claims match your filters. Try resetting the filter controls.'
                          : 'When creating an expense (OUT) transaction, select "Request Reimbursement" to file a claim.'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id}>
                    {/* Claim # */}
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '0.02em' }}>
                        {claim.claimNumber}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        {new Date(claim.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Linked Transaction */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>{claim.transactionNumber}</span>
                        {claim.category && (
                          <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                            {claim.category.name}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {claim.payerFrom} → {claim.recipientTo}
                      </div>
                    </td>

                    {/* Amount */}
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: 'var(--color-expense)' }}>
                        ₹{Number(claim.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Claimant */}
                    <td>
                      <div style={{ fontWeight: 500 }}>{claim.claimant?.fullName || '—'}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        {claim.claimant?.email || ''}
                      </div>
                    </td>

                    {/* Status */}
                    <td>{getStatusBadge(claim.status)}</td>

                    {/* Rejection Reason or Note */}
                    <td>
                      {claim.status === 'REJECTED' && claim.rejectionReason ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'flex-start',
                            gap: '0.35rem',
                            color: '#f87171',
                            fontSize: 'var(--font-size-xs)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            padding: '0.35rem 0.6rem',
                            borderRadius: 'var(--radius-sm)',
                            maxWidth: '260px',
                            wordBreak: 'break-word',
                          }}
                        >
                          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                          <span>{claim.rejectionReason}</span>
                        </div>
                      ) : claim.status === 'REIMBURSED' ? (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                          Disbursed (Terminal)
                        </span>
                      ) : claim.status === 'APPROVED' ? (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                          Locked • Awaiting payout
                        </span>
                      ) : (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {/* Attachments quick viewer */}
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
                          onClick={() => handleOpenAttachments(claim)}
                          title="View Supporting Documents"
                        >
                          <Paperclip size={14} />
                        </button>

                        {/* Transitions based on status and RBAC */}
                        {claim.status === 'SUBMITTED' && (
                          <>
                            {canApprove && (
                              <button
                                className="btn"
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  fontSize: 'var(--font-size-xs)',
                                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                  color: '#34d399',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                }}
                                onClick={() => setConfirmDialog({ type: 'APPROVE', claim })}
                                title="Approve Claim"
                              >
                                <Check size={14} />
                                Approve
                              </button>
                            )}

                            {canReview && (
                              <button
                                className="btn"
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  fontSize: 'var(--font-size-xs)',
                                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                  color: '#f87171',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                }}
                                onClick={() => handleOpenReject(claim)}
                                title="Reject Claim"
                              >
                                <X size={14} />
                                Reject
                              </button>
                            )}
                          </>
                        )}

                        {claim.status === 'REJECTED' && isClaimant(claim) && canSubmit && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: 'var(--font-size-xs)' }}
                            onClick={() => setConfirmDialog({ type: 'RESUBMIT', claim })}
                            title="Resubmit Claim"
                          >
                            <RotateCcw size={14} />
                            Resubmit
                          </button>
                        )}

                        {claim.status === 'APPROVED' && canMarkPaid && (
                          <button
                            className="btn btn-primary"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: 'var(--font-size-xs)',
                              backgroundColor: 'var(--color-income)',
                            }}
                            onClick={() => setConfirmDialog({ type: 'MARK_REIMBURSED', claim })}
                            title="Mark as Reimbursed"
                          >
                            <CheckCheck size={14} />
                            Mark Reimbursed
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

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-secondary)',
            }}
          >
            <div>
              Showing {claims.length} of {totalElements} claims
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-outline"
                style={{ padding: '0.3rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </button>
              <span style={{ alignSelf: 'center' }}>
                Page {page + 1} of {totalPages}
              </span>
              <button
                className="btn btn-outline"
                style={{ padding: '0.3rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectingClaim && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !rejectSubmitting) setRejectingClaim(null);
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: 'var(--bg-surface)',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    padding: '0.4rem',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <XCircle size={20} />
                </div>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
                  Reject Reimbursement Claim
                </h3>
              </div>
              <button
                onClick={() => !rejectSubmitting && setRejectingClaim(null)}
                style={{ color: 'var(--text-secondary)', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <div><strong>Claim:</strong> {rejectingClaim.claimNumber}</div>
              <div><strong>Amount:</strong> ₹{Number(rejectingClaim.amount).toLocaleString('en-IN')}</div>
              <div><strong>Claimant:</strong> {rejectingClaim.claimant?.fullName}</div>
            </div>

            {rejectError && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: '#f87171',
                  fontSize: 'var(--font-size-xs)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={14} />
                {rejectError}
              </div>
            )}

            <form onSubmit={handleConfirmReject}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.35rem',
                    fontWeight: 600,
                  }}
                >
                  Rejection Reason *
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Provide explicit reason for rejecting this claim (mandatory)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  maxLength={1000}
                />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  The claimant will see this reason and may edit their transaction before resubmitting.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setRejectingClaim(null)}
                  disabled={rejectSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#fff',
                  }}
                  disabled={rejectSubmitting || !rejectionReason.trim()}
                >
                  {rejectSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog (Approve / Mark Reimbursed / Resubmit) */}
      {confirmDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !confirmLoading) setConfirmDialog(null);
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: 'var(--bg-surface)',
              padding: '1.75rem',
            }}
          >
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: '0.75rem' }}>
              {confirmDialog.type === 'APPROVE' && 'Approve Reimbursement Claim'}
              {confirmDialog.type === 'MARK_REIMBURSED' && 'Mark Claim as Reimbursed'}
              {confirmDialog.type === 'RESUBMIT' && 'Resubmit Reimbursement Claim'}
            </h3>

            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              {confirmDialog.type === 'APPROVE' && (
                <>
                  Are you sure you want to approve claim <strong>{confirmDialog.claim.claimNumber}</strong> for{' '}
                  <strong>₹{Number(confirmDialog.claim.amount).toLocaleString('en-IN')}</strong>?
                  <br /><br />
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)' }}>
                    Note: Once approved, the linked transaction and attachments are locked against modification.
                  </span>
                </>
              )}
              {confirmDialog.type === 'MARK_REIMBURSED' && (
                <>
                  Confirm payout for claim <strong>{confirmDialog.claim.claimNumber}</strong> (₹{Number(confirmDialog.claim.amount).toLocaleString('en-IN')})?
                  <br /><br />
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                    Consistent with CAMS V1 accounting rules: Exactly 1 transaction ↔ 1 claim is maintained. No second OUT transaction will be created. This claim reaches terminal state REIMBURSED.
                  </span>
                </>
              )}
              {confirmDialog.type === 'RESUBMIT' && (
                <>
                  Resubmit claim <strong>{confirmDialog.claim.claimNumber}</strong> for review?
                  <br /><br />
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                    The claim status will be reset to SUBMITTED, and previous rejection reasons will be cleared.
                  </span>
                </>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmDialog(null)}
                disabled={confirmLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteConfirm}
                disabled={confirmLoading}
              >
                {confirmLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supporting Documents Modal */}
      {docModalTxn && (
        <DocumentModal
          isOpen={true}
          onClose={() => setDocModalTxn(null)}
          transaction={docModalTxn}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
