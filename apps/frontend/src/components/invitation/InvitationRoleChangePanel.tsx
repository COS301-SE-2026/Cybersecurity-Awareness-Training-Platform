type InvitationRoleChangePanelProps = Readonly<{
  organisationName?: string;
  grantedRole?: string;
  invitationType?: string;
  permissions?: string[];
  currentAccountEmail?: string;
  rejectAllowed?: boolean;
  isSubmitting?: boolean;
  onAccept: () => void;
  onReject: () => void;
}>;

function formatInvitationType(type?: string): string {
  if (!type) return 'Role Change Confirmation';
  switch (type) {
    case 'PLATFORM_ADMIN':
    case 'IP_ADMIN':
      return 'Platform Administrator Upgrade';
    case 'ORGANISATION_ADMIN_PROMOTION':
    case 'ORGANISATION_ADMIN':
      return 'Organisation Administrator Promotion';
    case 'ORGANISATION_TRAINEE':
      return 'Organisation Trainee Invitation';
    case 'INITIAL_ORGANISATION_ADMIN_SETUP':
      return 'Initial Organisation Admin Setup';
    default:
      return type;
  }
}

function formatGrantedRole(role?: string): string {
  if (!role) return 'Administrator';
  switch (role) {
    case 'ORGANISATION_ADMIN':
      return 'Organisation Administrator';
    case 'ORGANISATION_TRAINEE':
      return 'Organisation Trainee';
    case 'PLATFORM_ADMIN':
    case 'IP_ADMIN':
      return 'Platform Administrator';
    case 'GENERAL_TRAINEE':
      return 'General Trainee';
    default:
      return role;
  }
}

function InvitationRoleChangePanel({
  organisationName,
  grantedRole,
  invitationType,
  permissions,
  currentAccountEmail,
  rejectAllowed = true,
  isSubmitting = false,
  onAccept,
  onReject,
}: InvitationRoleChangePanelProps) {
  const displayInvitationType = formatInvitationType(invitationType);
  const displayGrantedRole = formatGrantedRole(grantedRole);

  return (
    <div className="w-full p-6 bg-white-purple shadow md:mt-0 sm:max-w-md sm:p-8">
      {/* HEADING */}
      <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading">
        Accept Invitation
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wide text-[1.1rem] font-justify font-jost mt-1 text-dark-pink mb-6">
        You have been selected for a role change. Please review the details below before accepting
        or declining this invitation.
      </p>

      {/* Invitation Type */}
      <p className="block font-jost tracking-wide text-xl font-medium text-pink">Invitation Type</p>
      <p className="font-google_sans_code text-left font-regular text-[1rem] tracking-wider text-gray-600 mb-4">
        {displayInvitationType}
      </p>

      {/* Current Signed In Account (if available) */}
      {currentAccountEmail && (
        <>
          <p className="block font-jost tracking-wide text-xl font-medium text-pink">
            Current Account
          </p>
          <p className="font-google_sans_code text-left font-semibold text-[1rem] tracking-wider text-dark-pink mb-4">
            {currentAccountEmail}
          </p>
        </>
      )}

      {/* Organisation (if organisation-scoped) */}
      {organisationName && (
        <>
          <p className="block font-jost tracking-wide text-xl font-medium text-pink">
            Organisation
          </p>
          <p className="font-google_sans_code text-left font-regular text-[1rem] tracking-wider text-gray-600 mb-4">
            {organisationName}
          </p>
        </>
      )}

      {/* Granted Role */}
      <p className="block font-jost tracking-wide text-xl font-medium text-pink">Granted Role</p>
      <p className="font-google_sans_code text-left font-regular text-[1rem] tracking-wider text-gray-600 mb-4">
        {displayGrantedRole}
      </p>

      {/* Granted Permissions (if provided) */}
      {permissions && permissions.length > 0 && (
        <>
          <p className="block font-jost tracking-wide text-xl font-medium text-pink">
            Permissions Granted
          </p>
          <ul className="list-disc list-inside font-google_sans_code text-left font-regular text-[0.95rem] tracking-wider text-gray-600 mb-4">
            {permissions.map((perm) => (
              <li key={perm}>{perm}</li>
            ))}
          </ul>
        </>
      )}

      {/* ACTION BUTTONS */}
      <div className={`grid ${rejectAllowed ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mt-8`}>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onAccept}
          className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Accepting...' : 'Accept Invite'}
        </button>

        {rejectAllowed && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onReject}
            className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-red-600 hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Declining...' : 'Decline Invite'}
          </button>
        )}
      </div>
    </div>
  );
}

export default InvitationRoleChangePanel;
