import type {
  ApproveOrganisationRequestDto,
  InitialAdminSetupStatusDto,
  RejectOrganisationRequestDto,
  ResendEligibilityDto,
} from '@insightful-phish/shared';
import { apiClient } from '../lib/apiClient';

export type OrganisationRequestStatus =
  | 'PENDING_REVIEW'
  | 'CONTACTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';
export type PlatformOrganisationStatus =
  | 'PENDING_ONBOARDING'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'DISABLED'
  | 'ARCHIVED';
export type PlatformOrganisationDerivedStatus =
  | OrganisationRequestStatus
  | PlatformOrganisationStatus
  | 'APPROVED_PENDING_SETUP'
  | 'ONBOARDING'
  | 'SETUP_EMAIL_FAILED'
  | 'SETUP_TOKEN_EXPIRED';
export interface PlatformOrganisationRequestBaseDto {
  id: string;
  submittedOrganisationName: string;
  submittedWebsite: string | null;
  submittedOrganisationDescription: string | null;
  submittedOrganisationSize: number | null;
  submittedPrimaryDomain: string | null;
  representativeFirstName: string;
  representativeLastName: string;
  representativeEmail: string;
  representativePhone: string | null;
  status: OrganisationRequestStatus;
  contactedByIpAdminId: string | null;
  approvedByIpAdminId: string | null;
  rejectedByIpAdminId: string | null;
  approvedOrganisationId: string | null;
  contactedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PlatformOrganisationRequestListItemDto extends PlatformOrganisationRequestBaseDto {
  organisationStatus: PlatformOrganisationStatus | null;
  setupStatus: InitialAdminSetupStatusDto;
  resendEligibility: ResendEligibilityDto;
  derivedStatus: PlatformOrganisationDerivedStatus;
}
export interface PlatformOrganisationRequestListResponseDto {
  requests: PlatformOrganisationRequestListItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
export interface PlatformRequestReviewerDto {
  id: string;
  user: { firstName: string; lastName: string; email: string };
}
export interface PlatformOrganisationRequestReviewDto extends PlatformOrganisationRequestBaseDto {
  contactedBy: PlatformRequestReviewerDto | null;
  approvedBy: PlatformRequestReviewerDto | null;
  rejectedBy: PlatformRequestReviewerDto | null;
}
export interface ApproveOrganisationRequestResponseDto extends PlatformOrganisationRequestBaseDto {
  approvedOrganisation: { id: string; name: string };
  setupEmailQueued: boolean;
}
export interface RejectOrganisationRequestResponseDto extends PlatformOrganisationRequestBaseDto {
  rejectionEmailQueued: boolean;
}
export interface DeleteOrganisationRequestResponseDto {
  success: boolean;
}
export interface ListPlatformOrganisationRequestsQuery {
  status?: OrganisationRequestStatus;
  search?: string;
}

export function listPlatformOrganisationRequests(
  query: ListPlatformOrganisationRequestsQuery,
  token: string,
): Promise<PlatformOrganisationRequestListResponseDto> {
  const params = new URLSearchParams({ page: '1', limit: '100' });
  if (query.status) {
    params.set('status', query.status);
  }
  if (query.search?.trim()) {
    params.set('search', query.search.trim());
  }
  return apiClient.get<PlatformOrganisationRequestListResponseDto>(
    `platform/organisation-requests?${params.toString()}`,
    { authToken: token },
  );
}
export function getPlatformOrganisationRequest(
  requestId: string,
  token: string,
): Promise<PlatformOrganisationRequestReviewDto> {
  return apiClient.get<PlatformOrganisationRequestReviewDto>(
    `platform/organisation-requests/${encodeURIComponent(requestId)}`,
    { authToken: token },
  );
}
export function markPlatformOrganisationRequestContacted(
  requestId: string,
  token: string,
): Promise<PlatformOrganisationRequestReviewDto> {
  return apiClient.patch<PlatformOrganisationRequestReviewDto>(
    `/platform/organisation-requests/${encodeURIComponent(requestId)}/contacted`,
    undefined,
    { authToken: token },
  );
}
export function approvePlatformOrganisationRequest(
  requestId: string,
  payload: ApproveOrganisationRequestDto,
  token: string,
): Promise<ApproveOrganisationRequestDto> {
  return apiClient.post<ApproveOrganisationRequestDto>(
    `/platform/organisation-requests/${encodeURIComponent(requestId)}/approve`,
    payload,
    { authToken: token },
  );
}
export function rejectPlatformOrganisationRequest(
  requestId: string,
  payload: RejectOrganisationRequestDto,
  token: string,
): Promise<RejectOrganisationRequestResponseDto> {
  return apiClient.post<RejectOrganisationRequestResponseDto, RejectOrganisationRequestDto>(
    `/platform/organisation-requests/${encodeURIComponent(requestId)}/reject`,
    payload,
    { authToken: token },
  );
}
export function deletePlatformOrganisationRequest(
  requestId: string,
  token: string,
): Promise<DeleteOrganisationRequestResponseDto> {
  return apiClient.delete<DeleteOrganisationRequestResponseDto>(
    `/platform/organisation-requests/${encodeURIComponent(requestId)}`,
    { authToken: token },
  );
}
