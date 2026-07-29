import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinnerSVG from '../components/LoadingSpinnerSVG';
import BasicAlert from '../components/alerts/BasicAlert';
import { useAuth } from '../context/useAuth';
import { ApiError } from '../lib/apiClient';
import {
  getPlatformOrganisationRequest,
  listPlatformOrganisationRequests,
  markPlatformOrganisationRequestContacted,
  type OrganisationRequestStatus,
  type PlatformOrganisationRequestListItemDto,
  type PlatformOrganisationStatus,
  type PlatformOrganisationRequestReviewDto,
} from '../services/platform-organisation-management.service';
import { Dropdown, DropdownItem } from 'flowbite-react';
import AppLayout from '../components/layout/AppLayout';
import ReviewOrganisationRegistrationRequstModal from '../components/layout/modals/ReviewOrganisationRegistrationRequestModal';

type RequestStatusFilter = 'ALL' | OrganisationRequestStatus;
type OrganisationStatusFilter = 'ALL' | PlatformOrganisationStatus;

const statusLabels: Record<string, string> = {
  PENDING_REVIEW: 'Pending Review',
  CONTACTED: 'Contacted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  APPROVED_PENDING_SETUP: 'Approved - Setup Pending',
  PENDING_ONBOARDING: 'Approved - Waiting For Setup',
  ONBOARDING: 'Onboarding',
  SETUP_EMAIL_FAILED: 'Setup Email Failed',
  SETUP_TOKEN_EXPIRED: 'Setup Token Expired',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
  ARCHIVED: 'Archived',
  DISABLED: 'Disabled',
};
const requestStatusFilterOptions: Array<{ value: RequestStatusFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];
const organisationStatusFilterOptions: Array<{ value: OrganisationStatusFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING_ONBOARDING', label: 'Pending Onboarding' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ARCHIVED', label: 'Archived' },
];
function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
    case 'APPROVED':
      return 'ring-success-subtle text-fg-success-strong bg-success-soft';
    case 'PENDING_REVIEW':
    case 'APPROVED_PENDING_SETUP':
    case 'PENDING_ONBOARDING':
      return 'ring-warning-subtle text-fg-warning bg-warning-soft';
    case 'CONTACTED':
    case 'ONBOARDING':
      return 'ring-brand-subtle text-fg-brand-strong bg-brand-softer';
    case 'REJECTED':
    case 'CANCELLED':
    case 'SETUP_EMAIL_FAILED':
    case 'SETUP_TOKEN_EXPIRED':
    case 'SUSPENDED':
    case 'DISABLED':
      return 'ring-danger-subtle text-fg-danger-strong bg-danger-soft';

    case 'INACTIVE':
    case 'ARCHIVED':
    default:
      return 'ring-default-medium text-heading bg-neutral-secondary-medium';
  }
}
function getStatusBadge(status: string) {
  return (
    <span
      className={`inline-flex min-w-28 items-center justify-center px-4 py-1 pt-[0.4rem] text-center text-sm font-medium ring-1 ring-inset ${getStatusBadgeClass(status)}`}
    >
      {' '}
      {statusLabels[status] ?? status}{' '}
    </span>
  );
}
function getFilterLabel(
  value: RequestStatusFilter | OrganisationStatusFilter,
  fallback: string,
): string {
  return value === 'ALL' ? fallback : (statusLabels[value] ?? value);
}

