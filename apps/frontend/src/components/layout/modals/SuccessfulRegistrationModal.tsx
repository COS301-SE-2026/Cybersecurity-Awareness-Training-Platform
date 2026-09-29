import BackNavigation from '../../BackNavigation';

type SuccessfulRegistrationModalProps = Readonly<{
  isOpen: boolean;
  firstName: string;
  accountDescription: string;
  organisation: string;
  confirmationEmailQueued?: boolean | null;
}>;

function SuccessfulRegistrationModal({
  isOpen,
  firstName,
  accountDescription,
  organisation,
  confirmationEmailQueued,
}: SuccessfulRegistrationModalProps) {
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
            {!organisation && (
              <h3 className="font-jost text-3xl text-emerald-600 tracking-wider font-medium">
                Registration Successful
              </h3>
            )}

            {organisation && (
              <h3 className="font-jost text-3xl text-emerald-600 tracking-wider font-medium">
                Registration Request Submitted
              </h3>
            )}
          </div>
          <div className="pt-4 md:pt-6">
            {/* SUB-HEADING */}
            <p className="font-overpass text-left text-regular text-[1.1rem] tracking-wider text-pink mb-1">
              Thank you, <strong>{firstName}</strong>.
            </p>

            {!organisation && (
              <p className="font-overpass text-left text-regular text-[1.1rem] tracking-wider text-dark-pink mb-1">
                You have <em>successfully</em> registered an{' '}
                <strong>
                  <em>{accountDescription}</em>
                </strong>{' '}
                account on the{' '}
                <strong>
                  <em>Insightful Phish</em> Cybersecurity Awareness Training Platform
                </strong>
              </p>
            )}

            {organisation && (
              <p className="font-overpass text-left text-regular text-[1.1rem] tracking-wider text-dark-pink mb-1">
                You have <em>successfully</em> submitted an organisation registration request to the{' '}
                <strong>
                  <em>Insightful Phish</em> Cybersecurity Awareness Training Platform
                </strong>
              </p>
            )}

            {organisation && (
              <p className="font-overpass text-left text-regular text-[1.1rem] tracking-wider text-dark-pink mb-2">
                on behalf of the following organisation:
              </p>
            )}

            {organisation && (
              <p className="font-google_sans_code text-left font-regular text-[1.1rem] tracking-wider text-gray-600 mb-4">
                <span>{organisation}</span>
              </p>
            )}

            {!organisation && (
              <p className="font-jost text-left font-regular text-[1.1rem] tracking-wider text-purple mb-6">
                Click <em>"Back to Log In"</em> to access your new account.
              </p>
            )}

            {organisation && (
              <p className="font-jost text-left font-regular text-[1.1rem] tracking-wider text-purple mb-6">
                Your request will be reviewed by an <em>Insightful Phish</em> platform
                administrator.
                {confirmationEmailQueued === false
                  ? ' Confirmation email delivery may be delayed, but your request was received.'
                  : ' If approved, you will receive an email with instructions to set up your Organisation Administrator account.'}
              </p>
            )}

            {!organisation && <BackNavigation />}

            {organisation && <BackNavigation to="/" label="Back to Home Page" />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuccessfulRegistrationModal;
