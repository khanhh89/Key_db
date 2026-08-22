import { useState } from 'react';
import type { ServiceItem, Language } from '../../types';
import { saveServiceToBackend, deleteServiceFromBackend, fetchServicesFromBackend } from '../../services/api';
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

  // Confirm delete state
  const [deletingService, setDeletingService] = useState<{ id: string; title: string } | null>(null);

  // Form fields
  const [srvTitle, setSrvTitle] = useState('');
  const [srvText, setSrvText] = useState('');
  const [srvIcon, setSrvIcon] = useState('');
  const [srvCls, setSrvCls] = useState('');
  const [srvUrl, setSrvUrl] = useState('');

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
    if (!srvTitle.trim()) return;

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
                  <span className={`service-icon-preview ${srv.cls}`}>
                    {srv.icon}
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
                    required
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
                  <div className="form-group">
                    <label>{lang === 'vi' ? 'Ký tự Icon (ví dụ: ◈, ▣, ➤, ♪, ▶):' : 'Icon char:'}</label>
                    <input
                      type="text"
                      value={srvIcon}
                      onChange={(e) => setSrvIcon(e.target.value)}
                    />
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
