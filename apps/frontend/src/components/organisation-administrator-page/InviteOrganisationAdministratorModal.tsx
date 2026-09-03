import type {
  OrganisationAdminAvailablePermission,
  OrganisationAdminPermissionKey,
} from '../../services/organisation-admin.service';
import ViewportModalShell from '../layout/modals/ViewportModalShell';
import OrganisationAdministratorPermissionsDropdown from './OrganisationAdministratorPermissionsDropdown';

type InviteOrganisationAdministratorModalProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  availablePermissions: OrganisationAdminAvailablePermission[];
  traineeEmail: string;
  selectedPermissionKeys: OrganisationAdminPermissionKey[];
  onEmailChange: (email: string) => void;
  onPermissionKeysChange: (permissionKeys: OrganisationAdminPermissionKey[]) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
  emailError: string | null;
}>;

function InviteOrganisationAdministratorModal({
  isOpen,
  onClose,
  availablePermissions,
  traineeEmail,
  selectedPermissionKeys,
  onEmailChange,
  onPermissionKeysChange,
  onSubmit,
  isSubmitting,
  errorMessage,
  emailError,
}: InviteOrganisationAdministratorModalProps) {
  const formId = 'invite-organisation-administrator-form';
  return (
    <ViewportModalShell
      id="select-modal"
      isOpen={isOpen}
      onClose={onClose}
      closeDisabled={isSubmitting}
      header={
        <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading">
          Add New Administrator to Organisation
        </h3>
      }
      footer={
        <button
          type="submit"
          form={formId}
          disabled={isSubmitting}
          className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span>{isSubmitting ? 'Sending...' : 'Invite'}</span>
        </button>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="mb-4">
          <label
            htmlFor="admin-email-address"
            className="block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Trainee Email Address <span className="font-light text-red-500">(Required)</span>
          </label>
          <input
            required
            type="email"
            id="admin-email-address"
            value={traineeEmail}
            onChange={(event) => onEmailChange(event.target.value)}
            disabled={isSubmitting}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? 'admin-email-address-error' : undefined}
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 disabled:opacity-60"
            placeholder="Enter the trainee's email address"
          />
          {emailError && (
            <p id="admin-email-address-error" className="mt-2 text-sm text-red-600" role="alert">
              {emailError}
            </p>
          )}
        </div>

        <div className="mb-8">
          <p className="block mb-2 font-jost tracking-wide text-xl font-medium text-pink">
            Permissions <span className="font-light text-red-500">(Required)</span>
          </p>
          <OrganisationAdministratorPermissionsDropdown
            availablePermissions={availablePermissions}
            selectedPermissionKeys={selectedPermissionKeys}
            onChange={onPermissionKeysChange}
            disabled={isSubmitting}
          />
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="p-3 mb-4 text-red-800 bg-red-50 border border-red-200 font-overpass text-[1rem]"
          >
            {errorMessage}
          </div>
        )}
      </form>
    </ViewportModalShell>
  );
}

export default InviteOrganisationAdministratorModal;
