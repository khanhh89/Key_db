import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
}

export function ModalPortal({ children }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);
  const [themeClass, setThemeClass] = useState('app dark');

  useEffect(() => {
    setMounted(true);

    // Detect active theme & layout context from DOM
    const lightApp = document.querySelector('.app.light, .light');
    const adminApp = document.querySelector('.admin-portal');
    const isLight = Boolean(lightApp);
    const isAdmin = Boolean(adminApp);

    const activeClass = `${isAdmin ? 'admin-portal' : 'app'} ${isLight ? 'light' : 'dark'}`;
    setThemeClass(activeClass);

    // Lock background scrolling while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className={`modal-portal-wrapper ${themeClass}`}>
      {children}
    </div>,
    document.body
  );
}
