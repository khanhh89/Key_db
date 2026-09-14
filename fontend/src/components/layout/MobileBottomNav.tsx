import type { Language } from '../../types';

interface MobileBottomNavProps {
  lang: Language;
  onOpenOrderLookup: () => void;
  onOpenFeedback: () => void;
}

export function MobileBottomNav({
  lang,
  onOpenOrderLookup,
  onOpenFeedback
}: MobileBottomNavProps) {

  const scrollToApps = () => {
    const el = document.getElementById('apps');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToHero = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="mobile-bottom-dock">
      <button className="dock-item" onClick={scrollToHero}>
        <span className="dock-icon">🏠</span>
        <span>{lang === 'vi' ? 'Trang chủ' : 'Home'}</span>
      </button>

      <button className="dock-item" onClick={scrollToApps}>
        <span className="dock-icon">📱</span>
        <span>{lang === 'vi' ? 'Kho App' : 'Apps'}</span>
      </button>

      <button className="dock-item active" onClick={onOpenOrderLookup}>
        <span className="dock-icon">🔍</span>
        <span>{lang === 'vi' ? 'Tra Cứu' : 'Lookup'}</span>
      </button>

      <button className="dock-item" onClick={onOpenFeedback}>
        <span className="dock-icon">💬</span>
        <span>{lang === 'vi' ? 'Góp Ý' : 'Feedback'}</span>
      </button>
    </nav>
  );
}
