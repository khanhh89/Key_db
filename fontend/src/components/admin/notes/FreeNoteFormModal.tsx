import { useState, useRef } from 'react';
import type { FreeKeyNoteItem, AppItem, Language } from '../../../types';
import { ModalPortal } from '../../common/ModalPortal';
import { saveAdminNoteToBackend } from '../../../services/api';

interface FreeNoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingNote: FreeKeyNoteItem | null;
  apps: AppItem[];
  lang: Language;
  showToast: (msg: string) => void;
  onSaved: (savedNote?: FreeKeyNoteItem) => Promise<void>;
}

export function FreeNoteFormModal({
  isOpen,
  onClose,
  editingNote,
  apps,
  lang,
  showToast,
  onSaved
}: FreeNoteFormModalProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [appId, setAppId] = useState<string>('');
  const [keysContent, setKeysContent] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [maxViews, setMaxViews] = useState<number | ''>('');
  const [expiresType, setExpiresType] = useState<string>('never');
  const [customExpiresAt, setCustomExpiresAt] = useState<string>('');
  const [active, setActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Created Modal
  const [createdNoteInfo, setCreatedNoteInfo] = useState<FreeKeyNoteItem | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const keysInputRef = useRef<HTMLTextAreaElement>(null);

  const prevOpenRef = useRef(false);
  if (isOpen !== prevOpenRef.current) {
    prevOpenRef.current = isOpen;
    if (isOpen) {
      setCreatedNoteInfo(null);
      if (editingNote) {
        setTitle(editingNote.title || '');
        setSlug(editingNote.slug || '');
        setAppId(editingNote.appId || '');
        setKeysContent(editingNote.keysContent || '');
        setDescription(editingNote.description || '');
        setPassword(editingNote.password || '');
        setMaxViews(editingNote.maxViews && editingNote.maxViews > 0 ? editingNote.maxViews : '');
        setActive(editingNote.active !== false);

        if (editingNote.expiresAt) {
          setExpiresType('custom');
          // Format ISO string to datetime-local (YYYY-MM-DDTHH:mm)
          const d = new Date(editingNote.expiresAt);
          const formatted = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setCustomExpiresAt(formatted);
        } else {
          setExpiresType('never');
          setCustomExpiresAt('');
        }
      } else {
        setTitle('');
        setSlug(generateRandomSlug());
        setAppId('');
        setKeysContent('');
        setDescription(
          `💡 Hướng dẫn kích hoạt Key:\n1. Mở ứng dụng và chọn mục Đăng nhập/Kích hoạt Bản quyền.\n2. Dán mã Key được cấp ở trên vào ô tương ứng.\n3. Nhấn Xác nhận để bắt đầu sử dụng.\n\n⚠️ Lưu ý: Mỗi mã Key chỉ kích hoạt trên 1 thiết bị.`
        );
        setPassword('');
        setMaxViews('');
        setExpiresType('never');
        setCustomExpiresAt('');
        setActive(true);
      }
    }
  }

  function generateRandomSlug() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let res = 'free-';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }

  const handleRandomSlug = () => {
    setSlug(generateRandomSlug());
  };

  // Count lines of keys
  const parsedKeysCount = keysContent
    .split('\n')
    .map((k) => k.trim())
    .filter(Boolean).length;

  const calculateExpiresAt = (): string | undefined => {
    if (expiresType === 'never') return undefined;
    if (expiresType === 'custom') {
      return customExpiresAt ? new Date(customExpiresAt).toISOString() : undefined;
    }
    const now = new Date();
    switch (expiresType) {
      case '1h':
        now.setHours(now.getHours() + 1);
        break;
      case '6h':
        now.setHours(now.getHours() + 6);
        break;
      case '12h':
        now.setHours(now.getHours() + 12);
        break;
      case '24h':
        now.setHours(now.getHours() + 24);
        break;
      case '3d':
        now.setDate(now.getDate() + 3);
        break;
      case '7d':
        now.setDate(now.getDate() + 7);
        break;
      default:
        return undefined;
    }
    return now.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng nhập tiêu đề ghi chú!' : '⚠️ Please enter note title!');
      titleInputRef.current?.focus();
      return;
    }

    if (!slug.trim()) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng nhập đường dẫn Slug!' : '⚠️ Please enter note slug!');
      return;
    }

    if (parsedKeysCount === 0) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng nhập ít nhất 1 mã Key Free!' : '⚠️ Please enter at least 1 free key code!');
      keysInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const calculatedExpires = calculateExpiresAt();
      const payload: Partial<FreeKeyNoteItem> = {
        id: editingNote?.id,
        title: title.trim(),
        slug: slug.trim().toLowerCase(),
        appId: appId || undefined,
        keysContent: keysContent.trim(),
        description: description.trim(),
        password: password.trim() || undefined,
        maxViews: maxViews ? Number(maxViews) : undefined,
        expiresAt: calculatedExpires,
        active
      };

      const res = await saveAdminNoteToBackend(payload, Boolean(editingNote));
      if (res.success && res.data) {
        showToast(
          lang === 'vi'
            ? `✅ Đã lưu trang Note Key Free thành công!`
            : `✅ Free Key Note saved successfully!`
        );
        await onSaved(res.data);
        if (!editingNote) {
          // If created new, show copy link popup
          setCreatedNoteInfo(res.data);
        } else {
          onClose();
        }
      } else {
        showToast(res.message || '⚠️ Thao tác thất bại!');
      }
    } catch (err: any) {
      showToast(err?.message || '⚠️ Lỗi không xác định!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyNoteLink = (targetSlug: string) => {
    const fullUrl = `${window.location.origin}/note/${targetSlug}`;
    navigator.clipboard.writeText(fullUrl);
    showToast(
      lang === 'vi'
        ? `📋 Đã sao chép link Note: ${fullUrl}`
        : `📋 Copied Note URL: ${fullUrl}`
    );
  };

  if (!isOpen) return null;

  // View After Created
  if (createdNoteInfo) {
    const noteUrl = `${window.location.origin}/note/${createdNoteInfo.slug}`;
    return (
      <ModalPortal>
        <div className="sub-modal-overlay" onClick={onClose}>
          <div
            className="buy-key-modal-card"
            style={{ maxWidth: '540px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close" onClick={onClose} aria-label="Close modal">
              ×
            </button>
            <div style={{ textAlign: 'center', padding: '10px 0 20px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎉</div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#4ade80', margin: '0 0 6px 0' }}>
                {lang === 'vi' ? 'Tạo Trang Note Key Free Thành Công!' : 'Note Created Successfully!'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted-dark)', margin: 0 }}>
                {lang === 'vi'
                  ? 'Đường dẫn riêng cho người dùng xem Key Free đã sẵn sàng để gửi.'
                  : 'Your unique link for users to view Free Keys is ready to share.'}
              </p>
            </div>

            <div
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(74, 222, 128, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}
            >
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                🔗 {lang === 'vi' ? 'Đường dẫn riêng của Note:' : 'Unique Note URL:'}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  color: '#38bdf8',
                  wordBreak: 'break-all',
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px dashed rgba(56, 189, 248, 0.4)',
                  marginBottom: '12px'
                }}
              >
                {noteUrl}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => copyNoteLink(createdNoteInfo.slug)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  📋 {lang === 'vi' ? 'Sao Chép Link Ngay' : 'Copy Link Now'}
                </button>
                <a
                  href={`/note/${createdNoteInfo.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '13px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  ↗ {lang === 'vi' ? 'Mở Thử' : 'Preview'}
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="save-form-btn"
                style={{ width: '100%', padding: '12px' }}
                onClick={onClose}
              >
                {lang === 'vi' ? 'Hoàn Tất' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  }

  return (
    <ModalPortal>
      <div className="sub-modal-overlay" onClick={onClose}>
        <div
          className="buy-key-modal-card"
          style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="close" onClick={onClose} aria-label="Close modal">
            ×
          </button>

          <div className="buy-key-header" style={{ marginBottom: '18px' }}>
            <div
              className="header-badge"
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 'bold',
                display: 'inline-block',
                marginBottom: '6px'
              }}
            >
              📝 {lang === 'vi' ? 'FREE KEY NOTE' : 'FREE KEY NOTE'}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
              {editingNote
                ? (lang === 'vi' ? '✏️ Chỉnh Sửa Trang Note Key Free' : '✏️ Edit Free Key Note')
                : (lang === 'vi' ? '✨ Tạo Trang Note Key Free Mới' : '✨ Create Free Key Note')}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted-dark)', margin: '4px 0 0 0' }}>
              {lang === 'vi'
                ? 'Mỗi trang Note sẽ có 1 đường link riêng biệt cho người dùng xem và nhận key.'
                : 'Each Note will have its own unique URL for users to view and copy free keys.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* TIÊU ĐỀ NOTE */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                📌 {lang === 'vi' ? 'Tiêu đề Ghi Chú' : 'Note Title'} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                ref={titleInputRef}
                type="text"
                className="admin-input-field"
                placeholder={lang === 'vi' ? 'VD: Phát 50 Key Liên Quân Free Mùa Mới' : 'E.g., 50 Free Keys Giveaway'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* SLUG ĐƯỜNG DẪN RIÊNG */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>
                  🔗 {lang === 'vi' ? 'Đường dẫn riêng (Slug)' : 'Unique Slug / URL'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={handleRandomSlug}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38bdf8',
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  🎲 {lang === 'vi' ? 'Tạo ngẫu nhiên' : 'Randomize'}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted-dark)', fontFamily: 'monospace' }}>
                  /note/
                </span>
                <input
                  type="text"
                  className="admin-input-field"
                  style={{ flex: 1, fontFamily: 'monospace' }}
                  placeholder="lq-free-01"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                  required
                />
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                {lang === 'vi' ? 'Xem trước:' : 'Preview:'} <span style={{ color: '#38bdf8' }}>{window.location.origin}/note/{slug || '...'}</span>
              </div>
            </div>

            {/* CHỌN APP LIÊN KẾT */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                📱 {lang === 'vi' ? 'Ứng Dụng Liên Kết (Tùy chọn)' : 'Linked App (Optional)'}
              </label>
              <select
                className="admin-input-field"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
              >
                <option value="">{lang === 'vi' ? '-- Dùng chung / Không gắn app cụ thể --' : '-- General / No specific app --'}</option>
                {apps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name} ({app.cls})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '11px', color: 'var(--text-muted-dark)', marginTop: '3px', display: 'block' }}>
                {lang === 'vi'
                  ? 'Nếu chọn app, trang note sẽ hiển thị logo, tên và nút tải của app đó.'
                  : 'If selected, the note page displays the app logo and download link.'}
              </span>
            </div>

            {/* DANH SÁCH KEY */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>
                  🔑 {lang === 'vi' ? 'Danh sách Mã Key Free' : 'Free Key Codes'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: parsedKeysCount > 0 ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: parsedKeysCount > 0 ? '#4ade80' : '#ef4444'
                  }}
                >
                  {parsedKeysCount} {lang === 'vi' ? 'mã key' : 'keys'}
                </span>
              </div>
              <textarea
                ref={keysInputRef}
                className="admin-input-field"
                rows={4}
                style={{ fontFamily: 'monospace', fontSize: '12.5px', resize: 'vertical' }}
                placeholder={lang === 'vi' ? 'Dán mỗi dòng 1 mã key:\nKEY-FREE-89A1\nKEY-FREE-98B2\nKEY-FREE-77C3' : 'Enter one key per line:\nKEY-1\nKEY-2'}
                value={keysContent}
                onChange={(e) => setKeysContent(e.target.value)}
                required
              />
            </div>

            {/* NỘI DUNG HƯỚNG DẪN / GHI CHÚ */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                💡 {lang === 'vi' ? 'Nội Dung Hướng Dẫn & Lưu Ý' : 'Instructions & Notes'}
              </label>
              <textarea
                className="admin-input-field"
                rows={3}
                style={{ fontSize: '12px', resize: 'vertical' }}
                placeholder={lang === 'vi' ? 'Nhập hướng dẫn sử dụng cho khách hàng...' : 'Enter usage instructions...'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* THỜI HẠN & GIỚI HẠN LƯỢT XEM */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                  ⏳ {lang === 'vi' ? 'Hạn Tự Hủy / Hết Hạn' : 'Expiration'}
                </label>
                <select
                  className="admin-input-field"
                  value={expiresType}
                  onChange={(e) => setExpiresType(e.target.value)}
                >
                  <option value="never">{lang === 'vi' ? 'Vĩnh viễn (Không hết hạn)' : 'Never (No expiration)'}</option>
                  <option value="1h">{lang === 'vi' ? 'Sau 1 giờ' : 'After 1 hour'}</option>
                  <option value="6h">{lang === 'vi' ? 'Sau 6 giờ' : 'After 6 hours'}</option>
                  <option value="12h">{lang === 'vi' ? 'Sau 12 giờ' : 'After 12 hours'}</option>
                  <option value="24h">{lang === 'vi' ? 'Sau 24 giờ (1 ngày)' : 'After 24 hours'}</option>
                  <option value="3d">{lang === 'vi' ? 'Sau 3 ngày' : 'After 3 days'}</option>
                  <option value="7d">{lang === 'vi' ? 'Sau 7 ngày' : 'After 7 days'}</option>
                  <option value="custom">{lang === 'vi' ? 'Tự chọn ngày giờ...' : 'Custom date/time...'}</option>
                </select>
                {expiresType === 'custom' && (
                  <input
                    type="datetime-local"
                    className="admin-input-field"
                    style={{ marginTop: '6px' }}
                    value={customExpiresAt}
                    onChange={(e) => setCustomExpiresAt(e.target.value)}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                  👁️ {lang === 'vi' ? 'Giới Hạn Lượt Xem' : 'Max Views Limit'}
                </label>
                <input
                  type="number"
                  min="0"
                  className="admin-input-field"
                  placeholder={lang === 'vi' ? 'Để trống = Không giới hạn' : 'Empty = Unlimited'}
                  value={maxViews}
                  onChange={(e) => setMaxViews(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
            </div>

            {/* MẬT KHẨU BẢO VỆ */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                🔒 {lang === 'vi' ? 'Mật Khẩu Mở Khóa Note (Tùy chọn)' : 'Password Protection (Optional)'}
              </label>
              <input
                type="text"
                className="admin-input-field"
                placeholder={lang === 'vi' ? 'Để trống nếu muốn ai có link cũng xem được' : 'Leave empty for public access'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted-dark)', marginTop: '3px', display: 'block' }}>
                {lang === 'vi'
                  ? 'Nếu đặt mật khẩu, người nhận phải nhập đúng mật khẩu này mới thấy mã key.'
                  : 'If set, users must enter this password to view keys.'}
              </span>
            </div>

            {/* TRẠNG THÁI HOẠT ĐỘNG */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <input
                type="checkbox"
                id="note-active-checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="note-active-checkbox" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                ⚡ {lang === 'vi' ? 'Kích hoạt trang Note ngay lập tức' : 'Activate this note immediately'}
              </label>
            </div>

            {/* ACTIONS */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="submit"
                className="save-form-btn"
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting
                  ? (lang === 'vi' ? '⏳ Đang lưu...' : '⏳ Saving...')
                  : editingNote
                  ? (lang === 'vi' ? '💾 Cập Nhật Ghi Chú' : '💾 Update Note')
                  : (lang === 'vi' ? '🚀 Tạo Ghi Chú & Lấy Link' : '🚀 Create Note & Get Link')}
              </button>
              <button
                type="button"
                className="save-form-btn"
                style={{
                  padding: '12px 20px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  border: '1px solid var(--border-dark)'
                }}
                onClick={onClose}
              >
                {lang === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
