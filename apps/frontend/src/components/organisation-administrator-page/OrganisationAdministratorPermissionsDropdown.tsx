import { Dropdown, DropdownItem } from 'flowbite-react';
import { useState } from 'react';

const permissions = ['Perm 1', 'Perm 2', 'Perm 3'];
function OrganisationAdministratorPermissionsDropdown() {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const togglePermissions = (permission: string) => {
    setSelectedPermissions((current) =>
      current.includes(permission)
        ? current.filter((p) => p !== permission)
        : [...current, permission],
    );
  };
  return (
    <Dropdown
      label="Select Permissions"
      dismissOnClick={false}
      className="justify-start -px-1 px-[0.6rem] border border-gray-300 w-full font-light bg-white hover:bg-white text-bruised-purple rounded-none font-overpass text-[1.15rem]"
    >
      {permissions.map((permission) => (
        <DropdownItem className=" font-overpass text-[1rem]" key={permission} as="div">
          <label htmlFor={permission} className="flex items-center gap-2 w-full cursor-pointer">
            <input
              id={permission}
              checked={selectedPermissions.includes(permission)}
              onChange={() => togglePermissions(permission)}
              type="checkbox"
              className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft"
            />
            <span className="text-[1rem] cursor-pointer">{permission}</span>
          </label>
        </DropdownItem>
      ))}
    </Dropdown>
  );
}

export default OrganisationAdministratorPermissionsDropdown;
