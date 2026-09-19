import { z } from 'zod';
import {
  BROWSER_PORTAL_INTERACTION_EVENT_TYPES,
  PORTAL_DELIVERY_CHANNELS,
  PORTAL_INTERACTION_EVENT_TYPES,
  PORTAL_TEMPLATE_IDS,
  type BrowserPortalInteractionEventType,
  type ManagedPortalLinkContext,
  type PortalCapableEmailFields,
  type PortalDeliveryChannel,
  type PortalEducationalReveal,
  type PortalEmailRedFlag,
  type PortalInsightSummary,
  type PortalInteractionEventType,
  type PortalTemplateDefinition,
  type PortalTemplateId,
  type PortalTemplatePresentation,
  type PortalWarningSign,
  type RecordPortalInteractionRequest,
  type RecordPortalInteractionResponse,
  type ResolvePhishingPortalResponse,
  type TraineePortalInsight,
} from '../phishing-portals.js';
import { idParamSchema, requiredTrimmedStringSchema } from './common.schemas.js';

const portalLabelSchema = requiredTrimmedStringSchema({
  requiredMessage: 'Please enter a label.',
  maxLength: 200,
  maxMessage: 'Label must be at most 200 characters.',
});

const portalDescriptionSchema = requiredTrimmedStringSchema({
  requiredMessage: 'Please enter a description.',
  maxLength: 2000,
  maxMessage: 'Description must be at most 2000 characters.',
});

const clientEventIdSchema = z
  .string({
    required_error: 'Please enter a client event identifier.',
    invalid_type_error: 'Please enter a client event identifier.',
  })
  .trim()
  .min(1, 'Please enter a client event identifier.');

