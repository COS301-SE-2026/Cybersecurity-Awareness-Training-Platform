import { useState } from 'react';
import type { CampaignCatalogueItemDto, ContentCategoryDto } from '@insightful-phish/shared';

import type { CampaignCatalogueState } from './CampaignCatalogue';
import type { CampaignDraftAdaptiveItemState } from './campaignManagement.types';

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
const TYPE_LABELS: Record<CampaignCatalogueItemDto['type'], string> = {
  TRAINING_DOCUMENT: 'Training Document',
  QUIZ: 'Quiz',
  SIMULATED_INBOX: 'Simulated Inbox',
};

type Difficulty = (typeof DIFFICULTIES)[number];
type AlternativeSelection = {
  contentId: string;
  title: string;
  categories: readonly ContentCategoryDto[];
};

type AdaptiveCampaignItemEditorProps = Readonly<{
  catalogueState: CampaignCatalogueState;
  initialItem?: CampaignDraftAdaptiveItemState;
  disabled?: boolean;
  onCancel: () => void;
  onSubmit: (item: CampaignDraftAdaptiveItemState) => void;
  onRequestAiVariant?: (
    componentType: CampaignCatalogueItemDto['type'],
    difficulty: Difficulty,
    categories: readonly ContentCategoryDto[],
  ) => void;
}>;

function findCatalogueItem(
  catalogueState: CampaignCatalogueState,
  contentId: string,
): CampaignCatalogueItemDto | undefined {
  return catalogueState.status === 'loaded'
    ? catalogueState.items.find((item) => item.id === contentId)
    : undefined;
}

function initialSelections(
  catalogueState: CampaignCatalogueState,
  item?: CampaignDraftAdaptiveItemState,
): Record<Difficulty, AlternativeSelection | null> {
  return Object.fromEntries(
    DIFFICULTIES.map((difficulty) => {
      const contentId = item?.alternatives[difficulty].contentId;
      const catalogueItem = contentId ? findCatalogueItem(catalogueState, contentId) : undefined;
      return [
        difficulty,
        contentId
          ? {
              contentId,
              title: catalogueItem?.title ?? contentId,
              categories: catalogueItem?.categories ?? [],
            }
          : null,
      ];
    }),
  ) as Record<Difficulty, AlternativeSelection | null>;
}

