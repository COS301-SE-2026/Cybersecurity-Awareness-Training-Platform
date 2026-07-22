type ReviewOrganisationRegistrationRequstModalProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
}>;

function ReviewOrganisationRegistrationRequstModal({
  isOpen,
  onClose,
}: ReviewOrganisationRegistrationRequstModalProps) {
  return (
    <div
      id="select-modal"
      tabIndex={-1}
      aria-hidden={!isOpen}
      className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 backdrop-blur-xl"
    >
      <div className="relative p-4 w-full max-w-md">
        <div className="relative bg-white-purple border border-default shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between border-b border-default pb-4 md:pb-5">
            {/* HEADING */}
            <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading">
              Review Organisation Registration Request
            </h3>

            {/* CLOSE MODAL BUTTON */}
            <button
              type="button"
              className="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading text-sm w-9 h-9 ms-auto inline-flex justify-center items-center"
              onClick={onClose}
            >
              <span className="material-icons-sharp">close</span>
              <span className="sr-only">Close modal</span>
            </button>
          </div>

          <div className="pt-2">
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
                  Organisation Name Here
                </p>
              </div>

              {/* Description */}
              <div className="mb-1">
                <h4 className="font-jost tracking-wide text-[1.2rem] font-medium text-pink">
                  Description
                </h4>
                <p className="font-light text-[1.1rem] tracking-wider font-overpass text-gray-600">
                  Organisation Description Here
                </p>
              </div>

              {/* Size */}
              <div className="mb-1">
                <h4 className="font-jost tracking-wide text-[1.2rem] font-medium text-pink">
                  Size{' '}
                  <span className="text-[1rem] font-light">(Approximate Number of Employees)</span>
                </h4>
                <p className="font-light text-[1.1rem] tracking-wider font-overpass text-gray-600">
                  Organisation Size Here
                </p>
              </div>

              {/* Website */}
              <div className="mb-1">
                <h4 className="font-jost tracking-wide text-[1.2rem] font-medium text-pink">
                  Website
                </h4>
                <a
                  href="https://bigredpaper.co.za"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 text-[1.1rem] underline font-google_sans_code"
                >
                  www.example.com
                </a>
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
                  Full Name Here
                </p>
              </div>

              {/* Description */}
              <div className="mb-1">
                <h4 className="font-jost tracking-wide text-[1.2rem] font-medium text-pink">
                  Email Address
                </h4>
                <a
                  href={`mailto:${'email@example.com'}`} // You can fill in the email here...
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 text-[1.1rem] underline font-google_sans_code"
                >
                  email@example.com
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* APPROVE BUTTON */}
              <button
                type="submit"
                className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-emerald-500 hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-sharp mr-2">check</span>
                <span>Approve</span>
              </button>

              {/* DECLINE BUTTON */}
              <button
                type="submit"
                className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-danger box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-sharp mr-2">close</span>
                <span>Decline</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReviewOrganisationRegistrationRequstModal;
