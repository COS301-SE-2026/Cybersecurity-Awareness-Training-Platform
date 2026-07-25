import BasicAlert from '../components/alerts/BasicAlert';
import { useEffect, useRef, useState } from 'react';
import { authResetPasswordRequestSchema } from '@insightful-phish/shared';
import { Popover } from 'flowbite-react';
import BackToLoginButton from '../components/BackToLoginButton';
import LoadingSpinnerSVG from '../components/LoadingSpinnerSVG';
import { ApiError } from '../lib/apiClient';
import { useSearchParams } from 'react-router-dom';
import { getTokenContext, resetPassword } from '../services/auth.service';
import TokenVerificationPanel from '../components/auth/TokenVerificationPanel';

const MISSING_TOKEN_MESSAGE = 'This password reset link is missing a token.';
const INVALID_TOKEN_MESSAGE = 'This password reset link is invalid.';
const EXPIRED_TOKEN_MESSAGE = 'This password reset link has expired.';
const USED_TOKEN_MESSAGE = 'This password reset link has already been used.';
const REVOKED_TOKEN_MESSAGE = 'This password reset link is no longer valid.';
const DISABLED_ACCOUNT_MESSAGE = 'We could not reset your password with this link.';
const CONTEXT_ERROR_MESSAGE =
  'We could not validate this password reset link right now. Please try again later.';
const RATE_LIMIT_MESSAGE = 'Please wait before trying to reset your password again.';
const GENERIC_ERROR_MESSAGE = 'We could not reset your password right now. Please try again later.';
const VALIDATION_FALLBACK_MESSAGE = 'Please check the highlighted fields and try again.';
const NEW_PASSWORD_ERROR_ID = 'reset-password-new-password-error';
const CONFIRM_PASSWORD_ERROR_ID = 'reset-password-confirm-password-error';

