import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RepresentativeInformationPage from '../../components/organisation-information/RepresentativeInformationPage';

// === BEGIN TESTING ===
describe('RepresentativeInformationPage', () => {
  it('renders the page heading', () => {
    render(<RepresentativeInformationPage />);
    expect(
      screen.getByRole('heading', { name: /Organisation Representative Information/i }),
    ).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<RepresentativeInformationPage />);
    expect(
      screen.getByText(
        /View the nominated organisation representative and initial administrator setup status\./i,
      ),
    ).toBeInTheDocument();
  });

  it('renders all the representative information fields', () => {
    render(<RepresentativeInformationPage />);
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Initial Administrator Setup Status/i)).toBeInTheDocument();
  });

  it('renders all inputs as disabled', () => {
    render(<RepresentativeInformationPage />);
    expect(screen.getByLabelText(/Full Name/i)).toBeDisabled();
    expect(screen.getByLabelText(/Email Address/i)).toBeDisabled();
    expect(screen.getByLabelText(/Initial Administrator Setup Status/i)).toBeDisabled();
  });

  it('renders the resend initial administrator setup email button', () => {
    render(<RepresentativeInformationPage />);
    expect(
      screen.getByRole('button', { name: /Resend Initial Administrator Setup Email/i }),
    ).toBeInTheDocument();
  });

  it('formats setupStatus values to human-readable labels', () => {
    render(<RepresentativeInformationPage setupStatus="SENT" />);
    expect(screen.getByLabelText(/Initial Administrator Setup Status/i)).toHaveValue(
      'Invitation sent',
    );
  });

  it('displays human-readable explanation and aria-describedby for disabled resend action', () => {
    render(
      <RepresentativeInformationPage
        resendEligibility={{
          isEligible: false,
          reason: 'ACTIVE_SETUP_TOKEN_EXISTS',
        }}
      />,
    );
    const button = screen.getByRole('button', {
      name: /Resend Initial Administrator Setup Email/i,
    });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-describedby', 'resend-disabled-reason');
    expect(screen.getByText(/An active setup invitation already exists\./i)).toBeInTheDocument();
  });
});
// === END TESTING ===
