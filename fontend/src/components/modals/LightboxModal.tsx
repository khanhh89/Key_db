import type { LightboxItem } from '../../types';

interface LightboxModalProps {
  lightbox: LightboxItem;
  closeLightbox: () => void;
}

export function LightboxModal({ lightbox, closeLightbox }: LightboxModalProps) {
  return (
    <div className="lightbox show" onClick={closeLightbox}>
      <button onClick={closeLightbox} aria-label="Close preview">
        ×
      </button>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {lightbox.imageSrc ? (
          <img
            src={lightbox.imageSrc}
            alt={lightbox.caption}
            style={{
              maxWidth: '92vw',
              maxHeight: '85vh',
              borderRadius: '20px',
              border: '2px solid #00f2fe',
              boxShadow: '0 0 35px rgba(0,242,254,0.5)',
              objectFit: 'contain',
              imageRendering: '-webkit-optimize-contrast'
            }}
          />
        ) : (
          lightbox.label
        )}
      </div>
      <div className="caption">{lightbox.caption}</div>
    </div>
  );
}
