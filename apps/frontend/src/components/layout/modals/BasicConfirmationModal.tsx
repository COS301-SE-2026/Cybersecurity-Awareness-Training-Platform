import { useEffect, useRef } from 'react';

type BasicConfirmationModalProps = Readonly<{
  title: string;
  message: string;
  confirmButtonText: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonVariant: 'danger' | 'success' | 'default';
  isConfirming?: boolean;
  isConfirmDisabled?: boolean;
  isDismissDisabled?: boolean;
  errorMessage?: string | null;
  appendQuestionMark?: boolean;
  passwordValue?: string;
  onPasswordChange?: (value: string) => void;
  passwordError?: string | null;
  confirmationValue?: string;
  onConfirmationChange?: (value: string) => void;
  expectedConfirmationText?: string;
}>;

function BasicConfirmationModal({
  title,
  message,
  confirmButtonText,
  onConfirm,
  onCancel,
  confirmButtonVariant,
  isConfirming = false,
  isConfirmDisabled = false,
  isDismissDisabled = false,
  errorMessage = null,
  appendQuestionMark = true,
  passwordValue,
  onPasswordChange,
  passwordError = null,
  confirmationValue,
  onConfirmationChange,
  expectedConfirmationText,
}: BasicConfirmationModalProps) {
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    (passwordInputRef.current ?? cancelButtonRef.current)?.focus();
  }, []);

  const confirmButtonClasses = {
    danger:
      'text-white bg-danger box-border border border-transparent hover:bg-danger-strong focus:ring-4 focus:ring-danger-medium shadow-xs font-regular cursor-pointer tracking-wider leading-5 text-[1.1rem] px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed',
    success:
      'text-white bg-emerald-500 box-border border border-transparent hover:bg-emerald-600 focus:ring-4 focus:ring-danger-medium shadow-xs font-regular cursor-pointer tracking-wider leading-5 text-[1.1rem] px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed',
    default:
      'text-white bg-main-purple box-border border border-transparent hover:bg-main-purple focus:ring-4 focus:ring-danger-medium shadow-xs font-regular cursor-pointer tracking-wider leading-5 text-[1.1rem] px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed',
  };

  return (
    <div
      id="popup-modal"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="basic-confirmation-title"
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 backdrop-blur-xl"
    >
      <div className="relative p-2 w-full max-w-md max-h-full">
        <div className="relative bg-white-purple border border-default shadow-xl p-4 md:p-6">
          {/* CLOSE MODAL Button */}
          <button
            type="button"
            className="absolute top-3 end-2.5 text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading text-sm w-9 h-9 ms-auto inline-flex justify-center items-center disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isConfirming}
            onClick={onCancel}
          >
            <span className="material-icons-sharp">close</span>
            <span className="sr-only">Close modal</span>
          </button>

          <div className="p-4 md:p-5 text-center">
            <span
              className="mx-auto mb-2 text-purple material-symbols-sharp"
              style={{ fontSize: '5rem' }}
            >
              error
            </span>

            {/* Heading */}
            <h3
              id="basic-confirmation-title"
              className="mb-4 text-body text-purple font-jost text-2xl tracking-wider font-medium"
            >
              {title}
              {appendQuestionMark ? '?' : ''}
            </h3>

            {/* Message */}
            <h3 className="mb-6 text-body text-dark-pink font-medium font-overpass text-[1.1rem] tracking-wider">
              {message}
            </h3>
            {passwordValue !== undefined && onPasswordChange && (
              <div className="mb-4 text-left">
                <label
                  htmlFor="confirmation-password"
                  className="block mb-2 font-jost tracking-wide text-[1.1rem] font-medium text-pink"
                >
                  Password
                </label>
                <input
                  id="confirmation-password"
                  ref={passwordInputRef}
                  type="password"
                  autoComplete="current-password"
                  value={passwordValue}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  disabled={isConfirming}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? 'confirmation-password-error' : undefined}
                  className="font-overpass text-[1.1rem] bg-gray-50 border border-gray-300 text-deep-purple block w-full p-2.5 disabled:opacity-60"
                />
                {passwordError && (
                  <p
                    id="confirmation-password-error"
                    role="alert"
                    className="mt-2 text-sm text-red-600"
                  >
                    {passwordError}
                  </p>
                )}
              </div>
            )}

            {confirmationValue !== undefined &&
              onConfirmationChange &&
              expectedConfirmationText && (
                <div className="mb-4 text-left">
                  <label
                    htmlFor="typed-confirmation"
                    className="block mb-2 font-jost tracking-wide text-[1.1rem] font-medium text-pink"
                  >
                    Type {expectedConfirmationText} to confirm
                  </label>
                  <input
                    id="typed-confirmation"
                    type="text"
                    value={confirmationValue}
                    onChange={(event) => onConfirmationChange(event.target.value)}
                    disabled={isConfirming}
                    autoComplete="off"
                    className="font-overpass text-[1.1rem] bg-gray-50 border border-gray-300 text-deep-purple block w-full p-2.5 disabled:opacity-60"
                  />
                </div>
              )}

            {errorMessage && (
              <div
                role="alert"
                className="p-3 mb-6 text-red-800 bg-red-50 border border-red-200 font-overpass text-[1rem] tracking-wide"
              >
                {errorMessage}
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center space-x-4 justify-center">
              {/* YES Button */}
              <button
                onClick={onConfirm}
                data-modal-hide="popup-modal"
                type="button"
                disabled={isConfirmDisabled}
                className={`${confirmButtonClasses[confirmButtonVariant]} disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {isConfirming ? 'Processing...' : confirmButtonText}
              </button>

              {/* NO CANCEL Button */}
              <button
                onClick={onCancel}
                type="button"
                ref={cancelButtonRef}
                disabled={isDismissDisabled}
                className="text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary shadow-xs font-jost tracking-wider cursor-pointer font-regular leading-5 text-[1.1rem] px-4 py-2.5 focus:outline-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BasicConfirmationModal;