function PlatformOrganisationManagementPage() {
  const navigate = useNavigate();
  const { token, clearAuth } = useAuth();
  const [requests, setRequests] = useState<PlatformOrganisationRequestListItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] =
    useState<PlatformOrganisationRequestReviewDto | null>(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isContacting, setIsContacting] = useState(false);
  const [notification, setNotification] = useState<{
    variant: 'success' | 'warning';
    message: string;
  } | null>(null);

  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<RequestStatusFilter>('ALL');
  const [organisationStatusFilter, setOrganisationStatusFilter] =
    useState<OrganisationStatusFilter>('ALL');
  const loadRequests = useCallback(async () => {
    if (!token) {
      setRequests([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError('');

    try {
      const response = await listPlatformOrganisationRequests({}, token);
      setRequests(response.requests);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuth();
        navigate('/login?notice=session_expired', { replace: true });
        return;
      } else if (error instanceof ApiError && error.status === 403) {
        setLoadError('You Do Not Have Permission To View Platform Organisation Requests');
      } else if (error instanceof ApiError && error.status === 429) {
        setLoadError('Too Many Requests! Please Wait A Moment And Try Again');
      } else {
        setLoadError('Failed To Load Organisation Registration Requests');
      }

      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [clearAuth, navigate, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRequests();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRequests]);

  const normalisedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredRequests = requests.filter((request) => {
    const searchableValues = [
      request.submittedOrganisationName,
      request.submittedOrganisationSize,
      request.submittedWebsite,
      request.submittedPrimaryDomain,
      request.representativeEmail,
      request.representativeFirstName,
      request.representativeLastName,
      request.status,
      statusLabels[request.status],
      request.organisationStatus,
      request.derivedStatus,
      statusLabels[request.derivedStatus],
    ];

    const matchesSearch =
      normalisedSearchTerm.length === 0 ||
      searchableValues
        .filter((value): value is string | number => value !== null)
        .join(' ')
        .toLowerCase()
        .includes(normalisedSearchTerm);

    const matchesRequestStatus =
      requestStatusFilter === 'ALL' || request.status === requestStatusFilter;
    const matchesOrganisationStatus =
      organisationStatusFilter === 'ALL' || request.organisationStatus === organisationStatusFilter;
    return matchesSearch && matchesRequestStatus && matchesOrganisationStatus;
  });
  function closeReview() {
    setSelectedRequestId(null);
    setSelectedRequest(null);
    setReviewError(null);
  }
  async function handleReviewFailure(error: unknown, fallback: string) {
    const status = error instanceof ApiError ? error.status : null;
    const message = error instanceof ApiError ? error.message : fallback;
    if (status === 401) {
      clearAuth();
      navigate('/login?notice=session_expired', { replace: true });
      return;
    }
    if (status === 403) {
      closeReview();
      setLoadError('Access Denied. Active Platform Administrator Access Is Required');
      return;
    }
    if (status === 404 || status === 409) {
      closeReview();
      setNotification({
        variant: 'warning',
        message:
          status === 404
            ? 'This Request No Longer Exists. The List Has Been Refreshed'
            : `${message} The List Has Been Refreshed`,
      });
      await loadRequests();
      return;
    }
    if (status === 429) {
      setReviewError('Too Many Requests! Please Wait A Moment And Try Again');
      return;
    }
    setReviewError(message || fallback);
  }

  async function openReview(requestId: string) {
    if (!token) return;
    setSelectedRequestId(requestId);
    setSelectedRequest(null);
    setReviewError(null);
    setIsReviewLoading(true);
    try {
      const request = await getPlatformOrganisationRequest(requestId, token);
      setSelectedRequest(request);
    } catch (error: unknown) {
      await handleReviewFailure(error, 'Unable To Load This Registration Request');
    } finally {
      setIsReviewLoading(false);
    }
  }

  async function handleMarkContacted() {
    if (!token || !selectedRequestId) return;
    setIsContacting(true);
    setReviewError(null);
    try {
      const updatedRequest = await markPlatformOrganisationRequestContacted(
        selectedRequestId,
        token,
      );
      setSelectedRequest(updatedRequest);
      await loadRequests();
      setNotification({
        variant: 'success',
        message: 'Organisation Registration Request Marked As Contacted',
      });
    } catch (error: unknown) {
      await handleReviewFailure(error, 'Unable To Mark Request As Contacted');
    } finally {
      setIsContacting(false);
    }
  }

  return (
    <AppLayout
      contentStyle={{
        //backgroundColor: '#F3F4F6',
        backgroundColor: 'white',
      }}
    >
      {notification && (
        <BasicAlert variant={notification.variant} onClose={() => setNotification(null)}>
          {notification.message}
        </BasicAlert>
      )}
      <div>
        {/* HEADING  and SUB-HEADING */}
        <div
          style={{
            padding: '1.4rem',
            paddingBottom: '0.8rem',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          <h1
            style={{
              margin: 0,
              marginBottom: '0.8rem',
              fontSize: '3.8rem',
              fontWeight: 500,
              lineHeight: 1,
              // color: 'white',
              color: 'rgb(132, 25, 255)',
              fontFamily: 'Jost',
            }}
          >
            Organisation Management
          </h1>

          {/* SUB-HEADING */}
          <p className="font-regular tracking-wider text-[1.3rem] font-justify font-jost text-gray-500 mb-4">
            Review organisation registration requests and manage existing organisations.
          </p>
        </div>

        <div className="px-6 pb-6">
          {/* SEARCH AND FILTER BAR */}
          <div className="w-full mb-4">
            <div className="relative bg-white-purple border border-gray-200">
              <div className="flex flex-col items-center justify-between p-4 space-y-3 md:flex-row md:space-y-0 md:space-x-4">
                {/* ==== SEARCH BAR ==== */}
                <div className="w-full md:w-1/2">
                  <form className="flex items-center" onSubmit={(event) => event.preventDefault()}>
                    {/* Search Input Label */}
                    <label htmlFor="simple-search" className="sr-only">
                      Search Organisations
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
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="font-jost tracking-wide block w-full p-2 pl-10 text-[1.1rem] h-[2.55rem] text-black border border-gray-300 bg-white focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Search Organisations"
                      />
                    </div>
                  </form>
                </div>
                {/* ==== SEARCH BAR ==== */}

                {/* ==== FILTERS ==== */}
                <div className="flex flex-col items-stretch justify-end flex-shrink-0 w-full space-y-2 md:w-auto md:flex-row md:space-y-0 md:items-center md:space-x-3">
                  {/* Request Status Filter Dropdown */}
                  <div className="flex items-center w-full space-x-3 md:w-auto">
                    <div>
                      <Dropdown
                        label={
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-sharp text-gray-400">filter_alt</span>
                            {getFilterLabel(requestStatusFilter, 'Request Status')}
                          </span>
                        }
                        className="ml-2 font-jost tracking-wide text-[1.1rem] font-light text-gray-500 border border-gray-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white rounded-none"
                      >
                        {requestStatusFilterOptions.map((option) => (
                          <DropdownItem
                            key={option.value}
                            onClick={() => setRequestStatusFilter(option.value)}
                            className="font-jost text-gray-600 text-[1.1rem]"
                          >
                            {option.label}
                          </DropdownItem>
                        ))}
                      </Dropdown>
                    </div>
                  </div>

                  {/* Organisation Status Filter Dropdown */}
                  <div className="flex items-center w-full space-x-3 md:w-auto">
                    <div>
                      <Dropdown
                        label={
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-sharp text-gray-400">filter_alt</span>
                            <span>
                              {getFilterLabel(organisationStatusFilter, 'Organisation Status')}
                            </span>
                          </span>
                        }
                        className="font-jost tracking-wide text-[1.1rem] font-light text-gray-500 border border-gray-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white rounded-none"
                      >
                        {organisationStatusFilterOptions.map((option) => (
                          <DropdownItem
                            key={option.value}
                            onClick={() => setOrganisationStatusFilter(option.value)}
                            className="font-jost text-gray-600 text-[1.1rem]"
                          >
                            {option.label}
                          </DropdownItem>
                        ))}
                      </Dropdown>
                    </div>
                  </div>
                </div>
                {/* ==== FILTERS ==== */}
              </div>
            </div>
          </div>
          {loadError && (
            <div className="mb-4 border border-red-300 bg-red-50 p-4 font-overpass text-red-800">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => void loadRequests()}
                className="mt-2 font-medium text-purple hover:underline"
              >
                Try Again
              </button>
            </div>
          )}
          <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium mb-3">
            Organisations ({filteredRequests.length})
          </h3>

          {/* TABLE */}
          <div className="relative overflow-x-auto bg-neutral-primary-soft border border-default">
            <table className="w-full text-sm text-left rtl:text-right text-body">
              <thead className="bg-faint-purple border-b border-default">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Size
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Website
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Representative
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Request Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Organisation Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="font-overpass font-regular text-[1rem] tracking-wide">
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center">
                      <span className="inline-flex bg-purple p-2">
                        <LoadingSpinnerSVG />
                      </span>
                      <span>Loading Organisation Requests...</span>
                    </td>{' '}
                  </tr>
                )}
                {!isLoading &&
                  !loadError &&
                  filteredRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default"
                    >
                      {/* Organisation Name */}
                      <td className="px-6 py-4">{request.submittedOrganisationName}</td>

                      {/* Organisation Size (Approx. # of Employees) */}
                      <td className="px-6 py-4">{request.submittedOrganisationSize ?? '-'}</td>

                      {/* Website */}
                      <td className="px-6 py-4">
                        {request.submittedWebsite ? (
                          <a
                            href={request.submittedWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-fg-brand hover:underline font-google_sans_code"
                          >
                            {request.submittedWebsite}
                          </a>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>

                      {/* Representative */}
                      <td className="px-6 py-4">
                        <div>
                          {request.representativeFirstName} {request.representativeLastName}
                        </div>
                        <a
                          href={`mailto:${request.representativeEmail}`}
                          className="text-sm text-fg-brand hover:underline font-google_sans_code"
                        >
                          {request.representativeEmail}
                        </a>
                      </td>

                      {/* Request Status */}
                      <td className="px-6 py-4">{getStatusBadge(request.derivedStatus)}</td>

                      {/* Organisation Status */}
                      <td className="px-6 py-4">
                        {request.organisationStatus
                          ? getStatusBadge(request.organisationStatus)
                          : 'Not Created'}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        {/* PLEASE NOTE THAT THIS WILL CHANGE DEPENDING ON THE STATE */}
                        <div className="grid grid-cols-1 gap-1 justify-items-start">
                          {(request.status === 'PENDING_REVIEW' ||
                            request.status === 'CONTACTED') && (
                            <button
                              type="button"
                              onClick={() => void openReview(request.id)}
                              className="cursor-pointer font-medium text-purple hover:underline"
                            >
                              <strong>Review</strong> Request
                            </button>
                          )}

                          {request.status !== 'PENDING_REVIEW' &&
                            request.status !== 'CONTACTED' && (
                              <a
                                href={
                                  request.approvedOrganisationId
                                    ? `/platform/organisations/${request.approvedOrganisationId}`
                                    : `/platform/organisation-requests/${request.id}`
                                }
                                className="cursor-pointer font-medium text-purple hover:underline"
                              >
                                <strong>View</strong> Information
                              </a>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                {!isLoading && !loadError && filteredRequests.length === 0 && (
                  <tr>
                    {' '}
                    <td
                      colSpan={7}
                      className="py-8 text-center text-[1.2rem] tracking-wider text-gray-500 font-jost"
                    >
                      {requests.length === 0
                        ? 'No organisation registration requests are available.'
                        : 'No organisations match the current search and filters'}
                    </td>{' '}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {selectedRequestId && (
        <ReviewOrganisationRegistrationRequstModal
          isOpen
          request={selectedRequest}
          isLoading={isReviewLoading}
          isContacting={isContacting}
          errorMessage={reviewError}
          onClose={closeReview}
          onMarkContacted={() => void handleMarkContacted()}
        />
      )}
    </AppLayout>
  );
}

export default PlatformOrganisationManagementPage;
