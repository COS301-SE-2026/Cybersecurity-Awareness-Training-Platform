import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import LandingPage from '../LandingPage';

// LANDING PAGE TESTING

describe('LandingPage', () => {
  // Test 1: Page Renders
  it('renders the landing page heading', () => {
    render(<LandingPage />);
    expect(screen.getByText(/DON'T TAKE THE BAIT./i)).toBeInTheDocument();
  });

  // Test 2: Login Link Exists
  it('renders the login link', () => {
    render(<LandingPage />);
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
  });
});
