import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import {
  createEmailProviderProfileRequestSchema,
  updateEmailProviderProfileRequestSchema,
  type CreateEmailProviderProfileRequestDto,
  type EmailProviderProfileManagementDetailResponseDto,
  type EmailProviderProfileSummaryDto,
  type UpdateEmailProviderProfileRequestDto,
} from '@insightful-phish/shared';
import BasicAlert from '../components/alerts/BasicAlert';
import LoadingSpinnerSVG from '../components/LoadingSpinnerSVG';
import BasicConfirmationModal from '../components/layout/modals/BasicConfirmationModal';
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
import { FormField, SelectField } from '../components/ui/FormField';
import StatusBadge from '../components/ui/StatusBadge';
import { ApiError } from '../lib/apiClient';
import {
  checkEmailProviderProfileConnection,
  createEmailProviderProfile,
  getEmailProviderProfile,
  listEmailProviderProfiles,
  removeEmailProviderProfile,
  updateEmailProviderProfile,
} from '../services/email-provider-profile.service';

type EmailProviderProfilesPageProps = Readonly<{ organisationId: string; token: string }>;
type ProfileForm = {
  displayName: string;
  smtpHost: string;
  smtpPort: '465' | '587';
  smtpUsername: string;
  credential: string;
  fromAddress: string;
  fromName: string;
  replyTo: string;
};
type ConfirmationAction = {
  kind: 'disable' | 'remove';
  profile: EmailProviderProfileSummaryDto;
} | null;
type EmailProviderProfileActionsProps = Readonly<{
  profile: EmailProviderProfileSummaryDto;
  pendingAction: string | null;
  isBusy: boolean;
  onEdit: (profile: EmailProviderProfileSummaryDto) => Promise<void>;
  onConnectionCheck: (profile: EmailProviderProfileSummaryDto) => Promise<void>;
  onEnable: (profile: EmailProviderProfileSummaryDto) => Promise<void>;
  onConfirm: (kind: 'disable' | 'remove', profile: EmailProviderProfileSummaryDto) => void;
}>;

const EMPTY_PROFILE_FORM: ProfileForm = {
  displayName: '',
  smtpHost: '',
  smtpPort: '587',
  smtpUsername: '',
  credential: '',
  fromAddress: '',
  fromName: '',
  replyTo: '',
};
const INPUT_CLASS_NAME =
  'font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple block w-full p-2.5 rounded-none focus:outline-none focus:ring-4 focus:ring-brand-medium disabled:opacity-60 disabled:cursor-not-allowed';
const PRIMARY_BUTTON_CLASS_NAME =
  'cursor-pointer px-4 inline-flex gap-2 items-center justify-center text-white font-jost font-regular tracking-wider bg-main-purple hover:bg-hover-purple border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed';
const SECONDARY_BUTTON_CLASS_NAME =
  'cursor-pointer px-4 inline-flex items-center justify-center text-deep-purple font-jost font-regular tracking-wider bg-white hover:bg-faint-purple border border-purple focus:ring-4 focus:ring-brand-medium py-2 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed';
const DANGER_BUTTON_CLASS_NAME =
  'cursor-pointer px-4 inline-flex items-center justify-center text-red-700 font-jost font-regular tracking-wider bg-white hover:bg-red-50 border border-red-300 focus:ring-4 focus:ring-red-200 py-2 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed';
const SMTP_CONNECTION_OPTIONS = [
  { value: '465', label: 'Port 465 with implicit TLS' },
  { value: '587', label: 'Port 587 with STARTTLS' },
] as const;

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallbackMessage;
}

function toProfileForm(profile: EmailProviderProfileManagementDetailResponseDto): ProfileForm {
  return {
    displayName: profile.displayName,
    smtpHost: profile.smtpHost,
    smtpPort: profile.smtpPort === 465 ? '465' : '587',
    smtpUsername: profile.smtpUsername,
    credential: '',
    fromAddress: profile.fromAddress,
    fromName: profile.fromName ?? '',
    replyTo: profile.replyTo ?? '',
  };
}

