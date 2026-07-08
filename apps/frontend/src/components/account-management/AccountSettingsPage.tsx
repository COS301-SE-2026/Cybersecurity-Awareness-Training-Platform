import ChangeEmailModal from './ChangeEmailModal';
import ChangePasswordModal from './ChangePasswordModal';
import { useState } from 'react';

function AccountSettingsPage() {
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  return (
    <div className="-mt-2 -ml-2">
      {/* HEADING */}
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Account Settings
      </h3>

      {/* Change Email Address Modal */}
      <ChangeEmailModal
        isOpen={showChangeEmailModal}
        onClose={() => setShowChangeEmailModal(false)}
      ></ChangeEmailModal>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      ></ChangePasswordModal>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost text-gray-500">
        Manage the settings associated with your account.
      </p>
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost -mt-1 text-gray-500 mb-6">
        Update your email address, password, or delete your account.
      </p>

      <form className="mt-4 grid grid-cols-2 gap-6" noValidate>
        {/* Email Address */}
        <div>
          <label
            htmlFor="email-address"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Email Address
            {/* <span className="font-light text-red-500">(Required)</span> */}
          </label>
          <div className="flex items-end gap-2">
            <input
              required
              type="email"
              name="email-address"
              disabled
              value="email@example.com"
              id="email-address"
              className="disabled:opacity-50 font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="Enter your Email Address"
            />

            <button
              type="button"
              onClick={() => setShowChangeEmailModal(true)}
              className="w-150 cursor-pointer inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-red-700 box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-3 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-sharp mr-4 ">edit</span>
              <span> Change Email </span>
            </button>
          </div>
        </div>

        {/* Password*/}
        <div>
          <label
            htmlFor="password"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Password
            {/* <span className="font-light text-red-500">(Required)</span> */}
          </label>
          <div className="flex items-end gap-2">
            <input
              required
              type="password"
              name="password"
              disabled
              value="1234567891234"
              id="password"
              className="disabled:opacity-50 font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="Enter your Password"
            />

            <button
              type="button"
              onClick={() => setShowChangePasswordModal(true)}
              className="w-150 cursor-pointer inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-main-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-3 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-sharp mr-4">edit</span>
              <span> Change Password </span>
            </button>
          </div>
        </div>
      </form>

      {/* HEADING */}
      <h3 className="font-jost text-[1.3rem] text-red-600 tracking-wider font-medium mt-10">
        Danger Zone
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost mt-1 text-red-500">
        Permanently delete your <em>Insightful Phish</em> account and all associated data.
      </p>
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost -mt-1 mb-4 text-red-500">
        Once your account is deleted, it cannot be recovered.
      </p>

      <div className="mt-2 flex items-center justify-between">
        {/* Next Button */}
        <button
          type="button"
          className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-red-600 hover:bg-red-700 box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-sharp">delete</span>
          <span> Delete Account </span>
        </button>
      </div>
    </div>
  );
}

export default AccountSettingsPage;
