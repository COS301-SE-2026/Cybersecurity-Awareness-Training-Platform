import type React from 'react';
import BackToLoginButton from '../BackToLoginButton';
type OrganisationInformationFormProps = Readonly<{
  orgName: string;
  setOrgName: React.Dispatch<React.SetStateAction<string>>;

  orgDescrip: string;
  setOrgDescrip: React.Dispatch<React.SetStateAction<string>>;

  orgWeb: string;
  setOrgWeb: React.Dispatch<React.SetStateAction<string>>;

  orgSize: number | '';
  setOrgSize: React.Dispatch<React.SetStateAction<number | ''>>;

  onNext: () => void;
}>;

function OrganisationInformationForm({
  orgName,
  setOrgName,
  orgDescrip,
  setOrgDescrip,
  orgWeb,
  setOrgWeb,
  orgSize,
  setOrgSize,
  onNext,
}: OrganisationInformationFormProps) {
  return (
    <div className="w-full">
      {/* PROGRESS HEADING */}
      <h3 className="font-overpass font-regular text-[1rem] text-gray-600 tracking-wider sm:text-[1.2rem]">
        Step 1 of 2
      </h3>

      {/* HEADING */}
      <h3 className="font-jost text-xl text-dark-pink tracking-wider font-medium sm:text-2xl">
        Organisation Information
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1rem] font-justify font-jost mt-1 text-gray-500 mb-4 sm:text-[1.1rem]">
        Provide some basic information about your organisation to begin the registration process.
      </p>

      <form
        className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6"
        aria-label="Organisation information"
        noValidate
      >
        {/* Organisation Name*/}
        <div>
          <label
            htmlFor="organisation-name"
            className="block mb-2 font-jost tracking-wide text-[1.1rem] font-medium text-pink sm:text-xl"
          >
            Organisation Name <span className="font-light text-red-500">(Required)</span>
          </label>
          <input
            required
            type="text"
            name="organisation-name"
            id="organisation-name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="font-overpass text-[1.05rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 sm:text-[1.2rem]"
            placeholder="Enter the Organisation Name"
          />
        </div>

        {/* ORGANISATION SIZE (NUMBER INPUT) */}
        <div>
          <label
            htmlFor="organisation-size"
            className="block mb-2 font-jost tracking-wide text-[1.1rem] font-medium text-pink sm:text-xl"
          >
            Organisation Size <span className="font-light text-red-500">(Required)</span>
          </label>
          <input
            type="number"
            min={1}
            step={1}
            name="organisation-size"
            id="organisation-size"
            value={orgSize}
            onChange={(e) => setOrgSize(e.target.value === '' ? '' : Number(e.target.value))}
            className="block w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-deep-purple font-overpass text-[1.05rem] focus:ring-brand focus:border-brand sm:text-[1.2rem]"
            placeholder="Approximate Number of Employees"
            required
          />
        </div>

        {/* Organisation Description*/}
        <div>
          <label
            htmlFor="organisation-description"
            className="block mb-2 font-jost tracking-wide text-[1.1rem] font-medium text-pink sm:text-xl"
          >
            Organisation Description
          </label>
          <input
            type="text"
            name="organisation-description"
            id="organisation-description"
            value={orgDescrip}
            onChange={(e) => setOrgDescrip(e.target.value)}
            className="font-overpass text-[1.05rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 sm:text-[1.2rem]"
            placeholder="Enter an Organisation Description"
          />
        </div>

        {/* Organisation URL*/}
        <div>
          <label
            htmlFor="organisation-website-url"
            className="block mb-2 font-jost tracking-wide text-[1.1rem] font-medium text-pink sm:text-xl"
          >
            Organisation URL
          </label>
          <input
            type="text"
            name="organisation-website-url"
            id="organisation-website-url"
            value={orgWeb}
            onChange={(e) => setOrgWeb(e.target.value)}
            className="font-overpass text-[1.05rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 sm:text-[1.2rem]"
            placeholder="Enter the Organisation URL"
          />
        </div>
      </form>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* BACK TO LOGIN LINK */}
        <BackToLoginButton />

        {/* Next Button */}
        <button
          type="button"
          onClick={onNext}
          className="cursor-pointer inline-flex w-full gap-2 items-center justify-center text-white font-jost text-[1.05rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto sm:text-[1.2rem]"
        >
          <span> Next </span>
          <span className="material-icons-sharp">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}

export default OrganisationInformationForm;
