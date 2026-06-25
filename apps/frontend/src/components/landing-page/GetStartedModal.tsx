type GetStartedModalProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
}>;

function GetStartedModal({ isOpen, onClose }: GetStartedModalProps) {
  if (!isOpen) return null;
  return (
    <div
      id="select-modal"
      tabIndex={-1}
      aria-hidden="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xl"
    >
      <div className="relative p-4 w-full max-w-md">
        <div className="relative bg-white-purple border border-default shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between border-b border-default pb-4 md:pb-5">
            {/* HEADING */}
            <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading">
              Get Started
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
          <div className="pt-4 md:pt-6">
            {/* SUB-HEADING */}
            <p className="font-overpass text-regular text-xl tracking-wider text-dark-pink mb-4">
              How will you be using the platform?
            </p>

            {/* OPTIONS */}
            <ul className="space-y-4 mb-4">
              {/* Individual Registration Option */}
              <li>
                <input
                  type="radio"
                  id="job-1"
                  name="job"
                  value="job-1"
                  className="hidden peer"
                  required
                />
                <label
                  htmlFor="job-1"
                  className="inline-flex items-center w-full p-5 text-body bg-neutral-primary-soft border-1 border-default cursor-pointer peer-checked:hover:bg-brand-softer peer-checked:border-brand-subtle peer-checked:bg-brand-softer hover:bg-neutral-secondary-medium peer-checked:text-fg-brand-strong"
                >
                  <div className="flex items-center justify-center w-9 h-9 bg-ip-purple text-fg-brand-strong">
                    <span className="material-icons-sharp text-deep-purple">account_box</span>
                  </div>
                  <div className="block ms-4">
                    <div className="w-full font-jost text-[1.3rem] tracking-wider text-pink font-medium -mb-1">
                      Individual
                    </div>
                    <div className="w-full font-overpass font-normal text-dark-pink">
                      Register as an Individual Trainee
                    </div>
                  </div>
                </label>
              </li>

              {/* Organisation Registration Option */}
              <li>
                <input
                  type="radio"
                  id="job-2"
                  name="job"
                  value="job-2"
                  className="hidden peer"
                  required
                />
                <label
                  htmlFor="job-2"
                  className="inline-flex items-center w-full p-5 text-body bg-neutral-primary-soft border-1 border-default cursor-pointer peer-checked:hover:bg-brand-softer peer-checked:border-brand-subtle peer-checked:bg-brand-softer hover:bg-neutral-secondary-medium peer-checked:text-fg-brand-strong"
                >
                  <div className="flex items-center justify-center w-9 h-9 bg-ip-purple text-fg-brand-strong">
                    <span className="material-icons-sharp text-deep-purple">business</span>
                  </div>
                  <div className="block ms-4">
                    <div className="w-full font-jost text-[1.3rem] tracking-wider text-pink font-medium -mb-1">
                      Organisation
                    </div>
                    <div className="w-full font-overpass font-normal text-dark-pink">
                      Register your Organisation
                    </div>
                  </div>
                </label>
              </li>
            </ul>
            <button
              type="submit"
              className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none"
            >
              <span> Continue to Registration </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GetStartedModal;
