import AppLayout from '../components/layout/AppLayout';
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import type {
  CampaignStatisticsCampaignDto,
  CampaignStatisticsSummaryDto,
  CampaignStatisticsTraineeRowDto,
  CampaignStatusDto,
  CampaignTypeDto,
} from '@insightful-phish/shared';
import BasicAlert from '../components/alerts/BasicAlert';
import BasicConfirmationModal from '../components/layout/modals/BasicConfirmationModal';
import StatusBadge, { type DisplayStatus } from '../components/ui/StatusBadge';
import { getOrganisationCampaignStatistics } from '../lib/campaignsApi';
import { ApiError } from '../lib/apiClient';
import CampaignAssignmentPagination from './campaign-assignment/CampaignAssignmentPagination';
import { deleteCampaignAssignment } from '../services/campaign-assignment.service';

type CampaignInsightsPageProps = Readonly<{
  statisticsClient?: typeof getOrganisationCampaignStatistics;
  unassignClient?: typeof deleteCampaignAssignment;
  onAuthenticationExpired?: () => void;
}>;

const STATUS_LABELS: Record<CampaignStatusDto, DisplayStatus> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

type StatisticsData = Readonly<{
  campaign: CampaignStatisticsCampaignDto;
  summary: CampaignStatisticsSummaryDto;
  trainees: readonly CampaignStatisticsTraineeRowDto[];
}>;

const TRAINEE_STATUS_LABELS: Record<
  CampaignStatisticsTraineeRowDto['traineeStatus'],
  DisplayStatus
> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  DISABLED: 'Disabled',
};

function formatDate(value: string): string | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDuration(startDate: string | null, endDate: string | null): string {
  if (startDate === null || endDate === null) {
    return '—';
  }

  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);

  if (formattedStartDate === null || formattedEndDate === null) {
    return '—';
  }

  return `${formattedStartDate} to ${formattedEndDate}`;
}

function getStatisticsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Your session is no longer valid. Sign in again.';
    }

    if (error.status === 403 || error.status === 404) {
      return 'Campaign statistics are unavailable.';
    }

    if (error.status === 422) {
      return 'Campaign statistics could not be requested. Try again.';
    }

    if (error.status === 429) {
      return 'Too many statistics requests. Wait a moment and try again.';
    }
  }

  return 'Campaign statistics could not be loaded. Try again.';
}

function getUnassignErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Your session is no longer valid. Sign in again.';
    }

    if (error.status === 403) {
      return 'You no longer have permission to unassign this trainee.';
    }

    if (error.status === 422) {
      return 'This trainee could not be unassigned. Refresh and try again.';
    }

    if (error.status === 429) {
      return 'Too many unassignment requests. Wait a moment and try again.';
    }
  }

  return 'This trainee could not be unassigned. Try again.';
}

function getCampaignTypeLabel(campaignType: CampaignTypeDto | undefined): string {
  if (campaignType === undefined) {
    return '—';
  }

  if (campaignType === 'PREMADE_GENERAL') {
    return 'Platform Campaign';
  }

  return 'Organisation Campaign';
}

function getCampaignOwnerLabel(campaignType: CampaignTypeDto | undefined): string {
  if (campaignType === undefined) {
    return '—';
  }

  if (campaignType === 'PREMADE_GENERAL') {
    return 'Insightful Phish';
  }

  return 'Organisation';
}

type CampaignPresentation = Readonly<{
  name: string;
  status: DisplayStatus;
  duration: string;
  type: string;
  owner: string;
  description: string;
}>;

function getCampaignPresentation(
  campaign: CampaignStatisticsCampaignDto | undefined,
): CampaignPresentation {
  if (campaign === undefined) {
    return {
      name: 'Campaign',
      status: 'Unknown',
      duration: '—',
      type: '—',
      owner: '—',
      description: '—',
    };
  }

  return {
    name: campaign.name,
    status: STATUS_LABELS[campaign.status],
    duration: formatDuration(campaign.startDate, campaign.endDate),
    type: getCampaignTypeLabel(campaign.campaignType),
    owner: getCampaignOwnerLabel(campaign.campaignType),
    description: campaign.description?.trim() || '—',
  };
}

function getCampaignPath(organisationId: string | undefined, campaignId: string | undefined) {
  if (organisationId === undefined || campaignId === undefined) {
    return '/';
  }

  return `/organisations/${organisationId}/campaigns/${campaignId}`;
}

function getAssignmentPath(organisationId: string | undefined) {
  if (organisationId === undefined) {
    return '/';
  }

  return `/organisations/${organisationId}/campaign-assignments/new`;
}

