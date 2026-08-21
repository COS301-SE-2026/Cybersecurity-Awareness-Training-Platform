import type {
  CampaignCatalogueItemDto,
  CampaignCatalogueQueryDto,
  GetCampaignCatalogueResponseDto,
} from '@insightful-phish/shared';

import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';

export type CampaignCatalogueState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'loaded';
      items: readonly CampaignCatalogueItemDto[];
      pagination: GetCampaignCatalogueResponseDto['pagination'];
    };

type CampaignCatalogueProps = Readonly<{
  state: CampaignCatalogueState;
  query: CampaignCatalogueQueryDto;
  selectedItems: readonly Pick<CampaignCatalogueItemDto, 'id' | 'type'>[];
  onSelectItem: (item: CampaignCatalogueItemDto) => void;
  disabled?: boolean;
  onRetry: () => void;
  onSearchChange: (search: string) => void;
  onTypeChange: (type: CampaignCatalogueQueryDto['type']) => void;
  onPageChange: (page: number) => void;
}>;

const TYPE_LABELS: Record<CampaignCatalogueItemDto['type'], string> = {
  TRAINING_DOCUMENT: 'Training Document',
  QUIZ: 'Quiz',
  SIMULATED_INBOX: 'Simulated Inbox',
};

function CampaignCatalogue({
  state,
  query,
  selectedItems,
  disabled = false,
  onSelectItem,
  onRetry,
  onSearchChange,
  onTypeChange,
  onPageChange,
}: CampaignCatalogueProps) {
  return (
    <section className="campaign-catalogue" aria-labelledby="campaign-catalogue-heading">
      <div className="campaign-catalogue__heading">
        <h2 id="campaign-catalogue-heading">Catalogue</h2>
        <p>Browse available content to include in this Campaign.</p>
      </div>

      <p className="campaign-catalogue__selection-status" aria-live="polite">
        {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} selected
      </p>

      <div className="campaign-catalogue__controls">
        <label className="campaign-catalogue__search">
          <span>Search catalogue</span>
          <input
            type="search"
            maxLength={100}
            value={query.search ?? ''}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
              }
            }}
          />
        </label>
        <label className="campaign-catalogue__filter">
          <span>Content type</span>
          <select
            value={query.type ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              onTypeChange(
                value === ''
                  ? undefined
                  : (value as NonNullable<CampaignCatalogueQueryDto['type']>),
              );
            }}
          >
            <option value="">All content</option>
            <option value="TRAINING_DOCUMENT">Training Documents</option>
            <option value="QUIZ">Quizzes</option>
            <option value="SIMULATED_INBOX">Simulated Inbox</option>
          </select>
        </label>
      </div>

      {state.status === 'loading' && (
        <div className="campaign-catalogue__state" aria-live="polite">
          <LoadingSpinnerSVG />
          <span>Loading catalogue…</span>
        </div>
      )}

      {state.status === 'error' && (
        <div className="campaign-catalogue__state campaign-catalogue__state--error" role="alert">
          <p>Campaign catalogue could not be loaded. Try again.</p>
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      {state.status === 'loaded' && state.items.length === 0 && (
        <p className="campaign-catalogue__state">No catalogue items found.</p>
      )}

      {state.status === 'loaded' && state.items.length > 0 && (
        <ul className="campaign-catalogue__items">
          {state.items.map((item) => {
            const isSelected = selectedItems.some(
              (selectedItem) => selectedItem.type === item.type && selectedItem.id === item.id,
            );

            return (
              <li key={`${item.type}:${item.id}`}>
                <article className="campaign-catalogue-item">
                  <span className="campaign-catalogue-item__type">{TYPE_LABELS[item.type]}</span>
                  <h3>{item.title}</h3>
                  {item.description && <p>{item.description}</p>}
                  <span className="campaign-catalogue-item__difficulty">
                    Difficulty: {item.difficultyLevel}
                  </span>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={
                      isSelected ? `${item.title} selected` : `Add ${item.title} to Campaign`
                    }
                    disabled={disabled || isSelected}
                    onClick={() => onSelectItem(item)}
                  >
                    {isSelected ? 'Selected' : 'Add to Campaign'}
                  </button>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {state.status === 'loaded' && state.pagination.totalPages > 1 && (
        <nav className="campaign-catalogue__pagination" aria-label="Catalogue pagination">
          <button
            type="button"
            disabled={!state.pagination.hasPreviousPage}
            onClick={() => onPageChange(state.pagination.page - 1)}
          >
            Previous
          </button>

          <span>
            Page {state.pagination.page} of {state.pagination.totalPages}
          </span>

          <button
            type="button"
            disabled={!state.pagination.hasNextPage}
            onClick={() => onPageChange(state.pagination.page + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}

export default CampaignCatalogue;
