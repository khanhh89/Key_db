import { useEffect, useState } from 'react';
import type { FeedbackItem, FeedbackStatus } from '../../types';
import { fetchAdminFeedbacks, replyAdminFeedback, setDeviceBlockedStatus } from '../../services/feedbackApi';

interface AdminFeedbackPageProps {
  lang: 'vi' | 'en';
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function AdminFeedbackPage({ showToast }: AdminFeedbackPageProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Selected feedback for reply modal
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [replyStatus, setReplyStatus] = useState<FeedbackStatus>('RESOLVED');
  const [replyText, setReplyText] = useState<string>('');
  const [replyApprovedHome, setReplyApprovedHome] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, categoryFilter, page]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchAdminFeedbacks(statusFilter, categoryFilter, page, 10);
      setFeedbacks(res.content);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
    } catch (err: any) {
      showToast(err.message || 'Không thể tải dữ liệu phản hồi', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReplyModal = (fb: FeedbackItem) => {
    setSelectedFeedback(fb);
    setReplyStatus(fb.status || 'RESOLVED');
    setReplyText(fb.adminReply || '');
    setReplyApprovedHome(fb.isApprovedForHome || false);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback) return;

    setIsSubmitting(true);
    try {
      await replyAdminFeedback(selectedFeedback.id, replyStatus, replyText, replyApprovedHome);
      showToast('✅ Đã cập nhật phản hồi thành công!', 'success');
      setSelectedFeedback(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Cập nhật thất bại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBlockDevice = async (deviceId: string, currentBlockedStatus: boolean) => {
    const nextBlockedStatus = !currentBlockedStatus;
    const confirmMsg = nextBlockedStatus
      ? `Bạn có chắc muốn CHẶN thiết bị [${deviceId}] gửi phản hồi?`
      : `Bạn có chắc muốn BỎ CHẶN thiết bị [${deviceId}]?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await setDeviceBlockedStatus(deviceId, nextBlockedStatus);
      showToast(
        nextBlockedStatus
          ? `⛔ Đã chặn thiết bị [${deviceId}]`
          : `✅ Đã bỏ chặn thiết bị [${deviceId}]`,
        'success'
      );
      loadData();
    } catch (err: any) {
      showToast('Không thể cập nhật trạng thái chặn thiết bị', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', fontWeight: 600, fontSize: '12px' }}>Đã giải quyết</span>;
      case 'IN_PROGRESS':
        return <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontWeight: 600, fontSize: '12px' }}>Đang xử lý</span>;
      case 'REJECTED':
        return <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 600, fontSize: '12px' }}>Từ chối</span>;
      default:
        return <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(234,179,8,0.15)', color: '#eab308', border: '1px solid rgba(234,179,8,0.3)', fontWeight: 600, fontSize: '12px' }}>Chờ tiếp nhận</span>;
    }
  };

  return (
    <div style={{ padding: '24px', color: '#f8fafc' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
            💬 Quản Lý Phản Hồi Khách Hàng
          </h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Tổng số phản hồi: <strong style={{ color: '#38bdf8' }}>{totalElements}</strong>
          </p>
        </div>
        <button
          onClick={loadData}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#cbd5e1',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          🔄 Tải lại
        </button>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '20px',
        background: 'rgba(30, 41, 59, 0.6)',
        padding: '16px',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
            Trạng Thái
          </label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#f8fafc',
              fontSize: '13px'
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ tiếp nhận</option>
            <option value="IN_PROGRESS">Đang xử lý</option>
            <option value="RESOLVED">Đã giải quyết</option>
            <option value="REJECTED">Từ chối</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
            Loại Phản Hồi
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#f8fafc',
              fontSize: '13px'
            }}
          >
            <option value="ALL">Tất cả loại</option>
            <option value="GENERAL_FEEDBACK">Góp ý chung</option>
            <option value="BUG_REPORT">Báo lỗi</option>
            <option value="FEATURE_REQUEST">Đề xuất tính năng</option>
            <option value="COMPLAINT">Khiếu nại</option>
          </select>
        </div>
      </div>

      {/* Feedbacks Data Table */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '14px 16px', color: '#94a3b8' }}>ID / Đội Tác</th>
              <th style={{ padding: '14px 16px', color: '#94a3b8' }}>Loại & Đánh Giá</th>
              <th style={{ padding: '14px 16px', color: '#94a3b8' }}>Tiêu Đề & Nội Dung</th>
              <th style={{ padding: '14px 16px', color: '#94a3b8' }}>Liên Hệ</th>
              <th style={{ padding: '14px 16px', color: '#94a3b8' }}>Trạng Thái</th>
              <th style={{ padding: '14px 16px', color: '#94a3b8' }}>Thời Gian</th>
              <th style={{ padding: '14px 16px', color: '#94a3b8', textAlign: 'right' }}>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  ⚡ Đang tải danh sách phản hồi...
                </td>
              </tr>
            ) : feedbacks.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Không tìm thấy phản hồi nào phù hợp
                </td>
              </tr>
            ) : (
              feedbacks.map((fb) => (
                <tr key={fb.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>#{fb.id}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }} title={fb.deviceId}>
                      DEV: {fb.deviceId.substring(0, 12)}...
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#cbd5e1' }}>{fb.category}</div>
                    {fb.rating && (
                      <div style={{ color: '#fbbf24', fontSize: '12px' }}>
                        {'★'.repeat(fb.rating)}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px', maxWidth: '280px' }}>
                    <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>{fb.title}</div>
                    <div style={{
                      color: '#94a3b8',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {fb.content}
                    </div>
                    {fb.adminReply && (
                      <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '4px' }}>
                        💬 Trả lời: {fb.adminReply}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                    {fb.contactInfo || <em style={{ opacity: 0.5 }}>Không có</em>}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      {getStatusBadge(fb.status)}
                      {fb.isApprovedForHome && (
                        <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(250, 204, 21, 0.15)', color: '#facc15', border: '1px solid rgba(250, 204, 21, 0.3)', fontWeight: 600, fontSize: '11px' }}>
                          🌟 Hiện Trang Chủ
                        </span>
                      )}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8' }}>
                    {new Date(fb.createdAt).toLocaleString('vi-VN')}
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleOpenReplyModal(fb)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: 'rgba(56, 189, 248, 0.15)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: '#38bdf8',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ Xử Lý / Trả Lời
                      </button>

                      <button
                        onClick={() => handleToggleBlockDevice(fb.deviceId, false)}
                        title="Chặn thiết bị"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        🚫 Chặn Device
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Trang {page + 1} / {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f8fafc',
                  fontSize: '12px',
                  cursor: page === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                ◀ Trang trước
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f8fafc',
                  fontSize: '12px',
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Trang sau ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {selectedFeedback && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '16px'
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.12)',
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700 }}>
              Xử Lý Phản Hồi #{selectedFeedback.id}
            </h3>

            <div style={{
              background: 'rgba(15,23,42,0.6)',
              padding: '12px',
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '13px'
            }}>
              <div style={{ fontWeight: 700, color: '#38bdf8' }}>{selectedFeedback.title}</div>
              <div style={{ color: '#cbd5e1', marginTop: '4px' }}>{selectedFeedback.content}</div>
            </div>

            <form onSubmit={handleSendReply} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                  Cập nhật trạng thái
                </label>
                <select
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value as FeedbackStatus)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#f8fafc',
                    fontSize: '13px'
                  }}
                >
                  <option value="PENDING">Chờ tiếp nhận</option>
                  <option value="IN_PROGRESS">Đang xử lý</option>
                  <option value="RESOLVED">Đã giải quyết</option>
                  <option value="REJECTED">Từ chối</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                  Nội dung phản hồi cho khách hàng
                </label>
                <textarea
                  rows={4}
                  placeholder="Nhập câu trả lời từ Ban Quản Trị..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#f8fafc',
                    fontSize: '13px',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <input
                  type="checkbox"
                  id="approveHomeCheck"
                  checked={replyApprovedHome}
                  onChange={(e) => setReplyApprovedHome(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="approveHomeCheck" style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 600, cursor: 'pointer' }}>
                  🌟 Duyệt hiển thị trên Trang Chủ ("Phản Hồi Từ Khách Hàng VIP")
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedFeedback(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
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
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                    border: 'none',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
