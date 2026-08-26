import { useState, useEffect } from 'react';
import type { SystemConfig, Language } from '../../types';
import { RotatingRings } from '../common/RotatingRings';
import { getTranslation } from '../../data/translations';

interface HeroSectionProps {
  lang: Language;
  config: SystemConfig;
}

export function HeroSection({ lang, config }: HeroSectionProps) {
  const t = getTranslation(lang).hero;
  const [specialtyIndex, setSpecialtyIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const specialties = config.specialties && config.specialties.length > 0
    ? config.specialties
    : [];

  useEffect(() => {
    if (!specialties || specialties.length === 0) {
      setTypedText('');
      return;
    }
    const currentFullText = specialties[specialtyIndex] || '';
    const typingSpeed = isDeleting ? 40 : 80;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        setTypedText(currentFullText.substring(0, typedText.length + 1));
        if (typedText === currentFullText) {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        setTypedText(currentFullText.substring(0, typedText.length - 1));
        if (typedText === '') {
          setIsDeleting(false);
          setSpecialtyIndex((prev) => (prev + 1) % specialties.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [typedText, isDeleting, specialtyIndex, specialties]);

  return (
    <section className="section hero" id="about">
      {/* Concentric Rotating Orbital Rings */}
      <RotatingRings />

      <div className="hero-content">
        <div className="brand-badge floating-anim">
          {config.faviconUrl ? (
            <img
              src={config.faviconUrl}
              alt="Logo"
              style={{ width: '22px', height: '22px', borderRadius: '6px', objectFit: 'cover' }}
            />
          ) : (
            <div className="pulse" />
          )}
          <span className="badge-text">{t.badge}{config.brandName ? ` • ${config.brandName}` : ''}</span>
          <span className="badge-highlight">OFFICIAL STORE</span>
        </div>

        <h1 className="hero-headline">
          {config.brandName || 'MOD VIP'} <span className="gradient-text">GAME & LICENSE</span>
        </h1>

        <div className="typing-box">
          <span className="typing-label">SPECIALTY</span>
          <span className="typed">{typedText}</span>
          <span className="cursor">|</span>
        </div>

        <p className="hero-description">
          {lang === 'vi'
            ? 'Hệ thống tự động cấp Key bản quyền VIP 24/7, cập nhật liên tục cho iOS (IPA) và Android (APK). Bảo mật, không văng game, hỗ trợ tức thì.'
            : 'Automated VIP License Key delivery 24/7. Continuous updates for iOS (IPA) and Android (APK). Secure & instant support.'}
        </p>

        {/* High Class Stats Bar */}
        <div className="hero-stats-bar">
          <div className="stat-card">
            <div className="stat-value">100K+</div>
            <div className="stat-label">{lang === 'vi' ? 'Key Cấp Tự Động' : 'Keys Delivered'}</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-card">
            <div className="stat-value">99.9%</div>
            <div className="stat-label">{lang === 'vi' ? 'Thời Gian Online' : 'Uptime Guarantee'}</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-card">
            <div className="stat-value">0.5s</div>
            <div className="stat-label">{lang === 'vi' ? 'Xử Lý Tốc Độ' : 'Instant PayOS QR'}</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-card">
            <div className="stat-value">24/7</div>
            <div className="stat-label">{lang === 'vi' ? 'Hỗ Trợ Kỹ Thuật' : 'Live Support'}</div>
          </div>
        </div>

        <div className="contact-title">
          {t.socialTitle}
        </div>

        {(() => {
          const channelsToRender = config.socialChannels && config.socialChannels.length > 0
            ? config.socialChannels
            : [
                { id: 'fb', name: 'Facebook', url: config.facebookUrl, logoUrl: config.facebookLogoUrl },
                { id: 'msg', name: 'Messenger', url: config.messengerUrl, logoUrl: config.messengerLogoUrl },
                { id: 'zalo', name: 'Zalo Chat', url: config.zaloUrl, logoUrl: config.zaloLogoUrl },
                { id: 'tele', name: 'Telegram Channel', url: config.telegramUrl, logoUrl: config.telegramLogoUrl }
              ].filter(c => c.url && c.url.trim() !== '');

          return (
            <div className="social-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
              {channelsToRender.map((chan) => (
                <a key={chan.id} href={chan.url} target="_blank" rel="noreferrer" className="social-pill hover-lift">
                  <span className="social-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {chan.logoUrl ? (
                      <img src={chan.logoUrl} alt={chan.name} style={{ width: '22px', height: '22px', objectFit: 'contain', borderRadius: '4px' }} />
                    ) : (
                      chan.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span>{chan.name}</span>
                </a>
              ))}
            </div>
          );
        })()}
      </div>
    </section>
  );
}

