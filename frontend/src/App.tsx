import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  ShieldCheck,
  Receipt,
  Tag,
  LogIn,
  LogOut,
  CreditCard,
  BarChart3,
  FileSpreadsheet,
  History,
  Shield,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import './styles/main.css';
import { authApi } from './api/authApi';
import { AuthUser } from './types';
import { TransactionLedger } from './components/TransactionLedger';
import { CategoryManager } from './components/CategoryManager';
import { ReimbursementList } from './components/ReimbursementList';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ReportsManager } from './components/ReportsManager';
import { AuditLogViewer } from './components/AuditLogViewer';
import { RbacMatrixManager } from './components/RbacMatrixManager';
import { RegisterForm } from './components/RegisterForm';
import { UserApprovalManager } from './components/UserApprovalManager';
import { UserProfileModal } from './components/UserProfileModal';
import { UserDirectory } from './components/UserDirectory';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loginEmail, setLoginEmail] = useState<string>('admin@cams.local');
  const [loginPassword, setLoginPassword] = useState<string>('Password123!');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'transactions' | 'reimbursements' | 'analytics' | 'reports' | 'audit-logs' | 'categories' | 'rbac' | 'user-approvals' | 'users'
  >('transactions');
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  // Animated height measurement for smooth transition between Sign In and Register
  const [authCardHeight, setAuthCardHeight] = useState<number | undefined>(undefined);
  const authContentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (currentUser) return;

    const updateHeight = () => {
      // In mobile view (<= 768px), let card adapt naturally
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        setAuthCardHeight(undefined);
        return;
      }
      // Fixed height on desktop: compact for Sign In, generous scrollable for Register
      if (isRegisterMode) {
        setAuthCardHeight(620);
      } else {
        setAuthCardHeight(490);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, [currentUser, isRegisterMode]);

  // Left sidebar collapsible pane state (persisted or defaults to expanded on desktop, collapsed on mobile)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await authApi.login(loginEmail.trim(), loginPassword);
      setCurrentUser(res.user);
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authApi.getMe();
        setCurrentUser(user);
      } catch (err: unknown) {
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    await authApi.logout();
    setCurrentUser(null);
    setLoginError(null);
    setShowPassword(false);
  };

  const isSystemAdmin = Boolean(currentUser?.roles?.includes('ADMIN'));

  const isAdmin =
    currentUser?.roles?.includes('ADMIN') ||
    currentUser?.permissions?.includes('categories:manage');

  const canViewAnalytics =
    currentUser?.roles?.some((r) => ['ADMIN', 'ACCOUNTANT'].includes(r)) ||
    currentUser?.permissions?.includes('analytics:read');

  const canViewReports =
    currentUser?.roles?.some((r) => ['ADMIN', 'ACCOUNTANT'].includes(r)) ||
    currentUser?.permissions?.includes('reports:read');

  const canViewAuditLogs = isSystemAdmin;

  // Navigation items definition
  const navItems = [
    {
      id: 'transactions' as const,
      label: 'Financial Ledger',
      icon: Receipt,
      visible: true,
      description: 'Transaction records & cash flow ledger',
    },
    {
      id: 'reimbursements' as const,
      label: 'Reimbursements',
      icon: CreditCard,
      visible: true,
      description: 'Expense claim reviews & payouts',
    },
    {
      id: 'analytics' as const,
      label: 'Analytics',
      icon: BarChart3,
      visible: canViewAnalytics,
      description: 'Financial summaries & KPI charts',
    },
    {
      id: 'reports' as const,
      label: 'Reports & Exports',
      icon: FileSpreadsheet,
      visible: canViewReports,
      description: 'Tabular reports and RFC-4180 CSV exports',
    },
    {
      id: 'audit-logs' as const,
      label: 'Audit Trail',
      icon: History,
      visible: canViewAuditLogs,
      description: 'Tamper-evident logs of system activities',
      adminOnly: true,
    },
    {
      id: 'categories' as const,
      label: 'Category Master',
      icon: Tag,
      visible: isAdmin,
      description: 'Income and expense chart of accounts',
      adminOnly: true,
    },
    {
      id: 'rbac' as const,
      label: 'Manage RBAC',
      icon: Shield,
      visible: isSystemAdmin,
      description: 'Role-based access permissions matrix',
      adminOnly: true,
    },
    {
      id: 'user-approvals' as const,
      label: 'User Approvals',
      icon: UserCheck,
      visible: isAdmin,
      description: 'Review and approve member & accountant registrations',
      adminOnly: true,
    },
    {
      id: 'users' as const,
      label: 'View all Users',
      icon: Users,
      visible: isAdmin,
      description: 'Directory of all users, committees, batch, and UPI IDs',
      adminOnly: true,
    },
  ].filter((item) => item.visible);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
      {/* ========================================================================= */}
      {/* LEFT SIDEBAR NAVIGATION (COLLAPSIBLE PANE)                               */}
      {/* ========================================================================= */}
      {currentUser && (
        <aside
          style={{
            width: isSidebarCollapsed ? '72px' : '260px',
            backgroundColor: '#073d1e', // MS Excel Dark Green Theme
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRight: '1px solid rgba(0, 0, 0, 0.2)',
            transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1)',
            flexShrink: 0,
            zIndex: 100,
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Top Brand Header & Collapse Toggle */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
                padding: isSidebarCollapsed ? '1.25rem 0.5rem' : '1.25rem 1.25rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
                onClick={() => setActiveTab('transactions')}
                title="CAM - Club Financial Operations"
              >
                <div
                  style={{
                    backgroundColor: '#107c41',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.45rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <ShieldCheck size={22} style={{ color: '#ffffff' }} />
                </div>
                {!isSidebarCollapsed && (
                  <div style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                        CAM
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: '#86efac',
                        fontWeight: 600,
                        maxWidth: '150px',
                        whiteSpace: 'normal',
                        overflowWrap: 'break-word',
                      }}
                    >
                      Club Accounting & Management
                    </div>
                  </div>
                )}
              </div>

              {!isSidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(true)}
                  style={{
                    padding: '0.35rem',
                    color: '#86efac',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Collapse Sidebar"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
            </div>

            {/* If collapsed, display expand button directly below */}
            {isSidebarCollapsed && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  style={{
                    padding: '0.35rem',
                    color: '#86efac',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  }}
                  title="Expand Sidebar"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Nav Menu Links */}
            <nav style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: isSidebarCollapsed ? '0.65rem 0' : '0.65rem 0.85rem',
                      justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isActive ? '#107c41' : 'transparent',
                      color: isActive ? '#ffffff' : '#cbd5e1',
                      fontWeight: isActive ? 700 : 600,
                      fontSize: '0.85rem',
                      transition: 'all 120ms ease',
                      position: 'relative',
                      textAlign: 'left',
                      boxShadow: isActive ? '0 2px 5px rgba(0,0,0,0.2)' : 'none',
                    }}
                    title={isSidebarCollapsed ? `${item.label} - ${item.description}` : undefined}
                  >
                    <Icon size={19} style={{ color: isActive ? '#86efac' : '#94a3b8', flexShrink: 0 }} />
                    {!isSidebarCollapsed && (
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {item.label}
                        </div>
                      </div>
                    )}
                    {item.adminOnly && !isSidebarCollapsed && (
                      <span
                        style={{
                          fontSize: '0.6rem',
                          padding: '0.05rem 0.35rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(255, 255, 255, 0.15)',
                          color: '#ffffff',
                          fontWeight: 700,
                        }}
                      >
                        Admin
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer: User Card & Sign Out */}
          <div
            style={{
              padding: isSidebarCollapsed ? '1rem 0.35rem' : '1rem 0.85rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
            }}
          >
            {!isSidebarCollapsed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div
                  onClick={() => setIsProfileOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    cursor: 'pointer',
                    padding: '0.4rem',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all 120ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  title="Click to view profile & financial stats"
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: '#107c41',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      flexShrink: 0,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {currentUser.fullName}
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                      {currentUser.roles.map((role) => (
                        <span
                          key={role}
                          style={{
                            fontSize: '0.6rem',
                            padding: '0.05rem 0.35rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'rgba(22, 163, 74, 0.35)',
                            color: '#86efac',
                            fontWeight: 700,
                          }}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.45rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    transition: 'all 120ms ease',
                  }}
                  title="Sign out of CAM"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  onClick={() => setIsProfileOpen(true)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: '#107c41',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                  title={`View Profile: ${currentUser.fullName} (${currentUser.roles.join(', ')})`}
                >
                  {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    color: '#fca5a5',
                    padding: '0.35rem',
                    borderRadius: 'var(--radius-sm)',
                  }}
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ========================================================================= */}
      {/* MAIN VIEWPORT CONTAINER                                                  */}
      {/* ========================================================================= */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        {/* Top Header Strip when logged in */}
        {currentUser && (
          <header
            style={{
              backgroundColor: '#ffffff',
              borderBottom: '1px solid var(--border-subtle)',
              padding: '0.75rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {navItems.find((item) => item.id === activeTab)?.label || 'Dashboard'}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Active: <strong>{currentUser.fullName}</strong> ({currentUser.roles[0]})
              </div>
            </div>
          </header>
        )}

        {/* Main Content Body */}
        <main style={{ flex: 1, padding: currentUser ? '1.5rem' : 0 }}>
          {authChecking ? (
            <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--text-secondary)' }}>
              Verifying active session...
            </div>
          ) : !currentUser ? (
            /* =============================================================== */
            /* SPLIT / RESPONSIVE AUTH SCREEN                                  */
            /* =============================================================== */
            <div className="auth-wrapper">
              <div
                className="card auth-card"
                style={{
                  height: authCardHeight ? `${authCardHeight}px` : undefined,
                }}
              >
                {/* Hero Visual Side (Desktop: left banner with image, Mobile: top header with dark green gradient only) */}
                <div className="auth-hero-banner">
                  <div className="auth-hero-overlay" />

                  <div className="auth-hero-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                      <div
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.45rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          flexShrink: 0,
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                        }}
                      >
                        <ShieldCheck size={26} />
                      </div>
                      <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.025em', margin: 0, color: '#ffffff', lineHeight: 1.1 }}>
                        CAM
                      </h1>
                    </div>
                    <p style={{ fontSize: '0.84rem', color: '#e2e8f0', lineHeight: 1.4, margin: '0.2rem 0 0 0', fontWeight: 500 }}>
                      Club Accounting & Management
                    </p>
                  </div>

                  <div className="auth-hero-footer" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    PostgreSQL 16 • Spring Boot 3.3.4 • Vite React
                  </div>
                </div>

                {/* Login / Register Form Side */}
                <div className="auth-form-side">
                  <div
                    ref={authContentRef}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                    }}
                  >
                    {/* Top Sliding Segmented Pill Toggle (Sticky Header) */}
                    <div
                      style={{
                        position: 'relative',
                        display: 'flex',
                        backgroundColor: '#f1f5f9',
                        borderRadius: 'var(--radius-full)',
                        padding: '4px',
                        marginBottom: '1rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
                        flexShrink: 0,
                      }}
                    >
                    {/* Sliding pill indicator (GPU accelerated transform) */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '4px',
                        bottom: '4px',
                        left: '4px',
                        width: 'calc(50% - 4px)',
                        backgroundColor: '#ffffff',
                        borderRadius: 'var(--radius-full)',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
                        transform: isRegisterMode ? 'translateX(100%)' : 'translateX(0%)',
                        transition: 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)',
                        zIndex: 0,
                        pointerEvents: 'none',
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(false);
                        setLoginError(null);
                      }}
                      style={{
                        flex: 1,
                        position: 'relative',
                        zIndex: 1,
                        padding: '0.55rem 0',
                        borderRadius: 'var(--radius-full)',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: !isRegisterMode ? '#107c41' : '#64748b',
                        fontWeight: !isRegisterMode ? 800 : 600,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'color 200ms ease',
                      }}
                    >
                      <LogIn size={16} />
                      Sign In
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(true);
                        setLoginError(null);
                      }}
                      style={{
                        flex: 1,
                        position: 'relative',
                        zIndex: 1,
                        padding: '0.55rem 0',
                        borderRadius: 'var(--radius-full)',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: isRegisterMode ? '#107c41' : '#64748b',
                        fontWeight: isRegisterMode ? 800 : 600,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'color 200ms ease',
                      }}
                    >
                      <UserPlus size={16} />
                      Register
                    </button>
                  </div>

                  {/* Animated Form Container */}
                  <div
                    key={isRegisterMode ? 'register' : 'login'}
                    className="auth-form-enter"
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                    }}
                  >
                    {isRegisterMode ? (
                      <RegisterForm
                        onBackToLogin={() => {
                          setIsRegisterMode(false);
                          setLoginError(null);
                        }}
                        onRegisteredSuccess={() => {
                          setIsRegisterMode(false);
                          setLoginError(null);
                        }}
                      />
                    ) : (
                      <>
                        <div style={{ marginBottom: '1.25rem' }}>
                          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                            Account Authentication
                          </h2>
                          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            Sign in with your CAM credentials to access the financial portal.
                          </p>
                        </div>

                        {loginError && (
                          <div
                            style={{
                              padding: '0.65rem 0.85rem',
                              backgroundColor: '#fee2e2',
                              border: '1px solid #fecaca',
                              borderRadius: 'var(--radius-md)',
                              color: '#b91c1c',
                              fontSize: '0.82rem',
                              marginBottom: '1rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                          >
                            <AlertCircle size={16} style={{ flexShrink: 0 }} />
                            <span>{loginError}</span>
                          </div>
                        )}

                        <form onSubmit={handleDirectLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                              Username or Email Address *
                            </label>
                            <input
                              type="text"
                              className="form-input"
                              value={loginEmail}
                              onChange={(e) => setLoginEmail(e.target.value)}
                              placeholder="e.g. username or user@cams.local"
                              required
                              autoComplete="username"
                              style={{ height: '2.6rem', fontSize: '0.875rem' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                              Password *
                            </label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{ height: '2.6rem', fontSize: '0.875rem', paddingRight: '2.75rem' }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                position: 'absolute',
                                right: '0.75rem',
                                background: 'none',
                                border: 'none',
                                color: '#64748b',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0.25rem',
                              }}
                              title={showPassword ? 'Hide Password' : 'Show Password'}
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={loginLoading}
                          style={{
                            padding: '0.75rem 1.5rem',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            gap: '0.6rem',
                            justifyContent: 'center',
                            marginTop: '0.5rem',
                          }}
                        >
                          <LogIn size={18} />
                          {loginLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                      </form>
                    </>
                  )}
                </div>
                </div>
              </div>
            </div>
            </div>
          ) : (
            <div>
              {activeTab === 'transactions' && <TransactionLedger currentUser={currentUser} />}
              {activeTab === 'reimbursements' && <ReimbursementList currentUser={currentUser} />}
              {activeTab === 'analytics' && canViewAnalytics && <AnalyticsDashboard />}
              {activeTab === 'reports' && canViewReports && <ReportsManager />}
              {activeTab === 'audit-logs' && canViewAuditLogs && <AuditLogViewer />}
              {activeTab === 'categories' && isAdmin && <CategoryManager />}
              {activeTab === 'rbac' && isSystemAdmin && (
                <RbacMatrixManager
                  onPermissionsUpdated={async () => {
                    try {
                      const me = await authApi.getMe();
                      setCurrentUser(me);
                    } catch (_) {}
                  }}
                />
              )}
              {activeTab === 'user-approvals' && isAdmin && <UserApprovalManager />}
              {activeTab === 'users' && isAdmin && <UserDirectory currentUser={currentUser} />}
            </div>
          )}
        </main>

        {/* Footer */}
        {currentUser && (
          <footer
            style={{
              borderTop: '1px solid var(--border-subtle)',
              padding: '0.85rem 1.5rem',
              backgroundColor: '#ffffff',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <div>CAM © 2026 • MS Excel Financial Edition</div>
            <div>PostgreSQL 16 • Spring Boot 3.3.4 • Vite React</div>
          </footer>
        )}
      </div>

      {/* User Profile Modal */}
      {isProfileOpen && currentUser && (
        <UserProfileModal
          currentUser={currentUser}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
