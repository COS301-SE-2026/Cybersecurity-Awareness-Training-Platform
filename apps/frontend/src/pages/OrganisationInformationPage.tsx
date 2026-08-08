import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import BasicOrganisationInformationPage from '../components/organisation-information/BasicOrganisationInformationPage';
import RepresentativeInformationPage from '../components/organisation-information/RepresentativeInformationPage';
import OrganisationAdminInformationPage from '../components/organisation-information/OrganisationAdminInformationPage';
import OrganisationTimelinePage from '../components/organisation-information/OrganisationTimelinePage';
import LoadingSpinnerSVG from '../components/LoadingSpinnerSVG';
import { useAuth } from '../context/useAuth';
import {
  getPlatformOrganisationDetail,
  getPlatformOrganisationRequestDetails,
  resendInitialAdminSetup,
} from '../services/organisation-details.service';
import type {
  OrganisationAdminSummaryDto,
  PlatformOrganisationDetailDto,
  PlatformOrganisationRequestDetailsResponseDto,
  ResendEligibilityDto,
  TimelineEventDto,
} from '@insightful-phish/shared';

// main compoent for organisation information page integrated with backend API endpoints
// handles loading, 404 not found, 403 access denied, 401 unauthorized, resend setup action, and lifecycle gating

export interface OrganisationDetailData {
  id: string;
  name: string;
  description: string;
  website: string;
  size: string;
  registeredTrainees: string;
  registrationDate: string;
  status: string;
  detailType: string;
  representative: {
    fullName: string;
    email: string;
    phone?: string | null;
  };
  setupStatus: string;
  resendEligibility: ResendEligibilityDto | null;
  admins: OrganisationAdminSummaryDto[];
  timeline: TimelineEventDto[];
  isRequestOnly: boolean;
  organisationIdForResend: string | null;
}

function mapRequestDetailsToState(
  reqData: PlatformOrganisationRequestDetailsResponseDto,
): OrganisationDetailData {
  return {
    id: reqData.id,
    name: reqData.submittedOrganisationName,
    description: reqData.submittedOrganisationDescription || 'N/A',
    website: reqData.submittedWebsite || 'N/A',
    size:
      reqData.submittedOrganisationSize !== null
        ? String(reqData.submittedOrganisationSize)
        : 'N/A',
    registeredTrainees: 'N/A (Pending Request)',
    registrationDate: reqData.createdAt,
    status: reqData.status || 'PENDING',
    detailType: reqData.detailType,
    representative: {
      fullName: `${reqData.representativeFirstName} ${reqData.representativeLastName}`,
      email: reqData.representativeEmail,
      phone: reqData.representativePhone,
    },
    setupStatus: reqData.setupStatus?.status || 'PENDING',
    resendEligibility: reqData.resendEligibility,
    admins: [],
    timeline: reqData.timeline || [],
    isRequestOnly: true,
    organisationIdForResend: reqData.approvedOrganisationId,
  };
}

function mapOrganisationDetailsToState(
  orgData: PlatformOrganisationDetailDto,
): OrganisationDetailData {
  const repName = orgData.registrationRequest
    ? `${orgData.registrationRequest.representativeFirstName} ${orgData.registrationRequest.representativeLastName}`
    : 'N/A';
  const repEmail = orgData.registrationRequest
    ? orgData.registrationRequest.representativeEmail
    : 'N/A';

  return {
    id: orgData.id,
    name: orgData.name,
    description: orgData.description || 'N/A',
    website: orgData.website || 'N/A',
    size: orgData.approximateSize !== null ? String(orgData.approximateSize) : 'N/A',
    registeredTrainees: String(orgData._count?.traineeProfiles ?? 0),
    registrationDate: orgData.createdAt,
    status: orgData.status,
    detailType: orgData.detailType,
    representative: {
      fullName: repName,
      email: repEmail,
    },
    setupStatus: orgData.setupStatus?.status || 'N/A',
    resendEligibility: orgData.resendEligibility,
    admins: orgData.admins || [],
    timeline: orgData.timeline || [],
    isRequestOnly: false,
    organisationIdForResend: orgData.id,
  };
}

