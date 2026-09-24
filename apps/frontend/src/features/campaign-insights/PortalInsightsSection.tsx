import type { PortalInsightSummary } from '@insightful-phish/shared';

type PortalInsightsSectionProps = Readonly<{
  summary: PortalInsightSummary;
}>;

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

function PortalInsightsSection({ summary }: PortalInsightsSectionProps) {
  const metricGroups = getMetricGroups(summary);

  return (
    <section
      className="border border-default-medium bg-white px-4 py-4 font-jost shadow-xs"
      aria-labelledby="portal-evidence-heading"
    >
      <h2 id="portal-evidence-heading" className="text-xl font-medium text-dark-pink">
        Phishing Portal Evidence
      </h2>
      <p className="mt-1 text-sm tracking-wide text-gray-600">
        These behavioural events are reported separately from Campaign progress.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
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
                  <dt className="text-sm font-medium tracking-wide text-gray-600">
                    {metric.label}
                  </dt>
                  <dd className="font-google_sans_code text-[1.3rem] font-medium text-purple">
                    {metric.value}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

export default PortalInsightsSection;
