import type { CSSProperties, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import type { EmailClassificationDto, RealEmailFeedbackDto } from '@insightful-phish/shared';
import { ApiError } from '../lib/apiClient';
import { getPhishingSimulationFeedback } from '../services/phishing-simulation.service';

const classificationMessages: Record<EmailClassificationDto, string> = {
  SAFE: 'This was a safe control email. Not every training email is malicious. Assess each message using the evidence it contains.',
  SUSPICIOUS:
    'This simulated email was classified as Suspicious. It showed warning signs, but those signs did not confirm phishing.',
  PHISHING:
    'This simulated email was classified as Phishing. The email contained signs associated with a phishing attempt.',
};

function getStatusBadge(classification: EmailClassificationDto) {
  const variants: Record<EmailClassificationDto, string> = {
    SAFE: 'ring-success-subtle text-fg-success-strong bg-success-soft',
    SUSPICIOUS: 'ring-warning-subtle text-fg-warning bg-warning-soft',
    PHISHING: 'ring-danger-subtle text-fg-danger-strong bg-danger-soft',
  };

  return (
    <span
      className={`flex w-full items-center justify-center px-4 py-2 ring-2 ring-inset font-jost text-xl font-medium tracking-wide sm:text-2xl ${variants[classification]}`}
    >
      {classification.charAt(0) + classification.slice(1).toLowerCase()}
    </span>
  );
}

function FeedbackDetails({ feedback }: Readonly<{ feedback: RealEmailFeedbackDto }>) {
  return (
    <>
      <h1 id="feedback-heading" style={headingStyle}>
        Email simulation feedback
      </h1>
      {getStatusBadge(feedback.expectedClassification)}
      <p style={messageStyle}>{classificationMessages[feedback.expectedClassification]}</p>
      {feedback.explanation !== null ? <p style={messageStyle}>{feedback.explanation}</p> : null}
      {feedback.redFlags.length > 0 ? (
        <section aria-labelledby="red-flags-heading">
          <h2 id="red-flags-heading" className="m-0 font-jost text-2xl font-medium text-dark-pink">
            Red flags
          </h2>
          <ul className="mt-3 list-disc pl-6 font-overpass text-dark-pink">
            {feedback.redFlags.map((redFlag, index) => (
              <li key={`${redFlag.label}-${index}`}>
                <strong className="font-semibold">{redFlag.label}</strong>
                {redFlag.description !== null ? `: ${redFlag.description}` : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function RealEmailFeedbackPage() {
  const { token } = useParams<{ token: string }>();
  const feedbackQuery = useQuery({
    queryKey: ['real-email-feedback', token],
    queryFn: () => getPhishingSimulationFeedback(token ?? ''),
    enabled: token !== undefined,
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    staleTime: Infinity,
    gcTime: 0,
  });
  const isUnavailable =
    token === undefined ||
    (feedbackQuery.isError === true &&
      feedbackQuery.error instanceof ApiError &&
      feedbackQuery.error.status === 404);
  let pageContent: ReactNode;

  if (isUnavailable === true) {
    pageContent = (
      <>
        <h1 id="feedback-heading" style={headingStyle}>
          This link is no longer available
        </h1>
        <p style={messageStyle}>The feedback for this simulation link cannot be displayed.</p>
      </>
    );
  } else if (feedbackQuery.isPending === true) {
    pageContent = (
      <>
        <h1 id="feedback-heading" style={headingStyle}>
          Email simulation feedback
        </h1>
        <p role="status" aria-live="polite" style={messageStyle}>
          Loading feedback...
        </p>
      </>
    );
  } else if (feedbackQuery.isError === true) {
    pageContent = (
      <>
        <h1 id="feedback-heading" style={headingStyle}>
          Unable to load feedback
        </h1>
        <p style={messageStyle}>We could not load this feedback. Please try again later.</p>
      </>
    );
  } else if (feedbackQuery.data !== undefined) {
    pageContent = <FeedbackDetails feedback={feedbackQuery.data} />;
  } else {
    pageContent = (
      <>
        <h1 id="feedback-heading" style={headingStyle}>
          Unable to load feedback
        </h1>
        <p style={messageStyle}>We could not load this feedback. Please try again later.</p>
      </>
    );
  }

  return (
    <main style={standalonePageStyle}>
      <section
        className="bg-white-purple border border-default shadow-md"
        style={cardStyle}
        aria-labelledby="feedback-heading"
      >
        <p className="m-0 font-overpass text-sm font-semibold uppercase tracking-[0.12rem] text-dark-pink">
          Insightful Phish
        </p>
        {pageContent}
      </section>
    </main>
  );
}

const standalonePageStyle = {
  width: '100vw',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  boxSizing: 'border-box',
  backgroundColor: 'var(--ip-light-bg-purple)',
  fontFamily: 'Jost',
} satisfies CSSProperties;
const cardStyle = {
  width: 'min(100%, 36rem)',
  display: 'grid',
  gap: '1.25rem',
  padding: '2.5rem',
  boxSizing: 'border-box',
} satisfies CSSProperties;
const headingStyle = {
  margin: 0,
  color: 'var(--ip-purple)',
  fontSize: '3rem',
  fontWeight: 600,
  lineHeight: 1.1,
} satisfies CSSProperties;
const messageStyle = {
  margin: 0,
  color: 'var(--ip-dark-pink)',
  fontFamily: 'var(--overpass)',
  fontSize: '1.2rem',
  lineHeight: 1.5,
} satisfies CSSProperties;

export default RealEmailFeedbackPage;
