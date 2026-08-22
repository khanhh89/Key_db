import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ToastProps {
  message: string;
}

export function Toast({ message }: ToastProps) {
  const [mounted, setMounted] = useState(false);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setMounted(true);
    const lightApp = document.querySelector('.app.light, .light');
    setIsLight(Boolean(lightApp));
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className={`toast-msg ${isLight ? 'light' : 'dark'}`} role="status" aria-live="polite">
      <div className="toast-content">
        <span className="toast-text">{message}</span>
      </div>
    </div>,
    document.body
  );
}