function getPercentageDisplay(value: number | null | undefined, isInitialLoading: boolean): string {
  if (value === undefined) {
    return isInitialLoading ? '…' : '—';
  }

  if (value === null) {
    return '—';
  }

  return `${value}%`;
}

type CampaignTraineeRowProps = Readonly<{
  trainee: CampaignStatisticsTraineeRowDto;
  campaignName: string;
  onUnassign: (trainee: CampaignStatisticsTraineeRowDto) => void;
}>;

function CampaignTraineeRow({ trainee, campaignName, onUnassign }: CampaignTraineeRowProps) {
  const quizAverage = getPercentageDisplay(trainee.averageQuizScorePercentage, false);
  const quizAverageTitle =
    trainee.averageQuizScorePercentage === null
      ? 'No submitted Quiz score'
      : `${trainee.averageQuizScorePercentage}% Overall Quiz Average`;

  return (
    <tr className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default">
      <td className="truncate max-w-[4rem] px-6 py-2" title={trainee.displayName}>
        {trainee.displayName}
      </td>
      <td className="truncate max-w-[4rem] px-6 py-2" title={trainee.email}>
        <a
          href={`mailto:${trainee.email}`}
          className="text-fg-brand hover:underline font-google_sans_code"
        >
          {trainee.email}
        </a>
      </td>
      <td className="px-6 py-2">
        <span className="text-sm font-google_sans_code text-purple">
          {trainee.progress.progressPercentage}%
        </span>
        <progress
          className="block h-2.5 w-full appearance-none overflow-hidden bg-neutral-quaternary accent-[#8400ff] [&::-webkit-progress-bar]:bg-neutral-quaternary [&::-webkit-progress-value]:bg-main-purple [&::-moz-progress-bar]:bg-main-purple"
          aria-label={`${trainee.displayName} progress`}
          max={100}
          value={trainee.progress.progressPercentage}
        >
          {trainee.progress.progressPercentage}%
        </progress>
      </td>
      <td
        className="truncate max-w-[4rem] px-6 py-2 font-google_sans_code"
        title={`${trainee.progress.completedItemCount} out of ${trainee.progress.totalItemCount} Campaign Items Completed`}
      >
        {trainee.progress.completedItemCount}/{trainee.progress.totalItemCount}
      </td>
      <td className="px-6 py-2 font-google_sans_code" title={quizAverageTitle}>
        {quizAverage}
      </td>
      <td className="px-6 py-2">
        <StatusBadge status={TRAINEE_STATUS_LABELS[trainee.traineeStatus]} />
      </td>
      <td className="px-6 py-2">
        {trainee.allowedActions.canUnassign === true ? (
          <button
            className="cursor-pointer font-jost text-[1.1rem] text-red-600 hover:underline"
            type="button"
            title={`Unassign ${trainee.displayName} from ${campaignName}`}
            onClick={() => onUnassign(trainee)}
          >
            <strong>Unassign</strong>
          </button>
        ) : (
          <span aria-label="Unassign unavailable">—</span>
        )}
      </td>
    </tr>
  );
}

type AssignedTraineesTableBodyProps = Readonly<{
  statisticsData: StatisticsData | null;
  isLoading: boolean;
  assignmentPath: string;
  campaignName: string;
  onUnassign: (trainee: CampaignStatisticsTraineeRowDto) => void;
  onRetry: () => void;
}>;

function AssignedTraineesTableBody({
  statisticsData,
  isLoading,
  assignmentPath,
  campaignName,
  onUnassign,
  onRetry,
}: AssignedTraineesTableBodyProps) {
  if (statisticsData === null && isLoading) {
    return (
      <tr>
        <td
          colSpan={7}
          className="py-8 text-center text-[1.2rem] tracking-wider text-gray-600 font-jost"
        >
          Loading Assigned Trainees…
        </td>
      </tr>
    );
  }

  if (statisticsData === null) {
    return (
      <tr>
        <td
          colSpan={7}
          className="py-8 text-center text-[1.2rem] tracking-wider text-red-600 font-jost"
        >
          <div className="flex flex-col items-center gap-2">
            <p>Assigned trainees could not be loaded.</p>
            <button
              type="button"
              className="cursor-pointer font-jost font-medium text-purple hover:underline"
              onClick={onRetry}
            >
              Retry Statistics
            </button>
          </div>
        </td>
      </tr>
    );
  }

  if (statisticsData.trainees.length === 0) {
    return (
      <tr>
        <td
          colSpan={7}
          className="py-8 text-center text-[1.2rem] tracking-wider text-gray-600 font-jost"
        >
          <div className="flex flex-col items-center gap-2">
            <p className="text-red-600">No Assigned Trainees</p>
            <Link to={assignmentPath} className="inline-flex items-center gap-1 text-purple">
              <span className="hover:underline">Assign Trainees</span>
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </td>
      </tr>
    );
  }

  return statisticsData.trainees.map((trainee) => (
    <CampaignTraineeRow
      key={trainee.assignmentId}
      trainee={trainee}
      campaignName={campaignName}
      onUnassign={onUnassign}
    />
  ));
}

