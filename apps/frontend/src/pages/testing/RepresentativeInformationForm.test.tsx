import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

import RepresentativeInformationForm from '../../components/org-reg/RepresentativeInformationForm';

const defaultProps = {
  repFName: '',
  setRepFName: vi.fn(),
  repLName: '',
  setRepLName: vi.fn(),
  repEmail: '',
  setRepEmail: vi.fn(),
  onBack: vi.fn(),
  onSubmit: vi.fn(),
};

describe('RepresentativeInformationForm', () => {
  // Test 1: Render the Form
  it('renders the representative information form headings', () => {
    render(
      <MemoryRouter>
        <RepresentativeInformationForm {...defaultProps} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /Representative Information/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Step 2 of 2/i })).toBeInTheDocument();
  });

  // Test 2: Render all Fields
  it('renders all representative information fields', () => {
    render(
      <MemoryRouter>
        <RepresentativeInformationForm {...defaultProps} />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/Representative First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Representative Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Representative Email Address/i)).toBeInTheDocument();
  });

  // Test 3: Render Navigation Buttons
  it('renders the navigation buttons', () => {
    render(
      <MemoryRouter>
        <RepresentativeInformationForm {...defaultProps} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /Back to Step 1/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Complete Registration Request/i }),
    ).toBeInTheDocument();
  });

  // Test 4: Back button Called
  it('calls onBack when Back to Step 1 is clicked', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(
      <MemoryRouter>
        <RepresentativeInformationForm {...defaultProps} onBack={onBack} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Back to Step 1/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  // Test 5: Submit button Called
  it('calls onSubmit when Complete Registration Request is clicked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <MemoryRouter>
        <RepresentativeInformationForm {...defaultProps} onSubmit={onSubmit} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Complete Registration Request/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  // Test 6: Render Organisation Administrator information
  it('renders the organisation administrator information', () => {
    render(
      <MemoryRouter>
        <RepresentativeInformationForm {...defaultProps} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /Organisation Administrator/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/This representative will be registered/i)).toBeInTheDocument();
  });
});
