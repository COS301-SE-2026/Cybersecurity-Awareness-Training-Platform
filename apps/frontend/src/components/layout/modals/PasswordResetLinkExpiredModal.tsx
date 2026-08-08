import { useState, useEffect } from 'react';
import BackToLoginButton from '../../BackToLoginButton';
import LoadingSpinnerSVG from '../../LoadingSpinnerSVG';

type PasswordResetLinkErrorType = 'Expired' | 'Invalid' | 'Used' | 'Revoked' | 'Missing';

type PasswordResetLinkExpiredModalProps = Readonly<{
  isOpen: boolean;
  errorType: PasswordResetLinkErrorType;
  onRequestNewLink: () => void;
}>;

function PasswordResetLinkExpiredModal({
  isOpen,
  errorType,
  onRequestNewLink,
}: PasswordResetLinkExpiredModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setTimeout(() => {
      setCooldown((current) => current - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldown]);

  function handleRequestNewLink() {
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setCooldown(30);
      onRequestNewLink();
    }, 2000);
  }
  if (!isOpen) return null;

  let buttonText = 'Request New Password Reset Link';
  let countdownText = '';
  if (isLoading) {
    buttonText = 'Requesting New Password Reset Link...';
  } else if (cooldown > 0) {
    buttonText = 'Request New Password Reset Link ';
    countdownText = `(${cooldown})`;
  }

  return (
    <div
      id="select-modal"
      tabIndex={-1}
      aria-hidden={!isOpen}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xl"
    >
      <div className="relative p-4 w-full max-w-md">
        <div className="relative bg-white-purple border border-default shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between border-b border-default pb-4 md:pb-5">
            {/* HEADING */}
            <h3 className="font-jost text-3xl text-red-600 tracking-wider font-medium text-heading">
              Password Reset Link {errorType}
            </h3>
          </div>
          <div className="pt-4 md:pt-6">
            {/* SUB-HEADING */}
            <p className="font-overpass text-left text-regular text-[1.1rem] tracking-wider text-purple mb-2">
              This <span className="font-semibold">password reset link</span> is{' '}
              <strong>no longer valid</strong> because it has either <em>expired</em>,{' '}
              <em>is invalid</em>, <em>has already been used</em>, or it <em>has been revoked</em>.
            </p>

            <p className="font-overpass text-left text-regular text-[1.1rem] tracking-wider text-pink mb-4">
              You can requested a new <span className="font-semibold">password reset link</span> by
              clicking <em>"Request New Password Reset Link"</em> below.
            </p>

            <button
              type="submit"
              disabled={isLoading || cooldown > 0}
              onClick={handleRequestNewLink}
              className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading && <LoadingSpinnerSVG />}

              <span>
                {buttonText}
                {countdownText && (
                  <span className="inline-block w-10 text-center">{countdownText}</span>
                )}
              </span>
            </button>

            {/* BACK TO LOGIN LINK */}
            <BackToLoginButton />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PasswordResetLinkExpiredModal;
