import rateLimit, { MemoryStore } from 'express-rate-limit';

const organisationAdminReadRateLimitStore = new MemoryStore();
const organisationAdminMutationRateLimitStore = new MemoryStore();

function organisationAdminRateLimit(input: {
  windowMs: number;
  limit: number;
  store: MemoryStore;
}) {
  return rateLimit({
    windowMs: input.windowMs,
    limit: input.limit,
    store: input.store,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'ORGANISATION_ADMIN_RATE_LIMITED',
      message: 'Too many organisation admin requests. Please try again later.',
    },
  });
}

export const organisationAdminReadRateLimit = organisationAdminRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  store: organisationAdminReadRateLimitStore,
});

export const organisationAdminMutationRateLimit = organisationAdminRateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  store: organisationAdminMutationRateLimitStore,
});

export function clearOrganisationAdminRateLimitStores() {
  void organisationAdminReadRateLimitStore.resetAll();
  void organisationAdminMutationRateLimitStore.resetAll();
}
