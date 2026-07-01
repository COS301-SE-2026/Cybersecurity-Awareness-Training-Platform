import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Popover } from 'flowbite-react';
type EmailVerificationModalProps = Readonly<{
  isOpen: boolean;
  email: string;
  accountDescription: string;
  onResend: () => void;
}>;

function EmailVerificationModal({
  isOpen,
  email,
  accountDescription,
  onResend,
}: EmailVerificationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setTimeout(() => {
      setCooldown((current) => current - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldown]);

  function handleResend() {
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setCooldown(30);
      onResend();
    }, 2000);
  }
  if (!isOpen) return null;

  let buttonText = 'Resend Email Verification Link';
  let countdownText = '';
  if (isLoading) {
    buttonText = 'Sending Email Verification Link...';
  } else if (cooldown > 0) {
    buttonText = 'Resend Email Verification Link ';
    countdownText = `(${cooldown})`;
  }

  const noEmailInformation = (
    <div className="w-145 bg-faint-purple shadow-xl">
      <div className="bg-gray-100 bg-light-purple px-3 py-2">
        <h3 className="font-semibold font-jost text-[1.4rem] text-purple tracking-wider">
          Email Address Verification Help
        </h3>
      </div>

      <p className="tracking-wider px-3 mt-2 text-sm font-jost font-medium text-[1.2rem] text-pink">
        If you didn't receive an <span className="font-semibold">Email Verification Link</span>:
      </p>

      <div className="px-3 py-2 tracking-wider">
        <div className="flex items-start gap-3">
          <span className="text-dark-pink -mt-1">●</span>
          <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink mb-2">
            Allow a few minutes for the email message to arrive.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-dark-pink -mt-1">●</span>
          <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink mb-2">
            Check your <strong>Spam</strong> or <strong>Junk</strong> folder(s).
          </p>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-dark-pink -mt-1">●</span>
          <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink mb-2">
            You may already have an account associated with the email address you provided. If so,
            please{' '}
            <strong>
              <em>Log In</em>
            </strong>{' '}
            instead.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-dark-pink -mt-1">●</span>
          <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink mb-2">
            If you are unable to Log In, use{' '}
            <strong>
              <em>Forgot Password</em>
            </strong>{' '}
            to reset your password before attempting to Register again.
          </p>
        </div>
      </div>
    </div>
  );

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
            <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading">
              Check your Email Inbox
            </h3>
          </div>
          <div className="pt-4 md:pt-6">
            {/* SUB-HEADING */}
            <p className="font-overpass text-left text-regular text-[1.1rem] tracking-wider text-purple mb-2">
              If an{' '}
              <em>
                <strong>{accountDescription}</strong>
              </em>{' '}
              account can be registered with the information you provided, an{' '}
              <strong>Email Verification Link</strong> will be sent to the following email address:
            </p>

            <p className="font-google_sans_code text-left font-regular text-[1.2rem] tracking-wider text-gray-600 mb-4">
              <span>{email}</span>
            </p>

            <p className="font-overpass text-left font-bold text-[1.1rem] tracking-wider text-pink mb-2">
              <strong>
                Please follow the instructions in the email to <em>VERIFY</em> your email address
                before attempting to Log In.
              </strong>
            </p>

            <div className="flex items-start gap-2 mt-4">
              <Popover
                content={noEmailInformation}
                arrow={false}
                theme={{
                  base: 'rounded-none bg-transparent border-0 shadow-xl absolute z-20 inline-block w-max max-w-[100vw] outline-none',
                  content: 'relative overflow-hidden rounded-none',
                }}
              >
                <span
                  className="material-icons-outlined cursor-pointer text-dark-pink"
                  style={{ fontSize: '1.8rem' }}
                >
                  info
                </span>
              </Popover>

              <p className="font-jost text-left font-medium text-[1.1rem] tracking-wider text-dark-pink mb-4">
                Didn't Receive an <span className="font-semibold">Email Verification Link</span>?
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || cooldown > 0}
              onClick={handleResend}
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

              <span>
                {buttonText}
                {countdownText && (
                  <span className="inline-block w-10 text-center">{countdownText}</span>
                )}
              </span>
            </button>

            <Link
              to="/login"
              className="mt-3 -ml-1 inline-flex items-center gap-2 font-jost text-xl font-regular tracking-wide text-purple hover:text-purple cursor-pointer transition-colours"
            >
              <span className="material-icons-sharp">arrow_back</span>
              <span> Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailVerificationModal;
