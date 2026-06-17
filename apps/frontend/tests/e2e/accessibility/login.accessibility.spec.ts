import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('login page has no automatically detectable accessibility violations', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { level: 1, name: 'Welcome Back' })).toBeVisible();

  const accessibilityScanResults = await new AxeBuilder({ page }).include('body').analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
