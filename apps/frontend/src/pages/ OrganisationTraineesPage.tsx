import AppLayout from '../components/layout/AppLayout';
import { Dropdown, DropdownItem } from 'flowbite-react';
import { useState } from 'react';
import BasicConfirmationModal from '../components/layout/modals/BasicConfirmationModal';
import ReviewOrganisationRegistrationRequstModal from '../components/layout/modals/ReviewOrganisationRegistrationRequestModal';

interface Organisation {
  id: number;
  name: string;
  size: number;
  website: string;
  representative: string;
  requestStatus: 'Pending' | 'Contacted' | 'Rejected' | 'Approved Waiting Setup' | 'Approved';
  organisationStatus: 'Pending' | 'Onboarding' | 'Active' | 'Suspended' | 'Disabled';
}

// MOCK DATA
// REPLACE WITH THE REAL DEAL
const mockOrganisations: Organisation[] = [
  {
    id: 1,
    name: 'Big Red Paper Company',
    size: 1,
    website: 'https://bigredpaper.com',
    representative: 'Andrew Bernard',
    requestStatus: 'Pending',
    organisationStatus: 'Pending',
  },
  {
    id: 2,
    name: 'Michael Scott Paper Company',
    size: 3,
    website: 'https://mgscottpaper.com',
    representative: 'Michael Scott',
    requestStatus: 'Approved',
    organisationStatus: 'Disabled',
  },
  {
    id: 3,
    name: 'Dunder Mifflin Paper Company',
    size: 10000,
    website: 'https://dmpaper.com',
    representative: 'David Wallace',
    requestStatus: 'Approved',
    organisationStatus: 'Active',
  },
];

const getRequestStatusBadge = (status: Organisation['requestStatus']) => {
  switch (status) {
    case 'Pending':
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-warning-subtle text-fg-warning text-sm font-medium bg-warning-soft">
          Pending
        </span>
      );

    case 'Contacted':
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-default-medium text-heading text-sm font-medium bg-neutral-secondary-medium">
          Contacted
        </span>
      );

    case 'Rejected':
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-danger-subtle text-fg-danger-strong text-sm font-medium bg-danger-soft">
          Rejected
        </span>
      );

    case 'Approved Waiting Setup':
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-brand-subtle text-fg-brand-strong text-sm font-medium bg-brand-softer">
          Approved Waiting Setup
        </span>
      );

    case 'Approved':
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-success-subtle text-fg-success-strong text-sm font-medium bg-success-soft">
          Approved
        </span>
      );
  }
};

