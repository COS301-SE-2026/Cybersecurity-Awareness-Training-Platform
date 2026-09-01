import { useCallback, useEffect, useState, useRef } from 'react';
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
  rejectPlatformOrganisationRequest,
  deletePlatformOrganisationRequest,
  approvePlatformOrganisationRequest,
} from '../services/platform-organisation-management.service';
import { Dropdown, DropdownItem } from 'flowbite-react';
import AppLayout from '../components/layout/AppLayout';
import ReviewOrganisationRegistrationRequstModal from '../components/layout/modals/ReviewOrganisationRegistrationRequestModal';
import RejectOrganisationRegistrationRequestModal from '../components/layout/modals/RejectOrganisationRegistrationRequestModal';
import BasicConfirmationModal from '../components/layout/modals/BasicConfirmationModal';
import {
  AdminTable,
  AdminTableActions,
  AdminTableCell,
  AdminTableContainer,
  AdminTableEmptyRow,
  AdminTableHeader,
  AdminTableHeaderCell,
  AdminTableLoadingRow,
  TruncatedValue,
} from '../components/ui/AdminTable';

type RequestStatusFilter = 'ALL' | OrganisationRequestStatus;
type OrganisationStatusFilter = 'ALL' | PlatformOrganisationStatus;
type ConfirmationAction =
  | { type: 'APPROVE'; request: PlatformOrganisationRequestReviewDto }
  | { type: 'DELETE'; request: PlatformOrganisationRequestListItemDto };

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
  const activeReviewRequestIdRef = useRef<string | null>(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isContacting, setIsContacting] = useState(false);
  const [notification, setNotification] = useState<{
    variant: 'success' | 'warning' | 'danger';
    message: string;
  } | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

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
    setIsRejectModalOpen(false);
    setRejectError(null);
    setConfirmationAction(null);
    activeReviewRequestIdRef.current = null;
    setIsReviewLoading(false);
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
    activeReviewRequestIdRef.current = requestId;
    setSelectedRequestId(requestId);
    setSelectedRequest(null);
    setReviewError(null);
    setIsReviewLoading(true);
    try {
      const request = await getPlatformOrganisationRequest(requestId, token);
      if (activeReviewRequestIdRef.current === requestId) {
        setSelectedRequest(request);
      }
    } catch (error: unknown) {
      if (activeReviewRequestIdRef.current === requestId) {
        await handleReviewFailure(error, 'Unable To Load This Registration Request');
      }
    } finally {
      if (activeReviewRequestIdRef.current === requestId) {
        setIsReviewLoading(false);
      }
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
  async function handleReject(rejectionReason: string) {
    if (!token || !selectedRequestId) return;
    setIsRejecting(true);
    setRejectError(null);
    try {
      const response = await rejectPlatformOrganisationRequest(
        selectedRequestId,
        { rejectionReason },
        token,
      );

      closeReview();
      await loadRequests();

      setNotification(
        response.rejectionEmailQueued
          ? {
              variant: 'success',
              message:
                'The request was rejected. The representative notification was queued for delivery.',
            }
          : {
              variant: 'warning',
              message:
                'The request was rejected. The representative notification could not be queued.',
            },
      );
    } catch (error: unknown) {
      const status = error instanceof ApiError ? error.status : null;
      if (status === 401 || status === 403 || status === 404 || status === 409) {
        setIsRejectModalOpen(false);
        await handleReviewFailure(error, 'Unable to reject this request.');
        return;
      }
      if (status === 422) {
        const body =
          error instanceof ApiError && error.body && typeof error.body === 'object'
            ? (error.body as { details?: Array<{ message?: unknown }> })
            : null;
        const detailMessage = body?.details?.[0]?.message;
        setRejectError(
          typeof detailMessage === 'string'
            ? detailMessage
            : 'Please enter a valid rejection reason.',
        );
        return;
      }
      if (status === 429) {
        setRejectError('Too Many Requests! Please Wait A Moment And Try Again.');
        return;
      }
      setRejectError(error instanceof ApiError ? error.message : 'Unable to reject this request.');
    } finally {
      setIsRejecting(false);
    }
  }
  async function handleApprove() {
    if (!token || confirmationAction?.type !== 'APPROVE') return;
    const request = confirmationAction.request;
    setIsConfirming(true);
    setReviewError(null);
    try {
      const response = await approvePlatformOrganisationRequest(
        request.id,
        { initialAdminEmail: request.representativeEmail },
        token,
      );
      setConfirmationAction(null);
      closeReview();
      await loadRequests();
      setNotification(
        response.setupEmailQueued
          ? {
              variant: 'success',
              message: `${response.approvedOrganisation.name} was approved and the initial administrator setup email was queued for delivery.`,
            }
          : {
              variant: 'warning',
              message: `${response.approvedOrganisation.name} was approved, but the initial administrator setup email could not be queued. Open the organisation details to resend it.`,
            },
      );
      // if(!response.setupEmailQueued){
      //   navigate(`/platform/organisations/${response.approvedOrganisation.id}`);
      // }
    } catch (error: unknown) {
      setConfirmationAction(null);
      await handleReviewFailure(error, 'Unable To Approve This Request');
    } finally {
      setIsConfirming(false);
    }
  }
  async function handleDelete() {
    if (!token || confirmationAction?.type !== 'DELETE') return;
    setIsConfirming(true);
    try {
      await deletePlatformOrganisationRequest(confirmationAction.request.id, token);
      setConfirmationAction(null);
      await loadRequests();
      setNotification({ variant: 'success', message: 'The registration request was deleted' });
    } catch (error: unknown) {
      setConfirmationAction(null);
      const status = error instanceof ApiError ? error.status : null;
      if (status === 401 || status === 403 || status === 404 || status === 409) {
        await handleReviewFailure(error, 'Unable To Delete This Request');
        return;
      }
      setNotification({
        variant: 'warning',
        message:
          status === 429
            ? 'Too Many Requests! Please Wait A Moment And Try Again'
            : error instanceof ApiError
              ? error.message
              : 'Unable To Delete This Request',
      });
    } finally {
      setIsConfirming(false);
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
          <AdminTableContainer>
            <AdminTable>
              <AdminTableHeader>
                <tr>
                  <AdminTableHeaderCell>Name</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Size</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Website</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Representative</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Request Status</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Organisation Status</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
                </tr>
              </AdminTableHeader>
              <tbody className="font-overpass font-regular text-[1rem] tracking-wide">
                {isLoading && (
                  <AdminTableLoadingRow colSpan={7}>
                    <span className="inline-flex items-center gap-3">
                      <span className="inline-flex bg-purple p-2">
                        <LoadingSpinnerSVG />
                      </span>
                      <span>Loading Organisation Requests...</span>
                    </span>
                  </AdminTableLoadingRow>
                )}
                {!isLoading &&
                  !loadError &&
                  filteredRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default"
                    >
                      {/* Organisation Name */}
                      <AdminTableCell>
                        <TruncatedValue
                          value={request.submittedOrganisationName}
                          className="max-w-64"
                        />
                      </AdminTableCell>

                      {/* Organisation Size (Approx. # of Employees) */}
                      <AdminTableCell>{request.submittedOrganisationSize ?? '-'}</AdminTableCell>

                      {/* Website */}
                      <AdminTableCell>
                        {request.submittedWebsite ? (
                          <a
                            href={request.submittedWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block max-w-56 text-fg-brand hover:underline font-google_sans_code"
                          >
                            <TruncatedValue value={request.submittedWebsite} focusable={false} />
                          </a>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </AdminTableCell>

                      {/* Representative */}
                      <AdminTableCell>
                        <div>
                          <TruncatedValue
                            value={`${request.representativeFirstName} ${request.representativeLastName}`}
                          />
                        </div>
                        <a
                          href={`mailto:${request.representativeEmail}`}
                          className="block max-w-56 text-sm text-fg-brand hover:underline font-google_sans_code"
                        >
                          <TruncatedValue value={request.representativeEmail} focusable={false} />
                        </a>
                      </AdminTableCell>

                      {/* Request Status */}
                      <AdminTableCell>{getStatusBadge(request.derivedStatus)}</AdminTableCell>

                      {/* Organisation Status */}
                      <AdminTableCell>
                        {request.organisationStatus
                          ? getStatusBadge(request.organisationStatus)
                          : 'Not Created'}
                      </AdminTableCell>

                      {/* Actions */}
                      <AdminTableCell>
                        {/* PLEASE NOTE THAT THIS WILL CHANGE DEPENDING ON THE STATE */}
                        <AdminTableActions className="flex-col items-start gap-1">
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

                          {(request.status === 'REJECTED' || request.status === 'CANCELLED') && (
                            <button
                              type="button"
                              onClick={() =>
                                void setConfirmationAction({ type: 'DELETE', request })
                              }
                              className="cursor-pointer font-medium text-red-600 hover:underline"
                            >
                              <strong>Delete</strong> Request
                            </button>
                          )}
                        </AdminTableActions>
                      </AdminTableCell>
                    </tr>
                  ))}
                {!isLoading && !loadError && filteredRequests.length === 0 && (
                  <AdminTableEmptyRow colSpan={7}>
                    {requests.length === 0
                      ? 'No organisation registration requests are available.'
                      : 'No organisations match the current search and filters'}
                  </AdminTableEmptyRow>
                )}
              </tbody>
            </AdminTable>
          </AdminTableContainer>
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
          onApprove={() => {
            if (selectedRequest) {
              setConfirmationAction({ type: 'APPROVE', request: selectedRequest });
            }
          }}
          onReject={() => {
            setRejectError(null);
            setIsRejectModalOpen(true);
          }}
        />
      )}
      {isRejectModalOpen && selectedRequest && (
        <RejectOrganisationRegistrationRequestModal
          organisationName={selectedRequest.submittedOrganisationName}
          isSubmitting={isRejecting}
          serverError={rejectError}
          onConfirm={(reason) => void handleReject(reason)}
          onCancel={() => {
            setIsRejectModalOpen(false);
            setRejectError(null);
          }}
        />
      )}
      {confirmationAction?.type === 'APPROVE' && (
        <BasicConfirmationModal
          title="Approve Organisation"
          message={`Approve ${confirmationAction.request.submittedOrganisationName}. ${confirmationAction.request.representativeFirstName} ${confirmationAction.request.representativeLastName} (${confirmationAction.request.representativeEmail}) will receive the initial administrator setup email for this organisation.`}
          confirmButtonText="Approve Organisation"
          confirmButtonVariant="success"
          isConfirming={isConfirming}
          onConfirm={() => void handleApprove()}
          onCancel={() => setConfirmationAction(null)}
        />
      )}
      {confirmationAction?.type === 'DELETE' && (
        <BasicConfirmationModal
          title="Delete Registration Request"
          message={`Delete the registration request for ${confirmationAction.request.submittedOrganisationName}. This cannot be undone. This will allow the representative associated with this request to create an Individual Trainee account or to submit a new Organisation Registration Request`}
          confirmButtonText="Delete Request"
          confirmButtonVariant="danger"
          isConfirming={isConfirming}
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirmationAction(null)}
        />
      )}
    </AppLayout>
  );
}

export default PlatformOrganisationManagementPage;
