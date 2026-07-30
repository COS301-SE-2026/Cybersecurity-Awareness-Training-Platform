type DisableTraineeModalProps = Readonly<{
  displayName: string;
  email: string;
  password: string;
  passwordError: string | null;
  generalError: string | null;
  isSubmitting: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}>;

function DisableTraineeModal({
  displayName,
  email,
  password,
  passwordError,
  generalError,
  isSubmitting,
  onPasswordChange,
  onSubmit,
  onCancel,
}: DisableTraineeModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disable-trainee-title"
      className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 backdrop-blur-xl"
    >
      <div className="relative p-4 w-full max-w-md">
        <div className="relative bg-white-purple border border-default shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between border-b border-default pb-4">
            <h2
              id="disable-trainee-title"
              className="font-jost text-3xl text-purple tracking-wider font-medium"
            >
              Disable Trainee
            </h2>

            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="text-body bg-transparent hover:bg-neutral-tertiary text-sm w-9 h-9 inline-flex justify-center items-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-icons-sharp">close</span>
              <span className="sr-only">Close disable trainee dialog</span>
            </button>
          </div>

          <p className="mt-4 mb-4 font-overpass text-[1.05rem] text-dark-pink">
            Disable <strong>{displayName}</strong> ({email})? Their active sessions will be revoked.
          </p>

          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <div className="mb-5">
              <label
                htmlFor="disable-trainee-password"
                className="block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                Administrator Password
              </label>

              <input
                required
                id="disable-trainee-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                disabled={isSubmitting}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? 'disable-trainee-password-error' : undefined}
                className="font-overpass text-[1.1rem] bg-gray-50 border border-gray-300 text-deep-purple block w-full p-2.5 disabled:opacity-60"
              />

              {passwordError && (
                <p
                  id="disable-trainee-password-error"
                  role="alert"
                  className="mt-2 text-sm text-red-600"
                >
                  {passwordError}
                </p>
              )}
            </div>

            {generalError && (
              <div
                role="alert"
                className="p-3 mb-4 text-red-800 bg-red-50 border border-red-200 font-overpass"
              >
                {generalError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-neutral-secondary-medium border border-default-medium font-jost disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2.5 text-white bg-danger hover:bg-danger-strong font-jost disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Disabling...' : 'Disable Trainee'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default DisableTraineeModal;
