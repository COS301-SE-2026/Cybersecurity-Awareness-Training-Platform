function PersonalSettingsPage() {
  return (
    <div className="-mt-2 -ml-2">
      {/* HEADING */}
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Personal Information Settings
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost mt-1 text-gray-500 mb-4">
        Sub-heading....
      </p>

      <form className="mt-4 grid grid-cols-2 gap-6" noValidate>
        {/* First Name*/}
        <div>
          <label
            htmlFor="first-name"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            First Name
            {/* <span className="font-light text-red-500">(Required)</span> */}
          </label>
          <input
            required
            type="text"
            name="first-name"
            id="first-name"
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Enter your First Name"
          />
        </div>

        {/* First Name*/}
        <div>
          <label
            htmlFor="last-name"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Last Name
            {/* <span className="font-light text-red-500">(Required)</span> */}
          </label>
          <input
            required
            type="text"
            name="last-name"
            id="last-name"
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Enter your Last Name"
          />
        </div>
      </form>

      <div className="mt-8 flex items-center justify-between">
        {/* Next Button */}
        <button
          type="button"
          className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="material-icons-sharp">save</span>
          <span> Update Personal Information </span>
        </button>
      </div>
    </div>
  );
}

export default PersonalSettingsPage;
