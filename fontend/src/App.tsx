import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppItem, ServiceItem, SystemConfig, LightboxItem, Language, OrderItem } from './types';
import {
  initialApps,
  initialServices,
  initialConfig
} from './data/appsData';
import {
  fetchAppsFromBackend,
  fetchServicesFromBackend,
  fetchConfigFromBackend,
  verifyCustomerPaymentInBackend,
  loginAdminInBackend,
  revokeAdminToken
} from './services/api';

// Components & Router
import { Toast } from './components/common/Toast';
import { AppRoutes } from './router/AppRoutes';

export default function App() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Language>('vi');
  const [dark, setDark] = useState(true);

  // Authorization state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('modlienquan_admin_auth') === 'true';
  });

  // Dynamic Data States
  const [apps, setApps] = useState<AppItem[]>(initialApps);
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [config, setConfig] = useState<SystemConfig>(() => {
    const local = localStorage.getItem('modlienquan_config') || localStorage.getItem('modlienquan_admin_config');
    return local ? JSON.parse(local) : initialConfig;
  });

  // Modals & UI States
  const [buyApp, setBuyApp] = useState<AppItem | null>(null);
  const [initialOrderForModal, setInitialOrderForModal] = useState<OrderItem | null>(null);
  const [lightbox, setLightbox] = useState<LightboxItem | null>(null);
  const [isLookupOpen, setIsLookupOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  // Fetch real data from Backend REST API on mount
  useEffect(() => {
    const loadRealBackendData = async () => {
      try {
        const [backendApps, backendServices, backendConfig] = await Promise.all([
          fetchAppsFromBackend(),
          fetchServicesFromBackend(),
          fetchConfigFromBackend()
        ]);
        if (backendApps) setApps(backendApps);
        if (backendServices) setServices(backendServices);
        if (backendConfig) setConfig(backendConfig);
      } catch (err) {
        console.error('Failed to load data from API backend', err);
      }
    };

    loadRealBackendData();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Handle PayOS return redirect URL params (?code=00&orderCode=... or ?status=PAID&...)
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const orderCodeParam = queryParams.get('orderCode') || queryParams.get('paymentCode') || queryParams.get('id');
    const statusParam = queryParams.get('status');
    const codeParam = queryParams.get('code');

    if (orderCodeParam || statusParam === 'PAID' || codeParam === '00') {
      const targetCode = orderCodeParam || '';
      if (targetCode) {
        showToast(lang === 'vi' ? '⚡ Đang tự động kiểm tra và cấp Key VIP ' : 'Verifying PayOS payment...');

        verifyCustomerPaymentInBackend(targetCode).then((result) => {
          if (result.success && result.data) {
            const paidOrder = result.data;
            const matchedApp: AppItem = apps.find((a) => a.id === paidOrder.appId) || apps[0] || {
              id: paidOrder.appId || 'app-1',
              name: paidOrder.appName || 'MOD VIP KEY',
              sub: 'VIP License Key',
              icon: '⚡',
              cls: 'app-card-primary',
              note: '',
              shots: []
            };

            setInitialOrderForModal(paidOrder);
            setBuyApp(matchedApp);
            showToast(lang === 'vi' ? '🎉 Thanh toán PayOS thành công! .' : 'PayOS payment verified! Key delivered.');
          } else {
            showToast(lang === 'vi' ? `⏳ chưa ghi nhận thanh toán cho đơn [${targetCode}]!` : 'Payment pending verification...');
          }

          // Clean URL query parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        });
      }
    }
  }, [apps, lang]);

  // Auth Handlers
  const handleAdminLogin = async (user: string, pass: string) => {
    localStorage.removeItem('modlienquan_admin_password'); // Clean up any legacy localStorage password
    const result = await loginAdminInBackend(user, pass);
    if (result.success) {
      setIsAuthenticated(true);
      localStorage.setItem('modlienquan_admin_auth', 'true');
      showToast(lang === 'vi' ? '🎉 Đăng nhập Admin thành công! Đã cấp Token mới.' : 'Admin logged in! New token generated.');
      navigate('/admin');
      return true;
    }
    showToast(lang === 'vi' ? (result.message || '❌ Sai tài khoản hoặc mật khẩu Admin!') : 'Invalid login credentials!');
    return false;
  };

  const handleAdminLogout = () => {
    revokeAdminToken();
    setIsAuthenticated(false);
    localStorage.removeItem('modlienquan_admin_auth');
    showToast(lang === 'vi' ? '🚪 Đã thu hồi Token & đăng xuất Admin' : 'Token revoked & Admin logged out');
    navigate('/admin/login');
  };

  const openBuyModal = (app: AppItem) => {
    if (app.allowSellKey === false) {
      showToast(lang === 'vi' ? `App ${app.name} hiện chưa hỗ trợ bán Key VIP!` : `VIP Key purchase is disabled for ${app.name}!`);
      return;
    }
    setInitialOrderForModal(null);
    setBuyApp(app);
  };

  return (
    <>
      <AppRoutes
        dark={dark}
        setDark={setDark}
        lang={lang}
        setLang={setLang}
        config={config}
        setConfig={setConfig}
        services={services}
        setServices={setServices}
        apps={apps}
        setApps={setApps}
        buyApp={buyApp}
        setBuyApp={setBuyApp}
        initialOrderForModal={initialOrderForModal}
        setInitialOrderForModal={setInitialOrderForModal}
        lightbox={lightbox}
        setLightbox={setLightbox}
        isLookupOpen={isLookupOpen}
        setIsLookupOpen={setIsLookupOpen}
        isAuthenticated={isAuthenticated}
        handleAdminLogin={handleAdminLogin}
        handleAdminLogout={handleAdminLogout}
        openBuyModal={openBuyModal}
        showToast={showToast}
      />
      {toast && <Toast message={toast} />}
    </>
  );
}
