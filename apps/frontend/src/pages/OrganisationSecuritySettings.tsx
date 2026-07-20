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
          Organisation Security Settings
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
            <label
              htmlFor="default-checkbox"
              className="select-none ms-2 text-[1.1rem] font-jost text-body tracking-wide font-regular"
            >
              Maximum Remembered Session Length
            </label>

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
          {/* ========== "Remember Me" Policy ========== */}

          {/* ========== Regular Session Policy ========== */}
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
            <label
              htmlFor="default-checkbox"
              className="select-none ms-2 text-[1.1rem] font-jost text-body tracking-wide font-regular"
            >
              Maximum Remembered Session Length
            </label>

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
          {/* ========== Regular Session Policy ========== */}
        </div>
      </div>
    </AppLayout>
  );
}

export default OrganisationSecuritySettings;