function CampaignInsightsPage({
  statisticsClient = getOrganisationCampaignStatistics,
  unassignClient = deleteCampaignAssignment,
  onAuthenticationExpired,
}: CampaignInsightsPageProps) {
  const [statisticsData, setStatisticsData] = useState<StatisticsData | null>(null);
  const [isStatisticsLoading, setIsStatisticsLoading] = useState(true);
  const [statisticsError, setStatisticsError] = useState<string | null>(null);
  const [selectedTrainee, setSelectedTrainee] = useState<CampaignStatisticsTraineeRowDto | null>(
    null,
  );
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [unassignError, setUnassignError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const statisticsRequestIdRef = useRef(0);
  const unassignRequestInFlightRef = useRef(false);
  const { organisationId, campaignId } = useParams<{
    organisationId: string;
    campaignId: string;
  }>();
  const campaignPresentation = getCampaignPresentation(statisticsData?.campaign);
  const campaignPath = getCampaignPath(organisationId, campaignId);
  const assignmentPath = getAssignmentPath(organisationId);

  const handleSetCurrentPage: Dispatch<SetStateAction<number>> = useCallback((nextPage) => {
    setIsStatisticsLoading(true);
    setStatisticsError(null);
    setCurrentPage(nextPage);
  }, []);

  const requestStatistics = useCallback(async () => {
    if (organisationId === undefined || campaignId === undefined) {
      setStatisticsError('Campaign statistics are unavailable.');
      setIsStatisticsLoading(false);
      return;
    }

    const requestId = ++statisticsRequestIdRef.current;
    let pageCorrectionPending = false;

    try {
      const response = await statisticsClient(organisationId, campaignId, {
        page: currentPage,
        limit: 3,
      });

      if (statisticsRequestIdRef.current === requestId) {
        const nearestValidPage = Math.max(response.pagination.totalPages, 1);

        if (currentPage > nearestValidPage) {
          pageCorrectionPending = true;
          setTotalPages(response.pagination.totalPages);
          handleSetCurrentPage(nearestValidPage);
          return;
        }

        setStatisticsData({
          campaign: response.campaign,
          summary: response.summary,
          trainees: response.trainees,
        });
        setStatisticsError(null);
        setTotalPages(response.pagination.totalPages);
      }
    } catch (requestError) {
      if (statisticsRequestIdRef.current === requestId) {
        if (requestError instanceof ApiError && requestError.status === 401) {
          onAuthenticationExpired?.();
        }

        setStatisticsError(getStatisticsErrorMessage(requestError));
      }
    } finally {
      if (statisticsRequestIdRef.current === requestId && pageCorrectionPending !== true) {
        setIsStatisticsLoading(false);
      }
    }
  }, [
    campaignId,
    currentPage,
    handleSetCurrentPage,
    onAuthenticationExpired,
    organisationId,
    statisticsClient,
  ]);

  const refreshStatistics = useCallback(async () => {
    setIsStatisticsLoading(true);
    setStatisticsError(null);
    await requestStatistics();
  }, [requestStatistics]);

  const handleConfirmUnassign = useCallback(async () => {
    if (
      organisationId === undefined ||
      selectedTrainee === null ||
      unassignRequestInFlightRef.current === true
    ) {
      return;
    }

    unassignRequestInFlightRef.current = true;
    setIsUnassigning(true);
    setUnassignError(null);

    try {
      await unassignClient(organisationId, selectedTrainee.assignmentId);
      setSelectedTrainee(null);
      await refreshStatistics();
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 404) {
        setSelectedTrainee(null);
        await refreshStatistics();
        return;
      }

      if (requestError instanceof ApiError && requestError.status === 401) {
        onAuthenticationExpired?.();
      }

      setUnassignError(getUnassignErrorMessage(requestError));
    } finally {
      unassignRequestInFlightRef.current = false;
      setIsUnassigning(false);
    }
  }, [onAuthenticationExpired, organisationId, refreshStatistics, selectedTrainee, unassignClient]);

  useEffect(() => {
    let isCurrent = true;

    globalThis.queueMicrotask(() => {
      if (isCurrent === true) {
        void requestStatistics();
      }
    });

    return () => {
      isCurrent = false;
      statisticsRequestIdRef.current += 1;
    };
  }, [requestStatistics]);

  const statisticsSummary = statisticsData?.summary;
  const isInitialLoading = statisticsData === null && isStatisticsLoading;
  const pendingStatisticsValue = isInitialLoading ? '…' : '—';
  const assignedTraineeCount = statisticsSummary?.assignedTraineeCount ?? pendingStatisticsValue;
  const startedTraineeCount = statisticsSummary?.startedTraineeCount ?? pendingStatisticsValue;
  const completedTraineeCount = statisticsSummary?.completedTraineeCount ?? pendingStatisticsValue;
  const overallProgressPercentage = getPercentageDisplay(
    statisticsSummary?.overallProgressPercentage,
    isInitialLoading,
  );
  const averageQuizScorePercentage = getPercentageDisplay(
    statisticsSummary?.averageQuizScorePercentage,
    isInitialLoading,
  );

  const handleSelectTraineeForUnassign = useCallback((trainee: CampaignStatisticsTraineeRowDto) => {
    setSelectedTrainee(trainee);
    setUnassignError(null);
  }, []);

  const handleRetryStatistics = useCallback(() => {
    void refreshStatistics();
  }, [refreshStatistics]);

  const handleDismissStatisticsError = useCallback(() => {
    setStatisticsError(null);
  }, []);

  const handleSubmitUnassign = useCallback(() => {
    void handleConfirmUnassign();
  }, [handleConfirmUnassign]);

  const handleCancelUnassign = useCallback(() => {
    setSelectedTrainee(null);
    setUnassignError(null);
  }, []);

  return (
    <AppLayout
      contentStyle={{
        backgroundColor: '#F3F4F6',
      }}
    >
      <div>
        {/* HEADING  and SUB-HEADING */}
        <div
          style={{
            padding: '1.4rem',
            boxSizing: 'border-box',
            flexShrink: 0,
            paddingBottom: '0.4rem',
          }}
        >
          <Link
            to={campaignPath}
            className="-mt-4 inline-flex items-center gap-2 font-jost text-xl font-regular tracking-wide text-purple hover:text-purple cursor-pointer transition-colours"
          >
            <span className="material-icons-sharp" aria-hidden="true">
              arrow_back
            </span>
            <span className="hover:underline"> Back to Campaign</span>
          </Link>

          <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink mb-1">
            Campaign
          </p>
          <h1
            style={{
              margin: 0,
              marginBottom: '0.2rem',
              fontWeight: 500,
              fontSize: '2.2rem',
              lineHeight: 1,
              fontFamily: 'Jost',
              color: 'rgb(132, 25, 255)',
            }}
          >
            {campaignPresentation.name}
          </h1>

          {/* DIVIDER */}
          <div className="border border-b border-gray-300 mt-4 -mb-2"> </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost font-medium text-dark-pink mt-4 mb-1">
                Status
              </p>
              <div className="font-overpass tracking-wider">
                <StatusBadge status={campaignPresentation.status} />
              </div>
            </div>

            <div>
              <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink mt-4 mb-1">
                Duration
              </p>
              <p className="font-regular tracking-wider text-md font-google_sans_code text-gray-500">
                {campaignPresentation.duration}
              </p>
            </div>

            <div>
              <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink mt-4 mb-1">
                Campaign Type
              </p>
              <p className="font-regular tracking-wider text-md font-google_sans_code text-gray-500">
                {campaignPresentation.type}
              </p>
            </div>

            <div>
              <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink mt-4 mb-1">
                Campaign Owner
              </p>
              <p className="font-regular tracking-wider text-md font-google_sans_code text-gray-500">
                {campaignPresentation.owner}
              </p>
            </div>
          </div>

          {/* CAMPAIGN DESCRIPTION */}
          <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink mt-4 mb-1">
            Description
          </p>
          <div className="bg-neutral-secondary-medium border border-default-medium p-2 font-regular tracking-wider shadow-xs text-[1.1rem] font-justify font-jost text-gray-500 mb-2">
            <p className="m-0 max-h-[3.3rem] overflow-y-auto whitespace-pre-wrap leading-[1.65rem]">
              {campaignPresentation.description}
            </p>
          </div>

          {/* DIVIDER */}
          <div className="border border-b border-gray-300 mb-4 mt-1"> </div>

          <div
            className="grid grid-cols-5 gap-3 py-2 px-4 bg-white border border-default-medium p-2 font-regular tracking-wider shadow-xs text-[1.1rem] font-justify font-jost text-gray-500 mb-2"
            aria-label="Campaign summary statistics"
            aria-busy={isStatisticsLoading}
          >
            {/* Assigned Count */}
            <div>
              <div>
                <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink">
                  Assigned
                </p>
                <p className="font-regular tracking-wider text-[1.3rem] font-justify font-medium font-google_sans_code text-purple">
                  {assignedTraineeCount}
                </p>
              </div>
            </div>

            {/* Started Count */}
            <div>
              <div>
                <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink">
                  Started
                </p>
                <p className="font-regular tracking-wider text-[1.3rem] font-justify font-medium font-google_sans_code text-purple">
                  {startedTraineeCount}
                </p>
              </div>
            </div>

            {/* Completed Count */}
            <div>
              <div>
                <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink">
                  Completed
                </p>
                <p className="font-regular tracking-wider text-[1.3rem] font-justify font-medium font-google_sans_code text-purple">
                  {completedTraineeCount}
                </p>
              </div>
            </div>

            {/* Campaign Progression */}
            <div>
              <div>
                <p
                  title="Overall Average Campaign Progression Percentage"
                  className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink"
                >
                  Progression
                </p>
                <p className="font-regular tracking-wider text-[1.3rem] font-justify font-medium font-google_sans_code text-purple">
                  {overallProgressPercentage}
                </p>
              </div>
            </div>

            {/* Campaign Progression */}
            <div>
              <div>
                <p
                  title="Overall Average Quiz Grade"
                  className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink"
                >
                  Quiz Average
                </p>
                <p className="font-regular tracking-wider text-[1.3rem] font-justify font-medium font-google_sans_code text-purple">
                  {averageQuizScorePercentage}
                </p>
              </div>
            </div>
          </div>

          {statisticsError !== null && (
            <BasicAlert variant="danger" onClose={handleDismissStatisticsError}>
              <div className="flex items-center gap-3">
                <span>{statisticsError}</span>
                <button
                  type="button"
                  className="cursor-pointer font-jost font-medium text-purple hover:underline"
                  onClick={handleRetryStatistics}
                >
                  Retry Statistics
                </button>
              </div>
            </BasicAlert>
          )}

          {/* Table Heading */}
          <h3 className="font-jost text-xl text-dark-pink tracking-wider font-medium mb-3 mt-4">
            Assigned Trainees ({assignedTraineeCount})
          </h3>

          {/* Assigned Trainees Table */}
          <div className="relative max-h-[12.2rem] overflow-y-hidden overflow-x-auto bg-neutral-primary-soft border border-default">
            <table className="w-full text-sm text-left rtl:text-right text-body">
              <thead className="bg-faint-purple border-b border-default">
                <tr>
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
                    Progress
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Items
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Quiz
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Action(s)
                  </th>
                </tr>
              </thead>
              <tbody className="font-overpass font-regular text-[1rem] tracking-wider">
                <AssignedTraineesTableBody
                  statisticsData={statisticsData}
                  isLoading={isStatisticsLoading}
                  assignmentPath={assignmentPath}
                  campaignName={campaignPresentation.name}
                  onUnassign={handleSelectTraineeForUnassign}
                  onRetry={handleRetryStatistics}
                />
              </tbody>
            </table>
          </div>
          <CampaignAssignmentPagination
            className="mt-2 -mb-4"
            ariaLabel="Assigned Trainees Table Pagination"
            currentPage={currentPage}
            totalPages={totalPages}
            isLoading={isStatisticsLoading}
            setCurrentPage={handleSetCurrentPage}
          />
        </div>
      </div>
      {selectedTrainee !== null && (
        <BasicConfirmationModal
          title="Unassign Trainee from Campaign"
          message={`Are you sure that you want to unassign ${selectedTrainee.displayName} from ${campaignPresentation.name}? Their campaign progress will be permanently removed.`}
          confirmButtonText="Unassign"
          cancelButtonText="Keep Assigned"
          confirmButtonVariant="danger"
          onConfirm={handleSubmitUnassign}
          onCancel={handleCancelUnassign}
          isConfirming={isUnassigning}
          isConfirmDisabled={isUnassigning}
          isDismissDisabled={isUnassigning}
          errorMessage={unassignError}
          appendQuestionMark={false}
        />
      )}
    </AppLayout>
  );
}
export default CampaignInsightsPage;
