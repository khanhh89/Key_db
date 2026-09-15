import { useState, useRef } from 'react';
import type { FreeKeyNoteItem, AppItem, Language, SystemConfig } from '../../../types';
import { ModalPortal } from '../../common/ModalPortal';
import { saveAdminNoteToBackend } from '../../../services/api';

interface FreeNoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingNote: FreeKeyNoteItem | null;
  apps: AppItem[];
  lang: Language;
  config?: SystemConfig;
  showToast: (msg: string) => void;
  onSaved: (savedNote?: FreeKeyNoteItem) => Promise<void>;
}

export function FreeNoteFormModal({
  isOpen,
  onClose,
  editingNote,
  apps,
  lang,
  config,
  showToast,
  onSaved
}: FreeNoteFormModalProps) {
  const getBaseUrl = () => {
    // 1. Nếu đang chạy trên web thật (không phải localhost), luôn dùng chính xác domain thật đang chạy (vd: https://key-db.vercel.app)
    if (typeof window !== 'undefined' && window.location.origin) {
      const hostname = window.location.hostname;
      if (hostname && !hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
        return window.location.origin;
      }
    }
    // 2. Nếu đang ở localhost nhưng admin có cấu hình domain hợp lệ có dấu chấm (vd: key-db.vercel.app)
    if (config?.domain && config.domain.trim() && config.domain.includes('.')) {
      let d = config.domain.trim();
      if (!d.startsWith('http://') && !d.startsWith('https://')) {
        d = `https://${d}`;
      }
      return d.replace(/\/+$/, '');
    }
    return window.location.origin;
  };

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

  const handleCleanEmptyLines = () => {
    const cleaned = keysContent
      .split('\n')
      .map((k) => k.trim())
      .filter(Boolean)
      .join('\n');
    setKeysContent(cleaned);
    showToast(lang === 'vi' ? '🧹 Đã dọn dẹp các dòng trống!' : '🧹 Cleaned empty lines!');
  };

  const handleInsertTemplate = (type: 'guide' | 'warning') => {
    if (type === 'guide') {
      setDescription(
        `💡 Hướng dẫn kích hoạt Key:\n1. Mở ứng dụng và vào mục Cài đặt -> Nhập Mã Key.\n2. Dán mã Key ở trên và bấm Kích Hoạt.\n3. Nếu gặp lỗi, vui lòng liên hệ Admin qua kênh hỗ trợ.`
      );
    } else {
      setDescription(
        `⚠️ Lưu ý quan trọng:\n- Key Free có giới hạn thời gian trải nghiệm.\n- Nghiêm cấm chia sẻ hoặc bán lại key này.\n- Để sử dụng ổn định không giới hạn, hãy nâng cấp lên gói Key VIP Bản Quyền.`
      );
    }
    showToast(lang === 'vi' ? '📝 Đã chèn mẫu hướng dẫn!' : '📝 Inserted template!');
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
    const fullUrl = `${getBaseUrl()}/note/${targetSlug}`;
    navigator.clipboard.writeText(fullUrl);
    showToast(
      lang === 'vi'
        ? `📋 Đã sao chép link Note: ${fullUrl}`
        : `📋 Copied Note URL: ${fullUrl}`
    );
  };

  if (!isOpen) return null;

  // Selected App Info for preview
  const selectedApp = apps.find((a) => a.id === appId);

  // VIEW AFTER CREATED (SUCCESS POPUP)
  if (createdNoteInfo) {
    const noteUrl = `${getBaseUrl()}/note/${createdNoteInfo.slug}`;
    return (
      <ModalPortal>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.85)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999999,
            padding: '20px'
          }}
          onClick={onClose}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: 'linear-gradient(145deg, #0f172a 0%, #090e17 100%)',
              border: '1.5px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '24px',
              padding: '32px 28px',
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.8), 0 0 35px rgba(56, 189, 248, 0.2)',
              position: 'relative',
              textAlign: 'center',
              color: '#f8fafc'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#94a3b8',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                fontSize: '18px',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ×
            </button>

            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px auto',
                borderRadius: '50%',
                background: 'rgba(74, 222, 128, 0.15)',
                border: '1.5px solid rgba(74, 222, 128, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                boxShadow: '0 0 20px rgba(74, 222, 128, 0.25)'
              }}
            >
              🎉
            </div>

            <h3
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: '#4ade80',
                margin: '0 0 6px 0',
                letterSpacing: '-0.3px'
              }}
            >
              {lang === 'vi' ? 'Tạo Trang Note Thành Công!' : 'Note Created Successfully!'}
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              {lang === 'vi'
                ? 'Đường dẫn riêng cho người dùng xem Key Free đã sẵn sàng để gửi.'
                : 'Your unique link for users to view Free Keys is ready to share.'}
            </p>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px dashed rgba(56, 189, 248, 0.4)',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '20px',
                textAlign: 'left'
              }}
            >
              <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                🔗 {lang === 'vi' ? 'ĐƯỜNG DẪN RIÊNG CỦA NOTE:' : 'UNIQUE NOTE URL:'}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontFamily: "'JetBrains Mono', Consolas, monospace",
                  color: '#e0f2fe',
                  wordBreak: 'break-all',
                  background: 'rgba(2, 6, 23, 0.7)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  marginBottom: '14px',
                  fontWeight: 600
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
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span>📋</span>
                  <span>{lang === 'vi' ? 'Sao Chép Link Ngay' : 'Copy Link Now'}</span>
                </button>
                <a
                  href={`/note/${createdNoteInfo.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '12px 18px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '13px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>↗</span>
                  <span>{lang === 'vi' ? 'Mở Xem' : 'Preview'}</span>
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {lang === 'vi' ? 'Đóng Cửa Sổ' : 'Close Window'}
            </button>
          </div>
        </div>
      </ModalPortal>
    );
  }

  // MAIN EDIT / CREATE FORM MODAL
  return (
    <ModalPortal>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          zIndex: 999999,
          padding: '24px 16px',
          overflowY: 'auto'
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '92vh',
            overflowY: 'auto',
            background: 'linear-gradient(145deg, #0f172a 0%, #090e17 100%)',
            border: '1.5px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '26px',
            padding: '28px 26px',
            boxShadow: '0 30px 70px -15px rgba(0,0,0,0.85), 0 0 35px rgba(56, 189, 248, 0.15)',
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* MODAL HEADER */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '16px'
            }}
          >
            <div>
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '3px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '8px',
                  letterSpacing: '0.5px'
                }}
              >
                <span>📝</span>
                <span>{lang === 'vi' ? 'HỆ THỐNG NOTE KEY FREE ĐỘC QUYỀN' : 'EXCLUSIVE FREE KEY NOTE'}</span>
              </div>
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  margin: 0,
                  background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.3px'
                }}
              >
                {editingNote
                  ? (lang === 'vi' ? '✏️ Chỉnh Sửa Trang Note Key Free' : '✏️ Edit Free Key Note')
                  : (lang === 'vi' ? '✨ Tạo Trang Note Key Free Mới' : '✨ Create Free Key Note')}
              </h3>
              <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                {lang === 'vi'
                  ? 'Mỗi trang Note sẽ có 1 đường link riêng biệt cho người dùng xem và nhận key.'
                  : 'Each Note will have its own unique URL for users to view and copy free keys.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#94a3b8',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                fontSize: '20px',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ef4444';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.borderColor = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
              }}
            >
              ×
            </button>
          </div>

          {/* FORM CONTAINER */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* SECTION 1: THÔNG TIN CƠ BẢN & SLUG URL */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📌</span>
                <span>{lang === 'vi' ? '1. Tiêu Đề & Đường Dẫn Riêng' : '1. Title & Unique URL'}</span>
              </div>

              {/* TIÊU ĐỀ NOTE */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  {lang === 'vi' ? 'Tiêu đề Ghi Chú' : 'Note Title'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  placeholder={lang === 'vi' ? 'VD: Phát 50 Key Liên Quân Free Mùa Mới' : 'E.g., 50 Free Keys Giveaway'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #1e293b',
                    background: '#080c14',
                    color: '#fff',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* SLUG URL */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>
                    🔗 {lang === 'vi' ? 'Mã định danh đường link (Slug)' : 'Unique Slug / URL'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRandomSlug}
                    style={{
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      fontSize: '11.5px',
                      padding: '3px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    🎲 {lang === 'vi' ? 'Tạo ngẫu nhiên' : 'Randomize'}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#94a3b8',
                      fontFamily: "'JetBrains Mono', Consolas, monospace",
                      background: '#080c14',
                      border: '1px solid #1e293b',
                      padding: '11px 12px',
                      borderRadius: '10px'
                    }}
                  >
                    /note/
                  </span>
                  <input
                    type="text"
                    style={{
                      flex: 1,
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid #1e293b',
                      background: '#080c14',
                      color: '#38bdf8',
                      fontFamily: "'JetBrains Mono', Consolas, monospace",
                      fontSize: '13.5px',
                      outline: 'none'
                    }}
                    placeholder="free-lq-01"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                    required
                  />
                </div>

                {/* LINK PREVIEW BOX */}
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(2, 6, 23, 0.6)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    fontSize: '12px',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <div style={{ wordBreak: 'break-all' }}>
                    {lang === 'vi' ? 'Xem trước:' : 'Preview:'}{' '}
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                      {getBaseUrl()}/note/{slug || '...'}
                    </span>
                  </div>
                  {slug && (
                    <button
                      type="button"
                      onClick={() => copyNoteLink(slug)}
                      title={lang === 'vi' ? 'Sao chép link' : 'Copy link'}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#38bdf8',
                        cursor: 'pointer',
                        fontSize: '13px',
                        padding: '2px 4px'
                      }}
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>

              {/* CHỌN APP LIÊN KẾT */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  📱 {lang === 'vi' ? 'Ứng Dụng Liên Kết (Tùy chọn)' : 'Linked App (Optional)'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {selectedApp?.icon && (
                    <img
                      src={selectedApp.icon}
                      alt=""
                      style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }}
                    />
                  )}
                  <select
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid #1e293b',
                      background: '#080c14',
                      color: '#fff',
                      fontSize: '13.5px',
                      outline: 'none'
                    }}
                  >
                    <option value="">{lang === 'vi' ? '-- Dùng chung / Không gắn app cụ thể --' : '-- General / No specific app --'}</option>
                    {apps.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.name} ({app.cls})
                      </option>
                    ))}
                  </select>
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  {lang === 'vi'
                    ? 'Nếu chọn app, trang note sẽ tự động hiển thị logo, tên và nút tải ứng dụng đó.'
                    : 'If selected, the note page displays the app logo and download link.'}
                </span>
              </div>
            </div>

            {/* SECTION 2: DANH SÁCH MÃ KEY FREE */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🔑</span>
                  <span>{lang === 'vi' ? '2. Danh Sách Mã Key Free' : '2. Free Key Codes'}</span>
                  <span style={{ color: '#ef4444' }}>*</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCleanEmptyLines}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    🧹 {lang === 'vi' ? 'Xóa dòng trống' : 'Clean empty lines'}
                  </button>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      background: parsedKeysCount > 0 ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: parsedKeysCount > 0 ? '#4ade80' : '#ef4444',
                      border: `1px solid ${parsedKeysCount > 0 ? 'rgba(74, 222, 128, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                    }}
                  >
                    {parsedKeysCount} {lang === 'vi' ? 'mã key' : 'keys'}
                  </span>
                </div>
              </div>

              <textarea
                ref={keysInputRef}
                rows={5}
                placeholder={
                  lang === 'vi'
                    ? 'Dán danh sách mã key (mỗi dòng 1 mã):\nFREE-KEY-LQ-89A1\nFREE-KEY-LQ-98B2\nFREE-KEY-LQ-77C3'
                    : 'Paste key codes (one key per line):\nKEY-1\nKEY-2'
                }
                value={keysContent}
                onChange={(e) => setKeysContent(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #1e293b',
                  background: '#080c14',
                  color: '#4ade80',
                  fontFamily: "'JetBrains Mono', Consolas, monospace",
                  fontSize: '13px',
                  lineHeight: '1.6',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            {/* SECTION 3: HƯỚNG DẪN & GHI CHÚ */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#facc15', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💡</span>
                  <span>{lang === 'vi' ? '3. Hướng Dẫn Kích Hoạt & Lưu Ý' : '3. Instructions & Notes'}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleInsertTemplate('guide')}
                    style={{
                      background: 'rgba(234, 179, 8, 0.1)',
                      border: '1px solid rgba(234, 179, 8, 0.25)',
                      color: '#facc15',
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    + Mẫu kích hoạt
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTemplate('warning')}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#f87171',
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    + Mẫu cảnh báo
                  </button>
                </div>
              </div>

              <textarea
                rows={3}
                placeholder={lang === 'vi' ? 'Nhập nội dung hướng dẫn cho khách hàng xem...' : 'Enter usage guide for users...'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #1e293b',
                  background: '#080c14',
                  color: '#cbd5e1',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* SECTION 4: HẠN DÙNG, GIỚI HẠN LƯỢT XEM & MẬT KHẨU */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚙️</span>
                <span>{lang === 'vi' ? '4. Cài Đặt Nâng Cao & Bảo Mật' : '4. Advanced Settings & Security'}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* HẠN DÙNG */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    ⏳ {lang === 'vi' ? 'Hạn Tự Hủy / Hết Hạn' : 'Expiration'}
                  </label>
                  <select
                    value={expiresType}
                    onChange={(e) => setExpiresType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid #1e293b',
                      background: '#080c14',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
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
                      value={customExpiresAt}
                      onChange={(e) => setCustomExpiresAt(e.target.value)}
                      style={{
                        width: '100%',
                        marginTop: '8px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid #1e293b',
                        background: '#080c14',
                        color: '#fff',
                        fontSize: '12.5px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  )}
                </div>

                {/* GIỚI HẠN LƯỢT XEM */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    👁️ {lang === 'vi' ? 'Giới Hạn Lượt Xem' : 'Max Views Limit'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder={lang === 'vi' ? 'Để trống = Vô hạn' : 'Empty = Unlimited'}
                    value={maxViews}
                    onChange={(e) => setMaxViews(e.target.value ? Number(e.target.value) : '')}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid #1e293b',
                      background: '#080c14',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* MẬT KHẨU BẢO VỆ */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  🔒 {lang === 'vi' ? 'Mật Khẩu Mở Khóa Note (Tùy chọn)' : 'Password Protection (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'vi' ? 'Để trống nếu muốn ai có link cũng xem được' : 'Leave empty for public access'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #1e293b',
                    background: '#080c14',
                    color: '#facc15',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  {lang === 'vi'
                    ? 'Nếu đặt mật khẩu, người xem phải nhập đúng mật khẩu này mới xem được key.'
                    : 'If set, users must enter this password to view keys.'}
                </span>
              </div>

              {/* TRẠNG THÁI HOẠT ĐỘNG */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: active ? 'rgba(74, 222, 128, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: `1px solid ${active ? 'rgba(74, 222, 128, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                  cursor: 'pointer'
                }}
                onClick={() => setActive(!active)}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#22c55e', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 700, color: active ? '#4ade80' : '#f87171' }}>
                  {active
                    ? (lang === 'vi' ? '🟢 Kích hoạt trang Note ngay lập tức' : '🟢 Note is Active')
                    : (lang === 'vi' ? '🔴 Tạm dừng chia sẻ Note này' : '🔴 Note is Inactive')}
                </span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 20px rgba(2, 132, 199, 0.35)',
                  transition: 'all 0.2s ease'
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
                onClick={onClose}
                style={{
                  padding: '14px 24px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(255,255,255,0.12)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
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
