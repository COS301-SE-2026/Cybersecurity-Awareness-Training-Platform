import AppLayout from '../components/layout/AppLayout';
import { useState } from 'react';
import StatusBadge from '../components/ui/StatusBadge';

function CampaignInsightsPage() {
  const [isLoading] = useState(false);
  const [error] = useState(false);

  return (
    <AppLayout
      contentStyle={{
        backgroundColor: '#F3F4F6',
      }}
    >
      <div>
        {/* HEADING  and SUB-HEADING */}
        <div
          style={{
            padding: '1.4rem',
            boxSizing: 'border-box',
            flexShrink: 0,
            paddingBottom: '0.4rem',
          }}
        >
          <button
            type="button"
            className="-mt-4 inline-flex items-center gap-2 font-jost text-xl font-regular tracking-wide text-purple hover:text-purple cursor-pointer transition-colours"
          >
            <span className="material-icons-sharp">arrow_back</span>
            <span className="hover:underline"> Back to Campaigns</span>
          </button>

          <h1
            style={{
              margin: 0,
              marginBottom: '0.4rem',
              fontWeight: 500,
              fontSize: '2.8rem',
              lineHeight: 1,
              fontFamily: 'Jost',
              color: 'rgb(132, 25, 255)',
            }}
          >
            {'Campaign Name'}
          </h1>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost font-medium text-dark-pink mt-4 mb-1">
                Status
              </p>
              <div className="font-overpass tracking-wider">
                <StatusBadge status="Active" />
              </div>
            </div>

            <div>
              <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink mt-4 mb-1">
                Duration
              </p>
              <p className="font-regular tracking-wider text-md font-google_sans_code text-gray-500">
                12 Aug 2026 to 30 Sep 2026
              </p>
            </div>

            <div>
              <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink mt-4 mb-1">
                Campaign Type
              </p>
              <p className="font-regular tracking-wider text-md font-google_sans_code text-gray-500">
                Training
              </p>
            </div>

            <div>
              <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink mt-4 mb-1">
                Campaign Owner
              </p>
              <p className="font-regular tracking-wider text-md font-google_sans_code text-gray-500">
                Organisation
              </p>
            </div>
          </div>

          {/* CAMPAIGN DESCRIPTION */}
          <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink mt-4 mb-1">
            Description
          </p>
          <div className="bg-neutral-secondary-medium border border-default-medium p-2 font-regular tracking-wider shadow-xs text-[1.1rem] font-justify font-jost text-gray-500 mb-2">
            Select the organisation trainees you want to assign training campaigns to, then choose
            the campaigns and review your assignments before submitting. Assigning new campaigns
            will not affect campaigns already assigned to organisation trainees or reset their
            progress.
          </div>

          <div className="grid grid-cols-5 gap-3 py-2 px-4 bg-white border border-default-medium p-2 font-regular tracking-wider shadow-xs text-[1.1rem] font-justify font-jost text-gray-500 mb-2">
            {/* Assigned Count */}
            <div>
              <div>
                <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink">
                  Assigned
                </p>
                <p className="font-regular tracking-wider text-[1.3rem] font-justify font-medium font-google_sans_code text-purple">
                  16
                </p>
              </div>
            </div>

            {/* Started Count */}
            <div>
              <div>
                <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink">
                  Started
                </p>
                <p className="font-regular tracking-wider text-[1.3rem] font-justify font-medium font-google_sans_code text-purple">
                  6
                </p>
              </div>
            </div>

            {/* Completed Count */}
            <div>
              <div>
                <p className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink">
                  Completed
                </p>
                <p className="font-regular tracking-wider text-[1.3rem] font-justify font-medium font-google_sans_code text-purple">
                  2
                </p>
              </div>
            </div>

            {/* Campaign Progression */}
            <div>
              <div>
                <p
                  title="Overall Average Campaign Progression Percentage"
                  className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink"
                >
                  Progression
                </p>
                <p className="font-regular tracking-wider text-[1.3rem] font-justify font-medium font-google_sans_code text-purple">
                  58%
                </p>
              </div>
            </div>

            {/* Campaign Progression */}
            <div>
              <div>
                <p
                  title="Overall Average Quiz Grade"
                  className="font-regular tracking-wider text-[1.1rem] font-justify font-medium font-jost text-dark-pink"
                >
                  Quiz Average
                </p>
                <p className="font-regular tracking-wider text-[1.3rem] font-justify font-medium font-google_sans_code text-purple">
                  72%
                </p>
              </div>
            </div>
          </div>

          {/* Table Heading */}
          <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium mb-3 mt-8">
            Assigned Trainees (Assigned Trainee Count Here)
          </h3>

          {/* Assigned Trainees Table */}
          <div className="relative max-h-[12rem] overflow-y-auto overflow-x-auto bg-neutral-primary-soft border border-default">
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
                    Progress
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Items
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Quiz
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                  >
                    Action(s)
                  </th>
                </tr>
              </thead>
              <tbody className="font-overpass font-regular text-[1rem] tracking-wider">
                {/* {isLoading && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-[1.2rem] tracking-wider text-gray-600 font-jost"
                    >
                      <LoadingSpinnerSVG />
                      Loading Assigned Trainees...
                    </td>
                  </tr>
                )} */}

                {/* {!isLoading && error && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-[1.2rem] tracking-wider text-red-600 font-jost"
                    >
                      {error}
                    </td>
                  </tr>
                )} */}

                {/* {!isLoading && !error && ( // and trainee length is 0
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-[1.2rem] tracking-wider text-red-600 font-jost"
                    >
                      No Assigned Trainees Found
                    </td>
                  </tr>
                )} */}

                {!isLoading && !error && (
                  <tr className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default">
                    {/* Full Name */}
                    <td
                      className="truncate max-w-[4rem] px-6 py-2"
                      title={'Adriano Roberto Da Costa Jorge'}
                    >
                      Adriano Roberto Da Costa Jorge
                    </td>

                    {/* Email Address */}
                    <td
                      className="truncate max-w-[4rem] px-6 py-2"
                      title={'adriano.roberto.da_cost.jorge@cbell.co.za'}
                    >
                      <a
                        href={`mailto:${'cbell@cbell.co.za'}`}
                        className="text-fg-brand hover:underline font-google_sans_code"
                      >
                        {'adriano.roberto.da_cost.jorge@example.com'}
                      </a>
                    </td>

                    {/* Progress */}
                    <td className="px-6 py-2">
                      <span className="text-sm font-google_sans_code text-purple">50%</span>
                      <div className="w-full bg-neutral-quaternary h-2.5">
                        <div className="bg-main-purple h-2.5" style={{ width: 50 }}></div>
                      </div>
                    </td>

                    {/* Items Completed */}
                    <td
                      className="truncate max-w-[4rem] px-6 py-2 font-google_sans_code"
                      title={'6 out of 12 Campaign Items Completed'}
                    >
                      6/12
                    </td>

                    {/* Quiz Percentage */}
                    <td
                      className="px-6 py-2 font-google_sans_code"
                      title={'100% Overall Quiz Average'}
                    >
                      100%
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-2">
                      <StatusBadge status="Active" />
                    </td>

                    {/* Actions Dropdown */}
                    <td className="px-6 py-2">
                      <button
                        className="cursor-pointer font-jost text-[1.1rem] text-red-600 hover:underline"
                        type="button"
                        title={
                          'Unassign this Trainee (Adriano Roberto Da Costa Jorge) from the Current Campaign (Campaign Name)'
                        }
                      >
                        <strong>Unassign</strong>
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
export default CampaignInsightsPage;
