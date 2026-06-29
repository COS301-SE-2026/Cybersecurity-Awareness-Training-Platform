import { Link } from 'react-router-dom';
import BasicAlert from '../components/alerts/BasicAlert';
import { authForgotPasswordRequestSchema } from '@insightful-phish/shared';
import { useState } from 'react';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    setSuccessMessage('');
    event.preventDefault();
    setAlertMessage('');
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
      setShowSuccess(true);
      setSuccessMessage(
        'If An Account Exists For This Email Address, Password Reset Instructions Have Been Sent',
      );
    }, 2000);
  }
  return (
    <section className="bg-light-purple dark:bg-gray-900">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        {/* LOGO  */}
        {alertMessage && <BasicAlert variant="danger">{alertMessage}</BasicAlert>}
        {successMessage && <BasicAlert variant="success">{successMessage}</BasicAlert>}

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
                id="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Enter your Email Address"
              />
            </div>

            {/* RESET PASSWORD BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none"
            >
              {isLoading && (
                <svg
                  aria-hidden="true"
                  className="mr-3 h-5 w-5 animate-spin fill-white text-white/30"
                  viewBox="0 0 100 101"
                  fill="none"
                >
                  <path
                    d="M100 50.6C100 78.2 77.6 100.6 50 100.6C22.4 100.6 0 78.2 0 50.6C0 23 22.4 0.6 50 0.6C77.6 0.6 100 23 100 50.6Z"
                    fill="currentColor"
                  />
                  <path
                    d="M93.97 39.04C96.39 38.4 97.86 35.91 97.01 33.55C95.29 28.82 92.87 24.37 89.82 20.35C85.84 15.12 80.88 10.72 75.21 7.41C69.54 4.1 63.27 1.94 56.77 1.05C51.77 0.37 46.7 0.45 41.73 1.28C39.26 1.69 37.81 4.2 38.45 6.62C39.08 9.04 41.57 10.47 44.05 10.11C47.85 9.56 51.72 9.53 55.54 10.23C60.86 11 65.99 12.78 70.63 15.47C75.27 18.16 79.33 21.7 82.58 25.84C84.91 28.81 86.8 32.13 88.18 35.68C89.08 38.01 91.54 39.68 93.97 39.04Z"
                    fill="currentFill"
                  />
                </svg>
              )}
              <span>
                {isLoading ? 'Sending Password Reset Link...' : 'Send Password Reset Link'}
              </span>
            </button>

            <Link
              to="/login"
              className="-mt-4 inline-flex items-center gap-2 font-jost text-xl font-regular tracking-wide text-purple hover:text-purple cursor-pointer transition-colours"
            >
              <span className="material-icons-sharp">arrow_back</span>
              <span> Back to Login</span>
            </Link>
          </form>
        </div>
      </div>
    </section>
  );
}

export default ForgotPasswordPage;
