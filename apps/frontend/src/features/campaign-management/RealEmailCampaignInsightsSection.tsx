import type {
  CampaignStatisticsRealEmailDto,
  CampaignStatisticsRealEmailSimulationDto,
} from '@insightful-phish/shared';

type RealEmailCampaignInsightsSectionProps = Readonly<{
  realEmail: CampaignStatisticsRealEmailDto;
}>;

const SIMULATION_STATUS_LABELS: Record<CampaignStatisticsRealEmailSimulationDto['status'], string> =
  {
    DRAFT: 'Draft',
    SCHEDULED: 'Scheduled',
    RUNNING: 'Running',
    COMPLETED: 'Completed',
    STOPPED: 'Stopped',
  };

function RealEmailCampaignInsightsSection({ realEmail }: RealEmailCampaignInsightsSectionProps) {
  return (
    <section
      className="border border-default-medium bg-white px-4 py-3 font-jost shadow-xs"
      aria-labelledby="real-email-campaign-insights-heading"
    >
      <h2
        id="real-email-campaign-insights-heading"
        className="mb-1 text-xl font-medium text-dark-pink"
      >
        Real Email Simulation Outcomes
      </h2>
      <p className="mb-3 text-sm text-gray-600">
        Provider acceptance does not confirm delivery or inbox placement. Link requests are tracked
        request events and do not establish human intent.
      </p>

      <div className="relative overflow-x-auto border border-default bg-neutral-primary-soft">
        <table className="w-full min-w-[68rem] text-left text-sm text-body">
          <caption className="sr-only">Real Email simulation outcomes</caption>
          <thead className="border-b border-default bg-faint-purple">
            <tr>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-[1rem] font-medium tracking-wider text-dark-pink"
              >
                Simulation
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-[1rem] font-medium tracking-wider text-dark-pink"
              >
                Status
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-[1rem] font-medium tracking-wider text-dark-pink"
              >
                Planned
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-[1rem] font-medium tracking-wider text-dark-pink"
              >
                Provider accepted
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-[1rem] font-medium tracking-wider text-dark-pink"
              >
                Failed
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-[1rem] font-medium tracking-wider text-dark-pink"
              >
                Cancelled
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-[1rem] font-medium tracking-wider text-dark-pink"
              >
                Link requests
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-[1rem] font-medium tracking-wider text-dark-pink"
              >
                Recipients with link requests
              </th>
            </tr>
          </thead>
          <tbody className="font-overpass text-[1rem] tracking-wider">
            {realEmail.simulations.map((simulation, index) => (
              <tr
                key={simulation.phishingSimulationId}
                className="border-b border-default odd:bg-neutral-primary even:bg-neutral-secondary-soft last:border-b-0"
              >
                <th scope="row" className="whitespace-nowrap px-4 py-3 font-medium text-gray-700">
                  Simulation {index + 1}
                </th>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="inline-flex items-center justify-center bg-neutral-secondary-medium px-3 py-1 text-sm font-medium text-gray-700 ring-1 ring-inset ring-default-medium">
                    {SIMULATION_STATUS_LABELS[simulation.status]}
                  </span>
                </td>
                <td className="px-4 py-3 font-google_sans_code">
                  {simulation.plannedMessageCount}
                </td>
                <td className="px-4 py-3 font-google_sans_code">
                  {simulation.providerAcceptedCount}
                </td>
                <td className="px-4 py-3 font-google_sans_code">{simulation.failedMessageCount}</td>
                <td className="px-4 py-3 font-google_sans_code">
                  {simulation.cancelledMessageCount}
                </td>
                <td className="px-4 py-3 font-google_sans_code">{simulation.linkEventCount}</td>
                <td className="px-4 py-3 font-google_sans_code">
                  {simulation.uniqueRecipientClickCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default RealEmailCampaignInsightsSection;
