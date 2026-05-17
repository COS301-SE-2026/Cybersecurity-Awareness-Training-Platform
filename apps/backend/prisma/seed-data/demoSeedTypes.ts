import type { EmailRedFlagType, RedFlagSeverity } from '../../src/generated/prisma/enums.js';

export type DemoSeedId = string;

export type DemoSeedCredentials = {
  readonly email: string;
  readonly plaintextPassword: string;
};

export type DemoAnswerOptionSeed = {
  readonly id: DemoSeedId;
  readonly label: string;
  readonly text: string;
  readonly isCorrect: boolean;
  readonly position: number;
  readonly feedbackText?: string;
};

export type DemoRedFlagSeed = {
  readonly id: DemoSeedId;
  readonly redFlagType: EmailRedFlagType;
  readonly label: string;
  readonly description?: string;
  readonly severity: RedFlagSeverity;
};
