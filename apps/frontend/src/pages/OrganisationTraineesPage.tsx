import AppLayout from '../components/layout/AppLayout';
import { Dropdown, DropdownItem } from 'flowbite-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InviteTraineeModal from '../components/layout/modals/InviteTraineeModal';
import {
  createTraineeInvitationRequestSchema,
  type CreateTraineeInvitationRequestDto,
  type TraineeListItemDto,
} from '@insightful-phish/shared';
import { ApiError } from '../lib/apiClient';
import { useAuth } from '../context/useAuth';
import {
  createOrganisationTraineeInvitation,
  getOrganisationTrainees,
} from '../services/organisation-trainee.service';
import { Navigate } from 'react-router-dom';

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

type InviteSuccessState = {
  target: InviteModalTarget;
  message: string;
};

type InviteErrorBody = {
  error?: unknown;
  message?: unknown;
  details?: unknown;
};

type ValidationIssue = {
  path: ReadonlyArray<string | number>;
  message: string;
};

type BackendValidationDetail = {
  field: string;
  message: string;
};

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
        'Organisation trainee management is unavailable while the organiation is inactive.'
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

      setListResult({
        organisationId,
        rows: [...response.trainees, ...response.invitations],
        errorMessage: null,
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
  }, [organisationId, token]);

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
    };
  }, [organisationId, token]);

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

  const resetInviteModal = () => {
    inviteRequestIdRef.current += 1;
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
    if (isInviting) {
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

    const requestId = ++inviteRequestIdRef.current;
    const requestTarget = inviteModalTarget;
    const isCurrentRequest = () => inviteRequestIdRef.current === requestId;

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
            <div className="py-12 flex justify-center items-center font-jost text-gray-500 text-[1.2rem]">
              <span>Loading organisation trainees...</span>
            </div>
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
                    {filteredTrainees.map((trainee) => (
                      <tr
                        key={`${trainee.source.rowType}-${trainee.source.id}`}
                        className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default"
                      >
                        {/* Trainee Full Name */}
                        <td className="px-6 py-4">{trainee.fullName}</td>

                        {/* Trainee Email Address */}
                        <td className="px-6 py-4">{trainee.emailAddress}</td>

                        {/* Representative */}
                        <td className="px-6 py-4">Trainee</td>

                        {/* Request Status */}
                        <td className="px-6 py-4">{getStatusBadge(trainee.status)}</td>

                        {/* Actions */}
                        <td className="px-6 py-4">N/A</td>
                      </tr>
                    ))}

                    {filteredTrainees.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-[1.2rem] tracking-wider text-red-500 font-jost"
                        >
                          {displayRows.length === 0
                            ? 'No Organisation Trainees Found'
                            : 'No Organisation Trainees Match the Current Search or Filter'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
    </AppLayout>
  );
}

export default OrganisationTraineesPage;
