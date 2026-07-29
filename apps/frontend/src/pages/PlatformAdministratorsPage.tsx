import AppLayout from '../components/layout/AppLayout';
import { Dropdown, DropdownItem } from 'flowbite-react';
import { useState } from 'react';
import BasicConfirmationModal from '../components/layout/modals/BasicConfirmationModal';
import InvitePlatformAdministratorModal from '../components/layout/platform-administrators-page/InvitePlatformAdministratorModal';
import TransferSuperAdministratorRoleModal from '../components/layout/platform-administrators-page/TransferSuperAdministratorRoleModal';

// IMPORTANT NOTE FOR INTEGRATION
/* 
ONLY THE SUPER-ADMIN CAN: 
  View the ACTIONS part of the the table... 
  So, if they are NOT a super-admin, then you MUST hide the ACTIONS section of the table. 
  Also, please hide the "+ Invite Platform Administrator" if they are NOT a super-admin!
  
  This is easy to do.
  Just set a flag based on their role... 
  If they ARE super-admin, then TRUE...
  If they ARE NOT super-admin, then FALSE... 
  Then do: 
  {superAdministrator && (
    // Component... 
  )}
  // PLEASE DO THE SAME FOR THE HEADING!! It is currently commented out. But when you do the flag thing during integration, please
  // just add that to the other heading too if they are NOT a super-admin
*/

interface PlatformAdministrator {
  id: number;
  fullName: string;
  emailAddress: string;
  status: 'Active' | 'Invited' | 'Disabled' | 'Failed Invitation';
  role: 'Administrator' | 'Super Administrator';
}

// MOCK DATA
// REPLACE WITH THE REAL DEAL
const mockPlatformAdministrators: PlatformAdministrator[] = [
  {
    id: 1,
    fullName: 'Adriano Jorge',
    emailAddress: 'adriano.jorge@tuks.co.za',
    status: 'Active',
    role: 'Administrator',
  },
  {
    id: 2,
    fullName: 'Connor Bell',
    emailAddress: 'connor.bell@tuks.co.za',
    status: 'Active',
    role: 'Super Administrator',
  },
  {
    id: 3,
    fullName: 'Johan Nel',
    emailAddress: 'johan.nel@tuks.co.za',
    status: 'Disabled',
    role: 'Administrator',
  },
  {
    id: 4,
    fullName: 'Zoë Joubert',
    emailAddress: 'zoë.joubert@tuks.co.za',
    status: 'Invited',
    role: 'Administrator',
  },
  {
    id: 4,
    fullName: 'Rudolph Last Name',
    emailAddress: 'rudolph.last_name@tuks.co.za',
    status: 'Failed Invitation',
    role: 'Administrator',
  },
];

const getStatusBadge = (status: PlatformAdministrator['status']) => {
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

    case 'Failed Invitation':
      // RED
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-danger-subtle text-fg-danger-strong text-sm font-medium bg-danger-soft">
          Failed Invitation
        </span>
      );
  }
};

