import BasicAlert from '../components/alerts/BasicAlert';
import { authForgotPasswordRequestSchema } from '@insightful-phish/shared';
import { useState, useEffect } from 'react';
import BackToLoginButton from '../components/BackToLoginButton';
import LoadingSpinnerSVG from '../components/LoadingSpinnerSVG';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setTimeout(() => {
      setCooldown((current) => current - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldown]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlertMessage('');
    setSuccessMessage('');

    const validationResult = authForgotPasswordRequestSchema.safeParse({
      email,
    });
    if (!validationResult.success) {
      const message = validationResult.error.issues[0].message;
      setAlertMessage(
        message
          .replace(/\.$/, '')
          .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()),
      );
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage(
        'If An Account Exists For This Email Address, Password Reset Instructions Have Been Sent',
      );
      setCooldown(30);
      setHasSubmitted(true);
    }, 2000);
  }

  let buttonText = 'Send Password Reset Link';
  let countdownText = '';
  if (isLoading) {
    buttonText = 'Sending Password Reset Link...';
  } else if (cooldown > 0) {
    buttonText = 'Resend Password Reset Link ';
    countdownText = `(${cooldown})`;
  } else if (hasSubmitted) {
    buttonText = 'Resend Password Reset Link';
  }

  return (
    <section className="bg-light-purple dark:bg-gray-900">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        {/* LOGO  */}
        {alertMessage && (
          <BasicAlert variant="danger" onClose={() => setAlertMessage('')}>
            {alertMessage}
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

          <form className="mt-4 space-y-4 lg:mt-5 md:space-y-5" onSubmit={handleSubmit} noValidate>
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
                disabled={isLoading}
                id="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter your Email Address"
              />
            </div>

            {/* SEND FORGOT PASSWORD RESET LINK BUTTON */}
            <button
              type="submit"
              disabled={isLoading || cooldown > 0}
              className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading && <LoadingSpinnerSVG />}
              <span>
                {buttonText}

                {countdownText && (
                  <span className="inline-block w-10 text-center">{countdownText}</span>
                )}
              </span>
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
