import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import OrganisationTimelinePage from '../../components/organisation-information/OrganisationTimelinePage';

describe('OrganisationTimelinePage', () => {
  it('renders the page heading', () => {
    render(<OrganisationTimelinePage />);
    expect(
      screen.getByRole('heading', { name: /Organisation Event Timeline/i }),
    ).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<OrganisationTimelinePage />);
    expect(
      screen.getByText(
        /View the chronological history of organisation registration, onboarding, and platform events\./i,
      ),
    ).toBeInTheDocument();
  });

  it('renders the empty state message when no timeline events exist', () => {
    render(<OrganisationTimelinePage timeline={[]} />);
    expect(
      screen.getByText(/No timeline events recorded for this organisation yet\./i),
    ).toBeInTheDocument();
  });

  it('renders formatted timeline action descriptions, summary, and actor context', () => {
    const mockTimeline = [
      {
        id: 'evt-1',
        type: 'AUDIT_LOG' as const,
        timestamp: '2026-06-19T10:00:00.000Z',
        action: 'CREATED',
        summary: 'Organisation registration submitted.',
        actor: 'jan@cyberjan.co.za',
        outcome: 'SUCCESS',
        metadata: null,
      },
      {
        id: 'evt-2',
        type: 'AUDIT_LOG' as const,
        timestamp: '2026-06-19T11:00:00.000Z',
        action: 'RESENT',
        summary: 'Initial admin setup email resent.',
        actor: 'admin@platform.co.za',
        outcome: 'SUCCESS',
        metadata: null,
      },
    ];

    render(<OrganisationTimelinePage timeline={mockTimeline} />);
    expect(screen.getByText('Organisation Created')).toBeInTheDocument();
    expect(screen.getByText('Setup Invite Resent')).toBeInTheDocument();
    expect(screen.getByText('Organisation registration submitted.')).toBeInTheDocument();
    expect(screen.getByText('Actor: jan@cyberjan.co.za')).toBeInTheDocument();
    expect(screen.getByText('Actor: admin@platform.co.za')).toBeInTheDocument();
  });
});
