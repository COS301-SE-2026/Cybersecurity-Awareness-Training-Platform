import { expect, test } from '@playwright/test';

test('logs in through the backend auth contract and redirects to campaigns', async ({ page }) => {
  await page.route('**/auth/refresh', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'No refresh session' }),
    });
  });

  await page.route('**/auth/login', async (route) => {
    const requestBody = route.request().postDataJSON();

    expect(requestBody).toEqual({
      email: 'trainee@example.com',
      password: 'legacy-password',
      rememberMe: true,
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Set-Cookie': 'refreshToken=demo-refresh-token; HttpOnly; Path=/auth; SameSite=Lax',
      },
      body: JSON.stringify({
        accessToken: 'demo-access-token',
        idleTimeoutMinutes: 30,
        token: 'demo-access-token',
        tokenType: 'Bearer',
        expiresAt: '2026-01-01T01:00:00.000Z',
        sessionExpiresAt: '2026-01-01T01:00:00.000Z',
        user: {
          id: 'user-1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'trainee@example.com',
          userType: 'GENERAL_TRAINEE',
          authStatus: 'ACTIVE',
          traineeProfile: null,
          adminProfile: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        context: {
          user: {
            id: 'user-1',
            userType: 'GENERAL_TRAINEE',
            authStatus: 'ACTIVE',
          },
          role: 'GENERAL_TRAINEE',
          organisation: null,
          permissions: ['GENERAL_TRAINEE'],
          redirectTo: '/trainee/campaigns',
        },
        permissions: ['GENERAL_TRAINEE'],
        redirectTo: '/trainee/campaigns',
      }),
    });
  });

  await page.route('**/trainee/campaigns', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ campaigns: [] }),
    });
  });

  await page.goto('/login');

  await page.getByLabel('Email Address').fill('trainee@example.com');
  await page.getByLabel('Password').fill('legacy-password');
  await page.getByLabel('Remember Me').check();
  await page.getByRole('button', { name: /log in/i }).click();

  await expect(page).toHaveURL(/\/campaigns$/);
});
