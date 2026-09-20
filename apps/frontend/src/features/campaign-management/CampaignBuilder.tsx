import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import CampaignCatalogue, { type CampaignCatalogueState } from './CampaignCatalogue';
import CampaignColourField from './CampaignColourField';
import CampaignOrder from './CampaignOrder';
import CampaignReviewSummary from './CampaignReviewSummary';
import type {
  CampaignDraftComponentItemState,
  CampaignDraftFormState,
  CampaignDraftGroupItemState,
  CampaignDraftItemState,
  CampaignManagementContext,
} from './campaignManagement.types';
import {
  type CampaignCatalogueItemDto,
  type CampaignCatalogueQueryDto,
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
}>;

function componentKey(item: CampaignDraftComponentItemState): string {
  return `${item.componentType}:${item.contentId}`;
}

function areDraftItemsEqual(
  left: CampaignDraftFormState['items'],
  right: CampaignDraftFormState['items'],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getDraftComponents(
  items: readonly CampaignDraftItemState[],
): readonly CampaignDraftComponentItemState[] {
  return items.flatMap((item) => (item.itemType === 'GROUP' ? item.children : [item]));
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
  isSaving,
  isMutationPending = false,
  isMutationLocked = false,
  requireDirtyToSave = false,
  saveButtonText = 'Save Draft',
  savingButtonText = 'Saving...',
}: CampaignBuilderProps) {
  const nameInputId = useId();
  const nameErrorId = `${nameInputId}-error`;
  const onDirtyChangeRef = useRef(onDirtyChange);
  const [persistedDraft] = useState<CampaignDraftFormState>(() => ({
    ...initialDraft,
  }));
  const [draft, setDraft] = useState<CampaignDraftFormState>(() => ({
    ...initialDraft,
  }));
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [groupSetup, setGoupSetup] = useState({ title: '', first: '', second: '' });
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
  const topLevelComponents = draft.items.filter(
    (item): item is CampaignDraftComponentItemState => item.itemType === 'COMPONENT',
  );
  const availableGroupKeys = new Set(topLevelComponents.map(componentKey));

  const isDirty = !areDraftsEqual(persistedDraft, draft);
  const isSaveDisabled =
    isDraftMutationDisabled || hasInvalidGroup || (requireDirtyToSave && !isDirty);
  const hasNameError = hasSubmitted && draft.name.trim().length === 0;
  const selectedCatalogueItems = getDraftComponents(draft.items).map((item) => ({
    type: item.componentType,
    id: item.contentId,
  }));

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
      const alreadyAdded = getDraftComponents(currentDraft.items).some(
        (draftItem) => draftItem.componentType === item.type && draftItem.contentId === item.id,
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

  function createGroup() {
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
            (item) => item.itemType === 'COMPONENT' && componentKey(item) === key,
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
      if (first?.itemType !== 'COMPONENT' || second?.itemType !== 'COMPONENT') {
        return currentDraft;
      }

      const group: CampaignDraftGroupItemState = {
        itemType: 'GROUP',
        clientId: crypto.randomUUID(),
        title,
        description: null,
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
    setGoupSetup({ title: '', first: '', second: '' });
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
    patch: Partial<Pick<CampaignDraftComponentItemState, 'maxAttempts' | 'scorePolicy'>>,
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
        if (item.itemType !== 'COMPONENT' || item.componentType !== 'QUIZ') {
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
      if (source?.itemType !== 'COMPONENT' || group?.itemType !== 'GROUP') {
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

      <fieldset className="campaign-group-setup" disabled={isDraftMutationDisabled}>
        <legend>Create group</legend>
        <p>Select two Campaign items to start a group. You can add more items afterward.</p>
        <label>
          <span>Group title</span>
          <input
            type="text"
            maxLength={200}
            value={groupSetup.title}
            onChange={(event) =>
              setGoupSetup((current) => ({ ...current, title: event.target.value }))
            }
          />
        </label>
        <label>
          <span>First item</span>
          <select
            value={groupSetup.first}
            onChange={(event) =>
              setGoupSetup((current) => ({ ...current, first: event.target.value }))
            }
          >
            <option value="">Select an item</option>
            {topLevelComponents.map((item) => (
              <option key={componentKey(item)} value={componentKey(item)}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Second item</span>
          <select
            value={groupSetup.second}
            onChange={(event) =>
              setGoupSetup((current) => ({ ...current, second: event.target.value }))
            }
          >
            <option value="">Select an item</option>
            {topLevelComponents.map((item) => (
              <option key={componentKey(item)} value={componentKey(item)}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={
            isDraftMutationDisabled ||
            topLevelComponents.length < 2 ||
            !groupSetup.title.trim() ||
            !groupSetup.first ||
            !groupSetup.second ||
            groupSetup.first === groupSetup.second ||
            !availableGroupKeys.has(groupSetup.first) ||
            !availableGroupKeys.has(groupSetup.second)
          }
          onClick={createGroup}
        >
          Create group
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
      />
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

      <CampaignReviewSummary contextKind={contextKind} draft={draft} />

      <div className="campaign-builder__actions">
        <button
          type="button"
          className="campaign-builder__discard"
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
