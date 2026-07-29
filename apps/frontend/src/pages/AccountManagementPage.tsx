import AppLayout from '../components/layout/AppLayout';
import PersonalSettingsPage from '../components/account-management/PersonalSettingsPage';
import AccountSettingsPage from '../components/account-management/AccountSettingsPage';
import SessionSettingsPage from '../components/account-management/SessionSettingsPage';
import BasicAlert from '../components/alerts/BasicAlert';
import { useState, useEffect, useCallback } from 'react';
import { getAccount, extractErrorMessage, type AccountResponse } from '../services/account.service';

function AccountManagementPage() {
  const [currentTab, setCurrentTab] = useState<1 | 2 | 3>(1);
  const [accountData, setAccountData] = useState<AccountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadAccount = useCallback(() => {
    setLoading(true);
    getAccount()
      .then((res) => {
        setAccountData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const msg = extractErrorMessage(err);
        setErrorMessage(msg);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const isManagedByOrg = Boolean(accountData?.effectivePolicy?.organisationId);

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
            color: 'rgb(132, 25, 255)',
            fontFamily: 'Jost',
          }}
        >
          Account Management
        </h1>
      </div>

      {/* SUCCESS OR ERROR NOTIFICATIONS */}
      {notificationMessage && (
        <div className="px-5 mb-2">
          <BasicAlert variant="success" onClose={() => setNotificationMessage('')}>
            {notificationMessage}
          </BasicAlert>
        </div>
      )}

      {errorMessage && (
        <div className="px-5 mb-2">
          <BasicAlert variant="danger" onClose={() => setErrorMessage('')}>
            {errorMessage}
          </BasicAlert>
        </div>
      )}

      {/* NOTICE WHEN SOME SETTINGS ARE MANAGED BY ORGANISATION */}
      {isManagedByOrg && (
        <h4 className="font-overpass font-semibold text-[1rem] text-red-600 tracking-wider -mt-2 px-5 mb-1">
          SOME SETTINGS ARE MANAGED BY YOUR ORGANISATION
        </h4>
      )}

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
              Personal Information
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
              Account
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
              Sessions
            </button>
          </li>
        </ul>

        {/* CONTENT BOX */}
        <div className="w-full p-6 bg-white md:mt-0 bg-neutral-primary-soft border-default border-x border-b">
          {loading ? (
            <div className="p-6 text-center text-gray-500 font-overpass text-lg">
              Loading account settings...
            </div>
          ) : (
            <>
              {currentTab === 1 && (
                <PersonalSettingsPage
                  profile={accountData?.profile}
                  onUpdateSuccess={(msg) => setNotificationMessage(msg)}
                  onRefresh={loadAccount}
                />
              )}

              {currentTab === 2 && (
                <AccountSettingsPage
                  profile={accountData?.profile}
                  capabilities={accountData?.capabilities}
                  onNotification={(msg) => setNotificationMessage(msg)}
                  onRefresh={loadAccount}
                />
              )}

              {currentTab === 3 && (
                <SessionSettingsPage
                  securityPreferences={accountData?.securityPreferences}
                  effectivePolicy={accountData?.effectivePolicy}
                  capabilities={accountData?.capabilities}
                  onNotification={(msg) => setNotificationMessage(msg)}
                  onRefresh={loadAccount}
                />
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default AccountManagementPage;
