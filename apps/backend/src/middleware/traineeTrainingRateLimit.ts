import rateLimit, { MemoryStore } from 'express-rate-limit';

const traineeTrainingRateLimitStore = new MemoryStore();

export const traineeTrainingRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  store: traineeTrainingRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TRAINING_RATE_LIMITED',
    message: 'Too many training requests. Please try again later.',
  },
});

export function clearTraineeTrainingRateLimitStore() {
  void traineeTrainingRateLimitStore.resetAll();
}
