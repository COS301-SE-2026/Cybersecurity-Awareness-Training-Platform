import type {
  CampaignStatisticsPortalDto,
  CampaignStatisticsTraineeRowDto,
  PortalDeliveryChannel,
  PortalInsightSummary,
  TraineePortalInsight,
} from '@insightful-phish/shared';

type PortalCampaignInsightsSectionProps = Readonly<{
  portal: CampaignStatisticsPortalDto;
  trainees: readonly CampaignStatisticsTraineeRowDto[];
}>;

type PortalSummaryMetric = Readonly<{
  key: keyof PortalInsightSummary;
  label: string;
}>;

const PORTAL_SUMMARY_METRICS = [
  { key: 'managedLinkRequestCount', label: 'Managed link requests' },
  { key: 'distinctTraineeLinkRequestCount', label: 'Trainees with link requests' },
  { key: 'portalVisitCount', label: 'Portal visits' },
  { key: 'distinctPortalVisitorCount', label: 'Portal visitors' },
  { key: 'identifierFieldInteractionCount', label: 'Identifier-field interactions' },
  { key: 'credentialFieldInteractionCount', label: 'Credential-field interactions' },
  { key: 'credentialSubmissionAttemptCount', label: 'Credential submission attempts' },
  { key: 'distinctCredentialAttemptTraineeCount', label: 'Trainees with credential attempts' },
  { key: 'repeatCredentialAttemptCount', label: 'Repeat credential attempts' },
  { key: 'educationalRevealViewCount', label: 'Educational reveal views' },
  { key: 'distinctRevealTraineeCount', label: 'Trainees who viewed the reveal' },
] as const satisfies readonly PortalSummaryMetric[];

const CHANNEL_LABELS: Record<PortalDeliveryChannel, string> = {
  SIMULATED_INBOX: 'Simulated Inbox',
  REAL_EMAIL: 'Real Email',
};

function PortalSummaryMetrics({ summary }: Readonly<{ summary: PortalInsightSummary }>) {
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {PORTAL_SUMMARY_METRICS.map((metric) => (
        <div key={metric.key}>
          <dt className="font-jost text-[1.05rem] font-medium tracking-wider text-gray-600">
            {metric.label}
          </dt>
          <dd className="font-google_sans_code text-[1.3rem] font-medium tracking-wider text-purple">
            {summary[metric.key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PortalChannelSummary({
  channel,
  summary,
}: Readonly<{
  channel: PortalDeliveryChannel;
  summary: PortalInsightSummary;
}>) {
  return (
    <details className="group border border-default-medium bg-neutral-primary">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="font-medium tracking-wide text-gray-700">{CHANNEL_LABELS[channel]}</span>
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
        <PortalSummaryMetrics summary={summary} />
      </div>
    </details>
  );
}

function getTraineeStages(insight: TraineePortalInsight) {
  return [
    { label: 'Managed link requested', recorded: insight.managedLinkRequested },
    { label: 'Portal visited', recorded: insight.portalVisited },
    { label: 'Identifier field interacted', recorded: insight.identifierFieldInteracted },
    { label: 'Credential field interacted', recorded: insight.credentialFieldInteracted },
    { label: 'Educational reveal viewed', recorded: insight.educationalRevealViewed },
  ];
}

function PortalTraineeSummary({
  trainee,
  insight,
}: Readonly<{
  trainee: Pick<CampaignStatisticsTraineeRowDto, 'traineeProfileId' | 'displayName'>;
  insight: TraineePortalInsight;
}>) {
  return (
    <details className="group border border-default-medium bg-neutral-primary">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="font-medium tracking-wide text-gray-700">{trainee.displayName}</span>
        <span className="flex items-center gap-2 text-sm text-purple">
          {insight.credentialSubmissionAttemptCount} credential attempts
          <span
            className="material-icons-sharp transition-transform group-open:rotate-180"
            aria-hidden="true"
          >
            expand_more
          </span>
        </span>
      </summary>

      <div className="border-t border-default-medium bg-white p-4">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {getTraineeStages(insight).map((stage) => (
            <div key={stage.label}>
              <dt className="text-sm font-medium text-gray-600">{stage.label}</dt>
              <dd
                className={
                  stage.recorded ? 'text-sm font-medium text-purple' : 'text-sm text-gray-500'
                }
              >
                {stage.recorded ? 'Recorded' : 'Not recorded'}
              </dd>
            </div>
          ))}

          <div>
            <dt className="text-sm font-medium text-gray-600">Credential submission attempts</dt>
            <dd className="font-google_sans_code text-lg text-purple">
              {insight.credentialSubmissionAttemptCount}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-600">Repeat credential attempts</dt>
            <dd className="font-google_sans_code text-lg text-purple">
              {insight.repeatCredentialAttemptCount}
            </dd>
          </div>
        </dl>
      </div>
    </details>
  );
}

function PortalCampaignInsightsSection({ portal, trainees }: PortalCampaignInsightsSectionProps) {
  const traineesWithPortalEvidence = trainees.flatMap((trainee) =>
    trainee.portal === undefined
      ? []
      : [
          {
            trainee,
            insight: trainee.portal,
          },
        ],
  );

  return (
    <section
      className="mb-1 border border-default-medium px-4 py-3 font-jost shadow-xs"
      aria-labelledby="portal-campaign-insights-heading"
    >
      <h3 id="portal-campaign-insights-heading" className="mb-1 text-xl font-medium text-dark-pink">
        Phishing Portal Evidence
      </h3>
      <p className="mb-3 text-sm text-gray-600">
        Managed link requests, Portal visits, field interactions, submission attempts, and
        educational reveal views are separate factual stages. No entered credential values are
        reported.
      </p>

      <PortalSummaryMetrics summary={portal.summary} />

      {portal.channels !== undefined && portal.channels.length > 0 && (
        <div className="mt-5">
          <h4 className="text-[1.1rem] font-medium tracking-wide text-dark-pink">
            Delivery Channel Evidence
          </h4>
          <p className="mt-1 text-sm text-gray-600">
            Only channels with stored Portal facts are shown.
          </p>
          <div className="mt-3 space-y-2">
            {portal.channels.map((channel) => (
              <PortalChannelSummary
                key={channel.channel}
                channel={channel.channel}
                summary={channel.summary}
              />
            ))}
          </div>
        </div>
      )}

      {traineesWithPortalEvidence.length > 0 && (
        <div className="mt-5">
          <h4 className="text-[1.1rem] font-medium tracking-wide text-dark-pink">
            Trainee Portal Evidence
          </h4>
          <p className="mt-1 text-sm text-gray-600">
            Portal evidence is shown only for trainees on this page.
          </p>
          <div className="mt-3 space-y-2">
            {traineesWithPortalEvidence.map(({ trainee, insight }) => (
              <PortalTraineeSummary
                key={trainee.traineeProfileId}
                trainee={trainee}
                insight={insight}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default PortalCampaignInsightsSection;
