function RepresentativeInformationForm() {
  return (
    <div className="-mt-5 -ml-4">
      {/* PROGRESS HEADING */}
      <h3 className="font-overpass font-regular text-[1.2rem] text-gray-600 tracking-wider font-regular">
        Step 2 of 2
      </h3>

      {/* HEADING */}
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Representative Information
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost mt-1 text-gray-500 mb-4">
        Provide the details of the organisation's representative to complete the registration
        request.
      </p>

      <form className="mt-4 grid grid-cols-2 gap-6" noValidate>
        {/* Representative First Name(s)*/}
        <div>
          <label
            htmlFor="representative-first-name"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Representative First Name(s) <span className="font-light text-red-500">(Required)</span>
          </label>
          <input
            required
            type="name"
            name="representative-first-name"
            id="representative-first-name"
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Enter the Representative's First Name(s)"
          />
        </div>

        {/* Representative Last Name*/}
        <div>
          <label
            htmlFor="representative-last-name"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Representative Last Name <span className="font-light text-red-500">(Required)</span>
          </label>
          <input
            required
            type="name"
            name="representative-last-name"
            id="representative-last-name"
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Enter the Representative's Last Name"
          />
        </div>

        {/* Representative Last Name*/}
        <div>
          <label
            htmlFor="representative-email-address"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Representative Email Address <span className="font-light text-red-500">(Required)</span>
          </label>
          <input
            required
            type="email"
            name="representative-email-address"
            id="representative-email-address"
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Enter the Representative's Email Address"
          />
        </div>
      </form>

      <div className="mt-8 flex items-center justify-between">
        {/* BACK TO LOGIN LINK */}
        <button className="-mt-4 inline-flex items-center gap-2 font-jost text-xl font-regular tracking-wide text-purple hover:text-purple cursor-pointer transition-colours">
          <span className="material-icons-sharp">arrow_back</span>
          <span> Back to Step 1</span>
        </button>

        {/* Next Button */}
        <button
          type="submit"
          className="cursor-pointer px-6 py-3 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span> Complete Registration Request </span>
        </button>
      </div>
    </div>
  );
}

export default RepresentativeInformationForm;
