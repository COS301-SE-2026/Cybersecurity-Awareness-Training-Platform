import {
  contentCategories,
  contentCategorySchema,
  difficultyLevelSchema,
} from '@insightful-phish/shared';
import { z } from 'zod';
import {
  createAiCampaignProposalService,
  type AiCampaignProposalService,
  type EditableCampaignProposal,
} from './ai-campaign-proposal.service.js';
import type { AiContentQualityReview } from './ai-content-quality.service.js';

/** Backend-only Revision 1 fixture until #557 owns the canonical shared state. */
const adaptiveCategoryStateSchema = z
  .object({
    category: contentCategorySchema,
    evidenceStatus: z.enum(['SUFFICIENT', 'INSUFFICIENT']),
    evidenceCount: z.number().int().min(0),
    recommendedDifficulty: difficultyLevelSchema,
    resolutionBasis: z.enum(['EVIDENCE', 'FALLBACK']),
    calculatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((state, context) => {
    const evidenceBased = state.evidenceStatus === 'SUFFICIENT';
    if (evidenceBased !== (state.resolutionBasis === 'EVIDENCE')) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resolutionBasis'],
        message: 'Resolution basis must match evidence sufficiency',
      });
    }
    if (evidenceBased && state.evidenceCount === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['evidenceCount'],
        message: 'Sufficient evidence requires at least one fact',
      });
    }
  });

const followUpProposalRequestSchema = z
  .object({
    actorUserId: z.string().uuid(),
    organisationId: z.string().uuid(),
    objective: z.string().trim().min(1).max(1_000),
    categoryStates: z
      .array(adaptiveCategoryStateSchema)
      .min(1)
      .max(contentCategories.length)
      .refine((states) => new Set(states.map((state) => state.category)).size === states.length, {
        message: 'Each category may appear only once',
      }),
    administratorGuidance: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

type FollowUpProposalRequest = z.infer<typeof followUpProposalRequestSchema>;

export type FollowUpCampaignProposal = Pick<
  AiContentQualityReview<EditableCampaignProposal>,
  'findings' | 'semanticReviewStatus'
> & {
  /** The supplied backend calculation remains distinct from AI-authored content. */
  categoryStates: FollowUpProposalRequest['categoryStates'];
  proposal: EditableCampaignProposal;
};

export class FollowUpCampaignProposalInputError extends Error {
  constructor(readonly issues: Array<{ path: Array<string | number>; message: string }>) {
    super('Follow-up Campaign proposal request is invalid');
    this.name = 'FollowUpCampaignProposalInputError';
  }
}

function parseFollowUpRequest(input: unknown): FollowUpProposalRequest {
  const result = followUpProposalRequestSchema.safeParse(input);
  if (!result.success) {
    throw new FollowUpCampaignProposalInputError(
      result.error.issues.map((issue) => ({
        path: [...issue.path],
        message: issue.message,
      })),
    );
  }
  return result.data;
}

function buildFollowUpGuidance(request: FollowUpProposalRequest): string {
  const stateSummary = request.categoryStates.map((state) => ({
    category: state.category,
    evidenceStatus: state.evidenceStatus,
    recommendedDifficulty: state.recommendedDifficulty,
    resolutionBasis: state.resolutionBasis,
  }));

  return [
    'Propose follow-up learning activities focused on the supplied categories.',
    'The category states are precomputed by the backend. Do not recalculate or override their recommended difficulty.',
    'INSUFFICIENT with FALLBACK means limited evidence, not poor performance or a zero skill score.',
    "Use recommendations only as content-design guidance; do not claim to select a trainee's authoritative difficulty.",
    '<computed-category-state-reference>',
    JSON.stringify(stateSummary),
    '</computed-category-state-reference>',
    ...(request.administratorGuidance
      ? [
          '<administrator-follow-up-guidance>',
          JSON.stringify(request.administratorGuidance),
          '</administrator-follow-up-guidance>',
        ]
      : []),
  ].join('\n');
}

export class AiFollowUpCampaignProposalService {
  constructor(private readonly campaignProposalService: AiCampaignProposalService) {}

  async generateFollowUpProposal(input: unknown): Promise<FollowUpCampaignProposal> {
    const request = parseFollowUpRequest(input);
    const review = await this.campaignProposalService.generateEditableProposal({
      actorUserId: request.actorUserId,
      organisationId: request.organisationId,
      objective: request.objective,
      categoryFocus: request.categoryStates.map((state) => state.category),
      administratorGuidance: buildFollowUpGuidance(request),
    });

    return {
      categoryStates: request.categoryStates,
      proposal: review.content,
      findings: review.findings,
      semanticReviewStatus: review.semanticReviewStatus,
    };
  }
}

export function createAiFollowUpCampaignProposalService(): AiFollowUpCampaignProposalService {
  return new AiFollowUpCampaignProposalService(createAiCampaignProposalService());
}
