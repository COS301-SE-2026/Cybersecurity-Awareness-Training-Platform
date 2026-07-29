import OrganisationAdministratorPermissionsDropdown from './OrganisationAdministratorPermissionsDropdown';

type EditOrganisationAdministratorPermissionsModalProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
}>;

function EditOrganisationAdministratorPermissionsModal({
  isOpen,
  onClose,
}: EditOrganisationAdministratorPermissionsModalProps) {
  return (
    <div
      id="select-modal"
      tabIndex={-1}
      aria-hidden={!isOpen}
      className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 backdrop-blur-xl"
    >
      <div className="relative p-4 w-full max-w-md">
        <div className="relative bg-white-purple border border-default shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between border-b border-default pb-4 md:pb-5">
            {/* HEADING */}
            <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading">
              Edit Permissions
            </h3>

            {/* CLOSE MODAL BUTTON */}
            <button
              type="button"
              className="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading text-sm w-9 h-9 ms-auto inline-flex justify-center items-center"
              onClick={onClose}
            >
              <span className="material-icons-sharp">close</span>
              <span className="sr-only">Close modal</span>
            </button>
          </div>

          <div className="pt-2">
            <div className="mb-8">
              <label
                htmlFor="admin-email-address"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                Edit Permissions
              </label>
              {/* Permissions Dropdown Component */}
              <OrganisationAdministratorPermissionsDropdown />
            </div>

            <button
              type="button"
              className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>Save Permissions</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditOrganisationAdministratorPermissionsModal;
