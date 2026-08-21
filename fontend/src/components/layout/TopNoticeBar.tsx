import { useState } from 'react';
import type { Language, SystemConfig } from '../../types';

interface TopNoticeBarProps {
  lang: Language;
  config: SystemConfig;
}

export function TopNoticeBar({ lang, config }: TopNoticeBarProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const brandName = config.brandName || 'MOD VIP STORE';

  return (
    <div className="top-notice-bar">
      <div className="notice-bar-content">
        <span className="notice-pill-badge">⚡ {lang === 'vi' ? 'HỆ THỐNG AUTO' : 'AUTO SYSTEM'}</span>
        <span className="notice-marquee-text">
          {lang === 'vi'
            ? `📢 Chào mừng bạn đến với cửa hàng ${brandName}! Hệ thống tự động trả Key VIP 24/7 qua VietQR PayOS. Hỗ trợ iOS 18 & Android 15 mới nhất!`
            : `📢 Welcome to ${brandName}! Automated 24/7 VIP key delivery via VietQR PayOS. Full support for iOS 18 & Android 15!`}
        </span>
      </div>
      <button className="notice-bar-close" onClick={() => setDismissed(true)} aria-label="Close notification">
        ✕
      </button>
    </div>
  );
}
