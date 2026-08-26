import type { Language, SystemConfig } from '../../types';

interface FooterProps {
  lang: Language;
  config: SystemConfig;
}

export function Footer({ lang, config }: FooterProps) {
  const domainText = config.domain ? config.domain.toLowerCase() : '';
  const brandName = config.brandName || 'MOD VIP STORE';

  return (
    <footer id="footer" className="footer-container">
      <div className="footer-content">
        <div className="footer-top">
          {/* Brand Info Column */}
          <div className="footer-col footer-brand">
            <div className="footer-logo">
              {config.faviconUrl ? (
                <img src={config.faviconUrl} alt={brandName} className="footer-logo-img" />
              ) : (
                <span className="footer-logo-icon">⚡</span>
              )}
              <span className="footer-logo-text">{brandName}</span>
            </div>
            <p className="footer-desc">
              {lang === 'vi'
                ? 'Hệ thống cung cấp Key bản quyền VIP & Mod game hàng đầu. Giao dịch tự động 24/7 qua cổng PayOS VietQR bảo mật.'
                : 'Top-tier VIP License Key & Mod store. 24/7 automated transaction via secure PayOS VietQR portal.'}
            </p>
            <div className="footer-security-badges">
              <span className="security-badge">🛡️ SSL 256-Bit Secure</span>
              <span className="security-badge">⚡ Auto Key 24/7</span>
            </div>
          </div>

          {/* Navigation Links Column */}
          <div className="footer-col">
            <h4>{lang === 'vi' ? 'DẪN HƯỚNG SITE' : 'NAVIGATION'}</h4>
            <ul>
              <li><a href="#about">🏠 {lang === 'vi' ? 'Trang Chủ' : 'Home'}</a></li>
              <li><a href="#links">🌐 {lang === 'vi' ? 'Dịch Vụ & Kênh' : 'Services & Links'}</a></li>
              <li><a href="#apps">📱 {lang === 'vi' ? 'Kho MOD Game' : 'Mod Store'}</a></li>
            </ul>
          </div>

          {/* Social Channels Column */}
          <div className="footer-col">
            <h4>{lang === 'vi' ? 'KÊNH CHÍNH THỨC' : 'OFFICIAL CHANNELS'}</h4>
            <ul>
              {(() => {
                const channelsToRender = config.socialChannels && config.socialChannels.length > 0
                  ? config.socialChannels
                  : [
                      { id: 'fb', name: 'Facebook Page', url: config.facebookUrl, logoUrl: config.facebookLogoUrl },
                      { id: 'msg', name: 'Messenger Support', url: config.messengerUrl, logoUrl: config.messengerLogoUrl },
                      { id: 'zalo', name: 'Zalo Group', url: config.zaloUrl, logoUrl: config.zaloLogoUrl },
                      { id: 'tele', name: 'Telegram Channel', url: config.telegramUrl, logoUrl: config.telegramLogoUrl }
                    ].filter(c => c.url && c.url.trim() !== '');

                return channelsToRender.map((chan) => (
                  <li key={chan.id}>
                    <a href={chan.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      {chan.logoUrl ? (
                        <img src={chan.logoUrl} alt={chan.name} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontWeight: 'bold' }}>{chan.name.charAt(0).toUpperCase()}</span>
                      )}
                      <span>{chan.name}</span>
                    </a>
                  </li>
                ));
              })()}
            </ul>
          </div>



          {/* Payment Methods Column */}
          <div className="footer-col">
            <h4>{lang === 'vi' ? 'THANH TOÁN TỰ ĐỘNG' : 'PAYMENT METHODS'}</h4>
            <p className="footer-pay-note">
              {lang === 'vi'
                ? 'Hỗ trợ quét mã QR PayOS từ tất cả 40+ Ngân Hàng Việt Nam & Ví điện tử.'
                : 'Supports instant QR scan via PayOS across 40+ Vietnam Banks & E-wallets.'}
            </p>
            <div className="payment-tags">
              <span className="pay-tag">PayOS</span>
              <span className="pay-tag">VietQR</span>
              <span className="pay-tag">MB Bank</span>
              <span className="pay-tag">Vietcombank</span>
              <span className="pay-tag">Momo</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="copyright-text">
            {lang === 'vi'
              ? `Bản quyền © 2026 ${domainText || brandName}. Đã đăng ký bản quyền.`
              : `Copyright © 2026 ${domainText || brandName}. All rights reserved.`}
          </div>
          <div className="system-status-indicator">
            <span className="status-dot-pulse" />
            <span>{lang === 'vi' ? 'Hệ thống tự động: HOẠT ĐỘNG' : 'System Status: OPERATIONAL'}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
