// props for basic org info tab
// displaying org basic details with all fields disabled for view-only mode

export interface BasicOrganisationInfoProps {
  name?: string;
  description?: string;
  website?: string;
  size?: string | number;
  registeredTrainees?: string | number;
  registrationDate?: string;
  status?: string;
  isRequestOnly?: boolean;
}

function BasicOrganisationInformationPage({
  name = '',
  description = '',
  website = '',
  size = '',
  registeredTrainees = '',
  registrationDate = '',
  status = '',
  isRequestOnly = false,
}: BasicOrganisationInfoProps) {
  // convert ISO timestamp string to YYYY-MM-DD format for date input
  const formattedDate = registrationDate ? registrationDate.split('T')[0] : '';

  return (
    <div className="-mt-2 -ml-2">
      {/* HEADING */}
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Basic Organisation Information
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost text-gray-500 mb-6">
        View the organisation's registered information and current status.
      </p>

      <div className="flex flex-col flex-1 w-full grid grid-cols-3 gap-6">
        {/* Organisation Name*/}
        <div>
          <label
            htmlFor="organisation-name"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Name
          </label>
          <input
            required
            type="text"
            name="organisation-name"
            id="organisation-name"
            disabled={true}
            value={name}
            readOnly
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Organisation Name"
          />
        </div>

        {/* Organisation Description */}
        <div>
          <label
            htmlFor="organisation-description"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Description
          </label>
          <input
            required
            type="text"
            name="organisation-description"
            id="organisation-description"
            disabled={true}
            value={description}
            readOnly
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Organisation Description"
          />
        </div>

        {/* Organisation Website */}
        <div>
          <label
            htmlFor="organisation-website"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Website
          </label>
          <input
            required
            type="text"
            name="organisation-website"
            id="organisation-website"
            disabled={true}
            value={website}
            readOnly
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Organisation Website"
          />
        </div>

        {/* Organisation Size */}
        <div>
          <label
            htmlFor="organisation-size"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Size{' '}
            <span className="font-light text-[1.14159rem] text-gray-500">
              (Approximate Number of Employees)
            </span>
          </label>
          <input
            required
            type="text"
            name="organisation-size"
            id="organisation-size"
            disabled={true}
            value={size}
            readOnly
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Organisation Size"
          />
        </div>

        {/* Registered # of Employees (Trainees) - Only shown for active organisation */}
        {!isRequestOnly && (
          <div>
            <label
              htmlFor="registered-trainees"
              className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
            >
              Registered Trainees
            </label>
            <input
              required
              type="text"
              name="registered-trainees"
              id="registered-trainees"
              disabled={true}
              value={registeredTrainees}
              readOnly
              className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="Registered Number of Trainees"
            />
          </div>
        )}

        {/* Organisation Registration Date / Request Submission Date */}
        <div>
          <label
            htmlFor="registration-date"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            {isRequestOnly ? 'Request Submission Date' : 'Registration Date'}
          </label>
          <input
            required
            type="date"
            name="registration-date"
            id="registration-date"
            disabled={true}
            value={formattedDate}
            readOnly
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder={isRequestOnly ? 'Request Submission Date' : 'Registration Date'}
          />
        </div>

        {/* Organisation Status */}
        <div>
          <label
            htmlFor="status"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Status
          </label>
          <input
            type="text"
            name="status"
            id="status"
            disabled={true}
            value={status}
            readOnly
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Organisation Status"
          />
        </div>
      </div>
    </div>
  );
}

export default BasicOrganisationInformationPage;
