import { type FormEvent, useEffect, useRef, useState } from 'react';
import {
  invitePlatformAdminRequestSchema,
  type InvitePlatformAdminRequestDto,
} from '@insightful-phish/shared';
import { ApiError } from '../../../lib/apiClient';
import { invitePlatformAdmin } from '../../../services/platform-admin.service';

function getApiErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || !error.body || typeof error.body !== 'object') return null;
  const body = error.body as { error?: unknown };
  return typeof body.error === 'string' ? body.error : null;
}

function getInviteErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Unable to connect to the server. Please try again.';
  if (error.status >= 500) return 'The server could not create this invitation. Please try again.';
  return error.message.trim() || 'The invitation could not be created. Please try again.';
}
type InvitePlatformAdministratorModalProps = Readonly<{
  isOpen: boolean;
  token: string;
  onClose: () => void;
  onSuccess: (email: string) => Promise<void>;
}>;

function InvitePlatformAdministratorModal({
  isOpen,
  token,
  onClose,
  onSuccess,
}: InvitePlatformAdministratorModalProps) {
  const [emailAddress, setEmailAddress] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) emailInputRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const resetForm = () => {
    setEmailAddress('');
    setFirstName('');
    setLastName('');
    setErrorMessage(null);
    setRequiresUpgrade(false);
    setIsSubmitting(false);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const submitInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const input: InvitePlatformAdminRequestDto = {
      email: emailAddress,
      ...(firstName.trim() ? { firstName } : {}),
      ...(lastName?.trim() ? { lastName } : {}),
      ...(requiresUpgrade ? { confirmUpgrade: true } : {}),
    };
    const parsed = invitePlatformAdminRequestSchema.safeParse(input);

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? 'Please check the submitted values.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await invitePlatformAdmin(parsed.data, token);
      resetForm();
      onClose();
      await onSuccess(response.email);
    } catch (error: unknown) {
      if (getApiErrorCode(error) === 'UPGRADE_CONFIRMATION_REQUIRED') {
        setRequiresUpgrade(true);
        setErrorMessage(null);
      } else {
        setRequiresUpgrade(false);
        setErrorMessage(getInviteErrorMessage(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="select-modal"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-platform-administrator-title"
      className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 backdrop-blur-xl"
    >
      <div className="relative p-4 w-full max-w-md">
        <div className="relative bg-white-purple border border-default shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between border-b border-default pb-4 md:pb-5">
            {/* HEADING */}
            <h3
              id="invite-platform-administrator-title"
              className="font-jost text-3xl text-purple tracking-wider font-medium text-heading"
            >
              Invite platform administrator
            </h3>

            {/* CLOSE MODAL BUTTON */}
            <button
              type="button"
              disabled={isSubmitting}
              className="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading text-sm w-9 h-9 ms-auto inline-flex justify-center items-center disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={closeModal}
            >
              <span className="material-icons-sharp">close</span>
              <span className="sr-only">Close modal</span>
            </button>
          </div>

          <form className="pt-2" onSubmit={submitInvitation}>
            {/* New Platform Administrator First Name*/}
            <div className="mb-6 mt-2">
              <label
                htmlFor="admin-first-name"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                First name
              </label>
              <input
                type="text"
                name="admin-first-name"
                id="admin-first-name"
                value={firstName}
                disabled={isSubmitting}
                onChange={(event) => setFirstName(event.target.value)}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter the Administrator's First Name"
              />
            </div>

            {/* New Platform Administrator Last Name*/}
            <div className="mb-6 mt-2">
              <label
                htmlFor="admin-last-name"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                Last name
              </label>
              <input
                type="text"
                name="admin-last-name"
                id="admin-last-name"
                value={lastName}
                disabled={isSubmitting}
                onChange={(event) => setLastName(event.target.value)}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter the Administrator's Last Name"
              />
            </div>

            {/* New Platform Administrator Email Address */}
            <div className="mb-8">
              <label
                htmlFor="admin-email-address"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                Email <span className="font-light text-red-500">(Required)</span>
              </label>
              <input
                required
                type="email"
                value={emailAddress}
                disabled={isSubmitting}
                onChange={(e) => setEmailAddress(e.target.value)}
                name="admin-email-address"
                id="admin-email-address"
                ref={emailInputRef}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter the Administrator's Email Address"
              />
            </div>
            {requiresUpgrade && (
              <p className="mb-6 font-overpass text-[1rem] text-deep-purple">
                An account already exists for this email. Confirm that it should be upgraded to a
                platform administrator.
              </p>
            )}
            {errorMessage && (
              <p role="alert" className="mb-6 font-overpass text-[1rem] text-red-600">
                {errorMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>
                {isSubmitting
                  ? 'Sending invitation…'
                  : requiresUpgrade
                    ? 'Confirm upgrade'
                    : 'Send invitation'}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default InvitePlatformAdministratorModal;
