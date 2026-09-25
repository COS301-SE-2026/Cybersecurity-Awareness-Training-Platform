import type {
  PortalDeliveryChannel,
  PortalInsightSummary,
  TraineePortalInsight,
} from '@insightful-phish/shared';

export type PortalChannelEvidence = Readonly<{
  channel: PortalDeliveryChannel;
  summary: PortalInsightSummary;
}>;

export type PortalTraineeEvidence = Readonly<{
  traineeProfileId: string;
  displayName: string;
  insight: TraineePortalInsight;
}>;

type PortalInsightsSectionProps = Readonly<{
  summary: PortalInsightSummary;
  trainees?: readonly PortalTraineeEvidence[];
  channels?: readonly PortalChannelEvidence[];
}>;

const CHANNEL_LABELS: Record<PortalDeliveryChannel, string> = {
  SIMULATED_INBOX: 'Simulated Inbox',
  REAL_EMAIL: 'Real Email',
};

type PortalMetric = Readonly<{
  label: string;
  value: number;
}>;

type PortalMetricGroup = Readonly<{
  heading: string;
  description: string;
  metrics: readonly PortalMetric[];
}>;

function getMetricGroups(summary: PortalInsightSummary): readonly PortalMetricGroup[] {
  return [
    {
      heading: 'Link Activity',
      description:
        'Managed-link requests may include security scanners or preview tools. Portal visits are recorded after the active page renders.',
      metrics: [
        { label: 'Managed-link requests', value: summary.managedLinkRequestCount },
        {
          label: 'Trainees with link requests',
          value: summary.distinctTraineeLinkRequestCount,
        },
        { label: 'Portal visits', value: summary.portalVisitCount },
        { label: 'Distinct portal visitors', value: summary.distinctPortalVisitorCount },
      ],
    },
    {
      heading: 'Field Interaction',
      description: 'These counts show interaction stages. No entered values are collected.',
      metrics: [
        {
          label: 'Identifier field interactions',
          value: summary.identifierFieldInteractionCount,
        },
        {
          label: 'Credential field interactions',
          value: summary.credentialFieldInteractionCount,
        },
      ],
    },
    {
      heading: 'Credential Attempts',
      description:
        'Credential attempts are deliberate submission actions. Repeat attempts exclude duplicate network retries.',
      metrics: [
        {
          label: 'Credential submission attempts',
          value: summary.credentialSubmissionAttemptCount,
        },
        {
          label: 'Trainees with credential attempts',
          value: summary.distinctCredentialAttemptTraineeCount,
        },
        { label: 'Repeat credential attempts', value: summary.repeatCredentialAttemptCount },
      ],
    },
    {
      heading: 'Educational Reveal',
      description: 'Reveal views count trainees whose educational reveal rendered successfully.',
      metrics: [
        { label: 'Educational reveal views', value: summary.educationalRevealViewCount },
        { label: 'Trainees who viewed the reveal', value: summary.distinctRevealTraineeCount },
      ],
    },
  ];
}

