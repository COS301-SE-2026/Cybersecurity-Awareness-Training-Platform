import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type {
  ClassifySimulatedEmailResponseDto,
  EmailClassificationDto,
  EmailRedFlagTypeDto,
  GetSimulatedEmailResponseDto,
} from '@insightful-phish/shared';
import AppLayout from '../components/layout/AppLayout';
import PageBackButton from '../components/ui/PageBackButton';
import { useAuth } from '../context/useAuth';
import { formatEmailTime, toTitleCase } from '../lib/email.utils';
import {
  classifySimulatedEmail,
  getSimulatedEmail,
  recordSimulatedEmailInteraction,
} from '../services/campaigns.service';
import { sanitizeSafeHtml } from '../lib/safeHtml';
import './SimulatedEmailPages.css';

const emailMetaLabelStyle = {
  color: 'var(--ip-dark-pink)',
  fontFamily: 'Jost',
  fontSize: '1.2rem',
  fontWeight: 500,
  letterSpacing: '0.08rem',
};

const redFlagChoices: EmailRedFlagTypeDto[] = [
  'SENDER',
  'DOMAIN',
  'LINK',
  'LANGUAGE',
  'ATTACHMENT',
  'REQUEST',
  'OTHER',
];

function getStatusBadge(classification: EmailClassificationDto) {
  const variants: Record<EmailClassificationDto, string> = {
    SAFE: 'ring-success-subtle text-fg-success-strong bg-success-soft',
    SUSPICIOUS: 'ring-warning-subtle text-fg-warning bg-warning-soft',
    PHISHING: 'ring-danger-subtle text-fg-danger-strong bg-danger-soft',
  };

  return (
    <span
      className={`inline-flex min-w-32 items-center justify-center px-4 py-1 pt-[0.4rem] ring-2 ring-inset text-sm font-medium ${variants[classification]}`}
    >
      {classification.charAt(0) + classification.slice(1).toLowerCase()}
    </span>
  );
}

