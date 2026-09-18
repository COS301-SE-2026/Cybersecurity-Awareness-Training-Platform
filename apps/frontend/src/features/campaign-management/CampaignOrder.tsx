import {
  getCampaignDraftItemTypeClassName,
  getCampaignDraftItemTypeLabel,
} from './campaignDraftPresentation';
import type {
  CampaignDraftComponentItemState,
  CampaignDraftItemState,
} from './campaignManagement.types';

type CampaignOrderProps = Readonly<{
  items: readonly CampaignDraftItemState[];
  disabled?: boolean;
  onMoveItem: (index: number, direction: -1 | 1) => void;
  onRemoveItem: (index: number) => void;
  onRequiredChange: (index: number, isRequired: boolean) => void;
  onQuizSettingsChange?: (
    index: number,
    patch: Partial<Pick<CampaignDraftComponentItemState, 'maxAttempts' | 'scorePolicy'>>,
  ) => void;
}>;

function CampaignOrder({
  items,
  disabled = false,
  onMoveItem,
  onRemoveItem,
  onRequiredChange,
  onQuizSettingsChange,
}: CampaignOrderProps) {
  return (
    <section className="campaign-order" aria-labelledby="campaign-order-heading">
      <div className="campaign-order__heading">
        <h2 id="campaign-order-heading">Campaign Order</h2>
        <p>Arrange the order in which campaign items are presented.</p>
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
                <article
                  className={`campaign-order-item ${getCampaignDraftItemTypeClassName(item)}`}
                >
                  <span className="campaign-order-item__position">{index + 1}</span>
                  <div>
                    <span className="campaign-item-type">
                      {getCampaignDraftItemTypeLabel(item)}
                    </span>
                    <h3>{item.title}</h3>
                    {item.description && <p>{item.description}</p>}

                    {item.itemType === 'GROUP' && <p>{item.children.length} grouped items</p>}
                    <label className="campaign-order-item__requirement">
                      <span>Requirement for {item.title}</span>
                      <select
                        value={item.isRequired ? 'required' : 'optional'}
                        disabled={disabled}
                        onChange={(event) => {
                          onRequiredChange(index, event.target.value === 'required');
                        }}
                      >
                        <option value="required">Required</option>
                        <option value="optional">Optional</option>
                      </select>
                    </label>
                    {item.itemType === 'COMPONENT' &&
                      item.componentType === 'QUIZ' &&
                      onQuizSettingsChange && (
                        <>
                          <label className="campaign-order-item__requirement">
                            <span>Maximum attempts for {item.title}</span>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              inputMode="numeric"
                              value={item.maxAttempts ?? 1}
                              disabled={disabled}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                if (Number.isInteger(value) && value >= 1) {
                                  onQuizSettingsChange(index, { maxAttempts: value });
                                }
                              }}
                            />
                          </label>
                          <label className="campaign-order-item__requirement">
                            <span>Score policy for {item.title}</span>
                            <select
                              value={item.scorePolicy ?? 'BEST'}
                              disabled={disabled}
                              onChange={(event) => {
                                const value = event.target.value;
                                if (value === 'BEST' || value === 'LATEST' || value === 'AVERAGE') {
                                  onQuizSettingsChange(index, { scorePolicy: value });
                                }
                              }}
                            >
                              <option value="BEST">Best score</option>
                              <option value="LATEST">Latest score</option>
                              <option value="AVERAGE">Average score</option>
                            </select>
                          </label>
                        </>
                      )}
                    {item.itemType === 'COMPONENT' && !item.sourceAvailable && (
                      <p className="campaign-order-item__warning">
                        This source is no longer available.
                      </p>
                    )}
                  </div>
                  <div className="campaign-order-item__controls">
                    <button
                      type="button"
                      aria-label={`Move ${item.title} up`}
                      disabled={disabled || index === 0}
                      onClick={() => onMoveItem(index, -1)}
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${item.title} down`}
                      disabled={disabled || index === items.length - 1}
                      onClick={() => onMoveItem(index, 1)}
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${item.title} from Campaign`}
                      disabled={disabled}
                      onClick={() => onRemoveItem(index)}
                    >
                      Remove
                    </button>
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
