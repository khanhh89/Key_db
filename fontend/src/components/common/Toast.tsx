import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ToastItem {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

interface ToastProps {
  message?: string | null;
  toasts?: ToastItem[];
  onRemove?: (id: string) => void;
}

export function Toast({ message, toasts = [], onRemove }: ToastProps) {
  const [mounted, setMounted] = useState(false);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setMounted(true);
    const lightApp = document.querySelector('.app.light, .light');
    setIsLight(Boolean(lightApp));
  }, []);

  if (!mounted) return null;

  // Build active toast list combining toasts array & message fallback
  const activeToasts: ToastItem[] = [...toasts];
  if (message && !activeToasts.some((t) => t.message === message)) {
    activeToasts.push({
      id: 'single-toast-' + Date.now(),
      message,
      type: message.includes('❌') || message.includes('Error') || message.includes('hủy') || message.includes('Hủy') ? 'error'
          : message.includes('🎉') || message.includes('✓') || message.includes('✅') ? 'success'
          : message.includes('⚠️') || message.includes('⛔') || message.includes('⏰') ? 'warning'
          : 'info'
    });
  }

  if (activeToasts.length === 0) return null;

  return createPortal(
    <div className="toast-container-root" role="region" aria-label="Notifications">
      {activeToasts.map((t) => (
        <div
          key={t.id}
          className={`toast-card ${t.type || 'info'} ${isLight ? 'light' : 'dark'}`}
          role="status"
          aria-live="polite"
        >
          <div className="toast-card-content">
            <span className="toast-icon">
              {t.type === 'success' ? '🎉' : t.type === 'error' ? '❌' : t.type === 'warning' ? '⚠️' : '⚡'}
            </span>
            <span className="toast-text">{t.message}</span>
          </div>
          {onRemove && (
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => onRemove(t.id)}
              aria-label="Close notification"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>,
    document.body
  );
}

