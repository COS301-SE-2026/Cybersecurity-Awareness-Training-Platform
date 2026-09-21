import {
  getCampaignDraftItemTypeClassName,
  getCampaignDraftItemTypeLabel,
} from './campaignDraftPresentation';
import type {
  CampaignDraftConsumableItemState,
  CampaignDraftGroupItemState,
  CampaignDraftItemState,
} from './campaignManagement.types';
import { campaignDraftConsumableKey } from './campaignDraftItems';

type QuizPatch = Partial<Pick<CampaignDraftConsumableItemState, 'maxAttempts' | 'scorePolicy'>>;
type GroupPatch = Partial<
  Pick<CampaignDraftGroupItemState, 'title' | 'description' | 'groupType' | 'completionRule'>
>;

function QuizOccurrenceFields({
  item,
  disabled,
  onChange,
}: Readonly<{
  item: CampaignDraftConsumableItemState;
  disabled: boolean;
  onChange: (patch: QuizPatch) => void;
}>) {
  if (item.componentType !== 'QUIZ') return null;
  return (
    <div className="campaign-quiz-settings">
      <label className="campaign-order-item__requirement">
        <span>Attempt limit</span>
        <input
          aria-label={`Attempt limit for ${item.title}`}
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={item.maxAttempts ?? 1}
          disabled={disabled}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isInteger(value) && value >= 1) onChange({ maxAttempts: value });
          }}
        />
      </label>
      <label className="campaign-order-item__requirement">
        <span>Scoring</span>
        <select
          aria-label={`Scoring for ${item.title}`}
          value={item.scorePolicy ?? 'BEST'}
          disabled={disabled}
          onChange={(event) => {
            const value = event.target.value;
            if (value === 'BEST' || value === 'LATEST' || value === 'AVERAGE') {
              onChange({ scorePolicy: value });
            }
          }}
        >
          <option value="BEST">Best score</option>
          <option value="LATEST">Latest score</option>
          <option value="AVERAGE">Average score</option>
        </select>
      </label>
    </div>
  );
}

type CampaignOrderProps = Readonly<{
  items: readonly CampaignDraftItemState[];
  disabled?: boolean;
  onMoveItem: (index: number, direction: -1 | 1) => void;
  onRemoveItem: (index: number) => void;
  onRequiredChange: (index: number, isRequired: boolean, childIndex?: number) => void;
  onQuizSettingsChange?: (index: number, patch: QuizPatch, childIndex?: number) => void;
  onGroupChange?: (index: number, patch: GroupPatch) => void;
  onMoveToGroup?: (sourceIndex: number, groupIndex: number) => void;
  onMoveGroupChild?: (groupIndex: number, childIndex: number, direction: -1 | 1) => void;
  onMoveChildOut?: (groupIndex: number, childIndex: number) => void;
  onRemoveGroupChild?: (groupIndex: number, childIndex: number) => void;
  onEditAdaptive?: (index: number, childIndex?: number) => void;
}>;

