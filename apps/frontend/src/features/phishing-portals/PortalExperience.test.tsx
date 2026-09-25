import {
  getPortalTemplatePresentation,
  type RecordPortalInteractionRequest,
} from '@insightful-phish/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PortalExperience } from './PortalExperience';

describe('PortalExperience', () => {
  it('uses a new event ID after a later deliberate submission', async () => {
    const attempted: string[] = [];
    const onInteraction = vi.fn(async (request: RecordPortalInteractionRequest) => {
      if (request.eventType !== 'CREDENTIAL_SUBMISSION_ATTEMPTED') return;
      attempted.push(request.clientEventId);
      if (attempted.length === 1) throw new Error('Request failed');
    });
    const user = userEvent.setup();

    render(
      <PortalExperience
        presentation={getPortalTemplatePresentation('GENERIC_ACCOUNT_LOGIN_V1')}
        reveal={null}
        onInteraction={onInteraction}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { name: 'This was an authorised phishing simulation' }),
    ).toBeInTheDocument();
    expect(attempted).toHaveLength(2);
    expect(attempted[0]).not.toBe(attempted[1]);
  });
});