function EmailDetailPage() {
  const { campaignItemId, emailId } = useParams<{
    campaignItemId: string;
    emailId: string;
  }>();

  const { token } = useAuth();
  const [email, setEmail] = useState<GetSimulatedEmailResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClassification, setSelectedClassification] =
    useState<EmailClassificationDto | null>(null);
  const [selectedRedFlagTypes, setSelectedRedFlagTypes] = useState<EmailRedFlagTypeDto[]>([]);
  const [classificationResult, setClassificationResult] =
    useState<ClassifySimulatedEmailResponseDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const requestKey = `${campaignItemId ?? ''}:${emailId ?? ''}:${token ?? ''}`;
  const currentRequestKeyRef = useRef(requestKey);
  currentRequestKeyRef.current = requestKey;

  const sanitizedBodyHtml = email ? sanitizeSafeHtml(email.bodyHtml) : '';

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    setEmail(null);
    setClassificationResult(null);
    setSelectedClassification(null);
    setSelectedRedFlagTypes([]);
    setSubmissionError(null);
    setIsSubmitting(false);

    async function loadEmail() {
      if (campaignItemId === undefined || emailId === undefined || token === null) {
        setLoadedRequestKey(requestKey);
        setLoading(false);
        return;
      }

      try {
        const data = await getSimulatedEmail(campaignItemId, emailId, token);

        if (isCurrent === true) {
          setEmail(data);
          setClassificationResult(data.classificationResult ?? null);
        }
      } catch (error) {
        console.error('FAILED TO LOAD SIMULATED EMAIL', error);
      } finally {
        if (isCurrent === true) {
          setLoadedRequestKey(requestKey);
          setLoading(false);
        }
      }
    }

    void loadEmail();
    return () => {
      isCurrent = false;
    };
  }, [campaignItemId, emailId, token, requestKey]);

  useEffect(() => {
    async function recordEmailOpened() {
      if (
        campaignItemId === undefined ||
        emailId === undefined ||
        token === null ||
        email === null ||
        loadedRequestKey !== requestKey
      ) {
        return;
      }

      try {
        await recordSimulatedEmailInteraction(
          campaignItemId,
          emailId,
          'SIMULATED_EMAIL_OPENED',
          token,
        );
      } catch (error) {
        console.error('FAILED TO RECORD EMAIL OPEN EVENT', error);
      }
    }

    void recordEmailOpened();
  }, [campaignItemId, emailId, token, email, loadedRequestKey, requestKey]);

  async function submitClassification() {
    if (
      campaignItemId === undefined ||
      emailId === undefined ||
      token === null ||
      selectedClassification === null ||
      isSubmitting === true ||
      classificationResult !== null
    ) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const result = await classifySimulatedEmail(
        campaignItemId,
        emailId,
        { selectedClassification, selectedRedFlagTypes },
        token,
      );
      if (currentRequestKeyRef.current === requestKey) {
        setClassificationResult(result);
      }
    } catch {
      if (currentRequestKeyRef.current === requestKey) {
        setSubmissionError('Could not submit your answer. Please try again.');
      }
    } finally {
      if (currentRequestKeyRef.current === requestKey) {
        setIsSubmitting(false);
      }
    }
  }

  if (loading || loadedRequestKey !== requestKey) {
    return (
      <AppLayout className="simulated-email-layout" contentStyle={{ backgroundColor: '#F3F4F6' }}>
        <div
          className="simulated-email-state"
          style={{
            padding: '1.4rem',
            color: '#4B5563',
            fontFamily: 'Overpass',
            fontSize: '1.2rem',
          }}
        >
          LOADING EMAIL...
        </div>
      </AppLayout>
    );
  }

  if (email === null) {
    return (
      <AppLayout className="simulated-email-layout" contentStyle={{ backgroundColor: '#F3F4F6' }}>
        <div
          className="simulated-email-state"
          style={{
            padding: '1.4rem',
            color: '#B91C1C',
            fontFamily: 'Overpass',
            fontSize: '1.2rem',
          }}
        >
          FAILED TO LOAD EMAIL
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout className="simulated-email-layout" contentStyle={{ backgroundColor: '#F3F4F6' }}>
      <div
        className="simulated-email-detail"
        style={{
          padding: '1.4rem',
          paddingBottom: '2rem',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem',
          height: '100%',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          userSelect: 'none',
        }}
      >
        <PageBackButton className="simulated-email-back-button" marginBottom="-0.4rem" />

        <h1
          className="simulated-email-detail__title"
          style={{
            color: 'var(--ip-dark-pink)',
            fontFamily: 'Jost',
            fontSize: '3.8rem',
            fontWeight: 500,
            margin: 0,
            marginBottom: '0.2rem',
            lineHeight: 1,
          }}
        >
          Simulated Email
        </h1>

        <div
          className="simulated-email-detail__metadata"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1D5DB',
            borderLeft: '6px solid var(--ip-purple)',
            padding: '1.1rem 1.2rem',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '2rem',
            width: '100%',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          <div className="simulated-email-detail__primary-metadata" style={{ flex: 1 }}>
            <div style={emailMetaLabelStyle}>From</div>

            <div
              className="simulated-email-detail__sender"
              style={{
                color: 'var(--ip-deep-purple)',
                fontFamily: 'Overpass',
                fontSize: '2rem',
                fontWeight: 400,
                lineHeight: 1.2,
              }}
            >
              {email.senderLabel}
            </div>

            <div
              className="simulated-email-detail__address"
              style={{
                color: '#6B7280',
                fontFamily: 'Overpass',
                fontSize: '1.4rem',
                fontWeight: 200,
                marginBottom: '1.5rem',
              }}
            >
              {email.senderAddress}
            </div>

            <div style={emailMetaLabelStyle}>Subject</div>

            <div
              className="simulated-email-detail__subject"
              style={{
                color: '#1F2937',
                fontFamily: 'Overpass',
                fontSize: '1.6rem',
                fontWeight: 400,
                lineHeight: 1.3,
              }}
            >
              {toTitleCase(email.subject)}
            </div>
          </div>

          <div
            className="simulated-email-detail__received"
            style={{
              minWidth: '200px',
              textAlign: 'right',
            }}
          >
            <div style={emailMetaLabelStyle}>Received</div>

            <div
              style={{
                color: '#4B5563',
                fontFamily: 'Overpass',
                fontSize: '1.2rem',
                fontWeight: 400,
              }}
            >
              {formatEmailTime(email.receivedAt)}
            </div>
          </div>
        </div>

        <div
          className="simulated-email-detail__body-card"
          style={{
            width: '100%',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1D5DB',
            padding: '1.25rem',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            flex: '1 0 12rem',
            minHeight: '12rem',
            overflow: 'hidden',
          }}
        >
          <div
            className="email-body"
            style={{
              color: '#1F2937',
              fontFamily: 'Overpass',
              fontSize: '1.5rem',
              fontWeight: 400,
              lineHeight: 1.7,
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto',
              paddingRight: '0.75rem',
            }}
            dangerouslySetInnerHTML={{ __html: sanitizedBodyHtml }}
          />
        </div>
        <section
          className="w-full shrink-0 border border-gray-300 bg-white p-5 text-gray-600"
          aria-label="Email classification"
        >
          <h2 className="mb-3 font-jost text-2xl font-medium text-purple">Classify Email</h2>
          {classificationResult === null ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submitClassification();
              }}
            >
              <fieldset disabled={isSubmitting} className="mb-5">
                <legend className="mb-2 font-medium font-jost text-[1.2rem] tracking-wider text-grey-500">
                  Your Classification
                </legend>
                <div className="flex flex-wrap gap-4 text-xl font-overpass tracking-wider">
                  {(['SAFE', 'SUSPICIOUS', 'PHISHING'] as const).map((choice) => (
                    <label
                      key={choice}
                      className="flex text-[1.2rem] cursor-pointer items-center gap-2"
                    >
                      <input
                        type="radio"
                        name="classification"
                        value={choice}
                        checked={selectedClassification === choice}
                        onChange={() => setSelectedClassification(choice)}
                        className="h-6 w-6 accent-[#8400ff] focus:ring-2 focus:ring-brand-soft"
                      />
                      {getStatusBadge(choice)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset disabled={isSubmitting} className="mb-5">
                <legend className="mb-2 font-medium font-jost text-[1.1rem] tracking-wider text-grey-500">
                  Where Did You Notice Possible Warning Signs?
                </legend>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {redFlagChoices.map((type) => (
                    <label
                      key={type}
                      className="flex cursor-pointer items-center gap-2 font-jost text-[1.2rem] text-dark-pink tracking-wide"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRedFlagTypes.includes(type)}
                        className="accent-[#8400ff] w-5 h-5 border border-default-medium bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft"
                        onChange={() =>
                          setSelectedRedFlagTypes((current) =>
                            current.includes(type) === true
                              ? current.filter((value) => value !== type)
                              : [...current, type],
                          )
                        }
                      />
                      <span className="capitalize text-[1.2rem] text-gray-600">
                        {type.toLowerCase()}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {submissionError !== null && (
                <p role="alert" className="mb-3 text-red-700">
                  {submissionError}
                </p>
              )}
              <button
                type="submit"
                disabled={selectedClassification === null || isSubmitting === true}
                className="tracking-wider bg-main-purple hover:bg-hover-purple px-5 py-2 font-jost text-xl text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting === true ? 'Submitting...' : 'Submit Answer'}
              </button>
            </form>
          ) : (
            <div aria-live="polite">
              <p className="flex items-center gap-2 mb-3">
                Your Answer: {getStatusBadge(classificationResult.selectedClassification)}
              </p>
              <p className="flex items-center gap-2 mb-3">
                Expected Answer:{' '}
                {classificationResult.expectedClassification === undefined
                  ? '—'
                  : getStatusBadge(classificationResult.expectedClassification)}
              </p>
              <p className="font-google_sans_code">{classificationResult.feedback}</p>
              <h3 className="mt-4 font-medium font-jost text-[1.1rem] tracking-wider text-grey-500">
                Red Flags in Email
              </h3>
              {(classificationResult.redFlags?.length ?? 0) === 0 ? (
                <p className="text-red-600 tracking-wider font-[1.1rem]">
                  No Red Flags Were Listed For This Email
                </p>
              ) : (
                <ul className="list-disc pl-6 font-google_sans_code">
                  {classificationResult.redFlags?.map((flag) => (
                    <li key={flag.id}>
                      {flag.label}: {flag.description} (
                      {classificationResult.selectedRedFlagIds?.includes(flag.id) === true
                        ? 'identified'
                        : 'missed'}
                      )
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

export default EmailDetailPage;
