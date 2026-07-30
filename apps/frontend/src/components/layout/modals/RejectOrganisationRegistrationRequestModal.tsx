import { useState, type FormEvent } from 'react';
type RejectOrganisationRegistrationRequestModalProps = Readonly<{
  organisationName: string;
  isSubmitting: boolean;
  serverError: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}>;

function RejectOrganisationRegistrationRequestModal({
  organisationName,
  isSubmitting,
  serverError,
  onConfirm,
  onCancel,
}: RejectOrganisationRegistrationRequestModalProps) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setValidationError('Please enter a rejection reason.');
      return;
    }
    if (trimmedReason.length > 1000) {
      setValidationError('Rejection reason must be at most 1000 characters.');
      return;
    }
    setValidationError(null);
    onConfirm(trimmedReason);
  }

  const displayedError = validationError ?? serverError;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-request-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-xl"
    >
      <div className="relative w-full max-w-lg p-4">
        <form
          onSubmit={handleSubmit}
          className="border border-default bg-white-purple p-6 shadow-xl"
        >
          <h3
            id="reject-request-title"
            className="font-jost text-2xl font-medium tracking-wider text-purple"
          >
            Reject Organisation Registration Request
          </h3>
          <p className="mt-2 font-overpass text-[1rem] text-gray-600">
            Explain why {organisationName} is being rejected.
          </p>
          <label
            htmlFor="rejection-reason"
            className="mt-4 block font-jost text-[1.1rem] font-medium text-dark-pink"
          >
            Rejection Reason
          </label>
          <textarea
            id="rejection-reason"
            rows={6}
            maxLength={1000}
            value={reason}
            disabled={isSubmitting}
            onChange={(event) => {
              setReason(event.target.value);
              setValidationError(null);
            }}
            className="mt-1 block w-full border border-gray-300 bg-white p-3 font-overpass text-[1rem] text-gray-700 focus:border-purple focus:ring-purple disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p className="mt-1 text-right font-overpass text-sm text-gray-500">
            {reason.length}/1000 characters
          </p>
          {displayedError && (
            <div className="mt-3 border border-red-300 bg-red-50 p-3 font-overpass text-red-800">
              {' '}
              {displayedError}
            </div>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onCancel}
              className="border border-default-medium bg-neutral-secondary-medium px-4 py-2.5 font-jost text-[1.1rem] tracking-wider text-body hover:bg-neutral-tertiary-medium disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-danger px-4 py-2.5 font-jost text-[1.1rem] tracking-wider text-white hover:bg-danger-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Rejecting...' : 'Reject Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default RejectOrganisationRegistrationRequestModal;
