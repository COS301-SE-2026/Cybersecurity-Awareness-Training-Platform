import { Dropdown, DropdownItem } from 'flowbite-react';

function OrganisationAdminInformationPage() {
  return (
    <div className="-mt-2 -ml-2">
      {/* HEADING */}
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Organisation Administrators
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost text-gray-500 mb-4">
        Sub-heading...
      </p>

      {/* Admin Table */}
      <div className="relative overflow-x-auto bg-neutral-primary-soft border border-default">
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
                Status
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
              <td className="px-6 py-4">Active</td>
            </tr>
            {/* Admin 2 */}
            <tr className="odd:bg-neutral-primary font-overpass even:bg-neutral-secondary-soft">
              <th scope="row" className="px-6 py-4 font-medium text-gray-600 whitespace-nowrap">
                Full Name 2
              </th>
              <td className="px-6 py-4">email_2@example.com</td>
              <td className="px-6 py-4">Pending</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OrganisationAdminInformationPage;
