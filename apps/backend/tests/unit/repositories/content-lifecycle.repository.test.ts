import type { QuizDraftInput } from '@insightful-phish/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as ContentLifecycleRepository from '../../../src/repositories/content-lifecycle.repository.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => {
  const mockPrisma = {
    trainingDocument: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    quiz: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    quizQuestion: {
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    answerOption: {
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    quizAttempt: {
      count: vi.fn(),
    },
    simulation: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    simulatedInbox: {
      update: vi.fn(),
    },
    simulatedEmail: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

describe('ContentLifecycleRepository', () => {
  it('guards draft updates by owner and status', async () => {
    vi.mocked(prisma.trainingDocument.update).mockResolvedValue({
      id: 'doc-1',
      organisationId: 'org-1',
      createdByUserId: 'user-1',
      title: 'Updated',
      contentType: 'MARKDOWN',
      contentRef: 'content',
      contentSummary: null,
      rawMarkdown: null,
      estimatedReadTimeMinutes: null,
      categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
      difficultyLevel: 'EASY',
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await ContentLifecycleRepository.updateTrainingDocumentDraft('doc-1', 'org-1', {
      title: 'Updated',
    });

    expect(prisma.trainingDocument.update).toHaveBeenCalledWith({
      where: {
        id: 'doc-1',
        organisationId: 'org-1',
        status: 'DRAFT',
      },
      data: { title: 'Updated' },
    });
  });

  it('does not activate a simulation without an inbox', async () => {
    vi.mocked(prisma.simulation.update).mockResolvedValue({
      id: 'sim-1',
      organisationId: 'org-1',
      createdByUserId: 'user-1',
      simulationType: 'SIMULATED_INBOX',
      title: 'Simulation',
      description: null,
      objective: null,
      safetyStatus: 'APPROVED',
      difficultyLevel: 'EASY',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.simulatedInbox.update).mockRejectedValue({ code: 'P2025' });

    const activated = await ContentLifecycleRepository.activateSimulation('sim-1', 'org-1');

    expect(activated).toBeNull();
    expect(prisma.simulatedInbox.update).toHaveBeenCalledWith({
      where: { simulationId: 'sim-1' },
      data: { status: 'ACTIVE' },
    });
  });

  it('reconciles simulation emails by ID without recreating retained snapshots', async () => {
    vi.mocked(prisma.simulation.update).mockResolvedValue({
      id: 'sim-1',
      organisationId: 'org-1',
      createdByUserId: 'user-1',
      simulationType: 'SIMULATED_INBOX',
      title: 'Updated',
      description: 'Description',
      objective: null,
      safetyStatus: 'DRAFT',
      difficultyLevel: 'MEDIUM',
      createdAt: new Date(),
      updatedAt: new Date(),
      simulatedInbox: {
        id: 'inbox-1',
        simulationId: 'sim-1',
        title: 'Updated',
        description: 'Description',
        status: 'ARCHIVED',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as never);
    vi.mocked(prisma.simulatedEmail.findMany).mockResolvedValue([
      { id: 'email-1', position: 0 },
      { id: 'email-2', position: 1 },
    ] as never);
    vi.mocked(prisma.simulatedEmail.update).mockResolvedValue({ id: 'email-1' } as never);
    vi.mocked(prisma.simulatedInbox.update).mockResolvedValue({ id: 'inbox-1' } as never);
    vi.mocked(prisma.simulation.findUniqueOrThrow).mockResolvedValue({ id: 'sim-1' } as never);

    await ContentLifecycleRepository.updateSimulationDraft('sim-1', 'org-1', {
      title: 'Updated',
      emails: [
        {
          id: 'email-1',
          sourceOrganisationEmailId: 'source-must-remain-unchanged',
          position: 0,
          senderLabel: 'Security',
          senderAddress: 'security@example.test',
          subject: 'Review',
          preview: 'Review pending',
          bodyHtml: '<p>Review</p>',
          link: null,
          expectedClassification: 'SAFE',
          redFlags: [],
          categories: ['PASSWORDS_AND_AUTHENTICATION'],
          difficultyLevel: 'HARD',
        },
      ],
    });

    expect(prisma.simulatedEmail.deleteMany).toHaveBeenCalledWith({
      where: { inboxId: 'inbox-1', id: { notIn: ['email-1'] } },
    });
    expect(prisma.simulatedEmail.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'email-1', inboxId: 'inbox-1' },
        data: expect.not.objectContaining({ sourceOrganisationEmailId: expect.anything() }),
      }),
    );
    expect(prisma.simulatedEmail.create).not.toHaveBeenCalled();
  });

  const targetOrgId = 'org-target-uuid';
  const userId = 'user-creator-uuid';

  it('copyTrainingDocument clones content fields into DRAFT status and target org', async () => {
    vi.mocked(prisma.trainingDocument.findFirst).mockResolvedValue({
      id: 'doc-source',
      organisationId: null,
      createdByUserId: 'platform-user',
      title: 'Original Doc',
      contentType: 'MARKDOWN',
      contentRef: 's3://bucket/key',
      contentSummary: 'Original Summary',
      rawMarkdown: null,
      estimatedReadTimeMinutes: 12,
      categories: ['DATA_DEVICE_AND_ACCOUNT_SAFETY'],
      difficultyLevel: 'MEDIUM',
      status: 'AVAILABLE',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    });

    vi.mocked(prisma.trainingDocument.create).mockResolvedValue({
      id: 'doc-new',
      organisationId: targetOrgId,
      createdByUserId: userId,
      title: 'Original Doc (Copy)',
      contentType: 'MARKDOWN',
      contentRef: 's3://bucket/key',
      contentSummary: 'Original Summary',
      rawMarkdown: null,
      estimatedReadTimeMinutes: 12,
      categories: ['DATA_DEVICE_AND_ACCOUNT_SAFETY'],
      difficultyLevel: 'MEDIUM',
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const copy = await ContentLifecycleRepository.copyTrainingDocument(
      'doc-source',
      targetOrgId,
      userId,
    );

    expect(prisma.trainingDocument.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'doc-source',
        status: { in: ['AVAILABLE', 'ARCHIVED'] },
        OR: [{ organisationId: null }, { organisationId: targetOrgId }],
      },
    });
    expect(prisma.trainingDocument.create).toHaveBeenCalledWith({
      data: {
        organisationId: targetOrgId,
        createdByUserId: userId,
        title: 'Original Doc (Copy)',
        contentType: 'MARKDOWN',
        contentRef: 's3://bucket/key',
        rawMarkdown: null,
        contentSummary: 'Original Summary',
        estimatedReadTimeMinutes: 12,
        categories: ['DATA_DEVICE_AND_ACCOUNT_SAFETY'],
        difficultyLevel: 'MEDIUM',
        status: 'DRAFT',
      },
    });
    expect(copy?.status).toBe('DRAFT');
    expect(copy?.organisationId).toBe(targetOrgId);
  });

  describe('updateQuizDraft', () => {
    const quizId = '11111111-1111-4111-8111-111111111111';
    const organisationId = '22222222-2222-4222-8222-222222222222';
    const questionId = '33333333-3333-4333-8333-333333333333';
    const otherQuestionId = '44444444-4444-4444-8444-444444444444';
    const createdQuestionId = '55555555-5555-4555-8555-555555555555';
    const optionId = '66666666-6666-4666-8666-666666666666';
    const otherOptionId = '77777777-7777-4777-8777-777777777777';
    const createdOptionId = '88888888-8888-4888-8888-888888888888';
    const foreignId = '99999999-9999-4999-8999-999999999999';

    type DraftQuestion = QuizDraftInput['questions'][number];
    type SingleChoiceQuestion = Extract<DraftQuestion, { questionType: 'SINGLE_CHOICE' }>;
    type DraftOption = SingleChoiceQuestion['answerOptions'][number];

    function optionInput(overrides: Partial<DraftOption> = {}): DraftOption {
      return {
        label: 'A',
        text: 'Correct answer',
        position: 0,
        isCorrect: true,
        feedbackText: null,
        ...overrides,
      };
    }

    function questionInput(overrides: Partial<SingleChoiceQuestion> = {}): SingleChoiceQuestion {
      return {
        prompt: 'Which answer is correct?',
        questionType: 'SINGLE_CHOICE',
        position: 0,
        points: 1,
        shuffleOptions: false,
        categories: ['PASSWORDS_AND_AUTHENTICATION'],
        answerOptions: [optionInput()],
        ...overrides,
      };
    }

    function draftInput(questions: QuizDraftInput['questions']): QuizDraftInput {
      return {
        title: 'Updated Quiz',
        description: null,
        passThresholdPercentage: 70,
        difficultyLevel: 'EASY',
        questions,
      };
    }

    function persistedOption(id: string, parentQuestionId: string, position = 0) {
      return {
        id,
        questionId: parentQuestionId,
        label: 'A',
        text: 'Existing answer',
        isCorrect: true,
        position,
        feedbackText: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    function persistedQuestion(
      id: string,
      position: number,
      answerOptions: ReturnType<typeof persistedOption>[],
    ) {
      return {
        id,
        quizId,
        prompt: 'Existing question',
        questionType: 'SINGLE_CHOICE',
        position,
        points: 1,
        shuffleOptions: false,
        minSelections: null,
        maxSelections: null,
        categories: ['PASSWORDS_AND_AUTHENTICATION'],
        createdAt: new Date(),
        updatedAt: new Date(),
        answerOptions,
      };
    }

    function setDefaultMocks() {
      vi.mocked(prisma.quiz.update).mockResolvedValue({ id: quizId } as never);
      vi.mocked(prisma.quizQuestion.findMany).mockResolvedValue([]);
      vi.mocked(prisma.quizAttempt.count).mockResolvedValue(0);
      vi.mocked(prisma.quizQuestion.update).mockResolvedValue({ id: questionId } as never);
      vi.mocked(prisma.quizQuestion.create).mockResolvedValue({ id: createdQuestionId } as never);
      vi.mocked(prisma.quizQuestion.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.answerOption.update).mockResolvedValue({ id: optionId } as never);
      vi.mocked(prisma.answerOption.create).mockResolvedValue({ id: createdOptionId } as never);
      vi.mocked(prisma.answerOption.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.quiz.findUniqueOrThrow).mockResolvedValue({
        id: quizId,
        questions: [],
      } as never);
    }

    beforeEach(() => {
      vi.clearAllMocks();
      setDefaultMocks();
    });

    it('updates existing question and option IDs in place', async () => {
      vi.mocked(prisma.quizQuestion.findMany).mockResolvedValue([
        persistedQuestion(questionId, 0, [persistedOption(optionId, questionId)]),
      ] as never);

      await ContentLifecycleRepository.updateQuizDraft(
        quizId,
        organisationId,
        draftInput([
          questionInput({
            id: questionId,
            prompt: 'Updated question',
            points: 3,
            answerOptions: [
              optionInput({
                id: optionId,
                text: 'Updated answer',
                feedbackText: 'Updated feedback',
              }),
            ],
          }),
        ]),
      );

      expect(prisma.quizQuestion.update).toHaveBeenCalledWith({
        where: { id: questionId },
        data: {
          prompt: 'Updated question',
          questionType: 'SINGLE_CHOICE',
          position: 0,
          points: 3,
          shuffleOptions: false,
          minSelections: null,
          maxSelections: null,
          categories: ['PASSWORDS_AND_AUTHENTICATION'],
        },
      });
      expect(prisma.answerOption.update).toHaveBeenCalledWith({
        where: { id: optionId },
        data: {
          label: 'A',
          text: 'Updated answer',
          position: 0,
          isCorrect: true,
          feedbackText: 'Updated feedback',
        },
      });
      expect(prisma.quizQuestion.create).not.toHaveBeenCalled();
      expect(prisma.answerOption.create).not.toHaveBeenCalled();
    });

    it('retains a newly generated question ID during cleanup', async () => {
      vi.mocked(prisma.quizQuestion.findMany).mockResolvedValue([
        persistedQuestion(questionId, 0, [persistedOption(optionId, questionId)]),
      ] as never);

      await ContentLifecycleRepository.updateQuizDraft(
        quizId,
        organisationId,
        draftInput([
          questionInput({
            id: questionId,
            answerOptions: [optionInput({ id: optionId })],
          }),
          questionInput({
            prompt: 'New question',
            position: 1,
          }),
        ]),
      );

      expect(prisma.quizQuestion.create).toHaveBeenCalled();
      expect(prisma.quizQuestion.deleteMany).toHaveBeenCalledWith({
        where: {
          quizId,
          id: {
            notIn: [questionId, createdQuestionId],
          },
        },
      });
    });

    it('retains a newly generated option ID during cleanup', async () => {
      vi.mocked(prisma.quizQuestion.findMany).mockResolvedValue([
        persistedQuestion(questionId, 0, [persistedOption(optionId, questionId)]),
      ] as never);

      await ContentLifecycleRepository.updateQuizDraft(
        quizId,
        organisationId,
        draftInput([
          questionInput({
            id: questionId,
            answerOptions: [
              optionInput({ id: optionId }),
              optionInput({
                label: 'B',
                text: 'New incorrect answer',
                position: 1,
                isCorrect: false,
              }),
            ],
          }),
        ]),
      );

      expect(prisma.answerOption.create).toHaveBeenCalled();
      expect(prisma.answerOption.deleteMany).toHaveBeenCalledWith({
        where: {
          questionId,
          id: {
            notIn: [optionId, createdOptionId],
          },
        },
      });
    });

    it('rejects invalid nested IDs', async () => {
      const cases: Array<{
        existingQuestions: unknown[];
        questions: QuizDraftInput['questions'];
        expectedCode: 'INVALID_QUESTION_ID' | 'INVALID_ANSWER_OPTION_ID';
        questionCreateAllowed: boolean;
      }> = [
        {
          existingQuestions: [
            persistedQuestion(questionId, 0, [persistedOption(optionId, questionId)]),
          ],
          questions: [
            questionInput({
              id: foreignId,
              answerOptions: [optionInput({ id: optionId })],
            }),
          ],
          expectedCode: 'INVALID_QUESTION_ID',
          questionCreateAllowed: false,
        },
        {
          existingQuestions: [
            persistedQuestion(questionId, 0, [persistedOption(optionId, questionId)]),
            persistedQuestion(otherQuestionId, 1, [
              persistedOption(otherOptionId, otherQuestionId),
            ]),
          ],
          questions: [
            questionInput({
              id: questionId,
              answerOptions: [optionInput({ id: otherOptionId })],
            }),
            questionInput({
              id: otherQuestionId,
              position: 1,
              answerOptions: [optionInput({ id: otherOptionId })],
            }),
          ],
          expectedCode: 'INVALID_ANSWER_OPTION_ID',
          questionCreateAllowed: false,
        },
        {
          existingQuestions: [],
          questions: [
            questionInput({
              answerOptions: [optionInput({ id: foreignId })],
            }),
          ],
          expectedCode: 'INVALID_ANSWER_OPTION_ID',
          questionCreateAllowed: false,
        },
      ];

      for (const testCase of cases) {
        vi.clearAllMocks();
        setDefaultMocks();
        vi.mocked(prisma.quizQuestion.findMany).mockResolvedValue(
          testCase.existingQuestions as never,
        );

        await expect(
          ContentLifecycleRepository.updateQuizDraft(
            quizId,
            organisationId,
            draftInput(testCase.questions),
          ),
        ).rejects.toMatchObject({
          code: testCase.expectedCode,
        });
        if (!testCase.questionCreateAllowed) {
          expect(prisma.quizQuestion.create).not.toHaveBeenCalled();
        }
        expect(prisma.answerOption.create).not.toHaveBeenCalled();
        expect(prisma.answerOption.deleteMany).not.toHaveBeenCalled();
      }
    });

    it('blocks structural synchronization when attempt history exists', async () => {
      vi.mocked(prisma.quizQuestion.findMany).mockResolvedValue([
        persistedQuestion(questionId, 0, [persistedOption(optionId, questionId)]),
      ] as never);
      vi.mocked(prisma.quizAttempt.count).mockResolvedValue(1);

      await expect(
        ContentLifecycleRepository.updateQuizDraft(quizId, organisationId, draftInput([])),
      ).rejects.toMatchObject({
        code: 'QUIZ_HAS_ATTEMPTS',
      });

      expect(prisma.quizQuestion.update).not.toHaveBeenCalled();
      expect(prisma.quizQuestion.create).not.toHaveBeenCalled();
      expect(prisma.quizQuestion.deleteMany).not.toHaveBeenCalled();
      expect(prisma.answerOption.update).not.toHaveBeenCalled();
      expect(prisma.answerOption.create).not.toHaveBeenCalled();
      expect(prisma.answerOption.deleteMany).not.toHaveBeenCalled();
    });
  });

  it('copyQuiz clones questions and answer options without attempt history', async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue({
      id: 'quiz-source',
      organisationId: null,
      createdByUserId: 'platform-user',
      title: 'Original Quiz',
      description: 'Quiz Description',
      passThresholdPercentage: 80,
      difficultyLevel: 'EASY',
      status: 'PUBLISHED',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      questions: [
        {
          id: 'q1',
          quizId: 'quiz-source',
          prompt: 'What is phishing?',
          questionType: 'SINGLE_CHOICE',
          position: 0,
          points: 1,
          shuffleOptions: true,
          minSelections: null,
          maxSelections: null,
          categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
          createdAt: new Date(),
          updatedAt: new Date(),
          answerOptions: [
            {
              id: 'opt1',
              questionId: 'q1',
              label: 'A',
              text: 'Social engineering attack',
              isCorrect: true,
              position: 0,
              feedbackText: 'Correct!',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      ],
    } as never);

    vi.mocked(prisma.quiz.create).mockResolvedValue({
      id: 'quiz-new',
      organisationId: targetOrgId,
      createdByUserId: userId,
      title: 'Original Quiz (Copy)',
      description: 'Quiz Description',
      passThresholdPercentage: 80,
      difficultyLevel: 'EASY',
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const copy = await ContentLifecycleRepository.copyQuiz('quiz-source', targetOrgId, userId);

    expect(prisma.quiz.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organisationId: targetOrgId,
        createdByUserId: userId,
        title: 'Original Quiz (Copy)',
        status: 'DRAFT',
        questions: {
          create: [
            {
              prompt: 'What is phishing?',
              questionType: 'SINGLE_CHOICE',
              position: 0,
              points: 1,
              shuffleOptions: true,
              minSelections: null,
              maxSelections: null,
              categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
              answerOptions: {
                create: [
                  {
                    label: 'A',
                    text: 'Social engineering attack',
                    isCorrect: true,
                    position: 0,
                    feedbackText: 'Correct!',
                  },
                ],
              },
            },
          ],
        },
      }),
      include: expect.any(Object),
    });
    expect(copy?.status).toBe('DRAFT');
  });

  it('copySimulation clones inbox, emails, and red flags in DRAFT status', async () => {
    vi.mocked(prisma.simulation.findFirst).mockResolvedValue({
      id: 'sim-source',
      organisationId: null,
      createdByUserId: null,
      simulationType: 'SIMULATED_INBOX',
      title: 'Sim Inbox',
      description: 'Test Sim',
      objective: 'Spot links',
      safetyStatus: 'APPROVED',
      difficultyLevel: 'EASY',
      createdAt: new Date(),
      updatedAt: new Date(),
      simulatedInbox: {
        id: 'inbox-1',
        simulationId: 'sim-source',
        title: 'Inbox Title',
        description: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        emails: [
          {
            id: 'email-1',
            inboxId: 'inbox-1',
            senderLabel: 'Fake Bank',
            senderAddress: 'alert@fakebank.com',
            subject: 'Urgent notice',
            preview: 'Your account is suspended',
            bodyHtml: '<p>Click here</p>',
            simulatedLinkTarget: 'https://evil.com',
            hasAttachment: false,
            expectedClassification: 'PHISHING',
            categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
            difficultyLevel: 'EASY',
            receivedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            redFlags: [
              {
                id: 'rf-1',
                simulatedEmailId: 'email-1',
                redFlagType: 'LINK',
                label: 'Suspicious Domain',
                description: 'Domain mismatch',
                severity: 'HIGH',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          },
        ],
      },
    } as never);

    vi.mocked(prisma.simulation.create).mockResolvedValue({
      id: 'sim-new',
      organisationId: targetOrgId,
      createdByUserId: userId,
      simulationType: 'SIMULATED_INBOX',
      title: 'Sim Inbox (Copy)',
      description: 'Test Sim',
      objective: 'Spot links',
      safetyStatus: 'DRAFT',
      difficultyLevel: 'EASY',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const copy = await ContentLifecycleRepository.copySimulation('sim-source', targetOrgId, userId);

    expect(prisma.simulation.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'sim-source',
        safetyStatus: 'APPROVED',
        simulatedInbox: {
          status: 'ACTIVE',
        },
        OR: [{ organisationId: null }, { organisationId: targetOrgId }],
      },
      include: expect.any(Object),
    });
    expect(prisma.simulation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organisationId: targetOrgId,
        createdByUserId: userId,
        title: 'Sim Inbox (Copy)',
        safetyStatus: 'DRAFT',
        simulatedInbox: {
          create: {
            title: 'Sim Inbox (Copy)',
            description: 'Test Sim',
            status: 'ARCHIVED',
            emails: {
              create: [
                {
                  senderLabel: 'Fake Bank',
                  senderAddress: 'alert@fakebank.com',
                  subject: 'Urgent notice',
                  preview: 'Your account is suspended',
                  bodyHtml: '<p>Click here</p>',
                  simulatedLinkTarget: 'https://evil.com',
                  hasAttachment: false,
                  receivedAt: expect.any(Date),
                  expectedClassification: 'PHISHING',
                  categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
                  difficultyLevel: 'EASY',
                  redFlags: {
                    create: [
                      {
                        redFlagType: 'LINK',
                        label: 'Suspicious Domain',
                        description: 'Domain mismatch',
                        severity: 'HIGH',
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      }),
      include: expect.any(Object),
    });
    expect(copy?.safetyStatus).toBe('DRAFT');
  });
});
