import AppLayout from '../components/layout/AppLayout';
import { Dropdown, DropdownItem, Popover } from 'flowbite-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BasicConfirmationModal from '../components/layout/modals/BasicConfirmationModal';
import InviteOrganisationAdministratorModal from '../components/organisation-administrator-page/InviteOrganisationAdministratorModal';
import EditOrganisationAdministratorPermissionsModal from '../components/organisation-administrator-page/EditOrganisationAdministratorPermissionsModal';
import {
  getOrganisationAdmins,
  promoteOrganisationAdmin,
  removeOrganisationAdmin,
  updateOrganisationAdminPermissions,
  type OrganisationAdminAvailablePermission,
  type OrganisationAdminListItem,
  type OrganisationAdminPermissionKey,
} from '../services/organisation-admin.service';
import { ApiError } from '../lib/apiClient';
import { useAuth } from '../context/useAuth';
import AdminPagesSearchSVG from '../components/AdminPagesSearchSVG';
import {
  AdminTable,
  AdminTableActions,
  AdminTableCell,
  AdminTableContainer,
  AdminTableEmptyRow,
  AdminTableHeader,
  AdminTableHeaderCell,
  AdminTableLoadingRow,
  TruncatedValue,
} from '../components/ui/AdminTable';

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
  availablePermissions: OrganisationAdminAvailablePermission[];
  actorPermissions: OrganisationAdminPermissionKey[];
  errorMessage: string | null;
}

type FeedbackState = {
  kind: 'success' | 'warning';
  message: string;
} | null;

type MutationErrorBody = {
  error?: unknown;
  message?: unknown;
  details?: unknown;
};

type ValidationDetail = {
  field: string;
  message: string;
};

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

function getMutationErrorBody(error: ApiError): MutationErrorBody | null {
  if (!error.body || typeof error.body !== 'object') {
    return null;
  }

  return error.body as MutationErrorBody;
}

function getMutationErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError)) {
    return null;
  }

  const body = getMutationErrorBody(error);
  return typeof body?.error === 'string' ? body.error : null;
}

function getMutationErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return 'Unable to connect to the server. Please try again.';
  }

  const body = getMutationErrorBody(error);
  const bodyMessage =
    typeof body?.message === 'string' && body.message.trim() ? body.message : null;

  if (error.status === 401) {
    return bodyMessage || 'Your session could not be verified. Please try again.';
  }

  if (error.status === 403) {
    return bodyMessage || 'You do not have permission to perform this action.';
  }

  if (error.status === 404) {
    return bodyMessage || 'The selected administrator could not be found.';
  }

  if (error.status === 409) {
    return bodyMessage || 'The administrator data changed. The list has been refreshed.';
  }

  if (error.status === 422) {
    return bodyMessage || 'Please check the submitted values and try again.';
  }

  if (error.status === 429) {
    return bodyMessage || 'Too many administrator requests. Please try again later.';
  }

  if (error.status >= 500) {
    return bodyMessage || 'The server could not complete this request.';
  }

  return bodyMessage || fallback;
}

