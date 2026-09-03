import { Popover } from 'flowbite-react';
import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';

function ComponentLibrary() {
  const noEmailInformation = (
    <div className="w-145 bg-faint-purple shadow-xl">
      <div className="bg-gray-100 bg-light-purple px-3 py-2">
        <h3 className="font-semibold font-jost text-[1.4rem] text-purple tracking-wider">
          Email Address Verification Help
        </h3>
      </div>

      <p className="tracking-wider px-3 mt-2 text-sm font-jost font-medium text-[1.2rem] text-pink">
        If you didn't receive an <span className="font-semibold">Email Verification Link</span>:
      </p>

      <div className="px-3 py-2 tracking-wider">
        <div className="flex items-start gap-3">
          <span className="text-dark-pink -mt-1">●</span>
          <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink mb-2">
            Allow a few minutes for the email message to arrive.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-dark-pink -mt-1">●</span>
          <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink mb-2">
            Check your <strong>Spam</strong> or <strong>Junk</strong> folder(s).
          </p>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-dark-pink -mt-1">●</span>
          <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink mb-2">
            You may already have an account associated with the email address you provided. If so,
            please{' '}
            <strong>
              <em>Log In</em>
            </strong>{' '}
            instead.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-dark-pink -mt-1">●</span>
          <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink mb-2">
            If you are unable to Log In, use{' '}
            <strong>
              <em>Forgot Password</em>
            </strong>{' '}
            to reset your password before attempting to Register again.
          </p>
        </div>
      </div>
    </div>
  );
  return (
    <section className="bg-white">
      <div className="py-8 px-4 mx-auto max-w-screen-xl text-left lg:py-16">
        <h2 className="font-jost mb-12 text-6xl font-semibold tracking-regular text-purple">
          Component Library
        </h2>

        <p className="text-xl mb-12 mt-12 font-overpass tracking-wide text-dark-pink font-regular text-justify text-justify">
          The <em>Insightful Phish</em> component library is built on top of{' '}
          <a className="text-purple font-jost text-2xl" href="">
            Flowbite
          </a>
          ,{' '}
          <strong>
            an open-source component library for <em>Tailwind CSS.</em>
          </strong>{' '}
          Rather than using the components as provided, each component has been customised to align
          with the
          <em>Insightful Phish</em> brand identity. This includes removing rounded corners in favour
          of <em>sharp edges</em>, applying the platform's typography and colour palette, and
          ensuring consistent spacing, sizing, and interaction patterns throughout the application.
          <br />
          <br />
          Building on an established component library also significantly reduces development time
          by eliminating the need to create common UI components from scratch. This allows
          development efforts to focus on implementing platform-specific functionality while
          maintaining a consistent, accessible, and cohesive user interface that reflects the
          platform's distinctive visual identity.
        </p>

        <p className="text-3xl mb-4 font-jost tracking-wide text-purple font-medium text-justify">
          Buttons
        </p>
        <div className="grid grid-cols-4 mb-12">
          <button
            type="button"
            className="cursor-pointer w-40 font-jost tracking-wider text-xl text-white font-regular bg-main-purple leading-5 px-4 py-2.5 focus:outline-none"
          >
            Button
          </button>

          <button
            type="button"
            className="cursor-pointer w-55 font-jost tracking-wider text-xl text-white font-regular bg-red-600 leading-5 px-4 py-2.5 hover:bg-red-700 focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-sharp">delete</span>
              <span>Button with Icon</span>
            </div>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 font-jost text-xl font-regular tracking-wide text-purple hover:text-purple cursor-pointer transition-colours"
          >
            <span className="material-icons-sharp">arrow_back</span>
            <span className="hover:underline"> Link Button with Icon</span>
          </button>

          <button
            type="button"
            className="font-jost cursor-pointer hover:underline text-xl font-medium tracking-wider text-pink"
          >
            Link Button
          </button>
        </div>

        <p className="text-3xl mb-4 font-jost tracking-wide text-purple font-medium text-justify">
          Inputs
        </p>
        <div className="grid grid-cols-3 gap-20 mb-12">
          <div>
            <label
              htmlFor="representative-first-name"
              className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
            >
              Input Label <span className="font-light text-red-500">(Required)</span>
            </label>
            <input
              required
              type="text"
              name="representative-first-name"
              id="representative-first-name"
              className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
              placeholder="Input Placeholder Text"
            />
          </div>

          <div>
            <label
              htmlFor="representative-first-name"
              className=" block mb-2 font-jost tracking-wide text-xl font-medium text-pink"
            >
              Input Label
            </label>
            <input
              required
              type="text"
              name="representative-first-name"
              id="representative-first-name"
              className="font-overpass text-[1.2rem] bg-gray-50 border border-gray-300 text-deep-purple focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
              placeholder="Input Placeholder Text"
            />
          </div>
        </div>

        <p className="text-3xl mb-4 font-jost tracking-wide text-purple font-medium text-justify">
          Alerts
        </p>
        <div className="grid grid-cols-3 gap-20 mb-12">
          <div
            className="flex items-center p-4 text-sm border-t-4 text-fg-success-strong bg-success-soft border-success-subtle"
            role="alert"
          >
            <div className="font-overpass font-medium tracking-wide ms-2 text-[1.2rem]">
              Success Alert Message
            </div>
            <button
              type="button"
              className="ms-auto -mx-1.5 -my-1.5 p-1.5 inline-flex items-center justify-center h-8 w-8 shrink-0 hover:bg-success-medium focus:ring-sucess-medium"
            >
              <span className="material-icons-sharp">close</span>
            </button>
          </div>

          <div
            className="flex items-center p-4 text-sm border-t-4 text-fg-danger-strong bg-danger-soft border-danger-subtle"
            role="alert"
          >
            <div className="font-overpass font-medium tracking-wide ms-2 text-[1.2rem]">
              Danger Alert Message
            </div>
            <button
              type="button"
              className="ms-auto -mx-1.5 -my-1.5 p-1.5 inline-flex items-center justify-center h-8 w-8 shrink-0 hover:bg-danger-medium focus:ring-danger-medium"
            >
              <span className="material-icons-sharp">close</span>
            </button>
          </div>

          <div
            className="flex items-center p-4 text-sm border-t-4 text-fg-warning bg-warning-soft border-warning-subtle"
            role="alert"
          >
            <div className="font-overpass font-medium tracking-wide ms-2 text-[1.2rem]">
              Warning Alert Message
            </div>
            <button
              type="button"
              className="ms-auto -mx-1.5 -my-1.5 p-1.5 inline-flex items-center justify-center h-8 w-8 shrink-0 hover:bg-warning-medium focus:ring-warning-medium"
            >
              <span className="material-icons-sharp">close</span>
            </button>
          </div>
        </div>

        <p className="text-3xl mb-4 font-jost tracking-wide text-purple font-medium text-justify">
          Table
        </p>
        <div className="overflow-x-auto bg-neutral-primary-soft border border-default mb-12">
          <table className="w-full text-sm text-left rtl:text-right text-body">
            {/* Table Headings  */}
            <thead className="bg-faint-purple font-jost tracking-wider border-b border-default">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                >
                  Full Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                >
                  Email Address
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 font-medium text-dark-pink tracking-wider text-[1rem]"
                >
                  Status
                </th>
              </tr>
            </thead>
            {/* Table Content */}
            <tbody className="font-overpass font-regular text-[1rem] tracking-wide">
              <tr className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default">
                {/* Full Name */}
                <td className="px-6 py-4">Johan Nel</td>

                {/* Email Address */}
                <td className="px-6 py-4">johan.nel@tuks.co.za</td>

                {/* Role */}
                <td className="px-6 py-4">Team Leader</td>

                {/* Status */}
                <td className="px-6 py-4">Active</td>
              </tr>

              <tr className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft border-b border-default">
                {/* Full Name */}
                <td className="px-6 py-4">Connor Bell</td>

                {/* Email Address */}
                <td className="px-6 py-4">connor.bell@tuks.co.za</td>

                {/* Role */}
                <td className="px-6 py-4">Frontend Developer</td>

                {/* Status */}
                <td className="px-6 py-4">Active</td>
              </tr>

              <tr className="odd:bg-neutral-primary font-overpass font-light even:bg-neutral-secondary-soft">
                {/* Full Name */}
                <td className="px-6 py-4">Adriano Jorge</td>

                {/* Email Address */}
                <td className="px-6 py-4">adriano.jorge@tuks.co.za</td>

                {/* Role */}
                <td className="px-6 py-4">Backend Developer</td>

                {/* Status */}
                <td className="px-6 py-4">Active</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-3xl mb-4 font-jost tracking-wide text-purple font-medium text-justify">
          Status Badges
        </p>
        <div className="flex justify-center items-center gap-44 mb-12 font-overpass text-[0.95rem] tracking-wide">
          <span className="inline-flex justify-center items-center w-48 px-4 py-1 pt-[0.4rem] ring-2 ring-inset ring-danger-subtle text-fg-danger-strong bg-danger-soft">
            Red Status Badge
          </span>

          <span className="inline-flex justify-center items-center w-48 px-4 py-1 pt-[0.4rem] ring-2 ring-inset ring-success-subtle text-fg-success-strong bg-success-soft">
            Green Status Badge
          </span>

          <span className="inline-flex justify-center items-center w-48 px-4 py-1 pt-[0.4rem] ring-2 ring-inset ring-default-medium text-gray-700 bg-neutral-secondary-medium">
            Grey Status Badge
          </span>

          <span className="inline-flex justify-center items-center w-48 px-4 py-1 pt-[0.4rem] ring-2 ring-inset ring-brand-subtle text-fg-brand-strong bg-brand-softer">
            Blue Status Badge
          </span>
        </div>

        <p className="text-3xl mb-4 font-jost tracking-wide text-purple font-medium text-justify">
          Modals
        </p>

        <div className="grid grid-cols-2 gap-6">
          {/* MODAL 1 */}
          <div
            id="select-modal"
            tabIndex={-1}
            aria-hidden="true"
            className="w-full flex justify-start"
          >
            <div className="w-full max-w-md">
              <div className="relative bg-white-purple border border-default shadow-md p-4 md:p-6">
                <div className="flex items-center justify-between border-b border-default pb-4 md:pb-5">
                  {/* HEADING */}
                  <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading">
                    Get Started
                  </h3>

                  {/* CLOSE MODAL BUTTON */}
                  <button
                    type="button"
                    className="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading text-sm w-9 h-9 ms-auto inline-flex justify-center items-center"
                  >
                    <span className="material-icons-sharp">close</span>
                    <span className="sr-only">Close modal</span>
                  </button>
                </div>
                <div className="pt-4 md:pt-6">
                  {/* SUB-HEADING */}
                  <p className="font-overpass text-regular text-xl tracking-wider text-dark-pink mb-4">
                    How will you be using the platform?
                  </p>

                  {/* OPTIONS */}
                  <ul className="space-y-4 mb-4">
                    {/* Individual Registration Option */}
                    <li>
                      <input
                        type="radio"
                        id="individual"
                        name="accountType"
                        className="sr-only peer"
                        required
                      />
                      <label
                        htmlFor="individual"
                        className="inline-flex items-center w-full p-5 text-body bg-neutral-primary-soft border-1 border-default cursor-pointer peer-checked:hover:bg-brand-softer peer-checked:border-brand-subtle peer-checked:bg-brand-softer hover:bg-neutral-secondary-medium peer-checked:text-fg-brand-strong peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2"
                      >
                        <div className="flex items-center justify-center w-9 h-9 bg-ip-purple text-fg-brand-strong">
                          <span className="material-icons-sharp text-deep-purple">account_box</span>
                        </div>
                        <div className="block ms-4">
                          <div className="w-full font-jost text-[1.3rem] tracking-wider text-pink font-medium -mb-1">
                            Individual
                          </div>
                          <div className="w-full font-overpass font-normal text-dark-pink">
                            Register as an Individual Trainee
                          </div>
                        </div>
                      </label>
                    </li>

                    {/* Organisation Registration Option */}
                    <li>
                      <input
                        type="radio"
                        id="organisation"
                        name="accountType"
                        className="sr-only peer"
                        required
                      />
                      <label
                        htmlFor="organisation"
                        className="inline-flex items-center w-full p-5 text-body bg-neutral-primary-soft border-1 border-default cursor-pointer peer-checked:hover:bg-brand-softer peer-checked:border-brand-subtle peer-checked:bg-brand-softer hover:bg-neutral-secondary-medium peer-checked:text-fg-brand-strong peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2"
                      >
                        <div className="flex items-center justify-center w-9 h-9 bg-ip-purple text-fg-brand-strong">
                          <span className="material-icons-sharp text-deep-purple">business</span>
                        </div>
                        <div className="block ms-4">
                          <div className="w-full font-jost text-[1.3rem] tracking-wider text-pink font-medium -mb-1">
                            Organisation
                          </div>
                          <div className="w-full font-overpass font-normal text-dark-pink">
                            Register your Organisation
                          </div>
                        </div>
                      </label>
                    </li>
                  </ul>
                  <button
                    type="submit"
                    className="cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none"
                  >
                    <span> Continue to Registration </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* MODAL 2 */}
          <div id="select-modal" tabIndex={-1} className="w-full flex justify-center">
            <div className="w-full max-w-md">
              <div className="relative bg-white-purple border border-default shadow-md p-4 md:p-6">
                <div className="flex items-center justify-between border-b border-default pb-4 md:pb-5">
                  {/* HEADING */}
                  <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading">
                    Check your Email Inbox
                  </h3>
                </div>
                <div className="pt-4 md:pt-6">
                  {/* SUB-HEADING */}
                  <p className="font-overpass text-left text-regular text-[1.1rem] tracking-wider text-purple mb-2">
                    If an{' '}
                    <em>
                      <strong>Account Type</strong>
                    </em>{' '}
                    account can be registered with the information you provided, an{' '}
                    <strong>Email Verification Link</strong> will be sent to the following email
                    address:
                  </p>

                  <p className="font-google_sans_code text-left font-regular text-[1.2rem] tracking-wider text-gray-600 mb-4">
                    <span>email@insightfulphish.co.za</span>
                  </p>

                  <p className="font-overpass text-left font-bold text-[1.1rem] tracking-wider text-pink mb-2">
                    <strong>
                      Please follow the instructions in the email to VERIFY your email address
                      before attempting to Log In.
                    </strong>
                  </p>

                  <div className="flex items-start gap-2 mt-4">
                    <Popover
                      content={noEmailInformation}
                      arrow={false}
                      theme={{
                        base: 'rounded-none bg-transparent border-0 shadow-xl absolute z-20 inline-block w-max max-w-[100vw] outline-none',
                        content: 'relative overflow-hidden rounded-none',
                      }}
                    >
                      <span
                        className="material-icons-outlined cursor-pointer text-dark-pink"
                        style={{ fontSize: '1.8rem' }}
                      >
                        info
                      </span>
                    </Popover>

                    <p className="font-jost text-left font-medium text-[1.1rem] tracking-wider text-dark-pink mb-4">
                      Didn't Receive an{' '}
                      <span className="font-semibold">Email Verification Link</span>?
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={true}
                    className="mb-8 cursor-pointer w-full inline-flex items-center justify-center text-white font-jost text-[1.2rem] font-regular tracking-wider bg-main-purple hover:bg-hover-purple box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs leading-5 text-sm px-4 py-2.5 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <LoadingSpinnerSVG />

                    <span>Resending Verification Email...</span>
                  </button>

                  <button className="-mt-4 inline-flex items-center gap-2 font-jost text-xl font-regular tracking-wide text-purple hover:text-purple cursor-pointer transition-colours">
                    <span className="material-icons-sharp">arrow_back</span>
                    <span> Back to Login</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ComponentLibrary;
