import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZES = [5, 10, 25, 50, 100];

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export default function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function handleSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onPageSizeChange(Number(e.target.value));
    onPageChange(1);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white text-sm text-gray-600">
      {/* Left: range */}
      <span className="text-xs text-gray-500">
        {from}–{to} de {total}
      </span>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <select
          value={pageSize}
          onChange={handleSizeChange}
          className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s} por pág.
            </option>
          ))}
        </select>

        <span className="text-xs text-gray-500 whitespace-nowrap">
          pág. {page} / {totalPages}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
