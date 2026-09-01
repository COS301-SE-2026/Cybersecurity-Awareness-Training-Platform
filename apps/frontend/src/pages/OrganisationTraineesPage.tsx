import AppLayout from '../components/layout/AppLayout';
import { Dropdown, DropdownItem } from 'flowbite-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InviteTraineeModal from '../components/layout/modals/InviteTraineeModal';
import BasicConfirmationModal from '../components/layout/modals/BasicConfirmationModal';
import DisableTraineeModal from '../components/layout/modals/DisableTraineeModal';
import {
  createTraineeInvitationRequestSchema,
  disableTraineeRequestSchema,
  type CreateTraineeInvitationRequestDto,
  type DisableTraineeRequestDto,
  type TraineeListItemDto,
} from '@insightful-phish/shared';
import { ApiError } from '../lib/apiClient';
import { useAuth } from '../context/useAuth';
import {
  createOrganisationTraineeInvitation,
  getOrganisationTrainees,
  resendOrganisationTraineeInvitation,
  revokeOrganisationTraineeInvitation,
  disableOrganisationTrainee,
} from '../services/organisation-trainee.service';
import { Navigate } from 'react-router-dom';
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

type ActiveTraineeRow = Extract<TraineeListItemDto, { rowType: 'ACTIVE_TRAINEE' }>;
type InvitationTraineeRow = Extract<TraineeListItemDto, { rowType: 'INVITATION' }>;

type DisplayStatus =
  | 'Active'
  | 'Disabled'
  | 'Invited'
  | 'Failed to Send'
  | 'Accepted'
  | 'Completed'
  | 'Expired'
  | 'Revoked'
  | 'Rejected'
  | 'Unknown';

type TraineeDisplayRow = {
  source: TraineeListItemDto;
  fullName: string;
  emailAddress: string;
  status: DisplayStatus;
};

type ListResultState = {
  organisationId: string | null;
  rows: TraineeListItemDto[];
  errorMessage: string | null;
};

type TraineeReloadResult = 'applied' | 'failed' | 'stale';

type InviteField = 'email' | 'firstName' | 'lastName';

type InviteValues = Record<InviteField, string>;

type InviteFieldErrors = Partial<Record<InviteField, string>>;

type InviteModalTarget = {
  organisationId: string;
  token: string;
};

type InviteRequestOwner = {
  requestId: number;
  organisationId: string;
  token: string;
};

type InviteSuccessState = {
  target: InviteModalTarget;
  message: string;
};

type InviteErrorBody = {
  error?: unknown;
  message?: unknown;
  details?: unknown;
};

type InvitationActionType = 'resend' | 'revoke';

type InvitationActionPhase =
  | 'confirming'
  | 'pending'
  | 'reconciling'
  | 'completed-refresh-failed'
  | 'conflict-refresh-failed';

type InvitationActionTarget = {
  actionType: InvitationActionType;
  invitationId: string;
  organisationId: string;
  token: string;
  email: string;
};

type InvitationActionState = InvitationActionTarget & {
  phase: InvitationActionPhase;
  errorMessage: string | null;
};

type InvitationActionRequestOwner = InvitationActionTarget & {
  requestId: number;
};

type InvitationActionFeedback = {
  organisationId: string;
  token: string;
  variant: 'success' | 'error' | 'warning';
  message: string;
};

type InvitationActionsUnavailableTarget = {
  organisationId: string;
  token: string;
  reason: 'permission-denied' | 'refresh-failed';
};

type InvitationActionErrorBody = {
  error?: unknown;
  message?: unknown;
};

type ValidationIssue = {
  path: ReadonlyArray<string | number>;
  message: string;
};

type BackendValidationDetail = {
  field: string;
  message: string;
};

type DisableDialogState = {
  traineeId: string;
  organisationId: string;
  token: string;
  displayName: string;
  email: string;
  password: string;
  passwordError: string | null;
  generalError: string | null;
  isSubmitting: boolean;
};

type DisableFeedback = {
  organisationId: string;
  token: string;
  variant: 'success' | 'warning' | 'error';
  message: string;
};

type DisableActionsUnavailableTarget = {
  organisationId: string;
  token: string;
  reason: 'permission-denied' | 'refresh-failed';
};

function disableTargetMatchesContext(
  target: Pick<DisableDialogState, 'organisationId' | 'token'> | null,
  organisationId: string | null,
  token: string | null,
): boolean {
  return (
    target !== null &&
    organisationId !== null &&
    token !== null &&
    target.organisationId === organisationId &&
    target.token === token
  );
}

function disableActionsUnavailableForContext(
  target: DisableActionsUnavailableTarget | null,
  organisationId: string | null,
  token: string | null,
): boolean {
  return (
    target !== null &&
    organisationId !== null &&
    token !== null &&
    target.organisationId === organisationId &&
    target.token === token
  );
}

function getDisableErrorBody(error: ApiError): InviteErrorBody | null {
  if (!error.body || typeof error.body !== 'object') {
    return null;
  }

  return error.body as InviteErrorBody;
}

function getDisableErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Unable to connect to the server while disabling the trainee.';
  }

  const body = getDisableErrorBody(error);
  const bodyMessage =
    typeof body?.message === 'string' && body.message.trim() ? body.message : null;

  if (error.status === 401) {
    return bodyMessage || 'Your session is no longer authorised. Please sign in again.';
  }

  if (error.status === 403) {
    return bodyMessage || 'You do not have permission to disable organisation trainees.';
  }

  if (error.status === 404) {
    return 'This trainee is no longer available. The trainee list is being refreshed.';
  }

  if (error.status === 409) {
    return 'The trainee state changed before this action completed. The trainee list is being refreshed.';
  }

  if (error.status === 429) {
    return bodyMessage || 'Too many trainee-management requests. Please try again later.';
  }

  if (error.status >= 500) {
    return 'The server could not disable the trainee. Please try again later.';
  }

  return bodyMessage || 'The trainee could not be disabled.';
}

const EMPTY_INVITE_VALUES: InviteValues = {
  email: '',
  firstName: '',
  lastName: '',
};

function inviteTargetsMatch(
  left: InviteModalTarget | null,
  right: InviteModalTarget | null,
): boolean {
  return (
    left !== null &&
    right !== null &&
    left.organisationId === right.organisationId &&
    left.token === right.token
  );
}

function actionTargetsMatch(
  left: InvitationActionTarget | null,
  right: InvitationActionTarget | null,
): boolean {
  return (
    left !== null &&
    right !== null &&
    left.actionType === right.actionType &&
    left.invitationId === right.invitationId &&
    left.organisationId === right.organisationId &&
    left.token === right.token
  );
}

function actionBelongsToContext(
  action: Pick<InvitationActionTarget, 'organisationId' | 'token'> | null,
  organisationId: string | null,
  token: string | null,
): boolean {
  return (
    action !== null &&
    organisationId !== null &&
    token !== null &&
    action.organisationId === organisationId &&
    action.token === token
  );
}

