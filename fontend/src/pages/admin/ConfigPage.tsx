import { useState, useEffect } from 'react';
import type { SystemConfig, Language } from '../../types';
import { saveConfigToBackend, fetchAdminConfigFromBackend } from '../../services/api';
import { uploadToCloudinary } from '../../services/cloudinary';

interface ConfigPageProps {
  lang: Language;
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  showToast: (msg: string) => void;
}

export function ConfigPage({
  lang,
  config,
  setConfig,
  showToast
}: ConfigPageProps) {
  const [cfgBrand, setCfgBrand] = useState(config.brandName);
  const [cfgDomain, setCfgDomain] = useState(config.domain);
  const [cfgFb, setCfgFb] = useState(config.facebookUrl);
  const [cfgMsg, setCfgMsg] = useState(config.messengerUrl);
  const [cfgZalo, setCfgZalo] = useState(config.zaloUrl);
  const [cfgTg, setCfgTg] = useState(config.telegramUrl);
  const [cfgFaviconUrl, setCfgFaviconUrl] = useState(config.faviconUrl || '');
  const [cfgSpecialtiesStr, setCfgSpecialtiesStr] = useState(
    config.specialties ? config.specialties.join(', ') : ''
  );
  const [cfgCloudName, setCfgCloudName] = useState(config.cloudinaryCloudName || '');
  const [cfgUploadPreset, setCfgUploadPreset] = useState(config.cloudinaryUploadPreset || '');
  const [cfgApiKey, setCfgApiKey] = useState(config.cloudinaryApiKey || '');
  const [cfgApiSecret, setCfgApiSecret] = useState(config.cloudinaryApiSecret || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);

  // Fetch full admin config (unmasked Cloudinary credentials) on mount
  useEffect(() => {
    fetchAdminConfigFromBackend().then((adminCfg) => {
      if (adminCfg) {
        setConfig(adminCfg);
        setCfgBrand(adminCfg.brandName || '');
        setCfgDomain(adminCfg.domain || '');
        setCfgFb(adminCfg.facebookUrl || '');
        setCfgMsg(adminCfg.messengerUrl || '');
        setCfgZalo(adminCfg.zaloUrl || '');
        setCfgTg(adminCfg.telegramUrl || '');
        setCfgFaviconUrl(adminCfg.faviconUrl || '');
        setCfgSpecialtiesStr(adminCfg.specialties ? adminCfg.specialties.join(', ') : '');
        setCfgCloudName(adminCfg.cloudinaryCloudName || '');
        setCfgUploadPreset(adminCfg.cloudinaryUploadPreset || '');
        setCfgApiKey(adminCfg.cloudinaryApiKey || '');
        setCfgApiSecret(adminCfg.cloudinaryApiSecret || '');
      }
    });
  }, [setConfig]);

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFavicon(true);
    showToast(lang === 'vi' ? '☁ Đang tải Icon Logo lên Cloudinary...' : 'Uploading Logo Icon to Cloudinary...');

    try {
      const url = await uploadToCloudinary(file);
      if (url) {
        setCfgFaviconUrl(url);
        showToast(lang === 'vi' ? '🎉 Đã tải Icon Logo lên Cloudinary thành công!' : 'Uploaded Logo Icon to Cloudinary!');
      } else {
        showToast(lang === 'vi' ? '❌ Lỗi tải ảnh lên Cloudinary!' : 'Upload failed!');
      }
    } catch (err) {
      showToast(lang === 'vi' ? '❌ Không thể tải ảnh lên Cloudinary!' : 'Upload failed!');
    } finally {
      setIsUploadingFavicon(false);
      e.target.value = '';
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    showToast(lang === 'vi' ? '⏳ Đang lưu thông tin cấu hình hệ thống...' : 'Saving system config...');

    try {
      const specs = cfgSpecialtiesStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const newConfigPayload: SystemConfig = {
        brandName: cfgBrand,
        domain: cfgDomain,
        facebookUrl: cfgFb,
        messengerUrl: cfgMsg,
        zaloUrl: cfgZalo,
        telegramUrl: cfgTg,
        specialties: specs,
        faviconUrl: cfgFaviconUrl,
        cloudinaryCloudName: cfgCloudName,
        cloudinaryUploadPreset: cfgUploadPreset,
        cloudinaryApiKey: cfgApiKey,
        cloudinaryApiSecret: cfgApiSecret
      };

      const savedConfig = await saveConfigToBackend(newConfigPayload);
      setConfig(savedConfig);
      showToast(lang === 'vi' ? '🎉 THÀNH CÔNG: Đã lưu thông tin cấu hình Cloudinary (Cloud Name, API Key & Secret)!' : '🎉 Cloudinary credentials saved!');
    } catch (err) {
      showToast(lang === 'vi' ? '❌ Thất bại: Không thể lưu cấu hình hệ thống!' : '❌ Save failed!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="manager-panel">
      <div className="panel-header">
        <h2>⚙️ {lang === 'vi' ? 'Cấu Hình Thông Tin Hệ Thống' : 'System Information Config'}</h2>
      </div>

      <form onSubmit={handleSaveConfig} className="admin-form">
        <div className="form-grid">
          <div className="form-group">
            <label>{lang === 'vi' ? 'Tên Admin / Brand:' : 'Brand Name:'}</label>
            <input
              type="text"
              value={cfgBrand}
              onChange={(e) => setCfgBrand(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>{lang === 'vi' ? 'Tên miền Domain:' : 'Domain Name:'}</label>
            <input
              type="text"
              value={cfgDomain}
              onChange={(e) => setCfgDomain(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Facebook URL:</label>
            <input
              type="text"
              value={cfgFb}
              onChange={(e) => setCfgFb(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Messenger URL:</label>
            <input
              type="text"
              value={cfgMsg}
              onChange={(e) => setCfgMsg(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Zalo URL:</label>
            <input
              type="text"
              value={cfgZalo}
              onChange={(e) => setCfgZalo(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
              <span>{lang === 'vi' ? '🖼️ Icon Logo Trang Web (Hiển thị đầu trang & Favicon):' : 'Website Icon / Favicon Logo:'}</span>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>☁ Cloud CDN Multi-Upload</span>
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
              <input
                type="text"
                value={cfgFaviconUrl}
                placeholder={lang === 'vi' ? 'Dán URL ảnh icon hoặc chọn tệp tải lên Cloudinary...' : 'Paste image URL or select file...'}
                onChange={(e) => setCfgFaviconUrl(e.target.value)}
                style={{ flex: 1 }}
              />
              <label className="upload-btn-cloud" style={{ margin: 0, padding: '12px 18px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '13px' }}>
                {isUploadingFavicon ? '⏳ Đang tải...' : '☁ Chọn Tệp Up Cloudinary'}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  disabled={isUploadingFavicon}
                  onChange={handleFaviconUpload}
                />
              </label>
            </div>
            {cfgFaviconUrl && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
                <img src={cfgFaviconUrl} alt="Favicon Preview" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #00f2fe' }} />
                <div style={{ flex: 1, fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>
                  ✓ Icon sẽ hiển thị ở góc đầu trang Web & Thanh Tab Trình duyệt
                </div>
                <button
                  type="button"
                  onClick={() => setCfgFaviconUrl('')}
                  style={{ background: 'rgba(239, 68, 68, 0.18)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
                >
                  🗑 Xóa
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Telegram URL:</label>
            <input
              type="text"
              value={cfgTg}
              onChange={(e) => setCfgTg(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label>
            {lang === 'vi'
              ? 'Danh sách Chuyên môn gõ tự động (Tách bằng dấu phẩy):'
              : 'Specialties Typing List (Comma separated):'}
          </label>
          <textarea
            rows={3}
            value={cfgSpecialtiesStr}
            onChange={(e) => setCfgSpecialtiesStr(e.target.value)}
          />
        </div>

        {/* CLOUDINARY CDN CONFIGURATION BOX */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <h4 style={{ marginBottom: '14px', color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
            ☁ {lang === 'vi' ? 'Cấu Hình Tài Khoản Cloudinary CDN (Tải Ảnh Lên Cloud)' : 'Cloudinary CDN Account Setup'}
          </h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Cloud Name (Tên tài khoản Cloudinary):</label>
              <input
                type="text"
                value={cfgCloudName}
                onChange={(e) => setCfgCloudName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>API Key (Mã API Key từ Cloudinary Dashboard):</label>
              <input
                type="text"
                value={cfgApiKey}
                onChange={(e) => setCfgApiKey(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>API Secret (Mã API Secret bảo mật):</label>
              <input
                type="password"
                value={cfgApiSecret}
                onChange={(e) => setCfgApiSecret(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Upload Preset (Unsigned Preset - Tùy chọn):</label>
              <input
                type="text"
                value={cfgUploadPreset}
                onChange={(e) => setCfgUploadPreset(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button type="submit" className="save-form-btn" disabled={isSaving} style={{ marginTop: '20px' }}>
          {isSaving
            ? (lang === 'vi' ? '⏳ ĐANG LƯU...' : '⏳ SAVING...')
            : (lang === 'vi' ? '💾 Lưu Cấu Hình' : 'Save Configuration')}
        </button>
      </form>
    </div>
  );
}
