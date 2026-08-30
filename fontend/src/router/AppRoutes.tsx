import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import type { AppItem, ServiceItem, SystemConfig, LightboxItem, Language, OrderItem } from '../types';
import { ProtectedRoute } from '../components/admin/ProtectedRoute';

// Lazy Loaded Page Views for Smooth Code-Splitting & Instant Load
const HomePage = lazy(() => import('../pages/HomePage').then((m) => ({ default: m.HomePage })));
const AdminLayout = lazy(() => import('../components/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const LoginPage = lazy(() => import('../pages/admin/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('../pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AppsPage = lazy(() => import('../pages/admin/AppsPage').then((m) => ({ default: m.AppsPage })));
const ServicesPage = lazy(() => import('../pages/admin/ServicesPage').then((m) => ({ default: m.ServicesPage })));
const KeysPage = lazy(() => import('../pages/admin/KeysPage').then((m) => ({ default: m.KeysPage })));
const OrdersPage = lazy(() => import('../pages/admin/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const CouponsPage = lazy(() => import('../pages/admin/CouponsPage').then((m) => ({ default: m.CouponsPage })));
const ConfigPage = lazy(() => import('../pages/admin/ConfigPage').then((m) => ({ default: m.ConfigPage })));
const LogsPage = lazy(() => import('../pages/admin/LogsPage').then((m) => ({ default: m.LogsPage })));
const AdminFeedbackPage = lazy(() => import('../pages/admin/AdminFeedbackPage').then((m) => ({ default: m.AdminFeedbackPage })));

export function PageLoader() {
  return (
    <div className="page-loader-box">
      <div className="spinner-glow" />
      <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.8 }}>⚡ Đang tải dữ liệu...</span>
    </div>
  );
}

export interface AppRoutesProps {
  dark: boolean;
  setDark: (dark: boolean) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  services: ServiceItem[];
  setServices: React.Dispatch<React.SetStateAction<ServiceItem[]>>;
  apps: AppItem[];
  setApps: React.Dispatch<React.SetStateAction<AppItem[]>>;
  buyApp: AppItem | null;
  setBuyApp: (app: AppItem | null) => void;
  initialOrderForModal: OrderItem | null;
  setInitialOrderForModal: (order: OrderItem | null) => void;
  lightbox: LightboxItem | null;
  setLightbox: (lightbox: LightboxItem | null) => void;
  isLookupOpen: boolean;
  setIsLookupOpen: (open: boolean) => void;
  isAuthenticated: boolean;
  handleAdminLogin: (user: string, pass: string, otpCode?: string, setupSecret?: string) => Promise<any>;
  handleAdminLogout: () => void;
  openBuyModal: (app: AppItem) => void;
  showToast: (msg: string) => void;
}

export function AppRoutes({
  dark,
  setDark,
  lang,
  setLang,
  config,
  setConfig,
  services,
  setServices,
  apps,
  setApps,
  buyApp,
  setBuyApp,
  initialOrderForModal,
  setInitialOrderForModal,
  lightbox,
  setLightbox,
  isLookupOpen,
  setIsLookupOpen,
  isAuthenticated,
  handleAdminLogin,
  handleAdminLogout,
  openBuyModal,
  showToast
}: AppRoutesProps) {
  const navigate = useNavigate();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* PUBLIC SITE ROUTE */}
        <Route
          path="/"
          element={
            <HomePage
              dark={dark}
              setDark={setDark}
              lang={lang}
              setLang={setLang}
              config={config}
              services={services}
              apps={apps}
              buyApp={buyApp}
              setBuyApp={setBuyApp}
              initialOrderForModal={initialOrderForModal}
              setInitialOrderForModal={setInitialOrderForModal}
              lightbox={lightbox}
              setLightbox={setLightbox}
              isLookupOpen={isLookupOpen}
              setIsLookupOpen={setIsLookupOpen}
              openBuyModal={openBuyModal}
              showToast={showToast}
            />
          }
        />

        {/* ADMIN LOGIN ROUTE */}
        <Route
          path="/admin/login"
          element={
            isAuthenticated ? (
              <Navigate to="/admin" replace />
            ) : (
              <LoginPage
                lang={lang}
                config={config}
                onLogin={handleAdminLogin}
                onBackToSite={() => navigate('/')}
              />
            )
          }
        />

        {/* PROTECTED ADMIN PORTAL ROUTES */}
        <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
          <Route
            path="/admin"
            element={
              <AdminLayout
                lang={lang}
                config={config}
                onLogout={handleAdminLogout}
                showToast={showToast}
              />
            }
          >
            <Route
              index
              element={
                <DashboardPage
                  lang={lang}
                  apps={apps}
                  services={services}
                  config={config}
                />
              }
            />
            <Route
              path="apps"
              element={
                <AppsPage
                  lang={lang}
                  apps={apps}
                  setApps={setApps}
                  showToast={showToast}
                />
              }
            />
            <Route
              path="keys"
              element={
                <KeysPage
                  lang={lang}
                  apps={apps}
                  showToast={showToast}
                />
              }
            />
            <Route
              path="orders"
              element={
                <OrdersPage
                  lang={lang}
                  showToast={showToast}
                />
              }
            />
            <Route
              path="services"
              element={
                <ServicesPage
                  lang={lang}
                  services={services}
                  setServices={setServices}
                  showToast={showToast}
                />
              }
            />
            <Route
              path="coupons"
              element={
                <CouponsPage
                  lang={lang}
                  apps={apps}
                  showToast={showToast}
                />
              }
            />
            <Route
              path="config"
              element={
                <ConfigPage
                  lang={lang}
                  config={config}
                  setConfig={setConfig}
                  showToast={showToast}
                />
              }
            />
            <Route
              path="logs"
              element={
                <LogsPage
                  lang={lang}
                  showToast={showToast}
                />
              }
            />
            <Route
              path="feedbacks"
              element={
                <AdminFeedbackPage
                  lang={lang}
                  showToast={showToast}
                />
              }
            />
          </Route>
        </Route>

        {/* CATCH ALL 404 ROUTE */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
