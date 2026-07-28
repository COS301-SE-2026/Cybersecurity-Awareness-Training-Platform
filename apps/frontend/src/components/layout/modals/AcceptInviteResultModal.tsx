import { Link } from 'react-router-dom';

type InvitationErrorType = 'Expired' | 'Invalid' | 'Revoked' | 'Already Used' | 'RateLimited';

type AcceptInviteResultModalProps = Readonly<{
  isOpen: boolean;
  errorType?: InvitationErrorType;
  success?: boolean;
  declined?: boolean;
  sessionOutcome?: 'REFRESH_AUTH_CONTEXT' | 'REAUTHENTICATE';
  roleGranted?: string;
}>;

function AcceptInviteResultModal({
  isOpen,
  errorType,
  success,
  declined,
  sessionOutcome,
  roleGranted,
}: AcceptInviteResultModalProps) {
  if (!isOpen) return null;

  let primaryAction = (
    <Link
      to="/"
      className="-mt-4 inline-flex items-center gap-2 font-jost text-xl font-regular tracking-wide text-purple hover:text-purple cursor-pointer transition-colours"
    >
      <span className="material-icons-sharp">arrow_back</span>
      <span>Back to Home Page</span>
    </Link>
  );

  if (success) {
    if (sessionOutcome === 'REAUTHENTICATE') {
      primaryAction = (
        <Link
          to="/login"
          className="inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple px-5 py-2.5 transition-colors"
        >
          Proceed to Login
        </Link>
      );
    } else if (roleGranted === 'ORGANISATION_ADMIN') {
      primaryAction = (
        <Link
          to="/organisation-management"
          className="inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple px-5 py-2.5 transition-colors"
        >
          Go to Organisation Management
        </Link>
      );
    } else {
      primaryAction = (
        <Link
          to="/campaigns"
          className="inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple px-5 py-2.5 transition-colors"
        >
          Go to Dashboard
        </Link>
      );
    }
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
            {errorType && (
              <h3 className="font-jost text-3xl text-red-600 tracking-wider font-medium">
                Invitation {errorType === 'RateLimited' ? 'Rate Limited' : errorType}
              </h3>
            )}

            {success && (
              <h3 className="font-jost text-3xl text-emerald-600 tracking-wider font-medium">
                Invitation Successfully Accepted
              </h3>
            )}

            {declined && (
              <h3 className="font-jost text-3xl text-red-600 tracking-wider font-medium text-heading">
                Invitation Declined
              </h3>
            )}
          </div>
          <div className="pt-4 md:pt-6">
            {/* SUB-HEADING */}
            {errorType && (
              <p className="font-overpass text-left text-regular text-[1.1rem] tracking-wider text-purple mb-8">
                {errorType === 'RateLimited' ? (
                  <span>
                    You have made too many authentication attempts. Please wait a few seconds and
                    try again.
                  </span>
                ) : (
                  <span>
                    This <span className="font-semibold">invitation</span> is{' '}
                    <strong>no longer valid</strong> because it has either <em>expired</em>,{' '}
                    <em>is invalid</em>, <em>has already been used</em>, or{' '}
                    <em>has been revoked</em>.
                  </span>
                )}
              </p>
            )}

            {success && (
              <p className="font-overpass text-left text-regular text-[1.1rem] tracking-wider text-purple mb-8">
                {sessionOutcome === 'REAUTHENTICATE' ? (
                  <span>
                    This invitation has been <strong>successfully accepted</strong>. Because your
                    account was upgraded to a platform administrator, please log in again to
                    activate your administrator session.
                  </span>
                ) : (
                  <span>
                    This <span className="font-semibold">invitation</span> has{' '}
                    <strong>been successfully accepted</strong>. Your role has been updated.
                  </span>
                )}
              </p>
            )}

            {declined && (
              <p className="font-overpass text-left text-regular text-[1.1rem] tracking-wider text-purple mb-8">
                <span>
                  You have <strong>declined</strong> this{' '}
                </span>
                <span className="font-semibold">invitation</span>.
              </p>
            )}

            <div className="mt-4 flex justify-end">{primaryAction}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AcceptInviteResultModal;
