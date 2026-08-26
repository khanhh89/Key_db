import { useState, useEffect } from 'react';
import type { SystemConfig, ContactChannel, Language } from '../../types';
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
  const [cfgBrand, setCfgBrand] = useState(config.brandName || '');
  const [cfgDomain, setCfgDomain] = useState(config.domain || '');
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

  // Dynamic Contact Channels State
  const [channels, setChannels] = useState<ContactChannel[]>(() => {
    if (config.socialChannels && config.socialChannels.length > 0) {
      return config.socialChannels;
    }
    const list: ContactChannel[] = [];
    if (config.facebookUrl) list.push({ id: 'fb', name: 'Facebook Page', url: config.facebookUrl, logoUrl: config.facebookLogoUrl });
    if (config.messengerUrl) list.push({ id: 'msg', name: 'Messenger Support', url: config.messengerUrl, logoUrl: config.messengerLogoUrl });
    if (config.zaloUrl) list.push({ id: 'zalo', name: 'Zalo Group VIP', url: config.zaloUrl, logoUrl: config.zaloLogoUrl });
    if (config.telegramUrl) list.push({ id: 'tele', name: 'Telegram Channel', url: config.telegramUrl, logoUrl: config.telegramLogoUrl });
    if (list.length === 0) {
      list.push(
        { id: '1', name: 'Facebook Page', url: 'https://facebook.com', logoUrl: '' },
        { id: '2', name: 'Messenger Support', url: 'https://zalo.me/g/pedqqy116', logoUrl: '' },
        { id: '3', name: 'Zalo Group VIP', url: 'https://zalo.me/g/pedqqy116', logoUrl: '' }
      );
    }
    return list;
  });

  // Fetch full admin config on mount
  useEffect(() => {
    fetchAdminConfigFromBackend().then((adminCfg) => {
      if (adminCfg) {
        setConfig(adminCfg);
        setCfgBrand(adminCfg.brandName || '');
        setCfgDomain(adminCfg.domain || '');
        setCfgFaviconUrl(adminCfg.faviconUrl || '');
        setCfgSpecialtiesStr(adminCfg.specialties ? adminCfg.specialties.join(', ') : '');
        setCfgCloudName(adminCfg.cloudinaryCloudName || '');
        setCfgUploadPreset(adminCfg.cloudinaryUploadPreset || '');
        setCfgApiKey(adminCfg.cloudinaryApiKey || '');
        setCfgApiSecret(adminCfg.cloudinaryApiSecret || '');

        if (adminCfg.socialChannels && adminCfg.socialChannels.length > 0) {
          setChannels(adminCfg.socialChannels);
        } else {
          const list: ContactChannel[] = [];
          if (adminCfg.facebookUrl) list.push({ id: 'fb', name: 'Facebook Page', url: adminCfg.facebookUrl, logoUrl: adminCfg.facebookLogoUrl });
          if (adminCfg.messengerUrl) list.push({ id: 'msg', name: 'Messenger Support', url: adminCfg.messengerUrl, logoUrl: adminCfg.messengerLogoUrl });
          if (adminCfg.zaloUrl) list.push({ id: 'zalo', name: 'Zalo Group VIP', url: adminCfg.zaloUrl, logoUrl: adminCfg.zaloLogoUrl });
          if (adminCfg.telegramUrl) list.push({ id: 'tele', name: 'Telegram Channel', url: adminCfg.telegramUrl, logoUrl: adminCfg.telegramLogoUrl });
          if (list.length > 0) {
            setChannels(list);
          }
        }
      }
    });
  }, [setConfig]);

  const handleAddChannel = () => {
    const newChan: ContactChannel = {
      id: Date.now().toString(),
      name: 'Kênh Mới',
      url: 'https://zalo.me/g/pedqqy116',
      logoUrl: ''
    };
    setChannels(prev => [...prev, newChan]);
    showToast(lang === 'vi' ? '➕ Đã thêm kênh liên lạc mới!' : 'Added new channel!');
  };

  const handleUpdateChannel = (id: string, field: keyof ContactChannel, val: string) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const handleDeleteChannel = (id: string) => {
    setChannels(prev => prev.filter(c => c.id !== id));
    showToast(lang === 'vi' ? '🗑 Đã xóa kênh liên lạc!' : 'Deleted channel!');
  };

  const handleChannelLogoUpload = async (id: string, file: File) => {
    showToast(lang === 'vi' ? '☁ Đang tải logo kênh từ máy...' : 'Uploading channel logo...');
    try {
      const url = await uploadToCloudinary(file);
      if (url) {
        handleUpdateChannel(id, 'logoUrl', url);
        showToast(lang === 'vi' ? '🎉 Đã tải logo kênh thành công!' : 'Uploaded channel logo!');
      }
    } catch (err) {
      showToast(lang === 'vi' ? '❌ Thất bại khi tải logo kênh!' : 'Upload failed!');
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFavicon(true);
    showToast(lang === 'vi' ? '☁ Đang tải Icon Logo lên Cloudinary...' : 'Uploading Logo Icon to Cloudinary...');

    try {
      const url = await uploadToCloudinary(file);
      if (url) {
        setCfgFaviconUrl(url);
        showToast(lang === 'vi' ? '🎉 Đã tải Icon Logo lên thành công!' : 'Uploaded Logo Icon!');
      } else {
        showToast(lang === 'vi' ? '❌ Lỗi tải ảnh!' : 'Upload failed!');
      }
    } catch (err) {
      showToast(lang === 'vi' ? '❌ Không thể tải ảnh!' : 'Upload failed!');
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

      const fbChan = channels.find(c => c.name.toLowerCase().includes('facebook'));
      const msgChan = channels.find(c => c.name.toLowerCase().includes('messenger'));
      const zaloChan = channels.find(c => c.name.toLowerCase().includes('zalo'));
      const teleChan = channels.find(c => c.name.toLowerCase().includes('telegram'));

      const newConfigPayload: SystemConfig = {
        brandName: cfgBrand,
        domain: cfgDomain,
        facebookUrl: fbChan ? fbChan.url : (channels[0]?.url || ''),
        messengerUrl: msgChan ? msgChan.url : (channels[1]?.url || ''),
        zaloUrl: zaloChan ? zaloChan.url : (channels[2]?.url || ''),
        telegramUrl: teleChan ? teleChan.url : (channels[3]?.url || ''),
        facebookLogoUrl: fbChan?.logoUrl,
        messengerLogoUrl: msgChan?.logoUrl,
        zaloLogoUrl: zaloChan?.logoUrl,
        telegramLogoUrl: teleChan?.logoUrl,
        socialChannels: channels,
        specialties: specs,
        faviconUrl: cfgFaviconUrl,
        cloudinaryCloudName: cfgCloudName,
        cloudinaryUploadPreset: cfgUploadPreset,
        cloudinaryApiKey: cfgApiKey,
        cloudinaryApiSecret: cfgApiSecret
      };

      const savedConfig = await saveConfigToBackend(newConfigPayload);
      setConfig(savedConfig);
      showToast(lang === 'vi' ? '🎉 THÀNH CÔNG: Đã lưu thông tin cấu hình hệ thống & Danh sách kênh liên lạc động!' : '🎉 System config & dynamic channels saved!');
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

          {/* DYNAMIC CONTACT CHANNELS MANAGER PANEL */}
          <div style={{ gridColumn: '1 / -1', background: 'rgba(15, 23, 42, 0.4)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(56, 189, 248, 0.2)', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#38bdf8' }}>
                  🌐 {lang === 'vi' ? 'Danh Sách Kênh Liên Lạc (Tự Do Thêm, Đổi Tên & Up Logo từ máy)' : 'Dynamic Contact Channels'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  {lang === 'vi' ? 'Thêm mới, tùy chỉnh tên hiển thị, gán đường link URL và chọn logo từ máy không giới hạn' : 'Add new channels, rename, set link URL and upload logo from computer'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddChannel}
                style={{
                  background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                  color: '#0f172a',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 242, 254, 0.25)'
                }}
              >
                + {lang === 'vi' ? 'Thêm Kênh Liên Lạc Mới' : 'Add New Channel'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {channels.map((chan, idx) => (
                <div key={chan.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', background: 'rgba(30, 41, 59, 0.6)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px', flex: 1 }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', width: '24px' }}>#{idx + 1}</span>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>{lang === 'vi' ? 'Tên hiển thị:' : 'Name:'}</label>
                      <input
                        type="text"
                        value={chan.name}
                        onChange={(e) => handleUpdateChannel(chan.id, 'name', e.target.value)}
                        placeholder="ví dụ: Facebook Page, Group Zalo VIP..."
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div style={{ flex: 2, minWidth: '240px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>{lang === 'vi' ? 'Đường link URL:' : 'Link URL:'}</label>
                    <input
                      type="text"
                      value={chan.url}
                      onChange={(e) => handleUpdateChannel(chan.id, 'url', e.target.value)}
                      placeholder="https://facebook.com hoặc https://zalo.me/g/pedqqy116"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {chan.logoUrl ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src={chan.logoUrl} alt={chan.name} style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #00f2fe' }} />
                        <label style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', fontSize: '12px', cursor: 'pointer' }}>
                          🔄 Đổi logo
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleChannelLogoUpload(chan.id, f);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <label style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', border: '1px dashed rgba(56, 189, 248, 0.4)', color: '#38bdf8', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📁 Up logo từ máy
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleChannelLogoUpload(chan.id, f);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteChannel(chan.id)}
                      style={{ background: 'rgba(239, 68, 68, 0.18)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      🗑 Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
              <span>{lang === 'vi' ? '🖼️ Icon Logo Trang Web (Hiển thị đầu trang & Favicon):' : 'Website Icon / Favicon Logo:'}</span>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>☁ Tải tệp từ máy tính</span>
            </label>
            <div style={{ marginTop: '6px' }}>
              {cfgFaviconUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(15, 23, 42, 0.6)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  <img src={cfgFaviconUrl} alt="Favicon Preview" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #00f2fe' }} />
                  <div style={{ flex: 1, fontSize: '13px', color: '#10b981', fontWeight: 'bold' }}>
                    ✓ Logo hiển thị ở góc đầu trang Web & Thanh Tab Trình duyệt
                  </div>
                  <label className="upload-btn-cloud" style={{ margin: 0, padding: '8px 14px', cursor: 'pointer', fontSize: '12px' }}>
                    {isUploadingFavicon ? '⏳ Đang tải...' : '🔄 Đổi logo khác'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      disabled={isUploadingFavicon}
                      onChange={handleFaviconUpload}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setCfgFaviconUrl('')}
                    style={{ background: 'rgba(239, 68, 68, 0.18)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    🗑 Xóa
                  </button>
                </div>
              ) : (
                <label className="upload-btn-cloud" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', borderRadius: '12px', border: '2px dashed rgba(56, 189, 248, 0.4)', background: 'rgba(15, 23, 42, 0.4)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#38bdf8' }}>
                  {isUploadingFavicon ? '⏳ Đang tải logo lên...' : '📁 Tải Logo Trang Web / Favicon Từ Máy Tính'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={isUploadingFavicon}
                    onChange={handleFaviconUpload}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '20px' }}>
          <label>{lang === 'vi' ? 'Các từ khóa Specialty (phân cách bằng dấu phẩy):' : 'Specialties (comma separated):'}</label>
          <input
            type="text"
            value={cfgSpecialtiesStr}
            onChange={(e) => setCfgSpecialtiesStr(e.target.value)}
          />
        </div>

        <div className="submit-btn-row" style={{ marginTop: '24px' }}>
          <button type="submit" className="save-btn" disabled={isSaving}>
            {isSaving ? (lang === 'vi' ? '⏳ Đang Lưu...' : 'Saving...') : (lang === 'vi' ? '💾 Lưu Cấu Hình Hệ Thống' : 'Save Config')}
          </button>
        </div>
      </form>
    </div>
  );
}
