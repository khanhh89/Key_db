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
    setSrvIcon('');
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
      icon: srvIcon || '',
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
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-[16px] flex justify-center items-center z-[999999] p-4 overflow-y-auto animate-[fadeIn_0.2s_ease-out]"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="w-[min(620px,95vw)] max-h-[92vh] flex flex-col bg-[#0b1120] border border-[#38bdf8]/35 rounded-[26px] p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_40px_rgba(56,189,248,0.18)] relative overflow-hidden text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top ambient glow gradient decorative bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00f2fe] via-[#38bdf8] to-[#6366f1]" />

              {/* Close X Button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-500 transition-all flex items-center justify-center text-lg font-bold cursor-pointer"
              >
                ✕
              </button>

              {/* Modal Header Title */}
              <div className="mb-5 pr-8">
                <h3 className="m-0 font-heading text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-[#38bdf8] to-[#00f2fe] flex items-center gap-2.5">
                  {editingService ? '✏️ ' + (lang === 'vi' ? 'Chỉnh Sửa Dịch Vụ' : 'Edit Service') : '✨ ' + (lang === 'vi' ? 'Thêm Dịch Vụ Mới' : 'Add New Service')}
                </h3>
                <p className="m-0 mt-1 text-xs text-slate-400 font-medium">
                  {lang === 'vi' ? 'Nhập thông tin dịch vụ / kênh truyền thông hiển thị trên trang chủ' : 'Configure service item details and branding color'}
                </p>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveService} className="flex flex-col gap-4 overflow-y-auto max-h-[calc(88vh-130px)] pr-1 custom-scrollbar">
                {/* Service Title Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-extrabold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1">
                    <span>{lang === 'vi' ? 'Tên Dịch Vụ / Kênh (*):' : 'Service Title (*):'}</span>
                  </label>
                  <input
                    type="text"
                    ref={srvTitleInputRef}
                    value={srvTitle}
                    onChange={(e) => setSrvTitle(e.target.value)}
                    placeholder={lang === 'vi' ? 'Ví dụ: Kênh Telegram VIP, Support Zalo...' : 'e.g. Telegram Channel, VIP Support...'}
                    className="w-full px-4 py-3 rounded-xl border border-slate-700/80 bg-[#060a12] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/20 placeholder:text-slate-600"
                  />
                </div>

                {/* Description Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-extrabold text-[#38bdf8] uppercase tracking-wider">
                    {lang === 'vi' ? 'Mô tả chi tiết:' : 'Description:'}
                  </label>
                  <input
                    type="text"
                    value={srvText}
                    onChange={(e) => setSrvText(e.target.value)}
                    placeholder={lang === 'vi' ? 'Ví dụ: Hỗ trợ kích hoạt bản quyền 24/7...' : 'e.g. 24/7 Instant VIP Key fulfillment...'}
                    className="w-full px-4 py-3 rounded-xl border border-slate-700/80 bg-[#060a12] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/20 placeholder:text-slate-600"
                  />
                </div>

                {/* Logo Image Upload Box */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-extrabold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
                    <span>🖼️ {lang === 'vi' ? 'Logo Ảnh Dịch Vụ (Tải từ máy tính):' : 'Service Logo Image (Upload file):'}</span>
                  </label>
                  <div className="mt-0.5">
                    {srvIcon && srvIcon.trim() !== '' && srvIcon !== '◈' ? (
                      <div className="flex items-center gap-3.5 bg-[#070e1d]/90 p-3 rounded-2xl border border-[#00f2fe]/40 shadow-[0_4px_20px_rgba(0,242,254,0.1)]">
                        <div className="relative group">
                          <img
                            src={srvIcon}
                            alt="Preview"
                            className="w-13 h-13 min-w-[52px] min-h-[52px] object-contain rounded-xl border-2 border-[#00f2fe] bg-[#020617] p-1 shadow-[0_0_12px_rgba(0,242,254,0.3)]"
                          />
                        </div>
                        <div className="flex-1 flex flex-col gap-0.5">
                          <div className="text-[13px] text-[#4ade80] font-extrabold flex items-center gap-1">
                            ✓ {lang === 'vi' ? 'Đã chọn logo ảnh thành công' : 'Logo image selected'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                            {srvIcon.length > 40 ? srvIcon.substring(0, 40) + '...' : srvIcon}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="px-3.5 py-2 rounded-xl bg-[#38bdf8]/15 border border-[#38bdf8]/40 text-[#38bdf8] hover:bg-[#38bdf8] hover:text-[#080c14] font-bold text-xs cursor-pointer transition-all duration-200 flex items-center gap-1">
                            {isUploadingIcon ? '⏳' : '🔄'} {isUploadingIcon ? (lang === 'vi' ? 'Đang tải...' : 'Uploading...') : (lang === 'vi' ? 'Đổi ảnh khác' : 'Change')}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isUploadingIcon}
                              onChange={handleIconFileUpload}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setSrvIcon('')}
                            className="px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white font-bold text-xs cursor-pointer transition-all duration-200 flex items-center gap-1"
                          >
                            🗑 {lang === 'vi' ? 'Xóa' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed border-[#38bdf8]/40 bg-[#070d19]/80 hover:bg-[#0c162b] hover:border-[#00f2fe] transition-all cursor-pointer group text-center">
                        <div className="w-10 h-10 rounded-full bg-[#38bdf8]/10 border border-[#38bdf8]/30 flex items-center justify-center text-lg text-[#38bdf8] group-hover:scale-110 transition-transform">
                          📁
                        </div>
                        <div className="text-sm font-extrabold text-[#38bdf8]">
                          {isUploadingIcon ? (lang === 'vi' ? '⏳ Đang tải ảnh từ máy lên Cloudinary...' : '⏳ Uploading image...') : (lang === 'vi' ? 'Tải Ảnh Logo Từ Máy Tính' : 'Upload Logo Image from Computer')}
                        </div>
                        <div className="text-[11.5px] text-slate-400 font-medium">
                          {lang === 'vi' ? 'Hỗ trợ định dạng PNG, JPG, WEBP, SVG' : 'Supports PNG, JPG, WEBP, SVG'}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingIcon}
                          onChange={handleIconFileUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>



                {/* URL Link Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-extrabold text-[#38bdf8] uppercase tracking-wider">
                    URL Link:
                  </label>
                  <input
                    type="text"
                    value={srvUrl}
                    onChange={(e) => setSrvUrl(e.target.value)}
                    placeholder="https://t.me/..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-700/80 bg-[#060a12] text-white font-inherit text-sm outline-none transition-all duration-200 focus:border-[#38bdf8] focus:ring-[3px] focus:ring-[#38bdf8]/20 placeholder:text-slate-600"
                  />
                </div>

                {/* Modal Footer Actions */}
                <div className="flex justify-end items-center gap-3 mt-4 pt-4 border-t border-slate-800/80 shrink-0">
                  <button
                    type="button"
                    className="px-5 py-3 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-200 font-bold text-sm cursor-pointer transition-all duration-200 hover:bg-slate-700 hover:text-white"
                    onClick={() => setIsModalOpen(false)}
                  >
                    {lang === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-7 py-3 rounded-xl border-0 bg-gradient-to-r from-[#00f2fe] via-[#38bdf8] to-[#6366f1] text-[#050b14] font-heading font-extrabold text-sm cursor-pointer transition-all duration-250 shadow-[0_4px_20px_rgba(0,242,254,0.4)] hover:shadow-[0_8px_30px_rgba(0,242,254,0.6)] hover:-translate-y-0.5"
                  >
                    ✨ {lang === 'vi' ? 'Lưu Thay Đổi' : 'Save Changes'}
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
