import { useEffect } from 'react';
import { ModalPortal } from '../common/ModalPortal';
import type { LightboxItem } from '../../types';

interface LightboxModalProps {
  lightbox: LightboxItem;
  closeLightbox: () => void;
}

export function LightboxModal({ lightbox, closeLightbox }: LightboxModalProps) {
  // ESC key listener to close lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeLightbox]);

  return (
    <ModalPortal>
      <div className="modal-overlay lightbox-modal-overlay show" onClick={closeLightbox}>
        <div className="lightbox-card" onClick={(e) => e.stopPropagation()}>
          <div className="lightbox-header-bar">
            <span className="lightbox-header-title">🔍 MENU PREVIEW HIGH-RES</span>
            <button className="lightbox-close-btn" onClick={closeLightbox} aria-label="Close preview" title="Close (ESC)">
              ✕
            </button>
          </div>

          <div className="lightbox-img-container">
            {lightbox.imageSrc ? (
              <img
                src={lightbox.imageSrc}
                alt={lightbox.caption || 'App Screenshot Preview'}
                className="lightbox-image"
              />
            ) : (
              <div className="lightbox-placeholder">{lightbox.label}</div>
            )}
          </div>

          {lightbox.caption && (
            <div className="lightbox-caption">
              <span>📷 {lightbox.caption}</span>
              <small style={{ color: '#94a3b8', display: 'block', marginTop: '4px' }}>Nhấn ESC hoặc click ngoài để đóng</small>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