function parseApiError(err: unknown, fallbackMessage: string): string {
  const status =
    err && typeof err === 'object' && 'status' in err ? (err as { status: number }).status : null;
  const message =
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
      ? (err as { message: string }).message
      : null;

  if (status === 401) {
    return 'Unauthorized. Session expired or invalid authentication credentials.';
  }
  if (status === 403) {
    return 'Access Denied. You do not have permission to view organisation details.';
  }
  if (status === 404) {
    return 'Organisation or registration request details not found.';
  }
  if (status === 409) {
    return message || 'Action cannot be completed due to a state conflict.';
  }
  if (status === 422) {
    return message || 'Invalid parameters provided for organisation detail request.';
  }
  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  return message || fallbackMessage;
}

function getErrorNoticeClass(errorStatus: number | null): string {
  if (errorStatus === 403 || errorStatus === 401) {
    return 'bg-amber-50 border-amber-300 text-amber-900';
  }
  if (errorStatus === 404) {
    return 'bg-blue-50 border-blue-300 text-blue-900';
  }
  return 'bg-red-50 border-red-300 text-red-900';
}

function getTabButtonClass(isActive: boolean): string {
  const baseClass =
    'font-jost inline-block w-full border border-default focus:ring-4 focus:ring-neutral-secondary-strong font-light text-[1.2rem] tracking-wide leading-5 px-5 py-3 focus:outline-none rounded-none';
  if (isActive) {
    return `${baseClass} bg-faint-purple text-[var(--ip-purple)] font-medium`;
  }
  return `${baseClass} bg-neutral-primary-soft text-body hover:bg-neutral-secondary-medium hover:text-[var(--ip-purple)]`;
}

async function fetchOrganisationOrRequestDetail(
  routeReqId: string | null,
  targetId: string,
  token: string,
): Promise<OrganisationDetailData> {
  if (routeReqId) {
    const reqData = await getPlatformOrganisationRequestDetails(routeReqId, token);
    return mapRequestDetailsToState(reqData);
  }

  try {
    const orgData = await getPlatformOrganisationDetail(targetId, token);
    return mapOrganisationDetailsToState(orgData);
  } catch (err: unknown) {
    const errStatus =
      err && typeof err === 'object' && 'status' in err ? (err as { status: number }).status : null;
    if (errStatus === 404) {
      const reqData = await getPlatformOrganisationRequestDetails(targetId, token);
      return mapRequestDetailsToState(reqData);
    }
    throw err;
  }
}

