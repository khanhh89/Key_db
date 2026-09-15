import { useState, useEffect, useMemo } from 'react';
import type { FreeKeyNoteItem, AppItem, Language, SystemConfig } from '../../types';
import {
  fetchAdminNotesFromBackend,
  deleteAdminNoteFromBackend,
  toggleAdminNoteActiveInBackend
} from '../../services/api';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Pagination } from '../../components/common/Pagination';
import { FreeNoteFormModal } from '../../components/admin/notes/FreeNoteFormModal';

interface FreeNotesPageProps {
  lang: Language;
  apps: AppItem[];
  config?: SystemConfig;
  showToast: (msg: string) => void;
}

export function FreeNotesPage({ lang, apps, config, showToast }: FreeNotesPageProps) {
  const getBaseUrl = () => {
    if (config?.domain && config.domain.trim()) {
      let d = config.domain.trim();
      if (!d.startsWith('http://') && !d.startsWith('https://')) {
        d = `https://${d}`;
      }
      return d.replace(/\/+$/, '');
    }
    return window.location.origin;
  };

  const [notes, setNotes] = useState<FreeKeyNoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAppId, setFilterAppId] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED'>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<FreeKeyNoteItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminNotesFromBackend();
      setNotes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const openNewModal = () => {
    setEditingNote(null);
    setIsModalOpen(true);
  };

  const openEditModal = (note: FreeKeyNoteItem) => {
    setEditingNote(note);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (note: FreeKeyNoteItem) => {
    const success = await toggleAdminNoteActiveInBackend(note.id);
    if (success) {
      const next = !note.active;
      showToast(
        lang === 'vi'
          ? (next ? `🟢 Đã bật hoạt động Note [${note.title}]` : `🔴 Đã tạm dừng Note [${note.title}]`)
          : (next ? `🟢 Activated [${note.title}]` : `🔴 Deactivated [${note.title}]`)
      );
      await loadNotes();
    } else {
      showToast('⚠️ Thao tác thất bại!');
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    const success = await deleteAdminNoteFromBackend(deletingId);
    if (success) {
      showToast(lang === 'vi' ? '🗑️ Đã xóa trang Note thành công!' : '🗑️ Note deleted successfully!');
      await loadNotes();
    } else {
      showToast('⚠️ Xóa trang Note thất bại!');
    }
    setDeletingId(null);
  };

  const copyNoteUrl = (slug: string) => {
    const fullUrl = `${getBaseUrl()}/note/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    showToast(
      lang === 'vi'
        ? `📋 Đã sao chép link Note: ${fullUrl}`
        : `📋 Copied URL: ${fullUrl}`
    );
  };

  const getAppName = (appId?: string) => {
    if (!appId) return lang === 'vi' ? '🌐 Dùng chung' : '🌐 General';
    const found = apps.find((a) => a.id === appId);
    return found ? found.name : appId;
  };

  const getAppIcon = (appId?: string) => {
    if (!appId) return null;
    const found = apps.find((a) => a.id === appId);
    return found ? found.icon : null;
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '∞ Vĩnh viễn';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Check if a note is currently expired
  const isExpired = (note: FreeKeyNoteItem) => {
    if (!note.expiresAt) return false;
    return new Date(note.expiresAt).getTime() < Date.now();
  };

  // Stats
  const totalNotes = notes.length;
  const activeNotes = notes.filter((n) => n.active && !isExpired(n)).length;
  const totalViews = notes.reduce((acc, n) => acc + (n.viewCount || 0), 0);
  const totalKeys = notes.reduce((acc, n) => acc + (n.keyCount || 0), 0);

  // Filtered List
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // Search
      const matchSearch =
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.description && n.description.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filter App
      const matchApp = filterAppId === 'ALL' || n.appId === filterAppId || (filterAppId === 'GENERAL' && !n.appId);

      // Filter Status
      let matchStatus = true;
      if (filterStatus === 'ACTIVE') {
        matchStatus = n.active && !isExpired(n);
      } else if (filterStatus === 'INACTIVE') {
        matchStatus = !n.active;
      } else if (filterStatus === 'EXPIRED') {
        matchStatus = isExpired(n);
      }

      return matchSearch && matchApp && matchStatus;
    });
  }, [notes, searchTerm, filterAppId, filterStatus]);

  const totalPages = Math.ceil(filteredNotes.length / pageSize) || 1;
  const paginatedNotes = filteredNotes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="admin-page-container">
      {/* HEADER */}
      <div className="admin-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📝</span>
            {lang === 'vi' ? 'Quản Lý Trang Note Key Free' : 'Free Key Notes Manager'}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
            {lang === 'vi'
              ? 'Tạo các trang ghi chú chứa Key Free với đường dẫn riêng biệt để chia sẻ cho người dùng.'
              : 'Create dedicated Free Key note pages with unique URLs to share with users.'}
          </p>
        </div>
        <button
          className="admin-primary-btn"
          onClick={openNewModal}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
            color: '#fff',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
          }}
        >
          <span>➕</span>
          <span>{lang === 'vi' ? 'Tạo Note Mới' : 'Create New Note'}</span>
        </button>
      </div>

      {/* STATS CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px'
        }}
      >
        <div className="admin-stat-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dark)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)', marginBottom: '4px' }}>
            📚 {lang === 'vi' ? 'Tổng Số Note' : 'Total Notes'}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8' }}>{totalNotes}</div>
        </div>

        <div className="admin-stat-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dark)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)', marginBottom: '4px' }}>
            🟢 {lang === 'vi' ? 'Đang Hoạt Động' : 'Active Notes'}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4ade80' }}>{activeNotes}</div>
        </div>

        <div className="admin-stat-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dark)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)', marginBottom: '4px' }}>
            👁️ {lang === 'vi' ? 'Tổng Lượt Truy Cập' : 'Total Views'}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{totalViews}</div>
        </div>

        <div className="admin-stat-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dark)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)', marginBottom: '4px' }}>
            🔑 {lang === 'vi' ? 'Tổng Số Key Free' : 'Total Free Keys'}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#a855f7' }}>{totalKeys}</div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div
        className="admin-filter-bar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '16px',
          alignItems: 'center'
        }}
      >
        <div style={{ flex: '1 1 240px' }}>
          <input
            type="text"
            className="admin-input-field"
            placeholder={lang === 'vi' ? '🔍 Tìm theo tiêu đề, slug, nội dung...' : '🔍 Search by title, slug...'}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div style={{ minWidth: '160px' }}>
          <select
            className="admin-input-field"
            value={filterAppId}
            onChange={(e) => {
              setFilterAppId(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">{lang === 'vi' ? 'Tất cả ứng dụng' : 'All Apps'}</option>
            <option value="GENERAL">{lang === 'vi' ? '🌐 Dùng chung' : '🌐 General'}</option>
            {apps.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '150px' }}>
          <select
            className="admin-input-field"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as any);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">{lang === 'vi' ? 'Tất cả trạng thái' : 'All Status'}</option>
            <option value="ACTIVE">{lang === 'vi' ? '🟢 Đang chạy' : '🟢 Active'}</option>
            <option value="INACTIVE">{lang === 'vi' ? '🔴 Tạm dừng' : '🔴 Inactive'}</option>
            <option value="EXPIRED">{lang === 'vi' ? '⏳ Hết hạn' : '⏳ Expired'}</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="admin-table-wrapper" style={{ overflowX: 'auto' }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-dark)', textAlign: 'left' }}>
              <th style={{ padding: '12px 14px', fontSize: '12px' }}>{lang === 'vi' ? 'Tiêu Đề & Đường Dẫn' : 'Title & URL Slug'}</th>
              <th style={{ padding: '12px 14px', fontSize: '12px' }}>{lang === 'vi' ? 'Ứng Dụng' : 'App'}</th>
              <th style={{ padding: '12px 14px', fontSize: '12px', textAlign: 'center' }}>{lang === 'vi' ? 'Số Key' : 'Keys'}</th>
              <th style={{ padding: '12px 14px', fontSize: '12px', textAlign: 'center' }}>{lang === 'vi' ? 'Lượt Xem' : 'Views'}</th>
              <th style={{ padding: '12px 14px', fontSize: '12px' }}>{lang === 'vi' ? 'Thời Hạn' : 'Expiration'}</th>
              <th style={{ padding: '12px 14px', fontSize: '12px', textAlign: 'center' }}>{lang === 'vi' ? 'Mật Khẩu' : 'Password'}</th>
              <th style={{ padding: '12px 14px', fontSize: '12px', textAlign: 'center' }}>{lang === 'vi' ? 'Trạng Thái' : 'Status'}</th>
              <th style={{ padding: '12px 14px', fontSize: '12px', textAlign: 'right' }}>{lang === 'vi' ? 'Thao Tác' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted-dark)' }}>
                  ⚡ Đang tải dữ liệu ghi chú...
                </td>
              </tr>
            ) : paginatedNotes.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted-dark)' }}>
                  📭 {lang === 'vi' ? 'Không có trang Note nào phù hợp.' : 'No notes found.'}
                </td>
              </tr>
            ) : (
              paginatedNotes.map((n) => {
                const expired = isExpired(n);
                const appIcon = getAppIcon(n.appId);
                const appName = getAppName(n.appId);
                return (
                  <tr
                    key={n.id}
                    style={{
                      borderBottom: '1px solid var(--border-dark)',
                      transition: 'background 0.2s',
                      opacity: !n.active || expired ? 0.75 : 1
                    }}
                  >
                    {/* TIÊU ĐỀ & SLUG */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13.5px', marginBottom: '3px' }}>
                        {n.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <code
                          style={{
                            fontSize: '11px',
                            color: '#38bdf8',
                            background: 'rgba(56, 189, 248, 0.1)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          /note/{n.slug}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyNoteUrl(n.slug)}
                          title={lang === 'vi' ? 'Sao chép link' : 'Copy link'}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            padding: '2px'
                          }}
                        >
                          📋
                        </button>
                        <a
                          href={`/note/${n.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          title={lang === 'vi' ? 'Mở trong tab mới' : 'Open in new tab'}
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted-dark)',
                            textDecoration: 'none'
                          }}
                        >
                          ↗
                        </a>
                      </div>
                    </td>

                    {/* APP */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {appIcon ? (
                          <img
                            src={appIcon}
                            alt=""
                            style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ fontSize: '14px' }}>🌐</span>
                        )}
                        <span style={{ fontSize: '12.5px', fontWeight: 500 }}>{appName}</span>
                      </div>
                    </td>

                    {/* KEY COUNT */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: 'rgba(74, 222, 128, 0.15)',
                          color: '#4ade80'
                        }}
                      >
                        {n.keyCount || 0}
                      </span>
                    </td>

                    {/* VIEWS / MAX */}
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '12.5px' }}>
                      <span style={{ fontWeight: 600, color: '#f59e0b' }}>{n.viewCount || 0}</span>
                      <span style={{ color: 'var(--text-muted-dark)' }}>
                        {' '}/ {n.maxViews && n.maxViews > 0 ? n.maxViews : '∞'}
                      </span>
                    </td>

                    {/* EXPIRES */}
                    <td style={{ padding: '12px 14px', fontSize: '12px' }}>
                      {expired ? (
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>⏳ Đã hết hạn</span>
                      ) : (
                        <span>{formatDateTime(n.expiresAt)}</span>
                      )}
                    </td>

                    {/* PASSWORD */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {n.hasPassword || (n.password && n.password.trim()) ? (
                        <span
                          title={n.password ? `Mật khẩu: ${n.password}` : 'Có mật khẩu'}
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: 'rgba(234, 179, 8, 0.15)',
                            color: '#facc15',
                            fontWeight: 600
                          }}
                        >
                          🔒 {n.password ? n.password : 'Có'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted-dark)' }}>Công khai</span>
                      )}
                    </td>

                    {/* ACTIVE TOGGLE */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(n)}
                        style={{
                          background: n.active
                            ? 'rgba(74, 222, 128, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)',
                          color: n.active ? '#4ade80' : '#ef4444',
                          border: `1px solid ${n.active ? 'rgba(74, 222, 128, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        {n.active
                          ? (lang === 'vi' ? 'Bật' : 'Active')
                          : (lang === 'vi' ? 'Tắt' : 'Off')}
                      </button>
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => copyNoteUrl(n.slug)}
                          title={lang === 'vi' ? 'Sao chép link' : 'Copy link'}
                          style={{
                            padding: '6px 10px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            borderRadius: '6px',
                            color: '#38bdf8',
                            cursor: 'pointer'
                          }}
                        >
                          📋
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => openEditModal(n)}
                          title={lang === 'vi' ? 'Chỉnh sửa' : 'Edit'}
                          style={{
                            padding: '6px 10px',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid var(--border-dark)',
                            borderRadius: '6px',
                            color: '#fff',
                            cursor: 'pointer'
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => setDeletingId(n.id)}
                          title={lang === 'vi' ? 'Xóa' : 'Delete'}
                          style={{
                            padding: '6px 10px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            color: '#ef4444',
                            cursor: 'pointer'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div style={{ marginTop: '16px' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredNotes.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            lang={lang}
          />
        </div>
      )}

      {/* MODAL CREATE/EDIT NOTE */}
      <FreeNoteFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingNote={editingNote}
        apps={apps}
        lang={lang}
        config={config}
        showToast={showToast}
        onSaved={async () => {
          await loadNotes();
        }}
      />

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(deletingId)}
        title={lang === 'vi' ? 'Xác Nhận Xóa Trang Note' : 'Confirm Delete Note'}
        message={
          lang === 'vi'
            ? 'Bạn có chắc chắn muốn xóa trang ghi chú này không? Người dùng sẽ không thể truy cập link này nữa.'
            : 'Are you sure you want to delete this note? Users will no longer be able to access this link.'
        }
        lang={lang}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
