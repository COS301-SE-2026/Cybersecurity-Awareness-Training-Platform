import {
  contentCategories,
  type CampaignCatalogueItemDto,
  type CampaignProposalResponseDto,
  type EditableCampaignProposalItemDto,
} from '@insightful-phish/shared';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import LoadingSpinnerSVG from '../../components/LoadingSpinnerSVG';
import { useAuth } from '../../context/useAuth';
import { getOrganisationTrainees } from '../../services/organisation-trainee.service';
import { trainingDocumentCategoryLabels } from '../training-document-authoring/trainingDocumentAuthoring';
import { apiCampaignManagementClient } from './apiCampaignManagementClient';
import type { CampaignCatalogueState } from './CampaignCatalogue';

type Proposal = CampaignProposalResponseDto;
type ProposalItem = EditableCampaignProposalItemDto;

type AiCampaignProposalPanelProps = Readonly<{
  organisationId: string;
  catalogueState: CampaignCatalogueState;
  disabled?: boolean;
  onAddEligibleContent: (item: CampaignCatalogueItemDto) => void;
  onOpenGeneratedDraft: (item: ProposalItem) => void;
}>;

function proposalTypeToCampaignType(
  type: ProposalItem['suggestion']['contentType'],
): CampaignCatalogueItemDto['type'] | null {
  if (type === 'ORGANISATION_EMAIL') return null;
  return type;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : 'The Campaign proposal could not be generated. Please try again.';
}

