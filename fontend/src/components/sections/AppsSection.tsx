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

  const handleSearch = (val: string) => {
    setSearchTerm(val);
    if (val.trim().length >= 2) {
      trackClientEvent('CLIENT_SEARCH_APP', `Khách hàng tìm kiếm ứng dụng với từ khóa [${val.trim()}]`);
    }
  };

  const filteredApps = apps.filter(
    (app) =>
      app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.sub.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="section" id="apps">
      <ScrollReveal>
        <div className="section-head">
          <span>{t.badge}</span>
          <h2>{t.title}</h2>
        </div>
      </ScrollReveal>

      {/* Interactive Search Bar */}
      <ScrollReveal delay={100}>
        <div className="app-filter-bar">
          <input
            type="text"
            className="search-input"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </ScrollReveal>

      {filteredApps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--txt2)' }}>
          {lang === 'vi' ? 'Chưa có ứng dụng nào' : 'No applications available'}
        </div>
      ) : (
        <div className="apps-grid">
          {filteredApps.map((app, index) => (
            <ScrollReveal key={app.id} delay={index * 120}>
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
