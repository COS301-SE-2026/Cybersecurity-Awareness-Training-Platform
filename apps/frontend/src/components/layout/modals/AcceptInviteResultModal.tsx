import { Link } from 'react-router-dom';

type InvitationErrorType = 'Expired' | 'Invalid' | 'Revoked' | 'Already Used';

type AcceptInviteResultModalProps = Readonly<{
  isOpen: boolean;
  errorType?: InvitationErrorType;
  success?: boolean;
  declined?: boolean;
}>;

function AcceptInviteResultModal({
  isOpen,
  errorType,
  success,
  declined,
}: AcceptInviteResultModalProps) {
  if (!isOpen) return null;

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
                Invitation {errorType}
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
                This <span className="font-semibold">invitation</span> is{' '}
                <strong>no longer valid</strong> because it has either <em>expired</em>,{' '}
                <em>is invalid</em>, <em>has already been used</em>, or it <em>has been revoked</em>
                .
              </p>
            )}

            {success && (
              <p className="font-overpass text-left text-regular text-[1.1rem] tracking-wider text-purple mb-8">
                This <span className="font-semibold">invitation</span> has{' '}
                <strong>been successfully accepted</strong>.
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

            {/* BACK TO HOME PAGE */}
            <Link
              to="/"
              className="-mt-4 inline-flex items-center gap-2 font-jost text-xl font-regular tracking-wide text-purple hover:text-purple cursor-pointer transition-colours"
            >
              <span className="material-icons-sharp">arrow_back</span>
              <span> Back to Home Page</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AcceptInviteResultModal;
