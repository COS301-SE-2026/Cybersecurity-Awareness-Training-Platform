import type { ReactNode } from 'react';
import { TrainingStatePanel } from './TrainingStatePanel';

type TrainingAsyncContentProps = {
  isLoading: boolean;
  loadingTitle: string;
  loadingMessage: string;
  errorMessage?: string | null;
  errorTitle: string;
  errorAction?: ReactNode;
  isEmpty?: boolean;
  emptyTitle: string;
  emptyMessage: string;
  emptyAction?: ReactNode;
  children: ReactNode;
};

export function TrainingAsyncContent({
  isLoading,
  loadingTitle,
  loadingMessage,
  errorMessage,
  errorTitle,
  errorAction,
  isEmpty = false,
  emptyTitle,
  emptyMessage,
  emptyAction,
  children,
}: TrainingAsyncContentProps) {
  if (isLoading) {
    return <TrainingStatePanel title={loadingTitle} message={loadingMessage} />;
  }

  if (errorMessage) {
    return <TrainingStatePanel title={errorTitle} message={errorMessage} action={errorAction} />;
  }

  if (isEmpty) {
    return <TrainingStatePanel title={emptyTitle} message={emptyMessage} action={emptyAction} />;
  }

  return <>{children}</>;
}
