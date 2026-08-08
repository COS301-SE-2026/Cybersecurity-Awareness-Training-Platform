export const ORGANISATION_PERMISSION_SEEDS = [
  {
    key: 'VIEW_ORGANISATION_ADMINS',
    displayName: 'View organisation admins',
    description: 'View organisation admin users and their permission grants.',
    isCritical: false,
  },
  {
    key: 'INVITE_ORGANISATION_ADMINS',
    displayName: 'Invite organisation admins',
    description: 'Invite or promote users to organisation admin access.',
    isCritical: true,
  },
  {
    key: 'REMOVE_ORGANISATION_ADMINS',
    displayName: 'Remove organisation admins',
    description: 'Disable or remove organisation admin access.',
    isCritical: false,
  },
  {
    key: 'CHANGE_ORGANISATION_ADMIN_PERMISSIONS',
    displayName: 'Change organisation admin permissions',
    description: 'Grant or revoke organisation admin permissions.',
    isCritical: true,
  },
  {
    key: 'CHANGE_ORGANISATION_SECURITY_SETTINGS',
    displayName: 'Change organisation security settings',
    description: 'Change organisation security policy and related settings.',
    isCritical: true,
  },
  {
    key: 'VIEW_ORGANISATION_TRAINEES',
    displayName: 'View organisation trainees',
    description: 'View organisation trainees and pending invitations.',
    isCritical: false,
  },
  {
    key: 'INVITE_ORGANISATION_TRAINEES',
    displayName: 'Invite organisation trainees',
    description: 'Invite new trainees or manage pending trainee invitations.',
    isCritical: false,
  },
  {
    key: 'REMOVE_ORGANISATION_TRAINEES',
    displayName: 'Remove organisation trainees',
    description: 'Disable or remove organisation trainee access.',
    isCritical: false,
  },
  {
    key: 'ASSIGN_CAMPAIGNS',
    displayName: 'Assign campaigns',
    description: 'Assign campaigns to eligible organisation trainees.',
    isCritical: false,
  },
] as const;

export type OrganisationPermissionSeed = (typeof ORGANISATION_PERMISSION_SEEDS)[number];
