import { z } from 'zod';
import {
  idParamSchema,
  optionalTrimmedStringSchema,
  requiredTrimmedStringSchema,
} from './common.schemas.js';

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
    pool: z.tuple([]),
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
    selectedClassification: z.enum(['SAFE', 'SUSPICIOUS', 'PHISHING'], {
      errorMap: () => ({ message: 'Please select a valid email classification.' }),
    }),
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
