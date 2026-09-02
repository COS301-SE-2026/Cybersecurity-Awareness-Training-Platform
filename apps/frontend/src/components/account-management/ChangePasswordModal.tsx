import { passwordSchema } from '@insightful-phish/shared';
import { useState } from 'react';
import BasicAlert from '../alerts/BasicAlert';
import { changeAccountPassword, extractErrorMessage } from '../../services/account.service';

type ChangePasswordModalProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onApiError?: (err: unknown) => boolean;
}>;

function formatAlertMessage(message: string) {
  return message
    .replace(/\.$/, '')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function ChangePasswordModal({ isOpen, onClose, onSuccess, onApiError }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [alertMessage, setAlertMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  function validate() {
    setAlertMessage('');

    if (currentPassword.trim() === '') {
      setAlertMessage('Please Enter Your Current Password');
      return false;
    }

    if (newPassword.trim() === '') {
      setAlertMessage('Please Enter A New Password');
      return false;
    }

    if (confirmNewPassword.trim() === '') {
      setAlertMessage('Please Confirm Your New Password');
      return false;
    }

    const newPasswordResult = passwordSchema.safeParse(newPassword);
    if (newPasswordResult.success === false) {
      setAlertMessage(
        formatAlertMessage(newPasswordResult.error.issues[0]?.message ?? 'Invalid Input'),
      );
      return false;
    }

    if (newPassword !== confirmNewPassword) {
      setAlertMessage('New Passwords Do Not Match');
      return false;
    }

    if (newPassword === currentPassword) {
      setAlertMessage('New Password Cannot Be The Same As The Current Password');
      return false;
    }

    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await changeAccountPassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      setIsSubmitting(false);
      onClose();
      if (onSuccess) {
        onSuccess(
          res.message || 'Password changed successfully. All active sessions have been logged out.',
        );
      }
      // Password change revokes all active sessions. Clear stored auth state and redirect to login page immediately.
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login?notice=password_changed';
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (onApiError?.(err)) return;
      setAlertMessage(formatAlertMessage(extractErrorMessage(err)));
    }
  }

  return (
    <div
      id="select-modal"
      tabIndex={-1}
      aria-hidden="true"
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-xl"
    >
      <div className="relative p-4 w-full max-w-md">
        <div className="relative bg-white-purple border border-default shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between border-b border-default pb-2 md:pb-2">
            {/* HEADING */}
            <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading">
              Change Password
            </h3>

            {/* CLOSE MODAL BUTTON */}
            <button
              type="button"
              className="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading text-sm w-9 h-9 ms-auto inline-flex justify-center items-center"
              onClick={onClose}
            >
              <span className="material-icons-sharp">close</span>
              <span className="sr-only">Close modal</span>
            </button>
          </div>

          {/* BASIC ALERT  */}
          {alertMessage && (
            <BasicAlert variant="danger" onClose={() => setAlertMessage('')}>
              {alertMessage}
            </BasicAlert>
          )}

          <div className="pt-4 pb-2">
            {/* SUB-HEADING */}
            <p className="font-overpass text-left text-regular text-[1.1rem] tracking-wider text-dark-pink mb-2">
              Provide your current password and choose a new password to change the password
              associated with your account.
            </p>

            <p className="font-overpass text-left text-regular text-[1rem] tracking-wider text-gray-500 mb-1">
              <em>
                If you cannot remember your current password, please go to the{' '}
                <a href="/login">
                  <strong>Login Page</strong>
                </a>{' '}
                and click{' '}
                <a href="/forgot-password">
                  <strong>"Forgot Password"</strong>.
                </a>
              </em>
            </p>

            <p className="font-overpass text-left text-regular text-[0.8rem] tracking-wider text-gray-400 mb-4">
              Upon successfully changing your password, all active sessions will be logged out.
            </p>

            {/* CURRENT PASSWORD */}
            <div className="mb-6">
              <label
                htmlFor="current-password"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                Enter Current Password
              </label>
              <input
                required
                type="password"
                name="current-password"
                id="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                placeholder="Enter your Current Password"
              />
            </div>

            {/* NEW PASSWORD */}
            <div className="mb-6">
              <label
                htmlFor="new-password"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                Enter New Password
              </label>
              <input
                required
                type="password"
                name="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                placeholder="Enter a New Password"
              />
            </div>

            {/* CONFIRM NEW PASSWORD */}
            <div className="mb-6">
              <label
                htmlFor="confirm-new-password"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                Confirm New Password
              </label>
              <input
                required
                type="password"
                name="confirm-new-password"
                id="confirm-new-password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                placeholder="Re-Enter New Password"
              />
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-50"
            >
              <span className="material-symbols-sharp mr-4">edit</span>
              <span> {isSubmitting ? 'Changing Password...' : 'Change Password'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChangePasswordModal;
