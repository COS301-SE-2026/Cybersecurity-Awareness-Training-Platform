import type {
  OrganisationAdminAvailablePermission,
  OrganisationAdminPermissionKey,
} from '../../services/organisation-admin.service';
import ViewportModalShell from '../layout/modals/ViewportModalShell';
import OrganisationAdministratorPermissionsDropdown from './OrganisationAdministratorPermissionsDropdown';

type EditOrganisationAdministratorPermissionsModalProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  administratorName: string;
  administratorEmail: string;
  availablePermissions: OrganisationAdminAvailablePermission[];
  selectedPermissionKeys: OrganisationAdminPermissionKey[];
  onPermissionKeysChange: (permissionKeys: OrganisationAdminPermissionKey[]) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}>;

function EditOrganisationAdministratorPermissionsModal({
  isOpen,
  onClose,
  availablePermissions,
  administratorName,
  administratorEmail,
  selectedPermissionKeys,
  onPermissionKeysChange,
  onSubmit,
  isSubmitting,
  errorMessage,
}: EditOrganisationAdministratorPermissionsModalProps) {
  const formId = 'edit-organisation-administrator-permissions-form';
  return (
    <ViewportModalShell
      id="edit-organisation-admin-permissions-modal"
      isOpen={isOpen}
      onClose={onClose}
      closeDisabled={isSubmitting}
      header={
        <div>
          <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading">
            Edit Permissions
          </h3>
          <p className="font-overpass text-sm text-gray-600">
            {administratorName} ({administratorEmail})
          </p>
        </div>
      }
      footer={
        <button
          type="submit"
          form={formId}
          disabled={isSubmitting}
          className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span>{isSubmitting ? 'Saving...' : 'Save Permissions'}</span>
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
        <div className="mb-8">
          <p className="block mb-2 font-jost tracking-wide text-xl font-medium text-pink">
            Permissions
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

export default EditOrganisationAdministratorPermissionsModal;
