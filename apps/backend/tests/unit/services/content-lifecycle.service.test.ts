import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as ContentLifecycleService from '../../../src/services/content-lifecycle.service.js';
import * as ContentLifecycleRepository from '../../../src/repositories/content-lifecycle.repository.js';
import * as OrganisationScopeRepository from '../../../src/repositories/organisation-scope.repository.js';

vi.mock('../../../src/repositories/content-lifecycle.repository.js');
vi.mock('../../../src/repositories/organisation-scope.repository.js');

describe('ContentLifecycleService', () => {
  const orgId = '11111111-1111-4111-8111-111111111111';
  const otherOrgId = '22222222-2222-4222-8222-222222222222';
  const orgActor: ContentLifecycleService.UserActorContext = {
    userId: 'user-org-admin',
    userType: 'ORGANISATION_ADMIN',
  };
  const platformActor: ContentLifecycleService.UserActorContext = {
    userId: 'user-ip-admin',
    userType: 'IP_ADMIN',
  };

  type TrainingDocumentRecord = NonNullable<
    Awaited<ReturnType<typeof ContentLifecycleRepository.findTrainingDocumentById>>
  >;
  type QuizRecord = NonNullable<
    Awaited<ReturnType<typeof ContentLifecycleRepository.findQuizById>>
  >;
  type SimulationRecord = NonNullable<
    Awaited<ReturnType<typeof ContentLifecycleRepository.findSimulationById>>
  >;
  type SimulatedInboxRecord = NonNullable<SimulationRecord['simulatedInbox']>;

  function trainingDocument(
    overrides: Partial<TrainingDocumentRecord> = {},
  ): TrainingDocumentRecord {
    return {
      id: 'doc-1',
      organisationId: orgId,
      createdByUserId: orgActor.userId,
      title: 'Training document',
      contentType: 'MARKDOWN',
      contentRef: 'ref-1',
      contentSummary: null,
      estimatedReadTimeMinutes: 5,
      categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
      difficultyLevel: 'BEGINNER',
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  function quiz(overrides: Partial<QuizRecord> = {}): QuizRecord {
    return {
      id: 'quiz-1',
      organisationId: orgId,
      createdByUserId: orgActor.userId,
      title: 'Quiz',
      description: null,
      passThresholdPercentage: 80,
      difficultyLevel: 'BEGINNER',
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
      questions: [],
      ...overrides,
    };
  }

  function simulatedInbox(overrides: Partial<SimulatedInboxRecord> = {}): SimulatedInboxRecord {
    return {
      id: 'inbox-1',
      simulationId: 'sim-1',
      title: 'Inbox',
      description: null,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      emails: [],
      ...overrides,
    };
  }

  function simulation(overrides: Partial<SimulationRecord> = {}): SimulationRecord {
    return {
      id: 'sim-1',
      organisationId: orgId,
      createdByUserId: orgActor.userId,
      simulationType: 'SIMULATED_INBOX',
      title: 'Simulation',
      description: null,
      objective: null,
      safetyStatus: 'DRAFT',
      difficultyLevel: 'BEGINNER',
      createdAt: new Date(),
      updatedAt: new Date(),
      simulatedInbox: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(OrganisationScopeRepository.findOrganisationAdminActorScope).mockImplementation(
      async ({ userId, organisationId }) => {
        if (userId === orgActor.userId && organisationId === orgId) {
          return {
            id: 'admin-scope-1',
            userId: orgActor.userId,
            organisationId: orgId,
            adminStatus: 'ACTIVE',
            organisation: {
              id: orgId,
              name: 'Test Org',
              status: 'ACTIVE',
            },
            permissionGrants: [
              {
                organisationPermission: {
                  key: 'MANAGE_CAMPAIGNS',
                },
              },
            ],
          } as unknown as Awaited<
            ReturnType<typeof OrganisationScopeRepository.findOrganisationAdminActorScope>
          >;
        }
        return null;
      },
    );

    vi.mocked(OrganisationScopeRepository.findActiveIpAdminScope).mockImplementation(
      async (userId) => {
        if (userId === platformActor.userId) {
          return {
            id: 'ip-admin-1',
            userId: platformActor.userId,
            adminStatus: 'ACTIVE',
            platformAdminRole: 'SUPER_ADMIN',
          };
        }
        return null;
      },
    );
  });

  it('denies edit, activate, and copy without MANAGE_CAMPAIGNS', async () => {
    const scopeWithoutPermission = {
      id: 'admin-scope-without-permission',
      userId: orgActor.userId,
      organisationId: orgId,
      adminStatus: 'ACTIVE',
      organisation: {
        id: orgId,
        name: 'Test Org',
        status: 'ACTIVE',
      },
      permissionGrants: [],
    } as unknown as Awaited<
      ReturnType<typeof OrganisationScopeRepository.findOrganisationAdminActorScope>
    >;

    const operations = [
      () =>
        ContentLifecycleService.editTrainingDocumentDraft(orgActor, 'doc-1', orgId, {
          title: 'Blocked update',
        }),
      () => ContentLifecycleService.activateTrainingDocument(orgActor, 'doc-1', orgId),
      () => ContentLifecycleService.copyTrainingDocument(orgActor, 'doc-1', orgId),
    ];

    for (const operation of operations) {
      vi.mocked(OrganisationScopeRepository.findOrganisationAdminActorScope).mockResolvedValueOnce(
        scopeWithoutPermission,
      );
      await expect(operation()).rejects.toMatchObject({
        statusCode: 403,
        error: 'FORBIDDEN',
        message: 'Missing required permission: MANAGE_CAMPAIGNS',
      });
    }
    expect(ContentLifecycleRepository.findTrainingDocumentById).not.toHaveBeenCalled();
  });

  describe('TrainingDocument lifecycle', () => {
    it('allows owner to edit draft training document', async () => {
      vi.mocked(ContentLifecycleRepository.findTrainingDocumentById).mockResolvedValue(
        trainingDocument({ title: 'Old Title', contentSummary: 'Summary' }),
      );

      vi.mocked(ContentLifecycleRepository.updateTrainingDocumentDraft).mockResolvedValue(
        trainingDocument({
          title: 'New Title',
          contentSummary: 'Updated Summary',
          estimatedReadTimeMinutes: 10,
          categories: ['DATA_DEVICE_AND_ACCOUNT_SAFETY'],
          difficultyLevel: 'INTERMEDIATE',
        }),
      );

      const updated = await ContentLifecycleService.editTrainingDocumentDraft(
        orgActor,
        'doc-1',
        orgId,
        {
          title: 'New Title',
          estimatedReadTimeMinutes: 10,
          categories: ['DATA_DEVICE_AND_ACCOUNT_SAFETY'],
        },
      );

      expect(updated.title).toBe('New Title');
      expect(ContentLifecycleRepository.updateTrainingDocumentDraft).toHaveBeenCalledWith(
        'doc-1',
        orgId,
        {
          title: 'New Title',
          estimatedReadTimeMinutes: 10,
          categories: ['DATA_DEVICE_AND_ACCOUNT_SAFETY'],
        },
      );
    });

    it('rejects editing active training document as read-only', async () => {
      vi.mocked(ContentLifecycleRepository.findTrainingDocumentById).mockResolvedValue(
        trainingDocument({
          title: 'Active Doc',
          contentSummary: 'Summary',
          status: 'AVAILABLE',
        }),
      );

      await expect(
        ContentLifecycleService.editTrainingDocumentDraft(orgActor, 'doc-1', orgId, {
          title: 'Changed',
        }),
      ).rejects.toThrow(ContentLifecycleService.ContentLifecycleServiceError);

      await expect(
        ContentLifecycleService.editTrainingDocumentDraft(orgActor, 'doc-1', orgId, {
          title: 'Changed',
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'CONTENT_READ_ONLY',
      });
    });

    it('rejects an edit when the document stops being a draft before the write', async () => {
      vi.mocked(ContentLifecycleRepository.findTrainingDocumentById).mockResolvedValue(
        trainingDocument({ title: 'Draft Doc' }),
      );
      vi.mocked(ContentLifecycleRepository.updateTrainingDocumentDraft).mockResolvedValue(null);

      await expect(
        ContentLifecycleService.editTrainingDocumentDraft(orgActor, 'doc-1', orgId, {
          title: 'Changed',
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'CONTENT_READ_ONLY',
      });
    });

    it('rejects editing training document belonging to another organisation', async () => {
      vi.mocked(ContentLifecycleRepository.findTrainingDocumentById).mockResolvedValue(
        trainingDocument({
          id: 'doc-other',
          organisationId: otherOrgId,
          createdByUserId: 'other-user',
          title: 'Other Org Doc',
          contentRef: 'ref-other',
        }),
      );

      await expect(
        ContentLifecycleService.editTrainingDocumentDraft(orgActor, 'doc-other', orgId, {
          title: 'Malicious Edit',
        }),
      ).rejects.toMatchObject({
        statusCode: 403,
        error: 'FORBIDDEN',
      });
    });

    it('allows owner to activate draft training document', async () => {
      vi.mocked(ContentLifecycleRepository.findTrainingDocumentById).mockResolvedValue(
        trainingDocument({ title: 'Draft Doc' }),
      );

      vi.mocked(ContentLifecycleRepository.activateTrainingDocument).mockResolvedValue(
        trainingDocument({ title: 'Draft Doc', status: 'AVAILABLE' }),
      );

      const activated = await ContentLifecycleService.activateTrainingDocument(
        orgActor,
        'doc-1',
        orgId,
      );

      expect(activated.status).toBe('AVAILABLE');
      expect(ContentLifecycleRepository.activateTrainingDocument).toHaveBeenCalledWith(
        'doc-1',
        orgId,
      );
    });

    it('rejects activation of already active training document', async () => {
      vi.mocked(ContentLifecycleRepository.findTrainingDocumentById).mockResolvedValue(
        trainingDocument({ title: 'Already Active Doc', status: 'AVAILABLE' }),
      );

      await expect(
        ContentLifecycleService.activateTrainingDocument(orgActor, 'doc-1', orgId),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'INVALID_STATUS_TRANSITION',
      });
    });

    it('allows copying active platform training document into organisation draft', async () => {
      vi.mocked(ContentLifecycleRepository.findTrainingDocumentById).mockResolvedValue(
        trainingDocument({
          id: 'doc-platform',
          organisationId: null,
          createdByUserId: null,
          title: 'Platform Doc',
          contentRef: 'ref-platform',
          contentSummary: 'Shared training',
          estimatedReadTimeMinutes: 10,
          categories: ['DATA_DEVICE_AND_ACCOUNT_SAFETY'],
          difficultyLevel: 'INTERMEDIATE',
          status: 'AVAILABLE',
        }),
      );

      vi.mocked(ContentLifecycleRepository.copyTrainingDocument).mockResolvedValue(
        trainingDocument({
          id: 'doc-copy',
          title: 'Platform Doc (Copy)',
          contentRef: 'ref-platform',
          contentSummary: 'Shared training',
          estimatedReadTimeMinutes: 10,
          categories: ['DATA_DEVICE_AND_ACCOUNT_SAFETY'],
          difficultyLevel: 'INTERMEDIATE',
        }),
      );

      const copy = await ContentLifecycleService.copyTrainingDocument(
        orgActor,
        'doc-platform',
        orgId,
      );

      expect(copy.status).toBe('DRAFT');
      expect(copy.organisationId).toBe(orgId);
      expect(ContentLifecycleRepository.copyTrainingDocument).toHaveBeenCalledWith(
        'doc-platform',
        orgId,
        orgActor.userId,
      );
    });

    it('rejects copying private content belonging to another organisation', async () => {
      vi.mocked(ContentLifecycleRepository.findTrainingDocumentById).mockResolvedValue(
        trainingDocument({
          id: 'doc-private',
          organisationId: otherOrgId,
          createdByUserId: 'other-user',
          title: 'Private Org Doc',
          contentRef: 'ref-private',
          status: 'AVAILABLE',
        }),
      );

      await expect(
        ContentLifecycleService.copyTrainingDocument(orgActor, 'doc-private', orgId),
      ).rejects.toMatchObject({
        statusCode: 403,
        error: 'FORBIDDEN',
      });
    });

    it('rejects copying a draft owned by the caller', async () => {
      vi.mocked(ContentLifecycleRepository.findTrainingDocumentById).mockResolvedValue(
        trainingDocument({
          id: 'doc-draft',
          title: 'Draft document',
          contentRef: 'ref-draft',
        }),
      );

      await expect(
        ContentLifecycleService.copyTrainingDocument(orgActor, 'doc-draft', orgId),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'CONTENT_NOT_ACTIVE',
      });
      expect(ContentLifecycleRepository.copyTrainingDocument).not.toHaveBeenCalled();
    });
  });

  describe('Quiz lifecycle', () => {
    it('allows owner to edit draft quiz', async () => {
      vi.mocked(ContentLifecycleRepository.findQuizById).mockResolvedValue(
        quiz({ title: 'Quiz 1', description: 'Description' }),
      );

      vi.mocked(ContentLifecycleRepository.updateQuizDraft).mockResolvedValue(
        quiz({
          title: 'Quiz 1 Updated',
          description: 'New Description',
          passThresholdPercentage: 90,
          difficultyLevel: 'INTERMEDIATE',
        }),
      );

      const updated = await ContentLifecycleService.editQuizDraft(orgActor, 'quiz-1', orgId, {
        title: 'Quiz 1 Updated',
        passThresholdPercentage: 90,
      });

      expect(updated.title).toBe('Quiz 1 Updated');
      expect(ContentLifecycleRepository.updateQuizDraft).toHaveBeenCalledWith('quiz-1', orgId, {
        title: 'Quiz 1 Updated',
        passThresholdPercentage: 90,
      });
    });

    it('rejects editing published quiz as read-only', async () => {
      vi.mocked(ContentLifecycleRepository.findQuizById).mockResolvedValue(
        quiz({ title: 'Published Quiz', status: 'PUBLISHED' }),
      );

      await expect(
        ContentLifecycleService.editQuizDraft(orgActor, 'quiz-1', orgId, {
          title: 'Modified Title',
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'CONTENT_READ_ONLY',
      });
    });

    it('allows owner to activate draft quiz', async () => {
      vi.mocked(ContentLifecycleRepository.findQuizById).mockResolvedValue(
        quiz({ title: 'Draft Quiz' }),
      );

      vi.mocked(ContentLifecycleRepository.activateQuiz).mockResolvedValue(
        quiz({ title: 'Draft Quiz', status: 'PUBLISHED' }),
      );

      const activated = await ContentLifecycleService.activateQuiz(orgActor, 'quiz-1', orgId);
      expect(activated.status).toBe('PUBLISHED');
      expect(ContentLifecycleRepository.activateQuiz).toHaveBeenCalledWith('quiz-1', orgId);
    });

    it('allows copying active quiz into organisation draft', async () => {
      vi.mocked(ContentLifecycleRepository.findQuizById).mockResolvedValue(
        quiz({
          id: 'quiz-source',
          organisationId: null,
          createdByUserId: null,
          title: 'Platform Quiz',
          description: 'Standard test',
          passThresholdPercentage: 75,
          difficultyLevel: 'ADVANCED',
          status: 'PUBLISHED',
        }),
      );

      vi.mocked(ContentLifecycleRepository.copyQuiz).mockResolvedValue(
        quiz({
          id: 'quiz-copy',
          title: 'Platform Quiz (Copy)',
          description: 'Standard test',
          passThresholdPercentage: 75,
          difficultyLevel: 'ADVANCED',
        }),
      );

      const copy = await ContentLifecycleService.copyQuiz(orgActor, 'quiz-source', orgId);
      expect(copy.status).toBe('DRAFT');
      expect(copy.organisationId).toBe(orgId);
      expect(ContentLifecycleRepository.copyQuiz).toHaveBeenCalledWith(
        'quiz-source',
        orgId,
        orgActor.userId,
      );
    });
  });

  describe('Simulation lifecycle', () => {
    it('allows owner to edit draft simulation', async () => {
      vi.mocked(ContentLifecycleRepository.findSimulationById).mockResolvedValue(
        simulation({ title: 'Draft Simulation', description: 'Desc', objective: 'Objective' }),
      );

      vi.mocked(ContentLifecycleRepository.updateSimulationDraft).mockResolvedValue(
        simulation({
          title: 'Updated Simulation',
          description: 'New Desc',
          objective: 'Objective',
        }),
      );

      const updated = await ContentLifecycleService.editSimulationDraft(orgActor, 'sim-1', orgId, {
        title: 'Updated Simulation',
      });

      expect(updated.title).toBe('Updated Simulation');
      expect(ContentLifecycleRepository.updateSimulationDraft).toHaveBeenCalledWith(
        'sim-1',
        orgId,
        {
          title: 'Updated Simulation',
        },
      );
    });

    it('rejects editing approved simulation as read-only', async () => {
      vi.mocked(ContentLifecycleRepository.findSimulationById).mockResolvedValue(
        simulation({
          title: 'Approved Simulation',
          description: 'Desc',
          objective: 'Objective',
          safetyStatus: 'APPROVED',
          simulatedInbox: simulatedInbox({
            id: 'inbox-approved',
            title: 'Approved Inbox',
          }),
        }),
      );

      await expect(
        ContentLifecycleService.editSimulationDraft(orgActor, 'sim-1', orgId, {
          title: 'Modified Title',
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'CONTENT_READ_ONLY',
      });
    });

    it('allows owner to activate draft simulation', async () => {
      vi.mocked(ContentLifecycleRepository.findSimulationById).mockResolvedValue(
        simulation({
          title: 'Draft Simulation',
          simulatedInbox: simulatedInbox({
            id: 'inbox-draft',
            title: 'Draft Inbox',
            status: 'ARCHIVED',
          }),
        }),
      );

      vi.mocked(ContentLifecycleRepository.activateSimulation).mockResolvedValue(
        simulation({ title: 'Draft Simulation', safetyStatus: 'APPROVED' }),
      );

      const activated = await ContentLifecycleService.activateSimulation(orgActor, 'sim-1', orgId);
      expect(activated.safetyStatus).toBe('APPROVED');
      expect(ContentLifecycleRepository.activateSimulation).toHaveBeenCalledWith('sim-1', orgId);
    });

    it('allows copying active simulation into organisation draft', async () => {
      vi.mocked(ContentLifecycleRepository.findSimulationById).mockResolvedValue(
        simulation({
          id: 'sim-platform',
          organisationId: null,
          createdByUserId: null,
          title: 'Platform Simulation',
          description: 'Phishing campaign',
          objective: 'Spot red flags',
          safetyStatus: 'APPROVED',
          difficultyLevel: 'INTERMEDIATE',
          simulatedInbox: simulatedInbox({
            id: 'inbox-platform',
            simulationId: 'sim-platform',
            title: 'Platform Inbox',
          }),
        }),
      );

      vi.mocked(ContentLifecycleRepository.copySimulation).mockResolvedValue(
        simulation({
          id: 'sim-copy',
          title: 'Platform Simulation (Copy)',
          description: 'Phishing campaign',
          objective: 'Spot red flags',
          difficultyLevel: 'INTERMEDIATE',
        }),
      );

      const copy = await ContentLifecycleService.copySimulation(orgActor, 'sim-platform', orgId);
      expect(copy.safetyStatus).toBe('DRAFT');
      expect(copy.organisationId).toBe(orgId);
      expect(ContentLifecycleRepository.copySimulation).toHaveBeenCalledWith(
        'sim-platform',
        orgId,
        orgActor.userId,
      );
    });

    it('rejects copying an approved simulation whose inbox is archived', async () => {
      vi.mocked(ContentLifecycleRepository.findSimulationById).mockResolvedValue(
        simulation({
          id: 'sim-archived-inbox',
          title: 'Unavailable Simulation',
          safetyStatus: 'APPROVED',
          simulatedInbox: simulatedInbox({
            id: 'inbox-archived',
            simulationId: 'sim-archived-inbox',
            title: 'Archived Inbox',
            status: 'ARCHIVED',
          }),
        }),
      );

      await expect(
        ContentLifecycleService.copySimulation(orgActor, 'sim-archived-inbox', orgId),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'CONTENT_NOT_ACTIVE',
      });
      expect(ContentLifecycleRepository.copySimulation).not.toHaveBeenCalled();
    });
  });
});
