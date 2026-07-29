import { emailSchema } from '@insightful-phish/shared';
import { useState } from 'react';
import BasicAlert from '../alerts/BasicAlert';
import { requestAccountEmailChange, extractErrorMessage } from '../../services/account.service';

function formatAlertMessage(message: string) {
  return message
    .replace(/\.$/, '')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

type ChangeEmailModalProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  currentEmail?: string;
  onSuccess?: (message: string) => void;
}>;

function ChangeEmailModal({ isOpen, onClose, onSuccess }: ChangeEmailModalProps) {
  const [newEmail, setNewEmail] = useState('');
  const [confirmNewEmail, setConfirmNewEmail] = useState('');
  const [password, setPassword] = useState('');

  const [alertMessage, setAlertMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  function validate() {
    setAlertMessage('');

    const emailResult = emailSchema.safeParse(newEmail);
    if (emailResult.success === false) {
      setAlertMessage(formatAlertMessage(emailResult.error.issues[0]?.message ?? 'Invalid Input'));
      return false;
    }

    if (confirmNewEmail === '') {
      setAlertMessage('Please Confirm Your New Email Address');
      return false;
    }

    if (newEmail !== confirmNewEmail) {
      setAlertMessage('Email Addresses Do Not Match');
      return false;
    }

    if (password.trim() === '') {
      setAlertMessage('Please Enter Your Password');
      return false;
    }

    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await requestAccountEmailChange({
        newEmail: newEmail.trim(),
        confirmNewEmail: confirmNewEmail.trim(),
        password,
      });
      setIsSubmitting(false);

      if (res.emailQueued === false) {
        setAlertMessage(
          'Verification email delivery failed. Please check the email address and try again.',
        );
        return;
      }

      onClose();
      if (onSuccess) {
        onSuccess(
          res.message ||
            'Verification email sent to new address. Please verify to complete email change.',
        );
      }
    } catch (err: unknown) {
      setIsSubmitting(false);
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
              Change Email Address
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
            <p className="font-overpass text-left text-regular text-[1.1rem] tracking-wider text-dark-pink mb-1">
              Provide a new email address and enter your password to change the email address
              associated with your account.
            </p>

            <p className="font-overpass text-left text-regular text-[0.8rem] tracking-wider text-gray-400">
              You will need to verify your new email address before it can be used to sign in to
              your account. A verification link will be sent to your new email address.
            </p>

            <p className="font-overpass text-left text-regular text-[0.8rem] tracking-wider text-gray-400 mb-4">
              Upon successfully changing your email address, you will be logged out of all active
              sessions.
            </p>

            {/* NEW EMAIL INPUT */}
            <div className="mb-6">
              <label
                htmlFor="new-email-address"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                New Email Address
              </label>
              <input
                required
                type="email"
                name="new-email-address"
                id="new-email-address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter a New Email Address"
              />
            </div>

            {/* CONFIRM NEW EMAIL ADDRESS */}
            <div className="mb-6">
              <label
                htmlFor="confirm-new-email-address"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                Confirm New Email Address
              </label>
              <input
                required
                type="email"
                name="confirm-new-email-address"
                id="confirm-new-email-address"
                value={confirmNewEmail}
                onChange={(e) => setConfirmNewEmail(e.target.value)}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Re-Enter New Email Address"
              />
            </div>

            {/* PASSWORD */}
            <div className="mb-6">
              <label
                htmlFor="password"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                Enter your Password
              </label>
              <input
                required
                type="password"
                name="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter your Password"
              />
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-50"
            >
              <span className="material-symbols-sharp mr-4">edit</span>
              <span> {isSubmitting ? 'Changing Email...' : 'Change Email Address'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChangeEmailModal;
