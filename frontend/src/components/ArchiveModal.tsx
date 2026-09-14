import React, { useState } from 'react';
import { AlertTriangle, X, Archive } from 'lucide-react';
import { Transaction } from '../types';

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  transaction: Transaction | null;
}

export const ArchiveModal: React.FC<ArchiveModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  transaction,
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !transaction) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Archive justification reason is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to archive transaction');
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
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'var(--bg-surface)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
            <AlertTriangle size={22} />
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>Archive Transaction</h2>
          </div>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-secondary)', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          You are about to soft-archive transaction{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{transaction.transactionNumber}</strong>{' '}
          (₹{transaction.amount.toLocaleString('en-IN')}). Soft-archived transactions are excluded from standard views and locked from further edits.
        </p>

        {error && (
          <div
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#f87171',
              fontSize: 'var(--font-size-xs)',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleConfirm}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Archive Justification Reason *
            </label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="e.g. Duplicate entry entered on Sep 12, replaced by TXN-1005"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              required
            />
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              This reason will be permanently recorded in the synchronous audit trail.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              style={{ backgroundColor: '#dc2626', color: '#fff', fontWeight: 600 }}
              disabled={loading}
            >
              <Archive size={16} />
              {loading ? 'Archiving...' : 'Confirm Archive'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
