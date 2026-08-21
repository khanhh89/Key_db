import { useState, useEffect } from 'react';
import type { AppItem, Language } from '../../types';

interface LivePurchaseFeedProps {
  apps: AppItem[];
  lang: Language;
  openBuyModal: (app: AppItem) => void;
}

const mockPhonePrefixes = ['098', '097', '096', '091', '090', '093', '038', '039', '086', '077'];
const mockNames = ['Minh', 'Tuấn', 'Hùng', 'Bảo', 'Khoa', 'Đạt', 'Hoàng', 'Nam', 'Thành', 'Phong'];
const mockPackages = ['1 Ngày', '7 Ngày', '30 Ngày VIP', '1 Năm Lifetime'];

export function LivePurchaseFeed({ apps, openBuyModal }: LivePurchaseFeedProps) {
  const [activeNotice, setActiveNotice] = useState<{
    phone: string;
    app: AppItem;
    pkg: string;
    timeAgo: string;
  } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!apps || apps.length === 0) return;

    const triggerRandomPurchase = () => {
      const randomApp = apps[Math.floor(Math.random() * apps.length)];
      const randomPrefix = mockPhonePrefixes[Math.floor(Math.random() * mockPhonePrefixes.length)];
      const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
      const randomDigits = Math.floor(100 + Math.random() * 900);
      const randomPkg = mockPackages[Math.floor(Math.random() * mockPackages.length)];

      setActiveNotice({
        phone: `${randomName} (${randomPrefix}***${randomDigits})`,
        app: randomApp,
        pkg: randomPkg,
        timeAgo: `${Math.floor(Math.random() * 15) + 2}s trước`
      });
      setIsVisible(true);

      // Hide after 6 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 6000);
    };

    // First trigger after 4 seconds
    const initialTimer = setTimeout(triggerRandomPurchase, 4000);

    // Repeat every 16 seconds
    const interval = setInterval(triggerRandomPurchase, 16000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [apps]);

  if (!activeNotice || !isVisible) return null;

  return (
    <div className="live-purchase-toast animate-slide-up">
      <div className="live-toast-badge">🔥 LIVE</div>
      <div className="live-toast-body">
        <div className="live-toast-title">
          <span>{activeNotice.phone}</span>
          <small>{activeNotice.timeAgo}</small>
        </div>
        <div className="live-toast-desc">
          Vừa mua <b>{activeNotice.app.name}</b> ({activeNotice.pkg})
        </div>
      </div>
      <button
        className="live-toast-action"
        onClick={() => openBuyModal(activeNotice.app)}
        title="Bấm để mua ngay"
      >
        ⚡ MUA
      </button>
      <button
        className="live-toast-close"
        onClick={() => setIsVisible(false)}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}
