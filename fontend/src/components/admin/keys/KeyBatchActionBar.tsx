import type { Language } from '../../../types';

interface KeyBatchActionBarProps {
  lang: Language;
  selectedCount: number;
  onMarkAvailable: () => void;
  onMarkSold: () => void;
  onDeleteBatch: () => void;
  onClearSelection: () => void;
}

export function KeyBatchActionBar({
  lang, selectedCount, onMarkAvailable, onMarkSold, onDeleteBatch, onClearSelection
}: KeyBatchActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="batch-action-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '16px', padding: '12px 20px', marginBottom: '16px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(16px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontWeight: 'bold', color: '#38bdf8', fontSize: '13px' }}>☑ Đã chọn {selectedCount} Key</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button
          className="bg-[#2563EB] border-0 text-[#1F2937] px-5 py-3 rounded-[14px] font-heading font-extrabold text-sm cursor-pointer transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(56,189,248,0.4)]"
          style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399' }}
          onClick={onMarkAvailable}
        >
          ● Đánh Dấu CÒN HÀNG
        </button>
        <button
          className="bg-[#2563EB] border-0 text-[#1F2937] px-5 py-3 rounded-[14px] font-heading font-extrabold text-sm cursor-pointer transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(56,189,248,0.4)]"
          style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#818cf8' }}
          onClick={onMarkSold}
        >
          ✓ Đánh Dấu ĐÃ BÁN
        </button>
        <button
          className="bg-[#ef4444]/12 text-[#f87171] border border-[#ef4444]/30 px-4 py-2 rounded-[10px] font-inherit font-bold text-[13px] cursor-pointer transition-all duration-200 inline-flex items-center gap-[6px] whitespace-nowrap hover:bg-[#ef4444] hover:text-[#1F2937] hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(239,68,68,0.35)]"
          style={{ padding: '6px 12px', fontSize: '12px' }}
          onClick={onDeleteBatch}
        >
          🗑 Xóa {selectedCount} Key
        </button>
        <button
          className="px-5 py-3 rounded-xl border border-[#E5E7EB] bg-white text-[#1F2937] font-bold cursor-pointer transition-all duration-200 hover:bg-[#334155]"
          style={{ padding: '6px 12px', fontSize: '12px' }}
          onClick={onClearSelection}
        >
          ✕ {lang === 'vi' ? 'Bỏ Chọn' : 'Clear'}
        </button>
      </div>
    </div>
  );
}
