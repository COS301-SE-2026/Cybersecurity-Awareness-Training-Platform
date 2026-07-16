import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '../../testing/render';
import { verifyEmailChange } from '../../services/auth.service';
import ConfirmEmailChangePage from '../ConfirmEmailChangePage';

const { verifyEmailChangeMock } = vi.hoisted(() => ({
  verifyEmailChangeMock: vi.fn(),
}));

vi.mock('../../services/auth.service', () => ({
  verifyEmailChange: verifyEmailChangeMock,
}));

const changeToken = 'exampleEmailChangeTokenValueWithAtLeast32Chars';

function renderConfirmEmailChangePage(initialEntry = `/confirm-email-change?token=${changeToken}`) {
  return renderWithRouter(<ConfirmEmailChangePage />, {
    initialEntry,
    routePath: 'confirm-email-change',
  });
}

describe('ConfirmEmailChangePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyEmailChangeMock.mockResolvedValue({ state: 'VALID' });
  });

  afterEach(() => {
    cleanup();
  });

  it('verifies the email-change token from the query string', async () => {
    renderConfirmEmailChangePage();

    expect(verifyEmailChange).toHaveBeenCalledWith(changeToken);
    expect(await screen.findByText('Email change confirmed.')).toBeInTheDocument();
  });

  it('shows a token error when the token query parameter is missing', async () => {
    renderConfirmEmailChangePage('/confirm-email-change');

    expect(verifyEmailChange).not.toHaveBeenCalledWith();
    expect(
      await screen.findByText(
        'This email change link is missing a token. Please request a new link.',
      ),
    ).toBeInTheDocument();
  });

  it('shows a safe already-complete message for used email-change links', async () => {
    verifyEmailChangeMock.mockResolvedValue({ state: 'USED' });

    renderConfirmEmailChangePage();

    expect(
      await screen.findByText('This email change link has already been used.'),
    ).toBeInTheDocument();
  });

  it('shows a token error expired email-change links', async () => {
    verifyEmailChangeMock.mockResolvedValue({ state: 'EXPIRED' });

    renderConfirmEmailChangePage();

    expect(
      await screen.findByText('This email change link has expired. Please request a new link.'),
    ).toBeInTheDocument();
  });
});
