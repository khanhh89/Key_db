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
        <div className="brand-badge floating-anim" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          {config.faviconUrl ? (
            <img
              src={config.faviconUrl}
              alt="Logo"
              style={{ width: '22px', height: '22px', borderRadius: '6px', objectFit: 'cover' }}
            />
          ) : (
            <div className="pulse" />
          )}
          <span>{t.badge}{config.brandName ? ` • ${config.brandName}` : ''}</span>
        </div>

        <div className="typing-box">
          <span className="typing-label">I'M A</span>
          <span className="typed">{typedText}</span>
          <span className="cursor">|</span>
        </div>

        <div className="contact-title">
          {t.socialTitle}
        </div>

        <div className="social-bar">
          <a href={config.facebookUrl || '#'} target="_blank" rel="noreferrer" className="hover-lift">
            <b>f</b> Facebook
          </a>
          <a href={config.messengerUrl || '#'} target="_blank" rel="noreferrer" className="hover-lift">
            <b>⚡</b> Messenger
          </a>
          <a href={config.zaloUrl || '#'} target="_blank" rel="noreferrer" className="hover-lift">
            <b>Z</b> Zalo
          </a>
          <a href={config.telegramUrl || '#'} target="_blank" rel="noreferrer" className="hover-lift">
            <b>✈</b> Telegram
          </a>
        </div>
      </div>
    </section>
  );
}
