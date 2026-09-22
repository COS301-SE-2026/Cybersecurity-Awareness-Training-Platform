import type { ContentVariantGenerationResponseDto } from '@insightful-phish/shared';

export type VariantQualityReviewState = Pick<
  ContentVariantGenerationResponseDto,
  'findings' | 'semanticReviewStatus'
>;

export function VariantQualityReview({
  findings,
  semanticReviewStatus,
}: VariantQualityReviewState) {
  return (
    <section
      className="mb-5 border border-purple bg-faint-purple p-4 font-overpass text-deep-purple"
      aria-labelledby="variant-quality-review-title"
      role="status"
    >
      <h2 id="variant-quality-review-title" className="font-jost text-lg font-semibold">
        AI variant review
      </h2>
      {semanticReviewStatus === 'UNAVAILABLE' ? (
        <p>Automated semantic review was unavailable. Review this Draft carefully before saving.</p>
      ) : findings.length === 0 ? (
        <p>No quality concerns were identified. Review and edit the Draft before saving.</p>
      ) : (
        <>
          <p>Review these quality findings before saving:</p>
          <ul className="mt-2 list-disc pl-6">
            {findings.map((finding, index) => (
              <li key={`${finding.code}:${finding.field ?? ''}:${index}`}>{finding.message}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
