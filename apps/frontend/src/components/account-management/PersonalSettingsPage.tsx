import { useState } from 'react';
import BasicAlert from '../alerts/BasicAlert';
import {
  updateAccountProfile,
  extractErrorMessage,
  type AccountProfileResponse,
} from '../../services/account.service';

type PersonalSettingsPageProps = Readonly<{
  profile?: AccountProfileResponse | null;
  onUpdateSuccess?: (message: string) => void;
  onRefresh?: () => void;
}>;

function PersonalSettingsPage({ profile, onUpdateSuccess, onRefresh }: PersonalSettingsPageProps) {
  const [customFirstName, setCustomFirstName] = useState<string | null>(null);
  const [customLastName, setCustomLastName] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const firstName = customFirstName ?? profile?.firstName ?? '';
  const lastName = customLastName ?? profile?.lastName ?? '';

  async function handleSave() {
    setAlertMessage('');
    if (!firstName.trim()) {
      setAlertMessage('First name is required.');
      return;
    }
    if (!lastName.trim()) {
      setAlertMessage('Last name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAccountProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setIsSubmitting(false);
      setCustomFirstName(null);
      setCustomLastName(null);
      if (onRefresh) onRefresh();
      if (onUpdateSuccess) {
        onUpdateSuccess('Personal information updated successfully.');
      }
    } catch (err: unknown) {
      setIsSubmitting(false);
      setAlertMessage(extractErrorMessage(err));
    }
  }

  return (
    <div className="-mt-2 -ml-2">
      {/* HEADING */}
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Personal Information Settings
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost text-gray-500">
        Manage your personal information.
      </p>
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost -mt-1 text-gray-500 mb-6">
        Update your first and last name.
      </p>

      {alertMessage && (
        <BasicAlert variant="danger" onClose={() => setAlertMessage('')}>
          {alertMessage}
        </BasicAlert>
      )}

      <form className="mt-4 grid grid-cols-2 gap-6" noValidate onSubmit={(e) => e.preventDefault()}>
        {/* First Name*/}
        <div>
          <label
            htmlFor="first-name"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            First Name
          </label>
          <input
            required
            type="text"
            name="first-name"
            id="first-name"
            value={firstName}
            onChange={(e) => setCustomFirstName(e.target.value)}
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Enter your First Name"
          />
        </div>

        {/* Last Name*/}
        <div>
          <label
            htmlFor="last-name"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Last Name
          </label>
          <input
            required
            type="text"
            name="last-name"
            id="last-name"
            value={lastName}
            onChange={(e) => setCustomLastName(e.target.value)}
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Enter your Last Name"
          />
        </div>
      </form>

      <div className="mt-8 flex items-center justify-between">
        {/* Update Personal Information Button */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSave}
          className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="material-icons-sharp">save</span>
          <span> {isSubmitting ? 'Updating...' : 'Update Personal Information'} </span>
        </button>
      </div>
    </div>
  );
}

export default PersonalSettingsPage;
