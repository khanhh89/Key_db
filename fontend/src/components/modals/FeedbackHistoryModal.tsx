import { useEffect, useState } from 'react';
import type { FeedbackItem } from '../../types';
import { fetchMyFeedbacks } from '../../services/feedbackApi';
import { ModalPortal } from '../common/ModalPortal';

interface FeedbackHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewFeedback: () => void;
}

export function FeedbackHistoryModal({ isOpen, onClose, onOpenNewFeedback }: FeedbackHistoryModalProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFeedbacks();
    }
  }, [isOpen]);

  const loadFeedbacks = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMyFeedbacks();
      setFeedbacks(data);
    } catch (err) {
      console.error('Failed to load user feedbacks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return { label: 'Đã giải quyết', bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)' };
      case 'IN_PROGRESS':
        return { label: 'Đang xử lý', bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' };
      case 'REJECTED':
        return { label: 'Từ chối', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' };
      default:
        return { label: 'Chờ tiếp nhận', bg: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)' };
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'BUG_REPORT': return '🐛 Báo lỗi';
      case 'FEATURE_REQUEST': return '💡 Đề xuất';
      case 'COMPLAINT': return '⚠️ Khiếu nại';
      default: return '💬 Góp ý';
    }
  };

  return (
    <ModalPortal>
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
        zIndex: 99999,
        padding: '16px'
      }}>

      <div className="feedback-history-card" onClick={(e) => e.stopPropagation()} style={{
        background: '#1e293b',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '640px',
        maxHeight: '80vh',
        color: '#f8fafc',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'modalSlideIn 0.25s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 1), rgba(15, 23, 42, 1))',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #a855f7, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)'
            }}>
              📜
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                Lịch Sử Phản Hồi
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Các góp ý & báo lỗi đã gửi trên thiết bị này
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
              fontSize: '16px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              ⚡ Đang tải lịch sử phản hồi...
            </div>
          ) : feedbacks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#cbd5e1' }}>Chưa có phản hồi nào</p>
              <p style={{ margin: '4px 0 16px', fontSize: '13px' }}>Bạn chưa gửi góp ý hoặc báo lỗi nào từ thiết bị này.</p>
              <button
                onClick={() => {
                  onClose();
                  onOpenNewFeedback();
                }}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                  border: 'none',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                + Gửi Phản Hồi Ngay
              </button>
            </div>
          ) : (
            feedbacks.map((fb) => {
              const badge = getStatusBadge(fb.status);
              return (
                <div
                  key={fb.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '12px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.06)',
                        color: '#cbd5e1',
                        fontWeight: 600
                      }}>
                        {getCategoryLabel(fb.category)}
                      </span>
                      {fb.rating && (
                        <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 600 }}>
                          {'★'.repeat(fb.rating)}
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      background: badge.bg,
                      color: badge.color,
                      border: badge.border,
                      fontWeight: 600
                    }}>
                      {badge.label}
                    </span>
                  </div>

                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                    {fb.title}
                  </h4>

                  <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                    {fb.content}
                  </p>

                  {/* Admin Reply Section */}
                  {fb.adminReply && (
                    <div style={{
                      marginTop: '8px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: 'rgba(56, 189, 248, 0.08)',
                      borderLeft: '4px solid #38bdf8',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🛡️ Phản hồi từ Ban Quản Trị
                        {fb.repliedAt && (
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>
                            • {new Date(fb.repliedAt).toLocaleString('vi-VN')}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#f1f5f9', lineHeight: 1.5 }}>
                        {fb.adminReply}
                      </p>
                    </div>
                  )}

                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', textAlign: 'right' }}>
                    Thời gian gửi: {new Date(fb.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          background: 'rgba(15, 23, 42, 0.8)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={() => {
              onClose();
              onOpenNewFeedback();
            }}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            + Gửi Góp Ý Mới
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

