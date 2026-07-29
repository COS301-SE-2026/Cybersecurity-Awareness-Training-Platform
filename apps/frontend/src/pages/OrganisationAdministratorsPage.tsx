import AppLayout from '../components/layout/AppLayout';
import { Dropdown, DropdownItem, Popover } from 'flowbite-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BasicConfirmationModal from '../components/layout/modals/BasicConfirmationModal';
import InviteOrganisationAdministratorModal from '../components/organisation-administrator-page/InviteOrganisationAdministratorModal';
import EditOrganisationAdministratorPermissionsModal from '../components/organisation-administrator-page/EditOrganisationAdministratorPermissionsModal';
import {
  getOrganisationAdmins,
  type OrganisationAdminListItem,
} from '../services/organisation-admin.service';
import { ApiError } from '../lib/apiClient';
import { useAuth } from '../context/useAuth';
import AdminPagesSearchSVG from '../components/AdminPagesSearchSVG';

interface OrganisationAdministrator {
  source: OrganisationAdminListItem;
  id: string;
  fullName: string;
  emailAddress: string;
  status: 'Active' | 'Disabled';
  permissions: string[];
}

interface AdministratorListState {
  organisationId: string | null;
  rows: OrganisationAdminListItem[];
  errorMessage: string | null;
}

function toDisplayAdministrator(
  administrator: OrganisationAdminListItem,
): OrganisationAdministrator {
  const fullName = [administrator.firstName.trim(), administrator.lastName.trim()]
    .filter(Boolean)
    .join(' ');

  return {
    source: administrator,
    id: administrator.id,
    fullName: fullName || 'N/A',
    emailAddress: administrator.email,
    status: administrator.adminStatus === 'ACTIVE' ? 'Active' : 'Disabled',
    permissions: administrator.permissions.map((permission) =>
      permission.displayName.trim() ? permission.displayName : permission.key,
    ),
  };
}

function getListErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Unable to load organisation administrators. Please try again.';
  }

  const body =
    error.body && typeof error.body === 'object'
      ? (error.body as { message?: unknown })
      : undefined;
  const bodyMessage =
    typeof body?.message === 'string' && body.message.trim() ? body.message : null;

  if (error.status === 401) {
    return bodyMessage || 'Your session could not be verified. Please try again.';
  }

  if (error.status === 403) {
    return bodyMessage || 'You do not have permission to view organisation administrators.';
  }

  if (error.status === 429) {
    return bodyMessage || 'Too many administrator requests. Please try again later.';
  }

  if (error.status >= 500) {
    return bodyMessage || 'The server could not load organisation administrators.';
  }

  return bodyMessage || 'Unable to load organisation administrators. Please try again.';
}

