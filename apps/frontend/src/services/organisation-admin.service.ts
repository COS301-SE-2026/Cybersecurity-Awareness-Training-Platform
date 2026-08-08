import { apiClient } from '../lib/apiClient';

export type OrganisationAdminPermissionKey =
  | 'VIEW_ORGANISATION_ADMINS'
  | 'INVITE_ORGANISATION_ADMINS'
  | 'REMOVE_ORGANISATION_ADMINS'
  | 'CHANGE_ORGANISATION_ADMIN_PERMISSIONS'
  | 'CHANGE_ORGANISATION_SECURITY_SETTINGS'
  | 'VIEW_ORGANISATION_TRAINEES'
  | 'INVITE_ORGANISATION_TRAINEES'
  | 'REMOVE_ORGANISATION_TRAINEES';

export interface OrganisationAdminPermissionSummary {
  key: OrganisationAdminPermissionKey;
  displayName: string;
}

export interface OrganisationAdminAvailablePermission {
  key: OrganisationAdminPermissionKey;
  displayName: string;
  description: string | null;
  isCritical: boolean;
}

export interface OrganisationAdminListItem {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  adminStatus: 'ACTIVE' | 'DISABLED';
  isInitialAdmin: boolean;
  joinedAt: string;
  disabledAt: string | null;
  permissions: OrganisationAdminPermissionSummary[];
}

export interface OrganisationAdminListResponse {
  admins: OrganisationAdminListItem[];
  availablePermissions: OrganisationAdminAvailablePermission[];
  actorPermissions: OrganisationAdminPermissionKey[];
}

export function getOrganisationAdmins(
  organisationId: string,
  token: string,
): Promise<OrganisationAdminListResponse> {
  return apiClient.get<OrganisationAdminListResponse>(
    `/organisations/${encodeURIComponent(organisationId)}/admins`,
    {
      authToken: token,
    },
  );
}

export interface OrganisationAdminPromotionRequest {
  traineeEmail: string;
  permissionKeys: OrganisationAdminPermissionKey[];
}

export interface OrganisationAdminPromotionResponse {
  invitationId: string;
  actionTokenId: string;
  status: 'PENDING' | 'SENT' | 'FAILED_TO_SEND';
  expiresAt: string;
  permissionKeys: OrganisationAdminPermissionKey[];
  emailQueued: boolean;
}

export interface OrganisationAdminPermissionUpdateRequest {
  permissionKeys: OrganisationAdminPermissionKey[];
}

export interface OrganisationAdminPermissionUpdateResponse {
  adminId: string;
  permissionKeys: OrganisationAdminPermissionKey[];
}

export interface OrganisationAdminRemovalRequest {
  password: string;
  confirmation: 'REMOVE';
}

export interface OrganisationAdminRemovalResponse {
  adminId: string;
  status: 'DISABLED';
}

export function promoteOrganisationAdmin(
  organisationId: string,
  input: OrganisationAdminPromotionRequest,
  token: string,
): Promise<OrganisationAdminPromotionResponse> {
  return apiClient.post<OrganisationAdminPromotionResponse, OrganisationAdminPromotionRequest>(
    `/organisations/${encodeURIComponent(organisationId)}/admin-promotions`,
    input,
    {
      authToken: token,
    },
  );
}

export function updateOrganisationAdminPermissions(
  organisationId: string,
  adminId: string,
  input: OrganisationAdminPermissionUpdateRequest,
  token: string,
): Promise<OrganisationAdminPermissionUpdateResponse> {
  return apiClient.patch<
    OrganisationAdminPermissionUpdateResponse,
    OrganisationAdminPermissionUpdateRequest
  >(
    `/organisations/${encodeURIComponent(organisationId)}/admins/${encodeURIComponent(adminId)}/permissions`,
    input,
    {
      authToken: token,
    },
  );
}

export function removeOrganisationAdmin(
  organisationId: string,
  adminId: string,
  input: OrganisationAdminRemovalRequest,
  token: string,
): Promise<OrganisationAdminRemovalResponse> {
  return apiClient.post<OrganisationAdminRemovalResponse, OrganisationAdminRemovalRequest>(
    `/organisations/${encodeURIComponent(organisationId)}/admins/${encodeURIComponent(adminId)}/remove`,
    input,
    {
      authToken: token,
    },
  );
}
