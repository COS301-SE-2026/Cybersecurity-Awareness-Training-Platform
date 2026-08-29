import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

type Demo3AccessibilitySurface = Readonly<{
  name: string;
  path: string;
  expectedHeading: RegExp | string;
  expectsKeyboardFocus: boolean;
  mockHealth?: boolean;
}>;

const demo3AccessibilitySurfaces: readonly Demo3AccessibilitySurface[] = [
  {
    name: 'login',
    path: '/login',
    expectedHeading: 'Welcome Back',
    expectsKeyboardFocus: true,
  },
  {
    name: 'registration',
    path: '/register',
    expectedHeading: 'Get Started',
    expectsKeyboardFocus: true,
  },
  {
    name: 'forgot password',
    path: '/forgot-password',
    expectedHeading: /forgot your password\?/i,
    expectsKeyboardFocus: true,
  },
  {
    name: 'organisation registration request',
    path: '/organisation-registration-request',
    expectedHeading: /request to register an organisation/i,
    expectsKeyboardFocus: true,
  },
  {
    name: 'status',
    path: '/status',
    expectedHeading: 'Hello from Insightful Phish!',
    expectsKeyboardFocus: false,
    mockHealth: true,
  },
];

test.describe('Demo 3 accessibility NFR surfaces', () => {
  for (const surface of demo3AccessibilitySurfaces) {
    test(`${surface.name} page has no critical automated accessibility violations`, async ({
      page,
    }) => {
      if (surface.mockHealth) {
        await page.route('**/health', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              app: 'Insightful Phish',
              api: 'working',
              database: 'connected',
              timestamp: '2026-08-20T00:00:00.000Z',
            }),
          });
        });
      }

      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto(surface.path);

      await expect(page.getByRole('heading', { name: surface.expectedHeading })).toBeVisible();
      if (surface.expectsKeyboardFocus) {
        await page.keyboard.press('Tab');
        await expect(page.locator(':focus')).toBeVisible();
      }

      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('body')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const criticalViolations = accessibilityScanResults.violations.filter(
        (violation) => violation.impact === 'critical',
      );

      expect(criticalViolations).toEqual([]);
    });
  }
});
