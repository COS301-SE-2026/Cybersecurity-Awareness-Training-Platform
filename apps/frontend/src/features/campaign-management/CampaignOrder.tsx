import {
  getCampaignDraftItemTypeClassName,
  getCampaignDraftItemTypeLabel,
} from './campaignDraftPresentation';
import type {
  CampaignDraftComponentItemState,
  CampaignDraftGroupItemState,
  CampaignDraftItemState,
} from './campaignManagement.types';

type QuizPatch = Partial<Pick<CampaignDraftComponentItemState, 'maxAttempts' | 'scorePolicy'>>;
type GroupPatch = Partial<
  Pick<CampaignDraftGroupItemState, 'title' | 'description' | 'groupType' | 'completionRule'>
>;

function QuizOccurrenceFields({
  item,
  disabled,
  onChange,
}: Readonly<{
  item: CampaignDraftComponentItemState;
  disabled: boolean;
  onChange: (patch: QuizPatch) => void;
}>) {
  if (item.componentType !== 'QUIZ') return null;
  return (
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
            if (Number.isInteger(value) && value >= 1) onChange({ maxAttempts: value });
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
              onChange({ scorePolicy: value });
            }
          }}
        >
          <option value="BEST">Best score</option>
          <option value="LATEST">Latest score</option>
          <option value="AVERAGE">Average score</option>
        </select>
      </label>
    </>
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
                ? (item.campaignItemId ?? item.clientId)
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

                    {item.itemType === 'GROUP' && (
                      <>
                        <p>{item.children.length} grouped items</p>
                        {onGroupChange && (
                          <div className="campaign-group-metadata">
                            <label>
                              <span>Title for {item.title}</span>
                              <input
                                type="text"
                                maxLength={200}
                                value={item.title}
                                disabled={disabled}
                                onChange={(event) =>
                                  onGroupChange(index, { title: event.target.value })
                                }
                              />
                            </label>
                            <label>
                              <span>Description for {item.title}</span>
                              <textarea
                                maxLength={2000}
                                value={item.description ?? ''}
                                disabled={disabled}
                                onChange={(event) =>
                                  onGroupChange(index, { description: event.target.value || null })
                                }
                              />
                            </label>
                            <label>
                              <span>Group type for {item.title}</span>
                              <select
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
                              <span>Completion rule for {item.title}</span>
                              <select
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
                    {item.itemType === 'COMPONENT' && onQuizSettingsChange && (
                      <QuizOccurrenceFields
                        item={item}
                        disabled={disabled}
                        onChange={(patch) => onQuizSettingsChange(index, patch)}
                      />
                    )}
                    {item.itemType === 'GROUP' && onMoveGroupChild && (
                      <ol className="campaign-group-children" aria-label={`Items in ${item.title}`}>
                        {item.children.map((child, childIndex) => (
                          <li
                            key={
                              child.campaignItemId ?? `${child.componentType}:${child.contentId}`
                            }
                            className="campaign-group-child"
                          >
                            <div>
                              <span className="campaign-item-type">
                                {getCampaignDraftItemTypeLabel(child)}
                              </span>
                              <h4>{child.title}</h4>
                              <label className="campaign-order-item__requirement">
                                <span>Requirement for {child.title}</span>
                                <select
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
                              <button
                                type="button"
                                disabled={disabled || childIndex === 0}
                                onClick={() => onMoveGroupChild(index, childIndex, -1)}
                              >
                                Move {child.title} up in group
                              </button>
                              <button
                                type="button"
                                disabled={disabled || childIndex === item.children.length - 1}
                                onClick={() => onMoveGroupChild(index, childIndex, 1)}
                              >
                                Move {child.title} down in group
                              </button>
                              <button
                                type="button"
                                disabled={disabled}
                                onClick={() => onMoveChildOut?.(index, childIndex)}
                              >
                                Move {child.title} out of group
                              </button>
                              <button
                                type="button"
                                disabled={disabled}
                                onClick={() => onRemoveGroupChild?.(index, childIndex)}
                              >
                                Remove {child.title} from Campaign
                              </button>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                    {item.itemType === 'COMPONENT' && !item.sourceAvailable && (
                      <p className="campaign-order-item__warning">
                        This source is no longer available.
                      </p>
                    )}
                  </div>
                  <div className="campaign-order-item__controls">
                    {item.itemType === 'COMPONENT' && onMoveToGroup && (
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
