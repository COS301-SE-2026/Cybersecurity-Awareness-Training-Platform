import { useState } from 'react';
import ChangeEmailModal from './ChangeEmailModal';
import ChangePasswordModal from './ChangePasswordModal';
import BasicAlert from '../alerts/BasicAlert';
import { ReadOnlyField } from '../ui/FormField';
import {
  type AccountProfileResponse,
  type AccountCapabilitiesResponse,
  type AccountDeletionBlockedReasonDto,
} from '../../services/account.service';

type AccountSettingsPageProps = Readonly<{
  profile?: AccountProfileResponse | null;
  capabilities?: AccountCapabilitiesResponse | null;
  onNotification?: (message: string) => void;
  onRefresh?: () => void;
  onApiError?: (err: unknown) => boolean;
}>;

function getDeleteAccountUnavailableReason(
  blockedReason?: AccountDeletionBlockedReasonDto | string | null,
): string {
  switch (blockedReason) {
    case 'PLATFORM_SELF_DELETION_NOT_SUPPORTED':
      return 'Platform accounts do not support self-deletion.';
    case 'ORGANISATION_ADMIN_MANAGED':
      return 'Account deletion is managed by another organisation administrator.';
    case 'ORGANISATION_TRAINEE_MANAGED':
      return 'Account deletion is managed by your organisation administrator.';
    case 'SELF_DELETION_NOT_SUPPORTED':
      return 'Account self-deletion is currently unavailable.';
    default:
      return 'Account deletion is currently unavailable.';
  }
}

function AccountSettingsPage({
  profile,
  capabilities,
  onNotification,
  onRefresh,
  onApiError,
}: AccountSettingsPageProps) {
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const canRequestEmailChange = capabilities?.canRequestEmailChange ?? true;
  const canDeleteAccount = capabilities?.canDeleteAccount ?? false;
  const deleteAccountUnavailableReason = getDeleteAccountUnavailableReason(
    capabilities?.blockedReasons?.deleteAccount,
  );

  function handleEmailSuccess(msg: string) {
    setShowChangeEmailModal(false);
    if (onNotification) onNotification(msg);
    if (onRefresh) onRefresh();
  }

  function handlePasswordSuccess(msg: string) {
    setShowChangePasswordModal(false);
    if (onNotification) onNotification(msg);
    if (onRefresh) onRefresh();
  }

  return (
    <div className="-mt-2 -ml-2">
      {/* HEADING */}
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Account Settings
      </h3>

      {/* Change Email Address Modal */}
      <ChangeEmailModal
        isOpen={showChangeEmailModal}
        currentEmail={profile?.email}
        onClose={() => setShowChangeEmailModal(false)}
        onSuccess={handleEmailSuccess}
        onApiError={onApiError}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSuccess={handlePasswordSuccess}
        onApiError={onApiError}
      />

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost text-gray-500 mb-6">
        Settings and security controls associated with your account on the platform.
      </p>

      {alertMessage && (
        <BasicAlert variant="danger" onClose={() => setAlertMessage('')}>
          {alertMessage}
        </BasicAlert>
      )}

      {/* NORMAL ACCOUNT SETTINGS */}
      <div className="mb-6 max-w-xl">
        <div className="flex items-start gap-4">
          <ReadOnlyField
            id="email-address"
            label="Email Address"
            value={profile?.email}
            helperText={
              canRequestEmailChange
                ? 'Use Change Email to request a verified email address update.'
                : 'Email change is managed by organisation policy.'
            }
            className="min-w-0 flex-1"
          />

          <div className="pt-8">
            <button
              type="button"
              disabled={!canRequestEmailChange}
              onClick={() => setShowChangeEmailModal(true)}
              className="cursor-pointer whitespace-nowrap px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-2.5 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-sharp">mail</span>
              <span>Change Email</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mb-8 max-w-xl">
        <h4 className="block mb-2 font-jost tracking-wide text-[1.2rem] font-regular text-dark-pink">
          Password
        </h4>
        <p className="font-overpass text-xs text-gray-600 mb-3">
          Manage your account password and security credentials.
        </p>
        <button
          type="button"
          onClick={() => setShowChangePasswordModal(true)}
          className="cursor-pointer whitespace-nowrap px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-2.5 focus:outline-none"
        >
          <span className="material-symbols-sharp">key</span>
          <span>Change Password</span>
        </button>
      </div>

      {/* DANGER ZONE */}
      <div className="mt-8 p-4 bg-white border border-red-200 shadow-xs font-overpass max-w-2xl">
        <h4 className="text-lg font-medium text-red-600 font-jost mb-1">Danger Zone</h4>
        <p className="text-sm text-gray-600 mb-4">
          Permanently remove your account and all associated personal data from the platform. This
          action cannot be undone.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={!canDeleteAccount}
            className="cursor-not-allowed whitespace-nowrap px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-red-600 box-border border border-transparent focus:ring-4 focus:ring-red-300 shadow-xs leading-5 text-sm py-2.5 focus:outline-none disabled:opacity-50"
          >
            <span className="material-symbols-sharp">delete</span>
            <span>Delete Account</span>
          </button>
          {!canDeleteAccount && (
            <span className="text-xs text-gray-500 font-overpass">
              {deleteAccountUnavailableReason}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default AccountSettingsPage;