function AiCampaignProposalPanel({
  organisationId,
  catalogueState,
  disabled = false,
  onAddEligibleContent,
  onOpenGeneratedDraft,
}: AiCampaignProposalPanelProps) {
  const { token } = useAuth();
  const location = useLocation();
  const storageKey = `ai-campaign-proposal:${organisationId}:${location.pathname}`;
  const [mode, setMode] = useState<'complete' | 'follow-up'>('complete');
  const [objective, setObjective] = useState('');
  const [guidance, setGuidance] = useState('');
  const [categories, setCategories] = useState<(typeof contentCategories)[number][]>([]);
  const [traineeId, setTraineeId] = useState('');
  const [trainees, setTrainees] = useState<Array<{ traineeProfileId: string; label: string }>>([]);
  const [proposal, setProposal] = useState<Proposal | null>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      return stored ? (JSON.parse(stored) as Proposal) : null;
    } catch {
      return null;
    }
  });
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode !== 'follow-up' || !token) return;
    let active = true;
    void getOrganisationTrainees(organisationId, token)
      .then((response) => {
        if (!active) return;
        setTrainees(
          response.trainees.flatMap((trainee) =>
            trainee.type === 'ACTIVE_TRAINEE'
              ? [
                  {
                    traineeProfileId: trainee.traineeProfileId,
                    label:
                      [trainee.firstName, trainee.lastName].filter(Boolean).join(' ') ||
                      trainee.email,
                  },
                ]
              : [],
          ),
        );
      })
      .catch(() => {
        if (active) setError('Active trainees could not be loaded for follow-up generation.');
      });
    return () => {
      active = false;
    };
  }, [mode, organisationId, token]);

  useEffect(() => {
    if (proposal) sessionStorage.setItem(storageKey, JSON.stringify(proposal));
    else sessionStorage.removeItem(storageKey);
  }, [proposal, storageKey]);

  async function generate() {
    if (disabled || isPending) return;
    if (!objective.trim()) {
      setError('Enter a Campaign objective.');
      return;
    }
    if (mode === 'complete' && categories.length === 0) {
      setError('Choose at least one category.');
      return;
    }
    if (mode === 'follow-up' && !traineeId) {
      setError('Choose a trainee for the follow-up proposal.');
      return;
    }

    setIsPending(true);
    setError(null);
    try {
      const result =
        mode === 'complete'
          ? await apiCampaignManagementClient.generateOrganisationCampaignProposal(organisationId, {
              objective,
              categoryFocus: categories,
              ...(guidance.trim() ? { administratorGuidance: guidance } : {}),
            })
          : await apiCampaignManagementClient.generateOrganisationFollowUpCampaignProposal(
              organisationId,
              {
                traineeProfileId: traineeId,
                objective,
                ...(guidance.trim() ? { administratorGuidance: guidance } : {}),
              },
            );
      setProposal(
        'content' in result
          ? result
          : {
              content: result.proposal,
              findings: result.findings,
              semanticReviewStatus: result.semanticReviewStatus,
            },
      );
      setSelectedContent({});
    } catch (generationError) {
      setError(errorMessage(generationError));
    } finally {
      setIsPending(false);
    }
  }

  function updateProposal(patch: Partial<Proposal['content']>) {
    setProposal((current) =>
      current ? { ...current, content: { ...current.content, ...patch } } : current,
    );
  }

  return (
    <section className="campaign-ai-proposal" aria-labelledby="campaign-ai-proposal-heading">
      <div className="campaign-ai-proposal__heading">
        <div>
          <h2 id="campaign-ai-proposal-heading">AI Campaign proposal</h2>
          <p>Generate an editable suggestion. Nothing is saved or assigned automatically.</p>
        </div>
        <div className="campaign-ai-proposal__mode" role="group" aria-label="Proposal type">
          <button
            type="button"
            aria-pressed={mode === 'complete'}
            onClick={() => setMode('complete')}
          >
            Complete
          </button>
          <button
            type="button"
            aria-pressed={mode === 'follow-up'}
            onClick={() => setMode('follow-up')}
          >
            Follow-up
          </button>
        </div>
      </div>

      <div className="campaign-ai-proposal__form">
        <label>
          <span>Campaign objective</span>
          <textarea
            value={objective}
            maxLength={1000}
            disabled={isPending}
            onChange={(event) => setObjective(event.target.value)}
          />
        </label>
        {mode === 'complete' ? (
          <fieldset disabled={isPending}>
            <legend>Category focus</legend>
            <div className="campaign-ai-proposal__categories">
              {contentCategories.map((category) => (
                <label key={category}>
                  <input
                    type="checkbox"
                    checked={categories.includes(category)}
                    onChange={(event) =>
                      setCategories((current) =>
                        event.target.checked
                          ? [...current, category]
                          : current.filter((value) => value !== category),
                      )
                    }
                  />
                  {trainingDocumentCategoryLabels[category]}
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <label>
            <span>Trainee</span>
            <select
              value={traineeId}
              disabled={isPending}
              onChange={(event) => setTraineeId(event.target.value)}
            >
              <option value="">Choose an active trainee</option>
              {trainees.map((trainee) => (
                <option key={trainee.traineeProfileId} value={trainee.traineeProfileId}>
                  {trainee.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span>Administrator guidance (optional)</span>
          <textarea
            value={guidance}
            maxLength={mode === 'complete' ? 2000 : 500}
            disabled={isPending}
            onChange={(event) => setGuidance(event.target.value)}
          />
        </label>
        {error && (
          <p className="campaign-form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="campaign-button campaign-button--primary"
          type="button"
          disabled={disabled || isPending}
          onClick={() => void generate()}
        >
          {isPending && <LoadingSpinnerSVG />}
          {isPending ? 'Generating proposal...' : 'Generate proposal'}
        </button>
      </div>

      {isPending && (
        <div className="campaign-ai-proposal__pending" role="status" aria-live="polite">
          <LoadingSpinnerSVG tone="brand" />
          <div>
            <strong>AI is preparing the Campaign proposal...</strong>
            <span>This may take a few moments.</span>
          </div>
        </div>
      )}

      {proposal && (
        <div className="campaign-ai-proposal__result">
          <button
            type="button"
            className="campaign-button campaign-button--secondary"
            onClick={() => setProposal(null)}
          >
            Discard proposal
          </button>
          <label>
            <span>Proposed name</span>
            <input
              value={proposal.content.name}
              onChange={(event) => updateProposal({ name: event.target.value })}
            />
          </label>
          <label>
            <span>Description</span>
            <textarea
              value={proposal.content.description}
              onChange={(event) => updateProposal({ description: event.target.value })}
            />
          </label>
          <p>
            <strong>Rationale:</strong> {proposal.content.rationale}
          </p>
          <p>
            Semantic review:{' '}
            {proposal.semanticReviewStatus === 'COMPLETE' ? 'Complete' : 'Unavailable'}
          </p>
          {proposal.findings.length > 0 && (
            <ul>
              {proposal.findings.map((finding, index) => (
                <li key={`${finding.code}-${index}`}>{finding.message}</li>
              ))}
            </ul>
          )}
          <div className="campaign-ai-proposal__items">
            {proposal.content.items.map((item) => {
              const campaignType = proposalTypeToCampaignType(item.suggestion.contentType);
              const candidates =
                catalogueState.status === 'loaded' && campaignType
                  ? catalogueState.items.filter(
                      (candidate) =>
                        candidate.type === campaignType &&
                        candidate.difficultyLevel === item.suggestion.difficultyLevel,
                    )
                  : [];
              return (
                <article key={item.proposalKey}>
                  <div>
                    <strong>{item.suggestion.title}</strong>
                    <span>
                      {item.suggestion.contentType.replaceAll('_', ' ')} ·{' '}
                      {item.suggestion.difficultyLevel}
                    </span>
                  </div>
                  <p>{item.suggestion.learningObjective}</p>
                  {campaignType ? (
                    <>
                      <button
                        type="button"
                        className="campaign-button campaign-button--secondary"
                        onClick={() => onOpenGeneratedDraft(item)}
                      >
                        Open generated Draft in builder
                      </button>
                      <label>
                        <span>Eligible content to add</span>
                        <select
                          value={selectedContent[item.proposalKey] ?? ''}
                          onChange={(event) =>
                            setSelectedContent((current) => ({
                              ...current,
                              [item.proposalKey]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Select after saving and activating content</option>
                          {candidates.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="campaign-button campaign-button--primary"
                        disabled={!selectedContent[item.proposalKey]}
                        onClick={() => {
                          const selected = candidates.find(
                            (candidate) => candidate.id === selectedContent[item.proposalKey],
                          );
                          if (selected) onAddEligibleContent(selected);
                        }}
                      >
                        Add eligible content
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="campaign-button campaign-button--secondary"
                        onClick={() => onOpenGeneratedDraft(item)}
                      >
                        Open generated Draft in Email Library
                      </button>
                      <p className="campaign-ai-proposal__notice">
                        This generated email is not a Campaign item. After saving it, build and
                        approve a Simulated Inbox before selecting that Inbox from the Campaign
                        catalogue.
                      </p>
                    </>
                  )}
                  <button
                    type="button"
                    className="campaign-button campaign-button--danger"
                    onClick={() =>
                      updateProposal({
                        items: proposal.content.items.filter(
                          (candidate) => candidate.proposalKey !== item.proposalKey,
                        ),
                      })
                    }
                  >
                    Remove suggestion
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default AiCampaignProposalPanel;
