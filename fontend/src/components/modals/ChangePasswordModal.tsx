import React, { useState } from 'react';
import type { Language } from '../../types';
import { changeAdminPasswordInBackend } from '../../services/api';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  showToast: (msg: string) => void;
}

export function ChangePasswordModal({ isOpen, onClose, lang, showToast }: ChangePasswordModalProps) {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const passwordsMatch = confirmPass.length > 0 && newPass === confirmPass;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Verify new password length
    if (!newPass.trim() || newPass.trim().length < 4) {
      setError(lang === 'vi' ? '❌ Mật khẩu mới phải có ít nhất 4 ký tự!' : '❌ New password must be at least 4 characters!');
      return;
    }

    // 2. Verify confirmation password matches
    if (newPass !== confirmPass) {
      setError(lang === 'vi' ? '❌ Mật khẩu xác nhận không trùng khớp!' : '❌ Confirmation password does not match!');
      return;
    }

    // Save new password via Backend REST API (zero localStorage used for password)
    const result = await changeAdminPasswordInBackend(currentPass, newPass.trim());
    if (result.success) {
      showToast(lang === 'vi' ? '🎉 Đã cập nhật mật khẩu Admin mới thành công!' : '🎉 Admin password updated successfully!');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      onClose();
    } else {
      setError(result.message || (lang === 'vi' ? '❌ Mật khẩu hiện tại không chính xác!' : '❌ Current password is incorrect!'));
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        inset: 0,
        background: 'rgba(7, 11, 22, 0.82)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 99999
      }}
    >
      <div
        className="modal-box"
        style={{
          maxWidth: '460px',
          width: '100%',
          background: 'linear-gradient(165deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
          border: '1px solid rgba(0, 242, 254, 0.35)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(0, 242, 254, 0.2)',
          borderRadius: '22px',
          padding: '28px',
          color: '#f8fafc',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* TOP GLOW BAR ACCENT */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #00f2fe, #4facfe, #00f2fe)',
            boxShadow: '0 0 12px #00f2fe'
          }}
        />

        {/* HEADER AREA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(0, 242, 254, 0.12)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                boxShadow: '0 0 15px rgba(0, 242, 254, 0.2)'
              }}
            >
              🔑
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff', background: 'linear-gradient(90deg, #fff, #00f2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {lang === 'vi' ? 'Đổi Mật Khẩu Admin' : 'Change Admin Password'}
              </h3>
              <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500 }}>
                {lang === 'vi' ? 'Cập nhật thông tin bảo mật tài khoản' : 'Update your account security credentials'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            ✕
          </button>
        </div>

        {/* ERROR ALERT BOX */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              fontSize: '13px',
              marginBottom: '18px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* CURRENT PASSWORD */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px', letterSpacing: '0.5px' }}>
              {lang === 'vi' ? 'MẬT KHẨU HIỆN TẠI:' : 'CURRENT PASSWORD:'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrentPass ? 'text' : 'password'}
                required
                value={currentPass}
                onChange={(e) => {
                  setCurrentPass(e.target.value);
                  if (error) setError('');
                }}
                placeholder={lang === 'vi' ? 'Nhập mật khẩu hiện tại...' : 'Enter current password...'}
                style={{
                  width: '100%',
                  padding: '11px 42px 11px 14px',
                  borderRadius: '10px',
                  background: '#0b1120',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#00f2fe';
                  e.target.style.boxShadow = '0 0 12px rgba(0, 242, 254, 0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
                title={showCurrentPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showCurrentPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* NEW PASSWORD */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px', letterSpacing: '0.5px' }}>
              {lang === 'vi' ? 'MẬT KHẨU MỚI:' : 'NEW PASSWORD:'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPass ? 'text' : 'password'}
                required
                value={newPass}
                onChange={(e) => {
                  setNewPass(e.target.value);
                  if (error) setError('');
                }}
                placeholder={lang === 'vi' ? 'Nhập mật khẩu mới (tối thiểu 4 ký tự)...' : 'Enter new password...'}
                style={{
                  width: '100%',
                  padding: '11px 42px 11px 14px',
                  borderRadius: '10px',
                  background: '#0b1120',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#00f2fe';
                  e.target.style.boxShadow = '0 0 12px rgba(0, 242, 254, 0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
                title={showNewPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showNewPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* CONFIRM NEW PASSWORD */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', letterSpacing: '0.5px' }}>
                {lang === 'vi' ? 'XÁC NHẬN MẬT KHẨU MỚI:' : 'CONFIRM NEW PASSWORD:'}
              </label>
              {confirmPass.length > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: passwordsMatch ? '#10b981' : '#ef4444' }}>
                  {passwordsMatch ? '✓ Khớp mật khẩu' : '✕ Chưa khớp'}
                </span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPass ? 'text' : 'password'}
                required
                value={confirmPass}
                onChange={(e) => {
                  setConfirmPass(e.target.value);
                  if (error) setError('');
                }}
                placeholder={lang === 'vi' ? 'Nhập lại mật khẩu mới...' : 'Re-enter new password...'}
                style={{
                  width: '100%',
                  padding: '11px 42px 11px 14px',
                  borderRadius: '10px',
                  background: '#0b1120',
                  border: confirmPass.length > 0 ? (passwordsMatch ? '1px solid #10b981' : '1px solid #ef4444') : '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  if (!confirmPass.length) {
                    e.target.style.borderColor = '#00f2fe';
                    e.target.style.boxShadow = '0 0 12px rgba(0, 242, 254, 0.3)';
                  }
                }}
                onBlur={(e) => {
                  if (!confirmPass.length) {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
                title={showConfirmPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showConfirmPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1',
                fontWeight: 600,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)')}
            >
              {lang === 'vi' ? 'Hủy Bỏ' : 'Cancel'}
            </button>
            <button
              type="submit"
              style={{
                flex: 1.6,
                padding: '12px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                border: 'none',
                color: '#090d16',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(0, 242, 254, 0.35)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 242, 254, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 242, 254, 0.35)';
              }}
            >
              💾 {lang === 'vi' ? 'LƯU MẬT KHẨU MỚI' : 'SAVE NEW PASSWORD'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

