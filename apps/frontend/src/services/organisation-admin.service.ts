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