function OrganisationInformationPage() {
  const [currentTab, setCurrentTab] = useState<1 | 2 | 3 | 4>(1);
  const { token, authContext } = useAuth();
  const params = useParams<{ organisationId?: string; requestId?: string; id?: string }>();
  const [searchParams] = useSearchParams();

  const routeOrgId =
    params.organisationId ||
    params.id ||
    searchParams.get('organisationId') ||
    searchParams.get('id');
  const routeReqId = params.requestId || searchParams.get('requestId');
  const targetId = routeOrgId || routeReqId || authContext?.organisation?.id || null;

  const currentTargetIdRef = useRef<string | null>(targetId);

  const [isLoading, setIsLoading] = useState<boolean>(Boolean(targetId && token));
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [detailData, setDetailData] = useState<OrganisationDetailData | null>(null);

  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendSuccessMessage, setResendSuccessMessage] = useState<string | null>(null);
  const [resendErrorMessage, setResendErrorMessage] = useState<string | null>(null);

  // Derive effective active tab (if request-only record, tab 3 is disabled so fall back to 1)
  const activeTab = detailData?.isRequestOnly && currentTab === 3 ? 1 : currentTab;

  const reloadData = useCallback(async () => {
    if (!token || !targetId) return;

    try {
      const data = await fetchOrganisationOrRequestDetail(routeReqId, targetId, token);
      if (currentTargetIdRef.current === targetId) {
        setDetailData(data);
      }
    } catch {
      // ignore reload error
    }
  }, [token, targetId, routeReqId]);

  useEffect(() => {
    let isMounted = true;
    currentTargetIdRef.current = targetId;

    const loadAsync = async () => {
      setDetailData(null);
      setErrorMessage(null);
      setErrorStatus(null);
      setResendSuccessMessage(null);
      setResendErrorMessage(null);
      setIsLoading(Boolean(targetId && token));

      if (!token || !targetId) {
        if (isMounted && currentTargetIdRef.current === targetId) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const data = await fetchOrganisationOrRequestDetail(routeReqId, targetId, token);
        if (!isMounted || currentTargetIdRef.current !== targetId) return;
        setDetailData(data);
      } catch (err: unknown) {
        if (!isMounted || currentTargetIdRef.current !== targetId) return;
        const status =
          err && typeof err === 'object' && 'status' in err
            ? (err as { status: number }).status
            : 500;
        setErrorStatus(status);
        setErrorMessage(parseApiError(err, 'Failed to load organisation details.'));
      } finally {
        if (isMounted && currentTargetIdRef.current === targetId) {
          setIsLoading(false);
        }
      }
    };

    void loadAsync();

    return () => {
      isMounted = false;
    };
  }, [token, targetId, routeReqId]);

  // handle resend initial admin setup email action button
  const handleResendSetup = async () => {
    const orgIdForResend = detailData?.organisationIdForResend || targetId;
    const initiatingTargetId = targetId;
    if (!token || !orgIdForResend) return;

    setIsResending(true);
    setResendSuccessMessage(null);
    setResendErrorMessage(null);

    try {
      const response = await resendInitialAdminSetup(orgIdForResend, token);
      if (currentTargetIdRef.current !== initiatingTargetId) return;

      if (response.success && response.emailQueued) {
        setResendSuccessMessage('Initial administrator setup email successfully queued and sent.');
      } else if (response.success && !response.emailQueued) {
        setResendErrorMessage(
          'Setup token was created/updated, but setup email delivery could not be queued.',
        );
      } else {
        setResendErrorMessage('Failed to resend initial administrator setup email.');
      }

      try {
        await reloadData();
      } catch {
        if (currentTargetIdRef.current === initiatingTargetId) {
          setResendErrorMessage(
            'Resend action processed, but refreshing organisation details failed. Please reload.',
          );
        }
      }
    } catch (err: unknown) {
      if (currentTargetIdRef.current === initiatingTargetId) {
        setResendErrorMessage(parseApiError(err, 'Failed to resend initial admin setup email.'));
      }
    } finally {
      if (currentTargetIdRef.current === initiatingTargetId) {
        setIsResending(false);
      }
    }
  };

  return (
    <AppLayout
      contentStyle={{
        backgroundColor: '#F3F4F6',
      }}
    >
      {/* HEADING */}
      <div
        style={{
          padding: '1.4rem',
          paddingBottom: '0.8rem',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        <div className="flex items-center justify-between">
          <h1
            style={{
              margin: 0,
              marginBottom: '0.5rem',
              fontSize: '3.8rem',
              fontWeight: 500,
              lineHeight: 1,
              color: 'rgb(132, 25, 255)',
              fontFamily: 'Jost',
            }}
          >
            {detailData ? detailData.name : 'Organisation Information'}
          </h1>
          {detailData?.status && (
            <span className="inline-flex justify-center items-center px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-brand-subtle text-fg-brand-strong text-sm font-medium bg-brand-softer rounded-none font-overpass">
              Status: {detailData.status}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 p-5 -mt-5 w-full">
        {/* SUSPENDED WARNING STATE */}
        {detailData?.status === 'SUSPENDED' && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-none font-overpass">
            <span className="font-semibold">Warning:</span> This organisation is currently
            SUSPENDED. Lifecycle actions are restricted.
          </div>
        )}

        {/* DANGER AREA FOR SPRINT 4 DISABLED ACTIONS - GATED TO ACTIVE ORGANISATIONS ONLY */}
        {detailData && !detailData.isRequestOnly && (
          <div className="mb-6 p-4 bg-white border border-red-200 rounded-none shadow-xs font-overpass">
            <h4 className="text-lg font-medium text-red-600 font-jost mb-1">
              Danger Zone (Sprint 4)
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Organisation lifecycle actions. Note: Suspend and Delete actions are disabled for
              Sprint 4 release.
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                disabled
                className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 border border-gray-300 rounded-none cursor-not-allowed"
              >
                Suspend Organisation (Disabled for Sprint 4)
              </button>
              <button
                type="button"
                disabled
                className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 border border-gray-300 rounded-none cursor-not-allowed"
              >
                Delete Organisation (Disabled for Sprint 4)
              </button>
            </div>
          </div>
        )}

        {/* ERROR OR ACCESS DENIED MESSAGES */}
        {errorMessage && (
          <div
            className={`mb-6 p-4 border rounded-none font-overpass text-base ${getErrorNoticeClass(errorStatus)}`}
          >
            <span className="font-semibold">Notice:</span> {errorMessage}
          </div>
        )}

        {/* LOADING SPINNER */}
        {isLoading ? (
          <div className="flex justify-center items-center py-16 bg-white border border-default rounded-none">
            <LoadingSpinnerSVG />
            <span className="ml-3 font-jost text-xl text-gray-600">
              Loading organisation details...
            </span>
          </div>
        ) : errorMessage && !detailData ? null : (
          <>
            {/* TAB BUTTONS */}
            <ul className="hidden text-sm font-medium text-center text-body sm:flex -space-x-px">
              <li className="w-full focus-within:z-10">
                <button
                  onClick={() => setCurrentTab(1)}
                  className={getTabButtonClass(activeTab === 1)}
                >
                  Basic Information
                </button>
              </li>
              <li className="w-full focus-within:z-10">
                <button
                  onClick={() => setCurrentTab(2)}
                  className={getTabButtonClass(activeTab === 2)}
                >
                  Representative Information
                </button>
              </li>
              {!detailData?.isRequestOnly && (
                <li className="w-full focus-within:z-10">
                  <button
                    onClick={() => setCurrentTab(3)}
                    className={getTabButtonClass(activeTab === 3)}
                  >
                    Administrators
                  </button>
                </li>
              )}
              <li className="w-full focus-within:z-10">
                <button
                  onClick={() => setCurrentTab(4)}
                  className={getTabButtonClass(activeTab === 4)}
                >
                  Timeline
                </button>
              </li>
            </ul>

            {/* CONTENT BOX */}
            <div className="w-full p-6 bg-white md:mt-0 bg-neutral-primary-soft border-default border-x border-b rounded-none">
              {activeTab === 1 && (
                <BasicOrganisationInformationPage
                  name={detailData?.name}
                  description={detailData?.description}
                  website={detailData?.website}
                  size={detailData?.size}
                  registeredTrainees={detailData?.registeredTrainees}
                  registrationDate={detailData?.registrationDate}
                  status={detailData?.status}
                  isRequestOnly={detailData?.isRequestOnly}
                />
              )}

              {activeTab === 2 && (
                <RepresentativeInformationPage
                  fullName={detailData?.representative?.fullName}
                  email={detailData?.representative?.email}
                  setupStatus={detailData?.setupStatus}
                  resendEligibility={detailData?.resendEligibility}
                  onResendSetup={handleResendSetup}
                  isResending={isResending}
                  resendSuccessMessage={resendSuccessMessage}
                  resendErrorMessage={resendErrorMessage}
                  isRequestOnly={detailData?.isRequestOnly}
                />
              )}

              {activeTab === 3 && !detailData?.isRequestOnly && (
                <OrganisationAdminInformationPage
                  admins={detailData?.admins}
                  isRequestOnly={detailData?.isRequestOnly}
                />
              )}

              {activeTab === 4 && <OrganisationTimelinePage timeline={detailData?.timeline} />}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default OrganisationInformationPage;
