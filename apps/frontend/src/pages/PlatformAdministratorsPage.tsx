import AppLayout from '../components/layout/AppLayout';
import { Dropdown, DropdownItem } from 'flowbite-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BasicConfirmationModal from '../components/layout/modals/BasicConfirmationModal';
import InvitePlatformAdministratorModal from '../components/layout/platform-administrators-page/InvitePlatformAdministratorModal';
import TransferSuperAdministratorRoleModal from '../components/layout/platform-administrators-page/TransferSuperAdministratorRoleModal';
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
import { useAuth } from '../context/useAuth';
import { ApiError } from '../lib/apiClient';
import type {
  PlatformAdminListItemDto,
  PlatformAdminListResponseDto,
  TransferSuperAdminRequestDto,
  DemotePlatformAdminRequestDto,
  InvitePlatformAdminResponseDto,
} from '@insightful-phish/shared';
import {
  getPlatformAdmins,
  resendPlatformAdminInvite,
  transferSuperAdmin,
  demotePlatformAdmin,
} from '../services/platform-admin.service';

type DisplayStatus =
  | 'Active'
  | 'Invited'
  | 'Failed invitation'
  | 'Disabled'
  | 'Pending upgrade'
  | 'Unknown status';

type DisplayRole = 'Super Administrator' | 'Administrator' | 'Unknown role';
type RoleFilter = 'All' | 'Super Administrator' | 'Administrator';
type StatusFilter = 'All' | DisplayStatus;

type DisplayAdministrator = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  platformAdminRole: string;
  role: DisplayRole;
  status: DisplayStatus;
  inviteId: string | null;
  allowedActions: PlatformAdminListItemDto['allowedActions'];
};

type SelectedActionTarget = {
  action: 'resend' | 'transfer' | 'demote';
  userId: string;
  inviteId: string | null;
  email: string;
  name: string;
};

function isRecognisedPlatformAdminRole(platformAdminRole: string): boolean {
  return platformAdminRole === 'SUPER_ADMIN' || platformAdminRole === 'NORMAL_ADMIN';
}

function getDisplayRole(platformAdminRole: string): DisplayRole {
  if (platformAdminRole === 'SUPER_ADMIN') {
    return 'Super Administrator';
  }

  if (platformAdminRole === 'NORMAL_ADMIN') {
    return 'Administrator';
  }

  return 'Unknown role';
}

function getDisplayStatus(administrator: PlatformAdminListItemDto): DisplayStatus {
  if (administrator.adminStatus === 'DISABLED') {
    return 'Disabled';
  }

  if (administrator.adminStatus !== 'ACTIVE') {
    return 'Unknown status';
  }

  if (
    administrator.authStatus === 'ACTIVE' &&
    administrator.invitationStatus === 'PENDING_UPGRADE'
  ) {
    return 'Pending upgrade';
  }

  if (
    administrator.invitationStatus === 'FAILED_TO_SEND' &&
    (administrator.authStatus === 'ACTIVE' || administrator.authStatus === 'PENDING_INVITE_SETUP')
  ) {
    return 'Failed invitation';
  }

  if (
    administrator.authStatus === 'PENDING_INVITE_SETUP' &&
    (administrator.invitationStatus === 'PENDING' || administrator.invitationStatus === 'SENT')
  ) {
    return 'Invited';
  }

  if (administrator.authStatus === 'ACTIVE' && administrator.invitationStatus === null) {
    return 'Active';
  }

  return 'Unknown status';
}

function toDisplayAdministrator(administrator: PlatformAdminListItemDto): DisplayAdministrator {
  const firstName = administrator.firstName.trim();
  const lastName = administrator.lastName.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  return {
    id: administrator.id,
    firstName,
    lastName,
    fullName: fullName || 'Not provided',
    email: administrator.email,
    platformAdminRole: administrator.platformAdminRole,
    role: getDisplayRole(administrator.platformAdminRole),
    status: getDisplayStatus(administrator),
    inviteId: administrator.inviteId,
    allowedActions: administrator.allowedActions,
  };
}

function getResendErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Unable to connect to the server. Please try again.';
  if (error.status >= 500) return 'The server could not resend this invitation. Please try again.';
  return error.message.trim() || 'The invitation could not be resent. Please try again.';
}

