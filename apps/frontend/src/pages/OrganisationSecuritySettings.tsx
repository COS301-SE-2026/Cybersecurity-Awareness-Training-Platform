import AppLayout from '../components/layout/AppLayout';
import { Dropdown, DropdownItem } from 'flowbite-react';

function OrganisationSecuritySettings() {
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
            Organisation Security Preferences
          </h1>

          {/* SUB-HEADING */}
          <p className="font-regular tracking-wider text-[1.3rem] font-justify font-jost text-gray-500 mb-4">
            Configure organisation-wide security policies for all users.
          </p>
        </div>

        <div className="px-6 pb-6">
          <div className="grid grid-cols-3 gap-6">
            {/* ========== "Remember Me" Policy ========== */}
            <div>
              {/* Label */}
              <label
                htmlFor="remember-me-policy"
                className=" block mb-1 font-jost tracking-wide text-[1.4rem] font-medium text-dark-pink"
              >
                "Remember Me" Policy
              </label>

              {/* Enfore Checkbox */}
              <div className="flex items-center mb-2 ml-2">
                <input
                  id="enfore-remember-me"
                  type="checkbox"
                  className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft"
                />
                <label
                  htmlFor="enfore-remember-me"
                  className="select-none ms-2 text-[1.1rem] font-jost text-body tracking-wide font-regular"
                >
                  Enfore "Remember Me" Policy
                </label>
              </div>

              {/* Allow Checkbox */}
              <div className="flex items-center mb-2 ml-2">
                <input
                  id="allow-remember-me"
                  type="checkbox"
                  className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft"
                />
                <label
                  htmlFor="allow-remember-me"
                  className="select-none ms-2 text-[1.1rem] font-jost text-body tracking-wide font-regular"
                >
                  Allow "Remember Me"
                </label>
              </div>

              {/* Dropdown */}
              <div>
                <div className="mb-2">
                  <label
                    htmlFor="default-checkbox"
                    className="select-none ml-2 text-[1.1rem] font-jost text-body tracking-wide font-medium"
                  >
                    Maxiumum Remembered Session Length
                  </label>
                </div>

                <Dropdown
                  label="30 Days"
                  className="ml-2 border border-gray-200 bg-gray-100 hover:bg-gray-100 text-body rounded-none font-overpass text-[1rem]"
                >
                  <DropdownItem className="font-overpass text-[1rem]">1 Day</DropdownItem>
                  <DropdownItem className="font-overpass text-[1rem]">7 Days</DropdownItem>
                  <DropdownItem className="font-overpass text-[1rem]">14 Days</DropdownItem>
                  <DropdownItem className="font-overpass text-[1rem]">30 Days</DropdownItem>
                </Dropdown>
              </div>
            </div>
            {/* ========== "Remember Me" Policy ========== */}

            {/* ========== Regular Session Length ========== */}
            <div>
              {/* Label */}
              <label
                htmlFor="remember-me-policy"
                className=" block mb-1 font-jost tracking-wide text-[1.4rem] font-medium text-dark-pink"
              >
                Regular Session Length
              </label>

              {/* Enfore Checkbox */}
              <div className="flex items-center mb-2 ml-2">
                <input
                  id="enfore-regular-session"
                  type="checkbox"
                  className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft"
                />
                <label
                  htmlFor="enfore-regular-session"
                  className="select-none ms-2 text-[1.1rem] font-jost text-body tracking-wide font-regular"
                >
                  Enfore Regular Session Length
                </label>
              </div>

              {/* Dropdown */}
              <div>
                <div className="mb-2">
                  <label
                    htmlFor="default-checkbox"
                    className="select-none ml-2 text-[1.1rem] font-jost text-body tracking-wide font-medium"
                  >
                    Regular Session Length
                  </label>
                </div>

                <Dropdown
                  label="30 Days"
                  className="ml-2 border border-gray-200 bg-gray-100 hover:bg-gray-100 text-body rounded-none font-overpass text-[1rem]"
                >
                  <DropdownItem className="font-overpass text-[1rem]">1 Day</DropdownItem>
                  <DropdownItem className="font-overpass text-[1rem]">7 Days</DropdownItem>
                  <DropdownItem className="font-overpass text-[1rem]">14 Days</DropdownItem>
                  <DropdownItem className="font-overpass text-[1rem]">30 Days</DropdownItem>
                </Dropdown>
              </div>
            </div>
            {/* ========== Regular Session Length ========== */}

            {/* ========== Idle Timeout ========== */}
            <div>
              {/* Label */}
              <label
                htmlFor="remember-me-policy"
                className=" block mb-1 font-jost tracking-wide text-[1.4rem] font-medium text-dark-pink"
              >
                Idle Timeout
              </label>

              {/* Enfore Checkbox */}
              <div className="flex items-center mb-2 ml-2">
                <input
                  id="enfore-idle-timeout"
                  type="checkbox"
                  className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft"
                />
                <label
                  htmlFor="enfore-idle-timeout"
                  className="select-none ms-2 text-[1.1rem] font-jost text-body tracking-wide font-regular"
                >
                  Enfore Idle Timeout
                </label>
              </div>

              {/* Dropdown */}
              <div>
                <div className="mb-2">
                  <label
                    htmlFor="default-checkbox"
                    className="select-none ml-2 text-[1.1rem] font-jost text-body tracking-wide font-medium"
                  >
                    Idle Timeout
                  </label>
                </div>

                <Dropdown
                  label="30 Days"
                  className="ml-2 border border-gray-200 bg-gray-100 hover:bg-gray-100 text-body rounded-none font-overpass text-[1rem]"
                >
                  <DropdownItem className="font-overpass text-[1rem]">1 Day</DropdownItem>
                  <DropdownItem className="font-overpass text-[1rem]">7 Days</DropdownItem>
                  <DropdownItem className="font-overpass text-[1rem]">14 Days</DropdownItem>
                  <DropdownItem className="font-overpass text-[1rem]">30 Days</DropdownItem>
                </Dropdown>
              </div>
            </div>
            {/* ========== Idle Timeout ========== */}

            {/* ========== Trainee Settings ========== */}
            <div>
              {/* Label */}
              <label
                htmlFor="remember-me-policy"
                className=" block mb-1 font-jost tracking-wide text-[1.4rem] font-medium text-dark-pink"
              >
                Trainee Settings
              </label>

              {/* Enfore Checkbox */}
              <div className="flex items-center mb-2 ml-2">
                <input
                  id="enfore-idle-timeout"
                  type="checkbox"
                  className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft"
                />
                <label
                  htmlFor="enfore-idle-timeout"
                  className="select-none ms-2 text-[1.1rem] font-jost text-body tracking-wide font-regular"
                >
                  Allow Trainees to Change Email Address
                </label>
              </div>
            </div>
            {/* ========== Trainee Settings ========== */}

            {/* ========== Sensitive Actions ========== */}
            <div>
              {/* Label */}
              <label
                htmlFor="remember-me-policy"
                className=" block mb-1 font-jost tracking-wide text-[1.4rem] font-medium text-dark-pink"
              >
                Sensitive Actions
              </label>

              {/* Enfore Checkbox */}
              <div className="flex items-center mb-2 ml-2">
                <input
                  id="enfore-idle-timeout"
                  type="checkbox"
                  className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft"
                />
                <label
                  htmlFor="enfore-idle-timeout"
                  className="select-none ms-2 text-[1.1rem] font-jost text-body tracking-wide font-regular"
                >
                  Require Re-Login for Sensitive Actions
                </label>
              </div>
            </div>
            {/* ========== Trainee Settings ========== */}

            <div className="self-end pl-2">
              <div className="flex items-start gap-2 text-gray-500">
                <span className="material-symbols-sharp">info</span>
                <div>
                  <p className="mt-1 font-overpass max-w-xs text-[1.1rem] tracking-wide text-gray-500">
                    Some security changes apply only to new sessions, page refreshes, or the user's
                    next login.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            {/* Update Personal Information Button */}
            <button
              type="button"
              className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-icons-sharp">save</span>
              <span> Update Organisation Security Preferences </span>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default OrganisationSecuritySettings;
