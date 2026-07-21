import AppLayout from '../components/layout/AppLayout';
import { Dropdown, DropdownItem } from 'flowbite-react';

function PlatformOrganisationManagementPage() {
  return (
    <AppLayout
      contentStyle={{
        //backgroundColor: '#F3F4F6',
        backgroundColor: 'white',
      }}
    >
      <div>
        {/* HEADING  and SUB-HEADING */}
        <div
          style={{
            padding: '1.4rem',
            paddingBottom: '0.8rem',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          <h1
            style={{
              margin: 0,
              marginBottom: '0.8rem',
              fontSize: '3.8rem',
              fontWeight: 500,
              lineHeight: 1,
              // color: 'white',
              color: 'rgb(132, 25, 255)',
              fontFamily: 'Jost',
            }}
          >
            Organisation Management
          </h1>

          {/* SUB-HEADING */}
          <p className="font-regular tracking-wider text-[1.3rem] font-justify font-jost text-gray-500 mb-4">
            Review organisation registration requests and manage existing organisations.
          </p>
        </div>

        <div className="px-6 pb-6">
          <div className="w-full">
            <div className="relative bg-white-purple border border-gray-200">
              <div className="flex flex-col items-center justify-between p-4 space-y-3 md:flex-row md:space-y-0 md:space-x-4">
                {/* ==== SEARCH BAR ==== */}
                <div className="w-full md:w-1/2">
                  <form className="flex items-center">
                    {/* Search Input Label */}
                    <label htmlFor="simple-search" className="sr-only">
                      Search Organisations
                    </label>
                    <div className="relative w-full">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        {/* SVG (Search Icon) */}
                        <svg
                          aria-hidden="true"
                          className="w-5 h-5 text-gray-400 dark:text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      {/* Search Input */}
                      <input
                        type="text"
                        id="simple-search"
                        className="font-jost tracking-wide block w-full p-2 pl-10 text-[1.1rem] h-[2.55rem] text-black border border-gray-300 bg-white focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Search Organisations"
                      />
                    </div>
                  </form>
                </div>
                {/* ==== SEARCH BAR ==== */}

                {/* ==== FILTERS ==== */}
                <div className="flex flex-col items-stretch justify-end flex-shrink-0 w-full space-y-2 md:w-auto md:flex-row md:space-y-0 md:items-center md:space-x-3">
                  {/* Request Status Filter Dropdown */}
                  <div className="flex items-center w-full space-x-3 md:w-auto">
                    <div>
                      <Dropdown
                        label={
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-sharp text-gray-400">filter_alt</span>
                            <span>Request Status</span>
                          </span>
                        }
                        className="ml-2 font-jost tracking-wide text-[1.1rem] font-light text-gray-500 border border-gray-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white rounded-none"
                      >
                        <DropdownItem className="font-jost text-gray-600 text-[1.1rem]">
                          All
                        </DropdownItem>
                        <DropdownItem className="font-jost text-gray-600 text-[1.1rem]">
                          Pending
                        </DropdownItem>
                        <DropdownItem className="font-jost text-gray-600 text-[1.1rem]">
                          Contacted
                        </DropdownItem>
                        <DropdownItem className="font-jost text-gray-600 text-[1.1rem]">
                          Rejected
                        </DropdownItem>
                        <DropdownItem className="font-jost text-gray-600 text-[1.1rem]">
                          Approval Waiting Setup
                        </DropdownItem>
                        <DropdownItem className="font-jost text-gray-600 text-[1.1rem]">
                          Active
                        </DropdownItem>
                      </Dropdown>
                    </div>
                  </div>

                  {/* Organisation Status Filter Dropdown */}
                  <div className="flex items-center w-full space-x-3 md:w-auto">
                    <div>
                      <Dropdown
                        label={
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-sharp text-gray-400">filter_alt</span>
                            <span>Organisation Status</span>
                          </span>
                        }
                        className="font-jost tracking-wide text-[1.1rem] font-light text-gray-500 border border-gray-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white rounded-none"
                      >
                        <DropdownItem className="font-jost text-gray-600 text-[1.1rem]">
                          All
                        </DropdownItem>
                        <DropdownItem className="font-jost text-gray-600 text-[1.1rem]">
                          Onboarding
                        </DropdownItem>
                        <DropdownItem className="font-jost text-gray-600 text-[1.1rem]">
                          Active
                        </DropdownItem>
                        <DropdownItem className="font-jost text-gray-600 text-[1.1rem]">
                          Suspended
                        </DropdownItem>
                        <DropdownItem className="font-jost text-gray-600 text-[1.1rem]">
                          Disabled
                        </DropdownItem>
                      </Dropdown>
                    </div>
                  </div>
                </div>
                {/* ==== FILTERS ==== */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default PlatformOrganisationManagementPage;
