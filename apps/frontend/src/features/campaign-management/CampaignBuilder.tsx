import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import CampaignCatalogue, { type CampaignCatalogueState } from './CampaignCatalogue';
import CampaignColourField from './CampaignColourField';
import CampaignOrder from './CampaignOrder';
import CampaignReviewSummary from './CampaignReviewSummary';
import type {
  CampaignDraftComponentItemState,
  CampaignDraftFormState,
  CampaignDraftItemState,
  CampaignManagementContext,
} from './campaignManagement.types';
import type { CampaignCatalogueItemDto, CampaignCatalogueQueryDto } from '@insightful-phish/shared';

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
  const isDraftMutationPending = Boolean(isSaving) || isMutationPending;
  const isDraftMutationDisabled = isDraftMutationPending || isMutationLocked;

  const hasScheduleError =
    Boolean(draft.startDate) && Boolean(draft.endDate) && draft.endDate <= draft.startDate;

  const isDirty = !areDraftsEqual(persistedDraft, draft);
  const isSaveDisabled = isDraftMutationDisabled || (requireDirtyToSave && !isDirty);
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
      };
      return {
        ...currentDraft,
        items: [...currentDraft.items, draftItem],
      };
    });
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

  function changeCampaignItemRequirement(index: number, isRequired: boolean) {
    if (isDraftMutationDisabled) {
      return;
    }

    setDraft((currentDraft) => {
      const item = currentDraft.items[index];

      if (!item || item.isRequired === isRequired) {
        return currentDraft;
      }

      const items = [...currentDraft.items];
      items[index] = { ...item, isRequired };

      return { ...currentDraft, items };
    });
  }

  function removeCampaignItem(index: number) {
    if (isDraftMutationDisabled) {
      return;
    }

    setDraft((currentDraft) => {
      if (index < 0 || index >= currentDraft.items.length) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        items: currentDraft.items.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);

    if (isSaveDisabled || !draft.name.trim() || hasScheduleError) {
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

      <CampaignOrder
        items={draft.items}
        disabled={isDraftMutationDisabled}
        onMoveItem={moveCampaignItem}
        onRemoveItem={removeCampaignItem}
        onRequiredChange={changeCampaignItemRequirement}
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
