import AppLayout from '../components/layout/AppLayout';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type {
  CampaignStatisticsSummaryDto,
  CampaignStatisticsTraineeRowDto,
  CampaignStatusDto,
  CampaignTypeDto,
} from '@insightful-phish/shared';
import StatusBadge, { type DisplayStatus } from '../components/ui/StatusBadge';
import { getOrganisationCampaignStatistics } from '../lib/campaignsApi';
import { ApiError } from '../lib/apiClient';

type CampaignInsightsPageProps = Readonly<{
  statisticsClient?: typeof getOrganisationCampaignStatistics;
  onAuthenticationExpired?: () => void;
}>;

type CampaignInsightsNavigationState = Readonly<{
  campaignName: string;
  campaignDescription: string | null;
  campaignStatus: CampaignStatusDto;
  campaignType: CampaignTypeDto;
  startDate: string | null;
  endDate: string | null;
}>;

const STATUS_LABELS: Record<CampaignStatusDto, DisplayStatus> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

type StatisticsState =
  | Readonly<{ status: 'loading' }>
  | Readonly<{
      status: 'loaded';
      summary: CampaignStatisticsSummaryDto;
      trainees: readonly CampaignStatisticsTraineeRowDto[];
    }>
  | Readonly<{ status: 'error'; message: string }>;

const TRAINEE_STATUS_LABELS: Record<
  CampaignStatisticsTraineeRowDto['traineeStatus'],
  DisplayStatus
> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  DISABLED: 'Disabled',
};

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function getCampaignInformation(state: unknown): CampaignInsightsNavigationState | null {
  if (
    typeof state !== 'object' ||
    state === null ||
    'campaignName' in state === false ||
    typeof state.campaignName !== 'string' ||
    state.campaignName.trim() === '' ||
    'campaignDescription' in state === false ||
    isNullableString(state.campaignDescription) === false ||
    'campaignStatus' in state === false ||
    (state.campaignStatus !== 'DRAFT' &&
      state.campaignStatus !== 'ACTIVE' &&
      state.campaignStatus !== 'PAUSED' &&
      state.campaignStatus !== 'COMPLETED' &&
      state.campaignStatus !== 'ARCHIVED') ||
    'campaignType' in state === false ||
    (state.campaignType !== 'PREMADE_GENERAL' && state.campaignType !== 'ORGANISATION_CUSTOM') ||
    'startDate' in state === false ||
    isNullableString(state.startDate) === false ||
    'endDate' in state === false ||
    isNullableString(state.endDate) === false
  ) {
    return null;
  }

  return {
    campaignName: state.campaignName,
    campaignDescription: state.campaignDescription,
    campaignStatus: state.campaignStatus,
    campaignType: state.campaignType,
    startDate: state.startDate,
    endDate: state.endDate,
  };
}

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

