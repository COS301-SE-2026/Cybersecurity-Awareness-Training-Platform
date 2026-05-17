import type { EmailRedFlagType, RedFlagSeverity } from '../../src/generated/prisma/enums.js';

export type DemoSeedCredentials = {
  readonly email: string;
};

export type DemoAnswerOptionSeed = {
  readonly id: string;
  readonly label: string;
  readonly text: string;
  readonly isCorrect: boolean;
  readonly position: number;
  readonly feedbackText?: string;
};

export type DemoRedFlagSeed = {
  readonly id: string;
  readonly redFlagType: EmailRedFlagType;
  readonly label: string;
  readonly description?: string;
  readonly severity: RedFlagSeverity;
};
