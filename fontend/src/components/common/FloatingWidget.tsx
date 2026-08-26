import { useState, useEffect } from 'react';
import type { SystemConfig, Language } from '../../types';

interface FloatingWidgetProps {
  config: SystemConfig;
  lang: Language;
  onOpenFeedback?: () => void;
  isHidden?: boolean;
}

export function FloatingWidget({ config, lang, onOpenFeedback, isHidden }: FloatingWidgetProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  if (isHidden) return null;

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
      {/* Quick Anonymous Feedback Button */}
      {onOpenFeedback && (
        <button
          onClick={onOpenFeedback}
          className="float-btn float-feedback-btn hover-lift"
          title={lang === 'vi' ? 'Phản hồi & Báo lỗi' : 'Feedback & Bug Report'}
          style={{
            background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
            color: '#0f172a',
            fontWeight: 700,
            border: 'none',
            borderRadius: '24px',
            padding: '10px 16px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 242, 254, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>💌</span>
          <span>{lang === 'vi' ? 'Góp Ý' : 'Feedback'}</span>
        </button>
      )}

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
