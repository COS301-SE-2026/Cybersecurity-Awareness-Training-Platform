import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../context/AuthContext';
import * as trainingApi from '../../lib/trainingApi';
import TrainingDocumentPage from '../TrainingDocumentPage';

function renderTrainingDocumentPage(path: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/training/modules/:trainingId" element={<TrainingDocumentPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('TrainingDocumentPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  async function expectPageHeading(name: string) {
    expect(await screen.findByRole('heading', { level: 1, name })).toBeInTheDocument();
  }

  it('renders readable training document content', async () => {
    renderTrainingDocumentPage('/training/modules/phishing-basics');

    expect(screen.getByText(/loading training document/i)).toBeInTheDocument();

    await expectPageHeading('Recognising Phishing Emails');
    expect(screen.getByText(/Common warning signs/i)).toBeInTheDocument();
    expect(screen.getByText(/The email creates urgency/i)).toBeInTheDocument();
  });

  it('shows back navigation to training modules', async () => {
    renderTrainingDocumentPage('/training/modules/password-safety');

    await expectPageHeading('Password Safety');

    expect(screen.getByRole('link', { name: /back to training modules/i })).toHaveAttribute(
      'href',
      '/training/modules',
    );
  });

  it('shows linked quiz CTA when linkedQuizId exists', async () => {
    renderTrainingDocumentPage('/training/modules/phishing-basics');

    await expectPageHeading('Recognising Phishing Emails');

    expect(screen.getByRole('link', { name: /start linked quiz/i })).toHaveAttribute(
      'href',
      '/quizzes/phishing-basics-quiz',
    );
  });

  it('does not show linked quiz CTA when linkedQuizId is missing', async () => {
    renderTrainingDocumentPage('/training/modules/social-engineering');

    await expectPageHeading('Social Engineering Awareness');

    expect(screen.queryByRole('link', { name: /start linked quiz/i })).not.toBeInTheDocument();
  });

  it('shows unavailable-content state when content is missing', async () => {
    renderTrainingDocumentPage('/training/modules/unavailable-training');

    expect(await screen.findByText('Training content unavailable')).toBeInTheDocument();
  });

  it('shows an error state for an unknown training id', async () => {
    renderTrainingDocumentPage('/training/modules/unknown-training');

    expect(await screen.findByText('Unable to load training')).toBeInTheDocument();
  });

  it('tracks progress when the document is opened', async () => {
    const postTrainingProgressSpy = vi.spyOn(trainingApi, 'postTrainingProgress');

    renderTrainingDocumentPage('/training/modules/phishing-basics');

    await expectPageHeading('Recognising Phishing Emails');

    await waitFor(() => {
      expect(postTrainingProgressSpy).toHaveBeenCalledWith('phishing-basics', {
        status: 'VIEWED',
      });
    });
  });

  it('tracks completed progress when mark as read is clicked', async () => {
    const postTrainingProgressSpy = vi.spyOn(trainingApi, 'postTrainingProgress');

    renderTrainingDocumentPage('/training/modules/password-safety');

    await expectPageHeading('Password Safety');

    screen.getByRole('button', { name: /complete module/i }).click();

    await waitFor(() => {
      expect(postTrainingProgressSpy).toHaveBeenCalledWith('password-safety', {
        status: 'COMPLETED',
      });
    });
  });

  it('does not block reading when opening progress fails', async () => {
    vi.spyOn(trainingApi, 'postTrainingProgress').mockRejectedValueOnce(
      new Error('Progress failed'),
    );

    renderTrainingDocumentPage('/training/modules/phishing-basics');

    await expectPageHeading('Recognising Phishing Emails');
    expect(screen.getByText(/Common warning signs/i)).toBeInTheDocument();
  });

  it('shows a non-blocking error when mark as read fails', async () => {
    vi.spyOn(trainingApi, 'postTrainingProgress')
      .mockResolvedValueOnce({
        trainingId: 'password-safety',
        status: 'VIEWED',
        updatedAt: new Date().toISOString(),
      })
      .mockRejectedValueOnce(new Error('Failed to complete'));

    renderTrainingDocumentPage('/training/modules/password-safety');

    await expectPageHeading('Password Safety');

    screen.getByRole('button', { name: /complete module/i }).click();

    expect(await screen.findByText(/could not save your progress/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Password Safety' })).toBeInTheDocument();
  });
});