function invitationActionsUnavailableForContext(
  target: InvitationActionsUnavailableTarget | null,
  organisationId: string | null,
  token: string | null,
): boolean {
  return (
    target !== null &&
    organisationId !== null &&
    token !== null &&
    target.organisationId === organisationId &&
    target.token === token
  );
}

function getInvitationActionErrorBody(error: ApiError): InvitationActionErrorBody | null {
  if (!error.body || typeof error.body !== 'object') {
    return null;
  }

  return error.body as InvitationActionErrorBody;
}

function getInvitationActionErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Unable to connect to the server. Please check your connection and try again.';
  }

  const body = getInvitationActionErrorBody(error);
  const bodyMessage =
    typeof body?.message === 'string' && body.message.trim() ? body.message : null;

  if (error.status === 401) {
    return bodyMessage || 'Your session is no longer authorised. Please sign in again.';
  }

  if (error.status === 403) {
    return bodyMessage || 'You do not have permission to manage trainee invitations.';
  }

  if (error.status === 404) {
    return 'This invitation is no longer available. The trainee list is being refreshed.';
  }

  if (error.status === 409) {
    return 'The invitation changed before this action completed. The trainee list is being refreshed.';
  }

  if (error.status === 429) {
    return bodyMessage || 'Too many trainee-management requests. Please try again later.';
  }

  if (error.status >= 500) {
    return 'The server could not complete the invitation action. Please try again later.';
  }

  return bodyMessage || 'The invitation action could not be completed.';
}

function getActiveTraineeDisplayStatus(row: ActiveTraineeRow): DisplayStatus {
  if (row.status === 'ACTIVE') return 'Active';
  if (row.status === 'DISABLED') return 'Disabled';
  return 'Unknown';
}

function getInvitationDisplayStatus(
  lifecycleState: InvitationTraineeRow['invitationLifecycleState'],
): DisplayStatus {
  switch (lifecycleState) {
    case 'PENDING':
    case 'SENT':
      return 'Invited';
    case 'FAILED_TO_SEND':
      return 'Failed to Send';
    case 'ACCEPTED':
      return 'Accepted';
    case 'COMPLETED':
      return 'Completed';
    case 'EXPIRED':
      return 'Expired';
    case 'REVOKED':
      return 'Revoked';
    case 'REJECTED':
      return 'Rejected';
  }
}

function getDisplayStatus(row: TraineeListItemDto): DisplayStatus {
  if (row.rowType === 'ACTIVE_TRAINEE') {
    return getActiveTraineeDisplayStatus(row);
  }

  return getInvitationDisplayStatus(row.invitationLifecycleState);
}

function getDisplayRole(row: TraineeListItemDto): string {
  return row.rowType === 'INVITATION' ? 'Trainee Invitation' : 'Trainee';
}

function getDisplayName(row: TraineeListItemDto): string {
  const nameParts = [row.firstName?.trim(), row.lastName?.trim()].filter((name): name is string =>
    Boolean(name),
  );

  return nameParts.length > 0 ? nameParts.join(' ') : 'N/A';
}

function toDisplayRow(row: TraineeListItemDto): TraineeDisplayRow {
  return {
    source: row,
    fullName: getDisplayName(row),
    emailAddress: row.email,
    status: getDisplayStatus(row),
  };
}

function getListErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Unable to connect to the server while loading organisation trainees.';
  }

  const body =
    error.body && typeof error.body === 'object'
      ? (error.body as { error?: unknown; message?: unknown })
      : undefined;
  const errorCode = typeof body?.error === 'string' ? body.error : null;
  const bodyMessage = typeof body?.message === 'string' ? body.message : null;

  if (error.status === 401) {
    return bodyMessage || 'Your session is no longer authorised. Please sign in again.';
  }

  if (error.status === 403) {
    if (errorCode === 'ORGANISATION_NOT_ACTIVE') {
      return (
        bodyMessage ||
        'Organisation trainee management is unavailable while the organisation is inactive.'
      );
    }

    if (errorCode === 'ORG_ADMIN_REQUIRED') {
      return bodyMessage || 'Organisation administrator access is required.';
    }

    if (errorCode === 'ORG_ADMIN_PERMISSION_REQUIRED') {
      return bodyMessage || 'You do not have permission to view organisation trainees.';
    }

    return bodyMessage || 'Access to organisation trainee management was denied.';
  }

  if (error.status === 429) {
    return bodyMessage || 'Too many trainee-management requests. Please try again later.';
  }

  if (error.status >= 500) {
    return bodyMessage || 'The server could not load organisation trainees.';
  }

  return bodyMessage || error.message || 'Failed to load organisation trainees.';
}

function getInviteErrorBody(error: ApiError): InviteErrorBody | null {
  if (!error.body || typeof error.body !== 'object') {
    return null;
  }

  return error.body as InviteErrorBody;
}

function getInviteApiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Unable to connect to the server. Please check your connection and try again.';
  }

  const body = getInviteErrorBody(error);
  const errorCode = typeof body?.error === 'string' ? body.error : null;
  const bodyMessage =
    typeof body?.message === 'string' && body.message.trim() ? body.message : null;

  if (error.status === 401) {
    return bodyMessage || 'Your session is no longer authorised. Please sign in again.';
  }
  if (error.status === 403) {
    if (errorCode === 'ORGANISATION_NOT_ACTIVE') {
      return bodyMessage || 'Invitations cannot be created while the organisation is inactive.';
    }

    if (errorCode === 'ORG_ADMIN_REQUIRED') {
      return bodyMessage || 'Active organisation administrator access is required.';
    }

    if (errorCode === 'ORG_ADMIN_PERMISSION_REQUIRED') {
      return bodyMessage || 'You do not have permission to invite organisation trainees.';
    }

    return bodyMessage || 'The invitation request was denied.';
  }

  if (error.status === 409 && errorCode === 'CANNOT_INVITE_USER') {
    return bodyMessage || 'This user cannot be invited to the organisation.';
  }

  if (error.status === 429 && errorCode === 'ORGANISATION_TRAINEE_RATE_LIMITED') {
    return bodyMessage || 'Too many trainee-management requests. Please try again later.';
  }

  if (error.status >= 500) {
    return 'The server could not create the invitation. Please try again later.';
  }

  return bodyMessage || 'The invitation could not be created.';
}

function mapValidationIssues(issues: ReadonlyArray<ValidationIssue>): {
  fieldErrors: InviteFieldErrors;
  generalError: string | null;
} {
  const fieldErrors: InviteFieldErrors = {};
  const generalMessages: string[] = [];

  for (const issue of issues) {
    const field = issue.path.join('.');

    if (field === 'email' || field === 'firstName' || field === 'lastName') {
      fieldErrors[field] ??= issue.message;
    } else {
      generalMessages.push(issue.message);
    }
  }

  return {
    fieldErrors,
    generalError: generalMessages[0] ?? null,
  };
}

