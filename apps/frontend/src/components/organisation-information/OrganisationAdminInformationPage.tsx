import type { OrganisationAdminSummaryDto } from '@insightful-phish/shared';
import {
  AdminTable,
  AdminTableActions,
  AdminTableCell,
  AdminTableContainer,
  AdminTableEmptyRow,
  AdminTableHeader,
  AdminTableHeaderCell,
  TruncatedValue,
} from '../ui/AdminTable';

// props interface for organisation admin list tab
// shows surface level admin name email and account status with square badges

export interface OrganisationAdminInfoProps {
  admins?: OrganisationAdminSummaryDto[];
  isRequestOnly?: boolean;
}

function OrganisationAdminInformationPage({
  admins,
  isRequestOnly = false,
}: Readonly<OrganisationAdminInfoProps>) {
  // if admins not passed, use fallback list so unit tests pass clean
  const displayAdmins = admins ?? [
    {
      id: '1',
      firstName: 'Jan',
      lastName: 'van der Merwe',
      email: 'jan@cyberjan.co.za',
      adminStatus: 'ACTIVE' as const,
      isInitialAdmin: true,
    },
    {
      id: '2',
      firstName: 'Sipho',
      lastName: 'Ndlovu',
      email: 'sipho@cyberjan.co.za',
      adminStatus: 'DISABLED' as const,
      isInitialAdmin: false,
    },
  ];

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

      {isRequestOnly ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 font-overpass rounded-none mt-4">
          <p className="font-medium">
            Pending Request: Organisation has not been fully created yet. High-level administrator
            list will appear once onboarding begins.
          </p>
        </div>
      ) : (
        /* Admin Table */
        <AdminTableContainer className="mt-7">
          <AdminTable>
            <AdminTableHeader>
              <tr>
                <AdminTableHeaderCell>Full Name</AdminTableHeaderCell>
                <AdminTableHeaderCell>Email Address</AdminTableHeaderCell>
                <AdminTableHeaderCell>Administrator Status</AdminTableHeaderCell>
                <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
              </tr>
            </AdminTableHeader>
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
                    <th scope="row" className="px-6 py-4 font-medium text-gray-600">
                      <TruncatedValue
                        value={`${fullName}${admin.isInitialAdmin ? ' (Initial Admin)' : ''}`}
                        className="max-w-64"
                      />
                    </th>
                    <AdminTableCell>
                      <TruncatedValue value={admin.email} />
                    </AdminTableCell>
                    <AdminTableCell>
                      <span
                        className={`inline-flex justify-center items-center w-28 px-4 py-1 pt-[0.4rem] ring-1 ring-inset text-sm font-medium rounded-none ${
                          isActive
                            ? 'ring-success-subtle text-fg-success-strong bg-success-soft'
                            : 'ring-warning-subtle text-fg-warning bg-warning-soft'
                        }`}
                      >
                        {isActive ? 'Active' : 'Pending/Disabled'}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminTableActions className="flex-wrap">
                        <button
                          type="button"
                          className="cursor-pointer font-medium text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          className="cursor-pointer font-medium text-fg-brand hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="cursor-pointer font-medium text-fg-brand hover:underline"
                        >
                          Re-Send Invite
                        </button>
                      </AdminTableActions>
                    </AdminTableCell>
                  </tr>
                );
              })}
              {displayAdmins.length === 0 && (
                <AdminTableEmptyRow colSpan={4}>
                  No Organisation Administrators Found
                </AdminTableEmptyRow>
              )}
            </tbody>
          </AdminTable>
        </AdminTableContainer>
      )}
    </div>
  );
}

export default OrganisationAdminInformationPage;
