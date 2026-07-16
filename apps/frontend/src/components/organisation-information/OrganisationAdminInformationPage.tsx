/*

HEY ZOË (INTEGRATION TEAM), PLEASE USE THESE BADGES FOR ANY BADGES YOU MAY NEED! THANK YOU!! 
<span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-brand-subtle text-fg-brand-strong text-sm font-medium rounded bg-brand-softer">Brand</span>
<span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-default text-heading text-sm font-medium rounded bg-neutral-primary-soft">Alternative</span>
<span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-default-medium text-heading text-sm font-medium rounded bg-neutral-secondary-medium">Gray</span>
<span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-danger-subtle text-fg-danger-strong text-sm font-medium rounded bg-danger-soft">Danger</span>
<span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-success-subtle text-fg-success-strong text-sm font-medium rounded bg-success-soft">Success</span>
<span className="items-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset ring-warning-subtle text-fg-warning text-sm font-medium rounded bg-warning-soft">Warning</span>

ADJUST WIDTH AS NECESSARY... 

*/

function OrganisationAdminInformationPage() {
  return (
    <div className="-mt-2 -ml-2">
      {/* HEADING */}
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Organisation Administrators
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost text-gray-500 mb-4">
        View the organisation's current administrators and their account status.
      </p>

      {/* Admin Table */}
      <div className="relative overflow-x-auto bg-neutral-primary-soft border border-default mt-7">
        <table className="w-full text-sm text-left rtl:text-right text-body">
          <thead className="bg-faint-purple border-b border-default">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
              >
                Full Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
              >
                Email Address
              </th>
              <th
                scope="col"
                className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
              >
                Administrator Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="font-overpass font-regular text-[1rem] tracking-wide">
            {/* Admin 1 */}
            <tr className="odd:bg-neutral-primary font-overpass even:bg-neutral-secondary-soft border-b border-default">
              <th scope="row" className="px-6 py-4 font-medium text-gray-600 whitespace-nowrap">
                Full Name 1
              </th>
              <td className="px-6 py-4">email_1@example.com</td>
              <td className="px-6 py-4">
                <span className="inline-flex justify-center items-center w-30 px-6 py-1 pt-[0.4rem] ring-1 ring-inset ring-success-subtle text-fg-success-strong text-sm font-medium bg-success-soft">
                  Active
                </span>
              </td>
              <td className="px-6 py-4">
                <button className="cursor-pointer font-medium text-red-600 hover:underline mr-6">
                  Remove
                </button>
                <button className="cursor-pointer font-medium text-fg-brand hover:underline mr-6">
                  Edit
                </button>
                <button className="cursor-pointer font-medium text-fg-brand hover:underline">
                  Re-Send Invite
                </button>
              </td>
            </tr>
            {/* Admin 2 */}
            <tr className="odd:bg-neutral-primary font-overpass even:bg-neutral-secondary-soft">
              <th scope="row" className="px-6 py-4 font-medium text-gray-600 whitespace-nowrap">
                Full Name 2
              </th>
              <td className="px-6 py-4">email_2@example.com</td>
              <td className="px-6 py-4">
                <span className="inline-flex justify-center items-center w-30 px-6 py-1 pt-[0.4rem] ring-1 ring-inset ring-warning-subtle text-fg-warning text-sm font-medium bg-warning-soft">
                  Pending
                </span>
              </td>
              <td className="px-6 py-4">
                <button className="cursor-pointer font-medium text-red-600 hover:underline mr-6">
                  Remove
                </button>
                <button className="cursor-pointer font-medium text-fg-brand hover:underline mr-6">
                  Edit
                </button>
                <button className="cursor-pointer font-medium text-fg-brand hover:underline">
                  Re-Send Invite
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OrganisationAdminInformationPage;
