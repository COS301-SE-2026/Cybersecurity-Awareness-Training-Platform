import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../context/AuthContext';
import * as trainingApi from '../../lib/trainingApi';
import TrainingModulesPage from '../TrainingModulesPage';

function renderTrainingModulesPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/training/modules']}>
        <TrainingModulesPage />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('TrainingModulesPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders assigned training modules from the mock API', async () => {
    renderTrainingModulesPage();

    expect(screen.getByText(/loading training modules/i)).toBeInTheDocument();

    expect(await screen.findByText('Recognising Phishing Emails')).toBeInTheDocument();
    expect(screen.getByText('Password Safety')).toBeInTheDocument();
    expect(screen.getByText('Social Engineering Awareness')).toBeInTheDocument();
  });

  it('shows title, description, status, and open action', async () => {
    renderTrainingModulesPage();

    expect(await screen.findByText('Recognising Phishing Emails')).toBeInTheDocument();

    expect(screen.getByText(/spot suspicious senders/i)).toBeInTheDocument();
    expect(screen.getAllByText('Not Started')[0]).toBeInTheDocument();

    expect(screen.getAllByRole('link', { name: /open training/i })[0]).toHaveAttribute(
      'href',
      '/training/modules/phishing-basics',
    );
  });

  it('shows an empty state when no training is assigned', async () => {
    vi.spyOn(trainingApi, 'getAssignedTraining').mockResolvedValueOnce({
      trainingDocuments: [],
    });

    renderTrainingModulesPage();

    expect(await screen.findByText('No assigned training')).toBeInTheDocument();
  });

  it('shows an error state when assigned training fails to load', async () => {
    vi.spyOn(trainingApi, 'getAssignedTraining').mockRejectedValueOnce(new Error('Failed'));

    renderTrainingModulesPage();

    expect(await screen.findByText('Unable to load training')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('reloads assigned training when try again is clicked', async () => {
    const getAssignedTrainingSpy = vi
      .spyOn(trainingApi, 'getAssignedTraining')
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce({
        trainingDocuments: [
          {
            id: 'retry-training',
            title: 'Retry Training',
            description: 'Loaded after retry.',
            status: 'STARTED',
          },
        ],
      });

    renderTrainingModulesPage();

    const retryButton = await screen.findByRole('button', {
      name: /try again/i,
    });

    retryButton.click();

    await waitFor(() => {
      expect(getAssignedTrainingSpy).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByText('Retry Training')).toBeInTheDocument();
  });
});
