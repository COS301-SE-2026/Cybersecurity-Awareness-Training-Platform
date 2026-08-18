import type { CampaignCatalogueItemDto } from '@insightful-phish/shared';

import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';

export type CampaignCatalogueState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'loaded';
      items: readonly CampaignCatalogueItemDto[];
    };

type CampaignCatalogueProps = Readonly<{
  state: CampaignCatalogueState;
  onRetry: () => void;
}>;

const TYPE_LABELS: Record<CampaignCatalogueItemDto['type'], string> = {
  TRAINING_DOCUMENT: 'Training Document',
  QUIZ: 'Quiz',
  SIMULATED_INBOX: 'Simulated Inbox',
};

function CampaignCatalogue({ state, onRetry }: CampaignCatalogueProps) {
  return (
    <section className="campaign-catalogue" aria-labelledby="campaign-catalogue-heading">
      <div className="campaign-catalogue__heading">
        <h2 id="campaign-catalogue-heading">Catalogue</h2>
        <p>Browse available content to include in this Campaign.</p>
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
          {state.items.map((item) => (
            <li key={`${item.type}:${item.id}`}>
              <article className="campaign-catalogue-item">
                <span className="campaign-catalogue-item__type">{TYPE_LABELS[item.type]}</span>
                <h3>{item.title}</h3>
                {item.description && <p>{item.description}</p>}
                <span className="campaign-catalogue-item__difficulty">
                  Difficulty: {item.difficultyLevel}
                </span>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default CampaignCatalogue;
