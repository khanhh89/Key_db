import { useState, useRef } from 'react';
import type { Language, SystemConfig } from '../../types';
import '../../admin/admin.css';

interface LoginPageProps {
  lang: Language;
  config?: SystemConfig;
  onLogin: (username: string, pass: string, otpCode?: string, setupSecret?: string) => Promise<any>;
  onBackToSite: () => void;
}

export function LoginPage({ lang, config, onLogin, onBackToSite }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [requires2FA, setRequires2FA] = useState(false);
  const [requiresSetup2FA, setRequiresSetup2FA] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Field validation rules
  const usernameError = !username.trim()
    ? (lang === 'vi' ? 'Vui lòng nhập tên đăng nhập!' : 'Username is required!')
    : username.trim().length < 3
    ? (lang === 'vi' ? 'Tên đăng nhập phải có ít nhất 3 ký tự!' : 'Username must be at least 3 characters!')
    : '';

  const passwordError = !password.trim()
    ? (lang === 'vi' ? 'Vui lòng nhập mật khẩu!' : 'Password is required!')
    : password.trim().length < 4
    ? (lang === 'vi' ? 'Mật khẩu phải có ít nhất 4 ký tự!' : 'Password must be at least 4 characters!')
    : '';

  const isUsernameValid = username.trim().length >= 3 && !usernameError;
  const isPasswordValid = password.trim().length >= 4 && !passwordError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameTouched(true);
    setPasswordTouched(true);

    if (usernameError) {
      usernameInputRef.current?.focus();
      return;
    }
    if (passwordError) {
      passwordInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onLogin(username.trim(), password.trim(), otpCode.trim(), setupSecret);
      if (res && res.success) {
        if (res.requiresSetup2FA) {
          setRequiresSetup2FA(true);
          setQrUrl(res.qrUrl);
          setSetupSecret(res.setupSecret);
        } else if (res.requires2FA) {
          setRequires2FA(true);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="login-card">
        <div className="login-header">
          {config?.faviconUrl ? (
            <img
              src={config.faviconUrl}
              alt="Logo"
              style={{ width: '54px', height: '54px', borderRadius: '14px', objectFit: 'cover', margin: '0 auto 14px', display: 'block', border: '2px solid #00f2fe', boxShadow: '0 0 20px rgba(0, 242, 254, 0.4)' }}
            />
          ) : (
            <div className="login-logo">🛡️</div>
          )}
          <h2>{lang === 'vi' ? 'ĐĂNG NHẬP ADMIN' : 'ADMIN LOGIN'}</h2>
          <p>
            {lang === 'vi'
              ? `Hệ thống Quản trị & Phân quyền ${config?.brandName || 'MOD LIÊN QUÂN'}`
              : `${config?.brandName || 'MOD LIÊN QUÂN'} System Management & Authorization`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
          {(requires2FA || requiresSetup2FA) ? (
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <h3 style={{ color: '#00f2fe', marginBottom: '10px', fontSize: '18px' }}>{lang === 'vi' ? 'BẢO MẬT 2 LỚP (2FA)' : '2-STEP VERIFICATION'}</h3>
              {requiresSetup2FA && (
                <div style={{ marginBottom: '15px', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '10px' }}>
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '10px', lineHeight: '1.5' }}>
                    {lang === 'vi' ? 'Quét mã QR này bằng ứng dụng Google Authenticator hoặc Authy:' : 'Scan this QR with Google Authenticator or Authy:'}
                  </p>
                  {qrUrl && <img src={qrUrl} alt="QR Code" style={{ width: '150px', height: '150px', borderRadius: '8px', border: '3px solid #fff' }} />}
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                    Secret Key: <span style={{ color: '#00f2fe', fontWeight: 'bold' }}>{setupSecret}</span>
                  </p>
                </div>
              )}
              <div className="form-field">
                <label style={{ display: 'flex', justifyContent: 'center' }}>
                  <span>{lang === 'vi' ? 'NHẬP MÃ OTP 6 SỐ:' : 'ENTER 6-DIGIT OTP:'}</span>
                </label>
                <input
                  type="text"
                  value={otpCode}
                  placeholder="------"
                  maxLength={6}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '5px' }}
                  autoComplete="off"
                  autoFocus
                />
              </div>
            </div>
          ) : (
            <>
          {/* USERNAME FIELD WITH VALIDATION STATUS */}
          <div className="form-field">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{lang === 'vi' ? 'TÊN ĐĂNG NHẬP:' : 'USERNAME:'}</span>
              {usernameTouched && (
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: isUsernameValid ? '#10b981' : '#ef4444' }}>
                  {isUsernameValid ? '✓ Hợp lệ' : '✕ Chưa hợp lệ'}
                </span>
              )}
            </label>
            <input
              type="text"
              ref={usernameInputRef}
              value={username}
              placeholder={lang === 'vi' ? 'Nhập tên đăng nhập Admin...' : 'Enter Admin username...'}
              onChange={(e) => {
                setUsername(e.target.value);
                if (!usernameTouched) setUsernameTouched(true);
              }}
              onBlur={() => setUsernameTouched(true)}
              style={{
                borderColor: usernameTouched ? (isUsernameValid ? '#10b981' : '#ef4444') : undefined,
                boxShadow: usernameTouched ? (isUsernameValid ? '0 0 8px rgba(16,185,129,0.3)' : '0 0 8px rgba(239,68,68,0.3)') : undefined
              }}
              autoComplete="off"
            />
            {usernameTouched && usernameError && (
              <small style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '4px', display: 'block', fontWeight: 500 }}>
                ✕ {usernameError}
              </small>
            )}
            {usernameTouched && isUsernameValid && (
              <small style={{ color: '#10b981', fontSize: '11.5px', marginTop: '4px', display: 'block', fontWeight: 500 }}>
                ✓ {lang === 'vi' ? 'Tên đăng nhập đã hợp lệ' : 'Username is valid'}
              </small>
            )}
          </div>

          {/* PASSWORD FIELD WITH VALIDATION STATUS */}
          <div className="form-field">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{lang === 'vi' ? 'MẬT KHẨU:' : 'PASSWORD:'}</span>
              {passwordTouched && (
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: isPasswordValid ? '#10b981' : '#ef4444' }}>
                  {isPasswordValid ? '✓ Hợp lệ' : '✕ Chưa hợp lệ'}
                </span>
              )}
            </label>
            <input
              type="password"
              ref={passwordInputRef}
              value={password}
              placeholder={lang === 'vi' ? 'Nhập mật khẩu Admin...' : 'Enter Admin password...'}
              onChange={(e) => {
                setPassword(e.target.value);
                if (!passwordTouched) setPasswordTouched(true);
              }}
              onBlur={() => setPasswordTouched(true)}
              style={{
                borderColor: passwordTouched ? (isPasswordValid ? '#10b981' : '#ef4444') : undefined,
                boxShadow: passwordTouched ? (isPasswordValid ? '0 0 8px rgba(16,185,129,0.3)' : '0 0 8px rgba(239,68,68,0.3)') : undefined
              }}
              autoComplete="off"
            />
            {passwordTouched && passwordError && (
              <small style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '4px', display: 'block', fontWeight: 500 }}>
                ✕ {passwordError}
              </small>
            )}
            {passwordTouched && isPasswordValid && (
              <small style={{ color: '#10b981', fontSize: '11.5px', marginTop: '4px', display: 'block', fontWeight: 500 }}>
                ✓ {lang === 'vi' ? 'Định dạng mật khẩu đã hợp lệ' : 'Password format is valid'}
              </small>
            )}
          </div>

            </>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={isSubmitting || ((requires2FA || requiresSetup2FA) && otpCode.length !== 6)}
            style={{ opacity: (isSubmitting || ((requires2FA || requiresSetup2FA) && otpCode.length !== 6)) ? 0.7 : 1, cursor: (isSubmitting || ((requires2FA || requiresSetup2FA) && otpCode.length !== 6)) ? 'not-allowed' : 'pointer' }}
          >
            {isSubmitting
              ? (lang === 'vi' ? '⏳ Đang kiểm tra xác thực...' : '⏳ Authenticating...')
              : (requires2FA || requiresSetup2FA)
              ? (lang === 'vi' ? '✓ XÁC NHẬN MÃ OTP' : 'VERIFY OTP')
              : (lang === 'vi' ? '🔓 ĐĂNG NHẬP HỆ THỐNG' : 'LOGIN TO PORTAL')}
          </button>
        </form>

        <button className="back-to-site-btn" onClick={onBackToSite}>
          ← {lang === 'vi' ? 'Quay lại Trang Chủ' : 'Back to Public Site'}
        </button>
      </div>
    </div>
  );
}
