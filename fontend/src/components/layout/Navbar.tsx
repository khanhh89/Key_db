import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Language, SystemConfig } from '../../types';
import { getTranslation } from '../../data/translations';
import { trackClientEvent } from '../../services/api';

interface NavbarProps {
  lang: Language;
  setLang: (lang: Language) => void;
  dark: boolean;
  setDark: (dark: boolean) => void;
  config: SystemConfig;
  onOpenLookup: () => void;
}

export function Navbar({ lang, setLang, dark, setDark, config, onOpenLookup }: NavbarProps) {
  const navigate = useNavigate();
  const t = getTranslation(lang).nav;

  // Secret keyboard shortcut: Ctrl + Shift + A (Admin Portal), Ctrl + K (Order Lookup)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        navigate('/admin');
      } else if (e.ctrlKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        onOpenLookup();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onOpenLookup]);

  // Dynamically update browser tab favicon icon
  useEffect(() => {
    if (config?.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = config.faviconUrl;
    }
  }, [config?.faviconUrl]);

  const handleOpenLookup = () => {
    trackClientEvent('CLIENT_OPEN_ORDER_LOOKUP', 'Khách hàng mở modal Tra Cứu Đơn Hàng từ thanh Menu Navbar');
    onOpenLookup();
  };

  const handleSetLang = (newLang: Language) => {
    trackClientEvent('CLIENT_CHANGE_LANGUAGE', `Khách hàng chuyển ngôn ngữ hiển thị sang [${newLang === 'vi' ? 'Tiếng Việt 🇻🇳' : 'English 🇺🇸'}]`);
    setLang(newLang);
  };

  const handleToggleTheme = () => {
    trackClientEvent('CLIENT_TOGGLE_THEME', `Khách hàng đổi giao diện website sang [${dark ? 'Giao diện Sáng ☀' : 'Giao diện Tối ☾'}]`);
    setDark(!dark);
  };

  return (
    <header className="navbar-wrap">
      <nav className="navbar">
        <div className="nav-brand-container">
          <a className="nav-logo" href="#about">
            {config.faviconUrl ? (
              <img
                src={config.faviconUrl}
                alt={config.brandName || 'Logo'}
                onClick={() => navigate('/admin')}
                title="● Portal Admin"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  objectFit: 'cover',
                  marginRight: '8px',
                  verticalAlign: 'middle',
                  border: '1.5px solid rgba(0, 242, 254, 0.5)',
                  boxShadow: '0 0 12px rgba(0, 242, 254, 0.3)',
                  cursor: 'pointer'
                }}
              />
            ) : (
              <span
                className="apple"
                onClick={() => navigate('/admin')}
                onDoubleClick={() => navigate('/admin')}
                title="● Portal Admin"
                style={{ cursor: 'pointer' }}
              >
                ●
              </span>
            )}
            <span className="brand-title">{config.brandName || 'MOD VIP STORE'}</span>
          </a>

          <div className="system-online-badge">
            <span className="online-dot" />
            <span>ONLINE 99.9%</span>
          </div>
        </div>

        <ul className="nav-links">
          <li>
            <a href="#about">{t.home}</a>
          </li>
          <li>
            <a href="#links">{t.services}</a>
          </li>
          <li>
            <a href="#apps">{t.apps}</a>
          </li>
          <li>
            <a href="#footer">{t.terms}</a>
          </li>
        </ul>

        <div className="nav-right">
          <button className="lookup-action-btn" onClick={handleOpenLookup} title="Nhấn Ctrl + K để tra cứu nhanh">
            <span>🔍 {lang === 'vi' ? 'Tra cứu đơn' : 'Check Order'}</span>
            <kbd className="nav-kbd">Ctrl K</kbd>
          </button>

          <div className="lang-box">
            <button
              className={lang === 'vi' ? 'active' : ''}
              onClick={() => handleSetLang('vi')}
            >
              🇻🇳 VI
            </button>
            <button
              className={lang === 'en' ? 'active' : ''}
              onClick={() => handleSetLang('en')}
            >
              🇺🇸 EN
            </button>
          </div>

          <button
            className="theme-btn"
            aria-label="Toggle Theme"
            onClick={handleToggleTheme}
            title={dark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          >
            {dark ? '☀' : '☾'}
          </button>
        </div>
      </nav>
    </header>
  );
}