function PortalMetricGroups({ summary }: Readonly<{ summary: PortalInsightSummary }>) {
  const metricGroups = getMetricGroups(summary);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {metricGroups.map((group) => (
        <article
          key={group.heading}
          className="border border-default-medium bg-neutral-primary p-4"
        >
          <h3 className="text-[1.1rem] font-medium tracking-wide text-purple">{group.heading}</h3>
          <p className="mt-1 text-sm leading-5 text-gray-600">{group.description}</p>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {group.metrics.map((metric) => (
              <div key={metric.label} className="border-l-2 border-main-purple pl-3">
                <dt className="text-sm font-medium tracking-wide text-gray-600">{metric.label}</dt>
                <dd className="font-google_sans_code text-[1.3rem] font-medium text-purple">
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  );
}

function PortalChannelDetail({ evidence }: Readonly<{ evidence: PortalChannelEvidence }>) {
  return (
    <details className="group border border-default-medium bg-neutral-primary">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-secondary-soft [&::-webkit-details-marker]:hidden">
        <span className="font-medium tracking-wide text-gray-700">
          {CHANNEL_LABELS[evidence.channel]}
        </span>
        <span className="flex items-center gap-2 text-sm text-purple">
          View channel facts
          <span
            className="material-icons-sharp transition-transform group-open:rotate-180"
            aria-hidden="true"
          >
            expand_more
          </span>
        </span>
      </summary>
      <div className="border-t border-default-medium bg-white p-4">
        <PortalMetricGroups summary={evidence.summary} />
      </div>
    </details>
  );
}

function PortalTraineeDetail({ trainee }: Readonly<{ trainee: PortalTraineeEvidence }>) {
  const stages = [
    { label: 'Managed link requested', recorded: trainee.insight.managedLinkRequested },
    { label: 'Portal visited', recorded: trainee.insight.portalVisited },
    { label: 'Identifier field interacted', recorded: trainee.insight.identifierFieldInteracted },
    { label: 'Credential field interacted', recorded: trainee.insight.credentialFieldInteracted },
    { label: 'Educational reveal viewed', recorded: trainee.insight.educationalRevealViewed },
  ];

  return (
    <details className="group border border-default-medium bg-neutral-primary">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-secondary-soft [&::-webkit-details-marker]:hidden">
        <span className="font-medium tracking-wide text-gray-700">{trainee.displayName}</span>
        <span className="flex items-center gap-2 text-sm text-purple">
          {trainee.insight.credentialSubmissionAttemptCount} credential attempts
          <span
            className="material-icons-sharp transition-transform group-open:rotate-180"
            aria-hidden="true"
          >
            expand_more
          </span>
        </span>
      </summary>
      <div className="border-t border-default-medium bg-white px-4 py-4">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stages.map((stage) => (
            <div key={stage.label}>
              <dt className="text-sm font-medium text-gray-600">{stage.label}</dt>
              <dd
                className={
                  stage.recorded === true
                    ? 'text-sm font-medium text-purple'
                    : 'text-sm text-gray-500'
                }
              >
                {stage.recorded === true ? 'Recorded' : 'Not recorded'}
              </dd>
            </div>
          ))}
          <div>
            <dt className="text-sm font-medium text-gray-600">Credential submission attempts</dt>
            <dd className="font-google_sans_code text-lg text-purple">
              {trainee.insight.credentialSubmissionAttemptCount}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-600">Repeat credential attempts</dt>
            <dd className="font-google_sans_code text-lg text-purple">
              {trainee.insight.repeatCredentialAttemptCount}
            </dd>
          </div>
        </dl>
      </div>
    </details>
  );
}

function PortalInsightsSection({ summary, trainees, channels }: PortalInsightsSectionProps) {
  const hasTraineeEvidence = trainees !== undefined && trainees.length > 0;
  const hasChannelEvidence = channels !== undefined && channels.length > 0;

  return (
    <section
      className="mb-1 border border-default-medium bg-white px-4 py-4 font-jost shadow-xs"
      aria-labelledby="portal-evidence-heading"
    >
      <h2 id="portal-evidence-heading" className="text-xl font-medium text-dark-pink">
        Phishing Portal Evidence
      </h2>
      <p className="mt-1 text-sm tracking-wide text-gray-600">
        These behavioural events are reported separately from Campaign progress.
      </p>

      <div className="mt-4">
        <PortalMetricGroups summary={summary} />
      </div>

      {hasChannelEvidence === true && (
        <div className="mt-5">
          <h3 className="text-[1.1rem] font-medium tracking-wide text-dark-pink">
            Delivery Channel Evidence
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Only delivery channels with stored portal facts are shown.
          </p>
          <div className="mt-3 space-y-2">
            {channels.map((evidence) => (
              <PortalChannelDetail key={evidence.channel} evidence={evidence} />
            ))}
          </div>
        </div>
      )}

      {hasTraineeEvidence === true && (
        <div className="mt-5">
          <h3 className="text-[1.1rem] font-medium tracking-wide text-dark-pink">
            Trainee Portal Evidence
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Expand a trainee to view the factual portal stages included in this report.
          </p>
          <div className="mt-3 space-y-2">
            {trainees.map((trainee) => (
              <PortalTraineeDetail key={trainee.traineeProfileId} trainee={trainee} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default PortalInsightsSection;
