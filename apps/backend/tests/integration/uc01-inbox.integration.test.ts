import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  createTrainee,
  createCampaign,
  createSimulation,
  createSimulatedInbox,
  createCampaignItem,
  createCampaignAssignment,
  createSimulatedEmail,
  createEmailRedFlag,
} from '../helpers/factories.js';
import {
  CampaignStatus,
  CampaignComponentType,
  InboxStatus,
  EmailClassification,
  EmailRedFlagType,
} from '../../src/generated/prisma/enums.js';

describe('UC-01 Simulated Inbox Integration Tests', () => {
  async function setupInboxFixture() {
    const { user, traineeProfile } = await createTrainee();

    const campaign = await createCampaign({
      status: CampaignStatus.ACTIVE,
    });

    const simulation = await createSimulation();

    const inbox = await createSimulatedInbox({
      simulationId: simulation.id,
      status: InboxStatus.ACTIVE,
    });

    const campaignItem = await createCampaignItem({
      campaignId: campaign.id,
      componentType: CampaignComponentType.SIMULATED_INBOX,
      simulationId: simulation.id,
    });

    const assignment = await createCampaignAssignment({
      campaignId: campaign.id,
      traineeProfileId: traineeProfile.id,
    });

    const email = await createSimulatedEmail({
      inboxId: inbox.id,
      expectedClassification: EmailClassification.PHISHING,
    });

    const redFlag = await createEmailRedFlag({
      simulatedEmailId: email.id,
      redFlagType: EmailRedFlagType.LANGUAGE,
      label: 'Urgent Language',
    });

    // Login to get token
    const loginResponse = await request(createApp())
      .post('/auth/login')
      .send({
        email: user.email,
        password: ['pass', 'word'].join(''),
      });

    const token = loginResponse.body.token;

    return {
      user,
      traineeProfile,
      campaign,
      simulation,
      inbox,
      campaignItem,
      assignment,
      email,
      redFlag,
      token,
    };
  }

  it('gets a simulated inbox successfully with emails listed', async () => {
    const fixture = await setupInboxFixture();

    const response = await request(createApp())
      .get(`/trainee/campaign-items/${fixture.campaignItem.id}/simulated-inbox`)
      .set('Authorization', `Bearer ${fixture.token}`);

    expect(response.status).toBe(200);
    expect(response.body.emails).toBeDefined();
    expect(response.body.emails.length).toBe(1);
    expect(response.body.emails[0].id).toBe(fixture.email.id);
    expect(response.body.emails[0].subject).toBe(fixture.email.subject);
    expect(response.body.emails[0].expectedClassification).toBeUndefined(); // Filtered for trainees
  });

  it('gets simulated email details successfully', async () => {
    const fixture = await setupInboxFixture();

    const response = await request(createApp())
      .get(
        `/trainee/campaign-items/${fixture.campaignItem.id}/simulated-emails/${fixture.email.id}`,
      )
      .set('Authorization', `Bearer ${fixture.token}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(fixture.email.id);
    expect(response.body.subject).toBe(fixture.email.subject);
    expect(response.body.bodyHtml).toBe(fixture.email.bodyHtml);
    expect(response.body.expectedClassification).toBeUndefined(); // Filtered out
    expect(response.body.redFlags).toBeUndefined(); // Filtered out before classification
  });

  it('submits a simulated email interaction and asserts persisted event in database', async () => {
    const fixture = await setupInboxFixture();

    const initialCount = await prisma.interactionEvent.count({
      where: {
        traineeProfileId: fixture.traineeProfile.id,
        simulatedEmailId: fixture.email.id,
      },
    });
    expect(initialCount).toBe(0);

    const response = await request(createApp())
      .post(
        `/trainee/campaign-items/${fixture.campaignItem.id}/simulated-emails/${fixture.email.id}/interactions`,
      )
      .set('Authorization', `Bearer ${fixture.token}`)
      .send({
        eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
      });

    expect(response.status).toBe(200);

    // Assert that the interaction is persisted in the database
    const persistedEvent = await prisma.interactionEvent.findFirst({
      where: {
        traineeProfileId: fixture.traineeProfile.id,
        simulatedEmailId: fixture.email.id,
        eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
      },
    });

    expect(persistedEvent).not.toBeNull();
    expect(persistedEvent!.campaignItemId).toBe(fixture.campaignItem.id);
    expect(persistedEvent!.campaignAssignmentId).toBe(fixture.assignment.id);
    expect(persistedEvent!.targetType).toBe('SIMULATED_EMAIL');
    expect(persistedEvent!.targetId).toBe(fixture.email.id);
  });

  it('classifies an email and asserts persisted classification response in database', async () => {
    const fixture = await setupInboxFixture();

    const initialClassifications = await prisma.emailClassificationResponse.count({
      where: {
        traineeProfileId: fixture.traineeProfile.id,
        simulatedEmailId: fixture.email.id,
      },
    });
    expect(initialClassifications).toBe(0);

    const response = await request(createApp())
      .post(
        `/trainee/campaign-items/${fixture.campaignItem.id}/simulated-emails/${fixture.email.id}/classification`,
      )
      .set('Authorization', `Bearer ${fixture.token}`)
      .send({
        selectedClassification: 'PHISHING',
        selectedRedFlagIds: [fixture.redFlag.id],
      });

    expect(response.status).toBe(200);
    expect(response.body.isCorrect).toBe(true);
    expect(response.body.feedback).toBeDefined();

    // Assert persisted classification in the database
    const classification = await prisma.emailClassificationResponse.findFirst({
      where: {
        traineeProfileId: fixture.traineeProfile.id,
        simulatedEmailId: fixture.email.id,
      },
      include: {
        selectedRedFlags: true,
      },
    });

    expect(classification).not.toBeNull();
    expect(classification!.selectedClassification).toBe('PHISHING');
    expect(classification!.isCorrect).toBe(true);
    expect(classification!.campaignItemId).toBe(fixture.campaignItem.id);
    expect(classification!.campaignAssignmentId).toBe(fixture.assignment.id);

    // Assert red flags association
    expect(classification!.selectedRedFlags.length).toBe(1);
    expect(classification!.selectedRedFlags[0].emailRedFlagId).toBe(fixture.redFlag.id);

    // Assert that an interaction event was also created for the classification
    const classificationEvent = await prisma.interactionEvent.findFirst({
      where: {
        traineeProfileId: fixture.traineeProfile.id,
        simulatedEmailId: fixture.email.id,
        eventType: 'SIMULATED_EMAIL_CLASSIFIED',
      },
    });
    expect(classificationEvent).not.toBeNull();
    expect(classificationEvent!.emailClassificationResponseId).toBe(classification!.id);
  });

  it('returns 409 conflict when trying to classify the same email again', async () => {
    const fixture = await setupInboxFixture();

    // First classification
    const firstResponse = await request(createApp())
      .post(
        `/trainee/campaign-items/${fixture.campaignItem.id}/simulated-emails/${fixture.email.id}/classification`,
      )
      .set('Authorization', `Bearer ${fixture.token}`)
      .send({
        selectedClassification: 'PHISHING',
        selectedRedFlagIds: [fixture.redFlag.id],
      });

    expect(firstResponse.status).toBe(200);

    // Second classification attempt
    const secondResponse = await request(createApp())
      .post(
        `/trainee/campaign-items/${fixture.campaignItem.id}/simulated-emails/${fixture.email.id}/classification`,
      )
      .set('Authorization', `Bearer ${fixture.token}`)
      .send({
        selectedClassification: 'SAFE',
        selectedRedFlagIds: [],
      });

    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body.error).toBe('ALREADY_CLASSIFIED');
  });
});
