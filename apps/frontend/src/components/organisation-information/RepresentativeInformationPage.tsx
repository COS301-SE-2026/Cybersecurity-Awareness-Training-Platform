function RepresentativeInformationPage() {
  return (
    <div className="-mt-2 -ml-2">
      {/* HEADING */}
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Organisation Representative Information
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost text-gray-500 mb-6">
        View the nominated organisation representative and initial administrator setup status.
      </p>

      <div className="flex flex-col flex-1 max-w-[57.05rem] w-full grid grid-cols-2 gap-6">
        {/* Rep Full Name (FName(s) + LName */}
        <div>
          <label
            htmlFor="rep-name"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Full Name
          </label>
          <input
            required
            type="text"
            name="rep-name"
            id="rep-name"
            disabled={true}
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Representative Full Name"
          />
        </div>

        {/* Rep Email Address */}
        <div>
          <label
            htmlFor="rep-email-address"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Email Address
          </label>
          <input
            required
            type="text"
            name="rep-email-address"
            id="rep-email-address"
            disabled={true}
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Representative Email Address"
          />
        </div>

        {/* Initial Admin Setup Status */}
        <div>
          <label
            htmlFor="setup-status"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Initial Administrator Setup Status
          </label>
          <input
            required
            type="text"
            name="setup-status"
            id="setup-status"
            disabled={true}
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Initial Administrator Setup Status"
          />
        </div>
      </div>

      {/* NOTE: ONLY SHOW THIS WHEN APPROPRIATE */}
      {/* Like, when Status = EXPIRED, BUT NOT WHEN  Status = Complete */}
      <div className="mt-8 flex items-center justify-between">
        {/* Resend Initial Administrator Setup Email Button */}
        <button
          type="button"
          className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="material-icons-sharp">send</span>
          <span> Resend Initial Administrator Setup Email </span>
        </button>
      </div>
    </div>
  );
}

export default RepresentativeInformationPage;
