import { z } from 'zod';

export const campaignAssignmentOptionsQuerySchema = z
  .object({
    page: z.preprocess(
      (val) => {
        if (val === undefined || val === '') return 1;
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (!/^\d+$/.test(trimmed)) return Number.NaN;
          const parsed = Number(trimmed);
          return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
        }
        return typeof val === 'number' && Number.isSafeInteger(val) ? val : Number.NaN;
      },
      z
        .number()
        .int('Page must be an integer.')
        .min(1, 'Page must be at least 1.')
        .max(100000, 'Page exceeds maximum limit of 100000.'),
    ),

    limit: z.preprocess(
      (val) => {
        if (val === undefined || val === '') return 20;
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (!/^\d+$/.test(trimmed)) return Number.NaN;
          const parsed = Number(trimmed);
          return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
        }
        return typeof val === 'number' && Number.isSafeInteger(val) ? val : Number.NaN;
      },
      z
        .number()
        .int('Limit must be an integer.')
        .min(1, 'Limit must be at least 1.')
        .max(100, 'Limit must be at most 100.'),
    ),

    search: z.string().trim().optional(),
  })
  .strict();

export const paginationMetaSchema = z
  .object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  })
  .strict();

export const assignableCampaignOptionSchema = z
  .object({
    campaignId: z.string().uuid(),
    name: z.string().min(1),
    description: z.string().nullable(),
    status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']),
    type: z.enum(['PREMADE_GENERAL', 'ORGANISATION_CUSTOM']),
    itemCount: z.number().int().min(0),
    startDate: z.string().datetime().nullable(),
    endDate: z.string().datetime().nullable(),
    assignmentCount: z.number().int().min(0),
  })
  .strict();

export const getAssignableCampaignsResponseSchema = z
  .object({
    items: z.array(assignableCampaignOptionSchema),
    pagination: paginationMetaSchema,
  })
  .strict();

export const campaignAssignmentCandidateOptionSchema = z
  .object({
    traineeProfileId: z.string().uuid(),
    organisationTraineeProfileId: z.string().uuid(),
    userId: z.string().uuid(),
    displayName: z.string().min(1),
    email: z.string().email(),
    active: z.literal(true),
  })
  .strict();

export const getCampaignAssignmentCandidatesResponseSchema = z
  .object({
    items: z.array(campaignAssignmentCandidateOptionSchema),
    pagination: paginationMetaSchema,
  })
  .strict();
