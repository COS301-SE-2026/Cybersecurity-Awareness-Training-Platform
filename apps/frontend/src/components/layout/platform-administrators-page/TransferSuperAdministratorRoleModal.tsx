import { useEffect, useRef } from 'react';

type TransferSuperAdministratorRoleModalProps = Readonly<{
  isOpen: boolean;
  targetName: string;
  targetEmail: string;
  password: string;
  confirmation: string;
  errorMessage: string | null;
  passwordError: string | null;
  isSubmitting: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}>;

function TransferSuperAdministratorRoleModal({
  isOpen,
  targetName,
  targetEmail,
  password,
  confirmation,
  errorMessage,
  passwordError,
  isSubmitting,
  onPasswordChange,
  onConfirmationChange,
  onClose,
  onConfirm,
}: TransferSuperAdministratorRoleModalProps) {
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) passwordInputRef.current?.focus();
  }, [isOpen]);

  return (
    <div
      id="popup-modal"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-super-administrator-title"
      className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 backdrop-blur-xl"
    >
      <div className="relative p-2 w-full max-w-md max-h-full">
        <div className="relative bg-white-purple border border-default shadow-xl p-4 md:p-6">
          {/* CLOSE MODAL Button */}
          <button
            disabled={isSubmitting}
            type="button"
            className="absolute top-3 end-2.5 text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading text-sm w-9 h-9 ms-auto inline-flex justify-center items-center disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={onClose}
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
              id="transfer-super-administrator-title"
              className="mb-4 text-body text-purple font-jost text-2xl tracking-wider font-medium"
            >
              Transfer Super Administrator Role?
            </h3>

            {/* Message */}
            <h3 className=" text-body text-gray-600 font-regular font-overpass text-[1rem] tracking-wider">
              Transferring the <em>Super Platform Administrator</em> role will assign all{' '}
              <em>Super Platform Administrator</em> privileges to a currently active{' '}
              <em>Platform Administrator</em>.
            </h3>

            <h3 className="mb-2 text-body text-gray-600 font-regular font-overpass text-[1rem] tracking-wider">
              <strong>
                Your account will be downgraded to <em>Platform Administrator.</em>
              </strong>
            </h3>

            <h3 className="mb-4 text-body text-dark-pink font-medium font-overpass text-[1.1rem] tracking-wider">
              Transfer the super administrator role to <strong>{targetName}</strong> ({targetEmail}
              ).
            </h3>

            <div className="mb-4 text-left">
              <label
                htmlFor="transfer-current-password"
                className="block mb-2 font-jost tracking-wide text-[1.1rem] font-medium text-pink"
              >
                Current password
              </label>
              <input
                id="transfer-current-password"
                ref={passwordInputRef}
                type="password"
                autoComplete="current-password"
                value={password}
                disabled={isSubmitting}
                onChange={(event) => onPasswordChange(event.target.value)}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? 'transfer-password-error' : undefined}
                className="font-overpass text-[1.1rem] bg-gray-50 border border-gray-300 text-deep-purple block w-full p-2.5 disabled:opacity-60"
              />
              {passwordError && (
                <p id="transfer-password-error" role="alert" className="mt-2 text-sm text-red-600">
                  {passwordError}
                </p>
              )}
            </div>

            <div className="mb-4 text-left">
              <label
                htmlFor="transfer-confirmation"
                className="block mb-2 font-jost tracking-wide text-[1.1rem] font-medium text-pink"
              >
                Type TRANSFER to confirm
              </label>
              <input
                id="transfer-confirmation"
                type="text"
                autoComplete="off"
                value={confirmation}
                disabled={isSubmitting}
                onChange={(event) => onConfirmationChange(event.target.value)}
                className="font-overpass text-[1.1rem] bg-gray-50 border border-gray-300 text-deep-purple block w-full p-2.5 disabled:opacity-60"
              />
            </div>

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
              {/* YES CONFIRM TRANSFER Button */}
              <button
                onClick={onConfirm}
                type="button"
                disabled={isSubmitting || !password || confirmation !== 'TRANSFER'}
                className="text-white bg-main-purple box-border border border-transparent hover:bg-main-purple focus:ring-4 focus:ring-danger-medium shadow-xs font-regular cursor-pointer tracking-wider leading-5 text-[1.1rem] px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Processing...' : 'Transfer super administrator role'}
              </button>

              {/* NO CANCEL Button */}
              <button
                onClick={onClose}
                type="button"
                disabled={isSubmitting}
                className="text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary shadow-xs font-jost tracking-wider cursor-pointer font-regular leading-5 text-[1.1rem] px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
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

export default TransferSuperAdministratorRoleModal;
