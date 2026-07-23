import { describe, expect, it } from 'vitest';
import { render, fireEvent, screen, within } from '@testing-library/react';
import PlatformOrganisationManagementPage from '../PlatformOrganisationManagementPage';

describe('PlatformOrganisationManagementPage', () => {
  // Helper Function to Return Rendered Page
  const renderPage = () => {
    return render(<PlatformOrganisationManagementPage />);
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
    expect(screen.getByText('Request Status')).toBeInTheDocument();
  });

  it('renders the organisation status combobox', () => {
    renderPage();
    expect(screen.getByText('Organisation Status')).toBeInTheDocument();
  });

  it('renders the organisations table', () => {
    renderPage();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders all the table headings', () => {
    renderPage();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('Website')).toBeInTheDocument();
    expect(screen.getByText('Representative')).toBeInTheDocument();
    expect(screen.getByText('Request Status')).toBeInTheDocument();
    expect(screen.getByText('Organisation Status')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});
