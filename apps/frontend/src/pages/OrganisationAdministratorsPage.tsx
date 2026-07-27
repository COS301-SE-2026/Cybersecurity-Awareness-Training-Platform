import AppLayout from '../components/layout/AppLayout';
import { Dropdown, DropdownItem, Popover } from 'flowbite-react';
import { useState } from 'react';
import BasicConfirmationModal from '../components/layout/modals/BasicConfirmationModal';
import InviteTraineeModal from '../components/layout/modals/InviteTraineeModal';

interface OrganisationAdministrator {
  id: number;
  fullName: string;
  emailAddress: string;
  status: 'Active' | 'Invited' | 'Disabled';
  permissions: string[];
}

// MOCK DATA
// REPLACE WITH THE REAL DEAL
const mockOrganisationAdministrators: OrganisationAdministrator[] = [
  {
    id: 1,
    fullName: 'Adriano Jorge',
    emailAddress: 'adriano.jorge@tuks.co.za',
    status: 'Active',
    permissions: ['View Organisation Trainees'],
  },
  {
    id: 2,
    fullName: 'Connor Bell',
    emailAddress: 'connor.bell@tuks.co.za',
    status: 'Active',
    permissions: [
      'View Organisation Trainees',
      'Invite Organisation Trainees',
      'Manage Organisation Campaigns',
    ],
  },
  {
    id: 3,
    fullName: 'Johan Nel',
    emailAddress: 'johan.nel@tuks.co.za',
    status: 'Disabled',
    permissions: [
      'View Organisation Trainees',
      'Invite Organisation Trainees',
      'Manage Organisation Campaigns',
      'Manage Security Settings',
    ],
  },
  {
    id: 4,
    fullName: 'Zoë Joubert',
    emailAddress: 'zoë.joubert@tuks.co.za',
    status: 'Invited',
    permissions: ['View Organisation Trainees', 'Invite Organisation Trainees'],
  },
];

const getStatusBadge = (status: OrganisationAdministrator['status']) => {
  // status: 'Invited' | 'Active' | 'Disabled'
  switch (status) {
    case 'Disabled':
      // GREY
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-default-medium text-heading text-sm font-medium bg-neutral-secondary-medium">
          Disabled
        </span>
      );

    case 'Invited':
      // BLUE
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-brand-subtle text-fg-brand-strong text-sm font-medium bg-brand-softer">
          Invited
        </span>
      );

    case 'Active':
      // GREEN
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-success-subtle text-fg-success-strong text-sm font-medium bg-success-soft">
          Active
        </span>
      );
  }
};

function PermissionsPopover({
  permissions,
  fullName,
}: Readonly<{
  permissions: string[];
  fullName: string;
}>) {
  return (
    <div className="w-100 bg-faint-purple shadow-lg">
      <div className="bg-gray-100 bg-light-purple px-3 py-2">
        <h3 className="font-semibold font-jost text-[1.4rem] text-purple tracking-wider">
          Permissions <span className="font-light text-[1.1rem]">({fullName})</span>
        </h3>
      </div>

      <div className="px-3 py-2">
        {permissions.map((permission) => (
          <p
            key={permission}
            className="text-sm font-overpass tracking-wider font-medium text-[1.05rem] text-dark-pink"
          >
            ● {permission}
          </p>
        ))}
      </div>
    </div>
  );
}