function isBackendValidationDetail(value: unknown): value is BackendValidationDetail {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const detail = value as {
    field?: unknown;
    message?: unknown;
  };

  return typeof detail.field === 'string' && typeof detail.message === 'string';
}

function mapBackendValidationDetails(body: InviteErrorBody | null): {
  fieldErrors: InviteFieldErrors;
  generalError: string | null;
} {
  if (!Array.isArray(body?.details)) {
    return {
      fieldErrors: {},
      generalError:
        typeof body?.message === 'string'
          ? body.message
          : 'Please check the invitation details and try again.',
    };
  }

  const validDetails = body.details.filter(isBackendValidationDetail);
  const fieldErrors: InviteFieldErrors = {};
  const generalMessages: string[] = [];

  for (const detail of validDetails) {
    if (detail.field === 'email' || detail.field === 'firstName' || detail.field === 'lastName') {
      fieldErrors[detail.field] ??= detail.message;
    } else {
      generalMessages.push(detail.message);
    }
  }

  if (validDetails.length !== body.details.length) {
    generalMessages.push('Some validation errors could not be matched to a form field.');
  }

  return {
    fieldErrors,
    generalError:
      generalMessages[0] ??
      (Object.keys(fieldErrors).length === 0
        ? typeof body.message === 'string'
          ? body.message
          : 'Please check the invitation details and try again.'
        : null),
  };
}

function getStatusBadge(status: DisplayStatus) {
  const variants: Record<DisplayStatus, string> = {
    Active: 'ring-success-subtle text-fg-success-strong bg-success-soft',
    Disabled: 'ring-default-medium text-heading bg-neutral-secondary-medium',
    Invited: 'ring-brand-subtle text-fg-brand-strong bg-brand-softer',
    'Failed to Send': 'ring-danger-subtle text-fg-danger-strong bg-danger-soft',
    Accepted: 'ring-success-subtle text-fg-success-strong bg-success-soft',
    Completed: 'ring-success-subtle text-fg-success-strong bg-success-soft',
    Expired: 'ring-default-medium text-heading bg-neutral-secondary-medium',
    Revoked: 'ring-danger-subtle text-fg-danger-strong bg-danger-soft',
    Rejected: 'ring-warning-subtle text-fg-warning bg-warning-soft',
    Unknown: 'ring-default-medium text-fg-heading bg-neutral-secondary-medium',
  };

  return (
    <span
      className={`items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset text-sm font-medium ${variants[status]}`}
    >
      {status}
    </span>
  );
}

