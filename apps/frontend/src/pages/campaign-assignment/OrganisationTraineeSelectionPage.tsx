import { useEffect, useState } from 'react';
import type { CampaignAssignmentCandidateOptionDto } from '@insightful-phish/shared';
import { useAuth } from '../../context/useAuth';
import { getCampaignAssignmentCandidates } from '../../services/campaign-assignment.service';
import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';

type DisplayStatus =
  | 'Active'
  | 'Disabled'
  | 'Invited'
  | 'Failed to Send'
  | 'Accepted'
  | 'Completed'
  | 'Expired'
  | 'Revoked'
  | 'Rejected'
  | 'Unknown';

function getStatusBadge(status: DisplayStatus) {
  const variants: Record<DisplayStatus, string> = {
    Active: 'ring-success-subtle text-fg-success-strong bg-success-soft',
    Disabled: 'ring-default-medium text-heading bg-neutral-secondary-medium',
    Invited: 'ring-brand-subtle text-fg-brand-strong bg-brand-softer',
    'Failed to Send': 'ring-danger-subtle text-fg-danger-strong bg-danger-soft',
    Accepted: 'ring-success-subtle text-fg-success-strong bg-success-soft',
    Completed: 'ring-success-subtle text-fg-success-strong bg-success-soft',
    Expired: 'ring-default-medium text-heading bg-neutral-secondary-medium',
    Revoked: 'ring-danger-subtle text-fg-danger-strong bg-danger-soft',
    Rejected: 'ring-warning-subtle text-fg-warning bg-warning-soft',
    Unknown: 'ring-default-medium text-fg-heading bg-neutral-secondary-medium',
  };

  return (
    <span
      className={`items-flex justify-center items-center w-32 px-4 py-1 pt-[0.4rem] ring-2 ring-inset text-sm font-medium ${variants[status]}`}
    >
      {status}
    </span>
  );
}

type OrganisationTraineeSelectionPageProps = Readonly<{
  selectedTraineeIds: string[];
  setSelectedTraineesIds: React.Dispatch<React.SetStateAction<string[]>>;
  onContinue: () => void;
}>;

