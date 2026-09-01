import { useState } from 'react';
import ChangeEmailModal from './ChangeEmailModal';
import ChangePasswordModal from './ChangePasswordModal';
import BasicAlert from '../alerts/BasicAlert';
import { ReadOnlyField } from '../ui/FormField';
import {
  type AccountProfileResponse,
  type AccountCapabilitiesResponse,
} from '../../services/account.service';

type AccountSettingsPageProps = Readonly<{
  profile?: AccountProfileResponse | null;
  capabilities?: AccountCapabilitiesResponse | null;
  onNotification?: (message: string) => void;
  onRefresh?: () => void;
  onApiError?: (err: unknown) => boolean;
}>;

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
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost text-gray-500 mb-4">
        Settings and security controls associated with your account on the platform.
      </p>

      {alertMessage && (
        <BasicAlert variant="danger" onClose={() => setAlertMessage('')}>
          {alertMessage}
        </BasicAlert>
      )}

      <div className="mb-6 max-w-lg">
        <div className="flex items-center gap-4">
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

      {/* FIELD 2: CHANGE PASSWORD */}
      <div className="mb-6 max-w-lg">
        <label
          htmlFor="password"
          className=" block mb-2 font-jost tracking-wide text-[1.2rem] font-regular text-dark-pink"
        >
          Password
        </label>

        <button
          type="button"
          onClick={() => setShowChangePasswordModal(true)}
          className="cursor-pointer whitespace-nowrap px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-2.5 focus:outline-none"
        >
          <span className="material-symbols-sharp">key</span>
          <span>Change Password</span>
        </button>
      </div>

      {/* FIELD 3: DELETE ACCOUNT */}
      <div className="mb-6 max-w-lg">
        <label
          htmlFor="delete-account"
          className=" block mb-2 font-jost tracking-wide text-[1.2rem] font-regular text-dark-pink"
        >
          Delete Account
        </label>

        <p className="font-overpass text-left text-regular text-[0.95rem] tracking-wider text-gray-500 mb-2">
          Permanently remove your account and all associated personal data from the platform.
        </p>

        <button
          type="button"
          disabled
          title="Account deletion is currently managed by your platform administrator."
          className="opacity-60 cursor-not-allowed whitespace-nowrap px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-red-600 box-border border border-transparent focus:outline-none"
        >
          <span className="material-symbols-sharp">delete</span>
          <span>Delete Account (Managed)</span>
        </button>
      </div>
    </div>
  );
}

export default AccountSettingsPage;
