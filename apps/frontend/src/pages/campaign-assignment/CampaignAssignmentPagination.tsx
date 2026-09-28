import type { Dispatch, SetStateAction } from 'react';

type CampaignAssignmentPaginationProps = Readonly<{
  className: string;
  ariaLabel: string;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  setCurrentPage: Dispatch<SetStateAction<number>>;
}>;

function CampaignAssignmentPagination({
  className,
  ariaLabel,
  currentPage,
  totalPages,
  isLoading,
  setCurrentPage,
}: CampaignAssignmentPaginationProps) {
  const paginationDisabled = totalPages <= 1 || isLoading;
  const visiblePageCount = Math.min(totalPages, 5);
  const firstVisiblePage = Math.max(
    1,
    Math.min(currentPage - 2, totalPages - visiblePageCount + 1),
  );
  const visiblePages = Array.from(
    { length: visiblePageCount },
    (_, index) => firstVisiblePage + index,
  );

  return (
    <nav className={className} aria-label={ariaLabel}>
      <ul className="flex flex-wrap justify-center gap-1 text-sm">
        <li>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            disabled={currentPage <= 1 || paginationDisabled}
            className="disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-neutral-secondary-medium disabled:hover:text-body flex items-center justify-center text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading font-medium text-sm px-3 h-10 focus:outline-none tracking-wider"
          >
            Previous
          </button>
        </li>
        {visiblePages.map((page) => (
          <li key={page}>
            <button
              type="button"
              onClick={() => setCurrentPage(page)}
              disabled={currentPage === page || isLoading}
              aria-current={currentPage === page ? 'page' : undefined}
              aria-label={`Page ${page}`}
              className={`flex items-center justify-center box-border border border-default-medium font-medium text-sm w-10 h-10 focus:outline-none ${
                currentPage === page
                  ? 'text-purple bg-neutral-tertiary-medium'
                  : 'text-body bg-neutral-secondary-medium hover:bg-neutral-tertiary-medium hover:text-heading'
              }`}
            >
              {page}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(page + 1, Math.max(totalPages, 1)))}
            disabled={currentPage >= totalPages || paginationDisabled}
            className="disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-neutral-secondary-medium disabled:hover:text-body flex items-center justify-center text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading font-medium text-sm px-3 h-10 focus:outline-none tracking-wider"
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default CampaignAssignmentPagination;
