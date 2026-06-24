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
    expect(screen.getByRole('heading', { name: /Phishing Simulations/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Interactive Training/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Knowledge Quizzes/i })).toBeInTheDocument();
  });

  // Test 4: Team Section Exists
  it('renders the team section', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { name: /Team/i })).toBeInTheDocument();
  });

  // Test 5: Navbar Navigation Links Exists
  it('renders the navbar links', () => {
    render(<LandingPage />);
    expect(screen.getByRole('link', { name: /Home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /About & FAQs/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Features/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Team/i })).toBeInTheDocument();
  });

  // Accessibility Test (Test 6): Login Link is Keyboard Accessible
  it('login link is keyboard accessible', () => {
    render(<LandingPage />);
    const Login_Link = screen.getByRole('link', { name: /login/i });
    Login_Link.focus();
    expect(Login_Link).toHaveFocus();
  });
}); //describe
