import AppLayout from '../components/layout/AppLayout';
import BasicOrganisationInformationPage from '../components/organisation-information/BasicOrganisationInformationPage';
import RepresentativeInformationPage from '../components/organisation-information/RepresentativeInformationPage';
import { useState } from 'react';
import OrganisationAdminInformationPage from '../components/organisation-information/OrganisationAdminInformationPage';

function AccountManagementPage() {
  const [currentTab, setCurrentTab] = useState<1 | 2 | 3>(1);

  return (
    <AppLayout
      contentStyle={{
        backgroundColor: '#F3F4F6',
      }}
    >
      {/* HEADING */}
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
            marginBottom: '1.6rem',
            fontSize: '3.8rem',
            fontWeight: 500,
            lineHeight: 1,
            // color: 'white',
            color: 'rgb(132, 25, 255)',
            fontFamily: 'Jost',
          }}
        >
          Organisation Information
        </h1>
      </div>

      <div className="flex flex-col flex-1 p-5 -mt-5 w-full">
        {/* TAB BUTTONS */}
        <ul className="hidden text-sm font-medium text-center text-body sm:flex -space-x-px">
          <li className="w-full focus-within:z-10">
            <button
              onClick={() => setCurrentTab(1)}
              className={`font-jost inline-block w-full bg-neutral-primary-soft border border-default hover:bg-neutral-secondary-medium hover:text-[var(--ip-purple)] focus:ring-4 focus:ring-neutral-secondary-strong font-light text-[1.2rem] tracking-wide leading-5 px-5 py-3 focus:outline-none ${
                currentTab === 1
                  ? 'bg-faint-purple text-[var(--ip-purple)] font-medium'
                  : 'bg-neutral-primary-soft text-body hover:bg-neutral-secondary-medium hover:text-[var(--ip-purple)]'
              }`}
            >
              Basic Organisation Information
            </button>
          </li>
          <li className="w-full focus-within:z-10">
            <button
              onClick={() => setCurrentTab(2)}
              className={`font-jost inline-block w-full bg-neutral-primary-soft border border-default hover:bg-neutral-secondary-medium hover:text-[var(--ip-purple)] focus:ring-4 focus:ring-neutral-secondary-strong font-light text-[1.2rem] tracking-wide leading-5 px-5 py-3 focus:outline-none ${
                currentTab === 2
                  ? 'bg-faint-purple text-[var(--ip-purple)] font-medium'
                  : 'bg-neutral-primary-soft text-body hover:bg-neutral-secondary-medium hover:text-[var(--ip-purple)]'
              }`}
            >
              Organisation Representative Information
            </button>
          </li>
          <li className="w-full focus-within:z-10">
            <button
              onClick={() => setCurrentTab(3)}
              className={`font-jost inline-block w-full bg-neutral-primary-soft border border-default hover:bg-neutral-secondary-medium hover:text-[var(--ip-purple)] focus:ring-4 focus:ring-neutral-secondary-strong font-light text-[1.2rem] tracking-wide leading-5 px-5 py-3 focus:outline-none ${
                currentTab === 3
                  ? 'bg-faint-purple text-[var(--ip-purple)] font-medium'
                  : 'bg-neutral-primary-soft text-body hover:bg-neutral-secondary-medium hover:text-[var(--ip-purple)]'
              }`}
            >
              Organisation Administrators
            </button>
          </li>
        </ul>

        {/* CONTENT BOX */}
        <div className="w-full p-6 bg-white md:mt-0 bg-neutral-primary-soft border-default border-x border-b">
          {currentTab === 1 && <BasicOrganisationInformationPage />}

          {currentTab === 2 && <RepresentativeInformationPage />}

          {currentTab === 3 && <OrganisationAdminInformationPage />}
        </div>
      </div>
    </AppLayout>
  );
}

export default AccountManagementPage;
