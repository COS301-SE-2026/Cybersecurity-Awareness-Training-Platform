export type OrganisationProfileDraft = {
  name: string;
  description: string;
  website: string;
  primaryDomain: string;
  size: string;
};

export interface BasicOrganisationInfoProps {
  name?: string;
  description?: string;
  website?: string;
  primaryDomain?: string;
  size?: string | number;
  registeredTrainees?: string | number;
  registrationDate?: string;
  status?: string;
  isRequestOnly?: boolean;
  canEdit?: boolean;
  isEditing?: boolean;
  isSaving?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onProfileChange?: (field: keyof OrganisationProfileDraft, value: string) => void;
}

const statusLabels: Record<string, string> = {
  PENDING_ONBOARDING: 'Approved - Waiting for Setup',
  PENDING: 'Pending Approval',
  PENDING_REVIEW: 'Pending Review',
  CONTACTED: 'Contacted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
  DISABLED: 'Disabled',
  ARCHIVED: 'Archived',
};

function formatStatus(status?: string): string {
  if (!status) return '';
  return statusLabels[status] ?? status;
}

function BasicOrganisationInformationPage({
  name = '',
  description = '',
  website = '',
  primaryDomain,
  size = '',
  registeredTrainees = '',
  registrationDate = '',
  status = '',
  isRequestOnly = false,
  canEdit = false,
  isEditing = false,
  isSaving = false,
  onEdit,
  onSave,
  onCancel,
  onProfileChange,
}: Readonly<BasicOrganisationInfoProps>) {
  const formattedDate = registrationDate ? registrationDate.split('T')[0] : '';
  const displayStatus = formatStatus(status);

  return (
    <div className="-mt-2 -ml-2">
      {/* HEADING */}
      <h3 className="font-jost text-2xl text-dark-pink tracking-wider font-medium">
        Basic Organisation Information
      </h3>

      {/* SUB-HEADING */}
      <p className="font-regular tracking-wider text-[1.1rem] font-justify font-jost text-gray-500 mb-6">
        {isEditing
          ? 'Edit the organisation profile, then save your changes.'
          : "View the organisation's information and current status."}
      </p>

      <div className="flex flex-col flex-1 w-full grid grid-cols-3 gap-6">
        {/* Organisation Name*/}
        <div>
          <label
            htmlFor="organisation-name"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Name
          </label>
          <input
            required
            type="text"
            name="organisation-name"
            id="organisation-name"
            disabled={!isEditing || isSaving || !canEdit}
            value={name}
            readOnly={!isEditing || !canEdit}
            onChange={(event) => onProfileChange?.('name', event.target.value)}
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none"
            placeholder="Organisation Name"
          />
        </div>

        {/* Organisation Description */}
        <div>
          <label
            htmlFor="organisation-description"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Description
          </label>
          <input
            type="text"
            name="organisation-description"
            id="organisation-description"
            value={description}
            disabled={!isEditing || isSaving || !canEdit}
            readOnly={!isEditing || !canEdit}
            onChange={(event) => onProfileChange?.('description', event.target.value)}
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none"
            placeholder="Organisation Description"
          />
        </div>

        {/* Organisation Website */}
        <div>
          <label
            htmlFor="organisation-website"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Website
          </label>
          <input
            type="text"
            name="organisation-website"
            id="organisation-website"
            value={website}
            disabled={!isEditing || isSaving || !canEdit}
            readOnly={!isEditing || !canEdit}
            onChange={(event) => onProfileChange?.('website', event.target.value)}
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none"
            placeholder="Organisation Website"
          />
        </div>

        {primaryDomain !== undefined && (
          <div>
            <label
              htmlFor="organisation-primary-domain"
              className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
            >
              Primary Domain
            </label>
            <input
              type="text"
              name="organisation-primary-domain"
              id="organisation-primary-domain"
              value={primaryDomain}
              disabled={!isEditing || isSaving || !canEdit}
              readOnly={!isEditing || !canEdit}
              onChange={(event) => onProfileChange?.('primaryDomain', event.target.value)}
              className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none"
              placeholder="Primary Domain"
            />
          </div>
        )}

        {/* Organisation Size */}
        <div>
          <label
            htmlFor="organisation-size"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Size{' '}
            <span className="font-light text-[1.14159rem] text-gray-500">
              (Approximate Number of Employees)
            </span>
          </label>
          <input
            type="text"
            name="organisation-size"
            id="organisation-size"
            value={size}
            disabled={!isEditing || isSaving || !canEdit}
            readOnly={!isEditing || !canEdit}
            onChange={(event) => onProfileChange?.('size', event.target.value)}
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none"
            placeholder="Organisation Size"
          />
        </div>

        {/* Registered # of Employees (Trainees) - Only shown for active organisation */}
        {!isRequestOnly && (
          <div>
            <label
              htmlFor="registered-trainees"
              className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
            >
              Registered Trainees
            </label>
            <input
              required
              type="text"
              name="registered-trainees"
              id="registered-trainees"
              disabled={true}
              value={registeredTrainees}
              readOnly
              className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none"
              placeholder="Registered Number of Trainees"
            />
          </div>
        )}

        {/* Organisation Registration Date / Request Submission Date */}
        <div>
          <label
            htmlFor="registration-date"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            {isRequestOnly ? 'Request Submission Date' : 'Registration Date'}
          </label>
          <input
            required
            type="date"
            name="registration-date"
            id="registration-date"
            disabled={true}
            value={formattedDate}
            readOnly
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none"
            placeholder={isRequestOnly ? 'Request Submission Date' : 'Registration Date'}
          />
        </div>

        {/* Organisation Status */}
        <div>
          <label
            htmlFor="status"
            className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
          >
            Status
          </label>
          <input
            type="text"
            name="status"
            id="status"
            disabled={true}
            value={displayStatus}
            readOnly
            className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 rounded-none"
            placeholder="Organisation Status"
          />
        </div>
      </div>

      {canEdit && !isEditing && (
        <div className="mt-6 flex justify-end gap-4">
          <button
            type="button"
            onClick={onEdit}
            className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="material-icons-sharp">edit</span>
            <span>Edit Organisation Information</span>
          </button>
        </div>
      )}

      {isEditing && (
        <div className="mt-6 flex justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-gray-700 font-jost text-[1.2rem] font-regular tracking-wider bg-gray-100 hover:bg-gray-200 box-border border border-gray-300 focus:ring-2 focus:ring-gray-300 leading-5 text-sm py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="material-icons-sharp">close</span>
            <span>Cancel</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || !canEdit}
            className="cursor-pointer px-6 inline-flex gap-2 items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="material-icons-sharp">{isSaving ? 'sync' : 'save'}</span>
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default BasicOrganisationInformationPage;