function OrganisationTraineeSelectionPage({
  selectedTraineeIds,
  setSelectedTraineesIds,
  onContinue,
}: OrganisationTraineeSelectionPageProps) {
  const { authContext } = useAuth();
  const organisationId = authContext?.organisation?.id ?? null;

  const [trainees, setTrainees] = useState<CampaignAssignmentCandidateOptionDto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!organisationId) {
      setTrainees([]);
      setIsLoading(false);
      setError('Unable To Determine The Current Organisation');
      return;
    }

    const currentOrganisationId = organisationId;

    let isCurrent = true;

    async function loadTrainees() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getCampaignAssignmentCandidates(currentOrganisationId, {
          page: currentPage,
          limit: 3,
          ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
        });

        if (!isCurrent) {
          return;
        }
        setTrainees(response.items);
        setTotalPages(response.pagination.totalPages);
      } catch {
        if (!isCurrent) {
          return;
        }

        setTrainees([]);
        setError('Unable To Load Organisation Trainees. Please Try Again');
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadTrainees();
    return () => {
      isCurrent = false;
    };
  }, [organisationId, searchTerm, currentPage]);

  const handleTraineeSelection = (traineeProfileId: string) => {
    setSelectedTraineesIds((currentSelectedIds) => {
      if (currentSelectedIds.includes(traineeProfileId)) {
        return currentSelectedIds.filter((id) => id !== traineeProfileId);
      }

      return [...currentSelectedIds, traineeProfileId];
    });
  };

  const handlePreviousPage = () => {
    setCurrentPage((page) => Math.max(page - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((page) => Math.min(page + 1, totalPages));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  let traineeSelectionText = 'No Organisation Trainees Selected';
  if (selectedTraineeIds.length > 0) {
    traineeSelectionText = `${selectedTraineeIds.length} Organisation Trainee`;

    if (selectedTraineeIds.length !== 1) {
      traineeSelectionText += 's';
    }

    traineeSelectionText += ' Selected';
  }

  return (
    <div className="-mt-5 -ml-4">
      <div className="grid grid-cols-2 gap-12">
        <div>
          {/* PROGRESS HEADING */}
          <h3 className="font-overpass font-regular text-[1.2rem] text-gray-600 tracking-wider font-regular">
            Step 1 of 3
          </h3>

          {/* HEADING */}
          <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
            Organisation Trainee Selection
          </h3>

          {/* SUB-HEADING */}
          <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost mt-1 text-gray-500 mb-2">
            Select the organisation trainees you wish to assign campaigns to.
          </p>
        </div>

        <div className="flex flex-col items-end">
          <p
            className={`font-regular tracking-wide text-[1.2rem] font-left font-jost mb-2 ${
              selectedTraineeIds.length === 0 ? 'text-red-600' : 'text-pink'
            }`}
          >
            {traineeSelectionText}
          </p>

          <button
            type="button"
            disabled={selectedTraineeIds.length === 0}
            onClick={onContinue}
            className="disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer w-40 font-jost tracking-wider text-xl text-white font-regular bg-main-purple leading-5 px-4 py-3 focus:outline-none"
          >
            Continue
          </button>
        </div>
      </div>

      <div>
        {/* SEARCH AND FILTER BAR */}
        <div className="w-full mb-2">
          <div className="relative bg-white-purple border border-gray-200">
            <div className="flex flex-col items-center justify-between p-4 space-y-3 md:flex-row md:space-y-0 md:space-x-4">
              {/* ==== SEARCH BAR ==== */}
              <div className="w-full">
                <div className="flex items-center">
                  {/* Search Input Label */}
                  <label htmlFor="simple-search" className="sr-only">
                    Search Organisation Trainees
                  </label>
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      {/* SVG (Search Icon) */}
                      <svg
                        aria-hidden="true"
                        className="w-5 h-5 text-gray-400 dark:text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    {/* Search Input */}
                    <input
                      type="text"
                      id="simple-search"
                      value={searchTerm}
                      onChange={(event) => {
                        setSearchTerm(event.target.value);
                        setCurrentPage(1);
                      }}
                      className="font-jost tracking-wide block w-full p-2 pl-10 text-[1.1rem] h-[2.55rem] text-black border border-gray-300 bg-white focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Search Organisation Trainees"
                    />
                  </div>
                </div>
              </div>
              {/* ==== SEARCH BAR ==== */}

              <button
                type="button"
                disabled={selectedTraineeIds.length === 0}
                onClick={() => setSelectedTraineesIds([])}
                className="disabled:hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer w-60 font-jost tracking-wider text-xl text-body font-regular bg-gray-200 hover:bg-gray-300 leading-5 px-4 py-2.5 focus:outline-none"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="relative max-h-[12rem] overflow-y-auto overflow-x-auto bg-neutral-primary-soft border border-default">
          <table className="w-full text-sm text-left rtl:text-right text-body">
            <thead className="bg-faint-purple border-b border-default">
              <tr>
                <th
                  scope="col"
                  className="px-2 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                ></th>
                <th
                  scope="col"
                  className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                >
                  Full Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                >
                  Email Address
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="font-overpass font-regular text-[1rem] tracking-wider">
              {isLoading && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-[1.2rem] tracking-wider text-gray-600 font-jost"
                  >
                    <LoadingSpinnerSVG />
                    Loading Organisation Trainees...
                  </td>
                </tr>
              )}

              {!isLoading && error && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-[1.2rem] tracking-wider text-red-600 font-jost"
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!isLoading && !error && trainees.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-[1.2rem] tracking-wider text-red-600 font-jost"
                  >
                    No Organisation Trainees Found
                  </td>
                </tr>
              )}

              {!isLoading &&
                !error &&
                trainees.map((trainee) => (
                  <tr
                    key={trainee.traineeProfileId}
                    className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center">
                        <label htmlFor={`trainee-${trainee.traineeProfileId}`} className="sr-only">
                          Select {trainee.displayName}
                        </label>
                        <input
                          id={`trainee-${trainee.traineeProfileId}`}
                          type="checkbox"
                          checked={selectedTraineeIds.includes(trainee.traineeProfileId)}
                          onChange={() => handleTraineeSelection(trainee.traineeProfileId)}
                          className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft"
                        />
                      </div>
                    </td>

                    <td className="px-6 py-2">{trainee.displayName}</td>

                    <td className="px-6 py-2">{trainee.email}</td>

                    <td className="px-6 py-2">{getStatusBadge('Active')}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <nav className="mt-2 -mb-4" aria-label="Organisation Trainee Selection Table Pagination">
          <ul className="flex -space-x-px text-sm">
            <li>
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={currentPage === 1 || isLoading}
                className="disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-neutral-secondary-medium disabled:hover:text-body flex items-center justify-center text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading font-medium text-sm px-3 h-10 focus:outline-none tracking-wider"
              >
                Previous
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <li key={page}>
                <button
                  type="button"
                  onClick={() => handlePageChange(page)}
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
                onClick={handleNextPage}
                disabled={currentPage === totalPages || isLoading}
                className="disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-neutral-secondary-medium disabled:hover:text-body flex items-center justify-center text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading font-medium text-sm px-3 h-10 focus:outline-none tracking-wider"
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

export default OrganisationTraineeSelectionPage;