function AdaptiveCampaignItemEditor({
  catalogueState,
  initialItem,
  disabled = false,
  onCancel,
  onSubmit,
  onRequestAiVariant,
}: AdaptiveCampaignItemEditorProps) {
  const [componentType, setComponentType] = useState<CampaignCatalogueItemDto['type']>(
    initialItem?.componentType ?? 'TRAINING_DOCUMENT',
  );
  const [alternatives, setAlternatives] = useState(() =>
    initialSelections(catalogueState, initialItem),
  );
  const [isRequired, setIsRequired] = useState(initialItem?.isRequired ?? true);
  const [maxAttempts, setMaxAttempts] = useState(initialItem?.maxAttempts ?? 1);
  const [scorePolicy, setScorePolicy] = useState(initialItem?.scorePolicy ?? ('BEST' as const));
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const isEditing = Boolean(initialItem);
  const isComplete = DIFFICULTIES.every((difficulty) => alternatives[difficulty]);

  function optionsFor(difficulty: Difficulty): readonly CampaignCatalogueItemDto[] {
    if (catalogueState.status !== 'loaded') return [];
    return catalogueState.items.filter(
      (item) => item.type === componentType && item.difficultyLevel === difficulty,
    );
  }

  function updateAlternative(difficulty: Difficulty, contentId: string) {
    const selected = optionsFor(difficulty).find((item) => item.id === contentId);
    setAlternatives((current) => ({
      ...current,
      [difficulty]: selected
        ? { contentId: selected.id, title: selected.title, categories: selected.categories }
        : null,
    }));
  }

  const categorySeed =
    DIFFICULTIES.map((difficulty) => alternatives[difficulty]?.categories).find(
      (categories) => categories && categories.length > 0,
    ) ?? [];

  function submit() {
    if (disabled) return;
    setHasAttemptedSubmit(true);
    if (!isComplete) return;
    const easy = alternatives.EASY!;
    const medium = alternatives.MEDIUM!;
    const hard = alternatives.HARD!;
    onSubmit({
      itemType: 'ADAPTIVE',
      campaignItemId: initialItem?.campaignItemId,
      clientId: initialItem?.clientId,
      componentType,
      alternatives: {
        EASY: { contentId: easy.contentId },
        MEDIUM: { contentId: medium.contentId },
        HARD: { contentId: hard.contentId },
      },
      title: initialItem?.title ?? `Adaptive ${TYPE_LABELS[componentType]}`,
      description: initialItem?.description ?? null,
      isRequired,
      sourceAvailable: initialItem?.sourceAvailable ?? true,
      ...(componentType === 'QUIZ' ? { maxAttempts, scorePolicy } : {}),
    });
  }

  return (
    <section className="campaign-adaptive-editor" aria-labelledby="adaptive-item-heading">
      <div className="campaign-adaptive-editor__heading">
        <div>
          <h2 id="adaptive-item-heading">
            {isEditing ? 'Edit adaptive item' : 'Add adaptive item'}
          </h2>
          <p>
            This is one Campaign occurrence. The system selects the Easy, Medium, or Hard
            alternative for each trainee.
          </p>
        </div>
        <button
          type="button"
          className="campaign-button campaign-button--secondary"
          disabled={disabled}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>

      <label>
        <span>Content type</span>
        <select
          value={componentType}
          disabled={disabled || isEditing}
          onChange={(event) => {
            setComponentType(event.target.value as CampaignCatalogueItemDto['type']);
            setAlternatives({ EASY: null, MEDIUM: null, HARD: null });
          }}
        >
          <option value="TRAINING_DOCUMENT">Training Document</option>
          <option value="QUIZ">Quiz</option>
          <option value="SIMULATED_INBOX">Simulated Inbox</option>
        </select>
      </label>

      <div className="campaign-adaptive-editor__alternatives">
        {DIFFICULTIES.map((difficulty) => {
          const current = alternatives[difficulty];
          const options = optionsFor(difficulty);
          const currentIsVisible = options.some((option) => option.id === current?.contentId);
          return (
            <div className="campaign-adaptive-editor__alternative" key={difficulty}>
              <label>
                <span>{difficulty[0] + difficulty.slice(1).toLowerCase()} alternative</span>
                <select
                  value={current?.contentId ?? ''}
                  disabled={disabled || catalogueState.status !== 'loaded'}
                  aria-invalid={hasAttemptedSubmit && !current}
                  onChange={(event) => updateAlternative(difficulty, event.target.value)}
                >
                  <option value="">Select eligible content</option>
                  {current && !currentIsVisible && (
                    <option value={current.contentId}>{current.title}</option>
                  )}
                  {options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title} ({option.difficultyLevel})
                    </option>
                  ))}
                </select>
                <small>{current ? `Selected: ${current.title}` : 'No content selected'}</small>
                {hasAttemptedSubmit && !current && (
                  <span className="campaign-form-error" role="alert">
                    Select a {difficulty.toLowerCase()} alternative.
                  </span>
                )}
              </label>
              {!current && componentType !== 'SIMULATED_INBOX' && onRequestAiVariant && (
                <button
                  type="button"
                  className="campaign-button campaign-button--secondary campaign-adaptive-editor__ai-help"
                  disabled={disabled}
                  onClick={() => onRequestAiVariant(componentType, difficulty, categorySeed)}
                >
                  Generate {difficulty[0] + difficulty.slice(1).toLowerCase()} with AI
                </button>
              )}
            </div>
          );
        })}
      </div>

      {catalogueState.status === 'loading' && <p>Loading eligible Campaign content...</p>}
      {catalogueState.status === 'error' && (
        <p role="alert">Catalogue content is unavailable. Use the catalogue retry action.</p>
      )}
      {catalogueState.status === 'loaded' && (
        <p className="campaign-adaptive-editor__hint">
          Alternatives show eligible content from the current catalogue page. Use the catalogue
          search and pagination to find additional content; existing selections are retained.
        </p>
      )}
      {componentType === 'SIMULATED_INBOX' && !isComplete && (
        <p className="campaign-adaptive-editor__hint">
          AI can generate reusable emails, but a Simulated Inbox alternative requires an approved
          Simulation with an active Inbox. Create and approve it through the normal simulation
          workflow, then select it here.
        </p>
      )}

      <label>
        <span>Requirement</span>
        <select
          value={isRequired ? 'required' : 'optional'}
          disabled={disabled}
          onChange={(event) => setIsRequired(event.target.value === 'required')}
        >
          <option value="required">Required</option>
          <option value="optional">Optional</option>
        </select>
      </label>

      {componentType === 'QUIZ' && (
        <div className="campaign-quiz-settings">
          <label>
            <span>Attempt limit</span>
            <input
              type="number"
              min={1}
              step={1}
              value={maxAttempts}
              disabled={disabled}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isInteger(value) && value >= 1) setMaxAttempts(value);
              }}
            />
          </label>
          <label>
            <span>Scoring</span>
            <select
              value={scorePolicy}
              disabled={disabled}
              onChange={(event) =>
                setScorePolicy(event.target.value as 'BEST' | 'LATEST' | 'AVERAGE')
              }
            >
              <option value="BEST">Best score</option>
              <option value="LATEST">Latest score</option>
              <option value="AVERAGE">Average score</option>
            </select>
          </label>
        </div>
      )}

      <div className="campaign-adaptive-editor__actions">
        {!isComplete && (
          <p className="campaign-adaptive-editor__completion">
            Choose all three difficulty alternatives before adding this item.
          </p>
        )}
        <button
          type="button"
          className="campaign-button campaign-button--primary"
          disabled={disabled}
          onClick={submit}
        >
          {isEditing ? 'Apply changes' : 'Add adaptive item'}
        </button>
      </div>
    </section>
  );
}

export default AdaptiveCampaignItemEditor;
