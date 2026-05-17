import {
  AuthStatus,
  AssignmentStatus,
  CampaignAccessType,
  CampaignComponentType,
  CampaignItemAvailabilityStatus,
  CampaignItemType,
  CampaignStatus,
  CampaignType,
  DifficultyLevel,
  EmailClassification,
  EmailRedFlagType,
  GeneralTraineeAccessSource,
  InboxStatus,
  QuestionType,
  QuizStatus,
  RedFlagSeverity,
  SafetyStatus,
  SimulationType,
  TraineeStatus,
  TrainingContentType,
  TrainingDocumentStatus,
  UserType,
} from '../../src/generated/prisma/enums.js';
import { buildAnswerOptionSeed, demoPosition, normaliseDemoEmail } from './demoSeedHelpers.js';

export const DEMO_SEED_VERSION = 'demo-1-foundation';
export const DEMO_ONLY_PASSWORD = 'DemoPassword123!';

export const DEMO_SEED_IDS = {
  users: {
    populatedTrainee: '11111111-1111-4111-8111-111111111111',
    emptyStateTrainee: '11111111-1111-4111-8111-111111111112',
    admin: '11111111-1111-4111-8111-111111111113',
  },
  traineeProfiles: {
    populated: '22222222-2222-4222-8222-222222222221',
    emptyState: '22222222-2222-4222-8222-222222222222',
  },
  generalTraineeProfiles: {
    populated: '22222222-2222-4222-8222-222222222223',
    emptyState: '22222222-2222-4222-8222-222222222224',
  },
  ipAdminProfile: '22222222-2222-4222-8222-222222222225',
  campaign: '33333333-3333-4333-8333-333333333331',
  campaignAssignments: {
    populatedTrainee: '33333333-3333-4333-8333-333333333332',
  },
  campaignItems: {
    trainingDocument: '33333333-3333-4333-8333-333333333333',
    quiz: '33333333-3333-4333-8333-333333333334',
    simulatedInbox: '33333333-3333-4333-8333-333333333335',
  },
  trainingDocuments: {
    phishingBasics: '44444444-4444-4444-8444-444444444441',
    linkSafety: '44444444-4444-4444-8444-444444444442',
  },
  quizzes: {
    phishingBasics: '55555555-5555-4555-8555-555555555551',
  },
  quizQuestions: {
    senderCheck: '55555555-5555-4555-8555-555555555552',
    urgentRequest: '55555555-5555-4555-8555-555555555553',
  },
  answerOptions: {
    senderCheckKnownContact: '55555555-5555-4555-8555-555555555554',
    senderCheckDomainMismatch: '55555555-5555-4555-8555-555555555555',
    urgentRequestActImmediately: '55555555-5555-4555-8555-555555555556',
    urgentRequestVerifyFirst: '55555555-5555-4555-8555-555555555557',
  },
  simulation: '66666666-6666-4666-8666-666666666661',
  simulatedInbox: '66666666-6666-4666-8666-666666666662',
  simulatedEmails: {
    payrollNotice: '77777777-7777-4777-8777-777777777771',
    securityDigest: '77777777-7777-4777-8777-777777777772',
  },
  redFlags: {
    payrollDomain: '88888888-8888-4888-8888-888888888881',
    payrollUrgency: '88888888-8888-4888-8888-888888888882',
  },
} as const;

export const DEMO_SEED_CREDENTIALS = {
  populatedTrainee: {
    email: normaliseDemoEmail('demo.populated.trainee@example.com'),
    plaintextPassword: DEMO_ONLY_PASSWORD,
  },
  emptyStateTrainee: {
    email: normaliseDemoEmail('demo.empty.trainee@example.com'),
    plaintextPassword: DEMO_ONLY_PASSWORD,
  },
  admin: {
    email: normaliseDemoEmail('demo.admin@example.com'),
    plaintextPassword: DEMO_ONLY_PASSWORD,
  },
} as const;

export const DEMO_SEED_USERS = {
  populatedTrainee: {
    id: DEMO_SEED_IDS.users.populatedTrainee,
    firstName: 'Demo',
    lastName: 'Populated Trainee',
    email: DEMO_SEED_CREDENTIALS.populatedTrainee.email,
    userType: UserType.GENERAL_TRAINEE,
    authStatus: AuthStatus.ACTIVE,
  },
  emptyStateTrainee: {
    id: DEMO_SEED_IDS.users.emptyStateTrainee,
    firstName: 'Demo',
    lastName: 'Empty Trainee',
    email: DEMO_SEED_CREDENTIALS.emptyStateTrainee.email,
    userType: UserType.GENERAL_TRAINEE,
    authStatus: AuthStatus.ACTIVE,
  },
  admin: {
    id: DEMO_SEED_IDS.users.admin,
    firstName: 'Demo',
    lastName: 'Admin',
    email: DEMO_SEED_CREDENTIALS.admin.email,
    userType: UserType.IP_ADMIN,
    authStatus: AuthStatus.ACTIVE,
  },
} as const;

