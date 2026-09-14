import React, { useState } from 'react';
import { LogIn, X, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../api/authApi';
import { AuthUser } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authApi.login(email.trim(), password);
      const fullUser = await authApi.getMe();
      onSuccess(fullUser);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
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
          maxWidth: '860px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'row',
          padding: 0,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          maxHeight: '92vh',
        }}
      >
        {/* =================================================================== */}
        {/* LEFT PANEL: ACCOUNTING & FINANCE VISUAL HERO                       */}
        {/* =================================================================== */}
        <div
          style={{
            flex: '1 1 42%',
            position: 'relative',
            background: 'url(/finance_login_hero.jpg) center center / cover no-repeat',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '2.25rem 2rem',
            color: '#ffffff',
            minHeight: '480px',
          }}
        >
          {/* Dark Green Gradient Tint Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(165deg, rgba(7, 67, 32, 0.88) 0%, rgba(15, 23, 42, 0.92) 100%)',
              backdropFilter: 'blur(1px)',
            }}
          />

          {/* Top Brand Identity */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.45rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <ShieldCheck size={26} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.025em', margin: 0, color: '#ffffff' }}>
                  CAM
                </h1>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#86efac',
                  }}
                >
                  Excel Edition • Finance
                </span>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5, marginTop: '0.75rem' }}>
              Club Financial Operations, Digital Ledgers & Expense Management
            </p>
          </div>

          {/* Footer Badge */}
          <div style={{ position: 'relative', zIndex: 1, fontSize: '0.72rem', color: '#94a3b8' }}>
            MS Excel-Inspired Financial Governance • 2026
          </div>
        </div>

        {/* =================================================================== */}
        {/* RIGHT PANEL: AUTHENTICATION FORM                                   */}
        {/* =================================================================== */}
        <div
          style={{
            flex: '1 1 58%',
            padding: '2.25rem 2.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
            position: 'relative',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              color: '#64748b',
              padding: '0.35rem',
              borderRadius: 'var(--radius-sm)',
            }}
            title="Close"
          >
            <X size={20} />
          </button>

          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
                Sign In to Account
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Enter your credentials or use the role quick-fill buttons below.
              </p>
            </div>

            {error && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-md)',
                  color: '#b91c1c',
                  fontSize: '0.82rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Username or Email Address *
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ height: '2.6rem', fontSize: '0.875rem', paddingRight: '2.5rem', width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.65rem',
                      background: 'none',
                      border: 'none',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading} style={{ padding: '0.55rem 1.1rem' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.55rem 1.4rem' }}>
                  <LogIn size={16} />
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
