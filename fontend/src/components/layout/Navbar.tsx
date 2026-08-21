import { useState, useEffect } from 'react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Close mobile menu when screen resizes to desktop width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    setMobileMenuOpen(false);
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

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className={`navbar-wrap ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <nav className="navbar">
        <div className="nav-brand-container">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {config.faviconUrl ? (
              <img
                src={config.faviconUrl}
                alt={config.brandName || 'Logo'}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  navigate('/admin');
                }}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  objectFit: 'cover',
                  marginRight: '8px',
                  verticalAlign: 'middle',
                  border: '1.5px solid rgba(56, 189, 248, 0.5)',
                  boxShadow: '0 0 12px rgba(56, 189, 248, 0.3)',
                  cursor: 'pointer'
                }}
              />
            ) : (
              <span
                className="apple"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  navigate('/admin');
                }}
                style={{ cursor: 'pointer', paddingRight: '6px' }}
              >
                ●
              </span>
            )}
            <a className="nav-logo" href="#about" onClick={closeMobileMenu}>
              <span className="brand-title">{config.brandName || 'MOD VIP STORE'}</span>
            </a>
          </div>

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
          <div className="lang-box">
            <button
              className={lang === 'vi' ? 'active' : ''}
              onClick={() => handleSetLang('vi')}
              title="Tiếng Việt 🇻🇳"
            >
              🇻🇳 VI
            </button>
            <button
              className={lang === 'en' ? 'active' : ''}
              onClick={() => handleSetLang('en')}
              title="English 🇺🇸"
            >
              🇺🇸 EN
            </button>
          </div>

          <button
            className="theme-btn"
            onClick={handleToggleTheme}
            title={dark ? (lang === 'vi' ? 'Chuyển Giao diện Sáng' : 'Switch to Light') : (lang === 'vi' ? 'Chuyển Giao diện Tối' : 'Switch to Dark')}
          >
            {dark ? '☀' : '☾'}
          </button>

          <button className="lookup-action-btn" onClick={handleOpenLookup}>
            🔍 <span className="btn-txt">{lang === 'vi' ? 'Tra Cứu Key' : 'Lookup Key'}</span>
            <kbd className="nav-kbd">Ctrl+K</kbd>
          </button>

          {/* Hamburger button for mobile screens */}
          <button
            className="nav-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer">
          <div className="mobile-menu-header">
            <span className="mobile-menu-badge">⚡ MENU HỆ THỐNG</span>
            <span className="mobile-menu-sub">{config.brandName || 'MOD VIP STORE'}</span>
          </div>

          <ul className="mobile-nav-links">
            <li>
              <a href="#about" onClick={closeMobileMenu}>
                <span className="link-title">🏠 {t.home}</span>
                <span className="link-arrow">›</span>
              </a>
            </li>
            <li>
              <a href="#links" onClick={closeMobileMenu}>
                <span className="link-title">🌐 {t.services}</span>
                <span className="link-arrow">›</span>
              </a>
            </li>
            <li>
              <a href="#apps" onClick={closeMobileMenu}>
                <span className="link-title">📱 {t.apps}</span>
                <span className="link-arrow">›</span>
              </a>
            </li>
            <li>
              <a href="#footer" onClick={closeMobileMenu}>
                <span className="link-title">📜 {t.terms}</span>
                <span className="link-arrow">›</span>
              </a>
            </li>
          </ul>

          <div className="mobile-menu-actions">
            <div className="mobile-lang-box">
              <span className="mobile-lang-label">🌐 {lang === 'vi' ? 'Ngôn ngữ' : 'Language'}</span>
              <div className="mobile-lang-buttons">
                <button
                  className={lang === 'vi' ? 'active' : ''}
                  onClick={() => handleSetLang('vi')}
                >
                  🇻🇳 Tiếng Việt
                </button>
                <button
                  className={lang === 'en' ? 'active' : ''}
                  onClick={() => handleSetLang('en')}
                >
                  🇺🇸 English
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