function OrganisationAdministratorsPage() {
  const [showBasicConfirmationModal, setShowBasicConfirmationModal] = useState(false);
  const [confirmationTitle, setConfirmationTitle] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [confirmationButtonText, setConfirmationButtonText] = useState('');
  const [confirmationVariant, setConfirmationVariant] = useState<'danger' | 'success' | 'default'>(
    'default',
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Invited' | 'Active' | 'Disabled'>(
    'All',
  );
  const [openPermissionPopover, setOpenPermissionPopover] = useState<number | null>(null);

  const filteredOrganisationAdministrators = mockOrganisationAdministrators.filter(
    (organisationAdministrator) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch = [
        organisationAdministrator.fullName,
        organisationAdministrator.emailAddress,
        organisationAdministrator.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);

      const matchesStatus =
        statusFilter === 'All' || organisationAdministrator.status === statusFilter;

      return matchesSearch && matchesStatus;
    },
  );

  const [showInviteTraineeModal, setShowInviteTraineeModal] = useState(false);

  const openInviteTraineeModal = () => {
    setShowInviteTraineeModal(true);
  };

  const closeInviteTraineeModal = () => {
    setShowInviteTraineeModal(false);
  };

  const openConfirmationModal = () => {
    setShowBasicConfirmationModal(true);
  };

  // DIFFERENT KINDS OF BASIC CONFIRMATION MODALS
  const showResendInviteModal = () => {
    setConfirmationButtonText('Re–Send');
    setConfirmationTitle('Re–Send Invitation');
    setConfirmationMessage('Are you sure you want to re–send the invitation?');
    setConfirmationVariant('default');
    openConfirmationModal();
  };

  const showDisableTraineeModal = () => {
    setConfirmationButtonText('Disable');
    setConfirmationTitle('Disable Organisation Trainee');
    setConfirmationMessage('Are you sure you want to disable this organisation trainee?');
    setConfirmationVariant('danger');
    openConfirmationModal();
  };

  const showRevokeInviteModal = () => {
    setConfirmationButtonText('Revoke');
    setConfirmationTitle('Revoke Invitation');
    setConfirmationMessage('Are you sure you want to revoke the invitation?');
    setConfirmationVariant('danger');
    openConfirmationModal();
  };

  const showPromoteToOrgAdmin = () => {
    setConfirmationButtonText('Promote');
    setConfirmationTitle('Promote Trainee to Organisation Administrator');
    setConfirmationMessage(
      'Are you sure you want to promote this trainee to organisation administrator?',
    );
    setConfirmationVariant('default');
    openConfirmationModal();
  };

  const confirmBasicConfirmation = () => {
    closeOrganisationTraineePageConfirmationModal();
  };

  const showEnableTraineeModal = () => {
    setConfirmationButtonText('Enable');
    setConfirmationTitle('Enable Organisation Trainee');
    setConfirmationMessage('Are you sure you want to enable this organisation trainee?');
    setConfirmationVariant('success');
    openConfirmationModal();
  };

  const closeOrganisationTraineePageConfirmationModal = () => {
    setShowBasicConfirmationModal(false);
  };

  return (
    <AppLayout
      contentStyle={{
        //backgroundColor: '#F3F4F6',
        backgroundColor: 'white',
      }}
    >
      <div>
        {/* HEADING  and SUB-HEADING */}
        <div
          style={{
            padding: '1.4rem',
            boxSizing: 'border-box',
            flexShrink: 0,
            paddingBottom: '0.8rem',
          }}
        >
          <h1
            style={{
              margin: 0,
              marginBottom: '0.8rem',
              fontWeight: 500,
              fontSize: '3.8rem',
              lineHeight: 1,
              fontFamily: 'Jost',
              color: 'rgb(132, 25, 255)',
            }}
          >
            Organisation Administrators
          </h1>

          {/* SUB-HEADING */}
          <p className="font-regular tracking-wider text-[1.3rem] font-justify font-jost text-gray-500 mb-4">
            Manage organisation administrators and their permissions.
          </p>
        </div>

        <div className="px-6 pb-6">
          {/* SEARCH AND FILTER BAR */}
          <div className="w-full mb-4">
            <div className="relative bg-white-purple border border-gray-200">
              <div className="flex flex-col items-center justify-between p-4 space-y-3 md:flex-row md:space-y-0 md:space-x-4">
                {/* ==== SEARCH BAR ==== */}
                <div className="w-full md:w-1/2">
                  <div className="flex items-center">
                    {/* Search Input Label */}
                    <label htmlFor="simple-search" className="sr-only">
                      Search Administrators
                    </label>
                    <div className="relative w-full">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        {/* SVG (Search Icon) */}
                        <svg
                          aria-hidden="true"
                          className="w-5 h-5 text-gray-400 dark:text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      {/* Search Input */}
                      <input
                        type="text"
                        id="simple-search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="font-jost tracking-wide block w-full p-2 pl-10 text-[1.1rem] h-[2.55rem] text-black border border-gray-300 bg-white focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Search Administrators"
                      />
                    </div>
                  </div>
                </div>
                {/* ==== SEARCH BAR ==== */}

                {/* ==== FILTERS ==== */}
                <div className="flex flex-col items-stretch justify-end flex-shrink-0 w-full space-y-2 md:w-auto md:flex-row md:space-y-0 md:items-center md:space-x-3">
                  {/* Status Filter Dropdown */}
                  <div className="flex items-center w-full space-x-3 md:w-auto">
                    <div>
                      <Dropdown
                        label={
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-sharp text-gray-400">filter_alt</span>
                            {statusFilter === 'All' ? 'Status' : statusFilter}
                          </span>
                        }
                        className="ml-2 font-jost tracking-wide text-[1.1rem] font-light text-gray-500 border border-gray-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white rounded-none"
                      >
                        <DropdownItem
                          onClick={() => setStatusFilter('All')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          All
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setStatusFilter('Invited')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Invited
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setStatusFilter('Active')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Active
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setStatusFilter('Disabled')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Disabled
                        </DropdownItem>
                      </Dropdown>
                    </div>
                  </div>
                </div>
                {/* ==== FILTERS ==== */}

                {/* Add (Invite) Organisation Administrator Button */}
                <button
                  type="button"
                  onClick={openInviteTraineeModal}
                  className="cursor-pointer px-4 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-[0.425rem] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-sharp">add_2</span>
                  <span className="whitespace-nowrap">Invite Organisation Administrator</span>
                </button>
              </div>
            </div>
          </div>

          <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium mb-3">
            Organisation Administrators ({filteredOrganisationAdministrators.length})
          </h3>

          {/* TABLE */}
          <div className="overflow-x-auto bg-neutral-primary-soft border border-default">
            <table className="w-full text-sm text-left rtl:text-right text-body">
              <thead className="bg-faint-purple border-b border-default">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Full Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Email Address
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Permissions
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="font-overpass font-regular text-[1rem] tracking-wide">
                {filteredOrganisationAdministrators.map((organisationAdministrator) => (
                  <tr
                    key={organisationAdministrator.id}
                    className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default"
                  >
                    {/* Full Name */}
                    <td className="px-6 py-4">{organisationAdministrator.fullName}</td>

                    {/* Email Address */}
                    <td className="px-6 py-4">{organisationAdministrator.emailAddress}</td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {getStatusBadge(organisationAdministrator.status)}
                    </td>

                    {/* Permissions */}
                    <td className="px-6 py-4">
                      <Popover
                        content={
                          <PermissionsPopover
                            permissions={organisationAdministrator.permissions}
                            fullName={organisationAdministrator.fullName}
                          />
                        }
                        open={openPermissionPopover === organisationAdministrator.id}
                        arrow={false}
                        trigger="click"
                        placement="right"
                        onOpenChange={(open) =>
                          setOpenPermissionPopover(open ? organisationAdministrator.id : null)
                        }
                        theme={{
                          base: 'z-50 rounded-none bg-transparent border-0 shadow-xl absolute z-20 inline-block w-max max-w-[100vw] outline-none',
                          content: 'relative overflow-hidden rounded-none',
                        }}
                      >
                        <button
                          //className="border-2 border-purple px-2 py-1 inline-flex items-center gap-2 cursor-pointer"

                          className={`px-2 py-1 border-2 inline-flex items-center gap-2 cursor-pointer ${
                            openPermissionPopover === organisationAdministrator.id
                              ? 'border-purple'
                              : 'border-transparent'
                          }`}
                          type="button"
                        >
                          <span
                            className="material-symbols-sharp text-dark-pink"
                            style={{ fontSize: '1.6rem' }}
                          >
                            key
                          </span>
                          <span className="font-medium font-jost text-[1.1rem] text-dark-pink">
                            View Permissions
                          </span>
                        </button>
                      </Popover>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="grid grid-cols-1 gap-1 justify-items-start"></div>
                    </td>
                  </tr>
                ))}
              </tbody>

              {filteredOrganisationAdministrators.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-[1.2rem] tracking-wider text-red-500 font-jost"
                  >
                    No Organisation Administrators Found
                  </td>
                </tr>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* BASIC CONFIRMATION MODAL  */}
      {showBasicConfirmationModal && (
        <BasicConfirmationModal
          title={confirmationTitle}
          message={confirmationMessage}
          confirmButtonText={confirmationButtonText}
          confirmButtonVariant={confirmationVariant}
          onConfirm={confirmBasicConfirmation}
          onCancel={closeOrganisationTraineePageConfirmationModal}
        ></BasicConfirmationModal>
      )}

      {/* REVIEW ORGANISATION REGISTRATION REQUEST MODAL  */}
      {showInviteTraineeModal && (
        <InviteTraineeModal
          isOpen={showInviteTraineeModal}
          onClose={() => closeInviteTraineeModal()}
        ></InviteTraineeModal>
      )}
    </AppLayout>
  );
}

export default OrganisationAdministratorsPage;
