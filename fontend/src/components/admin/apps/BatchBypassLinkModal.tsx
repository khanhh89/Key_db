import { useState, useEffect } from 'react';
import type { AppItem, Language } from '../../../types';
import { ModalPortal } from '../../common/ModalPortal';
import { batchSetBypassLink, fetchAppsFromBackend } from '../../../services/appsApi';

interface BatchBypassLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  apps: AppItem[];
  lang: Language;
  showToast: (msg: string) => void;
  onSuccess: (freshApps: AppItem[]) => void;
}

export function BatchBypassLinkModal({ isOpen, onClose, apps, lang, showToast, onSuccess }: BatchBypassLinkModalProps) {
  const [bypassLinkUrl, setBypassLinkUrl] = useState(() => localStorage.getItem('lastSyncBypassLink') || '');
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-select apps when modal opens or apps change, based on current bypassLinkUrl
  useEffect(() => {
    if (isOpen) {
      if (bypassLinkUrl) {
        setSelectedAppIds(apps.filter(a => a.ipaUrl === bypassLinkUrl).map(a => a.id));
      } else {
        setSelectedAppIds([]);
      }
    }
  }, [isOpen, apps]);

  const handleBypassLinkChange = (val: string) => {
    setBypassLinkUrl(val);
    if (val) {
      setSelectedAppIds(apps.filter(a => a.ipaUrl === val).map(a => a.id));
    } else {
      setSelectedAppIds([]);
    }
  };

  const toggle = (appId: string) => setSelectedAppIds(prev => prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]);

  const handleSync = async () => {
    if (!bypassLinkUrl.trim()) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng nhập URL Link Vượt!' : '⚠️ Please enter Bypass Link URL!');
      return;
    }
    
    setIsSyncing(true);
    
    const appsToClear = apps.filter(a => a.ipaUrl === bypassLinkUrl && !selectedAppIds.includes(a.id)).map(a => a.id);
    
    let hasError = false;
    let errMsg = '';
    
    if (selectedAppIds.length > 0) {
      const res = await batchSetBypassLink(selectedAppIds, bypassLinkUrl);
      if (!res.success) { hasError = true; errMsg = res.message || ''; }
    }
    
    if (appsToClear.length > 0 && !hasError) {
      const res = await batchSetBypassLink(appsToClear, "");
      if (!res.success) { hasError = true; errMsg = res.message || ''; }
    }

    setIsSyncing(false);
    
    if (!hasError) {
      const freshApps = await fetchAppsFromBackend();
      onSuccess(freshApps);
      localStorage.setItem('lastSyncBypassLink', bypassLinkUrl);
      showToast(lang === 'vi' ? `✅ Đã lưu cấu hình Link Vượt!` : `✅ Saved Bypass Link configuration!`);
      onClose();
    } else {
      showToast(`❌ ${errMsg}`);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 999999, padding: '20px 16px', overflowY: 'auto' }} onClick={onClose}>
        <div style={{ width: 'min(560px, 94vw)', margin: 'auto', background: '#0f172a', border: '1px solid rgba(56,189,248,0.35)', borderRadius: '24px', padding: '28px', boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(56,189,248,0.1)', position: 'relative' }} onClick={e => e.stopPropagation()}>
          <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '20px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>

          <h4 style={{ margin: '0 0 6px', color: '#38bdf8', fontSize: '18px', fontWeight: 800 }}>🔗 {lang === 'vi' ? 'Sync Link Vượt Cho Nhiều App' : 'Sync Bypass Link to Multiple Apps'}</h4>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
            {lang === 'vi' ? 'Nhập 1 URL Link Vượt và chọn các App muốn áp dụng link này.' : 'Enter one Bypass Link URL and select apps to apply it to.'}
          </p>

          {/* Bypass Link Input */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px', fontSize: '13px' }}>
              {lang === 'vi' ? '🔗 URL Link Vượt (Bypass Link) dùng chung:' : '🔗 Shared Bypass Link URL:'}
            </label>
            <input
              type="text"
              value={bypassLinkUrl}
              onChange={e => handleBypassLinkChange(e.target.value)}
              placeholder={lang === 'vi' ? 'Nhập URL Link Vượt (vd: https://linkvertise...)' : 'Enter Bypass Link URL...'}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(56,189,248,0.4)', background: '#080c14', color: '#fff', fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* App Selector */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '13px' }}>
                {lang === 'vi' ? '📱 Chọn App áp dụng:' : '📱 Select Apps:'}
                <span style={{ marginLeft: '8px', background: 'rgba(56,189,248,0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 800 }}>
                  {selectedAppIds.length}/{apps.length}
                </span>
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" onClick={() => setSelectedAppIds(apps.map(a => a.id))} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.4)', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', cursor: 'pointer', fontWeight: 700 }}>
                  {lang === 'vi' ? '✓ Chọn tất cả' : '✓ Select all'}
                </button>
                <button type="button" onClick={() => setSelectedAppIds([])} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(100,116,139,0.4)', background: 'rgba(100,116,139,0.1)', color: '#94a3b8', cursor: 'pointer', fontWeight: 700 }}>
                  {lang === 'vi' ? '✕ Bỏ chọn' : '✕ Deselect'}
                </button>
              </div>
            </div>
            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', padding: '2px' }}>
              {apps.map(a => (
                <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', cursor: 'pointer', background: selectedAppIds.includes(a.id) ? 'rgba(56,189,248,0.12)' : 'transparent', border: selectedAppIds.includes(a.id) ? '1px solid rgba(56,189,248,0.4)' : '1px solid transparent', transition: 'all 0.15s ease' }}>
                  <input type="checkbox" checked={selectedAppIds.includes(a.id)} onChange={() => toggle(a.id)} style={{ width: '16px', height: '16px', accentColor: '#38bdf8', cursor: 'pointer', flexShrink: 0 }} />
                  
                  {a.icon && (a.icon.startsWith('http') || a.icon.startsWith('data:image/') || a.icon.startsWith('/')) ? (
                    <img src={a.icon} alt={a.name} style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }} />
                  ) : (
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {a.icon ? a.icon : '📱'}
                    </div>
                  )}

                  <span style={{ fontSize: '13px', color: selectedAppIds.includes(a.id) ? '#7dd3fc' : '#cbd5e1', fontWeight: selectedAppIds.includes(a.id) ? 700 : 400, display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                    {a.ipaUrl && (
                      <span 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleBypassLinkChange(a.ipaUrl);
                        }}
                        style={{ fontSize: '11px', color: '#38bdf8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px', display: 'inline-block', verticalAlign: 'bottom', background: 'rgba(56,189,248,0.1)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0, cursor: 'copy' }}
                        title={lang === 'vi' ? 'Bấm để load link này lên ô nhập' : 'Click to load this link'}
                      >
                        {a.ipaUrl}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '11px 20px', borderRadius: '12px', border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontWeight: 700, cursor: 'pointer' }}>
              {lang === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button type="button" onClick={handleSync} disabled={isSyncing || !bypassLinkUrl.trim()}
              style={{ padding: '11px 24px', borderRadius: '12px', border: 'none', background: isSyncing || !bypassLinkUrl.trim() ? 'rgba(56,189,248,0.3)' : 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', color: '#fff', fontWeight: 800, cursor: isSyncing || !bypassLinkUrl.trim() ? 'not-allowed' : 'pointer', fontSize: '13px', boxShadow: '0 4px 14px rgba(56,189,248,0.3)', transition: 'all 0.2s ease' }}>
              {isSyncing ? (lang === 'vi' ? '⏳ Đang lưu...' : '⏳ Saving...') : `✅ ${lang === 'vi' ? 'Lưu cấu hình' : 'Save Config'}`}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
