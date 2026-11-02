import { useState, useEffect } from 'react';
import type { SystemConfig, Language } from '../../types';

interface FloatingWidgetProps {
  config: SystemConfig;
  lang: Language;
  onOpenFeedback?: () => void;
  onOpenAiChat?: () => void;
  isHidden?: boolean;
}

export function FloatingWidget({ config, lang, onOpenFeedback, onOpenAiChat, isHidden }: FloatingWidgetProps) {
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

  if (isHidden) return null;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const supportLink = config.messengerUrl || config.zaloUrl || config.telegramUrl || '#';

  return (
    <div className="floating-widgets-container">
      {/* 1. AI Smart Assistant Button */}
      {onOpenAiChat && (
        <button
          onClick={onOpenAiChat}
          className="float-btn float-ai-btn hover-lift"
          title={lang === 'vi' ? 'Trợ lý ảo AI tư vấn 24/7' : '24/7 AI Smart Assistant'}
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
            color: '#ffffff',
            fontWeight: 800,
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '24px',
            padding: '10px 16px',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4), 0 0 12px rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '7px'
          }}
        >
          <span style={{ fontSize: '16px' }}>🤖</span>
          <span>{lang === 'vi' ? 'Trợ Lý AI' : 'AI Assistant'}</span>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px #10b981'
            }}
          />
        </button>
      )}

      {/* 2. Quick Anonymous Feedback Button */}
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

      {/* 3. Quick Live Support Float Button */}
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

      {/* 4. Back to Top Float Button */}
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