function CampaignInsightsPage({
  statisticsClient = getOrganisationCampaignStatistics,
  onAuthenticationExpired,
}: CampaignInsightsPageProps) {
  const [statisticsState, setStatisticsState] = useState<StatisticsState>({
    status: 'loading',
  });
  const statisticsRequestIdRef = useRef(0);
  const { organisationId, campaignId } = useParams<{
    organisationId: string;
    campaignId: string;
  }>();
  const location = useLocation();
  const campaignInformation = getCampaignInformation(location.state);
  const campaignName = campaignInformation?.campaignName ?? 'Campaign';
  const campaignStatus =
    campaignInformation === null ? 'Unknown' : STATUS_LABELS[campaignInformation.campaignStatus];
  const duration =
    campaignInformation === null
      ? '—'
      : formatDuration(campaignInformation.startDate, campaignInformation.endDate);
  const campaignType =
    campaignInformation === null
      ? '—'
      : campaignInformation.campaignType === 'PREMADE_GENERAL'
        ? 'Platform Campaign'
        : 'Organisation Campaign';
  const campaignOwner =
    campaignInformation === null
      ? '—'
      : campaignInformation.campaignType === 'PREMADE_GENERAL'
        ? 'Insightful Phish'
        : 'Organisation';
  const description = campaignInformation?.campaignDescription?.trim() || '—';
  const campaignPath =
    organisationId === undefined || campaignId === undefined
      ? '/'
      : `/organisations/${organisationId}/campaigns/${campaignId}`;
  const assignmentPath =
    organisationId === undefined
      ? '/'
      : `/organisations/${organisationId}/campaign-assignments/new`;

  const requestStatistics = useCallback(async () => {
    if (organisationId === undefined || campaignId === undefined) {
      return;
    }

    const requestId = ++statisticsRequestIdRef.current;

    try {
      const firstResponse = await statisticsClient(organisationId, campaignId, {
        page: 1,
        limit: 100,
      });
      const trainees = [...firstResponse.trainees];

      for (let page = 2; page <= firstResponse.pagination.totalPages; page += 1) {
        if (statisticsRequestIdRef.current !== requestId) {
          return;
        }

        const pageResponse = await statisticsClient(organisationId, campaignId, {
          page,
          limit: 100,
        });

        trainees.push(...pageResponse.trainees);
      }

      if (statisticsRequestIdRef.current === requestId) {
        setStatisticsState({
          status: 'loaded',
          summary: firstResponse.summary,
          trainees,
        });
      }
    } catch (requestError) {
      if (statisticsRequestIdRef.current === requestId) {
        if (requestError instanceof ApiError && requestError.status === 401) {
          onAuthenticationExpired?.();
        }

        setStatisticsState({
          status: 'error',
          message: getStatisticsErrorMessage(requestError),
        });
      }
    }
  }, [campaignId, onAuthenticationExpired, organisationId, statisticsClient]);

  useEffect(() => {
    const requestTimeout = globalThis.setTimeout(() => {
      void requestStatistics();
    }, 0);

    return () => {
      globalThis.clearTimeout(requestTimeout);
      statisticsRequestIdRef.current += 1;
    };
  }, [requestStatistics]);

  const statisticsSummary = statisticsState.status === 'loaded' ? statisticsState.summary : null;
  const assignedTrainees = statisticsState.status === 'loaded' ? statisticsState.trainees : [];
  const pendingStatisticsValue = statisticsState.status === 'loading' ? '…' : '—';
  const assignedTraineeCount = statisticsSummary?.assignedTraineeCount ?? pendingStatisticsValue;
  const startedTraineeCount = statisticsSummary?.startedTraineeCount ?? pendingStatisticsValue;
  const completedTraineeCount = statisticsSummary?.completedTraineeCount ?? pendingStatisticsValue;
  const overallProgressPercentage =
    statisticsSummary === null
      ? pendingStatisticsValue
      : statisticsSummary.overallProgressPercentage === null
        ? '—'
        : `${statisticsSummary.overallProgressPercentage}%`;
  const averageQuizScorePercentage =
    statisticsSummary === null
      ? pendingStatisticsValue
      : statisticsSummary.averageQuizScorePercentage === null
        ? '—'
        : `${statisticsSummary.averageQuizScorePercentage}%`;

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
            {campaignName}
          </h1>

          {/* DIVIDER */}
          <div className="border border-b border-gray-300 mt-4 -mb-2"> </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost font-medium text-dark-pink mt-4 mb-1">
                Status
              </p>
              <div className="font-overpass tracking-wider">
                <StatusBadge status={campaignStatus} />
              </div>
            </div>

            <div>
              <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink mt-4 mb-1">
                Duration
              </p>
              <p className="font-regular tracking-wider text-md font-google_sans_code text-gray-500">
                {duration}
              </p>
            </div>

            <div>
              <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink mt-4 mb-1">
                Campaign Type
              </p>
              <p className="font-regular tracking-wider text-md font-google_sans_code text-gray-500">
                {campaignType}
              </p>
            </div>

            <div>
              <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink mt-4 mb-1">
                Campaign Owner
              </p>
              <p className="font-regular tracking-wider text-md font-google_sans_code text-gray-500">
                {campaignOwner}
              </p>
            </div>
          </div>

          {/* CAMPAIGN DESCRIPTION */}
          <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink mt-4 mb-1">
            Description
          </p>
          <div className="bg-neutral-secondary-medium border border-default-medium p-2 font-regular tracking-wider shadow-xs text-[1.1rem] font-justify font-jost text-gray-500 mb-2">
            <p className="m-0 max-h-[5rem] overflow-y-auto whitespace-pre-wrap leading-[1.65rem]">
              {description}
            </p>
          </div>

          {/* DIVIDER */}
          <div className="border border-b border-gray-300 mb-4 mt-1"> </div>

          <div
            className="grid grid-cols-5 gap-3 py-2 px-4 bg-white border border-default-medium p-2 font-regular tracking-wider shadow-xs text-[1.1rem] font-justify font-jost text-gray-500 mb-2"
            aria-label="Campaign summary statistics"
            aria-busy={statisticsState.status === 'loading'}
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

          {statisticsState.status === 'error' && (
            <div className="mb-2 flex items-center gap-3 text-red-600" role="alert">
              <span>{statisticsState.message}</span>
              <button
                type="button"
                className="cursor-pointer font-jost font-medium text-purple hover:underline"
                onClick={() => {
                  setStatisticsState({ status: 'loading' });
                  void requestStatistics();
                }}
              >
                Retry Statistics
              </button>
            </div>
          )}

          {/* Table Heading */}
          <h3 className="font-jost text-xl text-dark-pink tracking-wider font-medium mb-3 mt-4">
            Assigned Trainees ({assignedTraineeCount})
          </h3>

          {/* Assigned Trainees Table */}
          <div className="relative max-h-[12.5rem] overflow-y-auto overflow-x-auto bg-neutral-primary-soft border border-default">
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
                {statisticsState.status === 'loading' && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-[1.2rem] tracking-wider text-gray-600 font-jost"
                    >
                      Loading Assigned Trainees…
                    </td>
                  </tr>
                )}

                {statisticsState.status === 'error' && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-[1.2rem] tracking-wider text-red-600 font-jost"
                    >
                      Assigned trainees could not be loaded.
                    </td>
                  </tr>
                )}

                {statisticsState.status === 'loaded' && assignedTrainees.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-[1.2rem] tracking-wider text-gray-600 font-jost"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <p>No Assigned Trainees</p>
                        <Link
                          to={assignmentPath}
                          className="inline-flex items-center gap-1 text-purple hover:underline"
                        >
                          <span>Assign Trainees</span>
                          <span className="material-symbols-outlined" aria-hidden="true">
                            arrow_forward
                          </span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}

                {assignedTrainees.map((trainee) => {
                  const quizAverage =
                    trainee.averageQuizScorePercentage === null
                      ? '—'
                      : `${trainee.averageQuizScorePercentage}%`;

                  return (
                    <tr
                      key={trainee.assignmentId}
                      className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default"
                    >
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
                        <div
                          className="w-full bg-neutral-quaternary h-2.5"
                          role="progressbar"
                          aria-label={`${trainee.displayName} progress`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={trainee.progress.progressPercentage}
                        >
                          <div
                            className="bg-main-purple h-2.5"
                            style={{ width: `${trainee.progress.progressPercentage}%` }}
                          />
                        </div>
                      </td>
                      <td
                        className="truncate max-w-[4rem] px-6 py-2 font-google_sans_code"
                        title={`${trainee.progress.completedItemCount} out of ${trainee.progress.totalItemCount} Campaign Items Completed`}
                      >
                        {trainee.progress.completedItemCount}/{trainee.progress.totalItemCount}
                      </td>
                      <td
                        className="px-6 py-2 font-google_sans_code"
                        title={
                          trainee.averageQuizScorePercentage === null
                            ? 'No submitted Quiz score'
                            : `${trainee.averageQuizScorePercentage}% Overall Quiz Average`
                        }
                      >
                        {quizAverage}
                      </td>
                      <td className="px-6 py-2">
                        <StatusBadge status={TRAINEE_STATUS_LABELS[trainee.traineeStatus]} />
                      </td>
                      <td className="px-6 py-2">
                        <button
                          className="cursor-pointer font-jost text-[1.1rem] text-red-600 hover:underline"
                          type="button"
                          title={`Unassign ${trainee.displayName} from ${campaignName}`}
                        >
                          <strong>Unassign</strong>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
export default CampaignInsightsPage;