function StatusBadge({ status }: Readonly<{ status: DisplayStatus }>) {
  const variants: Record<DisplayStatus, string> = {
    Active: 'ring-success-subtle text-fg-success-strong bg-success-soft',
    Invited: 'ring-brand-subtle text-fg-brand-strong bg-brand-softer',
    'Failed invitation': 'ring-danger-subtle text-fg-danger-strong bg-danger-soft',
    Disabled: 'ring-default-medium text-heading bg-neutral-secondary-medium',
    'Pending upgrade': 'ring-brand-subtle text-fg-brand-strong bg-brand-softer',
    'Unknown status': 'ring-default-medium text-heading bg-neutral-secondary-medium',
  };

  return (
    <span
      className={`inline-flex min-w-28 justify-center items-center px-4 py-1 pt-[0.4rem] ring-1 ring-inset text-sm font-medium ${variants[status]}`}
    >
      {status}
    </span>
  );
}

function PlatformAdministratorsPage() {
  const { token, authContext, refreshAuthContext, clearAuth } = useAuth();
  const requestIdRef = useRef(0);
  const modalOpenerRef = useRef<HTMLButtonElement | null>(null);
  const pageHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const [platformAdminResponse, setPlatformAdminResponse] =
    useState<PlatformAdminListResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [hasLoadError, setHasLoadError] = useState(false);

  const [showBasicConfirmationModal, setShowBasicConfirmationModal] = useState(false);
  const [confirmationTitle, setConfirmationTitle] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [confirmationButtonText, setConfirmationButtonText] = useState('');
  const [confirmationVariant, setConfirmationVariant] = useState<'danger' | 'success' | 'default'>(
    'default',
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All');

  const [selectedActionTarget, setSelectedActionTarget] = useState<SelectedActionTarget | null>(
    null,
  );
  const [isResendingInvite, setIsResendingInvite] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [showPlatformAdministratorModal, setShowPlatformAdministratorModal] = useState(false);
  const [platformAdminFeedback, setPlatformAdminFeedback] = useState<string | null>(null);
  const [showTransferSuperAdminModal, setShowTransferSuperAdminModal] = useState(false);
  const [transferPassword, setTransferPassword] = useState('');
  const [transferConfirmation, setTransferConfirmation] = useState('');
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferPasswordError, setTransferPasswordError] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isRefreshingAfterTransfer, setIsRefreshingAfterTransfer] = useState(false);
  const [demotePassword, setDemotePassword] = useState('');
  const [demoteConfirmation, setDemoteConfirmation] = useState('');
  const [demoteError, setDemoteError] = useState<string | null>(null);
  const [demotePasswordError, setDemotePasswordError] = useState<string | null>(null);
  const [isDemoting, setIsDemoting] = useState(false);

  // BOOLEAN FLAGS FOR ROLES
  const isSuperAdministrator = authContext?.platformAdminRole === 'SUPER_ADMIN';

  const managementActionsLocked = isRefreshingAfterTransfer;

  const canInvite =
    !managementActionsLocked &&
    isSuperAdministrator &&
    platformAdminResponse?.allowedToInvite === true;
  const canResendInvites =
    !managementActionsLocked &&
    isSuperAdministrator &&
    platformAdminResponse?.allowedToResendInvites === true;
  const canTransfer =
    !managementActionsLocked &&
    isSuperAdministrator &&
    platformAdminResponse?.allowedToTransfer === true;
  const canDemote =
    !managementActionsLocked &&
    isSuperAdministrator &&
    platformAdminResponse?.allowedToDemote === true;

  const reloadPlatformAdministrators = useCallback(async () => {
    if (!token) {
      setPlatformAdminResponse(null);
      setIsLoading(false);
      setHasLoadError(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setHasLoadError(false);

    try {
      const response = await getPlatformAdmins(token);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setPlatformAdminResponse(response);
    } catch {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setPlatformAdminResponse(null);
      setHasLoadError(true);
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    let isCurrent = true;

    queueMicrotask(() => {
      if (isCurrent) {
        void reloadPlatformAdministrators();
      }
    });

    return () => {
      isCurrent = false;
      requestIdRef.current += 1;
    };
  }, [reloadPlatformAdministrators]);

  const displayAdministrators = useMemo(
    () => (platformAdminResponse?.admins ?? []).map(toDisplayAdministrator),
    [platformAdminResponse],
  );

  const filteredPlatformAdministrators = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return displayAdministrators.filter((administrator) => {
      const matchesSearch =
        !search ||
        [
          administrator.firstName,
          administrator.lastName,
          administrator.fullName,
          administrator.email,
        ]
          .join(' ')
          .toLowerCase()
          .includes(search);

      const matchesStatus = statusFilter === 'All' || administrator.status === statusFilter;

      const matchesRole = roleFilter === 'All' || administrator.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [displayAdministrators, roleFilter, searchTerm, statusFilter]);

  const hasActiveSearchOrFilter =
    searchTerm.trim().length > 0 || roleFilter !== 'All' || statusFilter !== 'All';

  const emptyMessage =
    platformAdminResponse?.admins.length === 0 && !hasActiveSearchOrFilter
      ? 'No platform administrators have been added.'
      : 'No platform administrators match your search or filters.';

  const restoreModalFocus = () => {
    const opener = modalOpenerRef.current;
    modalOpenerRef.current = null;

    queueMicrotask(() => {
      if (opener?.isConnected) opener.focus();
      else pageHeadingRef.current?.focus();
    });
  };

  const openPlatformAdministratorModal = (opener: HTMLButtonElement) => {
    modalOpenerRef.current = opener;
    setPlatformAdminFeedback(null);
    setShowPlatformAdministratorModal(true);
  };

  const closePlatformAdministratorModal = () => {
    setShowPlatformAdministratorModal(false);
    restoreModalFocus();
  };

  const handleInvitationSuccess = async (response: InvitePlatformAdminResponseDto) => {
    await reloadPlatformAdministrators();
    setPlatformAdminFeedback(
      response.type === 'new-invite'
        ? `Invitation created for ${response.email}.`
        : `Upgrade confirmation created for ${response.email}.`,
    );
  };

  const resetTransferWorkflow = () => {
    setShowTransferSuperAdminModal(false);
    setSelectedActionTarget(null);
    setTransferPassword('');
    setTransferConfirmation('');
    setTransferError(null);
    setTransferPasswordError(null);
    restoreModalFocus();
  };

  const closeTranserSuperAdministratorModal = () => {
    if (isTransferring) return;
    resetTransferWorkflow();
  };

  const resetDemotionWorkFlow = () => {
    setShowBasicConfirmationModal(false);
    setSelectedActionTarget(null);
    setDemotePassword('');
    setDemoteConfirmation('');
    setDemoteError(null);
    setDemotePasswordError(null);
    restoreModalFocus();
  };

  const confirmBasicConfirmation = () => {
    if (selectedActionTarget?.action === 'resend') {
      void confirmResendInvitation();
      return;
    }
    if (selectedActionTarget?.action === 'demote') {
      void confirmDemoteAdministrator();
      return;
    }
    setShowBasicConfirmationModal(false);
    setSelectedActionTarget(null);
  };

  const confirmTransferSuperAdminRole = async () => {
    if (!token || isTransferring || selectedActionTarget?.action !== 'transfer') {
      return;
    }

    setTransferError(null);
    setTransferPasswordError(null);
    setPlatformAdminFeedback(null);

    if (!transferPassword) {
      setTransferPasswordError('Password is required.');
      return;
    }

    if (transferConfirmation !== 'TRANSFER') {
      setTransferError('Type TRANSFER exactly to confirm.');
      return;
    }

    const target = selectedActionTarget;
    const input: TransferSuperAdminRequestDto = {
      targetUserId: target.userId,
      password: transferPassword,
      confirmation: 'TRANSFER',
    };

    setIsTransferring(true);

    try {
      await transferSuperAdmin(input, token);
    } catch (error: unknown) {
      const errorCode =
        error instanceof ApiError &&
        error.body &&
        typeof error.body === 'object' &&
        'error' in error.body &&
        typeof error.body.error === 'string'
          ? error.body.error
          : null;

      if (
        error instanceof ApiError &&
        error.status === 403 &&
        errorCode === 'PLATFORM_ADMIN_PASSWORD_INVALID'
      ) {
        setTransferPasswordError(error.message.trim() || 'The password is incorrect.');
      } else {
        setTransferError(
          error instanceof ApiError && error.status < 500
            ? error.message.trim() || 'The role could not be transferred.'
            : 'The role could not be transferred. Please try again.',
        );

        if (
          error instanceof ApiError &&
          error.status === 409 &&
          errorCode === 'STALE_SUPER_ADMIN_TRANSFER'
        ) {
          await reloadPlatformAdministrators();
        }
      }

      setIsTransferring(false);
      return;
    }

    setIsRefreshingAfterTransfer(true);

    try {
      await refreshAuthContext();
    } catch {
      resetTransferWorkflow();
      setIsRefreshingAfterTransfer(false);
      setIsTransferring(false);
      setPlatformAdminFeedback(
        'Super administrator role was transferred, but current access could not be refreshed. Please sign in again.',
      );
      clearAuth();
      return;
    }

    await reloadPlatformAdministrators();

    resetTransferWorkflow();
    setIsRefreshingAfterTransfer(false);
    setIsTransferring(false);
    setPlatformAdminFeedback(`Super administrator role transferred to ${target.name}.`);
  };

  const closePlatformAdministratorPageConfirmationModal = () => {
    if (isResendingInvite || isDemoting) return;

    setShowBasicConfirmationModal(false);
    setSelectedActionTarget(null);
    setResendError(null);
    setIsResendingInvite(false);
    setDemotePassword('');
    setDemoteConfirmation('');
    setDemoteError(null);
    setDemotePasswordError(null);
    restoreModalFocus();
  };

  const canResendAdministratorInvite = (administrator: DisplayAdministrator) =>
    isRecognisedPlatformAdminRole(administrator.platformAdminRole) &&
    administrator.status !== 'Unknown status' &&
    canResendInvites &&
    administrator.allowedActions.canResendInvite &&
    administrator.inviteId !== null;

  const canTransferToAdministrator = (administrator: DisplayAdministrator) =>
    isRecognisedPlatformAdminRole(administrator.platformAdminRole) &&
    administrator.status !== 'Unknown status' &&
    canTransfer &&
    administrator.allowedActions.canTransferSuperAdmin;

  const canDemoteAdministrator = (administrator: DisplayAdministrator) =>
    isRecognisedPlatformAdminRole(administrator.platformAdminRole) &&
    administrator.status !== 'Unknown status' &&
    canDemote &&
    administrator.allowedActions.canDemote;

  const administratorHasAction = (administrator: DisplayAdministrator) =>
    canResendAdministratorInvite(administrator) ||
    canTransferToAdministrator(administrator) ||
    canDemoteAdministrator(administrator);

  const showActionsColumn = filteredPlatformAdministrators.some(administratorHasAction);

  const openResendInvitationModal = (
    administrator: DisplayAdministrator,
    opener: HTMLButtonElement,
  ) => {
    if (!canResendAdministratorInvite(administrator)) {
      return;
    }
    modalOpenerRef.current = opener;
    setPlatformAdminFeedback(null);
    setResendError(null);

    setSelectedActionTarget({
      action: 'resend',
      userId: administrator.id,
      inviteId: administrator.inviteId,
      email: administrator.email,
      name: administrator.fullName,
    });
    setConfirmationTitle('Resend invitation');
    setConfirmationMessage(
      `Send a new invitation link to ${administrator.email}? The previous link will no longer be valid.`,
    );
    setConfirmationButtonText('Resend invitation');
    setConfirmationVariant('default');
    setShowBasicConfirmationModal(true);
  };

  const confirmResendInvitation = async () => {
    if (
      !token ||
      isResendingInvite ||
      selectedActionTarget?.action !== 'resend' ||
      !selectedActionTarget.inviteId
    ) {
      return;
    }

    const { inviteId, email } = selectedActionTarget;
    setResendError(null);
    setIsResendingInvite(true);

    try {
      const response = await resendPlatformAdminInvite(inviteId, token);
      setShowBasicConfirmationModal(false);
      setSelectedActionTarget(null);
      setResendError(null);

      await reloadPlatformAdministrators();
      setPlatformAdminFeedback(
        response.emailQueued
          ? `A new invitation was queued for ${email}.`
          : `A new invitation was created for ${email}, but the email could not be queued.`,
      );
      restoreModalFocus();
    } catch (error: unknown) {
      setResendError(getResendErrorMessage(error));

      if (error instanceof ApiError && (error.status === 404 || error.status === 409)) {
        await reloadPlatformAdministrators();
      }
    } finally {
      setIsResendingInvite(false);
    }
  };

  const confirmDemoteAdministrator = async () => {
    if (!token || isDemoting || selectedActionTarget?.action !== 'demote') {
      return;
    }

    setDemoteError(null);
    setDemotePasswordError(null);
    setPlatformAdminFeedback(null);

    if (!demotePassword) {
      setDemotePasswordError('Password is required.');
      return;
    }

    if (demoteConfirmation !== 'DEMOTE') {
      setDemoteError('Type DEMOTE exactly to confirm.');
      return;
    }

    const target = selectedActionTarget;
    const input: DemotePlatformAdminRequestDto = {
      password: demotePassword,
      confirmation: 'DEMOTE',
    };

    setIsDemoting(true);

    try {
      await demotePlatformAdmin(target.userId, input, token);
    } catch (error: unknown) {
      const errorCode =
        error instanceof ApiError &&
        error.body &&
        typeof error.body === 'object' &&
        'error' in error.body &&
        typeof error.body.error === 'string'
          ? error.body.error
          : null;

      if (
        error instanceof ApiError &&
        error.status === 403 &&
        errorCode === 'PLATFORM_ADMIN_PASSWORD_INVALID'
      ) {
        setDemotePasswordError(error.message.trim() || 'The password is incorrect.');
      } else {
        setDemoteError(
          error instanceof ApiError && error.status < 500
            ? error.message.trim() || 'The administrator could not be demoted.'
            : 'The administrator could not be demoted. Please try again.',
        );

        if (
          error instanceof ApiError &&
          ((error.status === 404 && errorCode === 'PLATFORM_ADMIN_NOT_FOUND') ||
            (error.status === 409 &&
              (errorCode === 'SELF_DEMOTION_CONFLICT' ||
                errorCode === 'SUPER_ADMIN_DEMOTION_BLOCKED' ||
                errorCode === 'PLATFORM_ADMIN_ALREADY_DEMOTED')))
        ) {
          await reloadPlatformAdministrators();
        }
      }

      setIsDemoting(false);
      return;
    }

    await reloadPlatformAdministrators();

    resetDemotionWorkFlow();
    setIsDemoting(false);
    setPlatformAdminFeedback(`${target.name} is no longer a platform administrator.`);
  };

  const openTransferSuperAdministratorModal = (
    administrator: DisplayAdministrator,
    opener: HTMLButtonElement,
  ) => {
    if (!canTransferToAdministrator(administrator)) {
      return;
    }
    modalOpenerRef.current = opener;

    setPlatformAdminFeedback(null);
    setTransferPassword('');
    setTransferConfirmation('');
    setTransferError(null);
    setTransferPasswordError(null);

    setSelectedActionTarget({
      action: 'transfer',
      userId: administrator.id,
      inviteId: null,
      email: administrator.email,
      name: administrator.fullName,
    });
    setShowTransferSuperAdminModal(true);
  };

  const openDemoteAdministratorModal = (
    administrator: DisplayAdministrator,
    opener: HTMLButtonElement,
  ) => {
    if (!canDemoteAdministrator(administrator)) {
      return;
    }
    modalOpenerRef.current = opener;

    setPlatformAdminFeedback(null);
    setDemotePassword('');
    setDemoteConfirmation('');
    setDemoteError(null);
    setDemotePasswordError(null);

    setSelectedActionTarget({
      action: 'demote',
      userId: administrator.id,
      inviteId: null,
      email: administrator.email,
      name: administrator.fullName,
    });
    setConfirmationTitle('Demote administrator');
    setConfirmationMessage(
      `Remove platform administrator privileges from ${administrator.fullName} (${administrator.email})? Their active sessions will be revoked.`,
    );
    setConfirmationButtonText('Demote administrator');
    setConfirmationVariant('danger');
    setShowBasicConfirmationModal(true);
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
            ref={pageHeadingRef}
            tabIndex={-1}
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
            Platform Administrators
          </h1>

          <p className="font-regular tracking-wider text-[1.3rem] font-justify font-jost text-gray-500 mb-4">
            {isSuperAdministrator ? (
              <>
                View, invite, and manage <em>Insightful Phish</em> platform administrators.
              </>
            ) : (
              <>
                View <em>Insightful Phish</em> platform administrators.
              </>
            )}
          </p>

          {/* DISPLAY THIS HEADING IF THEY ARE NOT A SUPER-ADMIN */}
          {/* <p className="font-regular tracking-wider text-[1.3rem] font-justify font-jost text-gray-500 mb-4">
            View <em>Insightful Phish</em> platform administrators.
          </p> */}
        </div>

        {platformAdminFeedback && (
          <div
            role="status"
            className="mx-6 p-4 mb-6 border font-jost text-[1.1rem] text-green-800 bg-green-50 border-green-200"
          >
            {platformAdminFeedback}
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
                    <label htmlFor="simple-search-platform-admin-page" className="sr-only">
                      Search Administrators
                    </label>
                    <div className="relative w-full">
                      <AdminPagesSearchSVG />
                      {/* Search Input */}
                      <input
                        type="text"
                        id="simple-search-platform-admin-page"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="font-jost tracking-wide block w-full p-2 pl-10 text-[1.1rem] h-[2.55rem] text-black border border-gray-300 bg-white focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Search Platform Administrators"
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
                          All statuses
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setStatusFilter('Active')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Active
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setStatusFilter('Invited')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Invited
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setStatusFilter('Failed invitation')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Failed invitation
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setStatusFilter('Disabled')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Disabled
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setStatusFilter('Pending upgrade')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Pending upgrade
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => setStatusFilter('Unknown status')}
                          className="font-jost text-gray-600 text-[1.1rem]"
                        >
                          Unknown status
                        </DropdownItem>
                      </Dropdown>
                    </div>
                  </div>
                </div>
                {/* ==== FILTERS ==== */}

                {/* Add (Invite) Platform Administrator Button */}
                {/* ONLY SHOW IF SUPER ADMIN */}
                {canInvite && (
                  <button
                    type="button"
                    onClick={(event) => openPlatformAdministratorModal(event.currentTarget)}
                    className="cursor-pointer px-4 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-[0.425rem] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-sharp">add_2</span>
                    <span className="whitespace-nowrap">Invite platform administrator</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium mb-3">
            Platform Administrators ({filteredPlatformAdministrators.length})
          </h3>

          {hasLoadError ? (
            <div className="py-8 text-center font-jost text-[1.2rem] tracking-wider">
              <p>Platform administrators could not be loaded. Try again.</p>
              <button
                type="button"
                onClick={() => void reloadPlatformAdministrators()}
                className="mt-3 cursor-pointer bg-main-purple px-4 py-2 text-white hover:bg-hover-purple"
              >
                Retry
              </button>
            </div>
          ) : (
            <AdminTableContainer>
              <AdminTable>
                {/* Table Headings  */}
                <AdminTableHeader>
                  <tr>
                    <AdminTableHeaderCell>Administrator</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Email</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Role</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                    {showActionsColumn && <AdminTableHeaderCell>Actions</AdminTableHeaderCell>}
                  </tr>
                </AdminTableHeader>
                {/* Table Content */}
                <tbody className="font-overpass font-regular text-[1rem] tracking-wide">
                  {isLoading && (
                    <AdminTableLoadingRow colSpan={showActionsColumn ? 5 : 4}>
                      Loading platform administrators…
                    </AdminTableLoadingRow>
                  )}
                  {!isLoading &&
                    filteredPlatformAdministrators.map((platformAdministrator) => (
                      <tr
                        key={platformAdministrator.id}
                        className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default"
                      >
                        {/* Full Name */}
                        <AdminTableCell>
                          <TruncatedValue
                            value={platformAdministrator.fullName}
                            className="max-w-64"
                          />
                        </AdminTableCell>

                        {/* Email Address */}
                        <AdminTableCell>
                          <TruncatedValue value={platformAdministrator.email} />
                        </AdminTableCell>

                        {/* Role */}
                        <AdminTableCell>{platformAdministrator.role}</AdminTableCell>

                        {/* Status */}
                        <AdminTableCell>
                          <StatusBadge status={platformAdministrator.status} />
                        </AdminTableCell>

                        {showActionsColumn && (
                          <AdminTableCell>
                            <AdminTableActions className="flex-col items-start gap-1">
                              {canResendAdministratorInvite(platformAdministrator) && (
                                <button
                                  type="button"
                                  onClick={(event) =>
                                    openResendInvitationModal(
                                      platformAdministrator,
                                      event.currentTarget,
                                    )
                                  }
                                  className="cursor-pointer font-medium text-purple hover:underline"
                                >
                                  Resend invitation
                                </button>
                              )}

                              {canTransferToAdministrator(platformAdministrator) && (
                                <button
                                  type="button"
                                  onClick={(event) =>
                                    openTransferSuperAdministratorModal(
                                      platformAdministrator,
                                      event.currentTarget,
                                    )
                                  }
                                  className="cursor-pointer font-medium text-purple hover:underline"
                                >
                                  Transfer super administrator role
                                </button>
                              )}

                              {canDemoteAdministrator(platformAdministrator) && (
                                <button
                                  type="button"
                                  onClick={(event) =>
                                    openDemoteAdministratorModal(
                                      platformAdministrator,
                                      event.currentTarget,
                                    )
                                  }
                                  className="cursor-pointer font-medium text-red-600 hover:underline"
                                >
                                  Demote administrator
                                </button>
                              )}
                            </AdminTableActions>
                          </AdminTableCell>
                        )}
                      </tr>
                    ))}

                  {/* Empty Table Message */}
                  {!isLoading && filteredPlatformAdministrators.length === 0 && (
                    <AdminTableEmptyRow colSpan={showActionsColumn ? 5 : 4}>
                      {emptyMessage}
                    </AdminTableEmptyRow>
                  )}
                </tbody>
              </AdminTable>
            </AdminTableContainer>
          )}
        </div>
      </div>

      {/* BASIC CONFIRMATION MODAL */}
      {showBasicConfirmationModal &&
        selectedActionTarget !== null &&
        selectedActionTarget.action !== 'transfer' && (
          <BasicConfirmationModal
            title={confirmationTitle}
            message={confirmationMessage}
            confirmButtonText={confirmationButtonText}
            confirmButtonVariant={confirmationVariant}
            appendQuestionMark={
              selectedActionTarget.action !== 'resend' && selectedActionTarget.action !== 'demote'
            }
            isConfirming={selectedActionTarget.action === 'demote' ? isDemoting : isResendingInvite}
            isConfirmDisabled={
              selectedActionTarget.action === 'demote'
                ? isDemoting || !demotePassword || demoteConfirmation !== 'DEMOTE'
                : isResendingInvite
            }
            isDismissDisabled={
              selectedActionTarget.action === 'demote' ? isDemoting : isResendingInvite
            }
            errorMessage={selectedActionTarget.action === 'demote' ? demoteError : resendError}
            passwordValue={selectedActionTarget.action === 'demote' ? demotePassword : undefined}
            onPasswordChange={
              selectedActionTarget.action === 'demote'
                ? (value) => {
                    setDemotePassword(value);
                    setDemotePasswordError(null);
                  }
                : undefined
            }
            passwordError={selectedActionTarget.action === 'demote' ? demotePasswordError : null}
            confirmationValue={
              selectedActionTarget.action === 'demote' ? demoteConfirmation : undefined
            }
            onConfirmationChange={
              selectedActionTarget.action === 'demote'
                ? (value) => {
                    setDemoteConfirmation(value);
                    setDemoteError(null);
                  }
                : undefined
            }
            expectedConfirmationText={
              selectedActionTarget.action === 'demote' ? 'DEMOTE' : undefined
            }
            onConfirm={confirmBasicConfirmation}
            onCancel={closePlatformAdministratorPageConfirmationModal}
          ></BasicConfirmationModal>
        )}

      {showPlatformAdministratorModal && token && (
        <InvitePlatformAdministratorModal
          isOpen={showPlatformAdministratorModal}
          token={token}
          onClose={closePlatformAdministratorModal}
          onSuccess={handleInvitationSuccess}
        ></InvitePlatformAdministratorModal>
      )}

      {showTransferSuperAdminModal && selectedActionTarget?.action === 'transfer' && (
        <TransferSuperAdministratorRoleModal
          isOpen={showTransferSuperAdminModal}
          targetName={selectedActionTarget.name}
          targetEmail={selectedActionTarget.email}
          password={transferPassword}
          confirmation={transferConfirmation}
          errorMessage={transferError}
          passwordError={transferPasswordError}
          isSubmitting={isTransferring}
          onPasswordChange={(value) => {
            setTransferPassword(value);
            setTransferPasswordError(null);
          }}
          onConfirmationChange={(value) => {
            setTransferConfirmation(value);
            setTransferError(null);
          }}
          onConfirm={confirmTransferSuperAdminRole}
          onClose={() => closeTranserSuperAdministratorModal()}
        ></TransferSuperAdministratorRoleModal>
      )}
    </AppLayout>
  );
}

export default PlatformAdministratorsPage;
