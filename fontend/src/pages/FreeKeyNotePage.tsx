import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { FreeKeyNoteItem, SystemConfig, Language } from '../types';
import { fetchPublicNoteFromBackend, verifyNotePasswordInBackend } from '../services/api';
import { copyTextToClipboard } from '../utils/clipboard';

interface FreeKeyNotePageProps {
  config: SystemConfig;
  lang: Language;
  dark: boolean;
  setDark: (dark: boolean) => void;
  showToast: (msg: string) => void;
}

export function FreeKeyNotePage({
  config,
  lang,
  dark,
  setDark,
  showToast
}: FreeKeyNotePageProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [note, setNote] = useState<FreeKeyNoteItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Password unlock state
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Copied state tracking
  const [copiedKeyIndex, setCopiedKeyIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Time remaining string
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');

  const loadNote = useCallback(async (pw?: string) => {
    if (!slug) return;
    setIsLoading(true);
    setPasswordError('');
    try {
      const data = await fetchPublicNoteFromBackend(slug, pw);
      if (data) {
        setNote(data);
      } else {
        setNote({
          id: '',
          slug: slug,
          title: '',
          keyCount: 0,
          viewCount: 0,
          active: false,
          status: 'NOT_FOUND',
          message: lang === 'vi' ? 'Không tìm thấy trang ghi chú này.' : 'Note not found.'
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [slug, lang]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  // Countdown Timer
  useEffect(() => {
    if (!note?.expiresAt || note.status !== 'ACTIVE') {
      setTimeLeftStr('');
      return;
    }

    const updateTimer = () => {
      const diff = new Date(note.expiresAt!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeftStr(lang === 'vi' ? 'Đã hết hạn' : 'Expired');
        setNote((prev) => (prev ? { ...prev, status: 'EXPIRED' } : null));
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      if (days > 0) {
        setTimeLeftStr(`${days}d ${hours}h ${minutes}m`);
      } else {
        setTimeLeftStr(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [note?.expiresAt, note?.status, lang]);

  // Handle Password Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !passwordInput.trim()) {
      setPasswordError(lang === 'vi' ? 'Vui lòng nhập mật khẩu!' : 'Please enter password!');
      return;
    }

    setIsVerifying(true);
    setPasswordError('');
    try {
      const res = await verifyNotePasswordInBackend(slug, passwordInput.trim());
      if (res && res.status === 'ACTIVE') {
        setNote(res);
        showToast(lang === 'vi' ? '🔓 Đã mở khóa ghi chú thành công!' : '🔓 Note unlocked successfully!');
      } else {
        setPasswordError(res?.message || (lang === 'vi' ? 'Mật khẩu không chính xác!' : 'Invalid password!'));
      }
    } catch (err: any) {
      setPasswordError(err?.message || 'Lỗi kiểm tra mật khẩu');
    } finally {
      setIsVerifying(false);
    }
  };

  // Copy Single Key
  const handleCopyKey = async (code: string, index: number) => {
    const success = await copyTextToClipboard(code);
    if (success) {
      setCopiedKeyIndex(index);
      setTimeout(() => setCopiedKeyIndex(null), 2000);
      showToast(
        lang === 'vi' ? `📋 Đã sao chép mã Key: ${code}` : `📋 Copied Key: ${code}`
      );
    }
  };

  // Copy All Keys
  const handleCopyAllKeys = async () => {
    if (!note?.keysList || note.keysList.length === 0) return;
    const allText = note.keysList.join('\n');
    const success = await copyTextToClipboard(allText);
    if (success) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
      showToast(
        lang === 'vi'
          ? `📋 Đã sao chép tất cả ${note.keysList.length} mã Key!`
          : `📋 Copied all ${note.keysList.length} keys!`
      );
    }
  };

  // Copy Note Link
  const handleCopyNoteLink = async () => {
    const url = window.location.href;
    const success = await copyTextToClipboard(url);
    if (success) {
      showToast(
        lang === 'vi' ? '🔗 Đã sao chép đường dẫn Note!' : '🔗 Copied Note link!'
      );
    }
  };

  // Share via Social
  const shareToTelegram = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`🎁 Nhận Key Free tại: ${note?.title || 'Note Key Free'}`);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  return (
    <div
      className={`free-note-page-wrapper ${dark ? 'dark' : 'light'}`}
      style={{
        minHeight: '100vh',
        background: dark
          ? 'radial-gradient(circle at 50% 10%, #0f172a 0%, #020617 100%)'
          : 'radial-gradient(circle at 50% 10%, #f8fafc 0%, #e2e8f0 100%)',
        color: dark ? '#f8fafc' : '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {/* TOP NAVBAR */}
      <header
        style={{
          borderBottom: dark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
          background: dark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}
      >
        <div
          style={{
            maxWidth: '860px',
            margin: '0 auto',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            {config.faviconUrl ? (
              <img
                src={config.faviconUrl}
                alt=""
                style={{ width: '28px', height: '28px', borderRadius: '6px' }}
              />
            ) : (
              <span style={{ fontSize: '22px' }}>⚡</span>
            )}
            <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.3px' }}>
              {config.brandName || 'MOD LIÊN QUÂN'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setDark(!dark)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-dark)',
                borderRadius: '8px',
                padding: '6px 12px',
                color: 'inherit',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {dark ? '☀' : '☾'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 14px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🏠</span>
              <span>{lang === 'vi' ? 'Về Trang Chủ' : 'Home'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main style={{ flex: 1, padding: '30px 16px', maxWidth: '780px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* 1. LOADING SKELETON */}
        {isLoading && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              borderRadius: '20px',
              background: dark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.6)',
              border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)'
            }}
          >
            <div className="spinner-glow" style={{ width: '40px', height: '40px', margin: '0 auto 16px auto' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted-dark)' }}>
              ⚡ {lang === 'vi' ? 'Đang tải thông tin trang Note...' : 'Loading Free Key Note...'}
            </div>
          </div>
        )}

        {/* 2. PASSWORD LOCKED VIEW */}
        {!isLoading && note?.status === 'LOCKED' && (
          <div
            style={{
              padding: '36px 24px',
              borderRadius: '20px',
              background: dark
                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid rgba(234, 179, 8, 0.35)',
              boxShadow: '0 12px 36px rgba(234, 179, 8, 0.1)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px auto',
                borderRadius: '50%',
                background: 'rgba(234, 179, 8, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                border: '1px solid rgba(234, 179, 8, 0.4)'
              }}
            >
              🔒
            </div>

            <div
              style={{
                display: 'inline-block',
                background: 'rgba(234, 179, 8, 0.15)',
                color: '#facc15',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                padding: '3px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 'bold',
                marginBottom: '10px'
              }}
            >
              {lang === 'vi' ? 'GHI CHÚ BẢO MẬT' : 'PASSWORD PROTECTED'}
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0' }}>
              {note.title}
            </h2>

            <p style={{ fontSize: '13.5px', color: 'var(--text-muted-dark)', maxWidth: '440px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
              {lang === 'vi'
                ? 'Người tạo đã cài đặt mật khẩu để bảo vệ danh sách mã Key Free này. Vui lòng nhập đúng mật khẩu để mở khóa.'
                : 'This note is protected by a password. Please enter the password to view the keys.'}
            </p>

            <form
              onSubmit={handlePasswordSubmit}
              style={{ maxWidth: '340px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <input
                type="password"
                className="admin-input-field"
                placeholder={lang === 'vi' ? 'Nhập mật khẩu mở khóa...' : 'Enter password...'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                style={{
                  textAlign: 'center',
                  fontSize: '15px',
                  letterSpacing: '2px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  borderColor: passwordError ? '#ef4444' : undefined
                }}
                autoFocus
              />

              {passwordError && (
                <div style={{ color: '#ef4444', fontSize: '12.5px', fontWeight: 600 }}>
                  ⚠️ {passwordError}
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: isVerifying ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(234, 179, 8, 0.3)'
                }}
              >
                {isVerifying
                  ? (lang === 'vi' ? '⏳ Đang kiểm tra...' : '⏳ Verifying...')
                  : (lang === 'vi' ? '🔓 Mở Khóa Ghi Chú' : '🔓 Unlock Note')}
              </button>
            </form>
          </div>
        )}

        {/* 3. ERROR / EXPIRED / LIMIT_REACHED / INACTIVE / NOT_FOUND VIEWS */}
        {!isLoading && note && note.status !== 'ACTIVE' && note.status !== 'LOCKED' && (
          <div
            style={{
              padding: '40px 24px',
              borderRadius: '20px',
              background: dark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
              border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '14px' }}>
              {note.status === 'EXPIRED' ? '⏳' : note.status === 'LIMIT_REACHED' ? '🚫' : '⚠️'}
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 10px 0', color: '#ef4444' }}>
              {note.status === 'EXPIRED'
                ? (lang === 'vi' ? 'Trang Note Đã Hết Hạn' : 'Note Has Expired')
                : note.status === 'LIMIT_REACHED'
                ? (lang === 'vi' ? 'Đã Đạt Giới Hạn Lượt Xem' : 'View Limit Reached')
                : (lang === 'vi' ? 'Trang Note Không Khả Dụng' : 'Note Unavailable')}
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted-dark)', maxWidth: '460px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
              {note.message || (lang === 'vi' ? 'Trang ghi chú này hiện không thể truy cập.' : 'This note is currently inaccessible.')}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate('/')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer'
                }}
              >
                🏠 {lang === 'vi' ? 'Về Trang Chủ Khám Phá' : 'Go to Homepage'}
              </button>
            </div>
          </div>
        )}

        {/* 4. ACTIVE NOTE VIEW (MAIN SUCCESSFUL DISPLAY) */}
        {!isLoading && note && note.status === 'ACTIVE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* HERO CARD */}
            <div
              style={{
                padding: '24px',
                borderRadius: '20px',
                background: dark
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)'
                  : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                boxShadow: dark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <div
                  style={{
                    background: 'rgba(74, 222, 128, 0.15)',
                    color: '#4ade80',
                    border: '1px solid rgba(74, 222, 128, 0.3)',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11.5px',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                  {lang === 'vi' ? 'KEY FREE CHÍNH THỨC' : 'OFFICIAL FREE KEY'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-muted-dark)' }}>
                  {timeLeftStr && (
                    <span
                      style={{
                        background: 'rgba(234, 179, 8, 0.15)',
                        color: '#facc15',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 600
                      }}
                    >
                      ⏳ {timeLeftStr}
                    </span>
                  )}
                </div>
              </div>

              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 10px 0', lineHeight: '1.3' }}>
                {note.title}
              </h1>

              {/* LINKED APPS LIST (SUPPORTS MULTIPLE APPS) */}
              {note.linkedApps && note.linkedApps.length > 0 ? (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted-dark)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                    📱 {lang === 'vi' ? `ỨNG DỤNG ÁP DỤNG (${note.linkedApps.length}):` : `APPLIED APPS (${note.linkedApps.length}):`}
                  </div>
                  {note.linkedApps.map((appItem) => {
                    const isIos = appItem.platform === 'ios' || (!appItem.downloadUrl && Boolean(appItem.ipaUrl));
                    const isAndroid = appItem.platform === 'android' || (!appItem.ipaUrl && Boolean(appItem.downloadUrl));

                    return (
                      <div
                        key={appItem.id}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '12px',
                          background: dark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(241, 245, 249, 0.8)',
                          border: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {appItem.icon && (
                            <img
                              src={appItem.icon}
                              alt=""
                              style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'cover' }}
                            />
                          )}
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>
                              {appItem.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted-dark)' }}>
                              {appItem.platform === 'ios' ? '🍎 Bản Mod iOS' : appItem.platform === 'android' ? '🤖 Bản Mod Android' : '⚡ Hỗ trợ Đa nền tảng'}
                            </div>
                          </div>
                        </div>

                        {/* DOWNLOAD BUTTON FOR THIS APP */}
                        {isIos && appItem.ipaUrl && (
                          <a
                            href={appItem.ipaUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: '7px 14px',
                              borderRadius: '9px',
                              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(147, 51, 234, 0.3) 100%)',
                              color: '#c084fc',
                              border: '1px solid rgba(168, 85, 247, 0.4)',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            🍏 {lang === 'vi' ? 'Tải iOS (IPA)' : 'Download iOS'}
                          </a>
                        )}

                        {isAndroid && appItem.downloadUrl && (
                          <a
                            href={appItem.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: '7px 14px',
                              borderRadius: '9px',
                              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(2, 132, 199, 0.3) 100%)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.4)',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            📥 {lang === 'vi' ? 'Tải Android (APK)' : 'Download APK'}
                          </a>
                        )}

                        {!isIos && !isAndroid && (appItem.downloadUrl || appItem.ipaUrl) && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {appItem.downloadUrl && (
                              <a
                                href={appItem.downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  textDecoration: 'none'
                                }}
                              >
                                📥 Tải APK
                              </a>
                            )}
                            {appItem.ipaUrl && (
                              <a
                                href={appItem.ipaUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  background: 'rgba(168, 85, 247, 0.15)',
                                  color: '#c084fc',
                                  border: '1px solid rgba(168, 85, 247, 0.3)',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  textDecoration: 'none'
                                }}
                              >
                                🍏 Tải IPA
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : note.appName ? (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: dark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(241, 245, 249, 0.8)',
                    border: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {note.appIcon && (
                      <img
                        src={note.appIcon}
                        alt=""
                        style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }}
                      />
                    )}
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted-dark)', textTransform: 'uppercase', fontWeight: 600 }}>
                        {lang === 'vi' ? 'ỨNG DỤNG ÁP DỤNG' : 'APPLIED APPLICATION'}
                      </div>
                      <div style={{ fontSize: '14.5px', fontWeight: 700 }}>
                        {note.appName}
                      </div>
                    </div>
                  </div>

                  {/* DEDICATED APP DOWNLOAD BUTTON */}
                  {(() => {
                    const isIos = note.platform === 'ios' || (!note.downloadUrl && Boolean(note.ipaUrl));
                    const isAndroid = note.platform === 'android' || (!note.ipaUrl && Boolean(note.downloadUrl));

                    if (isIos && note.ipaUrl) {
                      return (
                        <a
                          href={note.ipaUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: '8px 14px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(147, 51, 234, 0.3) 100%)',
                            color: '#c084fc',
                            border: '1px solid rgba(168, 85, 247, 0.4)',
                            fontSize: '13px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 10px rgba(168, 85, 247, 0.2)'
                          }}
                        >
                          🍏 {lang === 'vi' ? 'Tải Ứng Dụng (iOS IPA)' : 'Download for iOS'}
                        </a>
                      );
                    }

                    if (isAndroid && note.downloadUrl) {
                      return (
                        <a
                          href={note.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: '8px 14px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(2, 132, 199, 0.3) 100%)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            fontSize: '13px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 10px rgba(56, 189, 248, 0.2)'
                          }}
                        >
                          📥 {lang === 'vi' ? 'Tải Ứng Dụng (Android APK)' : 'Download for Android'}
                        </a>
                      );
                    }

                    return null;
                  })()}
                </div>
              ) : null}
            </div>

            {/* FREE KEYS BOX */}
            <div
              style={{
                padding: '24px',
                borderRadius: '20px',
                background: dark
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.7) 100%)'
                  : 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, #ffffff 100%)',
                border: '1.5px solid rgba(34, 197, 94, 0.35)',
                boxShadow: '0 8px 28px rgba(34, 197, 94, 0.12)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                    🔑 {lang === 'vi' ? 'MÃ KEY FREE KHẢ DỤNG' : 'AVAILABLE FREE KEYS'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)', marginTop: '2px' }}>
                    {lang === 'vi'
                      ? `Có tổng cộng ${note.keysList?.length || 1} mã key trong ghi chú này:`
                      : `Total ${note.keysList?.length || 1} key code(s) available:`}
                  </div>
                </div>

                {note.keysList && note.keysList.length > 1 && (
                  <button
                    type="button"
                    onClick={handleCopyAllKeys}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      background: copiedAll ? '#10b981' : 'rgba(34, 197, 94, 0.2)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {copiedAll
                      ? (lang === 'vi' ? '✅ Đã Chép Tất Cả!' : '✅ Copied All!')
                      : `📋 ${lang === 'vi' ? 'Sao Chép Tất Cả Key' : 'Copy All Keys'}`}
                  </button>
                )}
              </div>

              {/* KEYS CARDS LIST */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {note.keysList && note.keysList.length > 0 ? (
                  note.keysList.map((keyCode, idx) => {
                    const isCopiedThis = copiedKeyIndex === idx;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: dark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(241, 245, 249, 0.9)',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          border: isCopiedThis
                            ? '1px solid #22c55e'
                            : dark ? '1px dashed rgba(34, 197, 94, 0.35)' : '1px solid rgba(34, 197, 94, 0.3)',
                          transition: 'all 0.2s ease',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#86efac',
                              background: 'rgba(34, 197, 94, 0.15)',
                              padding: '2px 8px',
                              borderRadius: '6px'
                            }}
                          >
                            #{idx + 1}
                          </span>
                          <span
                            onClick={() => handleCopyKey(keyCode, idx)}
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '16px',
                              fontWeight: 'bold',
                              color: '#4ade80',
                              letterSpacing: '1px',
                              wordBreak: 'break-all',
                              cursor: 'pointer'
                            }}
                            title={lang === 'vi' ? 'Ấn để sao chép' : 'Click to copy'}
                          >
                            {keyCode}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyKey(keyCode, idx)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: 'none',
                            background: isCopiedThis
                              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                              : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.25)'
                          }}
                        >
                          {isCopiedThis
                            ? (lang === 'vi' ? '✅ Đã Chép!' : '✅ Copied!')
                            : `📋 ${lang === 'vi' ? 'Sao Chép' : 'Copy'}`}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted-dark)' }}>
                    Chưa có mã key nào trong ghi chú này.
                  </div>
                )}
              </div>
            </div>

            {/* INSTRUCTIONS / DESCRIPTION */}
            {note.description && (
              <div
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  background: dark ? 'rgba(30, 41, 59, 0.45)' : '#ffffff',
                  border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                  lineHeight: '1.7',
                  fontSize: '13.5px'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#facc15', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💡</span>
                  <span>{lang === 'vi' ? 'HƯỚNG DẪN & LƯU Ý TỪ ADMIN:' : 'INSTRUCTIONS & NOTES:'}</span>
                </div>
                <div style={{ whiteSpace: 'pre-line', color: dark ? '#cbd5e1' : '#475569' }}>
                  {note.description}
                </div>
              </div>
            )}

            {/* UP-SELL VIP KEY BANNER */}
            <div
              style={{
                padding: '20px 24px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px'
              }}
            >
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                  👑 {lang === 'vi' ? 'Bạn cần Key Bản Quyền VIP Ổn Định 100%?' : 'Need 100% Stable VIP Key?'}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted-dark)' }}>
                  {lang === 'vi'
                    ? 'Không lo bị tranh lượt kích hoạt, cập nhật nhanh nhất, hỗ trợ 24/7.'
                    : 'Unlimited duration, no activation conflicts, instant update.'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/')}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                }}
              >
                🛒 {lang === 'vi' ? 'Mua Key VIP Ngay' : 'Buy VIP Key'}
              </button>
            </div>

            {/* SHARE ACTION BAR */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                paddingTop: '10px'
              }}
            >
              <button
                type="button"
                onClick={handleCopyNoteLink}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                  background: dark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                  color: 'inherit',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🔗</span>
                <span>{lang === 'vi' ? 'Sao Chép Link Note' : 'Copy Note URL'}</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={shareToTelegram}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#229ed9',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ✈ Telegram
                </button>
                <button
                  type="button"
                  onClick={shareToFacebook}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#1877f2',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  Facebook
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: dark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
          padding: '20px 16px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--text-muted-dark)'
        }}
      >
        <div>
          © {new Date().getFullYear()} {config.brandName || 'MOD LIÊN QUÂN'}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
