import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { HelpOutlined } from '@mui/icons-material';

import CampaignCatalogue, { type CampaignCatalogueState } from './CampaignCatalogue';
import AdaptiveCampaignItemEditor from './AdaptiveCampaignItemEditor';
import AiCampaignProposalPanel from './AiCampaignProposalPanel';
import CampaignColourField from './CampaignColourField';
import CampaignOrder from './CampaignOrder';
import CampaignReviewSummary from './CampaignReviewSummary';
import type {
  CampaignDraftComponentItemState,
  CampaignDraftAdaptiveItemState,
  CampaignDraftConsumableItemState,
  CampaignDraftFormState,
  CampaignDraftGroupItemState,
  CampaignDraftItemState,
  CampaignManagementContext,
} from './campaignManagement.types';
import { campaignDraftConsumableKey } from './campaignDraftItems';
import {
  type CampaignCatalogueItemDto,
  type CampaignCatalogueQueryDto,
  type ContentCategoryDto,
  type DifficultyLevelDto,
  type EditableCampaignProposalItemDto,
} from '@insightful-phish/shared';

type CampaignBuilderProps = Readonly<{
  contextKind: CampaignManagementContext['kind'];
  initialDraft: CampaignDraftFormState;
  onDirtyChange?: (isDirty: boolean) => void;
  onRequestDiscard?: () => void;
  onSave?: (draft: CampaignDraftFormState) => void | Promise<void>;
  catalogueState?: CampaignCatalogueState;
  onRetryCatalogue?: () => void;
  isSaving?: boolean;
  isMutationPending?: boolean;
  isMutationLocked?: boolean;
  requireDirtyToSave?: boolean;
  saveButtonText?: string;
  savingButtonText?: string;
  catalogueQuery?: CampaignCatalogueQueryDto;
  onCatalogueSearchChange?: (search: string) => void;
  onCatalogueTypeChange?: (type: CampaignCatalogueQueryDto['type']) => void;
  onCataloguePageChange?: (page: number) => void;
  onRequestAdaptiveVariant?: (
    componentType: CampaignCatalogueItemDto['type'],
    difficulty: DifficultyLevelDto,
    categories: readonly ContentCategoryDto[],
    sourceConcept: Readonly<{ title: string; summary: string | null }>,
  ) => void;
  organisationId?: string;
  onOpenProposalDraft?: (item: EditableCampaignProposalItemDto) => void;
}>;

type AdaptiveEditorLocation = Readonly<{ index?: number; childIndex?: number }>;

