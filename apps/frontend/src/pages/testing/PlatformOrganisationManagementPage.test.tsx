import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlatformOrganisationManagementPage from '../PlatformOrganisationManagementPage';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';

describe('PlatformOrganisationManagementPage', () => {
  // Helper Function to Return Rendered Page
  const renderPage = () => {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <PlatformOrganisationManagementPage />
        </AuthProvider>
      </MemoryRouter>,
    );
  };

  it('renders the page heading and description', () => {
    renderPage();
    expect(screen.getByText('Organisation Management')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Review organisation registration requests and manage existing organisations.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the search bar', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Search Organisations')).toBeInTheDocument();
  });

  it('renders the request status combobox', () => {
    renderPage();
    expect(screen.getByRole('combobox', { name: 'Request status' })).toBeInTheDocument();
  });

  it('renders the two comboboxes', () => {
    renderPage();
    expect(screen.getByRole('combobox', { name: 'Request status' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Organisation status' })).toBeInTheDocument();
  });

  it('renders the organisations table', () => {
    renderPage();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders all the table headings', () => {
    renderPage();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Size' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Website' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Representative' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Request Status' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Organisation Status' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
  });
});
