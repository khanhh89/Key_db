import { useState, useEffect } from 'react';
import type { AppItem, Language } from '../../../types';
import { ModalPortal } from '../../common/ModalPortal';
import { batchSetFreeKey, fetchAppsFromBackend } from '../../../services/api';

interface BatchFreeKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apps: AppItem[];
  lang: Language;
  showToast: (msg: string) => void;
  onSuccess: (freshApps: AppItem[]) => void;
}

export function BatchFreeKeyModal({ isOpen, onClose, apps, lang, showToast, onSuccess }: BatchFreeKeyModalProps) {
  const [freeKeyCode, setFreeKeyCode] = useState(() => localStorage.getItem('lastSyncFreeKey') || '');
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-select apps when modal opens or apps change, based on current freeKeyCode
  useEffect(() => {
    if (isOpen) {
      if (freeKeyCode) {
        setSelectedAppIds(apps.filter(a => a.freeKey === freeKeyCode).map(a => a.id));
      } else {
        setSelectedAppIds([]);
      }
    }
  }, [isOpen, apps]); // Re-run if apps change to ensure accurate selection

  const handleFreeKeyChange = (val: string) => {
    setFreeKeyCode(val);
    if (val) {
      setSelectedAppIds(apps.filter(a => a.freeKey === val).map(a => a.id));
    } else {
      setSelectedAppIds([]);
    }
  };

  const toggle = (appId: string) => setSelectedAppIds(prev => prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]);

  const handleSync = async () => {
    if (!freeKeyCode.trim()) {
      showToast(lang === 'vi' ? '⚠️ Vui lòng nhập mã Key Free!' : '⚠️ Please enter Free Key code!');
      return;
    }
    
    setIsSyncing(true);
    
    // Find apps that currently have this freeKey but were unchecked (so we clear them)
    const appsToClear = apps.filter(a => a.freeKey === freeKeyCode && !selectedAppIds.includes(a.id)).map(a => a.id);
    
    let hasError = false;
    let errMsg = '';
    
    // 1. Set key for selected apps
    if (selectedAppIds.length > 0) {
      const res = await batchSetFreeKey(selectedAppIds, freeKeyCode);
      if (!res.success) { hasError = true; errMsg = res.message || ''; }
    }
    
    // 2. Clear key for unselected apps that previously had it
    if (appsToClear.length > 0 && !hasError) {
      const res = await batchSetFreeKey(appsToClear, "");
      if (!res.success) { hasError = true; errMsg = res.message || ''; }
    }

    setIsSyncing(false);
    
    if (!hasError) {
      const freshApps = await fetchAppsFromBackend();
      onSuccess(freshApps);
      localStorage.setItem('lastSyncFreeKey', freeKeyCode);
      showToast(lang === 'vi' ? `✅ Đã lưu cấu hình Key Free!` : `✅ Saved Free Key configuration!`);
      onClose();
    } else {
      showToast(`❌ ${errMsg}`);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 999999, padding: '20px 16px', overflowY: 'auto' }} onClick={onClose}>
        <div style={{ width: 'min(560px, 94vw)', margin: 'auto', background: '#0f172a', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '24px', padding: '28px', boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(16,185,129,0.1)', position: 'relative' }} onClick={e => e.stopPropagation()}>
          <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '20px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>

          <h4 style={{ margin: '0 0 6px', color: '#10b981', fontSize: '18px', fontWeight: 800 }}>🔑 {lang === 'vi' ? 'Sync Key Free Cho Nhiều App' : 'Sync Free Key to Multiple Apps'}</h4>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
            {lang === 'vi' ? 'Nhập 1 mã Key Free và chọn các App muốn áp dụng mã này.' : 'Enter one Free Key code and select apps to apply it to.'}
          </p>

          {/* Free Key Input */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px', fontSize: '13px' }}>
              {lang === 'vi' ? '🔑 Mã Key Free dùng chung:' : '🔑 Shared Free Key Code:'}
            </label>
            <input
              type="text"
              value={freeKeyCode}
              onChange={e => handleFreeKeyChange(e.target.value)}
              placeholder={lang === 'vi' ? 'Nhập mã Key Free...' : 'Enter Free Key code...'}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.4)', background: '#080c14', color: '#fff', fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* App Selector */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '13px' }}>
                {lang === 'vi' ? '📱 Chọn App áp dụng:' : '📱 Select Apps:'}
                <span style={{ marginLeft: '8px', background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 800 }}>
                  {selectedAppIds.length}/{apps.length}
                </span>
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" onClick={() => setSelectedAppIds(apps.map(a => a.id))} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer', fontWeight: 700 }}>
                  {lang === 'vi' ? '✓ Chọn tất cả' : '✓ Select all'}
                </button>
                <button type="button" onClick={() => setSelectedAppIds([])} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(100,116,139,0.4)', background: 'rgba(100,116,139,0.1)', color: '#94a3b8', cursor: 'pointer', fontWeight: 700 }}>
                  {lang === 'vi' ? '✕ Bỏ chọn' : '✕ Deselect'}
                </button>
              </div>
            </div>
            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', padding: '2px' }}>
              {apps.map(a => (
                <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', cursor: 'pointer', background: selectedAppIds.includes(a.id) ? 'rgba(16,185,129,0.12)' : 'transparent', border: selectedAppIds.includes(a.id) ? '1px solid rgba(16,185,129,0.4)' : '1px solid transparent', transition: 'all 0.15s ease' }}>
                  <input type="checkbox" checked={selectedAppIds.includes(a.id)} onChange={() => toggle(a.id)} style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer', flexShrink: 0 }} />
                  
                  {a.icon && (a.icon.startsWith('http') || a.icon.startsWith('data:image/') || a.icon.startsWith('/')) ? (
                    <img src={a.icon} alt={a.name} style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }} />
                  ) : (
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {a.icon ? a.icon : '📱'}
                    </div>
                  )}

                  <span style={{ fontSize: '13px', color: selectedAppIds.includes(a.id) ? '#4ade80' : '#cbd5e1', fontWeight: selectedAppIds.includes(a.id) ? 700 : 400, display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                    {a.freeKey && (
                      <span 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFreeKeyChange(a.freeKey || '');
                        }}
                        style={{ fontSize: '11px', color: '#10b981', fontFamily: 'monospace', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0, cursor: 'copy' }}
                        title={lang === 'vi' ? 'Bấm để load mã này lên ô nhập' : 'Click to load this code'}
                      >
                        {a.freeKey}
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
            <button type="button" onClick={handleSync} disabled={isSyncing || !freeKeyCode.trim()}
              style={{ padding: '11px 24px', borderRadius: '12px', border: 'none', background: isSyncing || !freeKeyCode.trim() ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontWeight: 800, cursor: isSyncing || !freeKeyCode.trim() ? 'not-allowed' : 'pointer', fontSize: '13px', boxShadow: '0 4px 14px rgba(16,185,129,0.3)', transition: 'all 0.2s ease' }}>
              {isSyncing ? (lang === 'vi' ? '⏳ Đang lưu...' : '⏳ Saving...') : `✅ ${lang === 'vi' ? 'Lưu cấu hình' : 'Save Config'}`}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
