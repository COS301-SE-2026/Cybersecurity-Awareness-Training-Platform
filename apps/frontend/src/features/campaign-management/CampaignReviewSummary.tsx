import { getCampaignDraftItemTypeLabel } from './campaignDraftPresentation';
import type { CampaignDraftFormState, CampaignManagementContext } from './campaignManagement.types';

type CampaignReviewSummaryProps = Readonly<{
  contextKind: CampaignManagementContext['kind'];
  draft: CampaignDraftFormState;
}>;

function formatReviewDate(value: string): string {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CampaignReviewSummary({ contextKind, draft }: CampaignReviewSummaryProps) {
  const itemCount = draft.items.length;

  return (
    <section className="campaign-review" aria-labelledby="campaign-review-heading">
      <h2 id="campaign-review-heading">Review Campaign</h2>

      <dl className="campaign-review__metadata">
        <div>
          <dt>Campaign type</dt>
          <dd>{contextKind === 'organisation' ? 'Organisation Campaign' : 'Platform Campaign'}</dd>
        </div>
        <div>
          <dt>Name</dt>
          <dd>{draft.name || 'Not set'}</dd>
        </div>
        <div>
          <dt>Description</dt>
          <dd>{draft.description.trim() || 'No description provided.'}</dd>
        </div>
        <div>
          <dt>Colour</dt>
          <dd className="campaign-review__colour">
            <span
              className="campaign-review__colour-swatch"
              style={{ backgroundColor: draft.accentColor }}
              aria-hidden="true"
            />
            <span>{draft.accentColor}</span>
          </dd>
        </div>

        {contextKind === 'organisation' && (
          <>
            <div>
              <dt>Start date</dt>
              <dd>
                {draft.startDate ? (
                  <time dateTime={draft.startDate}>{formatReviewDate(draft.startDate)}</time>
                ) : (
                  'Not set'
                )}
              </dd>
            </div>
            <div>
              <dt>End date</dt>
              <dd>
                {draft.endDate ? (
                  <time dateTime={draft.endDate}>{formatReviewDate(draft.endDate)}</time>
                ) : (
                  'Not set'
                )}
              </dd>
            </div>
          </>
        )}

        <div>
          <dt>Campaign items</dt>
          <dd>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </dd>
        </div>
      </dl>

      <div className="campaign-review__items">
        <h3>Ordered items</h3>

        {draft.items.length === 0 ? (
          <p>No Campaign items added yet.</p>
        ) : (
          <ol aria-label="Campaign item summary">
            {draft.items.map((item) => {
              const key =
                item.itemType === 'GROUP'
                  ? item.campaignItemId
                  : (item.campaignItemId ?? `${item.componentType}:${item.contentId}`);

              return (
                <li key={key}>
                  <h4>{item.title}</h4>
                  <p>
                    <span>{getCampaignDraftItemTypeLabel(item)}</span>
                    {' · '}
                    <span>{item.isRequired ? 'Required' : 'Optional'}</span>
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

export default CampaignReviewSummary;
