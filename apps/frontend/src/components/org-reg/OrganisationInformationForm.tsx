import BackToLoginButton from '../BackToLoginButton';

function OrganisationInformationForm() {
  return (
    <div className="-mt-5 -ml-4">
      {/* PROGRESS HEADING */}
      <h3 className="font-overpass font-regular text-[1.2rem] text-gray-600 tracking-wider font-regular">
        Step 1 of 2
      </h3>

      {/* HEADING */}
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Organisation Information
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost mt-1 text-gray-500 mb-4">
        Provide some basic information about your organisation to begin the registration process.
      </p>

      <form className="mt-4 grid grid-cols-2 gap-6" noValidate>
        {/* Organisation Name*/}
        <div>
          <label
            htmlFor="email"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Organisation Name <span className="font-light text-red-500">(Required)</span>
          </label>
          <input
            required
            type="name"
            name="organisation-name"
            id="organisation-name"
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Enter the Organisation Name"
          />
        </div>

        {/* ORGANISATION SIZE (NUMBER INPUT) */}
        <div>
          <label
            htmlFor="email"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Organisation Size <span className="font-light text-red-500">(Required)</span>
          </label>
          <input
            type="number"
            name="organisation-size"
            id="organisation-size"
            className="block w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-deep-purple font-overpass text-[1.2rem] focus:ring-brand focus:border-brand"
            placeholder="Approximate Number of Employees"
            required
          />
        </div>

        {/* Organisation Description*/}
        <div>
          <label
            htmlFor="email"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Organisation Description
          </label>
          <input
            type="name"
            name="organisation-description"
            id="organisation-description"
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
            placeholder="Enter an Organisation Description"
          />
        </div>

        {/* Organisation URL*/}
        <div>
          <label
            htmlFor="email"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Organisation URL
          </label>
          <input
            type="name"
            name="organisation-name"
            id="organisation-name"
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Enter the Organisation URL"
          />
        </div>
      </form>

      <div className="mt-8 flex items-center justify-between">
        {/* BACK TO LOGIN LINK */}
        <BackToLoginButton />

        {/* Next Button */}
        <button
          type="submit"
          className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span> Next </span>
          <span className="material-icons-sharp">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}

export default OrganisationInformationForm;
