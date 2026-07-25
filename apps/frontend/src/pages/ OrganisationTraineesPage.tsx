import AppLayout from '../components/layout/AppLayout';
import { Dropdown, DropdownItem } from 'flowbite-react';
import { useState } from 'react';
import BasicConfirmationModal from '../components/layout/modals/BasicConfirmationModal';
import InviteTraineeModal from '../components/layout/modals/InviteTraineeModal';

interface Trainee {
  id: number;
  fullName: string;
  emailAddress: string;
  role: 'Trainee' | 'Organisation Administrator';
  status: 'Invited' | 'Active' | 'Disabled' | 'Expired' | 'Revoked' | 'Rejected';
}

// MOCK DATA
// REPLACE WITH THE REAL DEAL
const mockTrainees: Trainee[] = [
  {
    id: 1,
    fullName: 'Adriano Jorge',
    emailAddress: 'adriano.jorge@tuks.co.za',
    role: 'Trainee',
    status: 'Active',
  },
  {
    id: 2,
    fullName: 'Connor Bell',
    emailAddress: 'connor.bell@tuks.co.za',
    role: 'Organisation Administrator',
    status: 'Active',
  },
  {
    id: 3,
    fullName: 'Johan Nel',
    emailAddress: 'johan.nel@tuks.co.za',
    role: 'Trainee',
    status: 'Rejected',
  },
  {
    id: 4,
    fullName: 'Zoë Joubert',
    emailAddress: 'zoë.joubert@tuks.co.za',
    role: 'Trainee',
    status: 'Disabled',
  },
];

const getStatusBadge = (status: Trainee['status']) => {
  // status: 'Invited' | 'Active' | 'Disabled' | 'Expired' | 'Revoked' | 'Rejected';
  switch (status) {
    case 'Rejected':
      return (
        // YELLOW
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-warning-subtle text-fg-warning text-sm font-medium bg-warning-soft">
          Rejected
        </span>
      );

    case 'Disabled':
      // GREY
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-default-medium text-heading text-sm font-medium bg-neutral-secondary-medium">
          Disabled
        </span>
      );

    case 'Expired':
      // GREY
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-default-medium text-heading text-sm font-medium bg-neutral-secondary-medium">
          Expired
        </span>
      );

    case 'Revoked':
      // RED
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-danger-subtle text-fg-danger-strong text-sm font-medium bg-danger-soft">
          Revoked
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

