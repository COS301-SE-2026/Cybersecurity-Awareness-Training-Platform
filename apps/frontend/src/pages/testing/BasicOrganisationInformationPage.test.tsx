import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BasicOrganisationInformationPage from '../../components/organisation-information/BasicOrganisationInformationPage';

// === BEGIN TESTING ===
describe('BasicOrganisationInformationPage', () => {
  it('renders the page heading', () => {
    render(<BasicOrganisationInformationPage />);
    expect(
      screen.getByRole('heading', { name: /Basic Organisation Information/i }),
    ).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<BasicOrganisationInformationPage />);
    expect(
      screen.getByText(/View the organisation's registered information and current status\./i),
    ).toBeInTheDocument();
  });

  it('renders all the organisation information fields', () => {
    render(<BasicOrganisationInformationPage />);
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Website/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Size \(Approximate Number of Employees\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Registered Trainees/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Registration Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
  });

  it('renders all inputs as disabled', () => {
    render(<BasicOrganisationInformationPage />);
    expect(screen.getByLabelText(/Name/i)).toBeDisabled();
    expect(screen.getByLabelText(/Description/i)).toBeDisabled();
    expect(screen.getByLabelText(/Website/i)).toBeDisabled();
    expect(screen.getByLabelText(/Size \(Approximate Number of Employees\)/i)).toBeDisabled();
    expect(screen.getByLabelText(/Registered Trainees/i)).toBeDisabled();
    expect(screen.getByLabelText(/Registration Date/i)).toBeDisabled();
    expect(screen.getByLabelText(/Status/i)).toBeDisabled();
  });

  it('formats raw status enums to human readable presentation', () => {
    render(<BasicOrganisationInformationPage status="PENDING_ONBOARDING" />);
    expect(screen.getByLabelText(/Status/i)).toHaveValue('Approved - Waiting for Setup');
  });
});
// === END TESTING ===
