import { useState } from 'react';
import BasicAlert from '../alerts/BasicAlert';
import { ReadOnlyField } from '../ui/FormField';
import {
  updateAccountProfile,
  extractErrorMessage,
  type AccountProfileResponse,
} from '../../services/account.service';

type PersonalSettingsPageProps = Readonly<{
  profile?: AccountProfileResponse | null;
  onUpdateSuccess?: (message: string) => void;
  onRefresh?: () => void;
  onApiError?: (err: unknown) => boolean;
}>;

function PersonalSettingsPage({
  profile,
  onUpdateSuccess,
  onRefresh,
  onApiError,
}: PersonalSettingsPageProps) {
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
      if (onApiError?.(err)) return;
      setAlertMessage(extractErrorMessage(err));
    }
  }

  return (
    <div className="account-personal-settings -mt-2 -ml-2">
      {/* HEADING */}
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Personal Information Settings
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost text-gray-500 mb-4">
        Personal information associated with your account on the platform.
      </p>

      {alertMessage && (
        <BasicAlert variant="danger" onClose={() => setAlertMessage('')}>
          {alertMessage}
        </BasicAlert>
      )}

      {/* INPUT 1: FIRST NAME */}
      <div className="mb-6 max-w-sm">
        <label
          htmlFor="first-name"
          className=" block mb-2 font-jost tracking-wide text-[1.2rem] font-regular text-dark-pink"
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
          className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
          placeholder="First Name"
        />
      </div>

      {/* INPUT 2: LAST NAME */}
      <div className="mb-6 max-w-sm">
        <label
          htmlFor="last-name"
          className=" block mb-2 font-jost tracking-wide text-[1.2rem] font-regular text-dark-pink"
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
          className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
          placeholder="Last Name"
        />
      </div>

      {/* INPUT 3: EMAIL ADDRESS */}
      <div className="mb-6 max-w-sm">
        <ReadOnlyField
          id="email-address"
          label="Email Address"
          value={profile?.email}
          helperText="Email address can be updated under the Account tab."
        />
      </div>

      {/* SAVE BUTTON */}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleSave}
        className="account-management__action cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="material-icons-sharp">save</span>
        <span>{isSubmitting ? 'Saving...' : 'Save Personal Information'}</span>
      </button>
    </div>
  );
}

export default PersonalSettingsPage;
