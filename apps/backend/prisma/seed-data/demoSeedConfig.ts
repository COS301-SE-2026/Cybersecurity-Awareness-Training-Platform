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
import {
  buildAnswerOptionSeed,
  demoPosition,
  demoSeedDate,
  normaliseDemoEmail,
} from './demoSeedHelpers.js';

export const DEMO_SEED_VERSION = 'demo-1-content';

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
    warningSigns: '44444444-4444-4444-8444-444444444441',
    safeLinkHandling: '44444444-4444-4444-8444-444444444442',
  },
  quizzes: {
    warningSigns: '55555555-5555-4555-8555-555555555551',
    safeLinkHandling: '55555555-5555-4555-8555-555555555552',
  },
  quizQuestions: {
    spoofedSender: '55555555-5555-4555-8555-555555555561',
    urgentLanguage: '55555555-5555-4555-8555-555555555562',
    suspiciousAttachment: '55555555-5555-4555-8555-555555555563',
    credentialRequest: '55555555-5555-4555-8555-555555555564',
    reportingAction: '55555555-5555-4555-8555-555555555565',
    linkPreview: '55555555-5555-4555-8555-555555555566',
    passwordReuse: '55555555-5555-4555-8555-555555555567',
    mfaPrompt: '55555555-5555-4555-8555-555555555568',
    safeCredentialPage: '55555555-5555-4555-8555-555555555569',
    shortenedUrl: '55555555-5555-4555-8555-555555555570',
  },
  answerOptions: {
    spoofedSenderA: '55555555-5555-4555-8555-555555555601',
    spoofedSenderB: '55555555-5555-4555-8555-555555555602',
    spoofedSenderC: '55555555-5555-4555-8555-555555555603',
    urgentLanguageA: '55555555-5555-4555-8555-555555555604',
    urgentLanguageB: '55555555-5555-4555-8555-555555555605',
    urgentLanguageC: '55555555-5555-4555-8555-555555555606',
    suspiciousAttachmentA: '55555555-5555-4555-8555-555555555607',
    suspiciousAttachmentB: '55555555-5555-4555-8555-555555555608',
    suspiciousAttachmentC: '55555555-5555-4555-8555-555555555609',
    credentialRequestA: '55555555-5555-4555-8555-555555555610',
    credentialRequestB: '55555555-5555-4555-8555-555555555611',
    credentialRequestC: '55555555-5555-4555-8555-555555555612',
    reportingActionA: '55555555-5555-4555-8555-555555555613',
    reportingActionB: '55555555-5555-4555-8555-555555555614',
    reportingActionC: '55555555-5555-4555-8555-555555555615',
    linkPreviewA: '55555555-5555-4555-8555-555555555616',
    linkPreviewB: '55555555-5555-4555-8555-555555555617',
    linkPreviewC: '55555555-5555-4555-8555-555555555618',
    passwordReuseA: '55555555-5555-4555-8555-555555555619',
    passwordReuseB: '55555555-5555-4555-8555-555555555620',
    passwordReuseC: '55555555-5555-4555-8555-555555555621',
    mfaPromptA: '55555555-5555-4555-8555-555555555622',
    mfaPromptB: '55555555-5555-4555-8555-555555555623',
    mfaPromptC: '55555555-5555-4555-8555-555555555624',
    safeCredentialPageA: '55555555-5555-4555-8555-555555555625',
    safeCredentialPageB: '55555555-5555-4555-8555-555555555626',
    safeCredentialPageC: '55555555-5555-4555-8555-555555555627',
    shortenedUrlA: '55555555-5555-4555-8555-555555555628',
    shortenedUrlB: '55555555-5555-4555-8555-555555555629',
    shortenedUrlC: '55555555-5555-4555-8555-555555555630',
  },
  simulation: '66666666-6666-4666-8666-666666666661',
  simulatedInbox: '66666666-6666-4666-8666-666666666662',
  simulatedEmails: {
    payrollNotice: '77777777-7777-4777-8777-777777777771',
    invoiceAttachment: '77777777-7777-4777-8777-777777777772',
    securityDigest: '77777777-7777-4777-8777-777777777773',
    teamLunch: '77777777-7777-4777-8777-777777777774',
  },
  redFlags: {
    payrollSender: '88888888-8888-4888-8888-888888888881',
    payrollDomain: '88888888-8888-4888-8888-888888888882',
    payrollUrgency: '88888888-8888-4888-8888-888888888883',
    invoiceSender: '88888888-8888-4888-8888-888888888884',
    invoiceAttachment: '88888888-8888-4888-8888-888888888885',
    invoiceRequest: '88888888-8888-4888-8888-888888888886',
  },
} as const;

