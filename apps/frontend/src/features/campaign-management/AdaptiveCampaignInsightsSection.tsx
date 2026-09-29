import type { CampaignStatisticsAdaptiveDto } from '@insightful-phish/shared';

type AdaptiveCampaignInsightsSectionProps = Readonly<{
  adaptive: CampaignStatisticsAdaptiveDto;
}>;

function AdaptiveCampaignInsightsSection({ adaptive }: AdaptiveCampaignInsightsSectionProps) {
  return (
    <section
      className="border border-default-medium bg-white px-4 py-3 font-jost shadow-xs"
      aria-labelledby="adaptive-campaign-insights-heading"
    >
      <h2
        id="adaptive-campaign-insights-heading"
        className="mb-1 text-xl font-medium text-dark-pink"
      >
        Adaptive Content
      </h2>
      <p className="mb-3 text-sm text-gray-600">
        Insufficient evidence means there was not enough evidence for the normal adaptive decision.
      </p>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div>
          <dt className="font-jost text-[1.1rem] font-medium tracking-wider text-gray-600">
            Resolved adaptive slots
          </dt>
          <dd className="font-google_sans_code text-[1.3rem] font-medium tracking-wider text-purple">
            {adaptive.resolvedSlotCount}
          </dd>
        </div>

        <div>
          <dt className="font-jost text-[1.1rem] font-medium tracking-wider text-gray-600">Easy</dt>
          <dd className="font-google_sans_code text-[1.3rem] font-medium tracking-wider text-purple">
            {adaptive.byDifficulty.EASY}
          </dd>
        </div>

        <div>
          <dt className="font-jost text-[1.1rem] font-medium tracking-wider text-gray-600">
            Medium
          </dt>
          <dd className="font-google_sans_code text-[1.3rem] font-medium tracking-wider text-purple">
            {adaptive.byDifficulty.MEDIUM}
          </dd>
        </div>

        <div>
          <dt className="font-jost text-[1.1rem] font-medium tracking-wider text-gray-600">Hard</dt>
          <dd className="font-google_sans_code text-[1.3rem] font-medium tracking-wider text-purple">
            {adaptive.byDifficulty.HARD}
          </dd>
        </div>

        <div>
          <dt className="font-jost text-[1.1rem] font-medium tracking-wider text-gray-600">
            Insufficient evidence
          </dt>
          <dd className="font-google_sans_code text-[1.3rem] font-medium tracking-wider text-purple">
            {adaptive.insufficientEvidenceResolutionCount}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export default AdaptiveCampaignInsightsSection;
