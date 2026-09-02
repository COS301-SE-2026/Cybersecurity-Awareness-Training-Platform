import LoadingSpinnerSVG from '../LoadingSpinnerSVG';

type RepresentativeInformationFormProps = Readonly<{
  repFName: string;
  setRepFName: React.Dispatch<React.SetStateAction<string>>;

  repLName: string;
  setRepLName: React.Dispatch<React.SetStateAction<string>>;

  repEmail: string;
  setRepEmail: React.Dispatch<React.SetStateAction<string>>;

  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}>;

function RepresentativeInformationForm({
  repFName,
  setRepFName,
  repLName,
  setRepLName,
  repEmail,
  setRepEmail,
  onBack,
  onSubmit,
  isSubmitting,
}: RepresentativeInformationFormProps) {
  return (
    <div className="w-full">
      {/* PROGRESS HEADING */}
      <h3 className="font-overpass font-regular text-[1rem] text-gray-600 tracking-wider sm:text-[1.2rem]">
        Step 2 of 2
      </h3>

      {/* HEADING */}
      <h3 className="font-jost text-xl text-dark-pink tracking-wider font-medium sm:text-2xl">
        Representative Information
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1rem] font-justify font-jost mt-1 text-gray-500 mb-4 sm:text-[1.1rem]">
        Provide the details of the organisation's representative to complete the registration
        request.
      </p>

      <form
        className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6"
        aria-label="Representative information"
        noValidate
      >
        {/* Representative First Name(s)*/}
        <div>
          <label
            htmlFor="representative-first-name"
            className="block mb-2 font-jost tracking-wide text-[1.1rem] font-medium text-pink sm:text-xl"
          >
            Representative First Name(s) <span className="font-light text-red-500">(Required)</span>
          </label>
          <input
            required
            type="text"
            name="representative-first-name"
            id="representative-first-name"
            value={repFName}
            onChange={(e) => setRepFName(e.target.value)}
            className="font-overpass text-[1.05rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 sm:text-[1.2rem]"
            placeholder="Enter the Representative's First Name(s)"
          />
        </div>

        {/* Representative Last Name*/}
        <div>
          <label
            htmlFor="representative-last-name"
            className="block mb-2 font-jost tracking-wide text-[1.1rem] font-medium text-pink sm:text-xl"
          >
            Representative Last Name <span className="font-light text-red-500">(Required)</span>
          </label>
          <input
            required
            type="text"
            name="representative-last-name"
            id="representative-last-name"
            value={repLName}
            onChange={(e) => setRepLName(e.target.value)}
            className="font-overpass text-[1.05rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 sm:text-[1.2rem]"
            placeholder="Enter the Representative's Last Name"
          />
        </div>

        {/* Representative Email Address */}
        <div>
          <label
            htmlFor="representative-email-address"
            className="block mb-2 font-jost tracking-wide text-[1.1rem] font-medium text-pink sm:text-xl"
          >
            Representative Email Address <span className="font-light text-red-500">(Required)</span>
          </label>
          <input
            required
            type="email"
            name="representative-email-address"
            id="representative-email-address"
            value={repEmail}
            onChange={(e) => setRepEmail(e.target.value)}
            className="font-overpass text-[1.05rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 sm:text-[1.2rem]"
            placeholder="Enter the Representative's Email Address"
          />
        </div>

        <div className="self-end md:pl-2">
          <div className="flex items-start gap-2 text-gray-500">
            <span className="material-symbols-sharp">info</span>

            <div>
              <h4 className="font-jost text-md tracking-wider font-light text-gray-500">
                Organisation Administrator
              </h4>

              <p className="mt-1 font-overpass text-xs tracking-wide text-gray-500">
                This representative will be registered as your organisation's first{' '}
                <em>Organisation Administrator</em> if this registration request is approved.
              </p>
            </div>
          </div>
        </div>
      </form>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* BACK TO STEP 1 */}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-full items-center justify-center gap-2 font-jost text-[1.05rem] font-regular tracking-wide text-purple hover:text-purple cursor-pointer transition-colours sm:w-auto sm:justify-start sm:text-xl"
        >
          <span className="material-icons-sharp">arrow_back</span>
          <span> Back to Step 1</span>
        </button>

        {/* Next Button */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="cursor-pointer inline-flex w-full gap-2 items-center justify-center text-white font-jost text-[1.05rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto sm:text-[1.2rem]"
        >
          {isSubmitting && <LoadingSpinnerSVG />}
          <span>{isSubmitting ? 'Submitting Request...' : 'Complete Registration Request'}</span>
        </button>
      </div>
    </div>
  );
}

export default RepresentativeInformationForm;
