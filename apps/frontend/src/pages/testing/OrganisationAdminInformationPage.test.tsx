import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import OrganisationAdminInformationPage from '../../components/organisation-information/OrganisationAdminInformationPage';

describe('OrganisationAdminInformationPage', () => {
  it('renders the page heading', () => {
    render(<OrganisationAdminInformationPage />);
    expect(
      screen.getByRole('heading', { name: /Organisation Administrators/i }),
    ).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<OrganisationAdminInformationPage />);
    expect(
      screen.getByText(
        /View the organisation's current administrators and their account status\./i,
      ),
    ).toBeInTheDocument();
  });

  it('renders the administrator table headings', () => {
    render(<OrganisationAdminInformationPage />);
    expect(screen.getByRole('columnheader', { name: /Full Name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Email Address/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Administrator Status/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Actions/i })).toBeInTheDocument();
  });

  it('renders action buttons for each administrator', () => {
    render(<OrganisationAdminInformationPage />);
    expect(screen.getAllByRole('button', { name: /Remove/i })).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /Edit/i })).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /Re-Send Invite/i })).not.toHaveLength(0);
  });
});