function EmailProviderProfilesPage({ organisationId, token }: EmailProviderProfilesPageProps) {
  const [profiles, setProfiles] = useState<EmailProviderProfileSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProfile, setEditingProfile] =
    useState<EmailProviderProfileManagementDetailResponseDto | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(EMPTY_PROFILE_FORM);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await listEmailProviderProfiles(organisationId, token);
      setProfiles(response.items);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Email provider profiles could not be loaded.'));
    } finally {
      setIsLoading(false);
    }
  }, [organisationId, token]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const startCreate = () => {
    setEditingProfile(null);
    setProfileForm(EMPTY_PROFILE_FORM);
    setError(null);
    setSuccess(null);
    setIsEditorOpen(true);
  };

  const startEdit = async (profile: EmailProviderProfileSummaryDto) => {
    if (profile.organisationId === null) {
      return;
    }

    setPendingAction(`edit:${profile.id}`);
    setError(null);
    setSuccess(null);

    try {
      const detail = await getEmailProviderProfile(organisationId, profile.id, token);
      setEditingProfile(detail);
      setProfileForm(toProfileForm(detail));
      setIsEditorOpen(true);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Email provider profile details could not be loaded.'));
    } finally {
      setPendingAction(null);
    }
  };

  const closeEditor = () => {
    if (pendingAction === 'save') {
      return;
    }

    setIsEditorOpen(false);
    setEditingProfile(null);
    setProfileForm(EMPTY_PROFILE_FORM);
  };

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const smtpPort = profileForm.smtpPort === '465' ? 465 : 587;
    const profileInput: CreateEmailProviderProfileRequestDto = {
      displayName: profileForm.displayName,
      smtpHost: profileForm.smtpHost,
      smtpPort,
      smtpSecure: smtpPort === 465,
      smtpUsername: profileForm.smtpUsername,
      credential: profileForm.credential,
      fromAddress: profileForm.fromAddress,
      fromName: profileForm.fromName.trim() === '' ? null : profileForm.fromName,
      replyTo: profileForm.replyTo.trim() === '' ? null : profileForm.replyTo,
    };
    setPendingAction('save');

    try {
      if (editingProfile === null) {
        const parsedInput = createEmailProviderProfileRequestSchema.safeParse(profileInput);

        if (parsedInput.success === false) {
          setError(
            parsedInput.error.issues[0]?.message ?? 'Please check the SMTP profile details.',
          );
          return;
        }

        await createEmailProviderProfile(organisationId, parsedInput.data, token);
        await loadProfiles();
        setSuccess('SMTP profile added.');
      } else {
        const updateInput: UpdateEmailProviderProfileRequestDto = {
          displayName: profileInput.displayName,
        };

        if (editingProfile.inUse === false) {
          updateInput.smtpHost = profileInput.smtpHost;
          updateInput.smtpPort = profileInput.smtpPort;
          updateInput.smtpSecure = profileInput.smtpSecure;
          updateInput.smtpUsername = profileInput.smtpUsername;
          updateInput.fromAddress = profileInput.fromAddress;
          updateInput.fromName = profileInput.fromName;
          updateInput.replyTo = profileInput.replyTo;

          if (profileForm.credential !== '') {
            updateInput.credential = profileForm.credential;
          }
        }

        const parsedInput = updateEmailProviderProfileRequestSchema.safeParse(updateInput);

        if (parsedInput.success === false) {
          setError(
            parsedInput.error.issues[0]?.message ?? 'Please check the SMTP profile details.',
          );
          return;
        }

        await updateEmailProviderProfile(
          organisationId,
          editingProfile.id,
          parsedInput.data,
          token,
        );
        await loadProfiles();
        setSuccess('SMTP profile updated.');
      }

      setIsEditorOpen(false);
      setEditingProfile(null);
      setProfileForm(EMPTY_PROFILE_FORM);
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'The SMTP profile could not be saved.'));
    } finally {
      setPendingAction(null);
    }
  };

  const handleConnectionCheck = async (profile: EmailProviderProfileSummaryDto) => {
    setPendingAction(`check:${profile.id}`);
    setError(null);
    setSuccess(null);

    try {
      await checkEmailProviderProfileConnection(organisationId, profile.id, token);
      setSuccess(`Connection to ${profile.displayName} succeeded.`);
    } catch (connectionError) {
      setError(getErrorMessage(connectionError, 'SMTP connection verification failed.'));
    } finally {
      setPendingAction(null);
    }
  };

  const handleEnable = async (profile: EmailProviderProfileSummaryDto) => {
    setPendingAction(`enable:${profile.id}`);
    setError(null);
    setSuccess(null);

    try {
      await updateEmailProviderProfile(organisationId, profile.id, { status: 'ACTIVE' }, token);
      await loadProfiles();
      setSuccess(`${profile.displayName} enabled.`);
    } catch (updateError) {
      setError(getErrorMessage(updateError, 'The SMTP profile could not be enabled.'));
    } finally {
      setPendingAction(null);
    }
  };

  const openConfirmation = (
    kind: 'disable' | 'remove',
    profile: EmailProviderProfileSummaryDto,
  ) => {
    if (profile.inUse === true) {
      setError('Profiles used by Scheduled or Running simulations cannot be disabled or removed.');
      return;
    }

    setConfirmationError(null);
    setConfirmationAction({ kind, profile });
  };

  const handleConfirm = async () => {
    if (confirmationAction === null) {
      return;
    }

    const selectedAction = confirmationAction;
    setPendingAction(`${selectedAction.kind}:${selectedAction.profile.id}`);
    setConfirmationError(null);

    try {
      if (selectedAction.kind === 'disable') {
        await updateEmailProviderProfile(
          organisationId,
          selectedAction.profile.id,
          { status: 'DISABLED' },
          token,
        );
      } else {
        await removeEmailProviderProfile(organisationId, selectedAction.profile.id, token);
      }

      await loadProfiles();
      setConfirmationAction(null);
      setSuccess(
        selectedAction.kind === 'disable'
          ? `${selectedAction.profile.displayName} disabled.`
          : `${selectedAction.profile.displayName} removed.`,
      );
    } catch (actionError) {
      setConfirmationError(
        getErrorMessage(
          actionError,
          selectedAction.kind === 'disable'
            ? 'The SMTP profile could not be disabled.'
            : 'The SMTP profile could not be removed.',
        ),
      );
    } finally {
      setPendingAction(null);
    }
  };

  const isSaving = pendingAction === 'save';
  const isBusy = pendingAction !== null;
  const operationalFieldsDisabled = isSaving || editingProfile?.inUse === true;

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
            SMTP Details
          </h3>
          <p className="font-overpass text-[1.1rem] text-gray-500">
            Manage the SMTP profiles used to send organisation simulation emails.
          </p>
        </div>
        {!isEditorOpen && (
          <button
            type="button"
            onClick={startCreate}
            disabled={isBusy}
            className={PRIMARY_BUTTON_CLASS_NAME}
          >
            <span className="material-icons-sharp">add</span>
            <span>Add SMTP Profile</span>
          </button>
        )}
      </div>

      {error && (
        <BasicAlert variant="danger" onClose={() => setError(null)}>
          {error}
        </BasicAlert>
      )}
      {success && (
        <BasicAlert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </BasicAlert>
      )}

      {isEditorOpen && (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mt-6 border border-default bg-neutral-primary-soft p-4"
        >
          <h4 className="font-jost text-xl font-medium text-dark-pink">
            {editingProfile === null ? 'Add SMTP Profile' : 'Edit SMTP Profile'}
          </h4>
          {editingProfile?.inUse === true && (
            <p className="mt-2 border border-amber-300 bg-amber-50 p-3 font-overpass text-sm text-amber-900">
              This profile is in use. You can change its display name, but its connection and sender
              details must remain unchanged.
            </p>
          )}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField id="smtp-profile-display-name" label="Display Name">
              {(controlProps) => (
                <input
                  {...controlProps}
                  type="text"
                  placeholder="e.g. Microsoft 365"
                  value={profileForm.displayName}
                  maxLength={100}
                  disabled={isSaving}
                  onChange={(event) =>
                    setProfileForm({ ...profileForm, displayName: event.target.value })
                  }
                  className={INPUT_CLASS_NAME}
                />
              )}
            </FormField>
            <FormField id="smtp-profile-host" label="SMTP Host">
              {(controlProps) => (
                <input
                  {...controlProps}
                  type="text"
                  placeholder="e.g. smtp.example.com"
                  value={profileForm.smtpHost}
                  maxLength={253}
                  disabled={operationalFieldsDisabled}
                  onChange={(event) =>
                    setProfileForm({ ...profileForm, smtpHost: event.target.value })
                  }
                  className={INPUT_CLASS_NAME}
                />
              )}
            </FormField>
            <SelectField
              id="smtp-profile-connection"
              label="SMTP Connection"
              value={profileForm.smtpPort}
              options={SMTP_CONNECTION_OPTIONS}
              onChange={(value) =>
                setProfileForm({ ...profileForm, smtpPort: value === '465' ? '465' : '587' })
              }
              disabled={operationalFieldsDisabled}
            />
            <FormField id="smtp-profile-username" label="SMTP Username">
              {(controlProps) => (
                <input
                  {...controlProps}
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. smtp-user@example.com"
                  value={profileForm.smtpUsername}
                  maxLength={320}
                  disabled={operationalFieldsDisabled}
                  onChange={(event) =>
                    setProfileForm({ ...profileForm, smtpUsername: event.target.value })
                  }
                  className={INPUT_CLASS_NAME}
                />
              )}
            </FormField>
            <FormField
              id="smtp-profile-credential"
              label={editingProfile === null ? 'SMTP Credential' : 'Replacement SMTP Credential'}
              helperText={
                editingProfile === null
                  ? 'Required. The credential is stored separately and is never displayed again.'
                  : 'Leave blank to keep the current credential.'
              }
            >
              {(controlProps) => (
                <input
                  {...controlProps}
                  type="password"
                  autoComplete="new-password"
                  placeholder={
                    editingProfile === null
                      ? 'Enter an SMTP password or app password'
                      : 'Leave blank to keep the current credential'
                  }
                  value={profileForm.credential}
                  maxLength={4096}
                  disabled={operationalFieldsDisabled}
                  onChange={(event) =>
                    setProfileForm({ ...profileForm, credential: event.target.value })
                  }
                  className={INPUT_CLASS_NAME}
                />
              )}
            </FormField>
            <FormField id="smtp-profile-from-address" label="From Address">
              {(controlProps) => (
                <input
                  {...controlProps}
                  type="email"
                  placeholder="e.g. security-training@example.com"
                  value={profileForm.fromAddress}
                  maxLength={254}
                  disabled={operationalFieldsDisabled}
                  onChange={(event) =>
                    setProfileForm({ ...profileForm, fromAddress: event.target.value })
                  }
                  className={INPUT_CLASS_NAME}
                />
              )}
            </FormField>
            <FormField id="smtp-profile-from-name" label="From Name" helperText="Optional">
              {(controlProps) => (
                <input
                  {...controlProps}
                  type="text"
                  placeholder="e.g. Security Training"
                  value={profileForm.fromName}
                  maxLength={100}
                  disabled={operationalFieldsDisabled}
                  onChange={(event) =>
                    setProfileForm({ ...profileForm, fromName: event.target.value })
                  }
                  className={INPUT_CLASS_NAME}
                />
              )}
            </FormField>
            <FormField id="smtp-profile-reply-to" label="Reply-to Address" helperText="Optional">
              {(controlProps) => (
                <input
                  {...controlProps}
                  type="email"
                  placeholder="e.g. replies@example.com"
                  value={profileForm.replyTo}
                  maxLength={254}
                  disabled={operationalFieldsDisabled}
                  onChange={(event) =>
                    setProfileForm({ ...profileForm, replyTo: event.target.value })
                  }
                  className={INPUT_CLASS_NAME}
                />
              )}
            </FormField>
          </div>
          <div className="mt-6 flex justify-end gap-4">
            <button
              type="button"
              onClick={closeEditor}
              disabled={isSaving}
              className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-gray-700 font-jost text-[1.2rem] font-regular tracking-wider bg-gray-100 hover:bg-gray-200 box-border border border-gray-300 focus:ring-2 focus:ring-gray-300 leading-5 text-sm py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-icons-sharp">close</span>
              <span>Cancel</span>
            </button>
            <button type="submit" disabled={isSaving} className={PRIMARY_BUTTON_CLASS_NAME}>
              <span className="material-icons-sharp">{isSaving ? 'sync' : 'save'}</span>
              <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      )}

      <AdminTableContainer className="mt-6">
        <AdminTable aria-label="SMTP provider profiles">
          <AdminTableHeader>
            <tr>
              <AdminTableHeaderCell>Profile</AdminTableHeaderCell>
              <AdminTableHeaderCell>Sender</AdminTableHeaderCell>
              <AdminTableHeaderCell>Status</AdminTableHeaderCell>
              <AdminTableHeaderCell>Usage</AdminTableHeaderCell>
              <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
            </tr>
          </AdminTableHeader>
          <tbody className="font-overpass font-regular text-[1rem] tracking-wide">
            {isLoading && (
              <AdminTableLoadingRow colSpan={5}>
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinnerSVG /> Loading SMTP profiles...
                </span>
              </AdminTableLoadingRow>
            )}
            {!isLoading && profiles.length === 0 && (
              <AdminTableEmptyRow colSpan={5}>No SMTP profiles are available.</AdminTableEmptyRow>
            )}
            {!isLoading &&
              profiles.map((profile) => {
                const isPlatformProfile = profile.organisationId === null;
                return (
                  <tr
                    key={profile.id}
                    className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default"
                  >
                    <AdminTableCell>
                      <div className="font-medium text-deep-purple">{profile.displayName}</div>
                      <div className="text-gray-500">
                        {isPlatformProfile ? 'Platform profile' : 'Organisation profile'}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <TruncatedValue value={profile.fromAddress} />
                      <div className="mt-1 text-gray-500">
                        {profile.fromName ?? 'No sender name'}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <StatusBadge status={profile.status === 'ACTIVE' ? 'Active' : 'Disabled'} />
                    </AdminTableCell>
                    <AdminTableCell>
                      <span className={profile.inUse ? 'text-amber-700' : 'text-gray-600'}>
                        {profile.inUse ? 'In use' : 'Not in use'}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell>
                      <EmailProviderProfileActions
                        profile={profile}
                        pendingAction={pendingAction}
                        isBusy={isBusy}
                        onEdit={startEdit}
                        onConnectionCheck={handleConnectionCheck}
                        onEnable={handleEnable}
                        onConfirm={openConfirmation}
                      />
                    </AdminTableCell>
                  </tr>
                );
              })}
          </tbody>
        </AdminTable>
      </AdminTableContainer>

      {confirmationAction !== null && (
        <BasicConfirmationModal
          title={
            confirmationAction.kind === 'disable' ? 'Disable SMTP profile' : 'Remove SMTP profile'
          }
          message={
            confirmationAction.kind === 'disable'
              ? `${confirmationAction.profile.displayName} will no longer be available for new simulations.`
              : `${confirmationAction.profile.displayName} and its stored credential will be removed.`
          }
          confirmButtonText={confirmationAction.kind === 'disable' ? 'Disable' : 'Remove'}
          onConfirm={() => void handleConfirm()}
          onCancel={() => {
            if (pendingAction === null) {
              setConfirmationAction(null);
              setConfirmationError(null);
            }
          }}
          confirmButtonVariant="danger"
          isConfirming={pendingAction !== null}
          isConfirmDisabled={pendingAction !== null}
          isDismissDisabled={pendingAction !== null}
          errorMessage={confirmationError}
        />
      )}
    </section>
  );
}