export const DEMO_SEED_CREDENTIALS = {
  populatedTrainee: {
    email: normaliseDemoEmail('demo.populated.trainee@example.com'),
  },
  emptyStateTrainee: {
    email: normaliseDemoEmail('demo.empty.trainee@example.com'),
  },
  admin: {
    email: normaliseDemoEmail('demo.admin@example.com'),
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
  description:
    'Repeatable demo campaign for phishing awareness, safe link handling, and inbox classification.',
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
    id: DEMO_SEED_IDS.trainingDocuments.warningSigns,
    createdByUserId: DEMO_SEED_IDS.users.admin,
    title: 'Phishing Email Warning Signs',
    contentType: TrainingContentType.HTML,
    contentRef: 'demo://training/phishing-warning-signs',
    contentSummary:
      'How to spot spoofed senders, urgent language, suspicious links, and risky attachments.',
    estimatedReadTimeMinutes: 6,
    difficultyLevel: DifficultyLevel.BEGINNER,
    status: TrainingDocumentStatus.AVAILABLE,
  },
  {
    id: DEMO_SEED_IDS.trainingDocuments.safeLinkHandling,
    createdByUserId: DEMO_SEED_IDS.users.admin,
    title: 'Safe Credential and Link Handling',
    contentType: TrainingContentType.HTML,
    contentRef: 'demo://training/safe-link-handling',
    contentSummary:
      'Practical steps for checking links, protecting credentials, and verifying sign-in prompts.',
    estimatedReadTimeMinutes: 5,
    difficultyLevel: DifficultyLevel.BEGINNER,
    status: TrainingDocumentStatus.AVAILABLE,
  },
] as const;

