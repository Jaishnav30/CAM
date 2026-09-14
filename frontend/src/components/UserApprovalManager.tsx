import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  AlertCircle,
  Calendar,
  Layers,
  GraduationCap,
  Wallet,
} from 'lucide-react';
import { userApi } from '../api/userApi';
import { UserRegistrationItem, COMMITTEES } from '../types';
import { useDialog } from '../context/DialogContext';

export const UserApprovalManager: React.FC = () => {
  const { confirm, alert } = useDialog();
  const [registrations, setRegistrations] = useState<UserRegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [committeeFilter, setCommitteeFilter] = useState<string>('ALL');

  // Rejection modal state
  const [rejectingUser, setRejectingUser] = useState<UserRegistrationItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Success notification
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchRegistrations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.getRegistrations(activeFilter);
      setRegistrations(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch user registrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [activeFilter]);

  const handleApprove = async (user: UserRegistrationItem) => {
    const isConfirmed = await confirm({
      title: 'Approve User Registration',
      message: `Are you sure you want to approve registration for @${user.username} (${user.fullName || user.email}) as ${user.roles[0] || 'MEMBER'}? They will be granted full system access.`,
      confirmText: 'Approve User',
      cancelText: 'Cancel',
      variant: 'success',
      customIcon: <UserCheck size={22} />,
    });

    if (!isConfirmed) {
      return;
    }

    setActionLoading(true);
    try {
      await userApi.approveRegistration(user.id);
      setSuccessToast(`Registration for @${user.username} has been approved!`);
      setTimeout(() => setSuccessToast(null), 4000);
      fetchRegistrations();
    } catch (err: any) {
      await alert({
        title: 'Approval Failed',
        message: err?.message || 'Failed to approve registration',
        variant: 'danger',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingUser) return;

    setActionLoading(true);
    try {
      await userApi.rejectRegistration(rejectingUser.id, rejectionReason);
      setSuccessToast(`Registration for @${rejectingUser.username} has been rejected.`);
      setTimeout(() => setSuccessToast(null), 4000);
      setRejectingUser(null);
      setRejectionReason('');
      fetchRegistrations();
    } catch (err: any) {
      await alert({
        title: 'Rejection Failed',
        message: err?.message || 'Failed to reject registration',
        variant: 'danger',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRegistrations = registrations.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      (u.committee && u.committee.toLowerCase().includes(q)) ||
      (u.batch && u.batch.toLowerCase().includes(q));

    const matchesCommittee = committeeFilter === 'ALL' || u.committee === committeeFilter;

    return matchesQuery && matchesCommittee;
  });

  const pendingCount = registrations.filter((u) => u.approvalStatus === 'PENDING').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header Card */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-md)',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                }}
              >
                <UserCheck size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  User Registration Approvals
                </h1>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                  Review, approve, or reject self-registered club members and accountants
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={fetchRegistrations}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                padding: '0.5rem 0.85rem',
              }}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {successToast && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.65rem 1rem',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 'var(--radius-md)',
              color: '#166534',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <CheckCircle2 size={18} />
            <span>{successToast}</span>
          </div>
        )}

        {/* Filter Tabs & Search Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.85rem',
          }}
        >
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((st) => {
              const isSelected = activeFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setActiveFilter(st)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: isSelected ? '#ffffff' : 'transparent',
                    color: isSelected ? '#166534' : 'var(--text-secondary)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.78rem',
                    boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 120ms ease',
                  }}
                >
                  {st === 'PENDING' && <Clock size={13} style={{ color: '#d97706' }} />}
                  {st === 'APPROVED' && <CheckCircle2 size={13} style={{ color: '#16a34a' }} />}
                  {st === 'REJECTED' && <XCircle size={13} style={{ color: '#dc2626' }} />}
                  <span>{st.charAt(0) + st.slice(1).toLowerCase()}</span>
                  {st === 'PENDING' && pendingCount > 0 && activeFilter !== 'PENDING' && (
                    <span
                      style={{
                        backgroundColor: '#d97706',
                        color: '#ffffff',
                        fontSize: '0.65rem',
                        padding: '0.05rem 0.35rem',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 800,
                      }}
                    >
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Field */}
          <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 200px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search by username, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{
                height: '2.2rem',
                fontSize: '0.8rem',
                paddingLeft: '2.2rem',
                width: '100%',
              }}
            />
          </div>

          {/* Committee Filter Dropdown */}
          <div style={{ minWidth: '180px' }}>
            <select
              value={committeeFilter}
              onChange={(e) => setCommitteeFilter(e.target.value)}
              className="form-input"
              style={{
                height: '2.2rem',
                fontSize: '0.8rem',
                width: '100%',
              }}
              title="Filter by Committee"
            >
              <option value="ALL">All Committees</option>
              {COMMITTEES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Registrations Content */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.75rem', color: '#16a34a' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading registration requests...</div>
          </div>
        ) : error ? (
          <div
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              backgroundColor: '#fef2f2',
              borderRadius: 'var(--radius-md)',
              color: '#991b1b',
            }}
          >
            <AlertCircle size={24} style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontWeight: 700 }}>{error}</div>
            <button
              type="button"
              className="btn btn-outline"
              onClick={fetchRegistrations}
              style={{ marginTop: '0.75rem', fontSize: '0.78rem' }}
            >
              Try Again
            </button>
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                color: '#64748b',
              }}
            >
              <CheckCircle2 size={28} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              No {activeFilter.toLowerCase()} registrations
            </h3>
            <p style={{ fontSize: '0.82rem', margin: '0.35rem 0 0 0' }}>
              {activeFilter === 'PENDING'
                ? 'All registration requests have been reviewed and resolved!'
                : 'No registration entries match your filter criteria.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filteredRegistrations.map((u) => {
              const isPending = u.approvalStatus === 'PENDING';
              const isApproved = u.approvalStatus === 'APPROVED';
              const isRejected = u.approvalStatus === 'REJECTED';

              return (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: isPending
                      ? '1.5px solid #fde68a'
                      : '1px solid var(--border-subtle)',
                    backgroundColor: isPending ? '#fffbeb' : '#fafafa',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    transition: 'all 120ms ease',
                  }}
                >
                  {/* Left: User Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flex: '1 1 320px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: u.roles && u.roles.includes('ACCOUNTANT') ? '#e0f2fe' : '#dcfce7',
                        color: u.roles && u.roles.includes('ACCOUNTANT') ? '#0369a1' : '#166534',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontWeight: 800,
                        flexShrink: 0,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      }}
                    >
                      {u.fullName ? u.fullName.charAt(0).toUpperCase() : u.username ? u.username.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          @{u.username}
                        </span>
                        {u.fullName && (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            ({u.fullName})
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.1rem 0.45rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                            backgroundColor:
                              u.roles && u.roles.includes('ACCOUNTANT') ? '#e0f2fe' : '#dcfce7',
                            color:
                              u.roles && u.roles.includes('ACCOUNTANT') ? '#0369a1' : '#166534',
                          }}
                        >
                          {u.roles[0] || 'MEMBER'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {u.email}
                      </div>

                      {/* Batch & Committee Chips */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                        {u.batch && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#475569',
                              fontWeight: 600,
                            }}
                          >
                            <GraduationCap size={12} /> Batch: {u.batch}
                          </span>
                        )}

                        {u.committee && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#475569',
                              fontWeight: 600,
                            }}
                          >
                            <Layers size={12} /> {u.committee}
                          </span>
                        )}

                        {u.upiId && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              color: '#166534',
                              fontWeight: 600,
                            }}
                          >
                            <Wallet size={12} /> UPI: {u.upiId}
                          </span>
                        )}

                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.68rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <Calendar size={11} /> {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {u.rejectionReason && isRejected && (
                        <div
                          style={{
                            marginTop: '0.4rem',
                            fontSize: '0.72rem',
                            color: '#b91c1c',
                            backgroundColor: '#fee2e2',
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <strong>Reason:</strong> {u.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(u)}
                          disabled={actionLoading}
                          className="btn"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            backgroundColor: '#107c41',
                            color: '#ffffff',
                            padding: '0.45rem 0.85rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(16, 124, 65, 0.25)',
                          }}
                        >
                          <UserCheck size={15} /> Approve
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRejectingUser(u);
                            setRejectionReason('');
                          }}
                          disabled={actionLoading}
                          className="btn btn-outline"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            borderColor: '#fca5a5',
                            color: '#b91c1c',
                            padding: '0.45rem 0.75rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            borderRadius: 'var(--radius-md)',
                          }}
                        >
                          <UserX size={15} /> Reject
                        </button>
                      </>
                    ) : isApproved ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                          padding: '0.35rem 0.75rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        <CheckCircle2 size={14} /> Approved
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                          padding: '0.35rem 0.75rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        <XCircle size={14} /> Rejected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Confirmation Modal */}
      {rejectingUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <UserX size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Reject Registration
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Rejecting @{rejectingUser.username} ({rejectingUser.email})
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
              Are you sure you want to reject this registration? Provide a reason so the applicant knows why:
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Rejection Reason
              </label>
              <textarea
                className="form-input"
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Invalid committee selection, unrecognized batch, or duplicate request..."
                style={{ fontSize: '0.82rem', padding: '0.5rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setRejectingUser(null)}
                disabled={actionLoading}
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmReject}
                disabled={actionLoading}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '0.45rem 1rem',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default UserApprovalManager;
