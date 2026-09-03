import { useId, useState } from 'react';
import type {
  OrganisationAdminAvailablePermission,
  OrganisationAdminPermissionKey,
} from '../../services/organisation-admin.service';

type OrganisationAdministratorPermissionsDropdownProps = Readonly<{
  availablePermissions: OrganisationAdminAvailablePermission[];
  selectedPermissionKeys: OrganisationAdminPermissionKey[];
  onChange: (permissionKeys: OrganisationAdminPermissionKey[]) => void;
  disabled?: boolean;
}>;

function OrganisationAdministratorPermissionsDropdown({
  availablePermissions,
  selectedPermissionKeys,
  onChange,
  disabled = false,
}: OrganisationAdministratorPermissionsDropdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const permissionListId = useId();

  const togglePermissions = (permissionKey: OrganisationAdminPermissionKey) => {
    if (selectedPermissionKeys.includes(permissionKey)) {
      onChange(selectedPermissionKeys.filter((key) => key !== permissionKey));
      return;
    }

    onChange([...selectedPermissionKeys, permissionKey]);
  };

  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={permissionListId}
        disabled={disabled}
        onClick={() => setIsExpanded((expanded) => !expanded)}
        className="flex w-full items-center justify-between rounded-none border border-gray-300
      bg-white px-[0.6rem] py-2.5 text-left font-overpass text-[1.15rem] font-light
      text-bruised-purple hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span>
          {selectedPermissionKeys.length === 0
            ? 'Select Permissions'
            : `${selectedPermissionKeys.length} selected`}
        </span>
        <span className="material-icons-sharp" aria-hidden="true">
          {isExpanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isExpanded && (
        <div
          id={permissionListId}
          className="max-h-[min(20rem,50dvh)] overflow-y-auto overscroll-contain border-x border-b border-gray-300 bg-white"
        >
          <ul aria-label="Permissions">
            {availablePermissions.map((permission) => (
              <li key={permission.key} className="px-3 py-2 font-overpass text-[1rem]">
                <label
                  htmlFor={`organisation-admin-permission-${permission.key}`}
                  className="flex items-center gap-2 w-full cursor-pointer"
                >
                  <input
                    id={`organisation-admin-permission-${permission.key}`}
                    checked={selectedPermissionKeys.includes(permission.key)}
                    onChange={() => togglePermissions(permission.key)}
                    type="checkbox"
                    disabled={disabled}
                    className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft"
                  />
                  <span className="text-[1rem] cursor-pointer">
                    {permission.displayName || permission.key}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default OrganisationAdministratorPermissionsDropdown;