const getStatusBadge = (status: OrganisationAdministrator['status']) => {
  // status: 'Active' | 'Disabled'
  switch (status) {
    case 'Disabled':
      // GREY
      return (
        <span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-default-medium text-heading text-sm font-medium bg-neutral-secondary-medium">
          Disabled
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
  const { token, authContext, permissions } = useAuth();
  const organisationId = authContext?.organisation?.id ?? null;
  const listRequestIdRef = useRef(0);

  const [listState, setListState] = useState<AdministratorListState>({
    organisationId: null,
    rows: [],
    errorMessage: null,
  });

  const reloadOrganisationAdministrators = useCallback(async () => {
    if (!token || !organisationId) {
      return;
    }

    const requestId = ++listRequestIdRef.current;

    try {
      const response = await getOrganisationAdmins(organisationId, token);

      if (listRequestIdRef.current !== requestId) {
        return;
      }

      setListState({
        organisationId,
        rows: response.admins,
        errorMessage: null,
      });
    } catch (error: unknown) {
      if (listRequestIdRef.current !== requestId) {
        return;
      }

      setListState({
        organisationId,
        rows: [],
        errorMessage: getListErrorMessage(error),
      });
    }
  }, [organisationId, token]);

  useEffect(() => {
    let isCurrent = true;
    queueMicrotask(() => {
      if (isCurrent) {
        void reloadOrganisationAdministrators();
      }
    });

    return () => {
      isCurrent = false;
      listRequestIdRef.current += 1;
    };
  }, [reloadOrganisationAdministrators]);

  const hasCurrentResult = listState.organisationId === organisationId;
  const isLoading = Boolean(token && organisationId && !hasCurrentResult);
  const loadError = hasCurrentResult ? listState.errorMessage : null;

  const organisationAdministrators = useMemo(
    () => (hasCurrentResult ? listState.rows : []).map(toDisplayAdministrator),
    [hasCurrentResult, listState.rows],
  );

  const canInviteAdministrators = permissions.includes('INVITE_ORGANISATION_ADMINS');
  const canChangeAdministratorPermissions = permissions.includes(
    'CHANGE_ORGANISATION_ADMIN_PERMISSIONS',
  );
  const canRemoveAdministrators = permissions.includes('REMOVE_ORGANISATION_ADMINS');

  const [showBasicConfirmationModal, setShowBasicConfirmationModal] = useState(false);
  const [showEditPermissionsModal, setShowEditPermissionsModal] = useState(false);
  const [confirmationTitle, setConfirmationTitle] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [confirmationButtonText, setConfirmationButtonText] = useState('');
  const [confirmationVariant, setConfirmationVariant] = useState<'danger' | 'success' | 'default'>(
    'default',
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Disabled'>('All');
  const [openPermissionPopover, setOpenPermissionPopover] = useState<string | null>(null);

  const filteredOrganisationAdministrators = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return organisationAdministrators.filter((organisationAdministrator) => {
      const matchesSearch =
        !search ||
        [
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
    });
  }, [organisationAdministrators, searchTerm, statusFilter]);

  const [showOrganisationAdministratorModal, setShowOrganisationAdministratorModal] =
    useState(false);

  const openOrganisationAdministratorModal = () => {
    setShowOrganisationAdministratorModal(true);
  };

  const closeOrganisationAdministratorModal = () => {
    setShowOrganisationAdministratorModal(false);
  };

  const openConfirmationModal = () => {
    setShowBasicConfirmationModal(true);
  };

  const showDisableOrganisationAdministratorModal = () => {
    setConfirmationButtonText('Disable');
    setConfirmationTitle('Disable Organisation Administrator');
    setConfirmationMessage('Are you sure you want to disable this organisation administrator?');
    setConfirmationVariant('danger');
    openConfirmationModal();
  };

  const openEditPermissionsModal = () => {
    setShowEditPermissionsModal(true);
  };

  const confirmBasicConfirmation = () => {
    closeOrganisationAdministratorModal();
  };

  const closeOrganisationAdministratorPageConfirmationModal = () => {
    setShowBasicConfirmationModal(false);
  };

  const closeEditPermissionsModal = () => {
    setShowEditPermissionsModal(false);
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
                      <AdminPagesSearchSVG />
                      {/* Search Input */}
                      <input
                        type="text"
                        id="simple-search-organisation-admin-page"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="font-jost tracking-wide block w-full p-2 pl-10 text-[1.1rem] h-[2.55rem] text-black border border-gray-300 bg-white focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Search Organisation Administrators"
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
                {canInviteAdministrators && (
                  <button
                    type="button"
                    onClick={openOrganisationAdministratorModal}
                    className="cursor-pointer px-4 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-[0.425rem] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-sharp">add_2</span>
                    <span className="whitespace-nowrap">Invite Organisation Administrator</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {loadError && (
            <div
              role="alert"
              className="p-4 mb-6 text-red-800 bg-red-50 border border-red-200 rounded-none font-jost text-[1.1rem] flex items-center gap-2"
            >
              <span className="material-symbols-sharp">error</span>
              <span>{loadError}</span>
            </div>
          )}

          {isLoading && (
            <div className="py-12 flex justify-center items-center font-jost text-gray-500 text-[1.2rem]">
              <span>Loading organisation administrators...</span>
            </div>
          )}

          {!isLoading && !loadError && (
            <>
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
                              className={`px-2 py-1 border-2 inline-flex items-center gap-2 cursor-pointer ${openPermissionPopover === organisationAdministrator.id
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
                              <span className="hover:underline font-medium text-dark-pink">
                                <strong>View Permissions</strong>
                              </span>
                            </button>
                          </Popover>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="grid grid-cols-1 gap-1 justify-items-start">
                            {organisationAdministrator.status === 'Active' &&
                              canChangeAdministratorPermissions && (
                                <button
                                  className="cursor-pointer font-medium text-purple hover:underline"
                                  type="button"
                                  onClick={openEditPermissionsModal}
                                >
                                  <strong>Edit Permissions</strong>
                                </button>
                              )}

                            {organisationAdministrator.status === 'Active' &&
                              canRemoveAdministrators && (
                                <button
                                  className="cursor-pointer font-medium text-red-600 hover:underline"
                                  type="button"
                                  onClick={showDisableOrganisationAdministratorModal}
                                >
                                  <strong>Disable</strong>
                                </button>
                              )}

                            {organisationAdministrator.status === 'Disabled' && (
                              <span aria-hidden="true">—</span>
                            )}

                            {organisationAdministrator.status === 'Active' &&
                              !canChangeAdministratorPermissions &&
                              !canRemoveAdministrators && <span aria-hidden="true">—</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {filteredOrganisationAdministrators.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-[1.2rem] tracking-wider text-red-500 font-jost"
                      >
                        No Organisation Administrators Found
                      </td>
                    </tr>
                  )}
                </table>
              </div>
            </>
          )}
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
          onCancel={closeOrganisationAdministratorPageConfirmationModal}
        ></BasicConfirmationModal>
      )}

      {/* REVIEW ORGANISATION REGISTRATION REQUEST MODAL  */}
      {showOrganisationAdministratorModal && (
        <InviteOrganisationAdministratorModal
          isOpen={showOrganisationAdministratorModal}
          onClose={() => closeOrganisationAdministratorModal()}
        ></InviteOrganisationAdministratorModal>
      )}

      {showEditPermissionsModal && (
        <EditOrganisationAdministratorPermissionsModal
          isOpen={showEditPermissionsModal}
          onClose={() => closeEditPermissionsModal()}
        ></EditOrganisationAdministratorPermissionsModal>
      )}
    </AppLayout>
  );
}

export default OrganisationAdministratorsPage;
