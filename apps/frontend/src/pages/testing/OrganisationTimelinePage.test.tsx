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
});
