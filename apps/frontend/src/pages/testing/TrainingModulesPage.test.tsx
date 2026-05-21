import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import TrainingModulesPage from '../TrainingModulesPage';

vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('TrainingModulesPage', () => {
  it('redirects learners to campaigns for training access', () => {
    render(
      <MemoryRouter initialEntries={['/training/modules']}>
        <TrainingModulesPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Training Modules' })).toBeInTheDocument();
    expect(screen.getByText(/training access is now campaign-based/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open campaigns/i })).toHaveAttribute(
      'href',
      '/campaigns',
    );
  });
});