function areDraftItemsEqual(
  left: CampaignDraftFormState['items'],
  right: CampaignDraftFormState['items'],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getDraftConsumables(
  items: readonly CampaignDraftItemState[],
): readonly CampaignDraftConsumableItemState[] {
  return items.flatMap((item) => (item.itemType === 'GROUP' ? item.children : [item]));
}

function consumableContentIds(item: CampaignDraftConsumableItemState): readonly string[] {
  return item.itemType === 'COMPONENT'
    ? [item.contentId]
    : [
        item.alternatives.EASY.contentId,
        item.alternatives.MEDIUM.contentId,
        item.alternatives.HARD.contentId,
      ];
}

function areDraftsEqual(left: CampaignDraftFormState, right: CampaignDraftFormState): boolean {
  return (
    left.name === right.name &&
    left.description === right.description &&
    left.accentColor === right.accentColor &&
    left.startDate === right.startDate &&
    left.endDate === right.endDate &&
    areDraftItemsEqual(left.items, right.items)
  );
}

function CampaignBuilder({
  contextKind,
  initialDraft,
  onDirtyChange,
  onRequestDiscard,
  onSave,
  catalogueState,
  catalogueQuery,
  onRetryCatalogue,
  onCatalogueSearchChange,
  onCatalogueTypeChange,
  onCataloguePageChange,
  onRequestAdaptiveVariant,
  organisationId,
  onOpenProposalDraft,
  isSaving,
  isMutationPending = false,
  isMutationLocked = false,
  requireDirtyToSave = false,
  saveButtonText = 'Save Draft',
  savingButtonText = 'Saving...',
}: CampaignBuilderProps) {
  const nameInputId = useId();
  const nameErrorId = `${nameInputId}-error`;
  const adaptiveHelpId = `${nameInputId}-adaptive-help`;
  const onDirtyChangeRef = useRef(onDirtyChange);
  const [persistedDraft] = useState<CampaignDraftFormState>(() => ({
    ...initialDraft,
  }));
  const [draft, setDraft] = useState<CampaignDraftFormState>(() => ({
    ...initialDraft,
  }));
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [groupSetup, setGoupSetup] = useState({
    title: '',
    description: '',
    first: '',
    second: '',
  });
  const [hasAttemptedGroupCreation, setHasAttemptedGroupCreation] = useState(false);
  const [adaptiveEditorLocation, setAdaptiveEditorLocation] =
    useState<AdaptiveEditorLocation | null>(null);
  const isDraftMutationPending = Boolean(isSaving) || isMutationPending;
  const isDraftMutationDisabled = isDraftMutationPending || isMutationLocked;

  const hasScheduleError =
    Boolean(draft.startDate) && Boolean(draft.endDate) && draft.endDate <= draft.startDate;
  const hasInvalidGroup = draft.items.some(
    (item) =>
      item.itemType === 'GROUP' &&
      (item.title.trim().length === 0 ||
        item.title.length > 200 ||
        (item.description?.length ?? 0) > 2000 ||
        item.children.length < 2),
  );
  const topLevelConsumables = draft.items.filter(
    (item): item is CampaignDraftConsumableItemState => item.itemType !== 'GROUP',
  );
  const availableGroupKeys = new Set(topLevelConsumables.map(campaignDraftConsumableKey));

  const hasGroupNameError = hasAttemptedGroupCreation && !groupSetup.title.trim();
  const hasFirstGroupItemError = hasAttemptedGroupCreation && !groupSetup.first;
  const hasSecondGroupItemError = hasAttemptedGroupCreation && !groupSetup.second;
  const isDirty = !areDraftsEqual(persistedDraft, draft);
  const hasDuplicateGroupItemError =
    hasAttemptedGroupCreation &&
    groupSetup.first === groupSetup.second &&
    Boolean(groupSetup.first);
  const isSaveDisabled =
    isDraftMutationDisabled || hasInvalidGroup || (requireDirtyToSave && !isDirty);
  const hasNameError = hasSubmitted && draft.name.trim().length === 0;
  const selectedCatalogueItems = getDraftConsumables(draft.items).flatMap((item) =>
    consumableContentIds(item).map((id) => ({ type: item.componentType, id })),
  );

  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);
  useEffect(() => {
    onDirtyChangeRef.current?.(isDirty);
  }, [isDirty]);

  function updateDraft(patch: Partial<CampaignDraftFormState>) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      ...patch,
    }));
  }

  function addCatalogueItem(item: CampaignCatalogueItemDto) {
    if (isDraftMutationDisabled) {
      return;
    }

    setDraft((currentDraft) => {
      const alreadyAdded = getDraftConsumables(currentDraft.items).some(
        (draftItem) =>
          draftItem.componentType === item.type &&
          consumableContentIds(draftItem).includes(item.id),
      );

      if (alreadyAdded) {
        return currentDraft;
      }

      const draftItem: CampaignDraftComponentItemState = {
        itemType: 'COMPONENT',
        componentType: item.type,
        contentId: item.id,
        title: item.title,
        description: item.description ?? null,
        isRequired: true,
        sourceAvailable: true,
        ...(item.type === 'QUIZ' ? { maxAttempts: 1, scorePolicy: 'BEST' as const } : {}),
      };
      return {
        ...currentDraft,
        items: [...currentDraft.items, draftItem],
      };
    });
  }

  function editAdaptiveItem(index: number, childIndex?: number) {
    if (isDraftMutationDisabled) return;
    setAdaptiveEditorLocation({ index, childIndex });
  }

  function applyAdaptiveItem(adaptiveItem: CampaignDraftAdaptiveItemState) {
    setDraft((currentDraft) => {
      const location = adaptiveEditorLocation;
      if (location?.index === undefined) {
        return {
          ...currentDraft,
          items: [
            ...currentDraft.items,
            { ...adaptiveItem, clientId: adaptiveItem.clientId ?? crypto.randomUUID() },
          ],
        };
      }

      const items = [...currentDraft.items];
      const existing = items[location.index];
      if (location.childIndex === undefined) {
        if (existing?.itemType !== 'ADAPTIVE') return currentDraft;
        items[location.index] = adaptiveItem;
      } else {
        if (existing?.itemType !== 'GROUP') return currentDraft;
        const child = existing.children[location.childIndex];
        if (child?.itemType !== 'ADAPTIVE') return currentDraft;
        const children = [...existing.children];
        children[location.childIndex] = adaptiveItem;
        items[location.index] = { ...existing, children };
      }
      return { ...currentDraft, items };
    });
    setAdaptiveEditorLocation(null);
  }

  const adaptiveEditorItem = (() => {
    if (adaptiveEditorLocation?.index === undefined) return undefined;
    const item = draft.items[adaptiveEditorLocation.index];
    const candidate =
      adaptiveEditorLocation.childIndex === undefined
        ? item
        : item?.itemType === 'GROUP'
          ? item.children[adaptiveEditorLocation.childIndex]
          : undefined;
    return candidate?.itemType === 'ADAPTIVE' ? candidate : undefined;
  })();

  function createGroup() {
    setHasAttemptedGroupCreation(true);
    const title = groupSetup.title.trim();
    if (
      isDraftMutationDisabled ||
      !title ||
      title.length > 200 ||
      !groupSetup.first ||
      !groupSetup.second ||
      groupSetup.first === groupSetup.second ||
      !availableGroupKeys.has(groupSetup.first) ||
      !availableGroupKeys.has(groupSetup.second)
    ) {
      return;
    }

    setDraft((currentDraft) => {
      const selectedIndexes = [groupSetup.first, groupSetup.second]
        .map((key) =>
          currentDraft.items.findIndex(
            (item) => item.itemType !== 'GROUP' && campaignDraftConsumableKey(item) === key,
          ),
        )
        .sort((left, right) => left - right);
      const [firstIndex, secondIndex] = selectedIndexes;
      if (
        firstIndex === undefined ||
        secondIndex === undefined ||
        firstIndex < 0 ||
        secondIndex < 0 ||
        firstIndex === secondIndex
      ) {
        return currentDraft;
      }

      const first = currentDraft.items[firstIndex];
      const second = currentDraft.items[secondIndex];
      if (first?.itemType === 'GROUP' || second?.itemType === 'GROUP' || !first || !second) {
        return currentDraft;
      }

      const group: CampaignDraftGroupItemState = {
        itemType: 'GROUP',
        clientId: crypto.randomUUID(),
        title,
        description: groupSetup.description.trim() || null,
        groupType: 'MODULE',
        completionRule: 'COMPLETE_ALL',
        isRequired: true,
        children: [first, second],
      };
      const items = currentDraft.items.filter(
        (_, index) => index !== firstIndex && index !== secondIndex,
      );
      items.splice(firstIndex, 0, group);
      return { ...currentDraft, items };
    });
    setGoupSetup({ title: '', description: '', first: '', second: '' });
    setHasAttemptedGroupCreation(false);
  }

  function moveCampaignItem(index: number, direction: -1 | 1) {
    if (isDraftMutationDisabled) {
      return;
    }

    setDraft((currentDraft) => {
      const destination = index + direction;

      if (
        index < 0 ||
        index >= currentDraft.items.length ||
        destination < 0 ||
        destination >= currentDraft.items.length
      ) {
        return currentDraft;
      }
      const items = [...currentDraft.items];
      const [movedItem] = items.splice(index, 1);

      if (!movedItem) {
        return currentDraft;
      }

      items.splice(destination, 0, movedItem);
      return {
        ...currentDraft,
        items,
      };
    });
  }

  function changeCampaignItemRequirement(index: number, isRequired: boolean, childIndex?: number) {
    if (isDraftMutationDisabled) {
      return;
    }

    setDraft((currentDraft) => {
      const item = currentDraft.items[index];
      if (!item) {
        return currentDraft;
      }
      const items = [...currentDraft.items];

      if (childIndex === undefined) {
        if (item.isRequired === isRequired) return currentDraft;
        items[index] = { ...item, isRequired };
      } else {
        if (item.itemType !== 'GROUP' || !item.children[childIndex]) return currentDraft;
        const children = [...item.children];
        children[childIndex] = { ...children[childIndex], isRequired };
        items[index] = { ...item, children };
      }
      return { ...currentDraft, items };
    });
  }

  function changeQuizOccurrence(
    index: number,
    patch: Partial<Pick<CampaignDraftConsumableItemState, 'maxAttempts' | 'scorePolicy'>>,
    childIndex?: number,
  ) {
    if (isDraftMutationDisabled) return;

    setDraft((currentDraft) => {
      const item = currentDraft.items[index];
      if (!item) {
        return currentDraft;
      }
      const items = [...currentDraft.items];

      if (childIndex === undefined) {
        if (item.itemType === 'GROUP' || item.componentType !== 'QUIZ') {
          return currentDraft;
        }
        items[index] = { ...item, ...patch };
      } else {
        if (item.itemType !== 'GROUP') return currentDraft;
        const child = item.children[childIndex];
        if (!child || child.componentType !== 'QUIZ') return currentDraft;
        const children = [...item.children];
        children[childIndex] = { ...child, ...patch };
        items[index] = { ...item, children };
      }
      return { ...currentDraft, items };
    });
  }

  function changeGroup(
    index: number,
    patch: Partial<
      Pick<CampaignDraftGroupItemState, 'title' | 'description' | 'groupType' | 'completionRule'>
    >,
  ) {
    if (isDraftMutationDisabled) return;
    setDraft((currentDraft) => {
      const item = currentDraft.items[index];
      if (item?.itemType !== 'GROUP') return currentDraft;
      const items = [...currentDraft.items];
      items[index] = { ...item, ...patch };
      return { ...currentDraft, items };
    });
  }

  function moveToGroup(sourceIndex: number, groupIndex: number) {
    if (isDraftMutationDisabled || sourceIndex === groupIndex) return;
    setDraft((currentDraft) => {
      const source = currentDraft.items[sourceIndex];
      const group = currentDraft.items[groupIndex];
      if (!source || source.itemType === 'GROUP' || group?.itemType !== 'GROUP') {
        return currentDraft;
      }
      const items = currentDraft.items.flatMap((item, index) => {
        if (index === sourceIndex) return [];
        if (index === groupIndex) {
          return [{ ...group, children: [...group.children, source] }];
        }
        return [item];
      });
      return { ...currentDraft, items };
    });
  }

  function moveGroupChild(groupIndex: number, childIndex: number, direction: -1 | 1) {
    if (isDraftMutationDisabled) return;
    setDraft((currentDraft) => {
      const group = currentDraft.items[groupIndex];
      if (group?.itemType !== 'GROUP') return currentDraft;
      const destination = childIndex + direction;
      if (childIndex < 0 || destination < 0 || destination >= group.children.length) {
        return currentDraft;
      }
      const children = [...group.children];
      const [child] = children.splice(childIndex, 1);
      if (!child) return currentDraft;
      children.splice(destination, 0, child);
      const items = [...currentDraft.items];
      items[groupIndex] = { ...group, children };
      return { ...currentDraft, items };
    });
  }

  function moveChildOut(groupIndex: number, childIndex: number) {
    if (isDraftMutationDisabled) return;
    setDraft((currentDraft) => {
      const group = currentDraft.items[groupIndex];
      if (group?.itemType !== 'GROUP') return currentDraft;
      const child = group.children[childIndex];
      if (!child) return currentDraft;
      const remaining = group.children.filter((_, index) => index !== childIndex);
      const replacement: CampaignDraftItemState[] =
        remaining.length >= 2 ? [{ ...group, children: remaining }, child] : [...group.children];
      return {
        ...currentDraft,
        items: currentDraft.items.flatMap((item, index) =>
          index === groupIndex ? replacement : [item],
        ),
      };
    });
  }

  function removeGroupChild(groupIndex: number, childIndex: number) {
    if (isDraftMutationDisabled) return;
    setDraft((currentDraft) => {
      const group = currentDraft.items[groupIndex];
      if (group?.itemType !== 'GROUP' || !group.children[childIndex]) {
        return currentDraft;
      }
      const remaining = group.children.filter((_, index) => index !== childIndex);
      const replacement: CampaignDraftItemState[] =
        remaining.length >= 2 ? [{ ...group, children: remaining }] : [...remaining];
      return {
        ...currentDraft,
        items: currentDraft.items.flatMap((item, index) =>
          index === groupIndex ? replacement : [item],
        ),
      };
    });
  }

  function removeCampaignItem(index: number) {
    if (isDraftMutationDisabled) {
      return;
    }

    setDraft((currentDraft) => {
      const item = currentDraft.items[index];
      if (!item) return currentDraft;

      return {
        ...currentDraft,
        items: currentDraft.items.flatMap((candidate, itemIndex) =>
          itemIndex === index
            ? candidate.itemType === 'GROUP'
              ? [...candidate.children]
              : []
            : [candidate],
        ),
      };
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);

    if (isSaveDisabled || !draft.name.trim() || hasScheduleError || hasInvalidGroup) {
      return;
    }

    void onSave?.(draft);
  }

  return (
    <form
      className="campaign-builder"
      aria-label="Campaign details"
      aria-busy={isDraftMutationPending}
      noValidate
      onSubmit={handleSubmit}
    >
      <section className="campaign-builder-details" aria-labelledby="campaign-details-heading">
        <h2 id="campaign-details-heading">Campaign details</h2>
        <div className="campaign-form-field">
          <label htmlFor={nameInputId}>Campaign name</label>
          <input
            id={nameInputId}
            name="campaign-name"
            type="text"
            required
            disabled={isDraftMutationDisabled}
            maxLength={200}
            value={draft.name}
            aria-invalid={hasNameError}
            aria-describedby={hasNameError ? nameErrorId : undefined}
            onChange={(event) => {
              updateDraft({
                name: event.target.value,
              });
            }}
          />

          {hasNameError && (
            <p id={nameErrorId} className="campaign-form-error" role="alert">
              Please enter a Campaign name.
            </p>
          )}
        </div>

        <div className="campaign-form-field">
          <label htmlFor="campaign-description">Description</label>
          <textarea
            id="campaign-description"
            name="campaign-description"
            maxLength={2000}
            rows={6}
            value={draft.description}
            disabled={isDraftMutationDisabled}
            onChange={(event) => {
              updateDraft({
                description: event.target.value,
              });
            }}
          />
        </div>
        <CampaignColourField
          value={draft.accentColor}
          disabled={isDraftMutationDisabled}
          onChange={(accentColor) => {
            updateDraft({ accentColor });
          }}
        />

        {contextKind === 'organisation' && (
          <fieldset className="campaign-schedule">
            <legend>Organisation schedule</legend>

            <div className="campaign-schedule__fields">
              <div className="campaign-form-field">
                <label htmlFor="campaign-start-date">Start date and time</label>
                <input
                  id="campaign-start-date"
                  name="campaign-start-date"
                  type="datetime-local"
                  disabled={isDraftMutationDisabled}
                  value={draft.startDate}
                  onChange={(event) => {
                    updateDraft({
                      startDate: event.target.value,
                    });
                  }}
                />
              </div>

              <div className="campaign-form-field">
                <label htmlFor="campaign-end-date">End date and time</label>
                <input
                  id="campaign-end-date"
                  name="campaign-end-date"
                  type="datetime-local"
                  disabled={isDraftMutationDisabled}
                  value={draft.endDate}
                  aria-invalid={hasScheduleError}
                  aria-describedby={hasScheduleError ? 'campaign-end-date-error' : undefined}
                  onChange={(event) => {
                    updateDraft({
                      endDate: event.target.value,
                    });
                  }}
                />

                {hasScheduleError && (
                  <p id="campaign-end-date-error" className="campaign-form-error" role="alert">
                    End date and time must be after the start date and time.
                  </p>
                )}
              </div>
            </div>
          </fieldset>
        )}
      </section>
      {contextKind === 'organisation' &&
        organisationId &&
        catalogueState &&
        onOpenProposalDraft && (
          <AiCampaignProposalPanel
            organisationId={organisationId}
            catalogueState={catalogueState}
            disabled={isDraftMutationDisabled}
            onAddEligibleContent={addCatalogueItem}
            onOpenGeneratedDraft={onOpenProposalDraft}
          />
        )}
      {catalogueState &&
        catalogueQuery &&
        onRetryCatalogue &&
        onCatalogueSearchChange &&
        onCatalogueTypeChange &&
        onCataloguePageChange && (
          <CampaignCatalogue
            state={catalogueState}
            query={catalogueQuery}
            selectedItems={selectedCatalogueItems}
            disabled={isDraftMutationDisabled}
            onSelectItem={addCatalogueItem}
            onRetry={onRetryCatalogue}
            onSearchChange={onCatalogueSearchChange}
            onTypeChange={onCatalogueTypeChange}
            onPageChange={onCataloguePageChange}
          />
        )}
      {catalogueState && adaptiveEditorLocation === null && (
        <div className="campaign-adaptive-trigger">
          <button
            type="button"
            className="campaign-button campaign-button--primary campaign-adaptive-trigger__button"
            disabled={isDraftMutationDisabled}
            onClick={() => setAdaptiveEditorLocation({})}
          >
            Add adaptive item
          </button>
          <div className="campaign-adaptive-help">
            <button
              type="button"
              className="campaign-adaptive-help__trigger"
              aria-label="What is an adaptive item?"
              aria-describedby={adaptiveHelpId}
            >
              <HelpOutlined aria-hidden="true" fontSize="small" />
            </button>
            <span id={adaptiveHelpId} className="campaign-adaptive-help__tooltip" role="tooltip">
              One Campaign item with Easy, Medium, and Hard alternatives. Each trainee receives one
              alternative based on their relevant training needs.
            </span>
          </div>
        </div>
      )}
      {catalogueState && adaptiveEditorLocation !== null && (
        <AdaptiveCampaignItemEditor
          key={
            adaptiveEditorItem
              ? campaignDraftConsumableKey(adaptiveEditorItem)
              : 'new-adaptive-item'
          }
          catalogueState={catalogueState}
          initialItem={adaptiveEditorItem}
          disabled={isDraftMutationDisabled}
          onRequestAiVariant={onRequestAdaptiveVariant}
          onCancel={() => setAdaptiveEditorLocation(null)}
          onSubmit={applyAdaptiveItem}
        />
      )}
      <fieldset className="campaign-group-setup" disabled={isDraftMutationDisabled}>
        <legend>Create a group</legend>
        <p>Choose two items to start a group.</p>
        <label>
          <span>
            Group name <span aria-hidden="true">*</span>
          </span>
          <input
            aria-invalid={hasGroupNameError}
            aria-describedby={hasGroupNameError ? 'campaign-group-name-error' : undefined}
            type="text"
            maxLength={200}
            value={groupSetup.title}
            onChange={(event) =>
              setGoupSetup((current) => ({ ...current, title: event.target.value }))
            }
          />
        </label>
        {hasGroupNameError && (
          <p id="campaign-group-name-error" className="campaign-form-error" role="alert">
            Enter a group name.
          </p>
        )}
        <label>
          <span>Description (optional)</span>
          <textarea
            maxLength={2000}
            rows={3}
            value={groupSetup.description}
            onChange={(event) =>
              setGoupSetup((current) => ({ ...current, description: event.target.value }))
            }
          />
        </label>
        <div className="campaign-group-setup__selectors">
          <div className="campaign-group-setup__selector">
            <label>
              <span>Item 1</span>
              <select
                aria-invalid={hasFirstGroupItemError || hasDuplicateGroupItemError}
                aria-describedby={
                  hasFirstGroupItemError
                    ? 'campaign-group-first-error'
                    : hasDuplicateGroupItemError
                      ? 'campaign-group-distinct-error'
                      : undefined
                }
                value={groupSetup.first}
                onChange={(event) =>
                  setGoupSetup((current) => ({ ...current, first: event.target.value }))
                }
              >
                <option value="">Select an item</option>
                {topLevelConsumables.map((item) => (
                  <option
                    key={campaignDraftConsumableKey(item)}
                    value={campaignDraftConsumableKey(item)}
                  >
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            {hasFirstGroupItemError && (
              <p id="campaign-group-first-error" className="campaign-form-error" role="alert">
                Select Item 1.
              </p>
            )}
          </div>
          <div className="campaign-group-setup__selector">
            <label>
              <span>Item 2</span>
              <select
                aria-invalid={hasSecondGroupItemError || hasDuplicateGroupItemError}
                aria-describedby={
                  hasSecondGroupItemError
                    ? 'campaign-group-second-error'
                    : hasDuplicateGroupItemError
                      ? 'campaign-group-distinct-error'
                      : undefined
                }
                value={groupSetup.second}
                onChange={(event) =>
                  setGoupSetup((current) => ({ ...current, second: event.target.value }))
                }
              >
                <option value="">Select an item</option>
                {topLevelConsumables.map((item) => (
                  <option
                    key={campaignDraftConsumableKey(item)}
                    value={campaignDraftConsumableKey(item)}
                  >
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            {hasSecondGroupItemError && (
              <p id="campaign-group-second-error" className="campaign-form-error" role="alert">
                Select Item 2.
              </p>
            )}
          </div>
        </div>
        {hasDuplicateGroupItemError && (
          <p id="campaign-group-distinct-error" className="campaign-form-error" role="alert">
            Item 1 and Item 2 must be different.
          </p>
        )}
        <button
          type="button"
          disabled={
            isDraftMutationDisabled ||
            topLevelConsumables.length < 2 ||
            (Boolean(groupSetup.first) && !availableGroupKeys.has(groupSetup.first)) ||
            (Boolean(groupSetup.second) && !availableGroupKeys.has(groupSetup.second))
          }
          onClick={createGroup}
        >
          Create a group
        </button>
      </fieldset>
      <CampaignOrder
        items={draft.items}
        disabled={isDraftMutationDisabled}
        onMoveItem={moveCampaignItem}
        onRemoveItem={removeCampaignItem}
        onRequiredChange={changeCampaignItemRequirement}
        onQuizSettingsChange={changeQuizOccurrence}
        onGroupChange={changeGroup}
        onMoveToGroup={moveToGroup}
        onMoveGroupChild={moveGroupChild}
        onMoveChildOut={moveChildOut}
        onRemoveGroupChild={removeGroupChild}
        onEditAdaptive={editAdaptiveItem}
      />

      <CampaignReviewSummary contextKind={contextKind} draft={draft} />

      <div className="campaign-builder__actions">
        <button
          type="button"
          className="campaign-button campaign-button--danger"
          disabled={!isDirty || isDraftMutationPending}
          onClick={() => {
            onRequestDiscard?.();
          }}
        >
          Discard Changes
        </button>

        {onSave && (
          <button
            type="submit"
            className="campaign-button campaign-button--primary"
            disabled={isSaveDisabled}
          >
            {isSaving ? savingButtonText : saveButtonText}
          </button>
        )}
      </div>
    </form>
  );
}

export default CampaignBuilder;
