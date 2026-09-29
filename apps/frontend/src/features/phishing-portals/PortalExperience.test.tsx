import {
  getPortalTemplatePresentation,
  type RecordPortalInteractionRequest,
} from '@insightful-phish/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PortalExperience } from './PortalExperience';

describe('PortalExperience', () => {
  it('shows the educational reveal when credential-attempt recording fails', async () => {
    const onInteraction = vi.fn(async (request: RecordPortalInteractionRequest) => {
      if (request.eventType !== 'CREDENTIAL_SUBMISSION_ATTEMPTED') return;
      throw new Error('Request failed');
    });
    const user = userEvent.setup();

    render(
      <PortalExperience
        presentation={getPortalTemplatePresentation('GENERIC_ACCOUNT_LOGIN_V1')}
        reveal={null}
        onInteraction={onInteraction}
        interactionFailed
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { name: 'This was an authorised phishing simulation' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Some activity could not be recorded. You can continue safely.',
    );
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
  });
});
