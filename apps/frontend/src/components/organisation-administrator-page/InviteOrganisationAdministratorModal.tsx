import OrganisationAdministratorPermissionsDropdown from './OrganisationAdministratorPermissionsDropdown';

type InviteOrganisationAdministratorModalProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  // YOU WILL NEED TO ADD MORE PROPS SO THAT YOU CAN PASS IN THE ORGANISATION AND REPRESENTATIVE INFORMATION
}>;

function InviteOrganisationAdministratorModal({
  isOpen,
  onClose,
}: InviteOrganisationAdministratorModalProps) {
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
              Add New Administrator to Organisation
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
            {/* New Organisation Administrator First Name*/}
            <div className="mb-4">
              <label
                htmlFor="admin-first-name"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                First Name
              </label>
              <input
                required
                type="text"
                name="admin-first-name"
                id="admin-first-name"
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter the Administrator's First Name"
              />
            </div>

            {/* New Organisation Trainee Last Name*/}
            <div className="mb-4">
              <label
                htmlFor="admin-last-name"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                Last Name
              </label>
              <input
                required
                type="text"
                name="admin-last-name"
                id="admin-last-name"
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter the Administrator's Last Name"
              />
            </div>

            {/* New Organisation Trainee Email Address */}
            <div className="mb-4">
              <label
                htmlFor="admin-email-address"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                Email Address <span className="font-light text-red-500">(Required)</span>
              </label>
              <input
                required
                type="email"
                name="admin-email-address"
                id="admin-email-address"
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter the Administrator's Email Address"
              />
            </div>

            <div className="mb-8">
              <label
                htmlFor="admin-email-address"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                Permissions <span className="font-light text-red-500">(Required)</span>
              </label>
              {/* Permissions Dropdown Component */}
              <OrganisationAdministratorPermissionsDropdown />
            </div>

            <button
              type="button"
              className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>Invite</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InviteOrganisationAdministratorModal;
