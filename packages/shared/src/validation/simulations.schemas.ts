import { z } from 'zod';
import { contentCategorySchema, difficultyLevelSchema } from '../categories.js';
import {
  createNumericPreprocessor,
  idParamSchema,
  optionalTrimmedStringSchema,
  requiredTrimmedStringSchema,
} from './common.schemas.js';
import {
  portalCapableEmailFieldsSchema,
  portalTemplateIdSchema,
} from './phishing-portals.schemas.js';

const organisationEmailPageSchema = createNumericPreprocessor(1, 'Page', 100000);
const organisationEmailLimitSchema = createNumericPreprocessor(20, 'Limit', 100);
const simulatedInboxPageSchema = createNumericPreprocessor(1, 'Page', 100000);
const simulatedInboxLimitSchema = createNumericPreprocessor(20, 'Limit', 100);

export const emailPersonalisationFields = ['FIRST_NAME', 'SURNAME', 'EMAIL_ADDRESS'] as const;

export const emailPersonalisationFieldSchema = z.enum(emailPersonalisationFields);

export const emailPersonalisationMarkers = {
  FIRST_NAME: '{{FIRST_NAME}}',
  SURNAME: '{{SURNAME}}',
  EMAIL_ADDRESS: '{{EMAIL_ADDRESS}}',
} as const;

export const systemLinkMarker = '{{SYSTEM_LINK}}' as const;

export const supportedEmailMarkers = [
  emailPersonalisationMarkers.FIRST_NAME,
  emailPersonalisationMarkers.SURNAME,
  emailPersonalisationMarkers.EMAIL_ADDRESS,
  systemLinkMarker,
] as const;

export const supportedEmailMarkerSchema = z.enum(supportedEmailMarkers);

export const emailClassificationSchema = z.enum(['SAFE', 'SUSPICIOUS', 'PHISHING'], {
  errorMap: () => ({ message: 'Please select a valid email classification.' }),
});

export const emailRedFlagTypeSchema = z.enum([
  'SENDER',
  'LINK',
  'LANGUAGE',
  'ATTACHMENT',
  'REQUEST',
  'DOMAIN',
  'OTHER',
]);

export const redFlagSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const organisationEmailStatusSchema = z.enum(['DRAFT', 'ACTIVE']);

export const authoredEmailLinkSchema = z
  .object({
    anchorText: z.string(),
  })
  .strict();

export const authoredEmailRedFlagSchema = z
  .object({
    redFlagType: emailRedFlagTypeSchema,
    label: z.string(),
    description: z.string().nullable(),
    severity: redFlagSeveritySchema,
  })
  .strict();

export const organisationEmailDraftInputSchema = z
  .object({
    senderLabel: z.string(),
    senderAddress: z.string(),
    subject: z.string(),
    preview: z.string().nullable(),
    bodyHtml: z.string(),
    link: authoredEmailLinkSchema.nullable(),
    expectedClassification: emailClassificationSchema,
    redFlags: z.array(authoredEmailRedFlagSchema),
    categories: z.array(contentCategorySchema),
    difficultyLevel: difficultyLevelSchema,
    portalTemplateId: portalTemplateIdSchema.nullable().default(null),
  })
  .strict();

export const organisationEmailDraftUpdateInputSchema = organisationEmailDraftInputSchema
  .omit({ portalTemplateId: true })
  .extend({
    portalTemplateId: portalTemplateIdSchema.nullable().optional(),
  })
  .strict();

