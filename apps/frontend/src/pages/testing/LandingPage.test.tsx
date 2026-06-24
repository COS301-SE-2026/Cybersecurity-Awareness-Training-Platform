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

  // Test 3: Features Section Exists
  it('renders the features section', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Phishing Simulations/i)).toBeInTheDocument();
    expect(screen.getByText(/Interactive Training/i)).toBeInTheDocument();
    expect(screen.getByText(/Knowledge Quizzes/i)).toBeInTheDocument();
  });
}); //describe
