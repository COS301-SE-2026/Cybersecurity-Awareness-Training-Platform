import type { CampaignDraftItemState } from './campaignManagement.types';

type CampaignOrderProps = Readonly<{
  items: readonly CampaignDraftItemState[];
}>;

const TYPE_LABELS = {
  TRAINING_DOCUMENT: 'Training Document',
  QUIZ: 'Quiz',
  SIMULATED_INBOX: 'Simulated Inbox',
} as const;

function CampaignOrder({ items }: CampaignOrderProps) {
  return (
    <section className="campaign-order" aria-labelledby="campaign-order-heading">
      <div className="campaign-order__heading">
        <h2 id="campaign-order-heading">Campaign Order</h2>
        <p>Content will be completed in the order shown.</p>
      </div>

      {items.length === 0 ? (
        <p className="campaign-order__empty">No content has been added yet.</p>
      ) : (
        <ol className="campaign-order__items">
          {items.map((item, index) => {
            const key =
              item.itemType === 'GROUP'
                ? item.campaignItemId
                : (item.campaignItemId ?? `${item.componentType}:${item.contentId}`);

            return (
              <li key={key}>
                <article className="campaign-order-item">
                  <span className="campaign-order-item__position">{index + 1}</span>
                  <div>
                    <span className="campaign-order-item__type">
                      {item.itemType === 'GROUP' ? 'Group' : TYPE_LABELS[item.componentType]}
                    </span>
                    <h3>{item.title}</h3>
                    {item.description && <p>{item.description}</p>}

                    {item.itemType === 'GROUP' && <p>{item.children.length} grouped items</p>}
                    {item.itemType === 'COMPONENT' && !item.sourceAvailable && (
                      <p className="campaign-order-item__warning">
                        This source is no longer available.
                      </p>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default CampaignOrder;
