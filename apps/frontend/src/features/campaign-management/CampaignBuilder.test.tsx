import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import CampaignBuilder from './CampaignBuilder';

const INITIAL_DRAFT = {
  name: 'Initial Campaign',
  description: 'Initial description',
  accentColor: '#8400FF',
  startDate: '',
  endDate: '',
};

describe('CampaignBuilder', () => {
  it('initializes and edits Campaign name and description', async () => {
    const user = userEvent.setup();

    render(
      <CampaignBuilder
        contextKind="organisation"
        initialDraft={{
          name: 'Initial Campaign',
          description: 'Initial description',
          accentColor: '#8400FF',
          startDate: '',
          endDate: '',
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

  it('allows a Campaign colour to be selected', async () => {
    const user = userEvent.setup();

    render(<CampaignBuilder contextKind="organisation" initialDraft={INITIAL_DRAFT} />);

    await user.click(screen.getByRole('radio', { name: 'Deep Current' }));
    expect(screen.getByRole('radio', { name: 'Deep Current' })).toBeChecked();
  });

  it('shows schedule fields for an organisation Campaign', () => {
    render(<CampaignBuilder contextKind="organisation" initialDraft={INITIAL_DRAFT} />);

    expect(screen.getByLabelText('Start date and time')).toBeInTheDocument();
    expect(screen.getByLabelText('End date and time')).toBeInTheDocument();
  });

  it('does not show schedule field for a platform Campaign', () => {
    render(<CampaignBuilder contextKind="platform" initialDraft={INITIAL_DRAFT} />);

    expect(screen.queryByLabelText('Start date and time')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('End date and time')).not.toBeInTheDocument();
  });

  it('shows validation when the end is not after the start', () => {
    render(<CampaignBuilder contextKind="organisation" initialDraft={INITIAL_DRAFT} />);

    const startDate = screen.getByLabelText('Start date and time');
    const endDate = screen.getByLabelText('End date and time');

    fireEvent.change(startDate, {
      target: {
        value: '2026-09-02T10:00',
      },
    });
    fireEvent.change(endDate, {
      target: {
        value: '2026-09-02T10:00',
      },
    });

    expect(
      screen.getByText('End date and time must be after the start date and time.'),
    ).toBeInTheDocument();
    expect(endDate).toHaveAttribute('aria-invalid', 'true');
    expect(endDate).toHaveAttribute('aria-describedby', 'campaign-end-date-error');
  });

  it('removes schedule validation after the end is corrected', () => {
    render(<CampaignBuilder contextKind="organisation" initialDraft={INITIAL_DRAFT} />);

    const startDate = screen.getByLabelText('Start date and time');
    const endDate = screen.getByLabelText('End date and time');

    fireEvent.change(startDate, {
      target: {
        value: '2026-09-02T10:00',
      },
    });
    fireEvent.change(endDate, {
      target: {
        value: '2026-09-02T10:00',
      },
    });

    expect(
      screen.getByText('End date and time must be after the start date and time.'),
    ).toBeInTheDocument();

    fireEvent.change(endDate, {
      target: {
        value: '2026-09-02T11:00',
      },
    });

    expect(
      screen.queryByText('End date and time must be after the start date and time.'),
    ).not.toBeInTheDocument();
    expect(endDate).toHaveAttribute('aria-invalid', 'false');
    expect(endDate).not.toHaveAttribute('aria-describedby');
  });
});