function OrganisationTraineesPage() {
  const { token, authContext, permissions } = useAuth();
  const organisationId = authContext?.organisation?.id ?? null;
  const listRequestIdRef = useRef(0);
  const inviteRequestIdRef = useRef(0);
  const inviteRequestOwnerRef = useRef<InviteRequestOwner | null>(null);
  const invitationActionRequestIdRef = useRef(0);
  const invitationActionOwnerRef = useRef<InvitationActionRequestOwner | null>(null);

  const [invitationAction, setInvitationAction] = useState<InvitationActionState | null>(null);
  const [invitationActionFeedback, setInvitationActionFeedback] =
    useState<InvitationActionFeedback | null>(null);
  const [invitationActionsUnavailableTarget, setInvitationActionsUnavailableTarget] =
    useState<InvitationActionsUnavailableTarget | null>(null);

  const hasInvitationActionPermission = permissions.includes('INVITE_ORGANISATION_TRAINEES');
  const invitationActionsUnavailable = invitationActionsUnavailableForContext(
    invitationActionsUnavailableTarget,
    organisationId,
    token,
  );
  const canManageInvitationActions = hasInvitationActionPermission && !invitationActionsUnavailable;

  const disableRequestIdRef = useRef(0);
  const disableRequestOwnerRef = useRef<{
    requestId: number;
    traineeId: string;
    organisationId: string;
    token: string;
  } | null>(null);

  const [listResult, setListResult] = useState<ListResultState>({
    organisationId: null,
    rows: [],
    errorMessage: null,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteStatusFilter, setInviteStatusFilter] = useState<'ALL' | DisplayStatus>('ALL');
  const [showInviteTraineeModal, setShowInviteTraineeModal] = useState(false);
  const [inviteModalTarget, setInviteModalTarget] = useState<InviteModalTarget | null>(null);
  const [inviteValues, setInviteValues] = useState<InviteValues>(EMPTY_INVITE_VALUES);
  const [inviteFieldErrors, setInviteFieldErrors] = useState<InviteFieldErrors>({});
  const [inviteGeneralError, setInviteGeneralError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteCreated, setInviteCreated] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<InviteSuccessState | null>(null);
  const [disableDialog, setDisableDialog] = useState<DisableDialogState | null>(null);
  const [disableFeedback, setDisableFeedback] = useState<DisableFeedback | null>(null);
  const [disableActionsUnavailableTarget, setDisableActionsUnavailableTarget] =
    useState<DisableActionsUnavailableTarget | null>(null);

  const hasDisablePermission = permissions.includes('REMOVE_ORGANISATION_TRAINEES');

  const reloadOrganisationTrainees = useCallback(async (): Promise<TraineeReloadResult> => {
    if (!token || !organisationId) {
      return 'stale';
    }

    const requestId = ++listRequestIdRef.current;

    try {
      const response = await getOrganisationTrainees(organisationId, token);

      if (listRequestIdRef.current !== requestId) {
        return 'stale';
      }

      const refreshRows = [...response.trainees, ...response.invitations];

      setListResult({
        organisationId,
        rows: refreshRows,
        errorMessage: null,
      });

      setInvitationActionsUnavailableTarget((current) => {
        if (
          invitationActionsUnavailableForContext(current, organisationId, token) &&
          current?.reason === 'refresh-failed'
        ) {
          return null;
        }
        return current;
      });

      setDisableActionsUnavailableTarget((current) => {
        if (
          disableActionsUnavailableForContext(current, organisationId, token) &&
          current?.reason === 'refresh-failed'
        ) {
          return null;
        }

        return current;
      });

      setDisableDialog((current) => {
        if (!current || !disableTargetMatchesContext(current, organisationId, token)) {
          return current;
        }

        if (current.isSubmitting) {
          return current;
        }

        const refreshedRow = refreshRows.find(
          (row) => row.rowType === 'ACTIVE_TRAINEE' && row.id === current.traineeId,
        );

        if (
          !hasDisablePermission ||
          !refreshedRow ||
          refreshedRow.rowType !== 'ACTIVE_TRAINEE' ||
          refreshedRow.status !== 'ACTIVE' ||
          !refreshedRow.eligibility.canDisable
        ) {
          return null;
        }
        return current;
      });

      setInvitationAction((current) => {
        if (!current || !actionBelongsToContext(current, organisationId, token)) {
          return current;
        }

        if (current.phase === 'pending') {
          return current;
        }

        if (current.phase !== 'confirming') {
          return null;
        }

        const refreshedRow = refreshRows.find(
          (row) => row.rowType === 'INVITATION' && row.invitationId === current.invitationId,
        );

        if (
          !hasInvitationActionPermission ||
          !refreshedRow ||
          refreshedRow.rowType !== 'INVITATION'
        ) {
          return null;
        }

        const remainsEligible =
          current.actionType === 'resend'
            ? refreshedRow.eligibility.canResend
            : refreshedRow.eligibility.canRevoke;

        return remainsEligible ? current : null;
      });
      return 'applied';
    } catch (error: unknown) {
      if (listRequestIdRef.current !== requestId) {
        return 'stale';
      }

      setListResult({
        organisationId,
        rows: [],
        errorMessage: getListErrorMessage(error),
      });
      return 'failed';
    }
  }, [hasDisablePermission, hasInvitationActionPermission, organisationId, token]);

  useEffect(() => {
    let isCurrent = true;

    queueMicrotask(() => {
      if (isCurrent) {
        void reloadOrganisationTrainees();
      }
    });

    return () => {
      isCurrent = false;
      listRequestIdRef.current += 1;
    };
  }, [reloadOrganisationTrainees]);

  useEffect(() => {
    return () => {
      inviteRequestIdRef.current += 1;
      inviteRequestOwnerRef.current = null;
    };
  }, [organisationId, token]);

  useEffect(() => {
    return () => {
      invitationActionRequestIdRef.current += 1;
      invitationActionOwnerRef.current = null;
    };
  }, [organisationId, token]);

  useEffect(() => {
    return () => {
      disableRequestIdRef.current += 1;
      disableRequestOwnerRef.current = null;
    };
  }, [organisationId, token]);

  const disableActionsUnavailable = disableActionsUnavailableForContext(
    disableActionsUnavailableTarget,
    organisationId,
    token,
  );
  const canUseDisableActions = hasDisablePermission && !disableActionsUnavailable;

  const hasCurrentResult = listResult.organisationId === organisationId;
  const isLoading = Boolean(token && organisationId && !hasCurrentResult);
  const loadError = hasCurrentResult ? listResult.errorMessage : null;

  const displayRows = useMemo(
    () => (hasCurrentResult ? listResult.rows : []).map(toDisplayRow),
    [hasCurrentResult, listResult.rows],
  );

  const filteredTrainees = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return displayRows.filter((trainee) => {
      const matchesSearch =
        !search ||
        [
          trainee.source.firstName?.trim() ?? '',
          trainee.source.lastName?.trim() ?? '',
          trainee.emailAddress,
        ]
          .join(' ')
          .toLowerCase()
          .includes(search);

      const matchesStatus = inviteStatusFilter === 'ALL' || trainee.status === inviteStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [displayRows, inviteStatusFilter, searchTerm]);

  const canInvite = permissions.includes('INVITE_ORGANISATION_TRAINEES');

  const currentInvitationAction = actionBelongsToContext(invitationAction, organisationId, token)
    ? invitationAction
    : null;

  const currentInvitationActionFeedback =
    invitationActionFeedback &&
    actionBelongsToContext(invitationActionFeedback, organisationId, token)
      ? invitationActionFeedback
      : null;

  const currentDisableDialog = disableTargetMatchesContext(disableDialog, organisationId, token)
    ? disableDialog
    : null;

  const currentDisableFeedback =
    disableFeedback && disableTargetMatchesContext(disableFeedback, organisationId, token)
      ? disableFeedback
      : null;

  const isCurrentActionOwned = (requestId: number, target: InvitationActionTarget): boolean => {
    const owner = invitationActionOwnerRef.current;

    return owner !== null && owner.requestId === requestId && actionTargetsMatch(owner, target);
  };

  const clearMatchingInvitationAction = (target: InvitationActionTarget) => {
    setInvitationAction((current) => (actionTargetsMatch(current, target) ? null : current));
  };

  const executeInvitationAction = async (target: InvitationActionTarget) => {
    const existingOwner = invitationActionOwnerRef.current;

    if (existingOwner) {
      if (
        existingOwner.organisationId === target.organisationId &&
        existingOwner.token === target.token
      ) {
        return;
      }

      invitationActionRequestIdRef.current += 1;
      invitationActionOwnerRef.current = null;
    }

    const requestId = ++invitationActionRequestIdRef.current;
    invitationActionOwnerRef.current = {
      ...target,
      requestId,
    };

    setInvitationAction({
      ...target,
      phase: 'pending',
      errorMessage: null,
    });
    setInvitationActionFeedback(null);

    try {
      const response =
        target.actionType === 'resend'
          ? await resendOrganisationTraineeInvitation(
              target.organisationId,
              target.invitationId,
              target.token,
            )
          : await revokeOrganisationTraineeInvitation(
              target.organisationId,
              target.invitationId,
              target.token,
            );

      if (!isCurrentActionOwned(requestId, target)) {
        return;
      }

      setInvitationAction({
        ...target,
        phase: 'reconciling',
        errorMessage: null,
      });

      const refreshResult = await reloadOrganisationTrainees();

      if (!isCurrentActionOwned(requestId, target)) {
        return;
      }

      if (refreshResult === 'applied') {
        clearMatchingInvitationAction(target);
        setInvitationActionFeedback({
          organisationId: target.organisationId,
          token: target.token,
          variant: 'success',
          message: response.message,
        });
        return;
      }

      if (refreshResult === 'failed') {
        setInvitationActionsUnavailableTarget({
          organisationId: target.organisationId,
          token: target.token,
          reason: 'refresh-failed',
        });

        const refreshFailureMessage =
          `${response.message} The action succeeded, but the trainee list could not be refreshed. ` +
          'Reload the page before attempting another action on this invitation.';

        setInvitationAction({
          ...target,
          phase: 'completed-refresh-failed',
          errorMessage: refreshFailureMessage,
        });
        setInvitationActionFeedback({
          organisationId: target.organisationId,
          token: target.token,
          variant: 'warning',
          message: refreshFailureMessage,
        });
        return;
      }
      clearMatchingInvitationAction(target);
      setInvitationActionFeedback({
        organisationId: target.organisationId,
        token: target.token,
        variant: 'success',
        message: response.message,
      });
    } catch (error: unknown) {
      if (!isCurrentActionOwned(requestId, target)) {
        return;
      }

      const message = getInvitationActionErrorMessage(error);

      if (error instanceof ApiError && (error.status === 404 || error.status === 409)) {
        setInvitationAction({
          ...target,
          phase: 'reconciling',
          errorMessage: null,
        });
        setInvitationActionFeedback({
          organisationId: target.organisationId,
          token: target.token,
          variant: error.status === 409 ? 'warning' : 'error',
          message,
        });

        const refreshResult = await reloadOrganisationTrainees();

        if (!isCurrentActionOwned(requestId, target)) {
          return;
        }

        if (refreshResult === 'applied') {
          clearMatchingInvitationAction(target);
          return;
        }

        if (refreshResult === 'failed') {
          setInvitationActionsUnavailableTarget({
            organisationId: target.organisationId,
            token: target.token,
            reason: 'refresh-failed',
          });

          const reconciliationMessage =
            `${message} Current invitation eligibility could not be loaded. ` +
            'Reload the page before trying this action again.';

          setInvitationAction({
            ...target,
            phase: 'conflict-refresh-failed',
            errorMessage: reconciliationMessage,
          });
          setInvitationActionFeedback({
            organisationId: target.organisationId,
            token: target.token,
            variant: error.status === 409 ? 'warning' : 'error',
            message: reconciliationMessage,
          });
          return;
        }

        clearMatchingInvitationAction(target);
        return;
      }

      if (error instanceof ApiError && error.status === 403) {
        setInvitationActionsUnavailableTarget({
          organisationId: target.organisationId,
          token: target.token,
          reason: 'permission-denied',
        });
        setInvitationAction({
          ...target,
          phase: 'reconciling',
          errorMessage: null,
        });
        setInvitationActionFeedback({
          organisationId: target.organisationId,
          token: target.token,
          variant: 'error',
          message,
        });

        const refreshResult = await reloadOrganisationTrainees();

        if (!isCurrentActionOwned(requestId, target)) {
          return;
        }

        if (refreshResult === 'failed') {
          setInvitationActionFeedback({
            organisationId: target.organisationId,
            token: target.token,
            variant: 'error',
            message:
              `${message} The trainee list could not be refreshed, so invitation actions ` +
              'remain unavailable.',
          });
        }

        clearMatchingInvitationAction(target);
        return;
      }

      setInvitationActionFeedback({
        organisationId: target.organisationId,
        token: target.token,
        variant: 'error',
        message,
      });

      if (target.actionType === 'revoke') {
        setInvitationAction({
          ...target,
          phase: 'confirming',
          errorMessage: message,
        });
      } else {
        clearMatchingInvitationAction(target);
      }
    } finally {
      if (isCurrentActionOwned(requestId, target)) {
        invitationActionOwnerRef.current = null;
      }
    }
  };

  const beginInvitationAction = (row: InvitationTraineeRow, actionType: InvitationActionType) => {
    if (
      !organisationId ||
      !token ||
      !canManageInvitationActions ||
      !row.invitationId ||
      currentInvitationAction?.invitationId === row.invitationId
    ) {
      return;
    }

    const target: InvitationActionTarget = {
      actionType,
      invitationId: row.invitationId,
      organisationId,
      token,
      email: row.email,
    };

    setInvitationActionFeedback(null);

    if (actionType === 'revoke') {
      setInvitationAction({
        ...target,
        phase: 'confirming',
        errorMessage: null,
      });
      return;
    }

    void executeInvitationAction(target);
  };

  const confirmInvitationAction = () => {
    if (
      !currentInvitationAction ||
      currentInvitationAction.actionType !== 'revoke' ||
      currentInvitationAction.phase !== 'confirming'
    ) {
      return;
    }

    void executeInvitationAction(currentInvitationAction);
  };

  const cancelInvitationAction = () => {
    if (currentInvitationAction?.phase === 'pending') {
      return;
    }

    setInvitationAction((current) =>
      actionBelongsToContext(current, organisationId, token) ? null : current,
    );
  };

  const openDisableDialog = (row: ActiveTraineeRow) => {
    if (
      !organisationId ||
      !token ||
      !canUseDisableActions ||
      disableRequestOwnerRef.current !== null ||
      row.status !== 'ACTIVE' ||
      !row.eligibility.canDisable
    ) {
      return;
    }

    setDisableFeedback(null);
    setDisableDialog({
      traineeId: row.id,
      organisationId,
      token,
      displayName: getDisplayName(row),
      email: row.email,
      password: '',
      passwordError: null,
      generalError: null,
      isSubmitting: false,
    });
  };

  const changeDisablePassword = (password: string) => {
    setDisableDialog((current) => {
      if (
        !current ||
        !disableTargetMatchesContext(current, organisationId, token) ||
        current.isSubmitting
      ) {
        return current;
      }

      return {
        ...current,
        password,
        passwordError: null,
        generalError: null,
      };
    });
  };

  const closeDisableDialog = () => {
    if (!currentDisableDialog || currentDisableDialog.isSubmitting) {
      return;
    }

    setDisableDialog(null);
  };

  const executeDisableDialog = async () => {
    const target = currentDisableDialog;

    if (
      !target ||
      !hasDisablePermission ||
      disableActionsUnavailable ||
      disableRequestOwnerRef.current !== null
    ) {
      return;
    }

    const currentRow = listResult.rows.find(
      (row) => row.rowType === 'ACTIVE_TRAINEE' && row.id === target.traineeId,
    );

    /*
     * No mutation has been sent, so request ownership has not yet been
     * claimed.
     */
    if (
      !currentRow ||
      currentRow.rowType !== 'ACTIVE_TRAINEE' ||
      currentRow.status !== 'ACTIVE' ||
      !currentRow.eligibility.canDisable
    ) {
      setDisableDialog(null);
      setDisableFeedback({
        organisationId: target.organisationId,
        token: target.token,
        variant: 'warning',
        message:
          'The trainee state changed before the disable request was sent. The trainee list is being refreshed.',
      });

      const refreshResult = await reloadOrganisationTrainees();

      if (refreshResult === 'failed') {
        setDisableActionsUnavailableTarget({
          organisationId: target.organisationId,
          token: target.token,
          reason: 'refresh-failed',
        });
        setDisableFeedback({
          organisationId: target.organisationId,
          token: target.token,
          variant: 'error',
          message:
            'The trainee state changed, and the current trainee state could not be loaded. Reload the page before trying again.',
        });
      }

      // A stale result belongs to another context.
      return;
    }

    const validationResult = disableTraineeRequestSchema.safeParse({
      password: target.password,
      confirmation: true,
    });

    if (!validationResult.success) {
      const passwordIssue = validationResult.error.issues.find(
        (issue) => issue.path[0] === 'password',
      );

      setDisableDialog((current) =>
        current &&
        current.traineeId === target.traineeId &&
        disableTargetMatchesContext(current, target.organisationId, target.token)
          ? {
              ...current,
              passwordError: passwordIssue?.message ?? 'Administrator password is required.',
              generalError: null,
            }
          : current,
      );
      return;
    }

    const requestId = ++disableRequestIdRef.current;

    disableRequestOwnerRef.current = {
      requestId,
      traineeId: target.traineeId,
      organisationId: target.organisationId,
      token: target.token,
    };

    const ownsRequest = (): boolean => {
      const owner = disableRequestOwnerRef.current;

      return (
        owner !== null &&
        owner.requestId === requestId &&
        owner.traineeId === target.traineeId &&
        owner.organisationId === target.organisationId &&
        owner.token === target.token
      );
    };

    setDisableDialog((current) =>
      current &&
      current.traineeId === target.traineeId &&
      disableTargetMatchesContext(current, target.organisationId, target.token)
        ? {
            ...current,
            passwordError: null,
            generalError: null,
            isSubmitting: true,
          }
        : current,
    );
    setDisableFeedback(null);

    try {
      const payload: DisableTraineeRequestDto = validationResult.data;

      const response = await disableOrganisationTrainee(
        target.organisationId,
        target.traineeId,
        payload,
        target.token,
      );

      if (!ownsRequest()) {
        return;
      }

      // Successful mutation closes the modal immediately.
      setDisableDialog(null);
      setDisableFeedback({
        organisationId: target.organisationId,
        token: target.token,
        variant: 'success',
        message: response.message,
      });

      const refreshResult = await reloadOrganisationTrainees();

      if (!ownsRequest()) {
        return;
      }

      if (refreshResult === 'failed') {
        setDisableActionsUnavailableTarget({
          organisationId: target.organisationId,
          token: target.token,
          reason: 'refresh-failed',
        });
        setDisableFeedback({
          organisationId: target.organisationId,
          token: target.token,
          variant: 'warning',
          message:
            `${response.message} The trainee list could not be refreshed. ` +
            'Reload the page before disabling another trainee.',
        });
      }
    } catch (error: unknown) {
      if (!ownsRequest()) {
        return;
      }

      const body = error instanceof ApiError ? getDisableErrorBody(error) : null;
      const errorCode = typeof body?.error === 'string' ? body.error : null;
      const message = getDisableErrorMessage(error);

      if (
        error instanceof ApiError &&
        error.status === 403 &&
        errorCode === 'ORG_TRAINEE_PASSWORD_INVALID'
      ) {
        setDisableDialog((current) =>
          current &&
          current.traineeId === target.traineeId &&
          disableTargetMatchesContext(current, target.organisationId, target.token)
            ? {
                ...current,
                password: '',
                passwordError:
                  typeof body?.message === 'string'
                    ? body.message
                    : 'The administrator password is incorrect.',
                generalError: null,
                isSubmitting: false,
              }
            : current,
        );
        return;
      }

      if (error instanceof ApiError && error.status === 422) {
        const passwordDetail = Array.isArray(body?.details)
          ? body.details.find((detail): detail is BackendValidationDetail =>
              Boolean(
                detail &&
                typeof detail === 'object' &&
                (detail as BackendValidationDetail).field === 'password' &&
                typeof (detail as BackendValidationDetail).message === 'string',
              ),
            )
          : undefined;

        setDisableDialog((current) =>
          current &&
          current.traineeId === target.traineeId &&
          disableTargetMatchesContext(current, target.organisationId, target.token)
            ? {
                ...current,
                passwordError: passwordDetail?.message ?? null,
                generalError: passwordDetail ? null : message,
                isSubmitting: false,
              }
            : current,
        );
        return;
      }

      if (error instanceof ApiError && (error.status === 404 || error.status === 409)) {
        setDisableDialog(null);
        setDisableFeedback({
          organisationId: target.organisationId,
          token: target.token,
          variant: error.status === 409 ? 'warning' : 'error',
          message,
        });

        const refreshResult = await reloadOrganisationTrainees();

        if (!ownsRequest()) {
          return;
        }

        if (refreshResult === 'failed') {
          setDisableActionsUnavailableTarget({
            organisationId: target.organisationId,
            token: target.token,
            reason: 'refresh-failed',
          });
          setDisableFeedback({
            organisationId: target.organisationId,
            token: target.token,
            variant: 'error',
            message:
              `${message} Current trainee state could not be loaded. ` +
              'Reload the page before trying again.',
          });
        }

        return;
      }

      /*
       * The password-specific 403 returned above. Every remaining 403 is a
       * permission denial.
       */
      if (error instanceof ApiError && error.status === 403) {
        setDisableDialog(null);
        setDisableActionsUnavailableTarget({
          organisationId: target.organisationId,
          token: target.token,
          reason: 'permission-denied',
        });
        setDisableFeedback({
          organisationId: target.organisationId,
          token: target.token,
          variant: 'error',
          message,
        });
        return;
      }

      /*
       * 401, 429, network failures and 5xx responses leave the modal open
       * so the request can be retried.
       */
      setDisableDialog((current) =>
        current &&
        current.traineeId === target.traineeId &&
        disableTargetMatchesContext(current, target.organisationId, target.token)
          ? {
              ...current,
              generalError: message,
              isSubmitting: false,
            }
          : current,
      );
      setDisableFeedback({
        organisationId: target.organisationId,
        token: target.token,
        variant: 'error',
        message,
      });
    } finally {
      if (ownsRequest()) {
        disableRequestOwnerRef.current = null;

        setDisableDialog((current) =>
          current &&
          current.traineeId === target.traineeId &&
          disableTargetMatchesContext(current, target.organisationId, target.token)
            ? {
                ...current,
                isSubmitting: false,
              }
            : current,
        );
      }
    }
  };

  const renderRowActions = (row: TraineeListItemDto) => {
    if (row.rowType === 'ACTIVE_TRAINEE') {
      if (!canUseDisableActions || row.status !== 'ACTIVE' || !row.eligibility.canDisable) {
        return 'N/A';
      }

      const isThisTraineeSubmitting =
        currentDisableDialog?.traineeId === row.id && currentDisableDialog.isSubmitting;

      return (
        <button
          type="button"
          disabled={isThisTraineeSubmitting}
          onClick={() => openDisableDialog(row)}
          className="px-3 py-1.5 text-white bg-danger hover:bg-danger-strong font-jost tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isThisTraineeSubmitting ? 'Disabling...' : 'Disable'}
        </button>
      );
    }

    if (!canManageInvitationActions || !row.invitationId) {
      return 'N/A';
    }

    const actionOwnsRow =
      currentInvitationAction?.invitationId === row.invitationId &&
      (currentInvitationAction.phase === 'confirming' ||
        currentInvitationAction.phase === 'pending' ||
        currentInvitationAction.phase === 'reconciling' ||
        currentInvitationAction.phase === 'completed-refresh-failed' ||
        currentInvitationAction.phase === 'conflict-refresh-failed');

    const resendPending =
      actionOwnsRow &&
      currentInvitationAction?.actionType === 'resend' &&
      currentInvitationAction.phase === 'pending';

    const revokePending =
      actionOwnsRow &&
      currentInvitationAction?.actionType === 'revoke' &&
      currentInvitationAction.phase === 'pending';

    const showResend =
      row.eligibility.canResend ||
      (!row.eligibility.canResend && row.eligibility.resendCooldownSeconds > 0);

    const showRevoke = row.eligibility.canRevoke;

    if (!showResend && !showRevoke) {
      return 'N/A';
    }

    return (
      <AdminTableActions className="flex-wrap gap-2">
        {showResend && (
          <button
            type="button"
            disabled={!row.eligibility.canResend || actionOwnsRow}
            onClick={() => beginInvitationAction(row, 'resend')}
            className="px-3 py-1.5 text-white bg-main-purple hover:bg-hover-purple font-jost tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {resendPending
              ? 'Resending...'
              : !row.eligibility.canResend && row.eligibility.resendCooldownSeconds > 0
                ? `Resend (${row.eligibility.resendCooldownSeconds}s)`
                : 'Resend'}
          </button>
        )}

        {showRevoke && (
          <button
            type="button"
            disabled={actionOwnsRow}
            onClick={() => beginInvitationAction(row, 'revoke')}
            className="px-3 py-1.5 text-white bg-danger hover:bg-danger-strong font-jost tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {revokePending ? 'Revoking...' : 'Revoke'}
          </button>
        )}
      </AdminTableActions>
    );
  };

  const resetInviteModal = () => {
    setInviteModalTarget(null);
    setInviteValues(EMPTY_INVITE_VALUES);
    setInviteFieldErrors({});
    setInviteGeneralError(null);
    setIsInviting(false);
    setInviteCreated(false);
  };

  const openInviteTraineeModal = () => {
    if (!organisationId || !token) {
      return;
    }

    resetInviteModal();
    setInviteSuccess(null);
    setInviteModalTarget({
      organisationId,
      token,
    });
    setShowInviteTraineeModal(true);
  };

  const closeInviteTraineeModal = () => {
    if (isInviting || inviteRequestOwnerRef.current !== null) {
      return;
    }

    setShowInviteTraineeModal(false);
    resetInviteModal();
  };

  const changeInviteField = (field: InviteField, value: string) => {
    setInviteValues((current) => ({
      ...current,
      [field]: value,
    }));

    setInviteFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
    setInviteGeneralError(null);
  };

  const submitInvitation = async () => {
    const currentTarget: InviteModalTarget | null =
      organisationId && token
        ? {
            organisationId,
            token,
          }
        : null;

    if (
      !inviteModalTarget ||
      !inviteTargetsMatch(inviteModalTarget, currentTarget) ||
      isInviting ||
      inviteCreated
    ) {
      return;
    }

    const existingOwner = inviteRequestOwnerRef.current;

    if (existingOwner) {
      if (inviteTargetsMatch(existingOwner, currentTarget)) {
        return;
      }

      inviteRequestIdRef.current += 1;
      inviteRequestOwnerRef.current = null;
    }
    setInviteFieldErrors({});
    setInviteGeneralError(null);
    setInviteSuccess(null);

    const firstName = inviteValues.firstName.trim();
    const lastName = inviteValues.lastName.trim();

    const validationResult = createTraineeInvitationRequestSchema.safeParse({
      email: inviteValues.email.trim(),
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
    });

    if (!validationResult.success) {
      const mapped = mapValidationIssues(validationResult.error.issues);
      setInviteFieldErrors(mapped.fieldErrors);
      setInviteGeneralError(mapped.generalError);
      return;
    }

    const requestTarget = inviteModalTarget;
    const requestId = ++inviteRequestIdRef.current;

    inviteRequestOwnerRef.current = {
      requestId,
      organisationId: requestTarget.organisationId,
      token: requestTarget.token,
    };

    const isCurrentRequest = (): boolean => {
      const owner = inviteRequestOwnerRef.current;

      return (
        inviteRequestIdRef.current === requestId &&
        owner !== null &&
        owner.requestId === requestId &&
        owner.organisationId === requestTarget.organisationId &&
        owner.token === requestTarget.token
      );
    };

    setIsInviting(true);

    try {
      const payload: CreateTraineeInvitationRequestDto = validationResult.data;
      const response = await createOrganisationTraineeInvitation(
        requestTarget.organisationId,
        payload,
        requestTarget.token,
      );

      if (!isCurrentRequest()) {
        return;
      }

      setInviteCreated(true);
      setInviteSuccess({
        target: requestTarget,
        message: response.message,
      });

      const refreshResult = await reloadOrganisationTrainees();

      if (!isCurrentRequest()) {
        return;
      }

      if (refreshResult === 'failed') {
        setInviteGeneralError(
          `${response.message} The invitation was created, but the trainee list could not be refreshed. Close this dialog and reload the page before trying again.`,
        );
        return;
      }

      if (refreshResult === 'stale') {
        return;
      }

      setShowInviteTraineeModal(false);
      resetInviteModal();
    } catch (error: unknown) {
      if (!isCurrentRequest()) {
        return;
      }

      if (error instanceof ApiError) {
        const body = getInviteErrorBody(error);
        const errorCode = typeof body?.error === 'string' ? body.error : null;

        if (error.status === 422 && errorCode === 'VALIDATION_ERROR') {
          const mapped = mapBackendValidationDetails(body);
          setInviteFieldErrors(mapped.fieldErrors);
          setInviteGeneralError(mapped.generalError);
          return;
        }

        if (error.status === 409 && errorCode === 'CANNOT_INVITE_USER') {
          setInviteGeneralError(getInviteApiErrorMessage(error));
          void reloadOrganisationTrainees();
          return;
        }
      }

      setInviteGeneralError(getInviteApiErrorMessage(error));
    } finally {
      if (isCurrentRequest()) {
        inviteRequestOwnerRef.current = null;
        setIsInviting(false);
      }
    }
  };

  const currentInviteTarget: InviteModalTarget | null =
    organisationId && token
      ? {
          organisationId,
          token,
        }
      : null;

  const showCurrentInviteModal =
    showInviteTraineeModal && inviteTargetsMatch(inviteModalTarget, currentInviteTarget);

  if (!organisationId) {
    return <Navigate to="/" replace />;
  }

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
            Organisation Trainees
          </h1>

          {/* SUB-HEADING */}
          <p className="font-regular tracking-wider text-[1.3rem] font-justify font-jost text-gray-500 mb-4">
            View, invite, and manage trainees within your organisation.
          </p>
        </div>

        <div className="px-6 pb-6">
          {currentDisableFeedback && (
            <div
              role={currentDisableFeedback.variant === 'success' ? 'status' : 'alert'}
              className={`p-4 mb-6 border rounded-none font-jost text-[1.1rem] flex items-center justify-between gap-3 w-full ${
                currentDisableFeedback.variant === 'success'
                  ? 'text-green-800 bg-green-50 border-green-200'
                  : currentDisableFeedback.variant === 'warning'
                    ? 'text-amber-800 bg-amber-50 border-amber-200'
                    : 'text-red-800 bg-red-50 border-red-200'
              }`}
            >
              <span>{currentDisableFeedback.message}</span>

              <button
                type="button"
                onClick={() => setDisableFeedback(null)}
                className="shrink-0 cursor-pointer"
                aria-label="Dismiss disable trainee message"
              >
                <span className="material-symbols-sharp">close</span>
              </button>
            </div>
          )}

          {currentInvitationActionFeedback && (
            <div
              role={currentInvitationActionFeedback.variant === 'success' ? 'status' : 'alert'}
              className={`p-4 mb-6 border rounded-none font-jost text-[1.1rem] flex items-center justify-between gap-3 w-full ${
                currentInvitationActionFeedback.variant === 'success'
                  ? 'text-green-800 bg-green-50 border-green-200'
                  : currentInvitationActionFeedback.variant === 'warning'
                    ? 'text-amber-800 bg-amber-50 border-amber-200'
                    : 'text-red-800 bg-red-50 border-red-200'
              }`}
            >
              <span>{currentInvitationActionFeedback.message}</span>

              <button
                type="button"
                onClick={() => setInvitationActionFeedback(null)}
                className="shrink-0 cursor-pointer"
                aria-label="Dismiss invitation action message"
              >
                <span className="material-symbols-sharp">close</span>
              </button>
            </div>
          )}
          {inviteSuccess && inviteTargetsMatch(inviteSuccess.target, currentInviteTarget) && (
            <output className="p-4 mb-6 text-green-800 bg-green-50 border border-green-200 rounded-none font-jost text-[1.1rem] flex items-center gap-3 w-full">
              <span className="material-symbols-sharp">check_circle</span>
              <span>{inviteSuccess.message}</span>
            </output>
          )}
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
              <AdminTable aria-label="Organisation trainees">
                <tbody>
                  <AdminTableLoadingRow colSpan={5}>
                    Loading organisation trainees...
                  </AdminTableLoadingRow>
                </tbody>
              </AdminTable>
            </AdminTableContainer>
          )}

          {!isLoading && !loadError && (
            <>
              {/* SEARCH AND FILTER BAR */}
              <div className="w-full mb-4">
                <div className="relative bg-white-purple border border-gray-200">
                  <div className="flex flex-col items-center justify-between p-4 space-y-3 md:flex-row md:space-y-0 md:space-x-4">
                    {/* ==== SEARCH BAR ==== */}
                    <div className="w-full md:w-1/2">
                      <div className="flex items-center">
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
                      </div>
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
                                <span className="material-symbols-sharp text-gray-400">
                                  filter_alt
                                </span>
                                {inviteStatusFilter === 'ALL' ? 'Status' : inviteStatusFilter}
                              </span>
                            }
                            className="ml-2 font-jost tracking-wide text-[1.1rem] font-light text-gray-500 border border-gray-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white rounded-none"
                          >
                            <DropdownItem
                              onClick={() => setInviteStatusFilter('ALL')}
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
                              onClick={() => setInviteStatusFilter('Failed to Send')}
                              className="font-jost text-gray-600 text-[1.1rem]"
                            >
                              Failed to Send
                            </DropdownItem>
                            <DropdownItem
                              onClick={() => setInviteStatusFilter('Completed')}
                              className="font-jost text-gray-600 text-[1.1rem]"
                            >
                              Completed
                            </DropdownItem>
                            <DropdownItem
                              onClick={() => setInviteStatusFilter('Accepted')}
                              className="font-jost text-gray-600 text-[1.1rem]"
                            >
                              Accepted
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
                            <DropdownItem
                              onClick={() => setInviteStatusFilter('Unknown')}
                              className="font-jost text-gray-600 text-[1.1rem]"
                            >
                              Unknown
                            </DropdownItem>
                          </Dropdown>
                        </div>
                      </div>

                      {canInvite && (
                        <button
                          type="button"
                          onClick={openInviteTraineeModal}
                          className="cursor-pointer px-4 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border  border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-[0.425rem] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-sharp">add_2</span>
                          <span className="whitespace-nowrap">Invite Trainee</span>
                        </button>
                      )}
                    </div>
                    {/* ==== FILTERS ==== */}
                  </div>
                </div>
              </div>

              <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium mb-3">
                Organisation Trainees ({displayRows.length})
              </h3>

              {/* TABLE */}
              <AdminTableContainer>
                <AdminTable>
                  <AdminTableHeader>
                    <tr>
                      <AdminTableHeaderCell>Full Name</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Email Address</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Role</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
                    </tr>
                  </AdminTableHeader>
                  <tbody className="font-overpass font-regular text-[1rem] tracking-wide">
                    {filteredTrainees.map((trainee) => (
                      <tr
                        key={`${trainee.source.rowType}-${trainee.source.id}`}
                        className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default"
                      >
                        {/* Trainee Full Name */}
                        <AdminTableCell>
                          <TruncatedValue value={trainee.fullName} className="max-w-64" />
                        </AdminTableCell>

                        {/* Trainee Email Address */}
                        <AdminTableCell>
                          <TruncatedValue value={trainee.emailAddress} />
                        </AdminTableCell>

                        {/* Representative */}
                        <AdminTableCell>{getDisplayRole(trainee.source)}</AdminTableCell>

                        {/* Request Status */}
                        <AdminTableCell>{getStatusBadge(trainee.status)}</AdminTableCell>

                        {/* Actions */}
                        <AdminTableCell>{renderRowActions(trainee.source)}</AdminTableCell>
                      </tr>
                    ))}

                    {filteredTrainees.length === 0 && (
                      <AdminTableEmptyRow colSpan={5}>
                        {displayRows.length === 0
                          ? 'No Organisation Trainees Found'
                          : 'No Organisation Trainees Match the Current Search or Filter'}
                      </AdminTableEmptyRow>
                    )}
                  </tbody>
                </AdminTable>
              </AdminTableContainer>
            </>
          )}
        </div>
      </div>

      {/* INVITE TRAINEE MODAL */}
      {showCurrentInviteModal && (
        <InviteTraineeModal
          isOpen={showCurrentInviteModal}
          values={inviteValues}
          fieldErrors={inviteFieldErrors}
          generalError={inviteGeneralError}
          isSubmitting={isInviting}
          hasSubmittedSuccessfully={inviteCreated}
          onChange={changeInviteField}
          onSubmit={() => {
            void submitInvitation();
          }}
          onCancel={closeInviteTraineeModal}
        />
      )}
      {currentDisableDialog && (
        <DisableTraineeModal
          displayName={currentDisableDialog.displayName}
          email={currentDisableDialog.email}
          password={currentDisableDialog.password}
          passwordError={currentDisableDialog.passwordError}
          generalError={currentDisableDialog.generalError}
          isSubmitting={currentDisableDialog.isSubmitting}
          onPasswordChange={changeDisablePassword}
          onSubmit={() => {
            void executeDisableDialog();
          }}
          onCancel={closeDisableDialog}
        />
      )}

      {currentInvitationAction?.actionType === 'revoke' && (
        <BasicConfirmationModal
          title="Revoke trainee invitation"
          message={`Revoke the invitation for ${currentInvitationAction.email}?`}
          confirmButtonText="Revoke Invitation"
          confirmButtonVariant="danger"
          isConfirming={currentInvitationAction.phase === 'pending'}
          isConfirmDisabled={currentInvitationAction.phase !== 'confirming'}
          isDismissDisabled={currentInvitationAction.phase === 'pending'}
          errorMessage={currentInvitationAction.errorMessage}
          onConfirm={confirmInvitationAction}
          onCancel={cancelInvitationAction}
        />
      )}
    </AppLayout>
  );
}

export default OrganisationTraineesPage;
