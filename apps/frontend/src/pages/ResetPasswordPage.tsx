import { Link } from 'react-router-dom';
import BasicAlert from '../components/alerts/BasicAlert';
import { useState } from 'react';
import { authResetPasswordRequestSchema } from '@insightful-phish/shared';
import SuccessfulPasswordResetModal from '../components/layout/modals/SuccessfulPasswordResetModal';
import { Popover } from 'flowbite-react';
import PasswordResetLinkExpiredModal from '../components/layout/modals/PasswordResetLinkExpiredModal';

function formatAlertMessage(message: string) {
  // makes everything title case and removes the . from the end of the message
  return message
    .replace(/\.$/, '')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function ResetPasswordPage() {
  const [alertMessage, setAlertMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessfulPasswordResetModal, setShowSuccessfulPasswordResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswordResetLinkExpiredModal, setShowPasswordResetLinkExpiredModal] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlertMessage('');

    const validationResult = authResetPasswordRequestSchema.safeParse({
      token: 'temporary-reset-token-for-frontend-validation-only',
      newPassword,
      confirmNewPassword,
    });

    if (!validationResult.success) {
      setAlertMessage(
        formatAlertMessage(validationResult.error.issues[0].message) || 'Unable To Reset Password',
      );
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setShowSuccessfulPasswordResetModal(true);
    }, 2000);
  }

  let buttonText = 'Reset Password';
  if (isLoading) {
    buttonText = 'Resetting Password...';
  }

  const passwordPolicyPopover = (
    <div className="w-100 bg-faint-purple shadow-lg">
      <div className="bg-gray-100 bg-purple px-3 py-2">
        <h3 className="font-semibold font-jost text-[1.4rem] text-white tracking-wider">
          Password Requirements
        </h3>
      </div>

      <div className="px-3 py-2">
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Least 12 Characters
        </p>
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Most 128 Characters
        </p>
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Least ONE Uppercase Letter (A–Z)
        </p>
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Least ONE Lowercase Letter (a–z)
        </p>
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Least ONE Number (0–9)
        </p>
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Least ONE Special Character (e.g. ! @ # $ %)
        </p>
      </div>
    </div>
  );

  return (
    <section className="bg-light-purple dark:bg-gray-900">
      {/* SUCCESSFUL PASSWORD RESET INDICATION MODAL */}
      <SuccessfulPasswordResetModal isOpen={showSuccessfulPasswordResetModal} />

      {/* PASSWORD RESET LINK EXPIRED MODAL  */}
      <PasswordResetLinkExpiredModal
        isOpen={showPasswordResetLinkExpiredModal}
        errorType="Invalid" // See PasswordResetLinkExpiredModal.tsx for LIST...
        onRequestNewLink={() => {
          // REDIRECT TO FORGOT PASSWORD or TRIGGER REQUEST NEW LINK FLOW...
        }}
      />

      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        {/* LOGO  */}
        {alertMessage && (
          <BasicAlert variant="danger" onClose={() => setAlertMessage('')}>
            {alertMessage}
          </BasicAlert>
        )}

        <div className="mb-4 flex items-center space-x-3 rtl:space-x-reverse">
          <img src="/Phish Logo Light.png" className="h-14" alt="Insightful Phish Logo" />
          <span className="flex items-center gap-2 mt-2">
            <span className="font-overpass self-center text-[1.94rem] text-pink text-heading font-medium whitespace-nowrap tracking-wide">
              Insightful
            </span>
            <span className="font-overpass self-center text-[1.94rem] text-pink text-heading font-black whitespace-nowrap tracking-wide">
              Phish.
            </span>
          </span>
        </div>

        <div className="w-full p-6 bg-white-purple shadow dark:border md:mt-0 sm:max-w-md dark:bg-gray-800 dark:border-gray-700 sm:p-8">
          {/* HEADING */}
          <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading">
            Reset your Password
          </h3>

          {/* SUB-HEADING */}
          <p className="font-regular tracking-wide text-[1.1rem] font-justify font-jost mt-1 text-dark-pink">
            Enter and confirm your new password to complete the password reset process.
          </p>

          <form className="mt-4 space-y-4 lg:mt-5 md:space-y-5" onSubmit={handleSubmit} noValidate>
            {/* PASSWORD INPUT */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="new-password"
                  className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
                >
                  New Password
                </label>

                <Popover
                  content={passwordPolicyPopover}
                  arrow={false}
                  theme={{
                    base: 'rounded-none bg-transparent border-0 shadow-xl absolute z-20 inline-block w-max max-w-[100vw] outline-none',
                    content: 'relative overflow-hidden rounded-none',
                  }}
                >
                  <span
                    className="material-icons-outlined mb-2 cursor-pointer text-pink"
                    style={{ fontSize: '1.6rem' }}
                  >
                    info
                  </span>
                </Popover>
              </div>
              <input
                type="password"
                name="newPassword"
                disabled={isLoading}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                id="new-password"
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter a New Password"
              />
            </div>

            {/* CONFIRM PASSWORD INPUT */}
            <div>
              <label
                htmlFor="confirm-new-password"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmNewPassword"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                disabled={isLoading}
                id="confirm-new-password"
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Re-Enter New Password"
              />
            </div>

            {/* RESET PASSWORD BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading && (
                <svg
                  aria-hidden="true"
                  className="mr-3 h-5 w-5 animate-spin fill-white text-white/30"
                  viewBox="0 0 100 101"
                  fill="none"
                >
                  <path
                    d="M100 50.6C100 78.2 77.6 100.6 50 100.6C22.4 100.6 0 78.2 0 50.6C0 23 22.4 0.6 50 0.6C77.6 0.6 100 23 100 50.6Z"
                    fill="currentColor"
                  />
                  <path
                    d="M93.97 39.04C96.39 38.4 97.86 35.91 97.01 33.55C95.29 28.82 92.87 24.37 89.82 20.35C85.84 15.12 80.88 10.72 75.21 7.41C69.54 4.1 63.27 1.94 56.77 1.05C51.77 0.37 46.7 0.45 41.73 1.28C39.26 1.69 37.81 4.2 38.45 6.62C39.08 9.04 41.57 10.47 44.05 10.11C47.85 9.56 51.72 9.53 55.54 10.23C60.86 11 65.99 12.78 70.63 15.47C75.27 18.16 79.33 21.7 82.58 25.84C84.91 28.81 86.8 32.13 88.18 35.68C89.08 38.01 91.54 39.68 93.97 39.04Z"
                    fill="currentFill"
                  />
                </svg>
              )}
              <span>{buttonText}</span>
            </button>

            {/* BACK TO LOGIN */}
            <Link
              to="/login"
              className="-mt-4 inline-flex items-center gap-2 font-jost text-xl font-regular tracking-wide text-purple hover:text-purple cursor-pointer transition-colours"
            >
              <span className="material-icons-sharp">arrow_back</span>
              <span> Back to Login</span>
            </Link>
          </form>
        </div>
      </div>
    </section>
  );
}

export default ResetPasswordPage;
