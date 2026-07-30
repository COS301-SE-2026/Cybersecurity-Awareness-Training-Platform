import { useState } from 'react';
import BasicAlert from '../alerts/BasicAlert';

type DeleteAccountModalProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}>;

function DeleteAccountModal({ isOpen, onClose, onSuccess }: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  function handleDelete() {
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      setAlertMessage('Please type DELETE to confirm account deletion.');
      return;
    }

    setIsDeleting(true);
    setAlertMessage('');

    setTimeout(() => {
      setIsDeleting(false);
      onClose();
      if (onSuccess) {
        onSuccess('Account deletion request has been submitted.');
      }
    }, 500);
  }

  return (
    <div
      id="delete-account-modal"
      tabIndex={-1}
      aria-hidden="true"
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-xl"
    >
      <div className="relative p-4 w-full max-w-md">
        <div className="relative bg-white border border-red-200 shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between border-b border-default pb-2">
            <h3 className="font-jost text-3xl text-red-600 tracking-wider font-medium">
              Delete Account
            </h3>

            <button
              type="button"
              className="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading text-sm w-9 h-9 ms-auto inline-flex justify-center items-center"
              onClick={onClose}
            >
              <span className="material-icons-sharp">close</span>
              <span className="sr-only">Close modal</span>
            </button>
          </div>

          {alertMessage && (
            <BasicAlert variant="danger" onClose={() => setAlertMessage('')}>
              {alertMessage}
            </BasicAlert>
          )}

          <div className="pt-4 pb-2">
            <p className="font-overpass text-left text-regular text-[1.1rem] tracking-wider text-red-600 mb-2">
              Are you sure you want to delete your account?
            </p>

            <p className="font-overpass text-left text-regular text-[0.9rem] tracking-wider text-gray-500 mb-4">
              This action is permanent and cannot be undone. All your personal data and active
              sessions will be permanently erased.
            </p>

            <div className="mb-6">
              <label
                htmlFor="confirm-delete-input"
                className="block mb-2 font-jost tracking-wide text-lg font-medium text-gray-700"
              >
                Type <strong className="text-red-600">DELETE</strong> to confirm:
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-red-500 focus:border-red-500 block w-full p-2.5"
                placeholder="Type DELETE"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer w-1/2 inline-flex items-center justify-center font-jost text-[1.1rem] py-2.5 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="cursor-pointer w-1/2 inline-flex items-center justify-center text-white font-jost text-[1.1rem] bg-red-600 hover:bg-red-700 py-2.5 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeleteAccountModal;
