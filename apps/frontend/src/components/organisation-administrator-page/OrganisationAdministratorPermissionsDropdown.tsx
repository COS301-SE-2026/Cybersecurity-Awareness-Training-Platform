import { Dropdown, DropdownItem } from 'flowbite-react';
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
  const togglePermissions = (permissionKey: OrganisationAdminPermissionKey) => {
    if (selectedPermissionKeys.includes(permissionKey)) {
      onChange(selectedPermissionKeys.filter((key) => key !== permissionKey));
      return;
    }

    onChange([...selectedPermissionKeys, permissionKey]);
  };

  return (
    <Dropdown
      label={
        selectedPermissionKeys.length === 0
          ? 'Select Permissions'
          : `${selectedPermissionKeys.length} selected`
      }
      dismissOnClick={false}
      disabled={disabled}
      theme={{ content: 'max-h-[min(20rem,50dvh)] overflow-y-auto overscroll-contain' }}
      className="justify-start -px-1 px-[0.6rem] border border-gray-300 w-full font-light bg-white hover:bg-white text-bruised-purple rounded-none font-overpass text-[1.15rem]"
    >
      {availablePermissions.map((permission) => (
        <DropdownItem key={permission.key} className="font-overpass text-[1rem]">
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
        </DropdownItem>
      ))}
    </Dropdown>
  );
}

export default OrganisationAdministratorPermissionsDropdown;
