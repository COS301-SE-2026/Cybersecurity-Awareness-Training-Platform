import { useState } from 'react';
import OrganisationInformationForm from '../components/org-reg/OrganisationInformationForm';
import RepresentativeInformationForm from '../components/org-reg/RepresentativeInformationForm';
import BasicAlert from '../components/alerts/BasicAlert';
import {
  firstNameSchema,
  lastNameSchema,
  emailSchema,
  createOrganisationRegistrationRequestSchema,
  type CreateOrganisationRegistrationRequestDto,
} from '@insightful-phish/shared';
import SuccessfulRegistrationModal from '../components/layout/modals/SuccessfulRegistrationModal';
import { ApiError } from '../lib/apiClient';
import { submitOrganisationRegistrationRequest } from '../services/organisation-registration-request.service';

const organisationStepSchema = createOrganisationRegistrationRequestSchema.pick({
  organisationName: true,
  organisationDescription: true,
  organisationSize: true,
  organisationWebsiteUrl: true,
});

const ORGANISATION_STEP_VALIDATION_FIELDS = new Set([
  'organisationName',
  'organisationDescription',
  'organisationSize',
  'organisationWebsiteUrl',
]);

const REPRESENTATIVE_STEP_VALIDATION_FIELDS = new Set([
  'representativeFirstName',
  'representativeLastName',
  'representativeEmail',
]);

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationEmailQueued, setConfirmationEmailQueued] = useState<boolean | null>(null);

  const [orgInfoValid, setOrgInfoValid] = useState(false);

  const [repFName, setRepFName] = useState('');
  const [repLName, setRepLName] = useState('');
  const [repEmail, setRepEmail] = useState('');

  const [showSuccessfulRegModal, setShowSuccessfulRegModal] = useState(false);

  function validateOrgInfo() {
    setAlertMessage('');

    const organisationDescription = orgDescrip.trim();
    const organisationWebsiteUrl = orgWeb.trim();

    const validationResult = organisationStepSchema.safeParse({
      organisationName: orgName.trim(),
      organisationSize: orgSize === '' ? undefined : Number(orgSize),
      ...(organisationDescription ? { organisationDescription } : {}),
      ...(organisationWebsiteUrl ? { organisationWebsiteUrl } : {}),
    });

    if (!validationResult.success) {
      setAlertType('danger');
      setAlertMessage(
        formatAlertMessage(validationResult.error.issues[0]?.message ?? 'Invalid Input'),
      );
      setOrgInfoValid(false);
      return false;
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

  type SubmitErrorBody = {
    error?: string;
    details?: Array<{ field: string; message: string }>;
  };

  function buildRequestPayload(): CreateOrganisationRegistrationRequestDto {
    const organisationDescription = orgDescrip.trim();
    const organisationWebsiteUrl = orgWeb.trim();

    return {
      organisationName: orgName.trim(),
      organisationSize: Number(orgSize),
      representativeFirstName: repFName.trim(),
      representativeLastName: repLName.trim(),
      representativeEmail: repEmail.trim().toLowerCase(),
      ...(organisationDescription ? { organisationDescription } : {}),
      ...(organisationWebsiteUrl ? { organisationWebsiteUrl } : {}),
    };
  }

  function getSafeSubmitErrorMessage(error: unknown) {
    if (!(error instanceof ApiError)) {
      return 'We could not submit the request right now. Please try again later.';
    }

    const body = error.body as SubmitErrorBody | undefined;

    if (error.status === 409 && body?.error === 'ORGANISATION_REQUEST_CONFLICT') {
      return 'A registration request already exists or conflicts with existing records. Please check the details or contact support.';
    }

    if (error.status === 422 && body?.error === 'VALIDATION_ERROR') {
      return body.details?.[0]?.message ?? 'Please check the request details and try again.';
    }

    if (error.status === 429 && body?.error === 'TOO_MANY_REQUESTS') {
      return 'Too many requests. Please wait and try again later.';
    }

    return 'We could not submit the request right now. Please try again later.';
  }

  function getBackendValidationField(error: unknown) {
    if (!(error instanceof ApiError)) {
      return undefined;
    }

    const body = error.body as SubmitErrorBody | undefined;

    if (error.status !== 422 || body?.error !== 'VALIDATION_ERROR') {
      return undefined;
    }

    return body.details?.[0]?.field;
  }

  async function handleSubmitRegistrationRequest() {
    setAlertMessage('');

    if (!validateOrgInfo()) {
      setCurrentStep(1);
      return;
    }

    if (!validateRepInfo()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await submitOrganisationRegistrationRequest(buildRequestPayload());
      setConfirmationEmailQueued(response.confirmationEmailQueued);
      setShowSuccessfulRegModal(true);
    } catch (error) {
      const validationField = getBackendValidationField(error);

      if (validationField && ORGANISATION_STEP_VALIDATION_FIELDS.has(validationField)) {
        setCurrentStep(1);
        setOrgInfoValid(false);
      }

      if (validationField && REPRESENTATIVE_STEP_VALIDATION_FIELDS.has(validationField)) {
        setCurrentStep(2);
      }

      setAlertType('danger');
      setAlertMessage(getSafeSubmitErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
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

          {/* SUCCESSFUL MODAL  */}
          <SuccessfulRegistrationModal
            isOpen={showSuccessfulRegModal}
            firstName={repFName}
            accountDescription="Organisation Administrator"
            organisation={orgName}
            confirmationEmailQueued={confirmationEmailQueued}
          />

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
                  ${orgInfoValid ? 'cursor-pointer' : 'opacity-50 hover:text-body hover:bg-white cursor-not-allowed'}`}
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
                onSubmit={handleSubmitRegistrationRequest}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default OrganisationRegistrationRequestPage;
