import { ModalPortal } from './ModalPortal';
import type { Language } from '../../types';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  lang: Language;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  lang,
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="sub-modal-overlay" onClick={onCancel}>
        <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="confirm-icon-wrap">
            <span className="confirm-warning-icon">⚠️</span>
          </div>

          <h3>{title}</h3>
          <p>{message}</p>

          <div className="confirm-btn-actions">
            <button className="confirm-cancel-btn" onClick={onCancel}>
              {lang === 'vi' ? 'Hủy Bỏ' : 'Cancel'}
            </button>
            <button className="confirm-danger-btn" onClick={onConfirm}>
              🗑 {lang === 'vi' ? 'Xác Nhận Xóa' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
