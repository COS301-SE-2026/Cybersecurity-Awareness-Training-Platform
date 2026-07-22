import { expect, test } from '@playwright/test';

const genericSuccessMessage = 'If the email is registered, a password reset link has been sent.';
const rateLimitMessage = 'Please wait before requesting another password reset link.';
const rawRateLimitMessage = 'Raw backend rate-limit message';
const normalizedEmail = 'user@example.com';

test('submits and resends the normalized email through the forgot-password API', async ({
  page,
}) => {
  const requests: Array<{ method: string; body: unknown }> = [];

  await page.route('**/auth/forgot-password', async (route) => {
    requests.push({
      method: route.request().method(),
      body: route.request().postDataJSON(),
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: genericSuccessMessage,
      }),
    });
  });

  await page.goto('/forgot-password');

  const emailInput = page.getByLabel('Email Address');
  const successMessage = page.getByText(genericSuccessMessage, { exact: true });

  await emailInput.fill(' User@Example.COM  ');
  await page.getByRole('button', { name: /send password reset link/i }).click();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toEqual({
    method: 'POST',
    body: {
      email: normalizedEmail,
    },
  });

  await expect(successMessage).toBeVisible();
  await expect(emailInput).toHaveValue(normalizedEmail);
  await expect(emailInput).toBeDisabled();

  const resendButton = page.getByRole('button', {
    name: /resend password reset link/i,
  });

  await expect(resendButton).toBeVisible();
  await expect(resendButton).toBeEnabled();

  await resendButton.click();

  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]).toEqual({
    method: 'POST',
    body: {
      email: normalizedEmail,
    },
  });

  await expect(successMessage).toBeVisible();
});

test('replaces stale success with controlled wording after a rate-limited resend', async ({
  page,
}) => {
  let requestCount = 0;

  await page.route('**/auth/forgot-password', async (route) => {
    requestCount += 1;

    if (requestCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: genericSuccessMessage,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'AUTH_RATE_LIMITED',
        message: rawRateLimitMessage,
      }),
    });
  });

  await page.goto('/forgot-password');

  await page.getByLabel('Email Address').fill(normalizedEmail);
  await page.getByRole('button', { name: /send password reset link/i }).click();

  const successMessage = page.getByText(genericSuccessMessage, { exact: true });

  await expect(successMessage).toBeVisible();

  const resendButton = page.getByRole('button', {
    name: /resend password reset link/i,
  });

  await resendButton.click();

  await expect(page.getByText(rateLimitMessage, { exact: true })).toBeVisible();
  await expect(successMessage).not.toBeVisible();
  await expect(page.getByText(rawRateLimitMessage, { exact: true })).not.toBeVisible();
  await expect(resendButton).toBeEnabled();
  expect(requestCount).toBe(2);
});
