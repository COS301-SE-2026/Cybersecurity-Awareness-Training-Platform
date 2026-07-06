import { useState } from 'react';
import OrganisationInformationForm from '../components/org-reg/OrganisationInformationForm';
import RepresentativeInformationForm from '../components/org-reg/RepresentativeInformationForm';
import BasicAlert from '../components/alerts/BasicAlert';
import { firstNameSchema, lastNameSchema, emailSchema } from '@insightful-phish/shared';

function formatAlertMessage(message: string) {
  // makes everything title case and removes the . from the end of the message
  return message
    .replace(/\.$/, '')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function OrganisationRegistrationRequestPage() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const [orgName, setOrgName] = useState('');
  const [orgDescrip, setOrgDescrip] = useState('');
  const [orgWeb, setOrgWeb] = useState('');
  const [orgSize, setOrgSize] = useState<number | ''>('');

  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'danger'>('danger');

  const [orgInfoValid, setOrgInfoValid] = useState(false);

  const [repFName, setRepFName] = useState('');
  const [repLName, setRepLName] = useState('');
  const [repEmail, setRepEmail] = useState('');

  function validateOrgInfo() {
    setAlertMessage('');

    if (!orgName.trim()) {
      // NO ORGANISATION NAME
      // Org Name is REQUIRED
      setAlertType('danger');
      setAlertMessage('Please Enter An Organisation Name');
      setOrgInfoValid(false);
      return false;
    }

    if (orgSize === '') {
      // NO ORGANISATION SIZE
      // Org Size is REQUIRED
      setAlertType('danger');
      setAlertMessage('Please Provide An Organisation Size');
      setOrgInfoValid(false);
      return false;
    }

    if (orgSize < 1) {
      // INVALID ORGANISATION SIZE
      // Org Size is REQUIRED (must be valid too)
      setAlertType('danger');
      setAlertMessage('Please Provide A Valid Organisation Size');
      setOrgInfoValid(false);
      return false;
    }

    if (orgWeb.trim()) {
      // INVALID URL
      try {
        new URL(orgWeb);
      } catch {
        setAlertType('danger');
        setAlertMessage('Please Provide A Valid Website URL');
        setOrgInfoValid(false);
        return false;
      }
    }

    setOrgInfoValid(true);
    return true;
  }

  function validateRepInfo() {
    setAlertMessage('');

    const fNameResult = firstNameSchema.safeParse(repFName);
    if (!fNameResult.success) {
      setAlertType('danger');
      setAlertMessage(formatAlertMessage(fNameResult.error.issues[0]?.message ?? 'Invalid Input'));
      return false;
    }

    const lNameResult = lastNameSchema.safeParse(repLName);
    if (!lNameResult.success) {
      setAlertType('danger');
      setAlertMessage(formatAlertMessage(lNameResult.error.issues[0]?.message ?? 'Invalid Input'));
      return false;
    }

    const emailResult = emailSchema.safeParse(repEmail);
    if (!emailResult.success) {
      setAlertType('danger');
      setAlertMessage(formatAlertMessage(emailResult.error.issues[0]?.message ?? 'Invalid Input'));
      return false;
    }

    return true;
  }

  return (
    <section className="bg-light-purple dark:bg-gray-900">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
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

        <div className="w-full p-6 bg-white-purple shadow dark:border md:mt-0 sm:max-w-4xl sm:p-8">
          {/* HEADING */}
          <h3 className="font-jost text-3xl text-purple tracking-wider font-medium text-heading">
            Request to Register an Organisation
          </h3>

          {/* SUB-HEADING */}
          <p className="font-regular tracking-wide text-[1.1rem] font-justify font-jost mt-1 text-dark-pink mb-4">
            Complete the steps below to request registration for your organisation. Requests are
            reviewed by an <em> Insightful Phish</em> platform administrator before access is
            granted.
          </p>

          {/* BASIC ALERT */}
          {alertMessage && (
            <BasicAlert variant={alertType} onClose={() => setAlertMessage('')}>
              {alertMessage}
            </BasicAlert>
          )}

          {/* TAB BUTTONS */}
          <ul className="hidden text-sm font-medium text-center text-body sm:flex -space-x-px">
            <li className="w-full focus-within:z-10">
              <button
                onClick={() => {
                  setCurrentStep(1);
                  setOrgInfoValid(false);
                }}
                className={`font-jost inline-block w-full bg-neutral-primary-soft border border-default hover:bg-neutral-secondary-medium hover:text-[var(--ip-purple)] focus:ring-4 focus:ring-neutral-secondary-strong font-light text-[1.2rem] tracking-wide leading-5 px-5 py-3 focus:outline-none ${
                  currentStep === 1
                    ? 'bg-faint-purple text-[var(--ip-purple)] font-medium'
                    : 'bg-neutral-primary-soft text-body hover:bg-neutral-secondary-medium hover:text-[var(--ip-purple)]'
                }`}
              >
                1. Organisation Information
              </button>
            </li>
            <li className="w-full focus-within:z-10">
              <button
                disabled={!orgInfoValid}
                onClick={() => {
                  if (orgInfoValid === true) {
                    setCurrentStep(2);
                  }
                }}
                className={`font-jost inline-block w-full bg-neutral-primary-soft border border-default hover:bg-neutral-secondary-medium hover:text-[var(--ip-purple)] focus:ring-4 focus:ring-neutral-secondary-strong font-light text-[1.2rem] tracking-wide leading-5 px-5 py-3 focus:outline-none ${
                  currentStep === 2
                    ? 'bg-faint-purple text-[var(--ip-purple)] font-medium'
                    : 'bg-neutral-primary-soft text-body hover:bg-neutral-secondary-medium hover:text-[var(--ip-purple)]'
                }
                  ${orgInfoValid ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              >
                2. Representative Information
              </button>
            </li>
          </ul>

          <div className="w-full p-6 bg-white md:mt-0 bg-neutral-primary-soft border-default border-x border-b sm:max-w-4xl sm:p-8">
            {currentStep === 1 && (
              <OrganisationInformationForm
                orgName={orgName}
                setOrgName={setOrgName}
                orgDescrip={orgDescrip}
                setOrgDescrip={setOrgDescrip}
                orgWeb={orgWeb}
                setOrgWeb={setOrgWeb}
                orgSize={orgSize}
                setOrgSize={setOrgSize}
                onNext={() => {
                  if (validateOrgInfo()) {
                    setCurrentStep(2);
                  }
                }}
              />
            )}
            {currentStep === 2 && (
              <RepresentativeInformationForm
                repFName={repFName}
                setRepFName={setRepFName}
                repLName={repLName}
                setRepLName={setRepLName}
                repEmail={repEmail}
                setRepEmail={setRepEmail}
                onBack={() => {
                  setCurrentStep(1);
                  setOrgInfoValid(false);
                }}
                onSubmit={() => {
                  if (validateRepInfo()) {
                    console.log('SUCCESS');
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default OrganisationRegistrationRequestPage;
