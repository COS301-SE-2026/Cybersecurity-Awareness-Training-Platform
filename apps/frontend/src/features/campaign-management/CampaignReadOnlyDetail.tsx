import type {
  CampaignDetailGroupItemDto,
  CampaignDetailItemDto,
  CampaignDetailResponseDto,
} from '@insightful-phish/shared';

import { getCampaignDraftItemTypeLabel } from './campaignDraftPresentation';

type CampaignReadOnlyDetailProps = Readonly<{
  detail: CampaignDetailResponseDto;
}>;

const STATUS_LABELS: Record<CampaignDetailResponseDto['status'], string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

const STATUS_CLASSES: Record<CampaignDetailResponseDto['status'], string> = {
  DRAFT: 'campaign-status campaign-status--draft',
  ACTIVE: 'campaign-status campaign-status--active',
  PAUSED: 'campaign-status campaign-status--paused',
  COMPLETED: 'campaign-status campaign-status--completed',
  ARCHIVED: 'campaign-status campaign-status--archived',
};

const GROUP_TYPE_LABELS: Record<CampaignDetailGroupItemDto['groupType'], string> = {
  SECTION: 'Section',
  MODULE: 'Module',
  REVISION_SET: 'Revision Set',
  ASSESSMENT_SET: 'Assessment Set',
  SIMULATION_SET: 'Simulation Set',
};

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sortByPosition<T extends { position: number }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.position - right.position);
}

function getItemKey(item: CampaignDetailItemDto): string {
  return item.campaignItemId;
}

function CampaignReadOnlyDetail({ detail }: CampaignReadOnlyDetailProps) {
  const orderedItems = sortByPosition(detail.items);

  return (
    <section className="campaign-read-only" aria-labelledby="campaign-read-only-heading">
      <header className="campaign-read-only__heading">
        <div>
          <h2 id="campaign-read-only-heading">{detail.name}</h2>
          <p>{detail.description?.trim() || 'No description provided.'}</p>
        </div>

        <span className={STATUS_CLASSES[detail.status]}>{STATUS_LABELS[detail.status]}</span>
      </header>

      <dl className="campaign-review__metadata">
        <div>
          <dt>Campaign type</dt>
          <dd>
            {detail.campaignType === 'PREMADE_GENERAL'
              ? 'Platform Campaign'
              : 'Organisation Campaign'}
          </dd>
        </div>

        <div>
          <dt>Colour</dt>
          {detail.accentColor ? (
            <dd className="campaign-review__colour">
              <span
                className="campaign-review__colour-swatch"
                style={{ backgroundColor: detail.accentColor }}
                aria-hidden="true"
              />
              <span>{detail.accentColor}</span>
            </dd>
          ) : (
            <dd>Not set</dd>
          )}
        </div>

        <div>
          <dt>Created by</dt>
          <dd>{detail.createdBy?.displayName ?? 'Unknown administrator'}</dd>
        </div>

        <div>
          <dt>Created</dt>
          <dd>
            <time dateTime={detail.createdAt}>{formatTimestamp(detail.createdAt)}</time>
          </dd>
        </div>

        <div>
          <dt>Last updated</dt>
          <dd>
            <time dateTime={detail.updatedAt}>{formatTimestamp(detail.updatedAt)}</time>
          </dd>
        </div>

        {detail.campaignType === 'ORGANISATION_CUSTOM' && (
          <>
            <div>
              <dt>Start date</dt>
              <dd>
                {detail.startDate ? (
                  <time dateTime={detail.startDate}>{formatTimestamp(detail.startDate)}</time>
                ) : (
                  'Not set'
                )}
              </dd>
            </div>

            <div>
              <dt>End date</dt>
              <dd>
                {detail.endDate ? (
                  <time dateTime={detail.endDate}>{formatTimestamp(detail.endDate)}</time>
                ) : (
                  'Not set'
                )}
              </dd>
            </div>
          </>
        )}

        <div>
          <dt>Campaign items</dt>
          <dd>
            {orderedItems.length} {orderedItems.length === 1 ? 'item' : 'items'}
          </dd>
        </div>
      </dl>

      <section className="campaign-read-only__items" aria-labelledby="campaign-read-only-items">
        <h3 id="campaign-read-only-items">Campaign items</h3>

        {orderedItems.length === 0 ? (
          <p>No Campaign items added.</p>
        ) : (
          <ol>
            {orderedItems.map((item) => (
              <li key={getItemKey(item)}>
                <article className="campaign-read-only-item">
                  <h4>{item.title}</h4>
                  <p>
                    <span>
                      {item.itemType === 'GROUP'
                        ? `${GROUP_TYPE_LABELS[item.groupType]} Group`
                        : getCampaignDraftItemTypeLabel(item)}
                    </span>
                    {' · '}
                    <span>{item.isRequired ? 'Required' : 'Optional'}</span>
                  </p>

                  {item.description && <p>{item.description}</p>}

                  {item.itemType === 'COMPONENT' ? (
                    !item.sourceAvailable && (
                      <p className="campaign-read-only-item__warning">Source unavailable</p>
                    )
                  ) : (
                    <section
                      className="campaign-read-only-group"
                      aria-labelledby={`campaign-group-${item.campaignItemId}`}
                    >
                      <h5 id={`campaign-group-${item.campaignItemId}`}>Group items</h5>
                      <ol>
                        {sortByPosition(item.children).map((child) => (
                          <li key={child.campaignItemId}>
                            <article className="campaign-read-only-group-item">
                              <h6>{child.title}</h6>
                              <p>
                                <span>{getCampaignDraftItemTypeLabel(child)}</span>
                                {' · '}
                                <span>{child.isRequired ? 'Required' : 'Optional'}</span>
                              </p>

                              {!child.sourceAvailable && (
                                <p className="campaign-read-only-item__warning">
                                  Source unavailable
                                </p>
                              )}
                            </article>
                          </li>
                        ))}
                      </ol>
                    </section>
                  )}
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}

export default CampaignReadOnlyDetail;
