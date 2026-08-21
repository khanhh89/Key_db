import { useState, useEffect } from 'react';
import type { SystemConfig, Language } from '../../types';

interface FloatingWidgetProps {
  config: SystemConfig;
  lang: Language;
}

export function FloatingWidget({ config, lang }: FloatingWidgetProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const supportLink = config.messengerUrl || config.zaloUrl || config.telegramUrl || '#';

  return (
    <div className="floating-widgets-container">
      {/* Quick Live Support Float Button */}
      <a
        href={supportLink}
        target="_blank"
        rel="noreferrer"
        className="float-btn float-support-btn hover-lift"
        title={lang === 'vi' ? 'Hỗ trợ kỹ thuật 24/7' : '24/7 Live Support'}
      >
        <span className="float-icon">💬</span>
        <span className="float-label">{lang === 'vi' ? 'Hỗ Trợ' : 'Support'}</span>
      </a>

      {/* Back to Top Float Button */}
      {showScrollTop && (
        <button
          className="float-btn float-top-btn animate-fadeIn"
          onClick={scrollToTop}
          title={lang === 'vi' ? 'Lên đầu trang' : 'Back to top'}
          aria-label="Back to top"
        >
          ▲
        </button>
      )}
    </div>
  );
}
