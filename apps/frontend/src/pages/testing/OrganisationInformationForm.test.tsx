import OrganisationInformationForm from '../../components/org-reg/OrganisationInformationForm';

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

const defaultProps = {
  orgName: '',
  setOrgName: vi.fn(),
  orgDescrip: '',
  setOrgDescrip: vi.fn(),
  orgWeb: '',
  setOrgWeb: vi.fn(),
  orgSize: '' as number | '',
  setOrgSize: vi.fn(),
  onNext: vi.fn(),
};

describe('OrganisationInformationForm', () => {
  // Test 1: Render the Form
  it('renders the organisation information form headings', () => {
    render(
      <MemoryRouter>
        <OrganisationInformationForm {...defaultProps} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Organisation Information/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Step 1 of 2/i })).toBeInTheDocument();
  });

  // Test 2: Render all Fields
  it('renders all organisation information fields', () => {
    render(
      <MemoryRouter>
        <OrganisationInformationForm {...defaultProps} />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/Organisation Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organisation Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organisation URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organisation Size/i)).toBeInTheDocument();
  });

  // Test 3: Render Navigation Buttons
  it('renders the navigation buttons', () => {
    render(
      <MemoryRouter>
        <OrganisationInformationForm {...defaultProps} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Back to Login/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
  });

  // Test 4: Next button Called
  it('calls onNext when Next is clicked', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();

    render(
      <MemoryRouter>
        <OrganisationInformationForm {...defaultProps} onNext={onNext} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Next/i }));
    expect(onNext).toHaveBeenCalledOnce();
  });
});
