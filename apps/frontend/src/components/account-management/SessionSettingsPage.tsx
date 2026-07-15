import { Dropdown, DropdownItem } from 'flowbite-react';

function SessionSettingsPage() {
  return (
    <div className="-mt-2 -ml-2">
      {/* HEADING */}
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Session Settings
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost text-gray-500 mb-4">
        View and manage your recent sessions and configure how sessions on your account behave.
      </p>

      <div className="flex items-center justify-between">
        {/* Sessions HEADING */}
        <h3 className="font-jost text-[1.3rem] text-purple tracking-wider font-medium mb-2">
          Active Sessions (4)
          {/* THIS SHOULD INDICATE THE TOTAL NUMBER OF SESSIONS */}
        </h3>

        <button
          type="button"
          className="cursor-pointer font-overpass text-[1rem] font-medium text-red-600 hover:underline"
        >
          Log Out All Sessions
        </button>
      </div>

      {/* SESSIONS TABLE */}
      <div className="relative overflow-x-auto bg-neutral-primary-soft border border-default">
        <table className="w-full text-sm text-left rtl:text-right text-body">
          <thead className="bg-faint-purple border-b border-default">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
              >
                Device
              </th>
              <th
                scope="col"
                className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
              >
                Browser
              </th>
              <th
                scope="col"
                className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
              >
                Location
              </th>
              <th
                scope="col"
                className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
              >
                Last Active
              </th>
              <th
                scope="col"
                className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody className="font-overpass font-regular text-[1rem] tracking-wide">
            {/* SESSION 1 */}
            <tr className="odd:bg-neutral-primary font-overpass even:bg-neutral-secondary-soft border-b border-default">
              <th scope="row" className="px-6 py-4 font-medium text-gray-600 whitespace-nowrap">
                Apple iPhone <span className="text-fg-brand">(Current Session)</span>
              </th>
              <td className="px-6 py-4">Safari</td>
              <td className="px-6 py-4">Johannesburg, Gauteng, South Africa</td>
              <td className="px-6 py-4">Monday, 16 June 2026, 11:30 PM</td>
              <td className="px-6 py-4">
                <button className="cursor-pointer font-medium text-red-600 hover:underline">
                  Log Out Session
                </button>
              </td>
            </tr>
            {/* SESSION 2 */}
            <tr className="odd:bg-neutral-primary font-overpass even:bg-neutral-secondary-soft border-default">
              <th scope="row" className="px-6 py-4 font-medium text-gray-600 whitespace-nowrap">
                Windows 11 Personal Computer
              </th>
              <td className="px-6 py-4">Chrome</td>
              <td className="px-6 py-4">Pretoria, Gauteng, South Africa</td>
              <td className="px-6 py-4">Friday, 13 June 2026, 08:15 AM</td>
              <td className="px-6 py-4">
                <button className="cursor-pointer font-medium text-red-600 hover:underline">
                  Log Out Session
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {/* Max 2  */}
      {/* <nav className="mt-2  ">
        <ul className="flex -space-x-px">
          <li>
            <button className="flex items-center justify-center font-jost tracking-wider text-md font-medium text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-dark-pink px-3 h-9 focus:outline-none">
              Previous
            </button>
          </li>
          <li>
            <button className="flex items-center justify-center font-jost tracking-wider text-md font-medium text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-dark-pink px-3 h-9 focus:outline-none">
              1
            </button>
          </li>
          <li>
            <button className="flex items-center justify-center font-jost tracking-wider text-md font-medium text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-dark-pink px-3 h-9 focus:outline-none">
              2
            </button>
          </li>
          <li>
            <button className="flex items-center justify-center font-jost tracking-wider text-md font-medium text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-dark-pink px-3 h-9 focus:outline-none">
              Next
            </button>
          </li>
        </ul>
      </nav> */}

      {/* HEADING */}
      <h3 className="font-jost text-[1.3rem] text-purple tracking-wider font-medium mt-12  -mb-3">
        Session Preferences
      </h3>

      <div className="flex items-end justify-between">
        {/* DROPDOWNS  */}
        <div className="mt-4 grid grid-cols-3 flex-1 max-w-4xl gap-6">
          {/* DROPDOWN 1: Regular Session Length Dropdown */}
          <div>
            {/* Label */}
            <label
              htmlFor="regular-session-duration"
              className=" block mb-2 font-jost tracking-wide text-[1.2rem] font-regular text-dark-pink"
            >
              Regular Session Duration
            </label>

            <Dropdown
              label="30 Days"
              className="border border-gray-200 bg-gray-100 hover:bg-gray-100 text-body rounded-none font-overpass text-[1rem]"
            >
              <DropdownItem className="font-overpass text-[1rem]">1 Day</DropdownItem>
              <DropdownItem className="font-overpass text-[1rem]">7 Days</DropdownItem>
              <DropdownItem className="font-overpass text-[1rem]">14 Days</DropdownItem>
              <DropdownItem className="font-overpass text-[1rem]">30 Days</DropdownItem>
            </Dropdown>
          </div>

          {/* DROPDOWN 2: Remember Me Duration */}
          <div>
            {/* Label */}
            <label
              htmlFor="remember-me-duration"
              className=" block mb-2 font-jost tracking-wide text-[1.2rem] font-regular text-dark-pink"
            >
              "Remember Me" Duration
            </label>

            <Dropdown
              label="Always"
              className="border border-gray-200 bg-gray-100 hover:bg-gray-100 text-body rounded-none font-overpass text-[1rem]"
            >
              <DropdownItem className="font-overpass text-[1rem]">Never</DropdownItem>
              <DropdownItem className="font-overpass text-[1rem]">1 Day</DropdownItem>
              <DropdownItem className="font-overpass text-[1rem]">7 Days</DropdownItem>
              <DropdownItem className="font-overpass text-[1rem]">14 Days</DropdownItem>
              <DropdownItem className="font-overpass text-[1rem]">30 Days</DropdownItem>
              <DropdownItem className="font-overpass text-[1rem]">Always</DropdownItem>
            </Dropdown>
          </div>

          {/* DROPDOWN 3: Idle Timeout */}
          <div>
            {/* Label */}
            <label
              htmlFor="idle-timeout-duration"
              className=" block mb-2 font-jost tracking-wide text-[1.2rem] font-regular text-dark-pink"
            >
              Idle Timeout Duration
            </label>

            <Dropdown
              label="5 Minutes"
              className="border border-gray-200 bg-gray-100 hover:bg-gray-100 text-body rounded-none font-overpass text-[1rem]"
            >
              <DropdownItem className="font-overpass text-[1rem]">5 Minutes</DropdownItem>
              <DropdownItem className="font-overpass text-[1rem]">15 Minutes</DropdownItem>
              <DropdownItem className="font-overpass text-[1rem]">30 Minutes</DropdownItem>
              <DropdownItem className="font-overpass text-[1rem]">1 Hour</DropdownItem>
              <DropdownItem className="font-overpass text-[1rem]">2 Hours</DropdownItem>
              <DropdownItem className="font-overpass text-[1rem]">Never</DropdownItem>
            </Dropdown>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          {/* Update Session Settings Button */}
          <button
            type="button"
            className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="material-icons-sharp">save</span>
            <span> Update Session Settings </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionSettingsPage;
