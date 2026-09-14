import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  CreditCard,
  GraduationCap,
  Layers,
  Mail,
  Shield,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  Unlock,
  Trash2,
} from 'lucide-react';
import { userApi } from '../api/userApi';
import { UserRegistrationItem, AuthUser, COMMITTEES } from '../types';
import { UserProfileModal } from './UserProfileModal';
import { useDialog } from '../context/DialogContext';

interface UserDirectoryProps {
  currentUser: AuthUser;
}

export const UserDirectory: React.FC<UserDirectoryProps> = ({ currentUser }) => {
  const { confirm, alert } = useDialog();
  const [users, setUsers] = useState<UserRegistrationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [committeeFilter, setCommitteeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Copy UPI feedback state
  const [copiedUpiId, setCopiedUpiId] = useState<string | null>(null);

  // Profile modal inspection
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.getAllUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch users directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCopyUpi = (upiId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(upiId);
    setCopiedUpiId(upiId);
    setTimeout(() => {
      setCopiedUpiId(null);
    }, 2000);
  };

  const handleBlockUser = async (u: UserRegistrationItem) => {
    const isConfirmed = await confirm({
      title: `Block User @${u.username}?`,
      message: `Are you sure you want to block ${u.fullName || u.username}? They will immediately be prohibited from logging into CAMS.`,
      confirmText: 'Block User',
      variant: 'warning',
    });

    if (!isConfirmed) return;

    setActionLoadingId(u.id);
    try {
      await userApi.blockUser(u.id);
      await fetchUsers();
    } catch (err: any) {
      await alert({
        title: 'Block Failed',
        message: err?.message || 'Failed to block user',
        variant: 'danger',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnblockUser = async (u: UserRegistrationItem) => {
    const isConfirmed = await confirm({
      title: `Unblock User @${u.username}?`,
      message: `Unblock ${u.fullName || u.username}? They will regain access and be allowed to log into CAMS.`,
      confirmText: 'Unblock User',
      variant: 'success',
    });

    if (!isConfirmed) return;

    setActionLoadingId(u.id);
    try {
      await userApi.unblockUser(u.id);
      await fetchUsers();
    } catch (err: any) {
      await alert({
        title: 'Unblock Failed',
        message: err?.message || 'Failed to unblock user',
        variant: 'danger',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (u: UserRegistrationItem) => {
    const isConfirmed = await confirm({
      title: `Permanently Delete @${u.username}?`,
      message: `Are you sure you want to permanently delete user @${u.username} (${u.fullName || u.email})?\n\nThe user will be permanently deleted and unable to access the system. All historical financial records, ledger transactions, bills, and reimbursements created by this user will remain intact.`,
      confirmText: 'Permanently Delete',
      variant: 'danger',
    });

    if (!isConfirmed) return;

    setActionLoadingId(u.id);
    try {
      await userApi.deleteUser(u.id);
      await fetchUsers();
    } catch (err: any) {
      await alert({
        title: 'Delete Failed',
        message: err?.message || 'Failed to delete user',
        variant: 'danger',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const isDeleted = Boolean(u.deleted);
    const isBlocked = !u.active && !isDeleted;

    const matchesQuery =
      !q ||
      u.username.toLowerCase().includes(q) ||
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q) ||
      (u.upiId && u.upiId.toLowerCase().includes(q)) ||
      (u.committee && u.committee.toLowerCase().includes(q)) ||
      (u.batch && u.batch.toLowerCase().includes(q));

    const matchesRole =
      roleFilter === 'ALL' ||
      (u.roles && u.roles.some((r) => r.toUpperCase() === roleFilter.toUpperCase()));

    const matchesCommittee =
      committeeFilter === 'ALL' || u.committee === committeeFilter;

    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') {
      matchesStatus = u.active && !isDeleted && u.approvalStatus === 'APPROVED';
    } else if (statusFilter === 'BLOCKED') {
      matchesStatus = isBlocked;
    } else if (statusFilter === 'DELETED') {
      matchesStatus = isDeleted;
    } else if (statusFilter === 'PENDING') {
      matchesStatus = u.approvalStatus === 'PENDING' && !isDeleted;
    } else if (statusFilter === 'REJECTED') {
      matchesStatus = u.approvalStatus === 'REJECTED' && !isDeleted;
    }

    return matchesQuery && matchesRole && matchesCommittee && matchesStatus;
  });

  // KPI Metrics
  const totalCount = users.length;
  const approvedActiveCount = users.filter((u) => u.active && !u.deleted && u.approvalStatus === 'APPROVED').length;
  const blockedCount = users.filter((u) => !u.active && !u.deleted).length;
  const deletedCount = users.filter((u) => u.deleted).length;
  const pendingCount = users.filter((u) => u.approvalStatus === 'PENDING' && !u.deleted).length;
  const withUpiCount = users.filter((u) => u.upiId && u.upiId.trim().length > 0).length;

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
                  borderRadius: 'var(--radius-md)',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#107c41',
                  border: '1px solid #bbf7d0',
                }}
              >
                <Users size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  View all Users
                </h1>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Comprehensive directory of registered members, accountants, committees, and reimbursement UPI IDs
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.82rem',
                padding: '0.5rem 0.9rem',
              }}
              title="Refresh users directory"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Overview */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.85rem',
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Users
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
              {totalCount}
            </div>
          </div>

          <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              Approved Active
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#166534', marginTop: '0.2rem' }}>
              {approvedActiveCount}
            </div>
          </div>

          <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f1f5f9', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              Blocked
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#475569', marginTop: '0.2rem' }}>
              {blockedCount}
            </div>
          </div>

          <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', borderRadius: 'var(--radius-md)', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>
              Deleted
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#b91c1c', marginTop: '0.2rem' }}>
              {deletedCount}
            </div>
          </div>

          <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fffbeb', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
              Pending
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#b45309', marginTop: '0.2rem' }}>
              {pendingCount}
            </div>
          </div>

          <div style={{ padding: '0.75rem 1rem', backgroundColor: '#eff6ff', borderRadius: 'var(--radius-md)', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>
              UPI Registered
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1d4ed8', marginTop: '0.2rem' }}>
              {withUpiCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
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
              placeholder="Search by name, @username, email, UPI ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{
                height: '2.25rem',
                fontSize: '0.82rem',
                paddingLeft: '2.2rem',
                width: '100%',
              }}
            />
          </div>

          {/* Role Filter */}
          <div style={{ minWidth: '140px' }}>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-input"
              style={{
                height: '2.25rem',
                fontSize: '0.82rem',
                width: '100%',
              }}
              title="Filter by Role"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="MEMBER">Member</option>
            </select>
          </div>

          {/* Committee Filter */}
          <div style={{ minWidth: '180px' }}>
            <select
              value={committeeFilter}
              onChange={(e) => setCommitteeFilter(e.target.value)}
              className="form-input"
              style={{
                height: '2.25rem',
                fontSize: '0.82rem',
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

          {/* Status Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
              style={{
                height: '2.25rem',
                fontSize: '0.82rem',
                width: '100%',
              }}
              title="Filter by Status"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active (Approved)</option>
              <option value="BLOCKED">Blocked</option>
              <option value="DELETED">Deleted</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Content Table */}
      <div
        className="card"
        style={{
          padding: '0',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.75rem', color: '#107c41' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading users directory...</div>
          </div>
        ) : error ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              margin: '1.5rem',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <AlertCircle size={26} style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontWeight: 700 }}>{error}</div>
            <button
              type="button"
              className="btn btn-outline"
              onClick={fetchUsers}
              style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}
            >
              Try Again
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            <Users size={36} style={{ margin: '0 auto 0.75rem', color: '#94a3b8' }} />
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              No Users Found
            </div>
            <p style={{ fontSize: '0.82rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>
              Try adjusting your search terms or filters above.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '0.75rem 1rem' }}>User</th>
                  <th style={{ padding: '0.75rem 1rem' }}>UPI ID (Reimbursements)</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Committee & Batch</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => {
                  const roleName = (u.roles && u.roles[0]) || 'MEMBER';
                  const isAccountant = roleName.toUpperCase() === 'ACCOUNTANT';
                  const isAdminRole = roleName.toUpperCase() === 'ADMIN';

                  const isDeleted = Boolean(u.deleted);
                  const isBlocked = !u.active && !isDeleted;

                  // Avatar styling: Red for deleted, Gray for blocked, standard for active
                  let avatarBg = isAdminRole ? '#ede9fe' : isAccountant ? '#e0f2fe' : '#dcfce7';
                  let avatarColor = isAdminRole ? '#6b21a8' : isAccountant ? '#0369a1' : '#166534';
                  let avatarBorder = isAdminRole ? '#c084fc' : isAccountant ? '#7dd3fc' : '#86efac';

                  if (isDeleted) {
                    avatarBg = '#dc2626'; // Red for deleted state
                    avatarColor = '#ffffff';
                    avatarBorder = '#ef4444';
                  } else if (isBlocked) {
                    avatarBg = '#64748b'; // Gray for blocked state
                    avatarColor = '#ffffff';
                    avatarBorder = '#94a3b8';
                  }

                  const isMe = currentUser.id === u.id;
                  const isBusy = actionLoadingId === u.id;

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: idx < filteredUsers.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition: 'background-color 100ms ease',
                        opacity: isDeleted ? 0.75 : 1,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDeleted ? '#fef2f2' : isBlocked ? '#f8fafc' : '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* User Avatar + Identity */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: avatarBg,
                              color: avatarColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.92rem',
                              fontWeight: 800,
                              flexShrink: 0,
                              border: `2px solid ${avatarBorder}`,
                              boxShadow: isDeleted ? '0 0 0 2px rgba(220, 38, 38, 0.2)' : isBlocked ? '0 0 0 2px rgba(100, 116, 139, 0.2)' : undefined,
                            }}
                            title={isDeleted ? 'User account is deleted (Red)' : isBlocked ? 'User account is blocked (Gray)' : 'Active User'}
                          >
                            {u.fullName ? u.fullName.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: isDeleted ? '#991b1b' : isBlocked ? '#475569' : 'var(--text-primary)' }}>
                              {u.fullName || `@${u.username}`}
                              {isDeleted && (
                                <span style={{ fontSize: '0.68rem', color: '#dc2626', marginLeft: '0.4rem', fontWeight: 800 }}>
                                  [DELETED]
                                </span>
                              )}
                              {isBlocked && (
                                <span style={{ fontSize: '0.68rem', color: '#64748b', marginLeft: '0.4rem', fontWeight: 800 }}>
                                  [BLOCKED]
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                              <span style={{ fontSize: '0.74rem', color: isDeleted ? '#b91c1c' : isBlocked ? '#64748b' : '#107c41', fontWeight: 600 }}>
                                @{u.username}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>•</span>
                              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                <Mail size={11} /> {u.email}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* UPI ID */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {u.upiId ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.78rem',
                                fontFamily: 'monospace',
                                backgroundColor: isDeleted ? '#fef2f2' : isBlocked ? '#f1f5f9' : '#f0fdf4',
                                padding: '0.25rem 0.6rem',
                                borderRadius: 'var(--radius-sm)',
                                border: `1px solid ${isDeleted ? '#fecaca' : isBlocked ? '#cbd5e1' : '#bbf7d0'}`,
                                color: isDeleted ? '#991b1b' : isBlocked ? '#475569' : '#166534',
                                fontWeight: 700,
                              }}
                            >
                              <CreditCard size={13} style={{ color: isDeleted ? '#dc2626' : isBlocked ? '#64748b' : '#16a34a' }} />
                              {u.upiId}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyUpi(u.upiId!, e)}
                              className="btn btn-outline"
                              style={{
                                padding: '0.25rem 0.5rem',
                                height: 'auto',
                                fontSize: '0.7rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                backgroundColor: copiedUpiId === u.upiId ? '#dcfce7' : '#ffffff',
                                borderColor: copiedUpiId === u.upiId ? '#86efac' : '#cbd5e1',
                                color: copiedUpiId === u.upiId ? '#166534' : '#475569',
                              }}
                              title="Copy UPI ID to clipboard"
                            >
                              {copiedUpiId === u.upiId ? (
                                <>
                                  <Check size={12} style={{ color: '#16a34a' }} />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            Not registered
                          </span>
                        )}
                      </td>

                      {/* Committee & Batch */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {u.committee ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                color: '#334155',
                              }}
                            >
                              <Layers size={12} style={{ color: '#107c41' }} />
                              {u.committee}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>No committee</span>
                          )}

                          {u.batch && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.68rem',
                                color: '#64748b',
                              }}
                            >
                              <GraduationCap size={11} /> Batch of {u.batch}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                            backgroundColor: isAdminRole ? '#f3e8ff' : isAccountant ? '#e0f2fe' : '#dcfce7',
                            color: isAdminRole ? '#6b21a8' : isAccountant ? '#0369a1' : '#166534',
                            border: `1px solid ${isAdminRole ? '#d8b4fe' : isAccountant ? '#bae6fd' : '#bbf7d0'}`,
                          }}
                        >
                          <Shield size={11} />
                          {roleName}
                        </span>
                      </td>

                      {/* Approval Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isDeleted ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.72rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              fontWeight: 700,
                              border: '1px solid #fecaca',
                            }}
                          >
                            <XCircle size={12} style={{ color: '#dc2626' }} />
                            Deleted
                          </span>
                        ) : isBlocked ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.72rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              fontWeight: 700,
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            <Ban size={12} style={{ color: '#64748b' }} />
                            Blocked
                          </span>
                        ) : u.approvalStatus === 'APPROVED' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.72rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: '#f0fdf4',
                              color: '#166534',
                              fontWeight: 700,
                              border: '1px solid #bbf7d0',
                            }}
                          >
                            <CheckCircle2 size={12} style={{ color: '#16a34a' }} />
                            Active
                          </span>
                        ) : u.approvalStatus === 'PENDING' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.72rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: '#fffbeb',
                              color: '#b45309',
                              fontWeight: 700,
                              border: '1px solid #fde68a',
                            }}
                          >
                            <Clock size={12} style={{ color: '#f59e0b' }} />
                            Pending
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.72rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: '#fef2f2',
                              color: '#991b1b',
                              fontWeight: 700,
                              border: '1px solid #fecaca',
                            }}
                          >
                            <XCircle size={12} style={{ color: '#dc2626' }} />
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => setInspectUserId(u.id)}
                            className="btn btn-outline"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.72rem',
                              padding: '0.3rem 0.65rem',
                              borderColor: '#86efac',
                              color: '#166534',
                              backgroundColor: '#f0fdf4',
                              fontWeight: 700,
                            }}
                            title={`View profile for @${u.username}`}
                          >
                            <ExternalLink size={12} />
                            <span>Profile</span>
                          </button>

                          {/* Block / Unblock / Delete Actions */}
                          {isDeleted ? (
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', padding: '0 0.35rem' }}>
                              Permanently Deleted
                            </span>
                          ) : isMe ? (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '0 0.35rem' }}>
                              (You)
                            </span>
                          ) : (
                            <>
                              {isBlocked ? (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleUnblockUser(u)}
                                  className="btn btn-outline"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    fontSize: '0.72rem',
                                    padding: '0.3rem 0.65rem',
                                    borderColor: '#86efac',
                                    color: '#166534',
                                    backgroundColor: '#ffffff',
                                    fontWeight: 700,
                                  }}
                                  title="Unblock this user so they can log in"
                                >
                                  <Unlock size={12} />
                                  <span>Unblock</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleBlockUser(u)}
                                  className="btn btn-outline"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    fontSize: '0.72rem',
                                    padding: '0.3rem 0.65rem',
                                    borderColor: '#cbd5e1',
                                    color: '#475569',
                                    backgroundColor: '#ffffff',
                                    fontWeight: 700,
                                  }}
                                  title="Block this user from logging in"
                                >
                                  <Ban size={12} />
                                  <span>Block</span>
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDeleteUser(u)}
                                className="btn btn-outline"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  fontSize: '0.72rem',
                                  padding: '0.3rem 0.65rem',
                                  borderColor: '#fca5a5',
                                  color: '#dc2626',
                                  backgroundColor: '#fff',
                                  fontWeight: 700,
                                }}
                                title="Permanently delete user (transactions remain intact)"
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Profile Modal when clicking View Profile */}
      {inspectUserId && (
        <UserProfileModal
          currentUser={currentUser}
          targetUserId={inspectUserId}
          onClose={() => setInspectUserId(null)}
        />
      )}
    </div>
  );
};
