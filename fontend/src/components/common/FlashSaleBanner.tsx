import { useState, useEffect } from 'react';
import type { Language } from '../../types';
import { getFlashSaleSecondsRemaining, formatFlashSaleTime, FLASH_SALE_DISCOUNT_PERCENT } from '../../utils/flashSale';

interface FlashSaleBannerProps {
  lang: Language;
}

export function FlashSaleBanner({ lang }: FlashSaleBannerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(getFlashSaleSecondsRemaining);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          return getFlashSaleSecondsRemaining();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const time = formatFlashSaleTime(secondsLeft);

  const handleScrollToApps = () => {
    const appsEl = document.getElementById('apps') || document.querySelector('.apps-section') || document.querySelector('section.apps');
    if (appsEl) {
      appsEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flash-sale-banner-wrapper">
      <div className="flash-sale-inner">
        {/* Left: Flame Icon + Title */}
        <div className="flash-sale-left">
          <span className="flash-sale-flame">🔥</span>
          <div className="flash-sale-text-block">
            <div className="flash-sale-heading-row">
              <span className="flash-sale-title">
                {lang === 'vi' ? 'FLASH SALE GIỜ VÀNG' : 'GOLDEN HOUR FLASH SALE'}
              </span>
              <span className="flash-sale-discount-tag">
                -{FLASH_SALE_DISCOUNT_PERCENT}% OFF
              </span>
            </div>
            <div className="flash-sale-sub">
              {lang === 'vi'
                ? 'Giảm trực tiếp 30% tất cả các gói Key VIP • Số lượng có hạn!'
                : 'Direct 30% discount on all VIP key packages • Limited stock!'}
            </div>
          </div>
        </div>

        {/* Right: Countdown Clock + CTA Button */}
        <div className="flash-sale-right">
          {/* Countdown digit boxes */}
          <div className="flash-sale-countdown-wrap">
            <span className="flash-sale-countdown-label">
              {lang === 'vi' ? 'Kết thúc sau:' : 'Ends in:'}
            </span>

            <div className="flash-sale-digit-box">{time.hours}</div>
            <span className="flash-sale-colon">:</span>
            <div className="flash-sale-digit-box">{time.minutes}</div>
            <span className="flash-sale-colon">:</span>
            <div className="flash-sale-digit-box">{time.seconds}</div>
          </div>

          {/* CTA Action Button */}
          <button
            type="button"
            className="flash-sale-cta-btn"
            onClick={handleScrollToApps}
          >
            ⚡ {lang === 'vi' ? 'SĂN KEY' : 'CLAIM'}
          </button>
        </div>
      </div>
    </div>
  );
}