const trainingPathSchema = z
  .string({
    required_error: 'Please enter a training path.',
    invalid_type_error: 'Please enter a training path.',
  })
  .trim()
  .min(1, 'Please enter a training path.')
  .max(500, 'Training path must be at most 500 characters.')
  .refine(
    (value) =>
      value.startsWith('/') &&
      !value.startsWith('//') &&
      !/[?#\\\s]/.test(value) &&
      value.split('/').every((segment) => segment !== '.' && segment !== '..'),
    'Training path must be a relative application path.',
  );

const nonNegativeIntegerSchema = z.number().int().nonnegative();

export const portalTemplateIdSchema = z.enum(
  PORTAL_TEMPLATE_IDS,
) satisfies z.ZodType<PortalTemplateId>;

export const portalCapableEmailFieldsSchema = z
  .object({
    portalTemplateId: portalTemplateIdSchema.nullable(),
  })
  .strict() satisfies z.ZodType<PortalCapableEmailFields>;

export const portalDeliveryChannelSchema = z.enum(
  PORTAL_DELIVERY_CHANNELS,
) satisfies z.ZodType<PortalDeliveryChannel>;

export const simulatedInboxManagedPortalLinkContextSchema = z
  .object({
    channel: z.literal('SIMULATED_INBOX'),
    campaignAssignmentId: idParamSchema,
    campaignItemId: idParamSchema,
    simulatedEmailId: idParamSchema,
  })
  .strict() satisfies z.ZodType<Extract<ManagedPortalLinkContext, { channel: 'SIMULATED_INBOX' }>>;

export const realEmailManagedPortalLinkContextSchema = z
  .object({
    channel: z.literal('REAL_EMAIL'),
    phishingSimulationMessageId: idParamSchema,
    campaignAssignmentId: idParamSchema.nullable().optional(),
  })
  .strict() satisfies z.ZodType<Extract<ManagedPortalLinkContext, { channel: 'REAL_EMAIL' }>>;

export const managedPortalLinkContextSchema = z.discriminatedUnion('channel', [
  simulatedInboxManagedPortalLinkContextSchema,
  realEmailManagedPortalLinkContextSchema,
]) satisfies z.ZodType<ManagedPortalLinkContext>;

export const browserPortalInteractionEventTypeSchema = z.enum(
  BROWSER_PORTAL_INTERACTION_EVENT_TYPES,
) satisfies z.ZodType<BrowserPortalInteractionEventType>;

export const portalInteractionEventTypeSchema = z.enum(
  PORTAL_INTERACTION_EVENT_TYPES,
) satisfies z.ZodType<PortalInteractionEventType>;

export const recordPortalInteractionRequestSchema = z
  .object({
    eventType: browserPortalInteractionEventTypeSchema,
    clientEventId: clientEventIdSchema,
  })
  .strict() satisfies z.ZodType<RecordPortalInteractionRequest>;

export const portalWarningSignSchema = z
  .object({
    label: portalLabelSchema,
    description: portalDescriptionSchema,
  })
  .strict() satisfies z.ZodType<PortalWarningSign>;

export const portalTemplatePresentationSchema = z
  .object({
    templateId: portalTemplateIdSchema,
    heading: portalLabelSchema,
    identifierLabel: portalLabelSchema,
    credentialLabel: portalLabelSchema,
    submitLabel: portalLabelSchema,
  })
  .strict() satisfies z.ZodType<PortalTemplatePresentation>;

export const portalTemplateDefinitionSchema = portalTemplatePresentationSchema
  .extend({
    warningSigns: z.array(portalWarningSignSchema),
  })
  .strict() satisfies z.ZodType<PortalTemplateDefinition>;

export const portalEmailRedFlagSchema = z
  .object({
    label: portalLabelSchema,
    description: portalDescriptionSchema.nullable(),
  })
  .strict() satisfies z.ZodType<PortalEmailRedFlag>;

export const portalEducationalRevealSchema = z
  .object({
    emailRedFlags: z.array(portalEmailRedFlagSchema),
    portalWarningSigns: z.array(portalWarningSignSchema),
    trainingPath: trainingPathSchema.nullable(),
  })
  .strict() satisfies z.ZodType<PortalEducationalReveal>;

const activePhishingPortalResponseSchema = z
  .object({
    state: z.literal('ACTIVE'),
    portal: portalTemplatePresentationSchema,
  })
  .strict();

const inactivePhishingPortalResponseSchema = z
  .object({
    state: z.literal('INACTIVE'),
  })
  .strict();

const unavailablePhishingPortalResponseSchema = z
  .object({
    state: z.literal('UNAVAILABLE'),
  })
  .strict();

export const resolvePhishingPortalResponseSchema = z.discriminatedUnion('state', [
  activePhishingPortalResponseSchema,
  inactivePhishingPortalResponseSchema,
  unavailablePhishingPortalResponseSchema,
]) satisfies z.ZodType<ResolvePhishingPortalResponse>;

export const recordPortalInteractionResponseSchema = z
  .object({
    accepted: z.literal(true),
    reveal: portalEducationalRevealSchema.nullable(),
  })
  .strict() satisfies z.ZodType<RecordPortalInteractionResponse>;

export const portalInsightSummarySchema = z
  .object({
    managedLinkRequestCount: nonNegativeIntegerSchema,
    distinctTraineeLinkRequestCount: nonNegativeIntegerSchema,
    portalVisitCount: nonNegativeIntegerSchema,
    distinctPortalVisitorCount: nonNegativeIntegerSchema,
    identifierFieldInteractionCount: nonNegativeIntegerSchema,
    credentialFieldInteractionCount: nonNegativeIntegerSchema,
    credentialSubmissionAttemptCount: nonNegativeIntegerSchema,
    distinctCredentialAttemptTraineeCount: nonNegativeIntegerSchema,
    repeatCredentialAttemptCount: nonNegativeIntegerSchema,
    educationalRevealViewCount: nonNegativeIntegerSchema,
    distinctRevealTraineeCount: nonNegativeIntegerSchema,
  })
  .strict() satisfies z.ZodType<PortalInsightSummary>;

export const traineePortalInsightSchema = z
  .object({
    managedLinkRequested: z.boolean(),
    portalVisited: z.boolean(),
    identifierFieldInteracted: z.boolean(),
    credentialFieldInteracted: z.boolean(),
    credentialSubmissionAttemptCount: nonNegativeIntegerSchema,
    repeatCredentialAttemptCount: nonNegativeIntegerSchema,
    educationalRevealViewed: z.boolean(),
  })
  .strict() satisfies z.ZodType<TraineePortalInsight>;
