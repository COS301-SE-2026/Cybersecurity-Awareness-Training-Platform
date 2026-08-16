import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import CampaignBuilder from './CampaignBuilder';

describe('CampaignBuilder', () => {
  it('initializes and edits Campaign name and description', async () => {
    const user = userEvent.setup();

    render(
      <CampaignBuilder
        initialDraft={{
          name: 'Initial Campaign',
          description: 'Initial description',
        }}
      />,
    );

    const name = screen.getByRole('textbox', { name: 'Campaign name' });
    const description = screen.getByRole('textbox', { name: 'Description' });

    expect(name).toHaveValue('Initial Campaign');
    expect(description).toHaveValue('Initial description');

    await user.clear(name);
    await user.type(name, 'Changed Campaign');
    await user.clear(description);
    await user.type(description, 'Changed description');

    expect(name).toHaveValue('Changed Campaign');
    expect(description).toHaveValue('Changed description');
  });
});
