import { useState, useEffect } from 'react';
import type { AppItem, ServiceItem, SystemConfig, LightboxItem, Language, OrderItem } from '../types';
import { trackClientEvent } from '../services/api';
import { CursorGlow } from '../components/common/CursorGlow';
import { Navbar } from '../components/layout/Navbar';
import { HeroSection } from '../components/sections/HeroSection';
import { ServicesSection } from '../components/sections/ServicesSection';
import { AppsSection } from '../components/sections/AppsSection';
import { BuyKeyModal } from '../components/modals/BuyKeyModal';
import { FreeKeyModal } from '../components/modals/FreeKeyModal';
import { LightboxModal } from '../components/modals/LightboxModal';
import { OrderLookupModal } from '../components/modals/OrderLookupModal';
import { Footer } from '../components/layout/Footer';

interface HomePageProps {
  dark: boolean;
  setDark: (dark: boolean) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  config: SystemConfig;
  services: ServiceItem[];
  apps: AppItem[];
  buyApp: AppItem | null;
  setBuyApp: (app: AppItem | null) => void;
  initialOrderForModal: OrderItem | null;
  setInitialOrderForModal: (order: OrderItem | null) => void;
  lightbox: LightboxItem | null;
  setLightbox: (lightbox: LightboxItem | null) => void;
  isLookupOpen: boolean;
  setIsLookupOpen: (open: boolean) => void;
  openBuyModal: (app: AppItem) => void;
  showToast: (msg: string) => void;
}

export function HomePage({
  dark,
  setDark,
  lang,
  setLang,
  config,
  services,
  apps,
  buyApp,
  setBuyApp,
  initialOrderForModal,
  setInitialOrderForModal,
  lightbox,
  setLightbox,
  isLookupOpen,
  setIsLookupOpen,
  openBuyModal,
  showToast
}: HomePageProps) {
  const [freeKeyApp, setFreeKeyApp] = useState<AppItem | null>(null);

  useEffect(() => {
    trackClientEvent('CLIENT_PAGE_VIEW', 'Khách hàng truy cập trang chủ Cửa hàng MOD');
  }, []);

  return (
    <div className={dark ? 'app dark' : 'app light'} data-lang={lang}>
      {/* 1. Cursor Spotlight Glow */}
      <CursorGlow />

      {/* 2. Noise Grain Texture Overlay */}
      <div className="noise-overlay" />

      {/* 3. Gradient Glow Orbs */}
      <div className="gradient-glow-orb orb-1" />
      <div className="gradient-glow-orb orb-2" />
      <div className="gradient-glow-orb orb-3" />

      <Navbar
        lang={lang}
        setLang={setLang}
        dark={dark}
        setDark={setDark}
        config={config}
        onOpenLookup={() => setIsLookupOpen(true)}
      />

      <main>
        <HeroSection lang={lang} config={config} />
        <ServicesSection lang={lang} services={services} />
        <AppsSection
          lang={lang}
          apps={apps}
          openLightbox={setLightbox}
          openBuyModal={openBuyModal}
          openFreeKeyModal={setFreeKeyApp}
          showToast={showToast}
        />

        {buyApp && (
          <BuyKeyModal
            app={buyApp}
            lang={lang}
            initialOrder={initialOrderForModal}
            onClose={() => {
              setBuyApp(null);
              setInitialOrderForModal(null);
            }}
            showToast={showToast}
          />
        )}

        {freeKeyApp && (
          <FreeKeyModal
            app={freeKeyApp}
            lang={lang}
            onClose={() => setFreeKeyApp(null)}
            openBuyModal={openBuyModal}
            showToast={showToast}
          />
        )}

        {lightbox && (
          <LightboxModal
            lightbox={lightbox}
            closeLightbox={() => setLightbox(null)}
          />
        )}

        {isLookupOpen && (
          <OrderLookupModal
            lang={lang}
            onClose={() => setIsLookupOpen(false)}
            showToast={showToast}
          />
        )}
      </main>

      <Footer lang={lang} config={config} />
    </div>
  );
}
