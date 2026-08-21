import { useState } from 'react';
import type { AppItem, LightboxItem, Language } from '../../types';
import { AppCard } from './AppCard';
import { ScrollReveal } from '../common/ScrollReveal';
import { getTranslation } from '../../data/translations';
import { trackClientEvent } from '../../services/api';

interface AppsSectionProps {
  lang: Language;
  apps: AppItem[];
  openLightbox: (lightbox: LightboxItem) => void;
  openBuyModal: (app: AppItem) => void;
  openFreeKeyModal: (app: AppItem) => void;
  showToast: (msg: string) => void;
}

export function AppsSection({
  lang,
  apps,
  openLightbox,
  openBuyModal,
  openFreeKeyModal,
  showToast
}: AppsSectionProps) {
  const t = getTranslation(lang).apps;
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'ios' | 'android' | 'free' | 'vip'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'name' | 'vip'>('latest');

  const handleSearch = (val: string) => {
    setSearchTerm(val);
    if (val.trim().length >= 2) {
      trackClientEvent('CLIENT_SEARCH_APP', `Khách hàng tìm kiếm ứng dụng với từ khóa [${val.trim()}]`);
    }
  };

  const popularKeywords = [
    { label: '🔥 Hack Map Liên Quân', term: 'Liên Quân' },
    { label: '🎮 Delta Roblox', term: 'Delta' },
    { label: '🍎 Mod iOS IPA', term: 'iOS' },
    { label: '🤖 Mod Android APK', term: 'Android' }
  ];

  const filteredApps = apps
    .filter((app) => {
      const matchesSearch =
        app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.sub.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeCategory === 'ios') {
        return Boolean(app.ipaUrl || app.sub.toLowerCase().includes('ios') || app.name.toLowerCase().includes('ios'));
      }
      if (activeCategory === 'android') {
        return Boolean(app.downloadUrl || app.sub.toLowerCase().includes('android') || app.name.toLowerCase().includes('apk'));
      }
      if (activeCategory === 'free') {
        return app.allowFreeKey !== false;
      }
      if (activeCategory === 'vip') {
        return app.allowSellKey !== false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'vip') {
        const aVip = a.allowSellKey !== false ? 1 : 0;
        const bVip = b.allowSellKey !== false ? 1 : 0;
        return bVip - aVip;
      }
      // default: latest updated
      return 0;
    });

  return (
    <section className="section" id="apps">
      <ScrollReveal>
        <div className="section-head">
          <span className="section-badge-glow">{t.badge}</span>
          <h2>{t.title}</h2>
          <p className="section-sub">{t.sub}</p>
        </div>
      </ScrollReveal>

      {/* Interactive Search Bar & Category Tabs */}
      <ScrollReveal delay={100}>
        <div className="app-catalog-controls">
          <div className="category-tabs">
            <button
              className={`cat-tab ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              🌐 {lang === 'vi' ? 'Tất cả' : 'All Games'}
            </button>
            <button
              className={`cat-tab ${activeCategory === 'ios' ? 'active' : ''}`}
              onClick={() => setActiveCategory('ios')}
            >
              🍎 {lang === 'vi' ? 'iOS (IPA)' : 'iOS Apps'}
            </button>
            <button
              className={`cat-tab ${activeCategory === 'android' ? 'active' : ''}`}
              onClick={() => setActiveCategory('android')}
            >
              🤖 {lang === 'vi' ? 'Android (APK)' : 'Android Apps'}
            </button>
            <button
              className={`cat-tab ${activeCategory === 'free' ? 'active' : ''}`}
              onClick={() => setActiveCategory('free')}
            >
              🔑 {lang === 'vi' ? 'Free Key' : 'Free Key'}
            </button>
            <button
              className={`cat-tab ${activeCategory === 'vip' ? 'active' : ''}`}
              onClick={() => setActiveCategory('vip')}
            >
              ⚡ {lang === 'vi' ? 'VIP Key' : 'VIP License'}
            </button>
          </div>

          <div className="app-filter-bar">
            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {searchTerm && (
                <button className="search-clear-btn" onClick={() => handleSearch('')}>
                  ✕
                </button>
              )}
            </div>

            {/* Sorting Dropdown */}
            <div className="sort-select-wrap">
              <span className="sort-label">⇅ {lang === 'vi' ? 'Sắp xếp:' : 'Sort:'}</span>
              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'latest' | 'name' | 'vip')}
              >
                <option value="latest">{lang === 'vi' ? 'Mới cập nhật' : 'Latest Updated'}</option>
                <option value="vip">{lang === 'vi' ? 'Bán chạy VIP' : 'VIP License'}</option>
                <option value="name">{lang === 'vi' ? 'Tên A -> Z' : 'Name A -> Z'}</option>
              </select>
            </div>

            <div className="results-count-badge">
              {lang === 'vi' ? `Hiển thị ${filteredApps.length}/${apps.length} Mod` : `Showing ${filteredApps.length}/${apps.length} Mods`}
            </div>
          </div>

          {/* Quick Keyword Chips */}
          <div className="quick-search-chips">
            <span className="chips-label">{lang === 'vi' ? 'Từ khóa hot:' : 'Popular:'}</span>
            {popularKeywords.map((kw) => (
              <button
                key={kw.term}
                className={`keyword-chip ${searchTerm === kw.term ? 'active' : ''}`}
                onClick={() => handleSearch(searchTerm === kw.term ? '' : kw.term)}
              >
                {kw.label}
              </button>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {filteredApps.length === 0 ? (
        <div className="no-apps-found">
          <div className="no-apps-icon">🔍</div>
          <h3>{lang === 'vi' ? 'Không tìm thấy ứng dụng phù hợp' : 'No matching applications found'}</h3>
          <p>{lang === 'vi' ? 'Thử tìm kiếm với từ khóa khác hoặc chuyển danh mục' : 'Try searching with a different keyword or category'}</p>
          <button className="reset-search-btn" onClick={() => { setSearchTerm(''); setActiveCategory('all'); }}>
            🔄 {lang === 'vi' ? 'Đặt lại bộ lọc' : 'Reset Filters'}
          </button>
        </div>
      ) : (
        <div className="apps-grid">
          {filteredApps.map((app, index) => (
            <ScrollReveal key={app.id} delay={index * 100}>
              <AppCard
                app={app}
                lang={lang}
                openLightbox={openLightbox}
                openBuyModal={openBuyModal}
                openFreeKeyModal={openFreeKeyModal}
                showToast={showToast}
              />
            </ScrollReveal>
          ))}
        </div>
      )}
    </section>
  );
}