const getOrganisationStatusBadge = (status: Organisation['organisationStatus']) => {
  switch (status) {
    case 'Pending':
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-warning-subtle text-fg-warning text-sm font-medium bg-warning-soft">
          Pending
        </span>
      );

    case 'Onboarding':
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-brand-subtle text-fg-brand-strong text-sm font-medium bg-brand-softer">
          Onboarding
        </span>
      );

    case 'Active':
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-success-subtle text-fg-success-strong text-sm font-medium bg-success-soft">
          Active
        </span>
      );

    case 'Disabled':
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-default-medium text-heading text-sm font-medium bg-neutral-secondary-medium">
          Disabled
        </span>
      );

    case 'Suspended':
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-danger-subtle text-fg-danger-strong text-sm font-medium bg-danger-soft">
          Suspended
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
  const [roleFilter, setRoleFilter] = useState<
    'All' | 'Trainee' | 'Organisation Administrator' | 'Active' | 'Suspended' | 'Disabled'
  >('All');

  const filteredOrganisations = mockOrganisations.filter((organisation) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch = [
      organisation.name,
      organisation.size,
      organisation.website,
      organisation.representative,
      organisation.requestStatus,
      organisation.organisationStatus,
    ]
      .join(' ')
      .toLowerCase()
      .includes(search);

    // const matchesInviteStatus =
    //   inviteStatusFilter === 'All' || organisation.requestStatus === inviteStatusFilter;

    // const matchesOrganisationStatus =
    //   organisationStatusFilter === 'All' ||
    //   organisation.organisationStatus === organisationStatusFilter;
    return null;
    // return matchesSearch && matchesRequestStatus && matchesOrganisationStatus;
  });

  const [
    showReviewOrganisationRegistrationRequestModal,
    setShowReviewOrganisationRegistrationRequestModal,
  ] = useState(false);

  const openReviewOrganisationRegistrationRequestModal = () => {
    setShowReviewOrganisationRegistrationRequestModal(true);
  };

  const closeReviewOrganisationRegistrationRequestModal = () => {
    setShowReviewOrganisationRegistrationRequestModal(false);
  };

  const openConfirmationModal = () => {
    setShowBasicConfirmationModal(true);
  };

  // DIFFERENT KINDS OF BASIC CONFIRMATION MODALS
  const showDisableOrgModal = () => {
    setConfirmationButtonText('Disable Organisation');
    setConfirmationTitle('Disable Organisation');
    setConfirmationMessage('Are you sure you want to disable this organisation?');
    setConfirmationVariant('danger');
    openConfirmationModal();
  };

  const showEnableOrgModal = () => {
    setConfirmationButtonText('Re-Enable Organisation');
    setConfirmationTitle('Re-Enable Organisation');
    setConfirmationMessage('Are you sure you want to re-enable this organisation?');
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
                            {inviteStatusFilter === 'All' ? 'Invite Status' : inviteStatusFilter}
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
                  className="cursor-pointer px-4 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-[0.425rem] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-sharp">add_2</span>
                  <span className="whitespace-nowrap">Invite Trainee</span>
                </button>
              </div>
            </div>
          </div>

          <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium mb-3">
            Organisations Trainees ({filteredOrganisations.length})
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
                    Invite Status
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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="font-overpass font-regular text-[1rem] tracking-wide">
                {/* MOCK ORGANISATION 1 */}
                {filteredOrganisations.map((organisation) => (
                  <tr
                    key={organisation.id}
                    className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default"
                  >
                    {/* Organisation Name */}
                    <td className="px-6 py-4">{organisation.name}</td>

                    {/* Organisation Size (Approx. # of Employees) */}
                    <td className="px-6 py-4">{organisation.size}</td>

                    {/* Website */}
                    <td className="px-6 py-4">
                      <a
                        href={organisation.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-fg-brand hover:underline font-google_sans_code"
                      >
                        {organisation.website}
                      </a>
                    </td>

                    {/* Representative */}
                    <td className="px-6 py-4">{organisation.representative}</td>

                    {/* Request Status */}
                    <td className="px-6 py-4">
                      {getRequestStatusBadge(organisation.requestStatus)}
                    </td>

                    {/* Organisation Status */}
                    <td className="px-6 py-4">
                      {getOrganisationStatusBadge(organisation.organisationStatus)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      {/* PLEASE NOTE THAT THIS WILL CHANGE DEPENDING ON THE STATE */}
                      <div className="grid grid-cols-1 gap-1 justify-items-start">
                        {organisation.requestStatus === 'Pending' && (
                          <button
                            onClick={openReviewOrganisationRegistrationRequestModal}
                            type="button"
                            className="cursor-pointer font-medium text-purple hover:underline"
                          >
                            <strong>Review</strong> Request
                          </button>
                        )}

                        {organisation.requestStatus !== 'Pending' && (
                          <a
                            href="/organisation-information"
                            className=" cursor-pointer font-medium text-purple hover:underline"
                          >
                            {/* THIS GOES TO THE ORGANISATION INFORMATION PAGE */}
                            <strong>View</strong> Information
                          </a>
                        )}

                        {organisation.organisationStatus === 'Disabled' && (
                          <button
                            className="cursor-pointer font-medium text-emerald-600 hover:underline"
                            type="button"
                            onClick={showEnableOrgModal}
                          >
                            <strong>Re–Enable</strong>
                          </button>
                        )}

                        {organisation.organisationStatus === 'Active' && (
                          <button
                            className="cursor-pointer font-medium text-red-600 hover:underline"
                            type="button"
                            onClick={showDisableOrgModal}
                          >
                            <strong>Disable</strong>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

              {filteredOrganisations.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-[1.2rem] tracking-wider text-red-500 font-jost"
                  >
                    No Organisations Found
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
      {showReviewOrganisationRegistrationRequestModal && (
        <ReviewOrganisationRegistrationRequstModal
          isOpen={showReviewOrganisationRegistrationRequestModal}
          onClose={() => closeReviewOrganisationRegistrationRequestModal()}
          // YOU WILL NEED TO ADD MORE PROPS SO THAT YOU CAN PASS TO THE MODAL ORG AND REP INFO FROM THE SELECTED OPTION
        ></ReviewOrganisationRegistrationRequstModal>
      )}
    </AppLayout>
  );
}

export default OrganisationTraineesPage;
