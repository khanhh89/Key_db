import { useState } from 'react';
import type { FeedbackCategory, FeedbackCreatePayload } from '../../types';
import { submitFeedback } from '../../services/feedbackApi';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHistory: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const CATEGORIES: { key: FeedbackCategory; label: string; icon: string }[] = [
  { key: 'GENERAL_FEEDBACK', label: 'Góp ý chung', icon: '💬' },
  { key: 'BUG_REPORT', label: 'Báo lỗi hệ thống', icon: '🐛' },
  { key: 'FEATURE_REQUEST', label: 'Đề xuất tính năng', icon: '💡' },
  { key: 'COMPLAINT', label: 'Khiếu nại / Khác', icon: '⚠️' }
];

export function FeedbackModal({ isOpen, onClose, onOpenHistory, showToast }: FeedbackModalProps) {
  const [category, setCategory] = useState<FeedbackCategory>('GENERAL_FEEDBACK');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [contactInfo, setContactInfo] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      if (showToast) showToast('Vui lòng nhập tiêu đề phản hồi', 'warning');
      return;
    }
    if (!content.trim()) {
      if (showToast) showToast('Vui lòng nhập nội dung chi tiết', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: FeedbackCreatePayload = {
        category,
        title: title.trim(),
        content: content.trim(),
        rating,
        contactInfo: contactInfo.trim() || undefined,
        attachmentUrls: attachmentUrl.trim() ? [attachmentUrl.trim()] : undefined
      };

      await submitFeedback(payload);
      if (showToast) showToast('🎉 Gửi phản hồi thành công! Cảm ơn ý kiến của bạn.', 'success');
      
      // Reset form
      setTitle('');
      setContent('');
      setContactInfo('');
      setAttachmentUrl('');
      onClose();
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Gửi phản hồi thất bại. Vui lòng thử lại!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div className="feedback-modal-card" onClick={(e) => e.stopPropagation()} style={{
        background: '#1e293b',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '540px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        color: '#f8fafc',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        animation: 'modalSlideIn 0.25s ease-out'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 1), rgba(15, 23, 42, 1))',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(0, 242, 254, 0.3)'
            }}>
              💌
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                Gửi Phản Hồi & Góp Ý
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Không cần đăng nhập • Thiết bị tự động ghi nhận
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              color: '#94a3b8',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto', flex: 1 }}>
          {/* Category Chips */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
              Loại Phản Hồi
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: category === cat.key ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                    background: category === cat.key ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)',
                    color: category === cat.key ? '#38bdf8' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Mức độ hài lòng ({rating} / 5 sao)
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setRating(star)}
                  style={{
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: star <= rating ? '#fbbf24' : '#475569',
                    transition: 'transform 0.15s ease, color 0.15s ease',
                    userSelect: 'none'
                  }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Tiêu đề <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Lỗi đăng nhập, Góp ý thêm tính năng..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Content TextArea */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Nội dung chi tiết <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Mô tả cụ thể vấn đề hoặc ý kiến đóng góp của bạn..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Contact Info (Optional) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Email / SĐT (Tùy chọn)
              </label>
              <input
                type="text"
                placeholder="Để lại nếu muốn hỗ trợ"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#f8fafc',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                URL Ảnh minh họa (Tùy chọn)
              </label>
              <input
                type="text"
                placeholder="https://..."
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#f8fafc',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenHistory();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38bdf8',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📜 Xem lịch sử phản hồi
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#cbd5e1',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                  border: 'none',
                  color: '#0f172a',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 242, 254, 0.3)',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi Phản Hồi'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