export const DEMO_SEED_QUIZZES = [
  {
    id: DEMO_SEED_IDS.quizzes.warningSigns,
    createdByUserId: DEMO_SEED_IDS.users.admin,
    title: 'Phishing Warning Signs Check',
    description: 'Knowledge check on sender, language, attachment, credential, and reporting cues.',
    passThresholdPercentage: 80,
    difficultyLevel: DifficultyLevel.BEGINNER,
    status: QuizStatus.PUBLISHED,
    questions: [
      {
        id: DEMO_SEED_IDS.quizQuestions.spoofedSender,
        prompt: 'Which sender detail is the strongest warning sign?',
        questionType: QuestionType.SINGLE_CHOICE,
        position: demoPosition(0),
        points: 1,
        shuffleOptions: false,
        answerOptions: [
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.spoofedSenderA,
              label: 'A',
              text: 'The sender display name is familiar.',
              isCorrect: false,
              feedbackText: 'Display names can be spoofed and should not be trusted alone.',
            },
            0,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.spoofedSenderB,
              label: 'B',
              text: 'The email domain does not match the claimed organisation.',
              isCorrect: true,
              feedbackText: 'A mismatched domain is a strong spoofing indicator.',
            },
            1,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.spoofedSenderC,
              label: 'C',
              text: 'The message has a short subject line.',
              isCorrect: false,
              feedbackText: 'A short subject is not enough to identify phishing.',
            },
            2,
          ),
        ],
      },
      {
        id: DEMO_SEED_IDS.quizQuestions.urgentLanguage,
        prompt: 'Why is urgent language a common phishing signal?',
        questionType: QuestionType.SINGLE_CHOICE,
        position: demoPosition(1),
        points: 1,
        shuffleOptions: false,
        answerOptions: [
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.urgentLanguageA,
              label: 'A',
              text: 'It pressures people to skip normal checks.',
              isCorrect: true,
              feedbackText: 'Urgency is often used to rush unsafe decisions.',
            },
            0,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.urgentLanguageB,
              label: 'B',
              text: 'It always means the sender is legitimate.',
              isCorrect: false,
              feedbackText:
                'Legitimate requests can be urgent, but urgency should still be verified.',
            },
            1,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.urgentLanguageC,
              label: 'C',
              text: 'It replaces the need to check the sender.',
              isCorrect: false,
              feedbackText: 'Sender, link, request, and context checks all still matter.',
            },
            2,
          ),
        ],
      },
      {
        id: DEMO_SEED_IDS.quizQuestions.suspiciousAttachment,
        prompt: 'What should you do with an unexpected invoice attachment?',
        questionType: QuestionType.SINGLE_CHOICE,
        position: demoPosition(2),
        points: 1,
        shuffleOptions: false,
        answerOptions: [
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.suspiciousAttachmentA,
              label: 'A',
              text: 'Open it quickly to see whether it is relevant.',
              isCorrect: false,
              feedbackText: 'Unexpected attachments should be treated cautiously.',
            },
            0,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.suspiciousAttachmentB,
              label: 'B',
              text: 'Verify the sender and request through a trusted channel first.',
              isCorrect: true,
              feedbackText: 'Independent verification helps prevent malware and credential theft.',
            },
            1,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.suspiciousAttachmentC,
              label: 'C',
              text: 'Forward it to more colleagues for review.',
              isCorrect: false,
              feedbackText: 'Forwarding suspicious attachments can spread risk.',
            },
            2,
          ),
        ],
      },
      {
        id: DEMO_SEED_IDS.quizQuestions.credentialRequest,
        prompt: 'What is the safest response to an email asking for your password?',
        questionType: QuestionType.SINGLE_CHOICE,
        position: demoPosition(3),
        points: 1,
        shuffleOptions: false,
        answerOptions: [
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.credentialRequestA,
              label: 'A',
              text: 'Reply with the password if the email looks official.',
              isCorrect: false,
              feedbackText: 'Passwords should not be shared by email.',
            },
            0,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.credentialRequestB,
              label: 'B',
              text: 'Use the link in the email to update your password.',
              isCorrect: false,
              feedbackText:
                'Links in credential requests should be treated as risky until verified.',
            },
            1,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.credentialRequestC,
              label: 'C',
              text: 'Do not share it and report the request through the approved channel.',
              isCorrect: true,
              feedbackText: 'Reporting protects both your account and the organisation.',
            },
            2,
          ),
        ],
      },
      {
        id: DEMO_SEED_IDS.quizQuestions.reportingAction,
        prompt: 'What is the best action after identifying a likely phishing email?',
        questionType: QuestionType.SINGLE_CHOICE,
        position: demoPosition(4),
        points: 1,
        shuffleOptions: false,
        answerOptions: [
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.reportingActionA,
              label: 'A',
              text: 'Report it using the approved security process.',
              isCorrect: true,
              feedbackText: 'Reporting gives security teams the context they need.',
            },
            0,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.reportingActionB,
              label: 'B',
              text: 'Ignore it and leave it in your inbox.',
              isCorrect: false,
              feedbackText: 'Ignoring suspected phishing can leave risk for others.',
            },
            1,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.reportingActionC,
              label: 'C',
              text: 'Click the link to confirm whether it is malicious.',
              isCorrect: false,
              feedbackText: 'Do not test suspicious links with your own account or device.',
            },
            2,
          ),
        ],
      },
    ],
  },
  {
    id: DEMO_SEED_IDS.quizzes.safeLinkHandling,
    createdByUserId: DEMO_SEED_IDS.users.admin,
    title: 'Safe Link and Credential Handling Check',
    description:
      'Knowledge check on link previews, password reuse, MFA prompts, and safe sign-in habits.',
    passThresholdPercentage: 80,
    difficultyLevel: DifficultyLevel.BEGINNER,
    status: QuizStatus.PUBLISHED,
    questions: [
      {
        id: DEMO_SEED_IDS.quizQuestions.linkPreview,
        prompt: 'What should you check before opening a link from an email?',
        questionType: QuestionType.SINGLE_CHOICE,
        position: demoPosition(0),
        points: 1,
        shuffleOptions: false,
        answerOptions: [
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.linkPreviewA,
              label: 'A',
              text: 'Whether the visible text looks friendly.',
              isCorrect: false,
              feedbackText: 'Friendly link text can hide a different destination.',
            },
            0,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.linkPreviewB,
              label: 'B',
              text: 'Whether the actual destination matches the expected service.',
              isCorrect: true,
              feedbackText: 'Checking the actual destination helps catch spoofed links.',
            },
            1,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.linkPreviewC,
              label: 'C',
              text: 'Whether the email was sent today.',
              isCorrect: false,
              feedbackText: 'Fresh emails can still be malicious.',
            },
            2,
          ),
        ],
      },
      {
        id: DEMO_SEED_IDS.quizQuestions.passwordReuse,
        prompt: 'Why is password reuse risky?',
        questionType: QuestionType.SINGLE_CHOICE,
        position: demoPosition(1),
        points: 1,
        shuffleOptions: false,
        answerOptions: [
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.passwordReuseA,
              label: 'A',
              text: 'One stolen password can unlock multiple accounts.',
              isCorrect: true,
              feedbackText: 'Unique passwords limit damage from credential theft.',
            },
            0,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.passwordReuseB,
              label: 'B',
              text: 'It makes passwords too long to remember.',
              isCorrect: false,
              feedbackText: 'The risk is account compromise across services, not length.',
            },
            1,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.passwordReuseC,
              label: 'C',
              text: 'It disables account recovery automatically.',
              isCorrect: false,
              feedbackText: 'Password reuse does not automatically disable recovery.',
            },
            2,
          ),
        ],
      },
      {
        id: DEMO_SEED_IDS.quizQuestions.mfaPrompt,
        prompt: 'What should you do with an unexpected MFA prompt?',
        questionType: QuestionType.SINGLE_CHOICE,
        position: demoPosition(2),
        points: 1,
        shuffleOptions: false,
        answerOptions: [
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.mfaPromptA,
              label: 'A',
              text: 'Approve it to clear the notification.',
              isCorrect: false,
              feedbackText: 'Unexpected prompts may mean someone has your password.',
            },
            0,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.mfaPromptB,
              label: 'B',
              text: 'Deny it and report the activity.',
              isCorrect: true,
              feedbackText: 'Denying and reporting helps stop account takeover attempts.',
            },
            1,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.mfaPromptC,
              label: 'C',
              text: 'Ignore repeated prompts forever.',
              isCorrect: false,
              feedbackText: 'Repeated prompts should be reported.',
            },
            2,
          ),
        ],
      },
      {
        id: DEMO_SEED_IDS.quizQuestions.safeCredentialPage,
        prompt: 'What is the safest way to sign in after receiving a password reset email?',
        questionType: QuestionType.SINGLE_CHOICE,
        position: demoPosition(3),
        points: 1,
        shuffleOptions: false,
        answerOptions: [
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.safeCredentialPageA,
              label: 'A',
              text: 'Open the service from a trusted bookmark or typed address.',
              isCorrect: true,
              feedbackText: 'Navigating independently reduces the chance of using a spoofed page.',
            },
            0,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.safeCredentialPageB,
              label: 'B',
              text: 'Use the first link in the email without checking it.',
              isCorrect: false,
              feedbackText: 'Credential links should be verified before use.',
            },
            1,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.safeCredentialPageC,
              label: 'C',
              text: 'Send your password to support for confirmation.',
              isCorrect: false,
              feedbackText: 'Support teams should never need your password.',
            },
            2,
          ),
        ],
      },
      {
        id: DEMO_SEED_IDS.quizQuestions.shortenedUrl,
        prompt: 'Why should shortened URLs be handled carefully?',
        questionType: QuestionType.SINGLE_CHOICE,
        position: demoPosition(4),
        points: 1,
        shuffleOptions: false,
        answerOptions: [
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.shortenedUrlA,
              label: 'A',
              text: 'They can hide the true destination.',
              isCorrect: true,
              feedbackText: 'Hidden destinations make it harder to judge whether a link is safe.',
            },
            0,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.shortenedUrlB,
              label: 'B',
              text: 'They always point to internal systems.',
              isCorrect: false,
              feedbackText: 'Shortened links can point anywhere.',
            },
            1,
          ),
          buildAnswerOptionSeed(
            {
              id: DEMO_SEED_IDS.answerOptions.shortenedUrlC,
              label: 'C',
              text: 'They remove the need for MFA.',
              isCorrect: false,
              feedbackText: 'URL length does not affect MFA requirements.',
            },
            2,
          ),
        ],
      },
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
    bodyHtml: '<p>Please confirm your payroll details using the demo link before 17:00 today.</p>',
    simulatedLinkTarget: 'https://example.com/demo-payroll-check',
    hasAttachment: false,
    receivedAt: demoSeedDate('2026-05-17T08:30:00.000Z'),
    expectedClassification: EmailClassification.PHISHING,
    difficultyLevel: DifficultyLevel.BEGINNER,
    redFlags: [
      {
        id: DEMO_SEED_IDS.redFlags.payrollSender,
        redFlagType: EmailRedFlagType.SENDER,
        label: 'Unexpected sender',
        description: 'The sender claims to be payroll but uses an unfamiliar sender identity.',
        severity: RedFlagSeverity.MEDIUM,
      },
      {
        id: DEMO_SEED_IDS.redFlags.payrollDomain,
        redFlagType: EmailRedFlagType.DOMAIN,
        label: 'Mismatched domain',
        description: 'The sender domain does not match the claimed payroll team.',
        severity: RedFlagSeverity.HIGH,
      },
      {
        id: DEMO_SEED_IDS.redFlags.payrollUrgency,
        redFlagType: EmailRedFlagType.LANGUAGE,
        label: 'Urgent pressure',
        description: 'The message uses time pressure to push quick action.',
        severity: RedFlagSeverity.MEDIUM,
      },
    ],
  },
  {
    id: DEMO_SEED_IDS.simulatedEmails.invoiceAttachment,
    inboxId: DEMO_SEED_IDS.simulatedInbox,
    senderLabel: 'Northwind Billing',
    senderAddress: 'billing@northwind-invoices.test',
    subject: 'Overdue invoice attached',
    preview: 'Open the attached invoice and arrange payment immediately.',
    bodyHtml:
      '<p>Your invoice is overdue. Open the attached file and process payment immediately.</p>',
    simulatedLinkTarget: null,
    hasAttachment: true,
    receivedAt: demoSeedDate('2026-05-17T09:15:00.000Z'),
    expectedClassification: EmailClassification.SUSPICIOUS,
    difficultyLevel: DifficultyLevel.INTERMEDIATE,
    redFlags: [
      {
        id: DEMO_SEED_IDS.redFlags.invoiceSender,
        redFlagType: EmailRedFlagType.SENDER,
        label: 'Unverified vendor',
        description: 'The vendor relationship is unclear and should be verified.',
        severity: RedFlagSeverity.MEDIUM,
      },
      {
        id: DEMO_SEED_IDS.redFlags.invoiceAttachment,
        redFlagType: EmailRedFlagType.ATTACHMENT,
        label: 'Unexpected attachment',
        description: 'Unexpected invoice attachments can carry malware or phishing payloads.',
        severity: RedFlagSeverity.HIGH,
      },
      {
        id: DEMO_SEED_IDS.redFlags.invoiceRequest,
        redFlagType: EmailRedFlagType.REQUEST,
        label: 'Payment pressure',
        description: 'The request pushes immediate payment without normal verification.',
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
    bodyHtml: '<p>Your weekly demo security digest is ready. No action is required.</p>',
    simulatedLinkTarget: 'https://example.com/security-digest',
    hasAttachment: false,
    receivedAt: demoSeedDate('2026-05-17T10:00:00.000Z'),
    expectedClassification: EmailClassification.SAFE,
    difficultyLevel: DifficultyLevel.BEGINNER,
    redFlags: [],
  },
  {
    id: DEMO_SEED_IDS.simulatedEmails.teamLunch,
    inboxId: DEMO_SEED_IDS.simulatedInbox,
    senderLabel: 'People Team',
    senderAddress: 'people@example.com',
    subject: 'Team lunch menu poll',
    preview: 'Choose your lunch option by Friday.',
    bodyHtml: '<p>Please choose your lunch option in the regular team form by Friday.</p>',
    simulatedLinkTarget: 'https://example.com/team-lunch-poll',
    hasAttachment: false,
    receivedAt: demoSeedDate('2026-05-17T11:30:00.000Z'),
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
    title: 'Read phishing warning signs',
    description: 'Start with the reusable phishing warning signs training document.',
    position: demoPosition(0),
    isRequired: true,
    availabilityStatus: CampaignItemAvailabilityStatus.AVAILABLE,
    trainingDocumentId: DEMO_SEED_IDS.trainingDocuments.warningSigns,
  },
  {
    id: DEMO_SEED_IDS.campaignItems.quiz,
    campaignId: DEMO_SEED_IDS.campaign,
    itemType: CampaignItemType.COMPONENT,
    componentType: CampaignComponentType.QUIZ,
    title: 'Complete the warning signs check',
    description: 'Answer the Demo 1 phishing warning signs quiz.',
    position: demoPosition(1),
    isRequired: true,
    availabilityStatus: CampaignItemAvailabilityStatus.AVAILABLE,
    quizId: DEMO_SEED_IDS.quizzes.warningSigns,
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