function CampaignOrder({
  items,
  disabled = false,
  onMoveItem,
  onRemoveItem,
  onRequiredChange,
  onQuizSettingsChange,
  onGroupChange,
  onMoveToGroup,
  onMoveGroupChild,
  onMoveChildOut,
  onRemoveGroupChild,
  onEditAdaptive,
}: CampaignOrderProps) {
  return (
    <section className="campaign-order" aria-labelledby="campaign-order-heading">
      <div className="campaign-order__heading">
        <h2 id="campaign-order-heading">Campaign structure</h2>
        <p>Arrange how items appear in this campaign.</p>
      </div>

      {items.length === 0 ? (
        <p className="campaign-order__empty">No content has been added yet.</p>
      ) : (
        <ol className="campaign-order__items">
          {items.map((item, index) => {
            const key =
              item.itemType === 'GROUP'
                ? (item.campaignItemId ?? item.clientId)
                : campaignDraftConsumableKey(item);

            return (
              <li key={key}>
                <article
                  className={`campaign-order-item ${getCampaignDraftItemTypeClassName(item)}`}
                >
                  <span className="campaign-order-item__position">{index + 1}</span>
                  <div className="campaign-order-item__body">
                    <span className="campaign-item-type">
                      {getCampaignDraftItemTypeLabel(item)}
                    </span>
                    <h3>{item.title}</h3>
                    {item.description && item.description !== item.title && (
                      <p>{item.description}</p>
                    )}

                    {item.itemType === 'GROUP' && (
                      <>
                        <p className="campaign-group-count">{item.children.length} items</p>
                        {onGroupChange && (
                          <div className="campaign-group-metadata">
                            <label>
                              <span>Group name</span>
                              <input
                                aria-label={`Group name for ${item.title}`}
                                type="text"
                                maxLength={200}
                                value={item.title}
                                disabled={disabled}
                                onChange={(event) =>
                                  onGroupChange(index, { title: event.target.value })
                                }
                              />
                            </label>
                            <label className="campaign-group-metadata__description">
                              <span>Description</span>
                              <textarea
                                aria-label={`Description for ${item.title}`}
                                maxLength={2000}
                                value={item.description ?? ''}
                                disabled={disabled}
                                onChange={(event) =>
                                  onGroupChange(index, { description: event.target.value || null })
                                }
                              />
                            </label>
                            <label>
                              <span>Group type</span>
                              <select
                                aria-label={`Group type for ${item.title}`}
                                value={item.groupType}
                                disabled={disabled}
                                onChange={(event) =>
                                  onGroupChange(index, {
                                    groupType: event.target
                                      .value as CampaignDraftGroupItemState['groupType'],
                                  })
                                }
                              >
                                <option value="SECTION">Section</option>
                                <option value="MODULE">Module</option>
                                <option value="REVISION_SET">Revision set</option>
                                <option value="ASSESSMENT_SET">Assessment set</option>
                                <option value="SIMULATION_SET">Simulation set</option>
                              </select>
                            </label>
                            <label>
                              <span>Completion rule</span>
                              <select
                                aria-label={`Completion rule for ${item.title}`}
                                value={item.completionRule}
                                disabled={disabled}
                                onChange={(event) =>
                                  onGroupChange(index, {
                                    completionRule: event.target
                                      .value as CampaignDraftGroupItemState['completionRule'],
                                  })
                                }
                              >
                                <option value="COMPLETE_ALL">Complete all</option>
                                <option value="COMPLETE_ANY">Complete any</option>
                                <option value="COMPLETE_REQUIRED_ONLY">
                                  Complete required only
                                </option>
                              </select>
                            </label>
                          </div>
                        )}
                      </>
                    )}
                    <div className="campaign-order-item__settings">
                      <label className="campaign-order-item__requirement">
                        <span>Requirement</span>
                        <select
                          aria-label={`Requirement for ${item.title}`}
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
                      {item.itemType !== 'GROUP' && onQuizSettingsChange && (
                        <QuizOccurrenceFields
                          item={item}
                          disabled={disabled}
                          onChange={(patch) => onQuizSettingsChange(index, patch)}
                        />
                      )}
                    </div>
                    {item.itemType === 'GROUP' && onMoveGroupChild && (
                      <ol className="campaign-group-children" aria-label={`Items in ${item.title}`}>
                        {item.children.map((child, childIndex) => (
                          <li
                            key={campaignDraftConsumableKey(child)}
                            className="campaign-group-child"
                          >
                            <div>
                              <span className="campaign-item-type">
                                {getCampaignDraftItemTypeLabel(child)}
                              </span>
                              <h4>{child.title}</h4>
                              <label className="campaign-order-item__requirement">
                                <span>Required</span>
                                <select
                                  aria-label={`Requirement for ${child.title}`}
                                  value={child.isRequired ? 'required' : 'optional'}
                                  disabled={disabled}
                                  onChange={(event) =>
                                    onRequiredChange(
                                      index,
                                      event.target.value === 'required',
                                      childIndex,
                                    )
                                  }
                                >
                                  <option value="required">Required</option>
                                  <option value="optional">Optional</option>
                                </select>
                              </label>
                              {onQuizSettingsChange && (
                                <QuizOccurrenceFields
                                  item={child}
                                  disabled={disabled}
                                  onChange={(patch) =>
                                    onQuizSettingsChange(index, patch, childIndex)
                                  }
                                />
                              )}
                              {!child.sourceAvailable && (
                                <p className="campaign-order-item__warning">
                                  This source is no longer available.
                                </p>
                              )}
                            </div>
                            <div className="campaign-order-item__controls">
                              {child.itemType === 'ADAPTIVE' && onEditAdaptive && (
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => onEditAdaptive(index, childIndex)}
                                >
                                  Edit adaptive item
                                </button>
                              )}
                              <button
                                type="button"
                                aria-label={`Move ${child.title} up in group`}
                                title="Move up"
                                disabled={disabled || childIndex === 0}
                                onClick={() => onMoveGroupChild(index, childIndex, -1)}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                aria-label={`Move ${child.title} down in group`}
                                title="Move down"
                                disabled={disabled || childIndex === item.children.length - 1}
                                onClick={() => onMoveGroupChild(index, childIndex, 1)}
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                aria-label={`Move ${child.title} out of group`}
                                disabled={disabled}
                                onClick={() => onMoveChildOut?.(index, childIndex)}
                              >
                                Move out
                              </button>
                              <button
                                type="button"
                                aria-label={`Remove ${child.title} from Campaign`}
                                disabled={disabled}
                                onClick={() => onRemoveGroupChild?.(index, childIndex)}
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                    {item.itemType !== 'GROUP' && !item.sourceAvailable && (
                      <p className="campaign-order-item__warning">
                        This source is no longer available.
                      </p>
                    )}
                  </div>
                  <div className="campaign-order-item__controls">
                    {item.itemType !== 'GROUP' && onMoveToGroup && (
                      <label>
                        <span>Move {item.title} to group</span>
                        <select
                          value=""
                          disabled={
                            disabled || !items.some((canditate) => canditate.itemType === 'GROUP')
                          }
                          onChange={(event) => {
                            if (event.target.value === '') return;
                            const groupIndex = Number(event.target.value);
                            if (Number.isInteger(groupIndex)) onMoveToGroup(index, groupIndex);
                          }}
                        >
                          <option value="">Choose group</option>
                          {items.map((candidate, groupIndex) =>
                            candidate.itemType === 'GROUP' ? (
                              <option
                                key={candidate.campaignItemId ?? groupIndex}
                                value={groupIndex}
                              >
                                {candidate.title}
                              </option>
                            ) : null,
                          )}
                        </select>
                      </label>
                    )}
                    {item.itemType === 'ADAPTIVE' && onEditAdaptive && (
                      <button
                        type="button"
                        className="campaign-button campaign-button--secondary campaign-order-action--edit"
                        disabled={disabled}
                        onClick={() => onEditAdaptive(index)}
                      >
                        Edit adaptive item
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Move ${item.title} up`}
                      title="Move up"
                      disabled={disabled || index === 0}
                      onClick={() => onMoveItem(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${item.title} down`}
                      title="Move down"
                      disabled={disabled || index === items.length - 1}
                      onClick={() => onMoveItem(index, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="campaign-order-action--danger"
                      aria-label={
                        item.itemType === 'GROUP'
                          ? `Ungroup ${item.title}`
                          : `Remove ${item.title} from Campaign`
                      }
                      disabled={disabled}
                      onClick={() => onRemoveItem(index)}
                    >
                      {item.itemType === 'GROUP' ? 'Ungroup' : 'Remove'}
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