function OrganisationTraineesPage() {
  const [showBasicConfirmationModal, setShowBasicConfirmationModal] = useState(false);
  const [confirmationTitle, setConfirmationTitle] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [confirmationButtonText, setConfirmationButtonText] = useState('');
  const [confirmationVariant, setConfirmationVariant] = useState<'danger' | 'success' | 'default'>(
    'default',
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteStatusFilter, setInviteStatusFilter] = useState<
    'All' | 'Invited' | 'Active' | 'Disabled' | 'Expired' | 'Revoked' | 'Rejected'
  >('All');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Trainee' | 'Organisation Administrator'>(
    'All',
  );

  const filteredTrainees = mockTrainees.filter((trainee) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch = [trainee.fullName, trainee.emailAddress, trainee.role, trainee.status]
      .join(' ')
      .toLowerCase()
      .includes(search);

    const matchesStatus = inviteStatusFilter === 'All' || trainee.status === inviteStatusFilter;

    const matchesRole = roleFilter === 'All' || trainee.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

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

  const showEnableTraineeModal = () => {
    setConfirmationButtonText('Enable');
    setConfirmationTitle('Enable Organisation Trainee');
    setConfirmationMessage('Are you sure you want to enable this organisation trainee?');
    setConfirmationVariant('success');
    openConfirmationModal();
  };

  const closeConfirmationModal = () => {
    setShowBasicConfirmationModal(false);
  };

  const handleConfirmation = () => {
    closeConfirmationModal();
    // INTEGRATION TO HANDLE LATER
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
            paddingBottom: '0.8rem',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          <h1
            style={{
              margin: 0,
              marginBottom: '0.8rem',
              fontSize: '3.8rem',
              fontWeight: 500,
              lineHeight: 1,
              // color: 'white',
              color: 'rgb(132, 25, 255)',
              fontFamily: 'Jost',
            }}
          >
            Organisation Trainees
          </h1>

          {/* SUB-HEADING */}
          <p className="font-regular tracking-wider text-[1.3rem] font-justify font-jost text-gray-500 mb-4">
            View, invite, and manage trainees within your organisation.
          </p>
        </div>

        <div className="px-6 pb-6">
          {/* SEARCH AND FILTER BAR */}
          <div className="w-full mb-4">
            <div className="relative bg-white-purple border border-gray-200">
              <div className="flex flex-col items-center justify-between p-4 space-y-3 md:flex-row md:space-y-0 md:space-x-4">
                {/* ==== SEARCH BAR ==== */}
                <div className="w-full md:w-1/2">
                  <form className="flex items-center">
                    {/* Search Input Label */}
                    <label htmlFor="simple-search" className="sr-only">
                      Search Trainees
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
                        placeholder="Search Trainees"
                      />
                    </div>
                  </form>
                </div>
                {/* ==== SEARCH BAR ==== */}

                {/* ==== FILTERS ==== */}
                <div className="flex flex-col items-stretch justify-end flex-shrink-0 w-full space-y-2 md:w-auto md:flex-row md:space-y-0 md:items-center md:space-x-3">
                  {/* Request Status Filter Dropdown */}
                  <div className="flex items-center w-full space-x-3 md:w-auto">
                    <div>
                      <Dropdown
                        label={
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-sharp text-gray-400">filter_alt</span>
                            {inviteStatusFilter === 'All' ? 'Status' : inviteStatusFilter}
                          </span>
                        }
                        className="ml-2 font-jost tracking-wide text-[1.1rem] font-light text-gray-500 border border-gray-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white rounded-none"
                      >
                        <DropdownItem
                          onClick={() => setInviteStatusFilter('All')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          All
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setInviteStatusFilter('Invited')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Invited
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setInviteStatusFilter('Active')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Active
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setInviteStatusFilter('Disabled')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Disabled
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setInviteStatusFilter('Expired')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Expired
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setInviteStatusFilter('Revoked')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Revoked
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setInviteStatusFilter('Rejected')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Rejected
                        </DropdownItem>
                      </Dropdown>
                    </div>
                  </div>

                  {/* Organisation Status Filter Dropdown */}
                  <div className="flex items-center w-full space-x-3 md:w-auto">
                    <div>
                      <Dropdown
                        label={
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-sharp text-gray-400">filter_alt</span>
                            <span>{roleFilter === 'All' ? 'Role' : roleFilter}</span>
                          </span>
                        }
                        className="font-jost tracking-wide text-[1.1rem] font-light text-gray-500 border border-gray-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white rounded-none"
                      >
                        <DropdownItem
                          onClick={() => setRoleFilter('All')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          All
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setRoleFilter('Trainee')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Trainee
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setRoleFilter('Organisation Administrator')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Organisation Administrator
                        </DropdownItem>
                      </Dropdown>
                    </div>
                  </div>
                </div>
                {/* ==== FILTERS ==== */}

                {/* Add (Invite) Trainee Button */}
                <button
                  type="button"
                  onClick={openInviteTraineeModal}
                  className="cursor-pointer px-4 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-[0.425rem] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-sharp">add_2</span>
                  <span className="whitespace-nowrap">Invite Trainee</span>
                </button>
              </div>
            </div>
          </div>

          <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium mb-3">
            Organisation Trainees ({filteredTrainees.length})
          </h3>

          {/* TABLE */}
          <div className="relative overflow-x-auto bg-neutral-primary-soft border border-default">
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
              <tbody className="font-overpass font-regular text-[1rem] tracking-wide">
                {/* MOCK ORGANISATION 1 */}
                {filteredTrainees.map((trainee) => (
                  <tr
                    key={trainee.id}
                    className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default"
                  >
                    {/* Trainee Full Name */}
                    <td className="px-6 py-4">{trainee.fullName}</td>

                    {/* Trainee Email Address */}
                    <td className="px-6 py-4">{trainee.emailAddress}</td>

                    {/* Representative */}
                    <td className="px-6 py-4">{trainee.role}</td>

                    {/* Request Status */}
                    <td className="px-6 py-4">{getStatusBadge(trainee.status)}</td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      {/* PLEASE NOTE THAT THIS WILL CHANGE DEPENDING ON THE STATE */}
                      <div className="grid grid-cols-1 gap-1 justify-items-start">
                        {trainee.status === 'Invited' && (
                          <button
                            className="cursor-pointer font-medium text-purple hover:underline"
                            type="button"
                            onClick={showResendInviteModal}
                          >
                            <strong>Re–Send Invitation</strong>
                          </button>
                        )}

                        {trainee.status === 'Invited' && (
                          <button
                            className="cursor-pointer font-medium text-red-600 hover:underline"
                            type="button"
                            onClick={showRevokeInviteModal}
                          >
                            <strong>Revoke Invitation</strong>
                          </button>
                        )}

                        {trainee.status === 'Active' &&
                          trainee.role !== 'Organisation Administrator' && (
                            <button
                              className="cursor-pointer font-medium text-purple hover:underline"
                              type="button"
                              onClick={showPromoteToOrgAdmin}
                            >
                              <strong>Promote to Organisation Administrator</strong>
                            </button>
                          )}

                        {trainee.status === 'Active' && (
                          <button
                            className="cursor-pointer font-medium text-red-600 hover:underline"
                            type="button"
                            onClick={showDisableTraineeModal}
                          >
                            <strong>Disable Trainee</strong>
                          </button>
                        )}

                        {trainee.status === 'Disabled' && (
                          <button
                            className="cursor-pointer font-medium text-emerald-600 hover:underline"
                            type="button"
                            onClick={showEnableTraineeModal}
                          >
                            <strong>Re–Enable Trainee</strong>
                          </button>
                        )}

                        {trainee.status === 'Revoked' && (
                          <button
                            className="cursor-pointer font-medium text-purple hover:underline"
                            type="button"
                            // onClick={JUST SHOW THE BUILT IN BROWSER CONFIRMATION WHEN A NEW INVITATION IS SENT, NOTHING SPECIAL...}
                          >
                            <strong>Send New Invitation</strong>
                          </button>
                        )}

                        {trainee.status === 'Rejected' && (
                          <button
                            className="cursor-pointer font-medium text-purple hover:underline"
                            type="button"
                            // onClick={JUST SHOW THE BUILT IN BROWSER CONFIRMATION WHEN A NEW INVITATION IS SENT, NOTHING SPECIAL...}
                          >
                            <strong>Send New Invitation</strong>
                          </button>
                        )}

                        {trainee.status === 'Expired' && (
                          <button
                            className="cursor-pointer font-medium text-purple hover:underline"
                            type="button"
                            onClick={showResendInviteModal}
                          >
                            <strong>Re–Send Invitation</strong>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

              {filteredTrainees.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-[1.2rem] tracking-wider text-red-500 font-jost"
                  >
                    No Organisation Trainees Found
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
          onConfirm={handleConfirmation}
          onCancel={closeConfirmationModal}
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

export default OrganisationTraineesPage;