export const organisationEmailManagementDetailResponseSchema = organisationEmailDraftInputSchema
  .merge(portalCapableEmailFieldsSchema)
  .extend({
    id: idParamSchema,
    organisationId: idParamSchema,
    createdByUserId: idParamSchema.nullable(),
    status: organisationEmailStatusSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const organisationEmailListSummarySchema = z
  .object({
    id: idParamSchema,
    senderLabel: z.string(),
    senderAddress: z.string(),
    subject: z.string(),
    preview: z.string().nullable(),
    portalTemplateId: portalCapableEmailFieldsSchema.shape.portalTemplateId,
    expectedClassification: emailClassificationSchema,
    categories: z.array(contentCategorySchema),
    difficultyLevel: difficultyLevelSchema,
    status: organisationEmailStatusSchema,
    updatedAt: z.string().datetime(),
  })
  .strict();

export const organisationEmailPickerSummarySchema = organisationEmailListSummarySchema;

export const organisationEmailIdParamsSchema = z
  .object({
    organisationId: idParamSchema,
    emailId: idParamSchema,
  })
  .strict();

export const listOrganisationEmailsQuerySchema = z
  .object({
    page: organisationEmailPageSchema,
    limit: organisationEmailLimitSchema,
    search: optionalTrimmedStringSchema(200),
    status: organisationEmailStatusSchema.optional(),
  })
  .strict();

export const organisationEmailMutationRequestSchema = z.preprocess(
  (value) => value ?? {},
  z.object({}).strict(),
);

export const organisationEmailListResponseSchema = z
  .object({
    items: z.array(organisationEmailListSummarySchema),
    pagination: z
      .object({
        page: z.number().int().positive(),
        limit: z.number().int().positive(),
        total: z.number().int().nonnegative(),
        totalPages: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export const organisationEmailRegistrationResponseSchema = z
  .object({
    email: organisationEmailManagementDetailResponseSchema,
    reused: z.boolean(),
  })
  .strict();

export const embeddedEmailSnapshotSchema = organisationEmailDraftInputSchema
  .merge(portalCapableEmailFieldsSchema)
  .extend({
    id: idParamSchema,
    sourceOrganisationEmailId: idParamSchema.nullable(),
  })
  .strict();

export const phishingSimulationEmailInputSchema = organisationEmailDraftInputSchema;

export const simulatedInboxChildEmailInputSchema = organisationEmailDraftInputSchema
  .extend({
    id: idParamSchema.optional(),
    sourceOrganisationEmailId: idParamSchema.nullable().optional(),
    position: z.number().int().nonnegative(),
  })
  .strict();

export const simulatedInboxChildEmailSchema = embeddedEmailSnapshotSchema
  .extend({
    position: z.number().int().nonnegative(),
  })
  .strict();

export const simulatedInboxDraftInputSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    objective: z.string(),
    difficultyLevel: difficultyLevelSchema,
    emails: z.array(simulatedInboxChildEmailInputSchema),
  })
  .strict();

export const simulatedInboxListSummarySchema = z
  .object({
    id: idParamSchema,
    title: z.string(),
    description: z.string().nullable(),
    objective: z.string().nullable(),
    difficultyLevel: difficultyLevelSchema,
    safetyStatus: z.enum(['DRAFT', 'APPROVED', 'BLOCKED']),
    lifecycleStatus: z.enum(['DRAFT', 'ACTIVE']),
    emailCount: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const simulatedInboxDetailSchema = simulatedInboxListSummarySchema
  .omit({ emailCount: true })
  .extend({
    organisationId: idParamSchema.nullable(),
    createdByUserId: idParamSchema.nullable(),
    inboxId: idParamSchema,
    inboxStatus: z.enum(['ACTIVE', 'ARCHIVED']),
    emails: z.array(simulatedInboxChildEmailSchema),
  })
  .strict();

export const listSimulatedInboxesQuerySchema = z
  .object({
    page: simulatedInboxPageSchema,
    limit: simulatedInboxLimitSchema,
    search: optionalTrimmedStringSchema(200),
    lifecycleStatus: z.enum(['DRAFT', 'ACTIVE']).optional(),
  })
  .strict();

export const createSimulatedInboxDraftRequestSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    difficultyLevel: difficultyLevelSchema,
  })
  .strict();

export const updateSimulatedInboxDraftRequestSchema = createSimulatedInboxDraftRequestSchema
  .partial()
  .strict();

export const simulatedInboxManagementIdParamsSchema = z
  .object({
    organisationId: idParamSchema,
    simulationId: idParamSchema,
  })
  .strict();

export const simulatedInboxSnapshotIdParamsSchema = simulatedInboxManagementIdParamsSchema
  .extend({
    emailId: idParamSchema,
  })
  .strict();

export const addLibraryEmailToSimulatedInboxRequestSchema = z
  .object({
    organisationEmailId: idParamSchema,
  })
  .strict();

export const reorderSimulatedInboxEmailsRequestSchema = z
  .object({
    emails: z.array(
      z
        .object({
          emailId: idParamSchema,
          position: z.number().int().nonnegative(),
        })
        .strict(),
    ),
  })
  .strict();

export const simulatedInboxSnapshotCreationResponseSchema = z
  .object({
    email: simulatedInboxChildEmailSchema,
    sourceOrganisationEmailId: idParamSchema,
    libraryEmailReused: z.boolean(),
  })
  .strict();

export const simulatedInboxListResponseSchema = z
  .object({
    items: z.array(simulatedInboxListSummarySchema),
    pagination: z
      .object({
        page: z.number().int().positive(),
        limit: z.number().int().positive(),
        total: z.number().int().nonnegative(),
        totalPages: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export const activationValidationIssueSchema = z
  .object({
    emailId: idParamSchema.nullable(),
    position: z.number().int().nonnegative().nullable(),
    field: z.string(),
    code: z.string(),
    message: z.string(),
  })
  .strict();

export const simulatedInboxActivationValidationResponseSchema = z
  .object({
    issues: z.array(activationValidationIssueSchema),
  })
  .strict();

export const weekdaySchema = z.enum(
  ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
  { errorMap: () => ({ message: 'Please select a supported weekday.' }) },
);
export const phishingSimulationStatusSchema = z.enum(
  ['DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'STOPPED'],
  { errorMap: () => ({ message: 'Please select a supported phishing simulation status.' }) },
);
const phishingSimulationDraftNameSchema = requiredTrimmedStringSchema({
  requiredMessage: 'Please enter a simulation name',
  maxLength: 200,
  maxMessage: 'Simulation name must be at most 200 characters',
}).nullable();
const phishingSimulationEmailCountSchema = z
  .number()
  .int('Emails per recipient must be an integer')
  .positive('Emails per recipient must be at least 1.')
  .nullable();
const phishingSimulationDateTimeSchema = z
  .string()
  .datetime({ message: 'Date and time must use the ISO format' })
  .nullable();
const phishingSimulationSendingTimeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Sending times must use 24 hours HH:mm format')
  .nullable();
const phishingSimulationWeekdaysInputSchema = z
  .array(weekdaySchema)
  .transform((weekdays) => Array.from(new Set(weekdays)));
const phishingSimulationProviderProfileIdsInputSchema = z
  .array(idParamSchema)
  .transform((providerProfileIds) => Array.from(new Set(providerProfileIds)));
export const phishingSimulationCollectionRequestParamsSchema = z
  .object({
    organisationId: idParamSchema,
    campaignId: idParamSchema,
  })
  .strict();
export const phishingSimulationDetailRequestParamsSchema =
  phishingSimulationCollectionRequestParamsSchema.extend({ simulationId: idParamSchema }).strict();
export const createPhishingSimulationDraftRequestSchema = z
  .object({
    name: phishingSimulationDraftNameSchema.optional(),
    emailCount: phishingSimulationEmailCountSchema.optional(),
    startAt: phishingSimulationDateTimeSchema.optional(),
    endAt: phishingSimulationDateTimeSchema.optional(),
    sendFrom: phishingSimulationSendingTimeSchema.optional(),
    sendUntil: phishingSimulationSendingTimeSchema.optional(),
    weekdays: phishingSimulationWeekdaysInputSchema.optional(),
    providerProfileIds: phishingSimulationProviderProfileIdsInputSchema.optional(),
  })
  .strict();
export const updatePhishingSimulationDraftRequestSchema =
  createPhishingSimulationDraftRequestSchema.refine((request) => Object.keys(request).length > 0, {
    message: 'Please provide at least one phishing simulation field to update',
  });
export const phishingSimulationResponseSchema = z
  .object({
    id: idParamSchema,
    organisationId: idParamSchema,
    campaignId: idParamSchema,
    status: phishingSimulationStatusSchema,
    name: phishingSimulationDraftNameSchema,
    emailCount: phishingSimulationEmailCountSchema,
    startAt: phishingSimulationDateTimeSchema,
    endAt: phishingSimulationDateTimeSchema,
    sendFrom: phishingSimulationSendingTimeSchema,
    sendUntil: phishingSimulationSendingTimeSchema,
    weekdays: z.array(weekdaySchema),
    providerProfileIds: z.array(idParamSchema),
    pool: z.array(embeddedEmailSnapshotSchema),
    timezone: z.string().trim().min(1, 'Server timezone is required.'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export const phishingSimulationListResponseSchema = z
  .object({ items: z.array(phishingSimulationResponseSchema) })
  .strict();
export const simulatedEmailInteractionEventTypeSchema = z.enum(
  ['SIMULATED_EMAIL_OPENED', 'SIMULATED_EMAIL_LINK_CLICKED', 'CREDENTIAL_SUBMISSION_ATTEMPTED'],
  {
    errorMap: () => ({ message: 'Please select a supported simulated email interaction event.' }),
  },
);

export const getSimulatedEmailRequestParamsSchema = z
  .object({
    campaignItemId: idParamSchema,
    emailId: idParamSchema,
  })
  .strict();

export const getSimulatedInboxRequestParamsSchema = z
  .object({
    campaignItemId: idParamSchema,
  })
  .strict();

export const recordSimulatedEmailInteractionRequestParamsSchema =
  getSimulatedEmailRequestParamsSchema;

export const classifySimulatedEmailRequestParamsSchema = getSimulatedEmailRequestParamsSchema;

export const recordSimulatedEmailInteractionRequestSchema = z
  .object({
    eventType: simulatedEmailInteractionEventTypeSchema,
  })
  .strict();

export const classifySimulatedEmailRequestSchema = z
  .object({
    selectedClassification: emailClassificationSchema,
    selectedRedFlagIds: z.array(idParamSchema).optional(),
    selectedRedFlagTypes: z
      .array(z.enum(['SENDER', 'LINK', 'LANGUAGE', 'ATTACHMENT', 'REQUEST', 'DOMAIN', 'OTHER']))
      .optional(),
    freeTextReason: optionalTrimmedStringSchema(
      1000,
      'Reason must be at most 1000 characters.',
    ).optional(),
  })
  .strict();

export const phishingSimulationPoolRequestParamsSchema =
  phishingSimulationDetailRequestParamsSchema;
export const phishingSimulationPoolEntryRequestParamsSchema =
  phishingSimulationPoolRequestParamsSchema.extend({ poolEmailId: idParamSchema }).strict();
export const addLibraryEmailToPhishingSimulationPoolRequestSchema = z
  .object({ organisationEmailId: idParamSchema })
  .strict();
export const phishingSimulationPoolResponseSchema = z
  .object({ items: z.array(embeddedEmailSnapshotSchema) })
  .strict();
export const phishingSimulationStopReasonSchema = z.enum(
  ['CAMPAIGN_INACTIVE', 'NO_ELIGIBLE_RECIPIENTS', 'NO_VALID_SEND_WINDOW'],
  { errorMap: () => ({ message: 'Please select a supported phishing simulation stop reason.' }) },
);
export const phishingSimulationRecipientSchema = z
  .object({
    id: idParamSchema,
    phishingSimulationId: idParamSchema,
    campaignAssignmentId: idParamSchema,
    traineeProfileId: idParamSchema,
    recipientEmail: z.string().email(),
    recipientFirstName: z.string(),
    recipientLastName: z.string(),
    snapshottedAt: z.string().datetime(),
  })
  .strict();
export const plannedMessageSchema = z
  .object({
    id: idParamSchema,
    phishingSimulationId: idParamSchema,
    recipientId: idParamSchema,
    poolEmailId: idParamSchema,
    providerProfileId: idParamSchema,
    scheduledFor: z.string().datetime(),
    portalTemplateId: portalTemplateIdSchema.nullable(),
  })
  .strict();
export const phishingSimulationDetailResponseSchema = phishingSimulationResponseSchema
  .extend({
    stopReason: phishingSimulationStopReasonSchema.nullable(),
    recipients: z.array(phishingSimulationRecipientSchema),
    messages: z.array(plannedMessageSchema),
  })
  .strict();
