import type { OrganisationAdminSummaryDto } from '@insightful-phish/shared';

export interface OrganisationAdminInfoProps {
  admins?: OrganisationAdminSummaryDto[];
  isRequestOnly?: boolean;
}

function renderAdminContent(isRequestOnly: boolean, displayAdmins: OrganisationAdminSummaryDto[]) {
  if (isRequestOnly) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 font-overpass rounded-none mt-4">
        <p className="font-medium">
          Pending Request: Organisation has not been fully created yet. High-level administrator
          list will appear once onboarding begins.
        </p>
      </div>
    );
  }

  if (displayAdmins.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 text-gray-600 font-overpass rounded-none mt-4">
        No organisation administrators.
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto bg-neutral-primary-soft border border-default mt-7 rounded-none">
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
          {displayAdmins.map((admin) => {
            const fullName =
              admin.firstName && admin.lastName
                ? `${admin.firstName} ${admin.lastName}`
                : admin.firstName || admin.email;
            const isActive = admin.adminStatus === 'ACTIVE';

            return (
              <tr
                key={admin.id}
                className="odd:bg-neutral-primary font-overpass even:bg-neutral-secondary-soft border-b border-default"
              >
                <th scope="row" className="px-6 py-4 font-medium text-gray-600 whitespace-nowrap">
                  {fullName} {admin.isInitialAdmin ? '(Initial Admin)' : ''}
                </th>
                <td className="px-6 py-4">{admin.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset text-sm font-medium rounded-none ${
                      isActive
                        ? 'ring-success-subtle text-fg-success-strong bg-success-soft'
                        : 'ring-warning-subtle text-fg-warning bg-warning-soft'
                    }`}
                  >
                    {isActive ? 'Active' : 'Pending/Disabled'}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OrganisationAdminInformationPage({
  admins,
  isRequestOnly = false,
}: Readonly<OrganisationAdminInfoProps>) {
  const displayAdmins = admins ?? [];

  return (
    <div className="-mt-2 -ml-2">
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Organisation Administrators
      </h3>
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost text-gray-500 mb-4">
        View the organisation's current administrators and their account status.
      </p>
      {renderAdminContent(isRequestOnly, displayAdmins)}
    </div>
  );
}

export default OrganisationAdminInformationPage;
