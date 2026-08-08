import { Dropdown, DropdownItem } from 'flowbite-react';
import { useState } from 'react';

type TransferSuperAdministratorRoleModalProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}>;

// MOCK DATA. REPLACE WITH REAL DATA DURING INTEGRATION
const currentPlatformAdministrators = ['Connor Bell', 'Adriano Jorge', 'Johan Nel'];

function TransferSuperAdministratorRoleModal({
  isOpen,
  onClose,
  onConfirm,
}: TransferSuperAdministratorRoleModalProps) {
  const [newSuperAdministrator, setNewSuperAdministrator] = useState('');
  const [newSuperAdministratorSelected, setNewSuperAdministratorSelected] = useState(false);
  return (
    <div
      id="popup-modal"
      tabIndex={-1}
      aria-hidden={!isOpen}
      className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 backdrop-blur-xl"
    >
      <div className="relative p-2 w-full max-w-md max-h-full">
        <div className="relative bg-white-purple border border-default shadow-xl p-4 md:p-6">
          {/* CLOSE MODAL Button */}
          <button
            type="button"
            className="absolute top-3 end-2.5 text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading text-sm w-9 h-9 ms-auto inline-flex justify-center items-center"
            onClick={onClose}
          >
            <span className="material-icons-sharp">close</span>
            <span className="sr-only">Close modal</span>
          </button>

          <div className="p-4 md:p-5 text-center">
            <span
              className="mx-auto mb-2 text-purple material-symbols-sharp"
              style={{ fontSize: '5rem' }}
            >
              error
            </span>

            {/* Heading */}
            <h3 className="mb-4 text-body text-purple font-jost text-2xl tracking-wider font-medium">
              Transfer Super Administrator Role?
            </h3>

            {/* Message */}
            <h3 className=" text-body text-gray-600 font-regular font-overpass text-[1rem] tracking-wider">
              Transferring the <em>Super Platform Administrator</em> role will assign all{' '}
              <em>Super Platform Administrator</em> privileges to a currently active{' '}
              <em>Platform Administrator</em>.
            </h3>

            <h3 className="mb-2 text-body text-gray-600 font-regular font-overpass text-[1rem] tracking-wider">
              <strong>
                Your account will be downgraded to <em>Platform Administrator.</em>
              </strong>
            </h3>

            <h3 className="mb-4 text-body text-dark-pink font-medium font-overpass text-[1.1rem] tracking-wider">
              Select a new{' '}
              <strong>
                <em>Super Platform Administrator</em>
              </strong>{' '}
              from the list of current <em>Platform Administrators</em> below to continue.
            </h3>

            <Dropdown
              label={
                <span className="flex items-center gap-2">
                  {!newSuperAdministrator
                    ? 'Select a new Super Administrator'
                    : newSuperAdministrator}
                </span>
              }
              className={`w-90 -ml-2 ${newSuperAdministratorSelected ? 'mb-4' : 'mb-6'} font-jost tracking-wide text-[1.1rem] font-light text-gray-500 border border-gray-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white rounded-none`}
            >
              {currentPlatformAdministrators.map((currentPlatformAdministrator) => (
                <DropdownItem
                  key={currentPlatformAdministrator}
                  onClick={() => {
                    setNewSuperAdministrator(`${currentPlatformAdministrator}`);
                    setNewSuperAdministratorSelected(true);
                  }}
                  className="font-jost text-gray-600 text-[1.1rem]"
                >
                  {currentPlatformAdministrator}
                </DropdownItem>
              ))}
            </Dropdown>

            {newSuperAdministratorSelected && (
              <h3 className="mb-6 text-body text-gray-400 font-regular font-overpass text-[0.8rem] tracking-wider">
                will be the new{' '}
                <em>
                  Insightful Phish <strong>Super Platform Administrator.</strong>
                </em>
              </h3>
            )}

            {/* Buttons */}
            <div className="flex items-center space-x-4 justify-center">
              {/* YES CONFIRM TRANSFER Button */}
              <button
                onClick={onConfirm}
                type="button"
                className="text-white bg-main-purple box-border border border-transparent hover:bg-main-purple focus:ring-4 focus:ring-danger-medium shadow-xs font-regular cursor-pointer tracking-wider leading-5 text-[1.1rem] px-4 py-2.5 focus:outline-none"
              >
                Transfer Role
              </button>

              {/* NO CANCEL Button */}
              <button
                onClick={onClose}
                type="button"
                className="text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary shadow-xs font-jost tracking-wider cursor-pointer font-regular leading-5 text-[1.1rem] px-4 py-2.5 focus:outline-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TransferSuperAdministratorRoleModal;