function getValidationDetail(error: unknown, field: string): string | null {
  if (!(error instanceof ApiError) || error.status !== 422) {
    return null;
  }

  const body = getMutationErrorBody(error);
  if (!Array.isArray(body?.details)) {
    return null;
  }

  const detail = body.details.find((value): value is ValidationDetail => {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<ValidationDetail>;

    return candidate.field === field && typeof candidate.message === 'string';
  });

  return detail?.message ?? null;
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
    availablePermissions: [],
    actorPermissions: [],
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
        availablePermissions: response.availablePermissions,
        actorPermissions: response.actorPermissions,
        errorMessage: null,
      });
    } catch (error: unknown) {
      if (listRequestIdRef.current !== requestId) {
        return;
      }

      setListState({
        organisationId,
        rows: [],
        availablePermissions: [],
        actorPermissions: [],
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

  const currentAvailablePermissions = hasCurrentResult ? listState.availablePermissions : [];

  const currentActorPermissions = hasCurrentResult ? listState.actorPermissions : permissions;

  const organisationAdministrators = useMemo(
    () => (hasCurrentResult ? listState.rows : []).map(toDisplayAdministrator),
    [hasCurrentResult, listState.rows],
  );

  const canInviteAdministrators = currentActorPermissions.includes('INVITE_ORGANISATION_ADMINS');
  const canChangeAdministratorPermissions = currentActorPermissions.includes(
    'CHANGE_ORGANISATION_ADMIN_PERMISSIONS',
  );
  const canRemoveAdministrators = currentActorPermissions.includes('REMOVE_ORGANISATION_ADMINS');

  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const [promotionEmail, setPromotionEmail] = useState('');
  const [promotionPermissionKeys, setPromotionPermissionKeys] = useState<
    OrganisationAdminPermissionKey[]
  >([]);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [promotionEmailError, setPromotionEmailError] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);

  const [selectedAdministrator, setSelectedAdministrator] =
    useState<OrganisationAdministrator | null>(null);
  const [permissionUpdateKeys, setPermissionUpdateKeys] = useState<
    OrganisationAdminPermissionKey[]
  >([]);
  const [permissionUpdateError, setPermissionUpdateError] = useState<string | null>(null);
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);

  const [selectedRemovalAdministrator, setSelectedRemovalAdministrator] =
    useState<OrganisationAdministrator | null>(null);
  const [removalPassword, setRemovalPassword] = useState('');
  const [removalConfirmation, setRemovalConfirmation] = useState('');
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [removalPasswordError, setRemovalPasswordError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

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
    setPromotionEmail('');
    setPromotionPermissionKeys([]);
    setPromotionError(null);
    setPromotionEmailError(null);
    setFeedback(null);
    setShowOrganisationAdministratorModal(true);
  };

  const closeOrganisationAdministratorModal = () => {
    if (isPromoting) {
      return;
    }

    setShowOrganisationAdministratorModal(false);
    setPromotionError(null);
    setPromotionEmailError(null);
  };

  const openRemoveAdministratorModal = (administrator: OrganisationAdministrator) => {
    setSelectedRemovalAdministrator(administrator);
    setRemovalPassword('');
    setRemovalConfirmation('');
    setRemovalError(null);
    setRemovalPasswordError(null);
    setFeedback(null);
    setConfirmationButtonText('Remove');
    setConfirmationTitle('Remove Organisation Administrator');
    setConfirmationMessage(`Remove administrator privileges from ${administrator.fullName}?`);
    setConfirmationVariant('danger');
    setShowBasicConfirmationModal(true);
  };

  const openEditPermissionsModal = (administrator: OrganisationAdministrator) => {
    setSelectedAdministrator(administrator);
    setPermissionUpdateKeys(administrator.source.permissions.map((permission) => permission.key));
    setPermissionUpdateError(null);
    setFeedback(null);
    setShowEditPermissionsModal(true);
  };

  const closeOrganisationAdministratorPageConfirmationModal = () => {
    if (isRemoving) {
      return;
    }

    setShowBasicConfirmationModal(false);
    setSelectedRemovalAdministrator(null);
    setRemovalPassword('');
    setRemovalConfirmation('');
    setRemovalError(null);
    setRemovalPasswordError(null);
  };

  const submitAdministratorRemoval = async () => {
    if (!token || !organisationId || !selectedRemovalAdministrator || isRemoving) {
      return;
    }

    setRemovalError(null);
    setRemovalPasswordError(null);
    setFeedback(null);

    if (!removalPassword) {
      setRemovalPasswordError('Password is required.');
      return;
    }

    if (removalConfirmation !== 'REMOVE') {
      setRemovalError('Type REMOVE exactly to confirm.');
      return;
    }

    setIsRemoving(true);

    try {
      await removeOrganisationAdmin(
        organisationId,
        selectedRemovalAdministrator.id,
        {
          password: removalPassword,
          confirmation: 'REMOVE',
        },
        token,
      );

      setShowBasicConfirmationModal(false);
      setSelectedRemovalAdministrator(null);
      setRemovalPassword('');
      setRemovalConfirmation('');

      await reloadOrganisationAdministrators();

      setFeedback({
        kind: 'success',
        message: 'Administrator privileges were removed successfully.',
      });
    } catch (error: unknown) {
      const errorCode = getMutationErrorCode(error);

      if (
        error instanceof ApiError &&
        error.status === 403 &&
        errorCode === 'ORG_ADMIN_PASSWORD_INVALID'
      ) {
        setRemovalPasswordError(getMutationErrorMessage(error, 'The password is incorrect.'));
        return;
      }

      if (error instanceof ApiError && error.status === 401) {
        setRemovalError('Your session could not be verified. Please try again.');
        return;
      }

      if (error instanceof ApiError && error.status === 403) {
        const message = getMutationErrorMessage(
          error,
          'You do not have permission to remove organisation administrators.',
        );

        setShowBasicConfirmationModal(false);
        setSelectedRemovalAdministrator(null);
        setRemovalPassword('');
        setRemovalConfirmation('');
        setRemovalError(null);
        setRemovalPasswordError(null);

        await reloadOrganisationAdministrators();

        setFeedback({
          kind: 'warning',
          message,
        });
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        const message = getMutationErrorMessage(
          error,
          'The selected administrator no longer exists.',
        );

        setShowBasicConfirmationModal(false);
        setSelectedRemovalAdministrator(null);
        setRemovalPassword('');
        setRemovalConfirmation('');
        setRemovalError(null);
        setRemovalPasswordError(null);

        await reloadOrganisationAdministrators();

        setFeedback({
          kind: 'warning',
          message,
        });
        return;
      }

      if (error instanceof ApiError && error.status === 409) {
        setRemovalError(
          getMutationErrorMessage(
            error,
            'This change conflicts with the current administrator data.',
          ),
        );
        await reloadOrganisationAdministrators();
        return;
      }

      const passwordError = getValidationDetail(error, 'password');
      const confirmationError = getValidationDetail(error, 'confirmation');

      if (passwordError) {
        setRemovalPasswordError(passwordError);
      }

      if (confirmationError) {
        setRemovalError(confirmationError);
      } else if (!passwordError) {
        setRemovalError(
          getMutationErrorMessage(error, 'Administrator privileges could not be removed.'),
        );
      }
    } finally {
      setIsRemoving(false);
    }
  };

  const closeEditPermissionsModal = () => {
    if (isUpdatingPermissions) {
      return;
    }

    setShowEditPermissionsModal(false);
    setSelectedAdministrator(null);
    setPermissionUpdateError(null);
  };

  const submitPromotion = async () => {
    if (!token || !organisationId || isPromoting) {
      return;
    }

    const traineeEmail = promotionEmail.trim();

    setPromotionEmailError(null);
    setPromotionError(null);
    setFeedback(null);

    if (!traineeEmail) {
      setPromotionEmailError('Trainee email is required.');
      return;
    }

    if (promotionPermissionKeys.length === 0) {
      setPromotionError('Select at least one permission.');
      return;
    }

    setIsPromoting(true);

    try {
      const response = await promoteOrganisationAdmin(
        organisationId,
        {
          traineeEmail,
          permissionKeys: promotionPermissionKeys,
        },
        token,
      );

      setShowOrganisationAdministratorModal(false);
      setPromotionEmail('');
      setPromotionPermissionKeys([]);

      await reloadOrganisationAdministrators();

      setFeedback({
        kind: response.emailQueued ? 'success' : 'warning',
        message: response.emailQueued
          ? 'The administrator invitation email was queued for delivery.'
          : 'The administrator invitation was created, but the email could not be queued.',
      });
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 403) {
        const message = getMutationErrorMessage(
          error,
          'You do not have permission to promote organisation administrators.',
        );

        setShowOrganisationAdministratorModal(false);
        setPromotionError(null);
        setPromotionEmailError(null);

        await reloadOrganisationAdministrators();

        setFeedback({
          kind: 'warning',
          message,
        });
        return;
      }

      if (error instanceof ApiError && error.status === 409) {
        setPromotionError(
          getMutationErrorMessage(
            error,
            'The promotion conflicts with the current administrator data.',
          ),
        );
        await reloadOrganisationAdministrators();
        return;
      }

      const emailError = getValidationDetail(error, 'traineeEmail');
      const permissionError = getValidationDetail(error, 'permissionKeys');

      if (emailError) {
        setPromotionEmailError(emailError);
      }

      setPromotionError(
        permissionError ||
          getMutationErrorMessage(error, 'The administrator invitation could not be created.'),
      );
    } finally {
      setIsPromoting(false);
    }
  };

  const submitPermissionUpdate = async () => {
    if (!token || !organisationId || !selectedAdministrator || isUpdatingPermissions) {
      return;
    }

    setPermissionUpdateError(null);
    setFeedback(null);

    if (permissionUpdateKeys.length === 0) {
      setPermissionUpdateError('Select at least one permission.');
      return;
    }

    setIsUpdatingPermissions(true);

    try {
      await updateOrganisationAdminPermissions(
        organisationId,
        selectedAdministrator.id,
        {
          permissionKeys: permissionUpdateKeys,
        },
        token,
      );

      setShowEditPermissionsModal(false);
      setSelectedAdministrator(null);

      await reloadOrganisationAdministrators();

      setFeedback({
        kind: 'success',
        message: 'Administrator permissions were updated successfully.',
      });
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 403) {
        const message = getMutationErrorMessage(
          error,
          'You do not have permission to change administrator permissions.',
        );

        setShowEditPermissionsModal(false);
        setSelectedAdministrator(null);
        setPermissionUpdateError(null);

        await reloadOrganisationAdministrators();

        setFeedback({
          kind: 'warning',
          message,
        });
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        const message = getMutationErrorMessage(
          error,
          'The selected administrator no longer exists.',
        );

        setShowEditPermissionsModal(false);
        setSelectedAdministrator(null);
        setPermissionUpdateError(null);

        await reloadOrganisationAdministrators();

        setFeedback({
          kind: 'warning',
          message,
        });
        return;
      }

      if (error instanceof ApiError && error.status === 409) {
        setPermissionUpdateError(
          getMutationErrorMessage(
            error,
            'The permission update conflicts with the current administrator data.',
          ),
        );
        await reloadOrganisationAdministrators();
        return;
      }

      const permissionError = getValidationDetail(error, 'permissionKeys');
      setPermissionUpdateError(
        permissionError ||
          getMutationErrorMessage(error, 'Administrator permissions could not be updated.'),
      );
    } finally {
      setIsUpdatingPermissions(false);
    }
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
              color: 'rgb(70, 0, 151)',
            }}
          >
            Organisation Administrators
          </h1>

          {/* SUB-HEADING */}
          <p className="font-regular tracking-wider text-[1.3rem] font-justify font-jost text-gray-500 mb-4">
            Manage organisation administrators and their permissions.
          </p>
        </div>

        {feedback && (
          <div
            role={feedback.kind === 'success' ? 'status' : 'alert'}
            className={`p-4 mb-6 border rounded-none font-jost text-[1.1rem] ${
              feedback.kind === 'success'
                ? 'text-green-800 bg-green-50 border-green-200'
                : 'text-amber-800 bg-amber-50 border-amber-200'
            }`}
          >
            {feedback.message}
          </div>
        )}

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
            <AdminTableContainer>
              <AdminTable aria-label="Organisation administrators">
                <tbody>
                  <AdminTableLoadingRow colSpan={5}>
                    Loading organisation administrators...
                  </AdminTableLoadingRow>
                </tbody>
              </AdminTable>
            </AdminTableContainer>
          )}

          {!isLoading && !loadError && (
            <>
              <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium mb-3">
                Organisation Administrators ({filteredOrganisationAdministrators.length})
              </h3>

              {/* TABLE */}
              <AdminTableContainer>
                <AdminTable>
                  <AdminTableHeader>
                    <tr>
                      <AdminTableHeaderCell>Full Name</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Email Address</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Permissions</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
                    </tr>
                  </AdminTableHeader>
                  <tbody className="font-overpass font-regular text-[1rem] tracking-wide">
                    {filteredOrganisationAdministrators.map((organisationAdministrator) => (
                      <tr
                        key={organisationAdministrator.id}
                        className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default"
                      >
                        {/* Full Name */}
                        <AdminTableCell>
                          <TruncatedValue
                            value={organisationAdministrator.fullName}
                            className="max-w-64"
                          />
                        </AdminTableCell>

                        {/* Email Address */}
                        <AdminTableCell>
                          <TruncatedValue value={organisationAdministrator.emailAddress} />
                        </AdminTableCell>

                        {/* Status */}
                        <AdminTableCell>
                          {getStatusBadge(organisationAdministrator.status)}
                        </AdminTableCell>

                        {/* Permissions */}
                        <AdminTableCell>
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
                              <span className="hover:underline font-medium text-dark-pink">
                                <strong>View Permissions</strong>
                              </span>
                            </button>
                          </Popover>
                        </AdminTableCell>

                        {/* Actions */}
                        <AdminTableCell>
                          <AdminTableActions className="flex-col items-start gap-1">
                            {organisationAdministrator.status === 'Active' &&
                              canChangeAdministratorPermissions && (
                                <button
                                  className="cursor-pointer font-medium text-purple hover:underline"
                                  type="button"
                                  onClick={() =>
                                    openEditPermissionsModal(organisationAdministrator)
                                  }
                                >
                                  <strong>Edit Permissions</strong>
                                </button>
                              )}

                            {organisationAdministrator.status === 'Active' &&
                              canRemoveAdministrators && (
                                <button
                                  className="cursor-pointer font-medium text-red-600 hover:underline"
                                  type="button"
                                  onClick={() =>
                                    openRemoveAdministratorModal(organisationAdministrator)
                                  }
                                >
                                  <strong>Remove</strong>
                                </button>
                              )}

                            {organisationAdministrator.status === 'Disabled' && (
                              <span aria-hidden="true">—</span>
                            )}

                            {organisationAdministrator.status === 'Active' &&
                              !canChangeAdministratorPermissions &&
                              !canRemoveAdministrators && <span aria-hidden="true">—</span>}
                          </AdminTableActions>
                        </AdminTableCell>
                      </tr>
                    ))}
                    {filteredOrganisationAdministrators.length === 0 && (
                      <AdminTableEmptyRow colSpan={5}>
                        No Organisation Administrators Found
                      </AdminTableEmptyRow>
                    )}
                  </tbody>
                </AdminTable>
              </AdminTableContainer>
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
          isConfirming={isRemoving}
          isConfirmDisabled={isRemoving}
          isDismissDisabled={isRemoving}
          errorMessage={removalError}
          passwordValue={removalPassword}
          onPasswordChange={(value) => {
            setRemovalPassword(value);
            setRemovalPasswordError(null);
          }}
          passwordError={removalPasswordError}
          confirmationValue={removalConfirmation}
          onConfirmationChange={(value) => {
            setRemovalConfirmation(value);
            setRemovalError(null);
          }}
          expectedConfirmationText="REMOVE"
          onConfirm={() => void submitAdministratorRemoval()}
          onCancel={closeOrganisationAdministratorPageConfirmationModal}
        />
      )}

      {/* REVIEW ORGANISATION REGISTRATION REQUEST MODAL  */}
      {showOrganisationAdministratorModal && (
        <InviteOrganisationAdministratorModal
          isOpen={showOrganisationAdministratorModal}
          onClose={closeOrganisationAdministratorModal}
          availablePermissions={currentAvailablePermissions}
          traineeEmail={promotionEmail}
          selectedPermissionKeys={promotionPermissionKeys}
          onEmailChange={(email) => {
            setPromotionEmail(email);
            setPromotionEmailError(null);
          }}
          onPermissionKeysChange={(keys) => {
            setPromotionPermissionKeys(keys);
            setPromotionError(null);
          }}
          onSubmit={() => void submitPromotion()}
          isSubmitting={isPromoting}
          errorMessage={promotionError}
          emailError={promotionEmailError}
        />
      )}

      {showEditPermissionsModal && selectedAdministrator && (
        <EditOrganisationAdministratorPermissionsModal
          isOpen={showEditPermissionsModal}
          onClose={closeEditPermissionsModal}
          administratorName={selectedAdministrator.fullName}
          administratorEmail={selectedAdministrator.emailAddress}
          availablePermissions={currentAvailablePermissions}
          selectedPermissionKeys={permissionUpdateKeys}
          onPermissionKeysChange={(keys) => {
            setPermissionUpdateKeys(keys);
            setPermissionUpdateError(null);
          }}
          onSubmit={() => void submitPermissionUpdate()}
          isSubmitting={isUpdatingPermissions}
          errorMessage={permissionUpdateError}
        />
      )}
    </AppLayout>
  );
}

export default OrganisationAdministratorsPage;
