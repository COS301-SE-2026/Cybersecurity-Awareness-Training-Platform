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
    expect(response.body.emails[0].isOpened).toBe(false);
    expect(response.body.emails[0].expectedClassification).toBeUndefined(); // Filtered for trainees
  });

  it('returns isOpened true after the trainee opens the simulated email', async () => {
    const fixture = await setupInboxFixture();

    const initialResponse = await request(createApp())
      .get(`/trainee/campaign-items/${fixture.campaignItem.id}/simulated-inbox`)
      .set('Authorization', `Bearer ${fixture.token}`);

    expect(initialResponse.status).toBe(200);
    expect(initialResponse.body.emails[0].isOpened).toBe(false);

    const openResponse = await request(createApp())
      .post(
        `/trainee/campaign-items/${fixture.campaignItem.id}/simulated-emails/${fixture.email.id}/interactions`,
      )
      .set('Authorization', `Bearer ${fixture.token}`)
      .send({
        eventType: 'SIMULATED_EMAIL_OPENED',
      });

    expect(openResponse.status).toBe(200);

    const openedResponse = await request(createApp())
      .get(`/trainee/campaign-items/${fixture.campaignItem.id}/simulated-inbox`)
      .set('Authorization', `Bearer ${fixture.token}`);

    expect(openedResponse.status).toBe(200);
    expect(openedResponse.body.emails[0].isOpened).toBe(true);
  });

  it('does not create duplicate opened events for the same trainee email context', async () => {
    const fixture = await setupInboxFixture();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await request(createApp())
        .post(
          `/trainee/campaign-items/${fixture.campaignItem.id}/simulated-emails/${fixture.email.id}/interactions`,
        )
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({
          eventType: 'SIMULATED_EMAIL_OPENED',
        });

      expect(response.status).toBe(200);
    }

    const openedEventCount = await prisma.interactionEvent.count({
      where: {
        traineeProfileId: fixture.traineeProfile.id,
        campaignAssignmentId: fixture.assignment.id,
        campaignItemId: fixture.campaignItem.id,
        eventType: 'SIMULATED_EMAIL_OPENED',
        targetType: 'SIMULATED_EMAIL',
        targetId: fixture.email.id,
        simulatedEmailId: fixture.email.id,
      },
    });

    expect(openedEventCount).toBe(1);
  });

  it("does not use another trainee's opened event for the current trainee", async () => {
    const fixture = await setupInboxFixture();
    const { user: otherUser, traineeProfile: otherTraineeProfile } = await createTrainee();

    await createCampaignAssignment({
      campaignId: fixture.campaign.id,
      traineeProfileId: otherTraineeProfile.id,
    });

    const otherLoginResponse = await request(createApp())
      .post('/auth/login')
      .send({
        email: otherUser.email,
        password: ['pass', 'word'].join(''),
      });

    const otherToken = otherLoginResponse.body.token;

    const otherOpenResponse = await request(createApp())
      .post(
        `/trainee/campaign-items/${fixture.campaignItem.id}/simulated-emails/${fixture.email.id}/interactions`,
      )
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        eventType: 'SIMULATED_EMAIL_OPENED',
      });

    expect(otherOpenResponse.status).toBe(200);

    const currentTraineeResponse = await request(createApp())
      .get(`/trainee/campaign-items/${fixture.campaignItem.id}/simulated-inbox`)
      .set('Authorization', `Bearer ${fixture.token}`);

    expect(currentTraineeResponse.status).toBe(200);
    expect(currentTraineeResponse.body.emails[0].isOpened).toBe(false);
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
