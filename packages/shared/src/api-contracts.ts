// Preliminary Demo 1 API Contracts
// These types align with docs/demo1/API.md and the SRS.
// They are subject to refinement and are NOT final production schemas.

// --- Base Features: Auth ---
export interface AuthRegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthSuccessResponse {
  userId: string;
  token: string;
  message?: string;
}

// --- Common Validation Responses ---
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: ValidationErrorDetail[];
}

// --- UC-01: Simulated Inbox ---
export interface SimulatedEmailSummary {
  id: string;
  senderLabel: string;
  subject: string;
  receivedDate: string;
  isRead: boolean;
}

export interface GetInboxResponse {
  emails: SimulatedEmailSummary[];
}

export interface SimulatedEmailDetail extends SimulatedEmailSummary {
  senderAddress: string;
  bodyHtml: string;
  simulationContext: {
    isPhishing: boolean;
    warningMessage?: string;
  };
}

export interface RecordInteractionRequest {
  eventType: 'EMAIL_OPENED' | 'LINK_CLICKED';
}

// --- UC-02: Training Document ---
export interface TrainingDocumentSummary {
  id: string;
  title: string;
  description: string;
  status: 'NOT_STARTED' | 'STARTED' | 'VIEWED' | 'COMPLETED';
}

export interface GetAssignedTrainingResponse {
  trainingDocuments: TrainingDocumentSummary[];
}

export interface TrainingDocumentDetail {
  id: string;
  title: string;
  contentMarkdown: string;
  linkedQuizId?: string;
}

export interface RecordTrainingProgressRequest {
  status: 'STARTED' | 'VIEWED' | 'COMPLETED';
}

// --- UC-03: Quiz Flow ---
export interface QuizQuestion {
  id: string;
  text: string;
  type: 'MULTIPLE_CHOICE';
  options: string[];
}

export interface QuizDetail {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

export interface StartQuizAttemptResponse {
  attemptId: string;
  status: 'IN_PROGRESS';
}

export interface QuizAnswerInput {
  questionId: string;
  answerValue: string;
}

export interface SubmitQuizAttemptRequest {
  answers: QuizAnswerInput[];
}

export interface SubmitQuizAttemptResponse {
  success: boolean;
  attemptId: string;
  status: 'SUBMITTED';
}

export interface FeedbackItem {
  questionId: string;
  isCorrect: boolean;
  explanation: string;
}

export interface GetQuizResultResponse {
  attemptId: string;
  scorePercentage: number;
  passed: boolean;
  feedback: FeedbackItem[];
}
