import type { AppItem, LightboxItem, Language } from '../../types';
import { getTranslation } from '../../data/translations';
import { LazyImage } from '../common/LazyImage';
import { trackClientEvent } from '../../services/api';

interface AppCardProps {
  app: AppItem;
  lang: Language;
  openLightbox: (lightbox: LightboxItem) => void;
  openBuyModal: (app: AppItem) => void;
  openFreeKeyModal: (app: AppItem) => void;
  showToast: (msg: string) => void;
}

export function AppCard({
  app,
  lang,
  openLightbox,
  openBuyModal,
  openFreeKeyModal,
  showToast
}: AppCardProps) {
  const t = getTranslation(lang).apps;

  const handleOpenBuy = () => {
    trackClientEvent('CLIENT_CLICK_BUY', `Khách hàng bấm Mua VIP Key cho ứng dụng [${app.name}]`);
    openBuyModal(app);
  };

  const handleDownload = () => {
    trackClientEvent('CLIENT_DOWNLOAD_MOD', `Khách hàng bấm nấc Tải Xuống cho ứng dụng [${app.name}]`);
    if (app.downloadUrl) {
      window.open(app.downloadUrl, '_blank');
    } else if (app.ipaUrl) {
      window.open(app.ipaUrl, '_blank');
    } else {
      showToast(
        lang === 'vi'
          ? `Chưa cập nhật link tải cho ${app.name}`
          : `No download link set for ${app.name}`
      );
    }
  };

  const handleFreeKey = () => {
    trackClientEvent('CLIENT_CLICK_FREE_KEY', `Khách hàng bấm Lấy Key Miễn Phí cho ứng dụng [${app.name}]`);
    if (app.ipaUrl && app.ipaUrl.trim()) {
      showToast(
        lang === 'vi'
          ? `Đang chuyển tới Link Vượt lấy Key cho ${app.name}...`
          : `Redirecting to Key Link for ${app.name}...`
      );
      window.open(app.ipaUrl.trim(), '_blank');
    } else {
      openFreeKeyModal(app);
    }
  };

  const handleShotClick = (s: string, idx: number, isImg: boolean) => {
    trackClientEvent('CLIENT_VIEW_MEDIA', `Khách hàng xem ảnh/video demo thứ ${idx + 1} của ứng dụng [${app.name}]`);
    openLightbox({
      label: isImg ? '' : s,
      caption: `${app.name} - Menu Preview ${idx + 1}`,
      imageSrc: isImg ? s : undefined
    });
  };

  return (
    <article className="app-card hover-lift">
      {/* Holographic Laser Scanner Overlay Animation */}
      <div className="scanner-overlay">
        <div className="scanner-line" />
      </div>

      <div className="card-glow" />
      <div className="app-head">
        <div className={'app-icon ' + app.cls}>
          {app.icon && (app.icon.startsWith('http://') || app.icon.startsWith('https://') || app.icon.startsWith('data:image/') || app.icon.startsWith('/')) ? (
            <LazyImage
              src={app.icon}
              alt={app.name}
              style={{ borderRadius: 'inherit' }}
            />
          ) : (
            app.icon
          )}
        </div>
        <div>
          <h3>{app.name}</h3>
          <p>{app.sub}</p>
        </div>
      </div>

      {app.note && app.note.trim() ? (
        <div className="notice">
          <div className="notice-header">
            <b>⚠ {lang === 'vi' ? 'Lưu ý:' : 'Notice:'}</b>
          </div>
          <div className="notice-body">{app.note}</div>
        </div>
      ) : null}

      <div className="updated">
        ▣ {lang === 'vi'
          ? `Cập nhật ngày: ${app.updatedAt || new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
          : `Updated: ${app.updatedAt || new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
      </div>

      {app.shots && (
        <div className="shots">
          <div className="shots-title">
            ▧ {t.menuPreview} {app.name}{' '}
            <small>{lang === 'vi' ? '(Chạm để xem phóng to)' : '(Tap to view)'}</small>
          </div>
          <div className={'shot-grid ' + (app.shots.length === 3 ? 'three' : '')}>
            {app.shots.map((s, idx) => {
              const isImg = s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:image/') || s.startsWith('/');
              return (
                <button
                  className="shot"
                  key={idx}
                  onClick={() => handleShotClick(s, idx, isImg)}
                  style={isImg ? { padding: 0, overflow: 'hidden' } : undefined}
                >
                  {isImg ? (
                    <LazyImage
                      src={s}
                      alt={`Shot ${idx + 1}`}
                      style={{ borderRadius: 'inherit' }}
                    />
                  ) : (
                    s
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {app.allowSellKey !== false && (
        <div className="card-buy-section">
          <button className="buy-vip-btn" onClick={handleOpenBuy}>
            🛒 {t.buyKeyBtn}
          </button>
        </div>
      )}

      <div className={'actions ' + (!app.shots ? 'single' : '')}>
        <button className="primary" onClick={handleDownload}>
          ⇩ {t.downloadBtn}
        </button>
        {app.allowFreeKey !== false && (
          <button className="secondary" onClick={handleFreeKey}>
            🔑 {t.getKeyFreeBtn}
          </button>
        )}
      </div>
    </article>
  );
}
