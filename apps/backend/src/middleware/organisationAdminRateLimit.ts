import rateLimit, { MemoryStore } from 'express-rate-limit';

const organisationAdminReadRateLimitStore = new MemoryStore();
const organisationAdminMutationRateLimitStore = new MemoryStore();
const organisationAdminSensitiveActionRateLimitStore = new MemoryStore();

const organisationAdminRateLimitMessage = {
  error: 'ORGANISATION_ADMIN_RATE_LIMITED',
  message: 'Too many organisation admin requests. Please try again later.',
};

export const organisationAdminReadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  store: organisationAdminReadRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: organisationAdminRateLimitMessage,
});

export const organisationAdminMutationRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  store: organisationAdminMutationRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: organisationAdminRateLimitMessage,
});

export const organisationAdminSensitiveActionRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  store: organisationAdminSensitiveActionRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: organisationAdminRateLimitMessage,
});

export function clearOrganisationAdminRateLimitStores() {
  void organisationAdminReadRateLimitStore.resetAll();
  void organisationAdminMutationRateLimitStore.resetAll();
  void organisationAdminSensitiveActionRateLimitStore.resetAll();
}
