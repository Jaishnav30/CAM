import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Mail,
  RotateCw,
  Clock,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { authApi } from '../api/authApi';
import { RegisterRequest, COMMITTEES } from '../types';

interface RegisterFormProps {
  onBackToLogin: () => void;
  onRegisteredSuccess: () => void;
}

const BATCH_YEARS = ['2023', '2024', '2025', '2026', '2027', '2028'];

export const RegisterForm: React.FC<RegisterFormProps> = ({ onBackToLogin, onRegisteredSuccess }) => {
  // Step state: 'DETAILS' (Step 1) -> 'OTP' (Step 2)
  const [step, setStep] = useState<'DETAILS' | 'OTP'>('DETAILS');

  const [role, setRole] = useState<'MEMBER' | 'ACCOUNTANT'>('MEMBER');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [batch, setBatch] = useState('2025');
  const [committee, setCommittee] = useState<string>(COMMITTEES[0]);
  const [upiId, setUpiId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 6-digit OTP state
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const validateDetails = (): { [key: string]: string } => {
    const errs: { [key: string]: string } = {};

    if (!username.trim()) {
      errs.username = 'Username is required';
    } else if (username.trim().length < 3) {
      errs.username = 'Username must be at least 3 characters';
    }

    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Enter a valid email address';
    }

    if (!batch.trim()) {
      errs.batch = 'Batch (year) is required';
    }

    if (!committee.trim()) {
      errs.committee = 'Committee is required';
    }

    // UPI ID is optional: if provided, validate format
    if (upiId.trim() && !/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test(upiId.trim())) {
      errs.upiId = 'Enter a valid UPI ID (e.g. username@okhdfcbank or 9876543210@paytm)';
    }

    // Single password rule: min. 7 characters
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 7) {
      errs.password = 'Password must be at least 7 characters';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Confirm your password';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errs);
    return errs;
  };

  // Step 1 -> Step 2: Request 6-digit OTP code
  const handleProceedToOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const errs = validateDetails();
    if (Object.keys(errs).length > 0) {
      const firstFieldKey = Object.keys(errs)[0];
      const firstErrorMsg = errs[firstFieldKey];
      setError(`Please check the form: ${firstErrorMsg}`);

      // Auto-focus and scroll the first invalid field into view
      setTimeout(() => {
        const inputElement = document.getElementById(`register-${firstFieldKey}`);
        if (inputElement) {
          inputElement.focus();
          inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const msg = await authApi.sendVerificationOtp(cleanEmail, username.trim());
      setInfoMessage(msg || `Verification code sent to ${cleanEmail}`);
      setStep('OTP');
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      // Focus first box after state update
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to send verification code. Please check your information.';
      setError(errorMsg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const msg = await authApi.sendVerificationOtp(cleanEmail, username.trim());
      setInfoMessage(msg || `New verification code sent to ${cleanEmail}`);
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // OTP individual box input handlers
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const updated = [...otp];
      updated[index] = '';
      setOtp(updated);
      return;
    }

    if (cleaned.length > 1) {
      // Pasted or fast-typed multiple digits
      const digits = cleaned.split('');
      const updated = [...otp];
      let lastIdx = index;
      for (let i = 0; i < digits.length && index + i < 6; i++) {
        updated[index + i] = digits[i];
        lastIdx = index + i;
      }
      setOtp(updated);
      const nextFocus = Math.min(lastIdx + 1, 5);
      otpInputRefs.current[nextFocus]?.focus();
      otpInputRefs.current[nextFocus]?.select();
      return;
    }

    // Single digit entered
    const updated = [...otp];
    updated[index] = cleaned;
    setOtp(updated);

    // Auto-focus next input immediately
    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
      otpInputRefs.current[index + 1]?.select();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Current box is empty: jump to previous box, clear it, and focus
        const updated = [...otp];
        updated[index - 1] = '';
        setOtp(updated);
        otpInputRefs.current[index - 1]?.focus();
      } else if (otp[index]) {
        // Clear current box
        const updated = [...otp];
        updated[index] = '';
        setOtp(updated);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
      otpInputRefs.current[index - 1]?.select();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
      otpInputRefs.current[index + 1]?.select();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const updated = [...otp];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || '';
    }
    setOtp(updated);

    const nextIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
    otpInputRefs.current[nextIndex]?.select();
  };

  // Step 2: Final submit with OTP
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const payload: RegisterRequest = {
        username: username.trim(),
        fullName: fullName.trim() || username.trim(),
        email: email.trim().toLowerCase(),
        batch: batch.trim(),
        committee: committee.trim(),
        upiId: upiId.trim() || undefined,
        requestedRole: role,
        password,
        confirmPassword,
        otp: otpCode,
      };

      await authApi.register(payload);
      setSubmittedSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please verify your 6-digit code and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success view (Submitted for Admin approval)
  if (submittedSuccess) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: '#dcfce7',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}
        >
          <CheckCircle2 size={36} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Registration Submitted!
        </h2>

        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.5rem',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
            <Sparkles size={20} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.85rem', color: '#166534', lineHeight: 1.5 }}>
              Your email <strong>{email}</strong> has been verified and your account <strong>@{username}</strong> ({role}) is submitted for review.
              <br />
              <strong style={{ color: '#14532d' }}>Approval is required by the administrator</strong> before you can log in.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#107c41',
              color: '#ffffff',
              padding: '0.65rem 1.5rem',
              fontWeight: 700,
            }}
            onClick={() => {
              onRegisteredSuccess();
              onBackToLogin();
            }}
          >
            <ArrowLeft size={16} /> Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* ===================================================================== */}
      {/* STEP 1: ACCOUNT DETAILS                                               */}
      {/* ===================================================================== */}
      {step === 'DETAILS' && (
        <form
          onSubmit={handleProceedToOtp}
          noValidate
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Scrollable Form Body */}
          <div
            className="custom-scrollbar"
            style={{
              flex: 1,
              overflowY: 'auto',
              minHeight: 0,
              paddingRight: '0.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            {/* Header & Step Tracker */}
            <div style={{ marginBottom: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Create an Account
                </h2>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.55rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: '#f0fdf4',
                    color: '#166534',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  Step 1 of 2
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Registration for Members and Accountants (Admin approval required)
              </p>
            </div>

            {/* Error alert */}
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-md)',
                  color: '#991b1b',
                  fontSize: '0.82rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Info notification */}
            {infoMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-md)',
                  color: '#166534',
                  fontSize: '0.82rem',
                }}
              >
                <Mail size={16} style={{ flexShrink: 0 }} />
                <span>{infoMessage}</span>
              </div>
            )}
          {/* Role Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              I am registering as *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setRole('MEMBER')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 0.8rem',
                  borderRadius: 'var(--radius-md)',
                  border: role === 'MEMBER' ? '2px solid #107c41' : '1px solid #cbd5e1',
                  backgroundColor: role === 'MEMBER' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 120ms ease',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: role === 'MEMBER' ? '#107c41' : '#e2e8f0',
                    color: role === 'MEMBER' ? '#ffffff' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  M
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: role === 'MEMBER' ? '#166534' : 'var(--text-primary)' }}>
                    Club Member
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Expenses & Reimbursements</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('ACCOUNTANT')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 0.8rem',
                  borderRadius: 'var(--radius-md)',
                  border: role === 'ACCOUNTANT' ? '2px solid #107c41' : '1px solid #cbd5e1',
                  backgroundColor: role === 'ACCOUNTANT' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 120ms ease',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: role === 'ACCOUNTANT' ? '#107c41' : '#e2e8f0',
                    color: role === 'ACCOUNTANT' ? '#ffffff' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  A
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: role === 'ACCOUNTANT' ? '#166534' : 'var(--text-primary)' }}>
                    Accountant
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Ledger & Approvals</div>
                </div>
              </button>
            </div>
          </div>

          {/* Username & Full Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Username *
              </label>
              <input
                id="register-username"
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                  if (fieldErrors.username) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.username;
                      return next;
                    });
                  }
                }}
                placeholder="e.g. rahul_sharma"
                style={{
                  height: '2.4rem',
                  fontSize: '0.82rem',
                  borderColor: fieldErrors.username ? 'var(--status-danger)' : undefined,
                }}
              />
              {fieldErrors.username && (
                <span style={{ fontSize: '0.7rem', color: 'var(--status-danger)', marginTop: '0.2rem', display: 'block' }}>
                  {fieldErrors.username}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Full Name
              </label>
              <input
                id="register-fullName"
                type="text"
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                style={{ height: '2.4rem', fontSize: '0.82rem' }}
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Email Address *
            </label>
            <input
              id="register-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.email;
                    return next;
                  });
                }
              }}
              placeholder="user@college.edu or personal mail"
              style={{
                height: '2.4rem',
                fontSize: '0.82rem',
                borderColor: fieldErrors.email ? 'var(--status-danger)' : undefined,
              }}
            />
            {fieldErrors.email && (
              <span style={{ fontSize: '0.7rem', color: 'var(--status-danger)', marginTop: '0.2rem', display: 'block' }}>
                {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Batch (Year) & Committee */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Batch (Year) *
              </label>
              <select
                id="register-batch"
                className="form-input"
                value={batch}
                onChange={(e) => {
                  setBatch(e.target.value);
                  if (fieldErrors.batch) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.batch;
                      return next;
                    });
                  }
                }}
                style={{
                  height: '2.4rem',
                  fontSize: '0.82rem',
                  borderColor: fieldErrors.batch ? 'var(--status-danger)' : undefined,
                }}
              >
                {BATCH_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              {fieldErrors.batch && (
                <span style={{ fontSize: '0.7rem', color: 'var(--status-danger)', marginTop: '0.2rem', display: 'block' }}>
                  {fieldErrors.batch}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Committee *
              </label>
              <select
                id="register-committee"
                className="form-input"
                value={committee}
                onChange={(e) => {
                  setCommittee(e.target.value);
                  if (fieldErrors.committee) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.committee;
                      return next;
                    });
                  }
                }}
                style={{
                  height: '2.4rem',
                  fontSize: '0.82rem',
                  borderColor: fieldErrors.committee ? 'var(--status-danger)' : undefined,
                }}
              >
                {COMMITTEES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {fieldErrors.committee && (
                <span style={{ fontSize: '0.7rem', color: 'var(--status-danger)', marginTop: '0.2rem', display: 'block' }}>
                  {fieldErrors.committee}
                </span>
              )}
            </div>
          </div>

          {/* UPI ID for Reimbursements */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                UPI ID (VPA) <span style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-muted)' }}>(Optional)</span>
              </label>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                For automated reimbursements
              </span>
            </div>
            <input
              id="register-upiId"
              type="text"
              className="form-input"
              value={upiId}
              onChange={(e) => {
                setUpiId(e.target.value.trim().toLowerCase());
                if (fieldErrors.upiId) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.upiId;
                    return next;
                  });
                }
              }}
              placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
              style={{
                height: '2.4rem',
                fontSize: '0.82rem',
                borderColor: fieldErrors.upiId ? 'var(--status-danger)' : undefined,
              }}
            />
            {fieldErrors.upiId ? (
              <span style={{ fontSize: '0.7rem', color: 'var(--status-danger)', marginTop: '0.2rem', display: 'block' }}>
                {fieldErrors.upiId}
              </span>
            ) : (
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                Used by administrators to reimburse approved expenses directly to your UPI bank account.
              </span>
            )}
          </div>

          {/* Password (min 7 characters) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Set Password *
              </label>
              <span style={{ fontSize: '0.68rem', color: password.length >= 7 ? '#16a34a' : 'var(--text-muted)' }}>
                Rule: Min. 7 characters ({password.length}/7)
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.password;
                      return next;
                    });
                  }
                }}
                placeholder="At least 7 characters"
                style={{
                  height: '2.4rem',
                  fontSize: '0.82rem',
                  paddingRight: '2.5rem',
                  borderColor: fieldErrors.password ? 'var(--status-danger)' : undefined,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span style={{ fontSize: '0.7rem', color: 'var(--status-danger)', marginTop: '0.2rem', display: 'block' }}>
                {fieldErrors.password}
              </span>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Confirm Password *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="register-confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-input"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.confirmPassword;
                      return next;
                    });
                  }
                }}
                placeholder="Re-enter your password"
                style={{
                  height: '2.4rem',
                  fontSize: '0.82rem',
                  paddingRight: '2.5rem',
                  borderColor: fieldErrors.confirmPassword ? 'var(--status-danger)' : undefined,
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <span style={{ fontSize: '0.7rem', color: 'var(--status-danger)', marginTop: '0.2rem', display: 'block' }}>
                {fieldErrors.confirmPassword}
              </span>
            )}
          </div>

          {/* Immediate Error banner above submit button */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                color: '#991b1b',
                fontSize: '0.82rem',
                marginTop: '0.25rem',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          </div>

          {/* Sticky Footer */}
          <div
            style={{
              flexShrink: 0,
              paddingTop: '0.75rem',
              marginTop: '0.4rem',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
            }}
          >
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.7rem 1.5rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                gap: '0.5rem',
                justifyContent: 'center',
                backgroundColor: '#107c41',
                color: '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.85 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Sending verification code...</span>
                </>
              ) : (
                <>
                  <span>Continue to Email Verification</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: 6-DIGIT EMAIL OTP VERIFICATION                                */}
      {/* ===================================================================== */}
      {step === 'OTP' && (
        <form
          onSubmit={handleFinalSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Scrollable Form Body */}
          <div
            className="custom-scrollbar"
            style={{
              flex: 1,
              overflowY: 'auto',
              minHeight: 0,
              paddingRight: '0.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Header & Step Tracker */}
            <div style={{ marginBottom: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Verify Your Email
                </h2>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.55rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: '#f0fdf4',
                    color: '#166534',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  Step 2 of 2
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Enter the 6-digit code sent to {email}
              </p>
            </div>

            {/* Error alert */}
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-md)',
                  color: '#991b1b',
                  fontSize: '0.82rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Info notification */}
            {infoMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-md)',
                  color: '#166534',
                  fontSize: '0.82rem',
                }}
              >
                <Mail size={16} style={{ flexShrink: 0 }} />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* Email Info Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Mail size={16} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sent 6-digit code to</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {email}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('DETAILS')}
                style={{
                  fontSize: '0.75rem',
                  color: '#107c41',
                  fontWeight: 600,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.2rem 0.4rem',
                }}
              >
                Change
              </button>
            </div>

            {/* 6-Digit OTP Input Grid */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', textAlign: 'center' }}>
                Verification Code *
              </label>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpInputRefs.current[index] = el;
                    }}
                    id={`otp-input-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    onFocus={(e) => e.target.select()}
                    style={{
                      width: '42px',
                      height: '48px',
                      textAlign: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      borderRadius: 'var(--radius-md)',
                      border: digit ? '2px solid #107c41' : '1.5px solid #cbd5e1',
                      backgroundColor: digit ? '#f0fdf4' : '#ffffff',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      transition: 'all 150ms ease',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Resend OTP Section */}
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {resendCooldown > 0 ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={13} />
                  <span>Resend code in <strong>{resendCooldown}s</strong></span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: '#107c41',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    background: 'none',
                    padding: 0,
                  }}
                >
                  <RotateCw size={13} />
                  <span>Resend Code</span>
                </button>
              )}
            </div>
          </div>

          {/* Sticky Footer */}
          <div
            style={{
              flexShrink: 0,
              paddingTop: '0.75rem',
              marginTop: '0.4rem',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || otp.join('').length !== 6}
              style={{
                width: '100%',
                padding: '0.75rem 1.5rem',
                fontSize: '0.92rem',
                fontWeight: 700,
                gap: '0.5rem',
                justifyContent: 'center',
                backgroundColor: otp.join('').length === 6 ? '#107c41' : '#94a3b8',
                color: '#ffffff',
              }}
            >
              {loading ? (
                'Verifying code...'
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Verify & Submit Registration</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('DETAILS');
                setError(null);
                setInfoMessage(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                padding: '0.35rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={15} />
              <span>Back to Account Details</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