type FieldErrors = {
  newPassword?: string;
  confirmNewPassword?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getApiErrorCode(error: ApiError): string | null {
  if (!isRecord(error.body)) return null;

  const code = error.body.error;
  return typeof code === 'string' ? code : null;
}

function getValidationDetails(error: ApiError): Array<{ field: string; message: string }> {
  if (!isRecord(error.body) || !Array.isArray(error.body.details)) return [];

  return error.body.details.flatMap((detail) => {
    if (
      !isRecord(detail) ||
      typeof detail.field !== 'string' ||
      typeof detail.message !== 'string' ||
      !detail.message.trim()
    ) {
      return [];
    }
    return [{ field: detail.field, message: detail.message }];
  });
}

function getTokenStateMessage(state: string): string {
  if (state === 'EXPIRED') return EXPIRED_TOKEN_MESSAGE;
  if (state === 'USED') return USED_TOKEN_MESSAGE;
  if (state === 'REVOKED') return REVOKED_TOKEN_MESSAGE;
  return INVALID_TOKEN_MESSAGE;
}

function getResetTokenErrorMessage(code: string | null): string | null {
  if (code === 'RESET_TOKEN_EXPIRED') return EXPIRED_TOKEN_MESSAGE;
  if (code === 'RESET_TOKEN_USED') return USED_TOKEN_MESSAGE;
  if (code === 'RESET_TOKEN_REVOKED') return REVOKED_TOKEN_MESSAGE;
  if (code === 'RESET_TOKEN_INVALID') return INVALID_TOKEN_MESSAGE;
  if (code === 'USER_DISABLED') return DISABLED_ACCOUNT_MESSAGE;
  return null;
}

interface ResetPasswordFlowProps {
  token: string;
}

type TokenStatus = 'loading' | 'valid' | 'error';

function ResetPasswordFlow({ token }: ResetPasswordFlowProps) {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(token ? 'loading' : 'error');
  const [tokenErrorMessage, setTokenErrorMessage] = useState(token ? '' : MISSING_TOKEN_MESSAGE);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const submissionInFlightRef = useRef(false);
  const submissionRequestIdRef = useRef(0);
  const contextRequestIdRef = useRef(0);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmNewPasswordRef = useRef<HTMLInputElement>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  useEffect(() => {
    const requestId = ++contextRequestIdRef.current;

    if (!token) {
      return () => {
        contextRequestIdRef.current += 1;
        submissionRequestIdRef.current += 1;
        submissionInFlightRef.current = false;
      };
    }

    async function loadContext() {
      try {
        const context = await getTokenContext(token);

        if (contextRequestIdRef.current !== requestId) return;

        if (context.tokenState === 'VALID' && context.flow === 'PASSWORD_RESET') {
          setTokenStatus('valid');
          setTokenErrorMessage('');
          return;
        }

        setTokenStatus('error');
        setTokenErrorMessage(
          context.tokenState === 'VALID'
            ? INVALID_TOKEN_MESSAGE
            : getTokenStateMessage(context.tokenState),
        );
      } catch (error) {
        if (contextRequestIdRef.current !== requestId) return;

        const isInvalidContextError =
          error instanceof ApiError &&
          (error.status === 400 || getApiErrorCode(error) === 'VALIDATION_ERROR');

        setTokenStatus('error');
        setTokenErrorMessage(isInvalidContextError ? INVALID_TOKEN_MESSAGE : CONTEXT_ERROR_MESSAGE);
      }
    }

    void loadContext();

    return () => {
      contextRequestIdRef.current += 1;
      submissionRequestIdRef.current += 1;
      submissionInFlightRef.current = false;
    };
  }, [token]);

  function focusFirstFieldError(errors: FieldErrors) {
    if (errors.newPassword) {
      newPasswordRef.current?.focus();
      return;
    }

    if (errors.confirmNewPassword) {
      confirmNewPasswordRef.current?.focus();
    }
  }

  function applyValidationDetails(error: ApiError): boolean {
    const details = getValidationDetails(error);
    const nextErrors: FieldErrors = {};
    let hasUnknownField = false;

    for (const detail of details) {
      if (detail.field === 'newPassword' && !nextErrors.newPassword) {
        nextErrors.newPassword = detail.message;
      } else if (detail.field === 'confirmNewPassword' && !nextErrors.confirmNewPassword) {
        nextErrors.confirmNewPassword = detail.message;
      } else if (detail.field === 'token') {
        setTokenStatus('error');
        setTokenErrorMessage(INVALID_TOKEN_MESSAGE);
        return true;
      } else {
        hasUnknownField = true;
      }
    }

    setFieldErrors(nextErrors);

    if (nextErrors.newPassword || nextErrors.confirmNewPassword) {
      focusFirstFieldError(nextErrors);
      return true;
    }

    if (hasUnknownField || details.length === 0) {
      setFormError(VALIDATION_FALLBACK_MESSAGE);
      return true;
    }

    return false;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submissionInFlightRef.current || tokenStatus !== 'valid' || isSubmitting || isSuccessful) {
      return;
    }

    setFieldErrors({});
    setFormError('');

    const validationResult = authResetPasswordRequestSchema.safeParse({
      token,
      newPassword,
      confirmNewPassword,
    });

    if (!validationResult.success) {
      const nextErrors: FieldErrors = {};
      let hasUnknownIssue = false;

      for (const issue of validationResult.error.issues) {
        const field = issue.path[0];

        if (field === 'newPassword' && !nextErrors.newPassword) {
          nextErrors.newPassword = issue.message;
        } else if (field === 'confirmNewPassword' && !nextErrors.confirmNewPassword) {
          nextErrors.confirmNewPassword = issue.message;
        } else if (field === 'token') {
          setTokenStatus('error');
          setTokenErrorMessage(INVALID_TOKEN_MESSAGE);
          return;
        } else {
          hasUnknownIssue = true;
        }
      }

      setFieldErrors(nextErrors);

      if (hasUnknownIssue) {
        setFormError(VALIDATION_FALLBACK_MESSAGE);
      }
      focusFirstFieldError(nextErrors);
      return;
    }
    submissionInFlightRef.current = true;
    const requestId = ++submissionRequestIdRef.current;
    setIsSubmitting(true);

    try {
      await resetPassword(validationResult.data);

      if (submissionRequestIdRef.current !== requestId) return;

      setIsSuccessful(true);
    } catch (error) {
      if (submissionRequestIdRef.current !== requestId) return;

      if (error instanceof ApiError) {
        const code = getApiErrorCode(error);
        const tokenMessage = getResetTokenErrorMessage(code);

        if (tokenMessage) {
          setTokenStatus('error');
          setTokenErrorMessage(tokenMessage);
          return;
        }

        if (code === 'VALIDATION_ERROR' && applyValidationDetails(error)) {
          return;
        }

        if (error.status === 429 || code === 'AUTH_RATE_LIMITED') {
          setFormError(RATE_LIMIT_MESSAGE);
          return;
        }
      }

      setFormError(GENERIC_ERROR_MESSAGE);
    } finally {
      if (submissionRequestIdRef.current === requestId) {
        submissionInFlightRef.current = false;
        setIsSubmitting(false);
      }
    }
  }

  const buttonText = isSubmitting ? 'Resetting Password...' : 'Reset Password';

  const passwordPolicyPopover = (
    <div className="w-100 bg-faint-purple shadow-lg">
      <div className="bg-gray-100 bg-purple px-3 py-2">
        <h3 className="font-semibold font-jost text-[1.4rem] text-white tracking-wider">
          Password Requirements
        </h3>
      </div>

      <div className="px-3 py-2">
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Least 12 Characters
        </p>
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Most 128 Characters
        </p>
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Least ONE Uppercase Letter (A–Z)
        </p>
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Least ONE Lowercase Letter (a–z)
        </p>
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Least ONE Number (0–9)
        </p>
        <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink">
          ● At Least ONE Special Character (e.g. ! @ # $ %)
        </p>
      </div>
    </div>
  );

  if (isSuccessful) {
    return (
      <TokenVerificationPanel
        title="Password Reset Successful"
        introMessage="Your password was updated successfully."
        status="success"
        message="Your password has been updated. Please log in again using your new password."
        showLoginLink
      />
    );
  }

  if (tokenStatus === 'loading') {
    return (
      <TokenVerificationPanel
        title="Reset Password"
        introMessage="Checking your password reset link."
        status="pending"
        message="Validating password reset link..."
      />
    );
  }

  if (tokenStatus === 'error') {
    return (
      <TokenVerificationPanel
        title="Reset Password Link"
        introMessage="We could not continue with this password reset link."
        status="error"
        message={tokenErrorMessage || INVALID_TOKEN_MESSAGE}
      />
    );
  }

  return (
    <section className="bg-light-purple dark:bg-gray-900">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        {formError && (
          <BasicAlert variant="danger" onClose={() => setFormError('')}>
            {formError}
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
            Reset your Password
          </h3>

          {/* SUB-HEADING */}
          <p className="font-regular tracking-wide text-[1.1rem] font-justify font-jost mt-1 text-dark-pink">
            Enter and confirm your new password to complete the password reset process.
          </p>

          <form
            className="mt-4 space-y-4 lg:mt-5 md:space-y-5"
            onSubmit={handleSubmit}
            noValidate
            aria-busy={isSubmitting}
          >
            {/* PASSWORD INPUT */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="new-password"
                  className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
                >
                  New Password
                </label>

                <Popover
                  content={passwordPolicyPopover}
                  arrow={false}
                  theme={{
                    base: 'rounded-none bg-transparent border-0 shadow-xl absolute z-20 inline-block w-max max-w-[100vw] outline-none',
                    content: 'relative overflow-hidden rounded-none',
                  }}
                >
                  <button
                    type="button"
                    aria-label="Show password requirements"
                    className="material-icons-outlined mb-2 cursor-pointer text-pink"
                    style={{ fontSize: '1.6rem' }}
                  >
                    info
                  </button>
                </Popover>
              </div>
              <input
                ref={newPasswordRef}
                type="password"
                name="newPassword"
                disabled={isSubmitting}
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setFieldErrors((current) => ({ ...current, newPassword: undefined }));
                }}
                id="new-password"
                required
                autoComplete="new-password"
                aria-invalid={fieldErrors.newPassword ? true : undefined}
                aria-describedby={fieldErrors.newPassword ? NEW_PASSWORD_ERROR_ID : undefined}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter a New Password"
              />
              {fieldErrors.newPassword && (
                <p
                  id={NEW_PASSWORD_ERROR_ID}
                  role="alert"
                  className="mt-2 font-overpass text-sm text-red-700"
                >
                  {fieldErrors.newPassword}
                </p>
              )}
            </div>

            {/* CONFIRM PASSWORD INPUT */}
            <div>
              <label
                htmlFor="confirm-new-password"
                className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
              >
                Confirm New Password
              </label>
              <input
                ref={confirmNewPasswordRef}
                type="password"
                name="confirmNewPassword"
                value={confirmNewPassword}
                onChange={(event) => {
                  setConfirmNewPassword(event.target.value);
                  setFieldErrors((current) => ({ ...current, confirmNewPassword: undefined }));
                }}
                disabled={isSubmitting}
                id="confirm-new-password"
                required
                autoComplete="new-password"
                aria-invalid={fieldErrors.confirmNewPassword ? true : undefined}
                aria-describedby={
                  fieldErrors.confirmNewPassword ? CONFIRM_PASSWORD_ERROR_ID : undefined
                }
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Re-Enter New Password"
              />
              {fieldErrors.confirmNewPassword && (
                <p
                  id={CONFIRM_PASSWORD_ERROR_ID}
                  role="alert"
                  className="mt-2 font-overpass text-sm text-red-700"
                >
                  {fieldErrors.confirmNewPassword}
                </p>
              )}
            </div>

            {/* RESET PASSWORD BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting && <LoadingSpinnerSVG />}
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

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';

  return <ResetPasswordFlow key={token} token={token} />;
}

export default ResetPasswordPage;