export const DEMO_SEED_TRAINEE_PROFILES = {
  populated: {
    id: DEMO_SEED_IDS.traineeProfiles.populated,
    userId: DEMO_SEED_IDS.users.populatedTrainee,
    traineeStatus: TraineeStatus.ACTIVE,
    accessSource: GeneralTraineeAccessSource.SEED,
  },
  emptyState: {
    id: DEMO_SEED_IDS.traineeProfiles.emptyState,
    userId: DEMO_SEED_IDS.users.emptyStateTrainee,
    traineeStatus: TraineeStatus.ACTIVE,
    accessSource: GeneralTraineeAccessSource.SEED,
  },
} as const;

export const DEMO_SEED_CAMPAIGN = {
  id: DEMO_SEED_IDS.campaign,
  createdByUserId: DEMO_SEED_IDS.users.admin,
  name: 'Demo 1 Phishing Awareness',
  description: 'Repeatable demo campaign foundation for trainee training flows.',
  campaignType: CampaignType.PREMADE_GENERAL,
  difficultyLevel: DifficultyLevel.BEGINNER,
  status: CampaignStatus.ACTIVE,
} as const;

export const DEMO_SEED_CAMPAIGN_ASSIGNMENT = {
  id: DEMO_SEED_IDS.campaignAssignments.populatedTrainee,
  campaignId: DEMO_SEED_IDS.campaign,
  traineeProfileId: DEMO_SEED_IDS.traineeProfiles.populated,
  assignedByUserId: DEMO_SEED_IDS.users.admin,
  currentCampaignItemId: DEMO_SEED_IDS.campaignItems.trainingDocument,
  assignmentStatus: AssignmentStatus.ASSIGNED,
  accessType: CampaignAccessType.ASSIGNED,
} as const;

export const DEMO_SEED_TRAINING_DOCUMENTS = [
  {
    id: DEMO_SEED_IDS.trainingDocuments.phishingBasics,
    createdByUserId: DEMO_SEED_IDS.users.admin,
    title: 'Phishing Basics',
    contentType: TrainingContentType.HTML,
    contentRef: 'demo://training/phishing-basics',
    contentSummary: 'Foundational phishing awareness content for Demo 1.',
    estimatedReadTimeMinutes: 5,
    difficultyLevel: DifficultyLevel.BEGINNER,
    status: TrainingDocumentStatus.AVAILABLE,
  },
  {
    id: DEMO_SEED_IDS.trainingDocuments.linkSafety,
    createdByUserId: DEMO_SEED_IDS.users.admin,
    title: 'Safe Link Checks',
    contentType: TrainingContentType.HTML,
    contentRef: 'demo://training/safe-link-checks',
    contentSummary: 'Reusable link inspection guidance for Demo 1.',
    estimatedReadTimeMinutes: 4,
    difficultyLevel: DifficultyLevel.BEGINNER,
    status: TrainingDocumentStatus.AVAILABLE,
  },
] as const;

export const DEMO_SEED_QUIZ = {
  id: DEMO_SEED_IDS.quizzes.phishingBasics,
  createdByUserId: DEMO_SEED_IDS.users.admin,
  title: 'Phishing Basics Check',
  description: 'Short Demo 1 knowledge check.',
  passThresholdPercentage: 70,
  difficultyLevel: DifficultyLevel.BEGINNER,
  status: QuizStatus.PUBLISHED,
} as const;

export const DEMO_SEED_QUIZ_QUESTIONS = [
  {
    id: DEMO_SEED_IDS.quizQuestions.senderCheck,
    quizId: DEMO_SEED_IDS.quizzes.phishingBasics,
    prompt: 'What is the strongest sender warning sign?',
    questionType: QuestionType.SINGLE_CHOICE,
    position: demoPosition(0),
    points: 1,
    shuffleOptions: false,
    answerOptions: [
      buildAnswerOptionSeed(
        {
          id: DEMO_SEED_IDS.answerOptions.senderCheckKnownContact,
          label: 'A',
          text: 'The sender label is familiar.',
          isCorrect: false,
          feedbackText: 'A familiar label can be spoofed.',
        },
        0,
      ),
      buildAnswerOptionSeed(
        {
          id: DEMO_SEED_IDS.answerOptions.senderCheckDomainMismatch,
          label: 'B',
          text: 'The sender address domain does not match the claimed organisation.',
          isCorrect: true,
          feedbackText: 'Domain mismatches are a strong phishing signal.',
        },
        1,
      ),
    ],
  },
  {
    id: DEMO_SEED_IDS.quizQuestions.urgentRequest,
    quizId: DEMO_SEED_IDS.quizzes.phishingBasics,
    prompt: 'What should you do with an urgent payment request?',
    questionType: QuestionType.SINGLE_CHOICE,
    position: demoPosition(1),
    points: 1,
    shuffleOptions: false,
    answerOptions: [
      buildAnswerOptionSeed(
        {
          id: DEMO_SEED_IDS.answerOptions.urgentRequestActImmediately,
          label: 'A',
          text: 'Act immediately to avoid delays.',
          isCorrect: false,
          feedbackText: 'Urgency is often used to bypass normal checks.',
        },
        0,
      ),
      buildAnswerOptionSeed(
        {
          id: DEMO_SEED_IDS.answerOptions.urgentRequestVerifyFirst,
          label: 'B',
          text: 'Verify the request through a trusted channel first.',
          isCorrect: true,
          feedbackText: 'Verification keeps the workflow safe.',
        },
        1,
      ),
    ],
  },
] as const;

