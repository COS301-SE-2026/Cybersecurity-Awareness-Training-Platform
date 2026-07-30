import type {
  OrganisationAdminAvailablePermission,
  OrganisationAdminPermissionKey,
} from '../../services/organisation-admin.service';
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
  return (
    <div
      id="edit-organisation-admin-permissions-modal"
      tabIndex={-1}
      aria-hidden={!isOpen}
      className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 backdrop-blur-xl"
    >
      <div className="relative p-4 w-full max-w-md">
        <div className="relative bg-white-purple border border-default shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between border-b border-default pb-4 md:pb-5">
            <div>
              <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading">
                Edit Permissions
              </h3>
              <p className="font-overpass text-sm text-gray-600">
                {administratorName} ({administratorEmail})
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading text-sm w-9 h-9 ms-auto inline-flex justify-center items-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-icons-sharp">close</span>
              <span className="sr-only">Close modal</span>
            </button>
          </div>

          <form
            className="pt-2"
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>{isSubmitting ? 'Saving...' : 'Save Permissions'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditOrganisationAdministratorPermissionsModal;
