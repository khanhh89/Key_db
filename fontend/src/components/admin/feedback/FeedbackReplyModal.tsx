import type { FeedbackItem, FeedbackStatus } from '../../../types';

interface FeedbackReplyModalProps {
  feedback: FeedbackItem;
  onClose: () => void;
  onSend: (status: FeedbackStatus, reply: string, approvedHome: boolean) => Promise<void>;
  isSubmitting: boolean;
}

export function FeedbackReplyModal({ feedback, onClose, onSend, isSubmitting }: FeedbackReplyModalProps) {
  const [replyStatus, setReplyStatus] = useState<FeedbackStatus>(feedback.status || 'RESOLVED');
  const [replyText, setReplyText] = useState(feedback.adminReply || '');
  const [approvedHome, setApprovedHome] = useState(feedback.isApprovedForHome || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSend(replyStatus, replyText, approvedHome);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
      <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.12)', width: '100%', maxWidth: '500px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700 }}>Xử Lý Phản Hồi #{feedback.id}</h3>

        <div style={{ background: 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px' }}>
          <div style={{ fontWeight: 700, color: '#38bdf8' }}>{feedback.title}</div>
          <div style={{ color: '#cbd5e1', marginTop: '4px' }}>{feedback.content}</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>Cập nhật trạng thái</label>
            <select value={replyStatus} onChange={e => setReplyStatus(e.target.value as FeedbackStatus)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', color: '#f8fafc', fontSize: '13px' }}>
              <option value="PENDING">Chờ tiếp nhận</option>
              <option value="IN_PROGRESS">Đang xử lý</option>
              <option value="RESOLVED">Đã giải quyết</option>
              <option value="REJECTED">Từ chối</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>Nội dung phản hồi cho khách hàng</label>
            <textarea rows={4} placeholder="Nhập câu trả lời từ Ban Quản Trị..." value={replyText} onChange={e => setReplyText(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', color: '#f8fafc', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="checkbox" id="approveHomeCheck" checked={approvedHome} onChange={e => setApprovedHome(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
            <label htmlFor="approveHomeCheck" style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 600, cursor: 'pointer' }}>🌟 Duyệt hiển thị trên Trang Chủ ("Phản Hồi Từ Khách Hàng VIP")</label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Hủy
            </button>
            <button type="submit" disabled={isSubmitting}
              style={{ padding: '8px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #00f2fe, #4facfe)', border: 'none', color: '#0f172a', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Import useState at the top — placed here since this file needs it
import { useState } from 'react';