export const DEMO_SEED_SIMULATION = {
  id: DEMO_SEED_IDS.simulation,
  createdByUserId: DEMO_SEED_IDS.users.admin,
  simulationType: SimulationType.SIMULATED_INBOX,
  title: 'Demo 1 Simulated Inbox',
  description: 'Reusable simulated inbox exercise for Demo 1.',
  objective: 'Classify messages and identify warning signs.',
  safetyStatus: SafetyStatus.APPROVED,
  difficultyLevel: DifficultyLevel.BEGINNER,
} as const;

export const DEMO_SEED_SIMULATED_INBOX = {
  id: DEMO_SEED_IDS.simulatedInbox,
  simulationId: DEMO_SEED_IDS.simulation,
  title: 'Demo 1 Inbox',
  description: 'Inbox containing safe and suspicious demo messages.',
  status: InboxStatus.ACTIVE,
} as const;

export const DEMO_SEED_SIMULATED_EMAILS = [
  {
    id: DEMO_SEED_IDS.simulatedEmails.payrollNotice,
    inboxId: DEMO_SEED_IDS.simulatedInbox,
    senderLabel: 'Payroll Team',
    senderAddress: 'payroll@example-payments.test',
    subject: 'Urgent payroll confirmation needed',
    preview: 'Confirm your details before payroll closes.',
    bodyHtml: '<p>Please confirm your payroll details using the demo link.</p>',
    simulatedLinkTarget: 'https://example.com/demo-payroll-check',
    hasAttachment: false,
    expectedClassification: EmailClassification.PHISHING,
    difficultyLevel: DifficultyLevel.BEGINNER,
    redFlags: [
      {
        id: DEMO_SEED_IDS.redFlags.payrollDomain,
        redFlagType: EmailRedFlagType.DOMAIN,
        label: 'Unexpected sender domain',
        description: 'The sender domain does not match the claimed payroll team.',
        severity: RedFlagSeverity.HIGH,
      },
      {
        id: DEMO_SEED_IDS.redFlags.payrollUrgency,
        redFlagType: EmailRedFlagType.LANGUAGE,
        label: 'Urgent pressure',
        description: 'The message uses time pressure to prompt quick action.',
        severity: RedFlagSeverity.MEDIUM,
      },
    ],
  },
  {
    id: DEMO_SEED_IDS.simulatedEmails.securityDigest,
    inboxId: DEMO_SEED_IDS.simulatedInbox,
    senderLabel: 'Security Awareness',
    senderAddress: 'security@example.com',
    subject: 'Weekly security digest',
    preview: 'This week: safe reporting habits.',
    bodyHtml: '<p>Your weekly demo security digest is ready.</p>',
    hasAttachment: false,
    expectedClassification: EmailClassification.SAFE,
    difficultyLevel: DifficultyLevel.BEGINNER,
    redFlags: [],
  },
] as const;

export const DEMO_SEED_CAMPAIGN_ITEMS = [
  {
    id: DEMO_SEED_IDS.campaignItems.trainingDocument,
    campaignId: DEMO_SEED_IDS.campaign,
    itemType: CampaignItemType.COMPONENT,
    componentType: CampaignComponentType.TRAINING_DOCUMENT,
    title: 'Read phishing basics',
    description: 'Start with the reusable training document.',
    position: demoPosition(0),
    isRequired: true,
    availabilityStatus: CampaignItemAvailabilityStatus.AVAILABLE,
    trainingDocumentId: DEMO_SEED_IDS.trainingDocuments.phishingBasics,
  },
  {
    id: DEMO_SEED_IDS.campaignItems.quiz,
    campaignId: DEMO_SEED_IDS.campaign,
    itemType: CampaignItemType.COMPONENT,
    componentType: CampaignComponentType.QUIZ,
    title: 'Complete the knowledge check',
    description: 'Answer the Demo 1 quiz questions.',
    position: demoPosition(1),
    isRequired: true,
    availabilityStatus: CampaignItemAvailabilityStatus.AVAILABLE,
    quizId: DEMO_SEED_IDS.quizzes.phishingBasics,
  },
  {
    id: DEMO_SEED_IDS.campaignItems.simulatedInbox,
    campaignId: DEMO_SEED_IDS.campaign,
    itemType: CampaignItemType.COMPONENT,
    componentType: CampaignComponentType.SIMULATED_INBOX,
    title: 'Classify simulated emails',
    description: 'Use the reusable simulated inbox exercise.',
    position: demoPosition(2),
    isRequired: true,
    availabilityStatus: CampaignItemAvailabilityStatus.AVAILABLE,
    simulationId: DEMO_SEED_IDS.simulation,
  },
] as const;
