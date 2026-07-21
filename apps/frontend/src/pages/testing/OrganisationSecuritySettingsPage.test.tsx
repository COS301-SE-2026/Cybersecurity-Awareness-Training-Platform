import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import OrganisationSecuritySettingsPage from '../OrganisationSecuritySettingsPage';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';

describe('OrganisationSecuritySettingsPage', () => {
  it('renders the page heading', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <OrganisationSecuritySettingsPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { name: /Organisation Security Preferences/i }),
    ).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <OrganisationSecuritySettingsPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/Configure organisation-wide security policies for all users\./i),
    ).toBeInTheDocument();
  });

  it('renders all security settings section headings', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <OrganisationSecuritySettingsPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText(/^"Remember Me" Policy$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Regular Session Length$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Idle Timeout$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Trainee Settings$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Sensitive Actions$/i)).toBeInTheDocument();
  });

  it('renders all the checkboxes', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <OrganisationSecuritySettingsPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/Enforce "Remember Me" Policy/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Allow "Remember Me"/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Enforce Regular Session Length/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Enforce Idle Timeout/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Allow Trainees to Change Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Require Re-Login for Sensitive Actions/i)).toBeInTheDocument();
  });

  it('renders the update notice', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <OrganisationSecuritySettingsPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/Some security changes apply only to new sessions/i),
    ).toBeInTheDocument();
  });

  it('renders the update button', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <OrganisationSecuritySettingsPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('button', { name: /Update Organisation Security Preferences/i }),
    ).toBeInTheDocument();
  });
});
