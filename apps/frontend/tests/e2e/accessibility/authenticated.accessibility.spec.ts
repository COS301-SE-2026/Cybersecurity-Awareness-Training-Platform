import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const organisationId = '00000000-0000-4000-8000-000000000001';
const campaignId = '00000000-0000-4000-8000-000000000002';
const campaignAssignmentId = '00000000-0000-4000-8000-000000000003';
const campaignItemId = '00000000-0000-4000-8000-000000000004';

type SessionRole = 'ORGANISATION_ADMIN' | 'ORGANISATION_TRAINEE';

async function seedSession(page: Page, role: SessionRole, permissions: string[] = []) {
  const user = {
    id: `nfr-${role.toLowerCase()}`,
    firstName: 'NFR',
    lastName: 'User',
    email: 'nfr-user@example.invalid',
    userType: role,
    authStatus: 'ACTIVE',
    traineeProfile: null,
    adminProfile: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const context = {
    user: { id: user.id, userType: role, authStatus: 'ACTIVE' },
    role,
    organisation: {
      id: organisationId,
      name: 'NFR Test Organisation',
      status: 'ACTIVE',
    },
    platformAdminRole: null,
    permissions,
    redirectTo: role === 'ORGANISATION_ADMIN' ? '/organisation-information' : '/campaigns',
  };

  await page.route('**/auth/refresh', (route) =>
    fulfillJson(route, {
      accessToken: 'nfr-browser-fixture-token',
      user,
      context,
      permissions,
      redirectTo: context.redirectTo,
      expiresAt: '2099-01-01T00:00:00.000Z',
      sessionExpiresAt: '2099-01-08T00:00:00.000Z',
      idleTimeoutMinutes: 30,
    }),
  );
  await page.addInitScript(
    ({ selectedRole, selectedPermissions, selectedOrganisationId }) => {
      const user = {
        id: `nfr-${selectedRole.toLowerCase()}`,
        firstName: 'NFR',
        lastName: 'User',
        email: 'nfr-user@example.invalid',
        userType: selectedRole,
        authStatus: 'ACTIVE',
        traineeProfile: null,
        adminProfile: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      const context = {
        user: { id: user.id, userType: selectedRole, authStatus: 'ACTIVE' },
        role: selectedRole,
        organisation: {
          id: selectedOrganisationId,
          name: 'NFR Test Organisation',
          status: 'ACTIVE',
        },
        platformAdminRole: null,
        permissions: selectedPermissions,
        redirectTo:
          selectedRole === 'ORGANISATION_ADMIN' ? '/organisation-information' : '/campaigns',
      };

      localStorage.setItem('token', 'nfr-browser-fixture-token');
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('authContext', JSON.stringify(context));
      localStorage.setItem('permissions', JSON.stringify(selectedPermissions));
      localStorage.setItem('redirectTo', context.redirectTo);
      localStorage.setItem('expiresAt', '2099-01-01T00:00:00.000Z');
      localStorage.setItem('sessionExpiresAt', '2099-01-08T00:00:00.000Z');
    },
    {
      selectedRole: role,
      selectedPermissions: permissions,
      selectedOrganisationId: organisationId,
    },
  );
}

async function expectNoCriticalViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .include('body')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations.filter((violation) => violation.impact === 'critical')).toEqual([]);
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

async function fulfillApiJson(route: Route, body: unknown) {
  if (route.request().resourceType() === 'document') {
    await route.continue();
    return;
  }

  await fulfillJson(route, body);
}

test.describe('Demo 4 authenticated accessibility NFR surfaces', () => {
  test('trainee Campaigns supports keyboard expansion and has no critical violations', async ({
    page,
  }) => {
    await seedSession(page, 'ORGANISATION_TRAINEE');
    await page.route('**/trainee/campaigns', (route) =>
      fulfillApiJson(route, {
        campaigns: [
          {
            campaignId,
            name: 'Security awareness',
            campaignType: 'ORGANISATION_CUSTOM',
            difficultyLevel: 'EASY',
            status: 'ACTIVE',
            assignment: {
              assignmentId: campaignAssignmentId,
              assignmentStatus: 'ASSIGNED',
              accessType: 'ASSIGNED',
              currentCampaignItemId: campaignItemId,
              assignedAt: '2026-01-01T00:00:00.000Z',
              dueDate: null,
              startedAt: null,
              completedAt: null,
            },
            progressStatus: 'NOT_STARTED',
            eligibility: { canView: true, canProgress: true, reason: 'AVAILABLE' },
          },
        ],
      }),
    );
    await page.route(`**/trainee/campaigns/${campaignId}`, (route) =>
      fulfillApiJson(route, {
        campaignId,
        name: 'Security awareness',
        campaignType: 'ORGANISATION_CUSTOM',
        difficultyLevel: 'EASY',
        status: 'ACTIVE',
        progressStatus: 'NOT_STARTED',
        assignment: {
          assignmentId: campaignAssignmentId,
          assignmentStatus: 'ASSIGNED',
          accessType: 'ASSIGNED',
          currentCampaignItemId: campaignItemId,
          assignedAt: '2026-01-01T00:00:00.000Z',
          dueDate: null,
          startedAt: null,
          completedAt: null,
        },
        eligibility: { canView: true, canProgress: true, reason: 'AVAILABLE' },
        items: [],
      }),
    );

    await page.goto('/campaigns');
    const campaignButton = page.getByRole('button', { name: /security awareness/i });
    await expect(campaignButton).toBeVisible();
    await campaignButton.focus();
    await expect(campaignButton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(campaignButton).toHaveAttribute('aria-expanded', 'true');
    await expectNoCriticalViolations(page);
  });

  test('trainee training activity supports keyboard completion and has no critical violations', async ({
    page,
  }) => {
    await seedSession(page, 'ORGANISATION_TRAINEE');
    await page.route(`**/trainee/campaign-items/${campaignItemId}/training-document`, (route) =>
      fulfillApiJson(route, {
        campaignItemId,
        campaignAssignmentId,
        trainingDocument: {
          id: '00000000-0000-4000-8000-000000000005',
          title: 'Recognise phishing warning signs',
          contentType: 'HTML',
          contentRef: 'nfr://training',
          content: '<p>Check unexpected requests before responding.</p>',
          contentSummary: 'Recognise suspicious messages.',
          difficultyLevel: 'EASY',
          status: 'AVAILABLE',
        },
        campaignItem: {
          title: 'Recognise warning signs',
          description: 'Training document',
          position: 1000,
          isRequired: true,
          availabilityStatus: 'AVAILABLE',
        },
      }),
    );
    await page.route(
      `**/trainee/campaign-items/${campaignItemId}/training-document/viewed`,
      (route) => route.fulfill({ status: 204 }),
    );
    await page.route(
      `**/trainee/campaign-items/${campaignItemId}/training-document/completed`,
      (route) => route.fulfill({ status: 204 }),
    );
    await page.route('**/trainee/campaigns', (route) => fulfillApiJson(route, { campaigns: [] }));

    await page.goto(`/training/${campaignItemId}`);
    const completeButton = page.getByRole('button', { name: 'Mark as completed' });
    await expect(completeButton).toBeVisible();
    await completeButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Completed' })).toBeDisabled();
    await expectNoCriticalViolations(page);
  });

  test('administrator Content Management and Campaigns support keyboard navigation', async ({
    page,
  }) => {
    await seedSession(page, 'ORGANISATION_ADMIN', ['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS']);
    await page.route(`**/organisations/${organisationId}/email-library**`, (route) =>
      fulfillApiJson(route, {
        items: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
    );
    await page.route(`**/organisations/${organisationId}/campaigns**`, (route) =>
      fulfillApiJson(route, {
        campaigns: [],
        pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
      }),
    );

    await page.goto(`/organisations/${organisationId}/content/email-library`);
    await expect(page.getByRole('heading', { name: 'Content Management' })).toBeVisible();
    const simulatedInboxes = page.getByRole('link', { name: 'Simulated Inboxes' });
    await simulatedInboxes.focus();
    await expect(simulatedInboxes).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Email Library' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Training Documents' })).toBeFocused();
    await expectNoCriticalViolations(page);

    await page.goto(`/organisations/${organisationId}/campaigns`);
    const createCampaign = page.getByRole('link', { name: 'Create Campaign' });
    await expect(createCampaign).toBeVisible();
    await createCampaign.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/organisations/${organisationId}/campaigns/new$`));
  });
});
