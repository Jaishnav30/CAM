import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  RotateCcw,
  Save,
  Search,
  AlertCircle,
  CheckCircle2,
  Lock,
  Receipt,
  FileCheck2,
  FileText,
  Tag,
  CreditCard,
  FileSpreadsheet,
  BarChart3,
  History,
  Users,
  Layers,
  Sparkles,
  Info,
  CheckCheck,
} from 'lucide-react';
import { rbacApi } from '../api/rbacApi';
import { RbacMatrixResponse, PermissionItem } from '../types';

interface RbacMatrixManagerProps {
  onPermissionsUpdated?: () => void;
}

interface ModuleMeta {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  description: string;
  color: string;
  bgLight: string;
  borderColor: string;
}

const MODULE_DEFINITIONS: Record<string, ModuleMeta> = {
  TRANSACTION: {
    label: 'Financial Ledger & Transactions',
    icon: Receipt,
    description: 'Permissions governing transaction recording, ledger view access, modifications, and soft-archiving.',
    color: '#3b82f6',
    bgLight: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  REIMBURSEMENT: {
    label: 'Reimbursement Claims Workflow',
    icon: FileCheck2,
    description: 'Claim submission, manager reviews, financial approvals, rejection reasons, and payout reconciliation.',
    color: '#10b981',
    bgLight: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  DOCUMENT: {
    label: 'Supporting Documents & Receipts',
    icon: FileText,
    description: 'Bill uploads, receipt previews, file downloads, and attachment soft-deletion.',
    color: '#8b5cf6',
    bgLight: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  CATEGORY: {
    label: 'Category Master Data',
    icon: Tag,
    description: 'Creation, updates, deactivation, and bulk deletion of income/expense categories.',
    color: '#f59e0b',
    bgLight: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  PAYMENT_MODE: {
    label: 'Payment Modes Master',
    icon: CreditCard,
    description: 'Banking channels, digital wallets, UPI, and physical cash payment configurations.',
    color: '#ec4899',
    bgLight: 'rgba(236, 72, 153, 0.12)',
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  REPORT: {
    label: 'Financial Reports & Exports',
    icon: FileSpreadsheet,
    description: 'Exporting tabular transaction records and reimbursement audits to Excel and CSV.',
    color: '#14b8a6',
    bgLight: 'rgba(20, 184, 166, 0.12)',
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  ANALYTICS: {
    label: 'Financial Analytics & Executive KPIs',
    icon: BarChart3,
    description: 'Aggregated income/expense cash flows, category volume distributions, and chronological trends.',
    color: '#06b6d4',
    bgLight: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  AUDIT: {
    label: 'System Audit Trail',
    icon: History,
    description: 'Tamper-evident logs of administrative activities, logins, and entity changes.',
    color: '#f43f5e',
    bgLight: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  USER: {
    label: 'User Administration',
    icon: Users,
    description: 'User provisioning, profile management, and account activation/deactivation.',
    color: '#64748b',
    bgLight: 'rgba(100, 116, 139, 0.12)',
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
};

const ROLE_DISPLAY_CONFIG: Record<string, { label: string; badgeClass: string; color: string; bg: string }> = {
  ACCOUNTANT: {
    label: 'Accountant',
    badgeClass: 'badge-info',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
  },
  MEMBER: {
    label: 'Member',
    badgeClass: 'badge-success',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
  },
};

export const RbacMatrixManager: React.FC<RbacMatrixManagerProps> = ({ onPermissionsUpdated }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Core matrix metadata
  const [matrixData, setMatrixData] = useState<RbacMatrixResponse | null>(null);

  // Permissions state: Role -> Set of permission codes
  const [savedPermissions, setSavedPermissions] = useState<Record<string, Set<string>>>({});
  const [draftPermissions, setDraftPermissions] = useState<Record<string, Set<string>>>({});

  // UI Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('ALL');

  // Load RBAC matrix
  const fetchMatrix = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rbacApi.getRbacMatrix();
      setMatrixData(data);

      const parsed: Record<string, Set<string>> = {};
      data.roles.forEach((role) => {
        const perms = data.rolePermissions[role] || [];
        parsed[role] = new Set(perms);
      });

      setSavedPermissions(parsed);
      // Deep copy to draft
      const draftCopy: Record<string, Set<string>> = {};
      Object.entries(parsed).forEach(([role, set]) => {
        draftCopy[role] = new Set(set);
      });
      setDraftPermissions(draftCopy);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch RBAC permissions matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  // Roles to display (strictly configurable roles)
  const roles = useMemo(() => {
    return matrixData?.roles || ['ACCOUNTANT', 'MEMBER'];
  }, [matrixData]);

  // Toggle single cell permission in draft
  const handleToggleCell = (role: string, permCode: string) => {
    setDraftPermissions((prev) => {
      const currentRolePerms = new Set(prev[role] || []);
      if (currentRolePerms.has(permCode)) {
        currentRolePerms.delete(permCode);
      } else {
        currentRolePerms.add(permCode);
      }
      return {
        ...prev,
        [role]: currentRolePerms,
      };
    });
    setSuccessMessage(null);
  };

  // Bulk toggle for an entire section for a given role
  const handleToggleSectionForRole = (role: string, sectionCodes: string[], grantAll: boolean) => {
    setDraftPermissions((prev) => {
      const nextRolePerms = new Set(prev[role] || []);
      sectionCodes.forEach((code) => {
        if (grantAll) {
          nextRolePerms.add(code);
        } else {
          nextRolePerms.delete(code);
        }
      });
      return {
        ...prev,
        [role]: nextRolePerms,
      };
    });
    setSuccessMessage(null);
  };

  // Discard local draft edits
  const handleDiscard = () => {
    const draftCopy: Record<string, Set<string>> = {};
    Object.entries(savedPermissions).forEach(([role, set]) => {
      draftCopy[role] = new Set(set);
    });
    setDraftPermissions(draftCopy);
    setSuccessMessage(null);
    setError(null);
  };

  // Save changes to backend
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const rolePermissionsPayload: Record<string, string[]> = {};
      roles.forEach((role) => {
        const set = draftPermissions[role] || new Set();
        rolePermissionsPayload[role] = Array.from(set);
      });

      const updated = await rbacApi.updateRbacMatrix({
        rolePermissions: rolePermissionsPayload,
      });

      // Update state with response
      setMatrixData(updated);
      const parsed: Record<string, Set<string>> = {};
      updated.roles.forEach((role) => {
        const perms = updated.rolePermissions[role] || [];
        parsed[role] = new Set(perms);
      });
      setSavedPermissions(parsed);

      const draftCopy: Record<string, Set<string>> = {};
      Object.entries(parsed).forEach(([role, set]) => {
        draftCopy[role] = new Set(set);
      });
      setDraftPermissions(draftCopy);

      setSuccessMessage('RBAC matrix saved successfully. Updated permissions are immediately active and logged to Audit Trail.');
      if (onPermissionsUpdated) {
        onPermissionsUpdated();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save RBAC permissions');
    } finally {
      setSaving(false);
    }
  };

  // Compute pending change stats
  const changeStats = useMemo(() => {
    let totalChanges = 0;
    const detailsByRole: Record<string, { added: number; removed: number }> = {};

    roles.forEach((role) => {
      const saved = savedPermissions[role] || new Set();
      const draft = draftPermissions[role] || new Set();

      let added = 0;
      let removed = 0;

      draft.forEach((code) => {
        if (!saved.has(code)) added++;
      });
      saved.forEach((code) => {
        if (!draft.has(code)) removed++;
      });

      const roleChanges = added + removed;
      totalChanges += roleChanges;
      detailsByRole[role] = { added, removed };
    });

    return { totalChanges, detailsByRole };
  }, [roles, savedPermissions, draftPermissions]);

  const hasUnsavedChanges = changeStats.totalChanges > 0;

  // Filtered permissions grouped by module
  const groupedPermissions = useMemo(() => {
    if (!matrixData) return {};

    const q = searchQuery.toLowerCase().trim();
    const result: Record<string, PermissionItem[]> = {};

    matrixData.permissions.forEach((perm) => {
      // Filter by module tab
      if (selectedModuleFilter !== 'ALL' && perm.module !== selectedModuleFilter) {
        return;
      }

      // Filter by search query
      if (
        q &&
        !perm.code.toLowerCase().includes(q) &&
        !perm.description.toLowerCase().includes(q) &&
        !perm.module.toLowerCase().includes(q)
      ) {
        return;
      }

      if (!result[perm.module]) {
        result[perm.module] = [];
      }
      result[perm.module].push(perm);
    });

    return result;
  }, [matrixData, searchQuery, selectedModuleFilter]);

  const activeModules = useMemo(() => {
    if (!matrixData) return [];
    const available = matrixData.modules || Object.keys(groupedPermissions);
    return available.filter((m) => groupedPermissions[m] && groupedPermissions[m].length > 0);
  }, [matrixData, groupedPermissions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      {/* Sticky Floating Save Header (Appears when there are changes) */}
      {hasUnsavedChanges && (
        <div
          style={{
            position: 'sticky',
            top: '0.75rem',
            zIndex: 100,
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.85rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '2rem',
                height: '2rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--color-pending)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                You have {changeStats.totalChanges} unsaved permission change{changeStats.totalChanges > 1 ? 's' : ''} across roles.
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                Changes are currently in local draft mode. Click 'Save Changes' to commit them to the database.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handleDiscard}
              disabled={saving}
              className="btn btn-outline"
              style={{ fontSize: 'var(--font-size-xs)', padding: '0.45rem 1rem' }}
            >
              <RotateCcw size={14} />
              Discard Draft
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
              style={{ fontSize: 'var(--font-size-xs)', padding: '0.45rem 1.4rem' }}
            >
              {saving ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      border: '2px solid white',
                      borderTopColor: 'transparent',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  Saving Matrix...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Changes ({changeStats.totalChanges})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Header & Overview Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
            <div
              style={{
                width: '3.25rem',
                height: '3.25rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={30} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, margin: 0 }}>
                  Role-Based Access Control (RBAC) Permissions Matrix
                </h1>
                <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                  System Admin Only
                </span>
                {hasUnsavedChanges ? (
                  <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                    {changeStats.totalChanges} Pending Edit{changeStats.totalChanges > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                    Synced With Database
                  </span>
                )}
              </div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '800px' }}>
                Configure and customize granular permissions for <strong>Accountant</strong> and <strong>Member</strong> roles. Click any cell to toggle between <strong>Allowed (✓)</strong> and <strong>Denied (✗)</strong>. Changes are kept in draft mode until saved.
              </p>
            </div>
          </div>

          {/* Action Buttons (Top) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handleDiscard}
              disabled={!hasUnsavedChanges || saving}
              className="btn btn-outline"
              style={{
                padding: '0.5rem 1.1rem',
                fontSize: 'var(--font-size-sm)',
                opacity: hasUnsavedChanges && !saving ? 1 : 0.45,
                cursor: hasUnsavedChanges && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              <RotateCcw size={15} />
              Discard Draft
            </button>

            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saving}
              className="btn btn-primary"
              style={{
                padding: '0.5rem 1.4rem',
                fontSize: 'var(--font-size-sm)',
                opacity: hasUnsavedChanges && !saving ? 1 : 0.45,
                cursor: hasUnsavedChanges && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '13px',
                      height: '13px',
                      borderRadius: '50%',
                      border: '2px solid white',
                      borderTopColor: 'transparent',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={15} />
                  Save Changes {hasUnsavedChanges ? `(${changeStats.totalChanges})` : ''}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Legend & Stats Banner */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1.25rem',
            backgroundColor: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', fontSize: 'var(--font-size-xs)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Cell Legend:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-income)' }}>
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={12} strokeWidth={3} />
              </div>
              <span style={{ fontWeight: 600 }}>Allowed (Granted)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-expense)' }}>
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={12} strokeWidth={3} />
              </div>
              <span style={{ fontWeight: 600 }}>Denied (Revoked)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-pending)' }}>
              <div
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-pending)',
                }}
              />
              <span>Amber dot indicates modified cell in draft</span>
            </div>
          </div>

          {/* Admin Note */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            <Lock size={13} />
            <span>Admin holds all 26 permissions permanently (immutable).</span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '420px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search permissions by keyword or code..."
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', fontSize: 'var(--font-size-sm)', height: '2.4rem' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Module Filter Pills */}
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem', maxWidth: '100%' }}>
            <button
              onClick={() => setSelectedModuleFilter('ALL')}
              className={`nav-tab ${selectedModuleFilter === 'ALL' ? 'active' : ''}`}
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: 'var(--font-size-xs)',
                borderRadius: 'var(--radius-full)',
                border: '1px solid ' + (selectedModuleFilter === 'ALL' ? 'var(--accent-primary)' : 'var(--border-subtle)'),
                backgroundColor: selectedModuleFilter === 'ALL' ? 'var(--accent-primary-subtle)' : 'transparent',
                whiteSpace: 'nowrap',
              }}
            >
              All Grids ({matrixData?.permissions.length || 0})
            </button>
            {matrixData?.modules.map((mod) => {
              const count = matrixData.permissions.filter((p) => p.module === mod).length;
              const def = MODULE_DEFINITIONS[mod] || { label: mod };
              return (
                <button
                  key={mod}
                  onClick={() => setSelectedModuleFilter(mod)}
                  className={`nav-tab ${selectedModuleFilter === mod ? 'active' : ''}`}
                  style={{
                    padding: '0.35rem 0.85rem',
                    fontSize: 'var(--font-size-xs)',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid ' + (selectedModuleFilter === mod ? 'var(--accent-primary)' : 'var(--border-subtle)'),
                    backgroundColor: selectedModuleFilter === mod ? 'var(--accent-primary-subtle)' : 'transparent',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {def.label.split(' ')[0]} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback Banners */}
        {error && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--color-expense)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--color-income)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Main Grids Section */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '6rem 2rem', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Loading RBAC permissions matrix...</div>
          <p style={{ fontSize: 'var(--font-size-sm)', marginTop: '0.5rem' }}>
            Fetching role permissions and active security policies from the server.
          </p>
        </div>
      ) : activeModules.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-secondary)' }}>
          <Info size={36} style={{ margin: '0 auto 1rem auto', color: 'var(--text-muted)' }} />
          <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>No permissions match your filter criteria.</div>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedModuleFilter('ALL');
            }}
            className="btn btn-outline"
            style={{ marginTop: '1rem', fontSize: 'var(--font-size-sm)' }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {activeModules.map((moduleKey, idx) => {
            const perms = groupedPermissions[moduleKey] || [];
            const def = MODULE_DEFINITIONS[moduleKey] || {
              label: moduleKey,
              icon: Layers,
              description: `Permissions for ${moduleKey}`,
              color: '#64748b',
              bgLight: 'rgba(100, 116, 139, 0.1)',
              borderColor: 'rgba(100, 116, 139, 0.3)',
            };
            const ModuleIcon = def.icon;
            const sectionPermCodes = perms.map((p) => p.code);

            return (
              <div
                key={moduleKey}
                className="card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                {/* Grid Header Card */}
                <div
                  style={{
                    padding: '1.25rem 1.75rem',
                    borderBottom: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        width: '2.75rem',
                        height: '2.75rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: def.bgLight,
                        color: def.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${def.borderColor}`,
                        flexShrink: 0,
                      }}
                    >
                      <ModuleIcon size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: 'var(--text-primary)' }}>
                          {idx + 1}. {def.label}
                        </span>
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.15rem 0.5rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {perms.length} permission{perms.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '0.2rem', margin: 0 }}>
                        {def.description}
                      </p>
                    </div>
                  </div>

                  {/* Quick Section Bulk Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quick Role Toggles:</span>
                    {roles.map((role) => {
                      const roleSet = draftPermissions[role] || new Set();
                      const allGranted = sectionPermCodes.every((c) => roleSet.has(c));
                      const roleCfg = ROLE_DISPLAY_CONFIG[role] || { label: role };

                      return (
                        <button
                          key={role}
                          onClick={() => handleToggleSectionForRole(role, sectionPermCodes, !allGranted)}
                          className="btn btn-outline"
                          style={{
                            padding: '0.25rem 0.65rem',
                            fontSize: '0.72rem',
                            borderRadius: 'var(--radius-md)',
                            borderColor: allGranted ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)',
                            backgroundColor: allGranted ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                            color: allGranted ? 'var(--color-income)' : 'var(--text-secondary)',
                          }}
                          title={`Toggle all ${def.label} permissions for ${roleCfg.label}`}
                        >
                          {roleCfg.label}: {allGranted ? 'Revoke All' : 'Grant All'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Grid Table */}
                <div className="table-responsive">
                  <table className="data-table" style={{ margin: 0, width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '44%', padding: '1rem 1.5rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span>Permission Details</span>
                            <span style={{ fontSize: '0.7rem', textTransform: 'none', color: 'var(--text-muted)', fontWeight: 400 }}>
                              Identifier code & policy purpose
                            </span>
                          </div>
                        </th>
                        {roles.map((role) => {
                          const cfg = ROLE_DISPLAY_CONFIG[role] || {
                            label: role,
                            badgeClass: 'badge-info',
                            color: 'var(--text-primary)',
                          };
                          return (
                            <th
                              key={role}
                              style={{
                                width: '28%',
                                textAlign: 'center',
                                padding: '1rem 1rem',
                              }}
                            >
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                <span className={`badge ${cfg.badgeClass}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                                  {cfg.label}
                                </span>
                                <span style={{ fontSize: '0.65rem', textTransform: 'none', color: 'var(--text-muted)', fontWeight: 400 }}>
                                  Click cell to toggle
                                </span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {perms.map((perm) => (
                        <tr key={perm.code}>
                          {/* Permission Code & Description */}
                          <td style={{ padding: '1rem 1.5rem', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    color: 'var(--text-primary)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-subtle)',
                                    letterSpacing: '0.02em',
                                  }}
                                >
                                  {perm.code}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                {perm.description}
                              </span>
                            </div>
                          </td>

                          {/* Interactive Cells for Each Role */}
                          {roles.map((role) => {
                            const isAllowed = draftPermissions[role]?.has(perm.code) ?? false;
                            const wasSaved = savedPermissions[role]?.has(perm.code) ?? false;
                            const isModified = isAllowed !== wasSaved;

                            return (
                              <td
                                key={role}
                                style={{
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                  padding: '0.9rem 1rem',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleToggleCell(role, perm.code)}
                                  title={`Click to ${isAllowed ? 'deny' : 'allow'} permission '${perm.code}' for ${role}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    padding: '0.55rem 1.25rem',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    transition: 'all var(--transition-fast)',
                                    minWidth: '125px',
                                    fontWeight: 600,
                                    fontSize: '0.82rem',
                                    position: 'relative',
                                    border: isAllowed
                                      ? '1px solid rgba(16, 185, 129, 0.45)'
                                      : '1px solid rgba(239, 68, 68, 0.35)',
                                    backgroundColor: isAllowed
                                      ? 'rgba(16, 185, 129, 0.16)'
                                      : 'rgba(239, 68, 68, 0.10)',
                                    color: isAllowed ? 'var(--color-income)' : 'var(--color-expense)',
                                    boxShadow: 'var(--shadow-sm)',
                                  }}
                                >
                                  {/* Modification Indicator Dot */}
                                  {isModified && (
                                    <span
                                      title="Modified in local draft"
                                      style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--color-pending)',
                                        border: '2px solid var(--bg-surface-elevated)',
                                        boxShadow: '0 0 4px rgba(245, 158, 11, 0.8)',
                                      }}
                                    />
                                  )}

                                  {isAllowed ? (
                                    <>
                                      <Check size={16} strokeWidth={2.8} />
                                      <span>Allowed</span>
                                    </>
                                  ) : (
                                    <>
                                      <X size={16} strokeWidth={2.8} />
                                      <span>Denied</span>
                                    </>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Save & Actions Footer Card */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {hasUnsavedChanges ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--color-pending)' }}>
              <AlertCircle size={20} />
              <div>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>
                  {changeStats.totalChanges} unsaved change{changeStats.totalChanges > 1 ? 's' : ''} ready to commit.
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                  Once saved, updated permissions are applied in real time to the server and logged to the audit trail.
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-muted)' }}>
              <CheckCheck size={20} style={{ color: 'var(--color-income)' }} />
              <div>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  All RBAC permissions are in sync with database policies.
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)' }}>
                  Click any cell to edit permissions for Accountant or Member.
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={handleDiscard}
            disabled={!hasUnsavedChanges || saving}
            className="btn btn-outline"
            style={{
              padding: '0.55rem 1.25rem',
              fontSize: 'var(--font-size-sm)',
              opacity: hasUnsavedChanges && !saving ? 1 : 0.45,
              cursor: hasUnsavedChanges && !saving ? 'pointer' : 'not-allowed',
            }}
          >
            <RotateCcw size={15} />
            Discard Draft
          </button>

          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saving}
            className="btn btn-primary"
            style={{
              padding: '0.55rem 1.75rem',
              fontSize: 'var(--font-size-sm)',
              opacity: hasUnsavedChanges && !saving ? 1 : 0.45,
              cursor: hasUnsavedChanges && !saving ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? (
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
                Saving Policies...
              </>
            ) : (
              <>
                <Save size={15} />
                Save Changes ({changeStats.totalChanges})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
