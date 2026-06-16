import { expect, test } from '@playwright/test';

test('renders the login page', async ({ page }) => {
  await page.goto('/login');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome Back' })).toBeVisible();
  await expect(page.getByAltText('Insightful Phish Logo')).toBeVisible();
  await expect(page.getByLabel('Email Address')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'LOGIN' })).toBeVisible();
});

test('renders the status page with a mocked health response', async ({ page }) => {
  await page.route('**/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        app: 'Insightful Phish',
        api: 'working',
        database: 'connected',
        timestamp: '2026-06-16T00:00:00.000Z',
      }),
    });
  });

  await page.goto('/status');

  await expect(page).toHaveURL(/\/status$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Hello from Insightful Phish!' }),
  ).toBeVisible();
  await expect(page.getByText(/The API is/i)).toContainText('The API is working.');
  await expect(page.getByText(/The database is/i)).toContainText('The database is connected');
  await expect(page.getByText('Last checked: 2026-06-16T00:00:00.000Z')).toBeVisible();
});
