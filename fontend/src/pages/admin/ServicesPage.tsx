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
    <div className="manager-panel">
      <div className="panel-header">
        <h2>🌐 {lang === 'vi' ? 'Quản Lý Dịch Vụ & Truyền Thông' : 'Services Catalog Manager'}</h2>
        <button className="add-btn" onClick={openNewServiceModal}>
          + {lang === 'vi' ? 'Thêm Dịch Vụ Mới' : 'Add New Service'}
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Icon</th>
              <th>{lang === 'vi' ? 'Tiêu đề' : 'Title'}</th>
              <th>{lang === 'vi' ? 'Mô tả' : 'Description'}</th>
              <th>URL</th>
              <th>{lang === 'vi' ? 'Thao tác' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {services.map((srv) => (
              <tr key={srv.id}>
                <td>
                  <span className={`service-icon-preview ${srv.cls}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '42px', minHeight: '42px', padding: '4px' }}>
                    {srv.icon && (srv.icon.startsWith('http://') || srv.icon.startsWith('https://') || srv.icon.startsWith('/') || srv.icon.startsWith('data:')) ? (
                      <img src={srv.icon} alt={srv.title} style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '8px' }} />
                    ) : (
                      srv.icon
                    )}
                  </span>
                </td>
                <td>
                  <strong>{srv.title}</strong>
                </td>
                <td className="note-cell">{srv.text}</td>
                <td>
                  <a href={srv.url} target="_blank" rel="noreferrer" className="link-preview">
                    {srv.url}
                  </a>
                </td>
                <td>
                  <div className="btn-group">
                    <button
                      className="edit-btn"
                      onClick={() => openEditServiceModal(srv)}
                    >
                      ✎ {lang === 'vi' ? 'Sửa' : 'Edit'}
                    </button>
                    <button
                      className="delete-btn"
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
          <div className="sub-modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="sub-modal-card" onClick={(e) => e.stopPropagation()}>
              <h4>
                {editingService
                  ? lang === 'vi' ? 'Sửa Dịch Vụ' : 'Edit Service'
                  : lang === 'vi' ? 'Thêm Dịch Vụ Mới' : 'Add New Service'}
              </h4>
              <form onSubmit={handleSaveService} className="modal-form">
                <div className="form-group">
                  <label>{lang === 'vi' ? 'Tên Dịch Vụ / Kênh (*):' : 'Service Title (*):'}</label>
                  <input
                    type="text"
                    ref={srvTitleInputRef}
                    value={srvTitle}
                    onChange={(e) => setSrvTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>{lang === 'vi' ? 'Mô tả chi tiết:' : 'Description:'}</label>
                  <input
                    type="text"
                    value={srvText}
                    onChange={(e) => setSrvText(e.target.value)}
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>{lang === 'vi' ? '🖼️ Logo Ảnh Dịch Vụ (Tải từ máy tính):' : 'Service Logo Image (Upload from computer):'}</label>
                    <div style={{ marginTop: '6px' }}>
                      {srvIcon ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(15, 23, 42, 0.6)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                          <img src={srvIcon} alt="Preview" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #00f2fe' }} />
                          <div style={{ flex: 1, fontSize: '13px', color: '#4ade80', fontWeight: 600 }}>
                            ✓ Đã chọn logo ảnh thành công
                          </div>
                          <label className="upload-btn-cloud" style={{ margin: 0, padding: '8px 14px', cursor: 'pointer', fontSize: '12px' }}>
                            {isUploadingIcon ? '⏳ Đang tải...' : '🔄 Đổi ảnh khác'}
                            <input
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
                          <input
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


                  <div className="form-group">
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


                <div className="form-group">
                  <label>URL Link:</label>
                  <input
                    type="text"
                    value={srvUrl}
                    onChange={(e) => setSrvUrl(e.target.value)}
                  />
                </div>

                <div className="modal-btn-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setIsModalOpen(false)}
                  >
                    {lang === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                  <button type="submit" className="save-btn">
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
