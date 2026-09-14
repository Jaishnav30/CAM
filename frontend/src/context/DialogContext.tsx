import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, Info, AlertCircle, Trash2, X } from 'lucide-react';

export type DialogVariant = 'danger' | 'warning' | 'success' | 'info';

export interface ConfirmDialogOptions {
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  customIcon?: React.ReactNode;
}

export interface AlertDialogOptions {
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  variant?: DialogVariant;
  customIcon?: React.ReactNode;
}

interface DialogContextType {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  alert: (options: AlertDialogOptions) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export const useDialog = (): DialogContextType => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

interface DialogState {
  isOpen: boolean;
  isAlert: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText: string;
  cancelText: string;
  variant: DialogVariant;
  customIcon?: React.ReactNode;
  resolve?: (value: boolean) => void;
}

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    isAlert: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'info',
  });

  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        isOpen: true,
        isAlert: false,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'info',
        customIcon: options.customIcon,
        resolve,
      });
    });
  }, []);

  const alert = useCallback((options: AlertDialogOptions): Promise<void> => {
    return new Promise<void>((resolve) => {
      setDialog({
        isOpen: true,
        isAlert: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Understood',
        cancelText: '',
        variant: options.variant || 'info',
        customIcon: options.customIcon,
        resolve: () => resolve(),
      });
    });
  }, []);

  const handleClose = (result: boolean) => {
    if (dialog.resolve) {
      dialog.resolve(result);
    }
    setDialog((prev) => ({ ...prev, isOpen: false, resolve: undefined }));
  };

  // Keyboard shortcut listener (ESC to cancel, Enter to confirm)
  useEffect(() => {
    if (!dialog.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose(false);
      } else if (e.key === 'Enter') {
        // Only trigger if not already focused on cancel
        if (document.activeElement?.getAttribute('data-dialog-cancel') === 'true') {
          return;
        }
        e.preventDefault();
        handleClose(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Auto focus primary button on open
    setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dialog.isOpen]);

  const getVariantStyles = (variant: DialogVariant) => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: '#fee2e2',
          iconColor: '#dc2626',
          IconComponent: dialog.customIcon || <Trash2 size={22} />,
          btnBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          btnHover: '#b91c1c',
          btnShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
          btnColor: '#ffffff',
          badgeText: 'Action Required',
          borderColor: 'rgba(239, 68, 68, 0.25)',
        };
      case 'warning':
        return {
          iconBg: '#fef3c7',
          iconColor: '#d97706',
          IconComponent: dialog.customIcon || <AlertCircle size={22} />,
          btnBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          btnHover: '#b45309',
          btnShadow: '0 4px 12px rgba(217, 119, 6, 0.35)',
          btnColor: '#ffffff',
          badgeText: 'Notice',
          borderColor: 'rgba(245, 158, 11, 0.25)',
        };
      case 'success':
        return {
          iconBg: '#dcfce7',
          iconColor: '#15803d',
          IconComponent: dialog.customIcon || <CheckCircle2 size={22} />,
          btnBg: 'linear-gradient(135deg, #107c41 0%, #074320 100%)',
          btnHover: '#0b5a2f',
          btnShadow: '0 4px 12px rgba(16, 124, 65, 0.35)',
          btnColor: '#ffffff',
          badgeText: 'Confirmation',
          borderColor: 'rgba(16, 124, 65, 0.25)',
        };
      case 'info':
      default:
        return {
          iconBg: '#e0f2fe',
          iconColor: '#0284c7',
          IconComponent: dialog.customIcon || <Info size={22} />,
          btnBg: 'linear-gradient(135deg, #107c41 0%, #074320 100%)',
          btnHover: '#0b5a2f',
          btnShadow: '0 4px 12px rgba(16, 124, 65, 0.3)',
          btnColor: '#ffffff',
          badgeText: 'System Alert',
          borderColor: 'rgba(2, 132, 199, 0.25)',
        };
    }
  };

  const vStyles = getVariantStyles(dialog.variant);

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}

      {dialog.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="custom-dialog-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999, // Super high to always appear above any other open modal
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            animation: 'dialogBackdropFade 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleClose(false);
            }
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: `1px solid ${vStyles.borderColor}`,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              padding: '1.75rem',
              position: 'relative',
              animation: 'dialogCardSlide 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => handleClose(false)}
              aria-label="Close dialog"
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.color = '#334155';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <X size={18} />
            </button>

            {/* Header: Icon + Title */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: vStyles.iconBg,
                  color: vStyles.iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: `0 4px 10px ${vStyles.borderColor}`,
                }}
              >
                {vStyles.IconComponent}
              </div>
              <div style={{ flex: 1, paddingRight: '1rem' }}>
                <div
                  style={{
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    fontWeight: 800,
                    color: vStyles.iconColor,
                    marginBottom: '0.2rem',
                  }}
                >
                  {vStyles.badgeText}
                </div>
                <h3
                  id="custom-dialog-title"
                  style={{
                    fontSize: '1.18rem',
                    fontWeight: 800,
                    margin: 0,
                    color: '#0f172a',
                    lineHeight: 1.3,
                  }}
                >
                  {dialog.title}
                </h3>
              </div>
            </div>

            {/* Message Body */}
            <div
              style={{
                fontSize: '0.92rem',
                color: '#475569',
                lineHeight: 1.6,
                marginBottom: '1.75rem',
                wordBreak: 'break-word',
                paddingLeft: '0.1rem',
              }}
            >
              {typeof dialog.message === 'string' ? (
                dialog.message.split('\n\n').map((para, i) => (
                  <p key={i} style={{ margin: i > 0 ? '0.65rem 0 0 0' : 0 }}>
                    {para}
                  </p>
                ))
              ) : (
                dialog.message
              )}
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              {!dialog.isAlert && (
                <button
                  type="button"
                  data-dialog-cancel="true"
                  onClick={() => handleClose(false)}
                  style={{
                    padding: '0.62rem 1.15rem',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: '#475569',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#94a3b8';
                    e.currentTarget.style.color = '#0f172a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.color = '#475569';
                  }}
                >
                  {dialog.cancelText}
                </button>
              )}

              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => handleClose(true)}
                style={{
                  padding: '0.62rem 1.35rem',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: vStyles.btnColor,
                  background: vStyles.btnBg,
                  boxShadow: vStyles.btnShadow,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.filter = 'brightness(1.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.filter = 'none';
                }}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style>{`
        @keyframes dialogBackdropFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dialogCardSlide {
          from {
            opacity: 0;
            transform: scale(0.94) translateY(12px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </DialogContext.Provider>
  );
};
