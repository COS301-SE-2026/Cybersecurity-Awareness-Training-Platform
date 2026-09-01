import type { ResendEligibilityDto } from '@insightful-phish/shared';

// props for representative info tab
// handles rep details and resending setup invite email for initial admin

export interface RepresentativeInfoProps {
  fullName?: string;
  email?: string;
  setupStatus?: string;
  resendEligibility?: ResendEligibilityDto | null;
  onResendSetup?: () => Promise<void>;
  isResending?: boolean;
  resendSuccessMessage?: string | null;
  resendErrorMessage?: string | null;
  isRequestOnly?: boolean;
}

const setupStatusLabels: Record<string, string> = {
  PENDING: 'Pending',
  SENT: 'Invitation sent',
  ACCEPTED: 'Invitation accepted',
  COMPLETED: 'Setup completed',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
  REJECTED: 'Rejected',
  FAILED_TO_SEND: 'Failed to send',
};

function formatSetupStatus(status?: string): string {
  if (!status) return '';
  return setupStatusLabels[status] ?? status;
}

const resendReasonLabels: Record<string, string> = {
  ORGANISATION_NOT_ONBOARDING: 'Organisation is not in onboarding status.',
  INVITATION_NOT_ELIGIBLE: 'Invitation is not eligible for resend.',
  SETUP_ALREADY_COMPLETED: 'Initial administrator setup has already been completed.',
  ACTIVE_SETUP_TOKEN_EXISTS: 'An active setup invitation already exists.',
  SETUP_TOKEN_EXPIRED: 'The setup invitation token has expired.',
  SETUP_EMAIL_FAILED: 'The previous setup email failed to send.',
  CONCURRENT_RESEND_IN_PROGRESS: 'A resend request is currently in progress.',
};

function formatResendReason(reason?: string | null): string {
  if (!reason) return '';
  return resendReasonLabels[reason] ?? reason;
}

function RepresentativeInformationPage({
  fullName = '',
  email = '',
  setupStatus = '',
  resendEligibility,
  onResendSetup,
  isResending = false,
  resendSuccessMessage = null,
  resendErrorMessage = null,
  isRequestOnly = false,
}: Readonly<RepresentativeInfoProps>) {
  const isResendDisabled =
    isResending ||
    (resendEligibility !== undefined &&
      resendEligibility !== null &&
      !resendEligibility.isEligible);

  const displaySetupStatus = formatSetupStatus(setupStatus);
  const disabledReasonText =
    resendEligibility?.reason && !resendEligibility.isEligible
      ? formatResendReason(resendEligibility.reason)
      : null;

  return (
    <div className="-mt-2 -ml-2">
      {/* HEADING */}
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Organisation Representative Information
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost text-gray-500 mb-6">
        View the nominated organisation representative and initial administrator setup status.
      </p>

      {/* ALERTS FOR RESEND RESULT */}
      {resendSuccessMessage && (
        <div className="mb-4 p-4 text-sm text-green-800 bg-green-50 border border-green-300 rounded-none dark:bg-gray-800 dark:text-green-400 dark:border-green-800 font-overpass">
          <span className="font-medium">Success:</span> {resendSuccessMessage}
        </div>
      )}

      {resendErrorMessage && (
        <div className="mb-4 p-4 text-sm text-red-800 bg-red-50 border border-red-300 rounded-none dark:bg-gray-800 dark:text-red-400 dark:border-red-800 font-overpass">
          <span className="font-medium">Notice:</span> {resendErrorMessage}
        </div>
      )}

      <div className="flex flex-col flex-1 max-w-[57.05rem] w-full grid grid-cols-2 gap-6">
        {/* Rep Full Name (FName(s) + LName */}
        <div>
          <label
            htmlFor="rep-name"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Full Name
          </label>
          <input
            required
            type="text"
            name="rep-name"
            id="rep-name"
            disabled={true}
            value={fullName}
            readOnly
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Representative Full Name"
          />
        </div>

        {/* Rep Email Address */}
        <div>
          <label
            htmlFor="rep-email-address"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Email Address
          </label>
          <input
            required
            type="text"
            name="rep-email-address"
            id="rep-email-address"
            disabled={true}
            value={email}
            readOnly
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Representative Email Address"
          />
        </div>

        {/* Initial Admin Setup Status */}
        <div>
          <label
            htmlFor="setup-status"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Initial Administrator Setup Status
          </label>
          <input
            required
            type="text"
            name="setup-status"
            id="setup-status"
            disabled={true}
            value={displaySetupStatus}
            readOnly
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Initial Administrator Setup Status"
          />
        </div>
      </div>

      {/* RESEND BUTTON - Only shown for active organisation records */}
      {!isRequestOnly && (
        <div className="mt-8 flex flex-col gap-2 items-start justify-between">
          <button
            type="button"
            onClick={onResendSetup}
            disabled={isResendDisabled}
            aria-describedby={disabledReasonText ? 'resend-disabled-reason' : undefined}
            className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed rounded-none"
          >
            <span className="material-icons-sharp">send</span>
            <span>
              {isResending ? 'Sending Setup Email...' : 'Resend Initial Administrator Setup Email'}
            </span>
          </button>
          {disabledReasonText && (
            <p id="resend-disabled-reason" className="text-xs text-gray-500 font-overpass">
              Resend not available: {disabledReasonText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default RepresentativeInformationPage;
