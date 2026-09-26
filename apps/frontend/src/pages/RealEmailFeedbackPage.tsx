import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import type { EmailClassificationDto, RealEmailFeedbackDto } from '@insightful-phish/shared';
import { ApiError } from '../lib/apiClient';
import { getPhishingSimulationFeedback } from '../services/phishing-simulation.service';
import LoadingSpinnerSVG from '../components/LoadingSpinnerSVG';
import { AlertVariants, type AlertVariant } from '../components/alerts/alertVariants';

const classificationMessages: Record<EmailClassificationDto, string> = {
  SAFE: 'This was a safe control email. Not every training email is malicious. Assess each message using the evidence it contains.',
  SUSPICIOUS:
    'This simulated email was classified as Suspicious. It showed warning signs, but those signs did not confirm phishing.',
  PHISHING:
    'This simulated email was classified as Phishing. The email contained signs associated with a phishing attempt.',
};

type FeedbackStateProps = Readonly<{
  heading: string;
  message: string;
  variant: AlertVariant;
  isLoading?: boolean;
  isRetrying?: boolean;
  onRetry?: () => void;
}>;

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
      <h1
        id="feedback-heading"
        className="m-0 font-jost text-3xl font-semibold leading-tight text-purple sm:text-5xl"
      >
        Email simulation feedback
      </h1>
      {getStatusBadge(feedback.expectedClassification)}
      <p className="m-0 font-overpass text-base leading-7 text-dark-pink sm:text-xl">
        {classificationMessages[feedback.expectedClassification]}
      </p>
      {feedback.explanation !== null ? (
        <p className="m-0 font-overpass text-base leading-7 text-dark-pink sm:text-xl">
          {feedback.explanation}
        </p>
      ) : null}
      {feedback.redFlags.length > 0 ? (
        <section aria-labelledby="red-flags-heading">
          <h2
            id="red-flags-heading"
            className="m-0 font-jost text-xl font-medium text-dark-pink sm:text-2xl"
          >
            Red flags
          </h2>
          <ul className="mt-3 list-disc pl-6 font-overpass text-base leading-7 text-dark-pink">
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
      <FeedbackState
        heading="This link is no longer available"
        message="The feedback for this simulation link cannot be displayed."
        variant="warning"
      />
    );
  } else if (feedbackQuery.isPending === true) {
    pageContent = (
      <FeedbackState
        heading="Email simulation feedback"
        message="Loading feedback..."
        variant="info"
        isLoading={true}
      />
    );
  } else if (feedbackQuery.isError === true) {
    pageContent = (
      <FeedbackState
        heading="Unable to load feedback"
        message="We could not load this feedback. Try again."
        variant="danger"
        isRetrying={feedbackQuery.isFetching}
        onRetry={() => void feedbackQuery.refetch()}
      />
    );
  } else if (feedbackQuery.data !== undefined) {
    pageContent = <FeedbackDetails feedback={feedbackQuery.data} />;
  } else {
    pageContent = (
      <FeedbackState
        heading="Feedback unavailable"
        message="No feedback was returned for this simulation link."
        variant="default"
      />
    );
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[var(--ip-light-bg-purple)] px-4 py-8 font-jost sm:px-8 sm:py-12">
      <section
        className="grid w-full max-w-xl gap-5 border border-default bg-white-purple p-5 shadow-md sm:p-10"
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

function FeedbackState({
  heading,
  message,
  variant,
  isLoading = false,
  isRetrying = false,
  onRetry,
}: FeedbackStateProps) {
  const alertStyle = AlertVariants[variant];

  return (
    <>
      <h1
        id="feedback-heading"
        className="m-0 font-jost text-3xl font-semibold leading-tight text-purple sm:text-5xl"
      >
        {heading}
      </h1>
      <div
        className={`border-t-4 p-4 ${alertStyle.container}`}
        role={variant === 'danger' ? 'alert' : 'status'}
        aria-live="polite"
        aria-busy={isLoading === true || isRetrying === true}
      >
        <div className="flex items-center gap-3">
          {isLoading === true ? <LoadingSpinnerSVG tone="brand" /> : null}
          <p className="m-0 font-overpass text-base leading-6 sm:text-lg">{message}</p>
        </div>
        {onRetry !== undefined ? (
          <button
            type="button"
            className="mt-4 w-full cursor-pointer bg-main-purple px-4 py-2 font-jost text-white hover:bg-hover-purple disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            disabled={isRetrying === true}
            onClick={onRetry}
          >
            {isRetrying === true ? 'Retrying...' : 'Retry'}
          </button>
        ) : null}
      </div>
    </>
  );
}

export default RealEmailFeedbackPage;
