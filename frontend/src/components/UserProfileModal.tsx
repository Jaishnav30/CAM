import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  GraduationCap,
  Layers,
  Calendar,
  CreditCard,
  TrendingDown,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Wallet,
} from 'lucide-react';
import { userApi } from '../api/userApi';
import { AuthUser, UserProfileStats } from '../types';

interface UserProfileModalProps {
  currentUser: AuthUser;
  targetUserId?: string;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ currentUser: _currentUser, targetUserId, onClose }) => {
  const [profileStats, setProfileStats] = useState<UserProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'permissions'>('overview');
  const [copiedUpi, setCopiedUpi] = useState(false);

  const handleCopyUpi = (upi: string) => {
    navigator.clipboard.writeText(upi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = targetUserId
        ? await userApi.getUserProfile(targetUserId)
        : await userApi.getMyProfile();
      setProfileStats(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load profile statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [targetUserId]);

  const formatCurrency = (val: number | undefined | null) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1.25rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Modal Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: '#073d1e',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: 'var(--radius-md)',
                padding: '0.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={18} style={{ color: '#86efac' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                User Profile & Activity
              </h2>
              <div style={{ fontSize: '0.72rem', color: '#86efac' }}>
                Member credentials, committee details, and financial summary
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#86efac',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              <RefreshCw size={28} className="spin" style={{ margin: '0 auto 0.75rem', color: '#107c41' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading profile details...</div>
            </div>
          ) : error ? (
            <div
              style={{
                padding: '1.25rem',
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
              }}
            >
              <AlertCircle size={24} style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 700 }}>{error}</div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={fetchProfile}
                style={{ marginTop: '0.75rem', fontSize: '0.78rem' }}
              >
                Retry
              </button>
            </div>
          ) : profileStats ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* User Hero Identity Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  border: '1px solid #bbf7d0',
                }}
              >
                {/* User Initial Badge */}
                {(() => {
                  const isDeleted = Boolean(profileStats.deleted);
                  const isBlocked = !profileStats.active && !isDeleted;
                  const bgColor = isDeleted ? '#dc2626' : isBlocked ? '#64748b' : '#107c41';
                  const borderColor = isDeleted ? '#f87171' : isBlocked ? '#94a3b8' : '#86efac';

                  return (
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: bgColor,
                        color: '#ffffff',
                        border: `2px solid ${borderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        flexShrink: 0,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      {profileStats.fullName ? profileStats.fullName.charAt(0).toUpperCase() : profileStats.username ? profileStats.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                  );
                })()}

                {/* User Info */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#14532d' }}>
                      @{profileStats.username}
                    </span>
                    {profileStats.roles.map((r) => (
                      <span
                        key={r}
                        style={{
                          fontSize: '0.68rem',
                          padding: '0.1rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#107c41',
                          color: '#ffffff',
                          fontWeight: 700,
                        }}
                      >
                        {r}
                      </span>
                    ))}
                    {profileStats.deleted ? (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '0.1rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          fontWeight: 700,
                          border: '1px solid #fecaca',
                        }}
                      >
                        DELETED
                      </span>
                    ) : !profileStats.active ? (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '0.1rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          fontWeight: 700,
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        BLOCKED
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '0.1rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#bbf7d0',
                          color: '#166534',
                          fontWeight: 700,
                        }}
                      >
                        {profileStats.approvalStatus}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600, marginTop: '0.15rem' }}>
                    {profileStats.fullName}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.75rem',
                        color: '#334155',
                      }}
                    >
                      <Mail size={13} style={{ color: '#059669' }} /> {profileStats.email}
                    </span>

                    {profileStats.batch && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.75rem',
                          backgroundColor: '#ffffff',
                          padding: '0.1rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          fontWeight: 600,
                        }}
                      >
                        <GraduationCap size={13} style={{ color: '#107c41' }} /> Batch: {profileStats.batch}
                      </span>
                    )}

                    {profileStats.committee && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.75rem',
                          backgroundColor: '#ffffff',
                          padding: '0.1rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          fontWeight: 600,
                        }}
                      >
                        <Layers size={13} style={{ color: '#107c41' }} /> {profileStats.committee}
                      </span>
                    )}

                    {profileStats.upiId && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.75rem',
                          backgroundColor: '#f0fdf4',
                          padding: '0.1rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #bbf7d0',
                          color: '#166534',
                          fontWeight: 600,
                        }}
                      >
                        <Wallet size={13} style={{ color: '#107c41' }} />
                        <span>UPI: <strong>{profileStats.upiId}</strong></span>
                        <button
                          type="button"
                          onClick={() => handleCopyUpi(profileStats.upiId!)}
                          title="Copy UPI ID"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '1px 3px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: copiedUpi ? '#16a34a' : '#107c41',
                          }}
                        >
                          {copiedUpi ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </span>
                    )}

                    {profileStats.memberSince && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.72rem',
                          color: '#64748b',
                        }}
                      >
                        <Calendar size={12} /> Joined: {new Date(profileStats.memberSince).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Subtabs: Overview vs Permissions */}
              <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    borderBottom: activeTab === 'overview' ? '2.5px solid #107c41' : '2.5px solid transparent',
                    backgroundColor: 'transparent',
                    color: activeTab === 'overview' ? '#107c41' : 'var(--text-muted)',
                    fontWeight: activeTab === 'overview' ? 700 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Financial Activity & Metrics
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('permissions')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    borderBottom: activeTab === 'permissions' ? '2.5px solid #107c41' : '2.5px solid transparent',
                    backgroundColor: 'transparent',
                    color: activeTab === 'permissions' ? '#107c41' : 'var(--text-muted)',
                    fontWeight: activeTab === 'permissions' ? 700 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Assigned Permissions ({profileStats.permissions.length})
                </button>
              </div>

              {activeTab === 'overview' ? (
                <>
                  {/* Financial Statistics Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                    {/* Card 1: Transactions Created */}
                    <div
                      style={{
                        padding: '1rem',
                        backgroundColor: '#ffffff',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          Transactions Made
                        </span>
                        <div
                          style={{
                            padding: '0.35rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                          }}
                        >
                          <CreditCard size={15} />
                        </div>
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                        {profileStats.totalTransactionsCount}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Ledger transactions recorded
                      </div>
                    </div>

                    {/* Card 2: Total Amount Spent */}
                    <div
                      style={{
                        padding: '1rem',
                        backgroundColor: '#ffffff',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          Total Amount Spent
                        </span>
                        <div
                          style={{
                            padding: '0.35rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                          }}
                        >
                          <TrendingDown size={15} />
                        </div>
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b91c1c', marginTop: '0.35rem' }}>
                        {formatCurrency(profileStats.totalAmountSpent)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Total recorded expenses (OUT)
                      </div>
                    </div>

                    {/* Card 3: Reimbursements Applied */}
                    <div
                      style={{
                        padding: '1rem',
                        backgroundColor: '#ffffff',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          Reimbursements Applied
                        </span>
                        <div
                          style={{
                            padding: '0.35rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                          }}
                        >
                          <Receipt size={15} />
                        </div>
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309', marginTop: '0.35rem' }}>
                        {formatCurrency(profileStats.totalReimbursementApplied)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {profileStats.totalReimbursementsCount} claim(s) submitted
                      </div>
                    </div>
                  </div>

                  {/* Reimbursement Claim Funnel Status */}
                  <div
                    style={{
                      padding: '1.1rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                      Reimbursement Claims Breakdown
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
                      {/* Paid / Reimbursed */}
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid #bbf7d0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#166534', fontSize: '0.72rem', fontWeight: 700 }}>
                          <CheckCircle2 size={13} /> Reimbursed (Paid)
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#166534', marginTop: '0.25rem' }}>
                          {formatCurrency(profileStats.paidReimbursementAmount)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {profileStats.paidReimbursementCount} claim(s)
                        </div>
                      </div>

                      {/* Pending Review */}
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid #fde68a',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#b45309', fontSize: '0.72rem', fontWeight: 700 }}>
                          <Clock size={13} /> Pending Review
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b45309', marginTop: '0.25rem' }}>
                          {formatCurrency(profileStats.pendingReimbursementAmount)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {profileStats.pendingReimbursementCount} claim(s)
                        </div>
                      </div>

                      {/* Approved */}
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 700 }}>
                          <CheckCircle2 size={13} /> Approved
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1d4ed8', marginTop: '0.25rem' }}>
                          {formatCurrency(profileStats.approvedReimbursementAmount)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {profileStats.approvedReimbursementCount} claim(s)
                        </div>
                      </div>

                      {/* Rejected */}
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid #fecaca',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#b91c1c', fontSize: '0.72rem', fontWeight: 700 }}>
                          <XCircle size={13} /> Rejected
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b91c1c', marginTop: '0.25rem' }}>
                          {formatCurrency(profileStats.rejectedReimbursementAmount)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {profileStats.rejectedReimbursementCount} claim(s)
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Permissions Tab */
                <div style={{ padding: '0.5rem 0' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                    Active RBAC Permissions
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {profileStats.permissions.map((p) => (
                      <span
                        key={p}
                        style={{
                          fontSize: '0.72rem',
                          fontFamily: 'monospace',
                          padding: '0.2rem 0.5rem',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: 'var(--radius-sm)',
                          color: '#334155',
                          fontWeight: 600,
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Footer Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '0.85rem 1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: '#fafafa',
          }}
        >
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            style={{ fontSize: '0.82rem', padding: '0.45rem 1.25rem', fontWeight: 600 }}
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
export default UserProfileModal;
