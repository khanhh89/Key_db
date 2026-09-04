import { useState, useRef } from 'react';
import type { ServiceItem, Language } from '../../types';
import { saveServiceToBackend, deleteServiceFromBackend, fetchServicesFromBackend } from '../../services/api';
import { uploadToCloudinary } from '../../services/cloudinary';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ModalPortal } from '../../components/common/ModalPortal';

interface ServicesPageProps {
  lang: Language;
  services: ServiceItem[];
  setServices: React.Dispatch<React.SetStateAction<ServiceItem[]>>;
  showToast: (msg: string) => void;
}

export function ServicesPage({
  lang,
  services,
  setServices,
  showToast
}: ServicesPageProps) {
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const srvTitleInputRef = useRef<HTMLInputElement>(null);

  // Confirm delete state
  const [deletingService, setDeletingService] = useState<{ id: string; title: string } | null>(null);

  // Form fields
  const [srvTitle, setSrvTitle] = useState('');
  const [srvText, setSrvText] = useState('');
  const [srvIcon, setSrvIcon] = useState('');
  const [srvCls, setSrvCls] = useState('');
  const [srvUrl, setSrvUrl] = useState('');

  const handleIconFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingIcon(true);
    showToast(lang === 'vi' ? '☁ Đang tải logo ảnh từ máy lên...' : 'Uploading logo image...');
    try {
      const url = await uploadToCloudinary(file);
      if (url) {
        setSrvIcon(url);
        showToast(lang === 'vi' ? '🎉 Đã tải logo ảnh từ máy thành công!' : 'Uploaded logo image!');
      }
    } catch (err) {
      showToast(lang === 'vi' ? '❌ Thất bại khi tải ảnh từ máy!' : 'Upload failed!');
    } finally {
      setIsUploadingIcon(false);
      e.target.value = '';
    }
  };


  const openNewServiceModal = () => {
    setEditingService(null);
    setSrvTitle('');
    setSrvText('');
    setSrvIcon('◈');
    setSrvCls('cyan');
    setSrvUrl('');
    setIsModalOpen(true);
  };

  const openEditServiceModal = (srv: ServiceItem) => {
    setEditingService(srv);
    setSrvTitle(srv.title);
    setSrvText(srv.text);
    setSrvIcon(srv.icon);
    setSrvCls(srv.cls);
    setSrvUrl(srv.url);
    setIsModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvTitle.trim()) {
      showToast(lang === 'vi' ? '⚠️ Tiêu đề không được để trống!' : '⚠️ Title cannot be empty!');
      srvTitleInputRef.current?.focus();
      return;
    }

    const isEdit = Boolean(editingService);
    const srvPayload: ServiceItem = {
      id: editingService ? editingService.id : '',
      title: srvTitle,
      text: srvText,
      icon: srvIcon || '◈',
      cls: srvCls || 'cyan',
      url: srvUrl || '#'
    };

    // Synchronize directly with MySQL DB via Backend API
    await saveServiceToBackend(srvPayload, isEdit);

    // Refetch fresh DB data to ensure 100% synchronization
    const freshServices = await fetchServicesFromBackend();
    setServices(freshServices);

    showToast(
      lang === 'vi'
        ? isEdit ? `Đã cập nhật dịch vụ "${srvTitle}"` : `Đã thêm dịch vụ "${srvTitle}"`
        : isEdit ? `Updated "${srvTitle}"` : `Added "${srvTitle}"`
    );

    setIsModalOpen(false);
  };

  const confirmDeleteService = async () => {
    if (!deletingService) return;
    await deleteServiceFromBackend(deletingService.id);
    const freshServices = await fetchServicesFromBackend();
    setServices(freshServices);
    showToast(
      lang === 'vi'
        ? `Đã xóa dịch vụ "${deletingService.title}"!`
        : `Deleted service "${deletingService.title}"!`
    );
    setDeletingService(null);
  };

  return (
    <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[24px] p-7 flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2>🌐 {lang === 'vi' ? 'Quản Lý Dịch Vụ & Truyền Thông' : 'Services Catalog Manager'}</h2>
        <button className="bg-gradient-to-r from-[#38bdf8] to-[#6366f1] border-0 text-white px-5 py-3 rounded-[14px] font-heading font-extrabold text-sm cursor-pointer transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(56,189,248,0.4)]" onClick={openNewServiceModal}>
          + {lang === 'vi' ? 'Thêm Dịch Vụ Mới' : 'Add New Service'}
        </button>
      </div>

      <div className="w-full overflow-x-auto rounded-2xl border border-[#1e293b] bg-[#0f172a]/50 backdrop-blur-[10px]">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="hover:bg-[#38bdf8]/[0.04] transition-colors group">
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">Icon</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Tiêu đề' : 'Title'}</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Mô tả' : 'Description'}</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">URL</th>
              <th className="p-[18px_20px] bg-[#1e293b]/80 text-[#94a3b8] font-heading font-extrabold text-xs tracking-[1px] uppercase border-b border-[#1e293b]">{lang === 'vi' ? 'Thao tác' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {services.map((srv) => (
              <tr key={srv.id}>
                <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                  <span className={`service-icon-preview ${srv.cls} inline-flex items-center justify-center min-w-[42px] min-h-[42px] p-1`}>
                    {srv.icon && (srv.icon.startsWith('http://') || srv.icon.startsWith('https://') || srv.icon.startsWith('/') || srv.icon.startsWith('data:')) ? (
                      <img src={srv.icon} alt={srv.title} className="w-[38px] h-[38px] object-contain rounded-lg" />
                    ) : (
                      srv.icon
                    )}
                  </span>
                </td>
                <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                  <strong>{srv.title}</strong>
                </td>
                <td className="note-cell">{srv.text}</td>
                <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                  <a href={srv.url} target="_blank" rel="noreferrer" className="link-preview">
                    {srv.url}
                  </a>
                </td>
                <td className="p-[18px_20px] border-b border-[#1e293b]/60 group-last:border-b-0 align-middle text-[#e2e8f0]">
                  <div className="flex items-center gap-2">
                    <button
                      className="bg-[#38bdf8]/12 text-[#38bdf8] border border-[#38bdf8]/30 px-4 py-2 rounded-[10px] font-inherit font-bold text-[13px] cursor-pointer transition-all duration-200 inline-flex items-center gap-[6px] whitespace-nowrap hover:bg-[#38bdf8] hover:text-[#080c14] hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(56,189,248,0.35)]"
                      onClick={() => openEditServiceModal(srv)}
                    >
                      ✎ {lang === 'vi' ? 'Sửa' : 'Edit'}
                    </button>
                    <button
                      className="bg-[#ef4444]/12 text-[#f87171] border border-[#ef4444]/30 px-4 py-2 rounded-[10px] font-inherit font-bold text-[13px] cursor-pointer transition-all duration-200 inline-flex items-center gap-[6px] whitespace-nowrap hover:bg-[#ef4444] hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(239,68,68,0.35)]"
                      onClick={() => setDeletingService({ id: srv.id, title: srv.title })}
                    >
                      🗑 {lang === 'vi' ? 'Xóa' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modern Custom Confirmation Modal for Delete Action */}
      <ConfirmModal
        isOpen={Boolean(deletingService)}
        title={lang === 'vi' ? 'Xác Nhận Xóa Dịch Vụ?' : 'Confirm Delete Service?'}
        message={
          lang === 'vi'
            ? `Bạn có chắc chắn muốn xóa dịch vụ "${deletingService?.title}" không? Hành động này không thể hoàn tác.`
            : `Are you sure you want to delete "${deletingService?.title}"? This action cannot be undone.`
        }
        lang={lang}
        onConfirm={confirmDeleteService}
        onCancel={() => setDeletingService(null)}
      />

      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/85 backdrop-blur-[14px] flex justify-center items-start z-[999999] p-[20px_16px] overflow-y-auto animate-[fadeIn_0.25s_ease-out]" onClick={() => setIsModalOpen(false)}>
            <div className="w-[min(640px,94vw)] h-auto max-h-[calc(100vh-40px)] m-auto flex flex-col bg-[#0f172a] border border-[#38bdf8]/30 rounded-[28px] p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(56,189,248,0.15)] relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <h4>
                {editingService
                  ? lang === 'vi' ? 'Sửa Dịch Vụ' : 'Edit Service'
                  : lang === 'vi' ? 'Thêm Dịch Vụ Mới' : 'Add New Service'}
              </h4>
              <form onSubmit={handleSaveService} className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-170px)] pr-1">
                <div className="flex flex-col gap-2">
                  <label>{lang === 'vi' ? 'Tên Dịch Vụ / Kênh (*):' : 'Service Title (*):'}</label>
                  <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                    type="text"
                    ref={srvTitleInputRef}
                    value={srvTitle}
                    onChange={(e) => setSrvTitle(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label>{lang === 'vi' ? 'Mô tả chi tiết:' : 'Description:'}</label>
                  <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                    type="text"
                    value={srvText}
                    onChange={(e) => setSrvText(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2" style={{ gridColumn: '1 / -1' }}>
                    <label>{lang === 'vi' ? '🖼️ Logo Ảnh Dịch Vụ (Tải từ máy tính):' : 'Service Logo Image (Upload from computer):'}</label>
                    <div style={{ marginTop: '6px' }}>
                      {srvIcon ? (
                        <div className="flex items-center gap-3.5 bg-[#0f172a]/60 p-[10px_14px] rounded-xl border border-[#38bdf8]/30">
                          <img src={srvIcon} alt="Preview" className="w-12 h-12 object-contain rounded-lg border border-[#00f2fe]" />
                          <div className="flex-1 text-[13px] text-[#4ade80] font-semibold">
                            ✓ Đã chọn logo ảnh thành công
                          </div>
                          <label className="upload-btn-cloud" style={{ margin: 0, padding: '8px 14px', cursor: 'pointer', fontSize: '12px' }}>
                            {isUploadingIcon ? '⏳ Đang tải...' : '🔄 Đổi ảnh khác'}
                            <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              disabled={isUploadingIcon}
                              onChange={handleIconFileUpload}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setSrvIcon('')}
                            style={{ background: 'rgba(239, 68, 68, 0.18)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            🗑 Xóa
                          </button>
                        </div>
                      ) : (
                        <label className="upload-btn-cloud" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', borderRadius: '12px', border: '2px dashed rgba(56, 189, 248, 0.4)', background: 'rgba(15, 23, 42, 0.4)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#38bdf8' }}>
                          {isUploadingIcon ? '⏳ Đang tải ảnh lên...' : '📁 Tải Ảnh Logo Từ Máy Tính'}
                          <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            disabled={isUploadingIcon}
                            onChange={handleIconFileUpload}
                          />
                        </label>
                      )}
                    </div>
                  </div>


                  <div className="flex flex-col gap-2">
                    <label>{lang === 'vi' ? 'Phối màu Icon:' : 'Icon Color:'}</label>
                    <select value={srvCls} onChange={(e) => setSrvCls(e.target.value)}>
                      <option value="cyan">Cyan</option>
                      <option value="orange">Orange</option>
                      <option value="blue">Blue</option>
                      <option value="pink">Pink</option>
                      <option value="red">Red</option>
                    </select>
                  </div>
                </div>


                <div className="flex flex-col gap-2">
                  <label>URL Link:</label>
                  <input className="px-4 py-3 rounded-xl border border-[#1e293b] bg-[#080c14] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/15"
                    type="text"
                    value={srvUrl}
                    onChange={(e) => setSrvUrl(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 mt-3.5 pt-3.5 border-t border-white/10 shrink-0">
                  <button
                    type="button"
                    className="px-5 py-3 rounded-xl border border-[#334155] bg-[#1e293b] text-[#e2e8f0] font-bold cursor-pointer transition-all duration-200 hover:bg-[#334155]"
                    onClick={() => setIsModalOpen(false)}
                  >
                    {lang === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                  <button type="submit" className="px-6 py-3 rounded-xl border-0 bg-gradient-to-r from-[#38bdf8] to-[#6366f1] text-white font-heading font-extrabold text-sm cursor-pointer transition-all duration-250 shadow-[0_4px_14px_rgba(56,189,248,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(56,189,248,0.5)]">
                    {lang === 'vi' ? 'Lưu Thay Đổi' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