function EmailProviderProfileActions({
  profile,
  pendingAction,
  isBusy,
  onEdit,
  onConnectionCheck,
  onEnable,
  onConfirm,
}: EmailProviderProfileActionsProps) {
  if (profile.organisationId === null) {
    return <span className="text-gray-500">Managed by the platform</span>;
  }

  const rowIsBusy = pendingAction?.endsWith(profile.id) === true;
  const inUseTitle = profile.inUse
    ? 'This profile is used by a Scheduled or Running simulation.'
    : undefined;
  const connectionButtonText =
    pendingAction === `check:${profile.id}` ? 'Checking...' : 'Check Connection';
  const enableButtonText = pendingAction === `enable:${profile.id}` ? 'Enabling...' : 'Enable';
  const statusAction =
    profile.status === 'ACTIVE' ? (
      <button
        type="button"
        onClick={() => onConfirm('disable', profile)}
        disabled={isBusy || profile.inUse}
        title={inUseTitle}
        className={SECONDARY_BUTTON_CLASS_NAME}
      >
        Disable
      </button>
    ) : (
      <button
        type="button"
        onClick={() => void onEnable(profile)}
        disabled={isBusy}
        className={SECONDARY_BUTTON_CLASS_NAME}
      >
        {enableButtonText}
      </button>
    );

  return (
    <AdminTableActions className="flex-wrap">
      <button
        type="button"
        onClick={() => void onEdit(profile)}
        disabled={isBusy || rowIsBusy}
        className={SECONDARY_BUTTON_CLASS_NAME}
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => void onConnectionCheck(profile)}
        disabled={isBusy || rowIsBusy}
        className={SECONDARY_BUTTON_CLASS_NAME}
      >
        {connectionButtonText}
      </button>
      {statusAction}
      <button
        type="button"
        onClick={() => onConfirm('remove', profile)}
        disabled={isBusy || profile.inUse}
        title={inUseTitle}
        className={DANGER_BUTTON_CLASS_NAME}
      >
        Remove
      </button>
    </AdminTableActions>
  );
}

export default EmailProviderProfilesPage;
