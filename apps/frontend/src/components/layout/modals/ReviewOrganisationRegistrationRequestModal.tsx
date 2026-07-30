import type { PlatformOrganisationRequestReviewDto } from '../../../services/platform-organisation-management.service';
type ReviewOrganisationRegistrationRequstModalProps = Readonly<{
  isOpen: boolean;
  request: PlatformOrganisationRequestReviewDto | null;
  isLoading: boolean;
  isContacting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  // YOU WILL NEED TO ADD MORE PROPS SO THAT YOU CAN PASS IN THE ORGANISATION AND REPRESENTATIVE INFORMATION
  onMarkContacted: () => void;
  onReject: () => void;
  onApprove: () => void;
}>;

function ReviewOrganisationRegistrationRequstModal({
  isOpen,
  request,
  isLoading,
  isContacting,
  errorMessage,
  onClose,
  onMarkContacted,
  onReject,
  onApprove,
}: ReviewOrganisationRegistrationRequstModalProps) {
  if (!isOpen) return null;
  return (
    <div
      id="select-modal"
      tabIndex={-1}
      aria-hidden={!isOpen}
      className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 backdrop-blur-xl"
    >
      <div className="relative p-4 w-full max-w-2xl">
        <div className="relative bg-white-purple border border-default shadow-md p-4 md:p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-default pb-4 md:pb-5">
            {/* HEADING */}
            <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading">
              Review Organisation Registration Request
            </h3>

            {/* CLOSE MODAL BUTTON */}
            <button
              type="button"
              className="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading text-sm w-9 h-9 ms-auto inline-flex justify-center items-center disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isContacting}
              onClick={onClose}
            >
              <span className="material-icons-sharp">close</span>
              <span className="sr-only">Close modal</span>
            </button>
          </div>

          <div className="pt-2">
            {isLoading && (
              <p className="py-8 text-center font-overpass text-gray-600">
                Loading Registration Request...
              </p>
            )}
            {errorMessage && (
              <div className="my-3 border border-red-300 bg-red-50 p-3 font-overpass text-red-800">
                {' '}
                {errorMessage}{' '}
              </div>
            )}
            {request && (
              <>
                {/* Organisation Information */}
                <div className="mb-2">
                  {/* Heading */}
                  <h3 className="font-jost mt-2 tracking-wider text-[1.3rem] font-medium text-dark-pink">
                    Organisation Information
                  </h3>

                  {/* Name */}
                  <div className="mb-1">
                    <h4 className="font-jost tracking-wide text-[1.2rem] font-medium text-pink">
                      Name
                    </h4>
                    <p className="font-light text-[1.1rem] tracking-wider font-overpass text-gray-600">
                      {request.submittedOrganisationName}
                    </p>
                  </div>

                  {/* Description */}
                  <div className="mb-1">
                    <h4 className="font-jost tracking-wide text-[1.2rem] font-medium text-pink">
                      Description
                    </h4>
                    <p className="font-light text-[1.1rem] tracking-wider font-overpass text-gray-600">
                      {request.submittedOrganisationDescription ?? 'No Description Supplied'}
                    </p>
                  </div>

                  {/* Size */}
                  <div className="mb-1">
                    <h4 className="font-jost tracking-wide text-[1.2rem] font-medium text-pink">
                      Size{' '}
                      <span className="text-[1rem] font-light">
                        (Approximate Number of Employees)
                      </span>
                    </h4>
                    <p className="font-light text-[1.1rem] tracking-wider font-overpass text-gray-600">
                      {request.submittedOrganisationSize ?? 'Not Supplied'}
                    </p>
                  </div>

                  {/* Website */}
                  <div className="mb-1">
                    <h4 className="font-jost tracking-wide text-[1.2rem] font-medium text-pink">
                      Website
                    </h4>
                    {request.submittedWebsite ? (
                      <a
                        href={request.submittedWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 text-[1.1rem] underline font-google_sans_code"
                      >
                        {request.submittedWebsite}
                      </a>
                    ) : (
                      <p className="font-light text-[1.1rem] tracking-wider font-overpass text-gray-600">
                        Not Supplied
                      </p>
                    )}
                    {/* <a
                  href="https://bigredpaper.co.za"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 text-[1.1rem] underline font-google_sans_code"
                >
                  www.example.com
                </a> */}
                  </div>
                </div>

                <div className="mt-4 border-b border-default"></div>

                {/* Representative Information */}
                <div className="mb-6">
                  {/* Heading */}
                  <h3 className="font-jost mt-4 tracking-wider text-[1.3rem] font-medium text-dark-pink">
                    Representative Information
                  </h3>

                  {/* Name */}
                  <div className="mb-1">
                    <h4 className="font-jost tracking-wide text-[1.2rem] font-medium text-pink">
                      Full Name
                    </h4>
                    <p className="font-light text-[1.1rem] tracking-wider font-overpass text-gray-600">
                      {request.representativeFirstName} {request.representativeLastName}
                    </p>
                  </div>

                  {/* Description */}
                  <div className="mb-1">
                    <h4 className="font-jost tracking-wide text-[1.2rem] font-medium text-pink">
                      Email Address
                    </h4>
                    <a
                      href={`mailto:${request.representativeEmail}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 text-[1.1rem] underline font-google_sans_code"
                    >
                      {request.representativeEmail}
                    </a>
                  </div>
                  {/* No Phone number since this is a backend only thing and is not used! */}
                </div>
                <div className="mb-4 border-t border-default pt-3">
                  <p className="font-overpass text-[1rem] text-gray-600">
                    Status: {request.status.replaceAll('_', ' ')}
                  </p>
                  <p className="font-overpass text-[1rem] text-gray-600">
                    Submitted: {new Date(request.createdAt).toLocaleString()}
                  </p>
                  {request.contactedAt && (
                    <p className="font-overpass text-[1rem] text-gray-600">
                      Contacted: {new Date(request.contactedAt).toLocaleString()}
                    </p>
                  )}

                  {request.contactedBy && (
                    <p className="font-overpass text-[1rem] text-gray-600">
                      Contacted By: {request.contactedBy.user.firstName}{' '}
                      {request.contactedBy.user.lastName}
                    </p>
                  )}
                </div>
                {(request.status === 'PENDING_REVIEW' || request.status === 'CONTACTED') && (
                  <button
                    type="button"
                    disabled={isContacting}
                    onClick={onApprove}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 bg-emerald-500 px-4 py-2.5 font-jost text-[1.1rem] tracking-wider text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="material-symbols-sharp">check</span>
                    <span>Approve Request</span>
                  </button>
                )}
                {(request.status === 'PENDING_REVIEW' || request.status === 'CONTACTED') && (
                  <button
                    type="button"
                    disabled={isContacting}
                    onClick={onReject}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 bg-danger px-4 py-2.5 font-jost text-[1.1rem] tracking-wider text-white hover:bg-danger-strong disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="material-symbols-sharp">close</span>
                    <span>Reject Request</span>
                  </button>
                )}
                {request.status === 'PENDING_REVIEW' && (
                  <button
                    type="button"
                    disabled={isContacting}
                    onClick={onMarkContacted}
                    className="mt-2 inline-flex w-full justify-center items-center gap-2 font-jost text-[1.2rem] font-regular tracking-wide text-purple hover:text-purple cursor-pointer transition-colours disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {' '}
                    <span className="material-symbols-sharp">contact_page</span>
                    <span className="hover:underline">
                      {' '}
                      {isContacting ? 'Marking As Contacted...' : 'Mark As Contacted'}{' '}
                    </span>{' '}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReviewOrganisationRegistrationRequstModal;
