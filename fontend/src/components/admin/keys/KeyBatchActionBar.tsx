import type { Language } from '../../../types';

interface KeyBatchActionBarProps {
  lang: Language;
  selectedCount: number;
  onCopySelected?: () => void;
  onMarkAvailable: () => void;
  onMarkSold: () => void;
  onDeleteBatch: () => void;
  onClearSelection: () => void;
}

export function KeyBatchActionBar({
  lang, selectedCount, onCopySelected, onMarkAvailable, onMarkSold, onDeleteBatch, onClearSelection
}: KeyBatchActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 bg-white border-2 border-[#2563EB]/40 rounded-2xl p-3.5 px-5 shadow-[0_10px_30px_rgba(37,99,235,0.12)] animate-[fadeIn_0.2s_ease-out]">
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold shadow-sm">
          {selectedCount}
        </span>
        <span className="font-heading font-extrabold text-[#1E293B] text-sm">
          {lang === 'vi' ? `Đã chọn ${selectedCount} Key` : `Selected ${selectedCount} Keys`}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {onCopySelected && (
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all bg-[#F1F5F9] border border-[#CBD5E1] text-[#1E293B] hover:bg-[#E2E8F0] hover:-translate-y-0.5 flex items-center gap-1.5 shadow-sm"
            onClick={onCopySelected}
            title="Sao chép toàn bộ mã Key đã chọn (mỗi key 1 dòng)"
          >
            📋 {lang === 'vi' ? 'Sao chép mã Key' : 'Copy Codes'}
          </button>
        )}

        <button
          type="button"
          className="px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] hover:bg-[#D1FAE5] hover:-translate-y-0.5 flex items-center gap-1.5 shadow-sm"
          onClick={onMarkAvailable}
          title="Chuyển trạng thái sang CÒN HÀNG"
        >
          ● {lang === 'vi' ? 'Đánh dấu Còn hàng' : 'Mark Available'}
        </button>

        <button
          type="button"
          className="px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] hover:bg-[#DBEAFE] hover:-translate-y-0.5 flex items-center gap-1.5 shadow-sm"
          onClick={onMarkSold}
          title="Chuyển trạng thái sang ĐÃ BÁN"
        >
          ✓ {lang === 'vi' ? 'Đánh dấu Đã bán' : 'Mark Sold'}
        </button>

        <button
          type="button"
          className="px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] hover:bg-[#FEE2E2] hover:-translate-y-0.5 flex items-center gap-1.5 shadow-sm"
          onClick={onDeleteBatch}
          title="Xóa vĩnh viễn các key đã chọn"
        >
          🗑 {lang === 'vi' ? `Xóa (${selectedCount})` : `Delete (${selectedCount})`}
        </button>

        <button
          type="button"
          className="px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B]"
          onClick={onClearSelection}
          title="Bỏ chọn toàn bộ"
        >
          ✕ {lang === 'vi' ? 'Bỏ chọn' : 'Deselect'}
        </button>
      </div>
    </div>
  );
}
