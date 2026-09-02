import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CampaignBuilder from './CampaignBuilder';
import type { CampaignDraftFormState } from './campaignManagement.types';

const INITIAL_DRAFT = {
  name: 'Initial Campaign',
  description: 'Initial description',
  accentColor: '#8400FF',
  startDate: '',
  endDate: '',
  items: [],
};

const REVIEW_DRAFT = {
  name: 'Quarterly Security Awareness',
  description: '',
  accentColor: '#3100E4',
  startDate: '2026-09-01T09:00',
  endDate: '2026-09-30T17:00',
  items: [
    {
      itemType: 'COMPONENT',
      campaignItemId: 'item-quiz',
      componentType: 'QUIZ',
      contentId: 'quiz-one',
      title: 'Password Security Quiz',
      description: null,
      isRequired: true,
      sourceAvailable: true,
    },
    {
      itemType: 'GROUP',
      campaignItemId: 'group-security-basics',
      title: 'Security Basics',
      description: null,
      groupType: 'MODULE',
      completionRule: 'COMPLETE_ALL',
      isRequired: false,
      children: [],
    },
  ],
} satisfies CampaignDraftFormState;

const CATALOGUE_STATE = {
  status: 'loaded',
  items: [
    {
      id: '50000000-0000-4000-8000-000000000001',
      type: 'TRAINING_DOCUMENT',
      title: 'Password security essentials',
      description: 'Practical password guidance.',
      contentType: 'MARKDOWN',
      estimatedReadTimeMinutes: 8,
      difficultyLevel: 'BEGINNER',
      status: 'AVAILABLE',
    },
  ],
  pagination: {
    page: 1,
    limit: 10,
    totalItems: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
} as const;

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
          items: [],
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

  it('starts clean with Discard disabled', () => {
    render(<CampaignBuilder contextKind="organisation" initialDraft={INITIAL_DRAFT} />);

    expect(screen.getByRole('button', { name: 'Discard Changes' })).toBeDisabled();
  });

  it('enables Discard after a field changes', async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();

    render(
      <CampaignBuilder
        contextKind="organisation"
        initialDraft={INITIAL_DRAFT}
        onDirtyChange={onDirtyChange}
      />,
    );

    await user.type(screen.getByRole('textbox', { name: 'Campaign name' }), 'updated');
    expect(screen.getByRole('button', { name: 'Discard Changes' })).toBeEnabled();
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  it('gates existing-Draft Save by the persisted dirty state', async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    const onSave = vi.fn();

    render(
      <CampaignBuilder
        contextKind="organisation"
        initialDraft={INITIAL_DRAFT}
        onDirtyChange={onDirtyChange}
        onSave={onSave}
        requireDirtyToSave
        saveButtonText="Save Changes"
      />,
    );

    const form = screen.getByRole('form', { name: 'Campaign details' });
    const name = screen.getByRole('textbox', { name: 'Campaign name' });
    const save = screen.getByRole('button', { name: 'Save Changes' });
    const discard = screen.getByRole('button', { name: 'Discard Changes' });

    expect(save).toBeDisabled();
    expect(discard).toBeDisabled();

    fireEvent.submit(form);

    expect(onSave).not.toHaveBeenCalled();

    await user.clear(name);
    await user.type(name, 'Changed Campaign');

    expect(save).toBeEnabled();
    expect(discard).toBeEnabled();
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await user.clear(name);
    await user.type(name, INITIAL_DRAFT.name);

    expect(save).toBeDisabled();
    expect(discard).toBeDisabled();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);

    fireEvent.submit(form);

    expect(onSave).not.toHaveBeenCalled();
  });

  it('requests confirmation instead of immediately resetting', async () => {
    const user = userEvent.setup();
    const onRequestDiscard = vi.fn();

    render(
      <CampaignBuilder
        contextKind="organisation"
        initialDraft={INITIAL_DRAFT}
        onRequestDiscard={onRequestDiscard}
      />,
    );

    const name = screen.getByRole('textbox', { name: 'Campaign name' });

    await user.clear(name);
    await user.type(name, 'Changed Campaign');
    await user.click(screen.getByRole('button', { name: 'Discard Changes' }));

    expect(onRequestDiscard).toHaveBeenCalledOnce();
    expect(name).toHaveValue('Changed Campaign');
  });

  it('locks Draft mutations without showing Save progress', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <CampaignBuilder
        contextKind="platform"
        initialDraft={{
          ...INITIAL_DRAFT,
          items: [
            {
              itemType: 'COMPONENT',
              campaignItemId: 'item-quiz',
              componentType: 'QUIZ',
              contentId: 'quiz-one',
              title: 'Password quiz',
              description: null,
              isRequired: true,
              sourceAvailable: true,
            },
          ],
        }}
        onSave={onSave}
        isSaving={false}
        isMutationPending
        catalogueState={CATALOGUE_STATE}
        catalogueQuery={{ page: 1, limit: 10 }}
        onRetryCatalogue={vi.fn()}
        onCatalogueSearchChange={vi.fn()}
        onCatalogueTypeChange={vi.fn()}
        onCataloguePageChange={vi.fn()}
      />,
    );

    const save = screen.getByRole('button', { name: 'Save Draft' });

    expect(save).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Saving...' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard Changes' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Requirement for Password quiz' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Remove Password quiz from Campaign' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Add Password security essentials to Campaign' }),
    ).toBeDisabled();

    await user.click(save);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('provides Discard for a pllatform Campaing', () => {
    render(<CampaignBuilder contextKind="platform" initialDraft={INITIAL_DRAFT} />);

    expect(screen.getByRole('button', { name: 'Discard Changes' })).toBeDisabled();
  });

  it('shows current Campaign metadata and ordered component/group summary', () => {
    render(<CampaignBuilder contextKind="organisation" initialDraft={REVIEW_DRAFT} />);

    const review = screen.getByRole('region', { name: 'Review Campaign' });

    expect(within(review).getByText('Organisation Campaign')).toBeInTheDocument();
    expect(within(review).getByText('Quarterly Security Awareness')).toBeInTheDocument();
    expect(within(review).getByText('No description provided.')).toBeInTheDocument();
    expect(within(review).getByText('#3100E4')).toBeInTheDocument();
    expect(within(review).getByText('2 items')).toBeInTheDocument();

    expect(
      Array.from(review.querySelectorAll('time'), (date) => date.getAttribute('datetime')),
    ).toEqual(['2026-09-01T09:00', '2026-09-30T17:00']);

    const summary = within(review).getByRole('list', { name: 'Campaign item summary' });
    const items = within(summary).getAllByRole('listitem');

    expect(items).toHaveLength(2);
    expect(
      within(items[0]!).getByRole('heading', { name: 'Password Security Quiz' }),
    ).toBeInTheDocument();
    expect(within(items[0]!).getByText('Quiz')).toBeInTheDocument();
    expect(within(items[0]!).getByText('Required')).toBeInTheDocument();

    expect(within(items[1]!).getByRole('heading', { name: 'Security Basics' })).toBeInTheDocument();
    expect(within(items[1]!).getByText('Module Group')).toBeInTheDocument();
    expect(within(items[1]!).getByText('Optional')).toBeInTheDocument();
  });

  it('updates the review from unsaved local Draft changes', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<CampaignBuilder contextKind="platform" initialDraft={REVIEW_DRAFT} onSave={onSave} />);

    const review = screen.getByRole('region', { name: 'Review Campaign' });
    const name = screen.getByRole('textbox', { name: 'Campaign name' });

    await user.clear(name);
    await user.type(name, 'Updated Security Campaign');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Requirement for Password Security Quiz' }),
      'optional',
    );
    await user.click(screen.getByRole('button', { name: 'Move Security Basics up' }));

    expect(within(review).getByText('Updated Security Campaign')).toBeInTheDocument();

    const summary = within(review).getByRole('list', { name: 'Campaign item summary' });
    const items = within(summary).getAllByRole('listitem');

    expect(within(items[0]!).getByRole('heading', { name: 'Security Basics' })).toBeInTheDocument();
    expect(
      within(items[1]!).getByRole('heading', { name: 'Password Security Quiz' }),
    ).toBeInTheDocument();
    expect(within(items[1]!).getByText('Optional')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows an empty platform Campaign review without organisation dates', () => {
    render(<CampaignBuilder contextKind="platform" initialDraft={INITIAL_DRAFT} />);
    const review = screen.getByRole('region', { name: 'Review Campaign' });

    expect(within(review).getByText('Platform Campaign')).toBeInTheDocument();
    expect(within(review).getByText('0 items')).toBeInTheDocument();
    expect(within(review).getByText('No Campaign items added yet.')).toBeInTheDocument();
    expect(within(review).queryByText('Start date')).not.toBeInTheDocument();
    expect(within(review).queryByText('End date')).not.toBeInTheDocument();
  });
});
