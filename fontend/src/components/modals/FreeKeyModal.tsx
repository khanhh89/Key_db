import { ModalPortal } from '../common/ModalPortal';
import type { AppItem, Language } from '../../types';

interface FreeKeyModalProps {
  app: AppItem;
  lang: Language;
  onClose: () => void;
  openBuyModal: (app: AppItem) => void;
  showToast: (msg: string) => void;
}

export function FreeKeyModal({
  app,
  lang,
  onClose,
  openBuyModal,
  showToast
}: FreeKeyModalProps) {
  const hasKey = Boolean(app.freeKey && app.freeKey.trim());
  const displayKey = hasKey
    ? app.freeKey!.trim()
    : (lang === 'vi' ? 'Chưa cập nhật' : 'Not updated yet');

  const copyToClipboard = () => {
    if (!hasKey) {
      showToast(lang === 'vi' ? '⚠️ Admin chưa cập nhật Mã Key Free!' : '⚠️ Free key not updated yet!');
      return;
    }
    navigator.clipboard.writeText(displayKey);
    showToast(
      lang === 'vi'
        ? `📋 Đã sao chép Key Free: ${displayKey}`
        : `📋 Copied Free Key: ${displayKey}`
    );
  };

  return (
    <ModalPortal>
      <div className="sub-modal-overlay" onClick={onClose}>
      <div
        className="buy-key-modal-card free-key-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
      >
        <button className="close" onClick={onClose} aria-label="Close modal">
          ×
        </button>

        <div className="buy-key-header">
          <div className="header-badge" style={{ background: hasKey ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)', color: hasKey ? '#4ade80' : '#facc15', border: hasKey ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block', marginBottom: '8px' }}>
            ⚡ {lang === 'vi' ? 'KEY FREE TRỰC TIẾP' : 'DIRECT FREE KEY'}
          </div>
          <h3>🎁 {lang === 'vi' ? 'KEY MIỄN PHÍ' : 'FREE LICENSE KEY'}</h3>
          <p className="subtitle-desc" style={{ fontSize: '13px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>
            {lang === 'vi'
              ? `Mã Key Free dành cho ứng dụng ${app.name}`
              : `Free experience key for ${app.name}`}
          </p>
        </div>

        {/* FREE KEY DISPLAY BOX */}
        <div style={{ marginTop: '20px' }}>
          <div
            style={{
              padding: '20px',
              borderRadius: '16px',
              background: hasKey
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)'
                : 'linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
              border: hasKey ? '1.5px solid rgba(34, 197, 94, 0.35)' : '1.5px solid rgba(234, 179, 8, 0.35)',
              textAlign: 'center',
              boxShadow: hasKey ? '0 8px 24px rgba(34, 197, 94, 0.12)' : '0 8px 24px rgba(234, 179, 8, 0.12)'
            }}
          >
            <div style={{ fontSize: '12px', color: hasKey ? '#86efac' : '#fde047', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '8px' }}>
              🔑 {lang === 'vi' ? 'MÃ KEY FREE HỆ THỐNG:' : 'YOUR FREE KEY:'}
            </div>

            <div
              style={{
                fontSize: '20px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: hasKey ? '#4ade80' : '#facc15',
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '12px 16px',
                borderRadius: '10px',
                border: hasKey ? '1px dashed rgba(34, 197, 94, 0.4)' : '1px dashed rgba(234, 179, 8, 0.4)',
                letterSpacing: '1.5px',
                wordBreak: 'break-all',
                userSelect: 'all',
                marginBottom: hasKey ? '14px' : '0'
              }}
            >
              {displayKey}
            </div>

            {hasKey && (
              <button
                type="button"
                className="copy-key-btn"
                onClick={copyToClipboard}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)'
                }}
              >
                📋 {lang === 'vi' ? 'SAO CHÉP MÃ KEY FREE' : 'COPY FREE KEY'}
              </button>
            )}
          </div>

          {/* INSTRUCTIONS & UPGRADE PROMPT */}
          <div
            style={{
              marginTop: '16px',
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid var(--border-dark)',
              fontSize: '12.5px',
              color: 'var(--text-muted-dark)',
              lineHeight: '1.6'
            }}
          >
            <p style={{ margin: '0 0 6px 0', color: '#facc15', fontWeight: 600 }}>
              💡 {lang === 'vi' ? 'Hướng dẫn:' : 'Instructions:'}
            </p>
            <ul style={{ margin: 0, paddingLeft: '18px' }}>
              <li>
                {lang === 'vi'
                  ? 'Mã Key Free được hệ thống cập nhật trực tiếp cho ứng dụng này.'
                  : 'Free Key is provided directly for this application.'}
              </li>
              <li>
                {lang === 'vi'
                  ? 'Key Free có giới hạn thời gian và tính năng. Để sử dụng ổn định 100%, hãy mua gói Key VIP.'
                  : 'Free keys may have feature limits. Purchase VIP Key for 100% stability.'}
              </li>
            </ul>
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
            {app.allowSellKey !== false && (
              <button
                type="button"
                className="buy-vip-btn"
                style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold' }}
                onClick={() => {
                  onClose();
                  openBuyModal(app);
                }}
              >
                🛒 {lang === 'vi' ? 'MUA KEY VIP (BẢN QUYỀN)' : 'BUY VIP KEY'}
              </button>
            )}
            <button
              type="button"
              className="save-form-btn"
              style={{ padding: '12px 20px', borderRadius: '10px', fontSize: '13px', background: 'rgba(255, 255, 255, 0.08)', color: '#fff', border: '1px solid var(--border-dark)' }}
              onClick={onClose}
            >
              {lang === 'vi' ? 'Đóng' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
