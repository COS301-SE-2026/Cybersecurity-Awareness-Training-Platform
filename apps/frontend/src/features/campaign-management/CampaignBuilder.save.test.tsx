import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CampaignBuilder from './CampaignBuilder';

const INITIAL_DRAFT = {
  name: '',
  description: '',
  accentColor: '#8400FF',
  startDate: '',
  endDate: '',
  items: [],
};

describe('CampaignBuilder Save Draft', () => {
  it('submits valid local Draft values', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <CampaignBuilder contextKind="organisation" initialDraft={INITIAL_DRAFT} onSave={onSave} />,
    );

    await user.type(screen.getByRole('textbox', { name: 'Campaign name' }), 'New Campaign');
    await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Description');
    await user.click(screen.getByRole('button', { name: 'Save Draft' }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith({
      ...INITIAL_DRAFT,
      name: 'New Campaign',
      description: 'Description',
    });
  });

  it('rejects a whitespace-only Campaign name with an associated error', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <CampaignBuilder contextKind="organisation" initialDraft={INITIAL_DRAFT} onSave={onSave} />,
    );

    const name = screen.getByRole('textbox', { name: 'Campaign name' });

    await user.type(name, '   ');
    await user.click(screen.getByRole('button', { name: 'Save Draft' }));

    const error = screen.getByText('Please enter a Campaign name.');

    expect(onSave).not.toHaveBeenCalled();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(error.id).not.toBe('');
    expect(name).toHaveAttribute('aria-describedby', error.id);
  });

  it('does not submit an invalid organisation schedule', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <CampaignBuilder
        contextKind="organisation"
        initialDraft={{ ...INITIAL_DRAFT, name: 'Scheduled Campaign' }}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText('Start date and time'), {
      target: { value: '2026-09-02T10:00' },
    });
    fireEvent.change(screen.getByLabelText('End date and time'), {
      target: { value: '2026-09-02T10:00' },
    });

    await user.click(screen.getByRole('button', { name: 'Save Draft' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByText('End date and time must be after the start date and time.'),
    ).toBeInTheDocument();
  });
});
