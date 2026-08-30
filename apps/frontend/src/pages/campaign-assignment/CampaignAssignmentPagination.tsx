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
  return (
    <nav className={className} aria-label={ariaLabel}>
      <ul className="flex -space-x-px text-sm">
        <li>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            title="Previous"
            disabled={currentPage === 1 || isLoading}
            className="disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-neutral-secondary-medium disabled:hover:text-body flex items-center justify-center text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading font-medium text-sm px-3 h-10 focus:outline-none tracking-wider"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>
              arrow_back_ios
            </span>
          </button>
        </li>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
          <li key={page}>
            <button
              type="button"
              onClick={() => setCurrentPage(page)}
              disabled={currentPage === page || isLoading}
              aria-current={currentPage === page ? 'page' : undefined}
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
            title="Next"
            onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
            disabled={currentPage === totalPages || isLoading}
            className="disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-neutral-secondary-medium disabled:hover:text-body flex items-center justify-center text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading font-medium text-sm px-3 h-10 focus:outline-none tracking-wider"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>
              arrow_forward_ios
            </span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default CampaignAssignmentPagination;
