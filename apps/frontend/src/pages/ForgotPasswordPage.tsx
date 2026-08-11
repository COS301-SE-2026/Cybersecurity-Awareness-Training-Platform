import BasicAlert from '../components/alerts/BasicAlert';
import { authForgotPasswordRequestSchema } from '@insightful-phish/shared';
import { useState, useRef } from 'react';
import BackToLoginButton from '../components/BackToLoginButton';
import LoadingSpinnerSVG from '../components/LoadingSpinnerSVG';
import { ApiError } from '../lib/apiClient';
import { requestPasswordReset } from '../services/auth.service';

const EMAIL_ERROR_ID = 'forgot-password-email-error';
const GENERIC_SUCCESS_MESSAGE =
  'If the email is registered, a password reset link has been queued for delivery.';
const RATE_LIMIT_MESSAGE = 'Please wait before requesting another password reset link.';
const GENERIC_ERROR_MESSAGE =
  'We could not request a password reset link right now. Please try again later.';
const VALIDATION_FALLBACK_MESSAGE = 'Please enter a valid email address.';

type RequestErrorState = {
  fieldError: string;
  pageError: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getApiErrorCode(error: ApiError): string | null {
  if (!isRecord(error.body)) return null;

  const errorCode = error.body.error;
  return typeof errorCode === 'string' ? errorCode : null;
}

function getEmailValidationMessage(body: unknown): string {
  if (!isRecord(body) || !Array.isArray(body.details)) {
    return VALIDATION_FALLBACK_MESSAGE;
  }

  const emailDetail = body.details.find(
    (detail) =>
      isRecord(detail) &&
      detail.field === 'email' &&
      typeof detail.message === 'string' &&
      detail.message.trim().length > 0,
  );

  return isRecord(emailDetail) && typeof emailDetail.message === 'string'
    ? emailDetail.message
    : VALIDATION_FALLBACK_MESSAGE;
}

function mapRequestError(error: unknown): RequestErrorState {
  if (!(error instanceof ApiError)) {
    return { fieldError: '', pageError: GENERIC_ERROR_MESSAGE };
  }

  const errorCode = getApiErrorCode(error);

  if (errorCode === 'VALIDATION_ERROR') {
    return {
      fieldError: getEmailValidationMessage(error.body),
      pageError: '',
    };
  }

  if (error.status === 429 || errorCode === 'AUTH_RATE_LIMITED') {
    return { fieldError: '', pageError: RATE_LIMIT_MESSAGE };
  }

  return { fieldError: '', pageError: GENERIC_ERROR_MESSAGE };
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [pageError, setPageError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const requestInFlightRef = useRef(false);

  const hasSubmitted = submittedEmail !== null;

  async function sendPasswordResetRequest(requestEmail: string): Promise<boolean> {
    if (requestInFlightRef.current) return false;

    requestInFlightRef.current = true;
    setIsLoading(true);
    setPageError('');
    setFieldError('');
    setSuccessMessage('');

    try {
      await requestPasswordReset({ email: requestEmail });
      setSuccessMessage(GENERIC_SUCCESS_MESSAGE);
      return true;
    } catch (error) {
      const errorState = mapRequestError(error);
      setFieldError(errorState.fieldError);
      setPageError(errorState.pageError);
      return false;
    } finally {
      requestInFlightRef.current = false;
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (requestInFlightRef.current) return;

    setPageError('');
    setFieldError('');

    if (submittedEmail) {
      await sendPasswordResetRequest(submittedEmail);
      return;
    }

    setSuccessMessage('');

    const validationResult = authForgotPasswordRequestSchema.safeParse({
      email,
    });

    if (!validationResult.success) {
      setFieldError(validationResult.error.issues[0]?.message ?? VALIDATION_FALLBACK_MESSAGE);
      return;
    }

    const normalizedEmail = validationResult.data.email;
    const requestSucceeded = await sendPasswordResetRequest(normalizedEmail);

    if (requestSucceeded) {
      setEmail(normalizedEmail);
      setSubmittedEmail(normalizedEmail);
    }
  }

  let buttonText = hasSubmitted ? 'Resend Password Reset Link' : 'Send Password Reset Link';

  if (isLoading) {
    buttonText = hasSubmitted ? 'Resending Password Reset Link...' : 'Sending Password Reset Link';
  }

  return (
    <section className="bg-light-purple dark:bg-gray-900">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        {/* LOGO  */}
        {pageError && (
          <BasicAlert variant="danger" onClose={() => setPageError('')}>
            {pageError}
          </BasicAlert>
        )}
        {successMessage && (
          <BasicAlert variant="success" onClose={() => setSuccessMessage('')}>
            {successMessage}
          </BasicAlert>
        )}

        <div className="mb-4 flex items-center space-x-3 rtl:space-x-reverse">
          <img src="/Phish Logo Light.png" className="h-14" alt="Insightful Phish Logo" />
          <span className="flex items-center gap-2 mt-2">
            <span className="font-overpass self-center text-[1.94rem] text-pink text-heading font-medium whitespace-nowrap tracking-wide">
              Insightful
            </span>
            <span className="font-overpass self-center text-[1.94rem] text-pink text-heading font-black whitespace-nowrap tracking-wide">
              Phish.
            </span>
          </span>
        </div>

        <div className="w-full p-6 bg-white-purple shadow dark:border md:mt-0 sm:max-w-md dark:bg-gray-800 dark:border-gray-700 sm:p-8">
          {/* HEADING */}
          <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading">
            Forgot your Password?
          </h3>

          {/* SUB-HEADING */}
          <p className="font-regular tracking-wide text-[1.1rem] font-justify font-jost mt-1 text-dark-pink">
            Enter the email address associated with your account and we'll send you a link to reset
            your password.
          </p>

          <form
            className="mt-4 space-y-4 lg:mt-5 md:space-y-5"
            onSubmit={handleSubmit}
            noValidate
            aria-busy={isLoading}
          >
            {/* EMAIL INPUT */}
            <div>
              <label
                htmlFor="email"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                Email Address
              </label>
              <input
                type="email"
                name="email"
                disabled={isLoading || hasSubmitted}
                id="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldError('');
                }}
                required
                autoComplete="email"
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? EMAIL_ERROR_ID : undefined}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter your Email Address"
              />
              {fieldError && (
                <p
                  id={EMAIL_ERROR_ID}
                  role="alert"
                  className="mt-2 font-overpass text-sm text-red-700"
                >
                  {fieldError}
                </p>
              )}
            </div>

            {/* SEND FORGOT PASSWORD RESET LINK BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading && <LoadingSpinnerSVG />}
              <span>{buttonText}</span>
            </button>

            {/* BACK TO LOGIN LINK */}
            <BackToLoginButton />
          </form>
        </div>
      </div>
    </section>
  );
}

export default ForgotPasswordPage;
