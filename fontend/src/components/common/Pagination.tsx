import type { Language } from '../../types';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  lang: Language;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  lang
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const pages: number[] = [];
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="admin-pagination-bar">
      <div className="pagination-info">
        {lang === 'vi'
          ? `Hiển thị ${startItem}-${endItem} trên tổng ${totalItems} mục`
          : `Showing ${startItem}-${endItem} of ${totalItems} items`}
      </div>

      <div className="pagination-controls">
        {onPageSizeChange && (
          <select
            className="pagination-size-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value={10}>10 {lang === 'vi' ? 'dòng/trang' : 'rows/page'}</option>
            <option value={20}>20 {lang === 'vi' ? 'dòng/trang' : 'rows/page'}</option>
            <option value={50}>50 {lang === 'vi' ? 'dòng/trang' : 'rows/page'}</option>
          </select>
        )}

        <button
          className="pagination-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          ‹ {lang === 'vi' ? 'Trước' : 'Prev'}
        </button>

        {pages.map((p) => (
          <button
            key={p}
            className={`pagination-num-btn ${p === currentPage ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}

        <button
          className="pagination-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          {lang === 'vi' ? 'Sau' : 'Next'} ›
        </button>
      </div>
    </div>
  );
}
