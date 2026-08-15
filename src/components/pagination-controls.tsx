type PaginationControlsProps = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  label?: string;
};

export function PaginationControls({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
  label = "Results",
}: PaginationControlsProps) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <nav className="hs-pagination" aria-label={`${label} pagination`}>
      <p className="hs-pagination__summary">
        {label} {start}–{end} of {total}
      </p>
      <div className="hs-pagination__actions">
        <button
          type="button"
          className="hs-btn hs-btn--outline"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <span className="hs-pagination__page">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          className="hs-btn hs-btn--outline"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
