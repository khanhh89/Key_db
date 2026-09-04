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
      } else {
        if (requires2FA || requiresSetup2FA) {
          setOtpCode('');
          setTimeout(() => {
            document.getElementById('otp-0')?.focus();
          }, 100);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen grid place-items-center bg-[radial-gradient(circle_at_top_right,#1e1b4b,#080c14_60%)] p-5">
      <div className="w-[min(420px,100%)] bg-[#0f172a]/85 border border-[#38bdf8]/20 rounded-[28px] px-8 py-10 backdrop-blur-[20px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] flex flex-col gap-6">
        <div className="text-center">
          {config?.faviconUrl ? (
            <img
              src={config.faviconUrl}
              alt="Logo"
              className="w-[54px] h-[54px] rounded-[14px] object-cover mx-auto mb-3.5 block border-2 border-[#00f2fe] shadow-[0_0_20px_rgba(0,242,254,0.4)]"
            />
          ) : (
            <div className="text-[32px] mb-3">🛡️</div>
          )}
          <h2 className="font-heading text-2xl font-extrabold m-0 mb-1.5 bg-gradient-to-r from-[#38bdf8] to-[#818cf8] bg-clip-text text-transparent">
            {lang === 'vi' ? 'ĐĂNG NHẬP ADMIN' : 'ADMIN LOGIN'}
          </h2>
          <p className="text-[#94a3b8] text-[13px] m-0">
            {lang === 'vi'
              ? `Hệ thống Quản trị & Phân quyền ${config?.brandName || 'MOD LIÊN QUÂN'}`
              : `${config?.brandName || 'MOD LIÊN QUÂN'} System Management & Authorization`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]" autoComplete="off">
          {(requires2FA || requiresSetup2FA) ? (
            <div className="text-center mb-4">
              <h3 className="text-[#00f2fe] mb-2.5 text-lg">{lang === 'vi' ? 'BẢO MẬT 2 LỚP (2FA)' : '2-STEP VERIFICATION'}</h3>
              {requiresSetup2FA && (
                <div className="mb-4 bg-black/30 p-4 rounded-[10px]">
                  <p className="text-[13px] text-[#94a3b8] mb-2.5 leading-relaxed">
                    {lang === 'vi' ? 'Quét mã QR này bằng ứng dụng Google Authenticator hoặc Authy:' : 'Scan this QR with Google Authenticator or Authy:'}
                  </p>
                  {qrUrl && <img src={qrUrl} alt="QR Code" className="w-[150px] h-[150px] rounded-lg border-[3px] border-white" />}
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                    Secret Key: <span style={{ color: '#00f2fe', fontWeight: 'bold' }}>{setupSecret}</span>
                  </p>
                </div>
              )}
              <div className="form-field">
                <label style={{ display: 'flex', justifyContent: 'center' }}>
                  <span>{lang === 'vi' ? 'NHẬP MÃ OTP 6 SỐ:' : 'ENTER 6-DIGIT OTP:'}</span>
                </label>
                <div className="otp-container" onPaste={(e) => {
                  e.preventDefault();
                  const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                  setOtpCode(text);
                  if (text.length > 0) {
                    document.getElementById(`otp-${Math.min(text.length, 5)}`)?.focus();
                  }
                }}>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otpCode[index] || ''}
                      autoComplete="off"
                      autoFocus={index === 0}
                      className={`otp-box ${otpCode[index] ? 'has-value' : ''}`}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val) {
                          const newOtp = otpCode.split('');
                          newOtp[index] = val.slice(-1);
                          setOtpCode(newOtp.join(''));
                          if (index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
                        } else {
                          const newOtp = otpCode.split('');
                          newOtp[index] = '';
                          setOtpCode(newOtp.join(''));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
                          document.getElementById(`otp-${index - 1}`)?.focus();
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* USERNAME FIELD WITH VALIDATION STATUS */}
              <div className="flex flex-col gap-2">
                <label className="flex justify-between items-center text-xs font-bold text-[#cbd5e1] tracking-[0.5px]">
                  <span>{lang === 'vi' ? 'TÊN ĐĂNG NHẬP:' : 'USERNAME:'}</span>
                  {usernameTouched && (
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: isUsernameValid ? '#10b981' : '#ef4444' }}>
                      {isUsernameValid ? '✓ Hợp lệ' : '✕ Chưa hợp lệ'}
                    </span>
                  )}
                </label>
                <input
                  className="px-4 py-3.5 rounded-xl border border-[#1e293b] bg-[#090d16] text-white text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-4 focus:ring-[#38bdf8]/15"
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
              <div className="flex flex-col gap-2">
                <label className="flex justify-between items-center text-xs font-bold text-[#cbd5e1] tracking-[0.5px]">
                  <span>{lang === 'vi' ? 'MẬT KHẨU:' : 'PASSWORD:'}</span>
                  {passwordTouched && (
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: isPasswordValid ? '#10b981' : '#ef4444' }}>
                      {isPasswordValid ? '✓ Hợp lệ' : '✕ Chưa hợp lệ'}
                    </span>
                  )}
                </label>
                <input
                  className="px-4 py-3.5 rounded-xl border border-[#1e293b] bg-[#090d16] text-white text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-4 focus:ring-[#38bdf8]/15"
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
            className="p-4 rounded-xl border-0 bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white font-heading font-extrabold text-base cursor-pointer transition-all duration-250 shadow-[0_4px_20px_rgba(56,189,248,0.3)] hover:-translate-y-[2px] hover:shadow-[0_8px_25px_rgba(56,189,248,0.5)] disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={isSubmitting || ((requires2FA || requiresSetup2FA) && otpCode.length !== 6)}
          >
            {isSubmitting
              ? (lang === 'vi' ? '⏳ Đang kiểm tra xác thực...' : '⏳ Authenticating...')
              : (requires2FA || requiresSetup2FA)
                ? (lang === 'vi' ? '✓ XÁC NHẬN MÃ OTP' : 'VERIFY OTP')
                : (lang === 'vi' ? '🔓 ĐĂNG NHẬP HỆ THỐNG' : 'LOGIN TO PORTAL')}
          </button>
        </form>

        <button className="bg-transparent border border-[#1e293b] text-[#94a3b8] p-2.5 rounded-xl text-[13px] font-semibold cursor-pointer transition-all duration-200 hover:bg-[#1e293b] hover:text-white" onClick={onBackToSite}>
          ← {lang === 'vi' ? 'Quay lại Trang Chủ' : 'Back to Public Site'}
        </button>
      </div>
    </div>
  );
}
