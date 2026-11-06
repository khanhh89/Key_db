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
          return getFlashSaleSecondsRemaining(); // loop / refresh
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
    <div
      className="flash-sale-banner-wrapper"
      style={{
        background: 'linear-gradient(90deg, #450a0a 0%, #7f1d1d 25%, #991b1b 50%, #7f1d1d 75%, #450a0a 100%)',
        borderBottom: '1.5px solid rgba(239, 68, 68, 0.45)',
        boxShadow: '0 4px 20px rgba(220, 38, 38, 0.35)',
        color: '#ffffff',
        padding: '10px 16px',
        position: 'relative',
        zIndex: 90,
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        {/* Left: Flame Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px', animation: 'bounce 1.5s infinite', display: 'inline-block' }}>
            🔥
          </span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 900, fontSize: '13.5px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {lang === 'vi' ? 'FLASH SALE GIỜ VÀNG' : 'GOLDEN HOUR FLASH SALE'}
              </span>
              <span
                style={{
                  background: '#fef08a',
                  color: '#991b1b',
                  fontSize: '11px',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              >
                -{FLASH_SALE_DISCOUNT_PERCENT}% OFF
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#fca5a5', marginTop: '1px' }}>
              {lang === 'vi'
                ? 'Giảm trực tiếp 30% tất cả các gói Key VIP • Số lượng có hạn!'
                : 'Direct 30% discount on all VIP key packages • Limited stock!'}
            </div>
          </div>
        </div>

        {/* Right: Countdown Clock + CTA Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Countdown digit boxes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#fecaca', textTransform: 'uppercase', marginRight: '4px' }}>
              {lang === 'vi' ? 'Kết thúc sau:' : 'Ends in:'}
            </span>

            {/* Hours Box */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.65)',
                border: '1px solid rgba(254, 202, 202, 0.3)',
                borderRadius: '6px',
                padding: '4px 7px',
                minWidth: '24px',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '14px',
                color: '#fef08a',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
              }}
            >
              {time.hours}
            </div>
            <span style={{ fontWeight: 900, color: '#fca5a5' }}>:</span>

            {/* Minutes Box */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.65)',
                border: '1px solid rgba(254, 202, 202, 0.3)',
                borderRadius: '6px',
                padding: '4px 7px',
                minWidth: '24px',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '14px',
                color: '#fef08a',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
              }}
            >
              {time.minutes}
            </div>
            <span style={{ fontWeight: 900, color: '#fca5a5' }}>:</span>

            {/* Seconds Box */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.65)',
                border: '1px solid rgba(254, 202, 202, 0.3)',
                borderRadius: '6px',
                padding: '4px 7px',
                minWidth: '24px',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '14px',
                color: '#fef08a',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
              }}
            >
              {time.seconds}
            </div>
          </div>

          {/* CTA Action Button */}
          <button
            type="button"
            onClick={handleScrollToApps}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#000000',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(245, 158, 11, 0.4)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            ⚡ {lang === 'vi' ? 'SĂN KEY NGAY' : 'CLAIM KEY'}
          </button>
        </div>
      </div>
    </div>
  );
}