function PlatformAdministratorsPage() {
  const [showBasicConfirmationModal, setShowBasicConfirmationModal] = useState(false);
  const [confirmationTitle, setConfirmationTitle] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [confirmationButtonText, setConfirmationButtonText] = useState('');
  const [confirmationVariant, setConfirmationVariant] = useState<'danger' | 'success' | 'default'>(
    'default',
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Invited' | 'Active' | 'Disabled' | 'Failed Invitation'
  >('All');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Super Administrator' | 'Administrator'>(
    'All',
  );

  const filteredPlatformAdministrators = mockPlatformAdministrators.filter(
    (platformAdministrator) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch = [
        platformAdministrator.fullName,
        platformAdministrator.emailAddress,
        platformAdministrator.status,
        platformAdministrator.role,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);

      const matchesStatus = statusFilter === 'All' || platformAdministrator.status === statusFilter;

      const matchesRole = roleFilter === 'All' || platformAdministrator.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    },
  );

  const [showPlatformAdministratorModal, setShowPlatformAdministratorModal] = useState(false);
  const [showTransferSuperAdminModal, setShowTransferSuperAdminModal] = useState(false);

  const openPlatformAdministratorModal = () => {
    setShowPlatformAdministratorModal(true);
  };

  const closePlatformAdministratorModal = () => {
    setShowPlatformAdministratorModal(false);
  };

  const openTranserSuperAdministratorModal = () => {
    setShowTransferSuperAdminModal(true);
  };

  const closeTranserSuperAdministratorModal = () => {
    setShowTransferSuperAdminModal(false);
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

  const showRevokeInviteModal = () => {
    setConfirmationButtonText('Revoke');
    setConfirmationTitle('Revoke Invitation');
    setConfirmationMessage('Are you sure you want to revoke the invitation?');
    setConfirmationVariant('danger');
    openConfirmationModal();
  };

  const showDemoteAdministratorModal = () => {
    setConfirmationButtonText('Demote');
    setConfirmationTitle('Demote Administrator Role');
    setConfirmationMessage('Are you sure you want to demote this administrator?');
    setConfirmationVariant('danger');
    openConfirmationModal();
  };

  const confirmBasicConfirmation = () => {
    closePlatformAdministratorModal();
  };

  const confirmTransferSuperAdminRole = () => {
    closeTranserSuperAdministratorModal();
  };

  // Re–Enable Platform Administrator Modal
  const showEnablePlatformAdministratorModal = () => {
    setConfirmationButtonText('Re–Enable');
    setConfirmationTitle('Re–Enable Platform Administrator');
    setConfirmationMessage('Are you sure you want to enable this platform administrator?');
    setConfirmationVariant('success');
    openConfirmationModal();
  };

  // Disable Platform Administrator Modal
  const showDisablePlatformAdministratorModal = () => {
    setConfirmationButtonText('Disable');
    setConfirmationTitle('Disable Platform Administrator');
    setConfirmationMessage('Are you sure you want to disable this platform administrator?');
    setConfirmationVariant('danger');
    openConfirmationModal();
  };

  const closePlatformAdministratorPageConfirmationModal = () => {
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
            Platform Administrators
          </h1>

          {/* SUB-HEADING */}
          {/* DISPLAY THIS HEADING IF THEY ARE SUPER-ADMIN */}
          <p className="font-regular tracking-wider text-[1.3rem] font-justify font-jost text-gray-500 mb-4">
            View, invite, and manage <em>Insightful Phish</em> platform administrators.
          </p>

          {/* DISPLAY THIS HEADING IF THEY ARE NOT A SUPER-ADMIN */}
          {/* <p className="font-regular tracking-wider text-[1.3rem] font-justify font-jost text-gray-500 mb-4">
            View <em>Insightful Phish</em> platform administrators.
          </p> */}
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
                  <div className="flex items-center w-full space-x-3 md:w-auto">
                    {/* ROLE FILTER */}
                    <div>
                      <Dropdown
                        label={
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-sharp text-gray-400">filter_alt</span>
                            {roleFilter === 'All' ? 'Role' : roleFilter}
                          </span>
                        }
                        className="ml-2 font-jost tracking-wide text-[1.1rem] font-light text-gray-500 border border-gray-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white rounded-none"
                      >
                        <DropdownItem
                          onClick={() => setRoleFilter('All')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          All
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setRoleFilter('Super Administrator')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Super Administrator
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setRoleFilter('Administrator')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Administrator
                        </DropdownItem>
                      </Dropdown>
                    </div>

                    {/* STATUS FILTER */}
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
                          onClick={() => setStatusFilter('Failed Invitation')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Failed Invitation
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

                {/* Add (Invite) Platform Administrator Button */}
                <button
                  type="button"
                  onClick={openPlatformAdministratorModal}
                  className="cursor-pointer px-4 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-[0.425rem] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-sharp">add_2</span>
                  <span className="whitespace-nowrap">Invite Platform Administrator</span>
                </button>
              </div>
            </div>
          </div>

          <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium mb-3">
            Platform Administrators ({filteredPlatformAdministrators.length})
          </h3>

          {/* TABLE */}
          <div className="overflow-x-auto bg-neutral-primary-soft border border-default">
            <table className="w-full text-sm text-left rtl:text-right text-body">
              {/* Table Headings  */}
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
                    Role
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
                    Actions
                  </th>
                </tr>
              </thead>
              {/* Table Content */}
              <tbody className="font-overpass font-regular text-[1rem] tracking-wide">
                {filteredPlatformAdministrators.map((platformAdministrator) => (
                  <tr
                    key={platformAdministrator.id}
                    className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default"
                  >
                    {/* Full Name */}
                    <td className="px-6 py-4">{platformAdministrator.fullName}</td>

                    {/* Email Address */}
                    <td className="px-6 py-4">{platformAdministrator.emailAddress}</td>

                    {/* Role */}
                    <td className="px-6 py-4">{platformAdministrator.role}</td>

                    {/* Status */}
                    <td className="px-6 py-4">{getStatusBadge(platformAdministrator.status)}</td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="grid grid-cols-1 gap-1 justify-items-start">
                        {/* ACTIONS START HERE */}
                        {platformAdministrator.role === 'Super Administrator' &&
                          platformAdministrator.status === 'Active' && (
                            <button
                              className="cursor-pointer font-medium text-red-600 hover:underline"
                              type="button"
                              onClick={openTranserSuperAdministratorModal}
                            >
                              <strong>Transer Super Administrator Role</strong>
                            </button>
                          )}

                        {platformAdministrator.role === 'Super Administrator' &&
                          platformAdministrator.status === 'Failed Invitation' && (
                            <button
                              className="cursor-pointer font-medium text-red-600 hover:underline"
                              type="button"
                              onClick={showResendInviteModal}
                            >
                              <strong>Re–Send Invitation</strong>
                            </button>
                          )}

                        {platformAdministrator.role === 'Administrator' &&
                          platformAdministrator.status === 'Active' && (
                            <button
                              className="cursor-pointer font-medium text-red-600 hover:underline"
                              type="button"
                              onClick={showDemoteAdministratorModal}
                            >
                              <strong>Demote Administrator Role</strong>
                            </button>
                          )}

                        {platformAdministrator.role === 'Administrator' &&
                          platformAdministrator.status === 'Invited' && (
                            <button
                              className="cursor-pointer font-medium text-purple hover:underline"
                              type="button"
                              onClick={showResendInviteModal}
                            >
                              <strong>Re–Send Invitation</strong>
                            </button>
                          )}

                        {platformAdministrator.role === 'Administrator' &&
                          platformAdministrator.status === 'Failed Invitation' && (
                            <button
                              className="cursor-pointer font-medium text-purple hover:underline"
                              type="button"
                              onClick={showResendInviteModal}
                            >
                              <strong>Re–Send Invitation</strong>
                            </button>
                          )}

                        {platformAdministrator.status === 'Disabled' && (
                          <button
                            className="cursor-pointer font-medium text-emerald-600 hover:underline"
                            type="button"
                            onClick={showEnablePlatformAdministratorModal}
                          >
                            <strong>Re–Enable Administrator</strong>
                          </button>
                        )}

                        {platformAdministrator.role === 'Administrator' &&
                          platformAdministrator.status === 'Active' && (
                            <button
                              className="cursor-pointer font-medium text-red-600 hover:underline"
                              type="button"
                              onClick={showDisablePlatformAdministratorModal}
                            >
                              <strong>Disable Administrator</strong>
                            </button>
                          )}

                        {platformAdministrator.role === 'Administrator' &&
                          platformAdministrator.status === 'Invited' && (
                            <button
                              className="cursor-pointer font-medium text-red-600 hover:underline"
                              type="button"
                              onClick={showRevokeInviteModal}
                            >
                              <strong>Revoke Invitation</strong>
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Empty Table Message */}
              {filteredPlatformAdministrators.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-[1.2rem] tracking-wider text-red-500 font-jost"
                  >
                    No Platform Administrators Found
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
          onCancel={closePlatformAdministratorPageConfirmationModal}
        ></BasicConfirmationModal>
      )}

      {showPlatformAdministratorModal && (
        <InvitePlatformAdministratorModal
          isOpen={showPlatformAdministratorModal}
          onClose={() => closePlatformAdministratorModal()}
        ></InvitePlatformAdministratorModal>
      )}

      {showTransferSuperAdminModal && (
        <TransferSuperAdministratorRoleModal
          isOpen={showTransferSuperAdminModal}
          onConfirm={confirmTransferSuperAdminRole}
          onClose={() => closeTranserSuperAdministratorModal()}
        ></TransferSuperAdministratorRoleModal>
      )}
    </AppLayout>
  );
}

export default PlatformAdministratorsPage;
