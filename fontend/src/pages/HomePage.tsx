import { useState, useEffect } from 'react';
import type { AppItem, ServiceItem, SystemConfig, LightboxItem, Language, OrderItem } from '../types';
import { trackClientEvent, getLocalOrders } from '../services/api';
import { CursorGlow } from '../components/common/CursorGlow';
import { Navbar } from '../components/layout/Navbar';
import { HeroSection } from '../components/sections/HeroSection';
import { ServicesSection } from '../components/sections/ServicesSection';
import { AppsSection } from '../components/sections/AppsSection';
import { FAQSection } from '../components/sections/FAQSection';
import { TestimonialsSection } from '../components/sections/TestimonialsSection';
import { FloatingWidget } from '../components/common/FloatingWidget';
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
  const [pendingDraftOrder, setPendingDraftOrder] = useState<OrderItem | null>(null);

  useEffect(() => {
    trackClientEvent('CLIENT_PAGE_VIEW', 'Khách hàng truy cập trang chủ Cửa hàng MOD');

    // Check for active pending draft order created within 15 mins
    const localList = getLocalOrders();
    const activePending = localList.find((o) => o.status === 'PENDING');
    if (activePending) {
      setPendingDraftOrder(activePending);
    }
  }, []);

  const handleResumePendingOrder = () => {
    if (!pendingDraftOrder) return;
    const targetApp = apps.find((a) => a.id === pendingDraftOrder.appId) || {
      id: pendingDraftOrder.appId,
      name: pendingDraftOrder.appName,
      sub: 'Bản quyền VIP',
      icon: '⚡',
      cls: 'vip-app',
      note: '',
      shots: null
    };
    setInitialOrderForModal(pendingDraftOrder);
    setBuyApp(targetApp);
  };

  return (
    <div className={dark ? 'app dark' : 'app light'} data-lang={lang}>
      {/* 0. Top System Notice Marquee Strip (Removed) */}

      {/* Draft Pending Order Auto-Resume Notification Banner */}
      {pendingDraftOrder && !buyApp && (
        <div style={{
          background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
          borderBottom: '1px solid #6366f1',
          padding: '10px 16px',
          color: '#ffffff',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          zIndex: 1001,
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <span style={{ fontSize: '16px' }}>⚡</span>
            <span>
              {lang === 'vi'
                ? `Bạn có đơn hàng #${pendingDraftOrder.id} (${pendingDraftOrder.appName}) chưa hoàn tất.`
                : `You have an unfinished order #${pendingDraftOrder.id} (${pendingDraftOrder.appName}).`}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleResumePendingOrder}
              style={{
                background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                color: '#050811',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🚀 {lang === 'vi' ? 'Tiếp tục thanh toán' : 'Resume Order'}
            </button>
            <button
              onClick={() => setPendingDraftOrder(null)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
        <FAQSection lang={lang} />
        <TestimonialsSection lang={lang} />

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

      {/* Floating Support & Back To Top Widgets */}
      <FloatingWidget config={config} lang={lang} />

      <Footer lang={lang} config={config} />
    </div>
  );
}
