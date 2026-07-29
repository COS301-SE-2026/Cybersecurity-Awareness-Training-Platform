type InviteField = 'email' | 'firstName' | 'lastName';

type InviteTraineeModalProps = Readonly<{
  isOpen: boolean;
  values: Readonly<Record<InviteField, string>>;
  fieldErrors: Readonly<Partial<Record<InviteField, string>>>;
  generalError: string | null;
  isSubmitting: boolean;
  hasSubmittedSuccessfully: boolean;
  onChange: (field: InviteField, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}>;

function InviteTraineeModal({
  isOpen,
  values,
  fieldErrors,
  generalError,
  isSubmitting,
  hasSubmittedSuccessfully,
  onChange,
  onSubmit,
  onCancel,
}: InviteTraineeModalProps) {
  return (
    <div
      id="select-modal"
      tabIndex={-1}
      aria-hidden={!isOpen}
      className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 backdrop-blur-xl"
    >
      <div className="relative p-4 w-full max-w-md">
        <div className="relative bg-white-purple border border-default shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between border-b border-default pb-4 md:pb-5">
            {/* HEADING */}
            <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading">
              Invite New Trainee to Organisation
            </h3>

            {/* CLOSE MODAL BUTTON */}
            <button
              type="button"
              className="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading text-sm w-9 h-9 ms-auto inline-flex justify-center items-center"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <span className="material-icons-sharp">close</span>
              <span className="sr-only">Close modal</span>
            </button>
          </div>

          <form
            className="pt-2"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            {/* New Organisation Trainee First Name*/}
            <div className="mb-6 mt-2">
              <label
                htmlFor="trainee-first-name"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                New Organisation Trainee First Name{' '}
                <span className="font-light text-gray-500">(Optional)</span>
              </label>
              <input
                type="text"
                name="firstName"
                id="trainee-first-name"
                value={values.firstName}
                onChange={(event) => onChange('firstName', event.target.value)}
                disabled={isSubmitting || hasSubmittedSuccessfully}
                aria-invalid={Boolean(fieldErrors.firstName)}
                aria-describedby={fieldErrors.firstName ? 'trainee-first-name-error' : undefined}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter the trainee's first name"
                autoComplete="given-name"
              />
              {fieldErrors.firstName && (
                <p id="trainee-first-name-error" className="mt-2 text-sm text-red-600" role="alert">
                  {fieldErrors.firstName}
                </p>
              )}
            </div>

            {/* New Organisation Trainee Last Name*/}
            <div className="mb-6 mt-2">
              <label
                htmlFor="trainee-last-name"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                New Organisation Trainee Last Name{' '}
                <span className="font-light text-gray-500">(Optional)</span>
              </label>
              <input
                type="text"
                name="lastName"
                id="trainee-last-name"
                value={values.lastName}
                onChange={(event) => onChange('lastName', event.target.value)}
                disabled={isSubmitting || hasSubmittedSuccessfully}
                aria-invalid={Boolean(fieldErrors.lastName)}
                aria-describedby={fieldErrors.lastName ? 'trainee-last-name-error' : undefined}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter the trainee's last name"
                autoComplete="family-name"
              />
              {fieldErrors.lastName && (
                <p id="trainee-last-name-error" className="mt-2 text-sm text-red-600" role="alert">
                  {fieldErrors.lastName}
                </p>
              )}
            </div>

            {/* New Organisation Trainee Email Address */}
            <div className="mb-8">
              <label
                htmlFor="trainee-email-address"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                New Organisation Trainee Email Address{' '}
                <span className="font-light text-red-500">(Required)</span>
              </label>
              <input
                required
                type="email"
                name="email"
                id="trainee-email-address"
                value={values.email}
                onChange={(event) => onChange('email', event.target.value)}
                disabled={isSubmitting || hasSubmittedSuccessfully}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'trainee-email-address-error' : undefined}
                autoComplete="email"
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter the trainee's email address"
              />
              {fieldErrors.email && (
                <p
                  id="trainee-email-address-error"
                  className="mt-2 text-sm text-red-600"
                  role="alert"
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {generalError && (
              <div
                role="alert"
                className="p-3 mb-4 text-red-800 bg-red-50 border border-red-200 font-jost"
              >
                {generalError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || hasSubmittedSuccessfully}
              className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>
                {isSubmitting
                  ? 'Inviting...'
                  : hasSubmittedSuccessfully
                    ? 'Invitation Created'
                    : 'Invite'}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default InviteTraineeModal;
