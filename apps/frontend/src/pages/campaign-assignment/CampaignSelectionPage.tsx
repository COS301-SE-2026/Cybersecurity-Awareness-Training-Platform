import type { AssignableCampaignOptionDto } from '@insightful-phish/shared';
import { getAssignableCampaigns } from '../../services/campaign-assignment.service';
import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import CampaignAssignmentPagination from './CampaignAssignmentPagination';
import useCampaignAssignmentOptions from './useCampaignAssignmentOptions';

type DisplayStatus = 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

function getStatusBadge(status: DisplayStatus) {
  const variants: Record<DisplayStatus, string> = {
    ACTIVE: 'ring-success-subtle text-fg-success-strong bg-success-soft',
    COMPLETED: 'ring-brand-subtle text-fg-brand-strong bg-brand-softer',
    PAUSED: 'ring-warning-subtle text-fg-warning bg-warning-soft',
    ARCHIVED: 'ring-default-medium text-fg-heading bg-neutral-secondary-medium',
    DRAFT: 'ring-default-medium text-fg-heading bg-neutral-secondary-medium',
  };

  return (
    <span
      className={`items-flex justify-center items-center w-32 px-4 py-1 pt-[0.4rem] ring-2 ring-inset text-sm font-medium ${variants[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

type CampaignAssignmentPageProps = Readonly<{
  selectedCampaignIds: string[];
  setSelectedCampaignIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedCampaigns: React.Dispatch<React.SetStateAction<AssignableCampaignOptionDto[]>>;
  onBack: () => void;
  onContinue: () => void;
}>;

function CampaignSelectionPage({
  selectedCampaignIds,
  setSelectedCampaignIds,
  setSelectedCampaigns,
  onBack,
  onContinue,
}: CampaignAssignmentPageProps) {
  const {
    items: campaigns,
    searchTerm,
    setSearchTerm,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useCampaignAssignmentOptions<AssignableCampaignOptionDto>({
    loadOptions: getAssignableCampaigns,
    loadErrorMessage: 'Unable To Load Training Campaigns. Please Try Again.',
  });

  const handleCampaignSelection = (campaign: AssignableCampaignOptionDto) => {
    const isAlreadySelected = selectedCampaignIds.includes(campaign.campaignId);

    setSelectedCampaignIds((currentSelectedIds) =>
      isAlreadySelected
        ? currentSelectedIds.filter((id) => id !== campaign.campaignId)
        : [...currentSelectedIds, campaign.campaignId],
    );

    setSelectedCampaigns((currentSelectedCampaigns) => {
      if (isAlreadySelected) {
        return currentSelectedCampaigns.filter(
          (selectedCampaign) => selectedCampaign.campaignId !== campaign.campaignId,
        );
      }

      return [...currentSelectedCampaigns, campaign];
    });
  };

  let campaignSelectionText = 'No Training Campaigns Selected';
  if (selectedCampaignIds.length > 0) {
    campaignSelectionText = `${selectedCampaignIds.length} Training Campaign`;

    if (selectedCampaignIds.length !== 1) {
      campaignSelectionText += 's';
    }

    campaignSelectionText += ' Selected';
  }

  return (
    <div className="-mt-5 -ml-4">
      <div className="grid grid-cols-[1fr_auto]">
        <div>
          {/* PROGRESS HEADING */}
          <h3 className="font-overpass font-regular text-[1.2rem] text-gray-600 tracking-wider font-regular">
            Step 2 of 3
          </h3>

          {/* HEADING */}
          <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
            Training Campaign Selection
          </h3>

          {/* SUB-HEADING */}
          <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost mt-1 text-gray-500 mb-2">
            Select the training campaigns you wish to assign to the selected organisation trainees.
          </p>
        </div>

        <div className="flex flex-col items-end">
          <p
            className={`font-regular tracking-wide text-[1.2rem] font-left font-jost mb-2 ${
              selectedCampaignIds.length === 0 ? 'text-red-600' : 'text-pink'
            }`}
          >
            {campaignSelectionText}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {/* Back Button (TO STEP 1) */}
            <button
              type="button"
              onClick={onBack}
              className="cursor-pointer w-40 font-jost tracking-wider text-xl text-body font-regular bg-gray-200 hover:bg-gray-300 leading-5 px-4 py-3 focus:outline-none"
            >
              Back
            </button>

            {/* CONTINUE BUTTON (TO STEP 3) */}
            <button
              type="button"
              disabled={selectedCampaignIds.length === 0}
              onClick={onContinue}
              className="disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer w-40 font-jost tracking-wider text-xl text-white font-regular bg-main-purple leading-5 px-4 py-3 focus:outline-none"
            >
              Continue
            </button>
          </div>
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
                  <label htmlFor="campaign-search" className="sr-only">
                    Search Training Campaigns
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
                      value={searchTerm}
                      onChange={(event) => {
                        setSearchTerm(event.target.value);
                        setCurrentPage(1);
                      }}
                      id="campaign-search"
                      className="font-jost tracking-wide block w-full p-2 pl-10 text-[1.1rem] h-[2.55rem] text-black border border-gray-300 bg-white focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Search Training Campaigns"
                    />
                  </div>
                </div>
              </div>
              {/* ==== SEARCH BAR ==== */}

              <button
                type="button"
                disabled={selectedCampaignIds.length === 0}
                onClick={() => {
                  setSelectedCampaignIds([]);
                  setSelectedCampaigns([]);
                }}
                className="disabled:hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer w-60 font-jost tracking-wider text-xl text-body font-regular bg-gray-200 hover:bg-gray-300 leading-5 px-4 py-2.5 focus:outline-none"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="relative overflow-x-auto bg-neutral-primary-soft border border-default">
          <table className="w-full min-w-full text-sm text-left rtl:text-right text-body">
            <thead className="bg-faint-purple border-b border-default">
              <tr>
                <th
                  scope="col"
                  className="px-2 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                ></th>
                <th
                  scope="col"
                  className="px-3 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                >
                  Description
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                >
                  Item Count
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                >
                  Current Assignment Count
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                >
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="font-overpass font-regular text-[1rem] tracking-wider">
              {isLoading && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-[1.2rem] tracking-wider text-gray-600 font-jost"
                  >
                    <LoadingSpinnerSVG />
                    Loading Training Campaigns...
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

              {!isLoading && !error && campaigns.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-[1.2rem] tracking-wider text-red-600 font-jost"
                  >
                    No Training Campaigns Found
                  </td>
                </tr>
              )}

              {!isLoading &&
                !error &&
                campaigns.map((campaign) => (
                  <tr
                    key={campaign.campaignId}
                    className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center">
                        <label htmlFor={`campaign-${campaign.campaignId}`} className="sr-only">
                          Select {campaign.name}
                        </label>

                        <input
                          id={`campaign-${campaign.campaignId}`}
                          type="checkbox"
                          checked={selectedCampaignIds.includes(campaign.campaignId)}
                          onChange={() => handleCampaignSelection(campaign)}
                          className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft"
                        />
                      </div>
                    </td>

                    <td className="truncate max-w-[12rem] px-3 py-3" title={campaign.name}>
                      {campaign.name}
                    </td>

                    <td
                      className="truncate max-w-[12rem] px-3 py-3"
                      title={campaign.description ?? 'No Description'}
                    >
                      {campaign.description ?? '—'}
                    </td>

                    {/* STATUS */}
                    <td className="px-3 py-2">{getStatusBadge(campaign.status)}</td>

                    {/* TYPE */}
                    <td
                      className="truncate max-w-[12rem] px-3 py-3"
                      title={
                        campaign.type === 'PREMADE_GENERAL' ? 'Insightful Phish' : 'Organisation'
                      }
                    >
                      {campaign.type === 'PREMADE_GENERAL' ? 'Insightful Phish' : 'Organisation'}
                    </td>

                    <td className="px-3 py-3">{campaign.itemCount}</td>

                    <td className="px-3 py-3">{campaign.assignmentCount}</td>

                    <td className="px-3 py-3">
                      {campaign.startDate && campaign.endDate ? (
                        <>
                          <span className="font-google_sans_code">
                            {new Date(campaign.startDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>{' '}
                          to{' '}
                          <span className="font-google_sans_code">
                            {new Date(campaign.endDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <CampaignAssignmentPagination
          className="mt-2 -mb-5"
          ariaLabel="Organisation Trainee Selection Table Pagination"
          currentPage={currentPage}
          totalPages={totalPages}
          isLoading={isLoading}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
}

export default CampaignSelectionPage;
