import { describe, expect, it, vi } from 'vitest';
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
      deleteMany: vi.fn(),
      create: vi.fn(),
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
      deleteMany: vi.fn(),
      create: vi.fn(),
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
      estimatedReadTimeMinutes: null,
      categories: ['PHISHING'],
      difficultyLevel: 'BEGINNER',
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
      difficultyLevel: 'BEGINNER',
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
      estimatedReadTimeMinutes: 12,
      categories: ['DATA_PROTECTION'],
      difficultyLevel: 'INTERMEDIATE',
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
      estimatedReadTimeMinutes: 12,
      categories: ['DATA_PROTECTION'],
      difficultyLevel: 'INTERMEDIATE',
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
        status: 'AVAILABLE',
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
        contentSummary: 'Original Summary',
        estimatedReadTimeMinutes: 12,
        categories: ['DATA_PROTECTION'],
        difficultyLevel: 'INTERMEDIATE',
        status: 'DRAFT',
      },
    });
    expect(copy?.status).toBe('DRAFT');
    expect(copy?.organisationId).toBe(targetOrgId);
  });

  it('copyQuiz clones questions and answer options without attempt history', async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue({
      id: 'quiz-source',
      organisationId: null,
      createdByUserId: 'platform-user',
      title: 'Original Quiz',
      description: 'Quiz Description',
      passThresholdPercentage: 80,
      difficultyLevel: 'BEGINNER',
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
          categories: ['PHISHING'],
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
      difficultyLevel: 'BEGINNER',
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
              categories: ['PHISHING'],
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
      difficultyLevel: 'BEGINNER',
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
            categories: ['PHISHING'],
            difficultyLevel: 'BEGINNER',
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
      difficultyLevel: 'BEGINNER',
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
            title: 'Inbox Title',
            description: null,
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
                  categories: ['PHISHING'],
                  difficultyLevel: 'BEGINNER',
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
