import type { ServiceItem, Language } from '../../types';
import { Tile } from '../common/Tile';
import { ScrollReveal } from '../common/ScrollReveal';
import { getTranslation } from '../../data/translations';

interface ServicesSectionProps {
  lang: Language;
  services: ServiceItem[];
}

export function ServicesSection({ lang, services }: ServicesSectionProps) {
  const t = getTranslation(lang).services;

  return (
    <section className="section" id="links">
      <ScrollReveal>
        <div className="section-head">
          <span>{t.badge}</span>
          <h2>{t.title}</h2>
        </div>
      </ScrollReveal>

      {services.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--txt2)' }}>
          {lang === 'vi' ? 'Chưa có dịch vụ nào' : 'No services available'}
        </div>
      ) : (
        <div className="matrix">
          {services.map((srv, index) => (
            <ScrollReveal key={srv.id} delay={index * 100}>
              <Tile
                cls={srv.cls}
                icon={srv.icon}
                title={srv.title}
                text={srv.text}
                url={srv.url}
              />
            </ScrollReveal>
          ))}
        </div>
      )}
    </section>
  );
}
