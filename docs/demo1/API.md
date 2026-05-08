# Demo 1 Preliminary API Contracts

## Purpose

This document collects preliminary API contracts for Sprint 1 Demo 1. Contracts support frontend/backend alignment, SRS use cases, domain terminology, and testing preparation. They provide enough detail to unblock frontend mock development and backend routing without requiring final OpenAPI/Swagger specifications at this stage.

## Base Feature Contracts

### `POST /auth/register`

- **Purpose**: Registers a new Learner/Employee user in the system.
- **Related Use Case / Base Feature**: Base Feature: Login/Register
- **Method & Route**: `POST /auth/register`
- **Expected Request Data**:
  - `email` (string, required)
  - `password` (string, required)
  - `name` (string, required)
- **Expected Response Data**:
  - `201 Created`: `{ "userId": "uuid", "token": "jwt-placeholder", "message": "Registration successful" }`
- **Common Error Responses**:
  - `400 Bad Request`: `{ "error": "Validation failed", "fields": ["email"] }`
  - `409 Conflict`: `{ "error": "Email already in use" }`
- **Linked Domain Entities**: `User`
- **Related Requirement IDs**: SRS Base Features section

### `POST /auth/login`

- **Purpose**: Authenticates an existing user and returns a session token.
- **Related Use Case / Base Feature**: Base Feature: Login/Register
- **Method & Route**: `POST /auth/login`
- **Expected Request Data**:
  - `email` (string, required)
  - `password` (string, required)
- **Expected Response Data**:
  - `200 OK`: `{ "userId": "uuid", "token": "jwt-placeholder" }`
- **Common Error Responses**:
  - `401 Unauthorized`: `{ "error": "Invalid credentials" }`
- **Linked Domain Entities**: `User`
- **Related Requirement IDs**: SRS Base Features section

### General Form Validation Responses

- **Request Context**: Any endpoint accepting input data or requiring authorization.
- **Purpose**: Establishes a standard error shape for frontend forms and actions to consume consistently.
- **Related Use Case / Base Feature**: Base Feature: General form validation responses
- **Expected Response Shape**: Standardized error object with an optional array of specific field validation details.
  ```json
  {
    "error": "Validation Error",
    "details": [{ "field": "password", "message": "Password is required" }]
  }
  ```
- **Common Validation/Status Errors**:
  - `400 Bad Request`: General malformed input or missing required fields (e.g., unanswered quiz questions).
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `403 Forbidden`: Authenticated, but lacking permission (e.g., trying to access unassigned campaign data).
  - `422 Unprocessable Entity`: Data is formatted correctly but semantically invalid (e.g., submitting an answer for a non-existent question).
- **Linked Domain Entities**: Not domain-specific (applies globally).
- **Related Requirement IDs**: SRS validation sections (QA-VALIDATION placeholders).

## UC-01: Simulated Inbox Contracts

### `GET /simulations/inbox`

- **Purpose**: Retrieves a summary list of simulated emails assigned to the authenticated Learner/Employee.
- **Related Use Case / Base Feature**: UC-01: View emails in simulated inbox
- **Method & Route**: `GET /simulations/inbox`
- **Expected Request Data**: None (Relies on auth context)
- **Expected Response Data**:
  - `200 OK`:
    ```json
    {
      "emails": [
        {
          "id": "email-001",
          "senderLabel": "IT Support",
          "subject": "Urgent Password Reset",
          "receivedDate": "2026-05-01T10:00:00Z",
          "isRead": false
        }
      ]
    }
    ```
- **Common Error Responses**:
  - `401 Unauthorized`: Missing or invalid token.
- **Linked Domain Entities**: `SimulatedInbox`, `SimulatedEmail`, `CampaignAssignment`
- **Related Requirement IDs**: FR-UC01-01, API-UC01-01

### `GET /simulations/emails/:emailId`

- **Purpose**: Retrieves the detailed content of a specific simulated email.
- **Related Use Case / Base Feature**: UC-01: View emails in simulated inbox
- **Method & Route**: `GET /simulations/emails/:emailId`
- **Expected Request Data**: URL Param `emailId`
- **Expected Response Data**:
  - `200 OK`:
    ```json
    {
      "id": "email-001",
      "senderLabel": "IT Support",
      "senderAddress": "support@corp-security.com",
      "subject": "Urgent Password Reset",
      "bodyHtml": "<p>Please click here to reset your password...</p>",
      "simulationContext": {
        "isPhishing": true,
        "warningMessage": "This is a simulated phishing email."
      }
    }
    ```
- **Common Error Responses**:
  - `404 Not Found`: `{ "error": "Email not found or access denied" }`
- **Linked Domain Entities**: `SimulatedEmail`, `SimulationContext`
- **Related Requirement IDs**: FR-UC01-02, FR-UC01-05, API-UC01-02

### `POST /simulations/emails/:emailId/interactions`

- **Purpose**: Records a lightweight interaction event (e.g., opened, link clicked) for a simulated email.
- **Related Use Case / Base Feature**: UC-01: View emails in simulated inbox
- **Method & Route**: `POST /simulations/emails/:emailId/interactions`
- **Expected Request Data**:
  - `eventType` (enum: "EMAIL_OPENED", "LINK_CLICKED", required)
- **Expected Response Data**:
  - `201 Created`: `{ "success": true }`
- **Common Error Responses**:
  - `404 Not Found`: If email doesn't exist.
- **Linked Domain Entities**: `InteractionEvent`, `SimulatedEmail`
- **Related Requirement IDs**: FR-UC01-04, TRK-UC01-01, API-UC01-03

## UC-02: Training Document Contracts

### `GET /training/assigned`

- **Purpose**: Retrieves a list of training documents assigned to the learner.
- **Related Use Case / Base Feature**: UC-02: View training document
- **Method & Route**: `GET /training/assigned`
- **Expected Request Data**: None (Relies on auth context)
- **Expected Response Data**:
  - `200 OK`:
    ```json
    {
      "trainingDocuments": [
        {
          "id": "train-001",
          "title": "Identifying Phishing Emails",
          "description": "Learn the common red flags of phishing.",
          "status": "NOT_STARTED"
        }
      ]
    }
    ```
- **Common Error Responses**:
  - `401 Unauthorized`
- **Linked Domain Entities**: `TrainingDocument`, `LearningPath`, `TrainingProgress`
- **Related Requirement IDs**: FR-UC02-01, API-UC02-01

### `GET /training/:trainingId`

- **Purpose**: Retrieves the full content of a specific training document.
- **Related Use Case / Base Feature**: UC-02: View training document
- **Method & Route**: `GET /training/:trainingId`
- **Expected Request Data**: URL Param `trainingId`
- **Expected Response Data**:
  - `200 OK`:
    ```json
    {
      "id": "train-001",
      "title": "Identifying Phishing Emails",
      "contentMarkdown": "# Introduction\nPhishing is...",
      "linkedQuizId": "quiz-001"
    }
    ```
- **Common Error Responses**:
  - `404 Not Found`: `{ "error": "Training document not found" }`
- **Linked Domain Entities**: `TrainingDocument`, `TrainingReference`
- **Related Requirement IDs**: FR-UC02-02, API-UC02-02

### `POST /training/:trainingId/progress`

- **Purpose**: Records learner progression or interaction with a training document.
- **Related Use Case / Base Feature**: UC-02: View training document
- **Method & Route**: `POST /training/:trainingId/progress`
- **Expected Request Data**:
  - `status` (enum: "STARTED", "VIEWED", "COMPLETED", required)
- **Expected Response Data**:
  - `201 Created`: `{ "success": true }`
- **Common Error Responses**:
  - `404 Not Found`
- **Linked Domain Entities**: `TrainingProgress`, `InteractionEvent`
- **Related Requirement IDs**: FR-UC02-04, API-UC02-03

## UC-03: Quiz Flow Contracts

### `GET /quizzes/:quizId`

- **Purpose**: Retrieves the content and structure of a quiz before starting an attempt.
- **Related Use Case / Base Feature**: UC-03: Complete quiz flow
- **Method & Route**: `GET /quizzes/:quizId`
- **Expected Request Data**: URL Param `quizId`
- **Expected Response Data**:
  - `200 OK`:
    ```json
    {
      "id": "quiz-001",
      "title": "Phishing Knowledge Check",
      "questions": [
        {
          "id": "q-001",
          "text": "What is the best way to verify an email sender?",
          "type": "MULTIPLE_CHOICE",
          "options": ["Click the link", "Check the sender address", "Reply and ask"]
        }
      ]
    }
    ```
- **Common Error Responses**:
  - `404 Not Found`: `{ "error": "Quiz not found" }`
- **Linked Domain Entities**: `Quiz`, `QuizQuestion`
- **Related Requirement IDs**: FR-UC03-02, API-UC03-01

### `POST /quizzes/:quizId/attempts`

- **Purpose**: Creates a new attempt session when the learner starts the quiz.
- **Related Use Case / Base Feature**: UC-03: Complete quiz flow
- **Method & Route**: `POST /quizzes/:quizId/attempts`
- **Expected Request Data**: None
- **Expected Response Data**:
  - `201 Created`: `{ "attemptId": "attempt-123", "status": "IN_PROGRESS" }`
- **Common Error Responses**:
  - `404 Not Found`
- **Linked Domain Entities**: `QuizAttempt`
- **Related Requirement IDs**: FR-UC03-03, API-UC03-02

### `POST /quiz-attempts/:attemptId/submit`

- **Purpose**: Submits the final answers for a quiz attempt and calculates the result.
- **Related Use Case / Base Feature**: UC-03: Complete quiz flow
- **Method & Route**: `POST /quiz-attempts/:attemptId/submit`
- **Expected Request Data**:
  - `answers` (array of objects containing `questionId` and `answerValue`)
- **Expected Response Data**:
  - `200 OK`: `{ "success": true, "attemptId": "attempt-123", "status": "SUBMITTED" }`
- **Common Error Responses**:
  - `400 Bad Request`: `{ "error": "Unanswered required questions", "unanswered": ["q-001"] }`
  - `409 Conflict`: `{ "error": "Attempt already submitted" }`
- **Linked Domain Entities**: `AttemptAnswer`, `QuizAttempt`
- **Related Requirement IDs**: FR-UC03-05, FR-UC03-06, API-UC03-03

### `GET /quiz-attempts/:attemptId/results`

- **Purpose**: Retrieves the results and educational feedback for a submitted attempt.
- **Related Use Case / Base Feature**: UC-03: Complete quiz flow
- **Method & Route**: `GET /quiz-attempts/:attemptId/results`
- **Expected Request Data**: URL Param `attemptId`
- **Expected Response Data**:
  - `200 OK`:
    ```json
    {
      "attemptId": "attempt-123",
      "scorePercentage": 100,
      "passed": true,
      "feedback": [
        {
          "questionId": "q-001",
          "isCorrect": true,
          "explanation": "Checking the exact sender address prevents spoofing attacks."
        }
      ]
    }
    ```
- **Common Error Responses**:
  - `400 Bad Request`: If attempt is not yet submitted.
- **Linked Domain Entities**: `QuizResult`, `FeedbackItem`
- **Related Requirement IDs**: FR-UC03-07, FR-UC03-08, API-UC03-04

## Supporting Admin/Campaign Context

> [!NOTE]
> The following API endpoints are **preliminary placeholder contracts** only. They are documented to establish the necessary context for campaign-managed data and are **not** required backend endpoints for the Demo 1 implementation.

### `POST /campaigns`

- **Purpose**: Allows an administrator to initialize a new campaign entity.
- **Related Use Case / Base Feature**: Admin Context (Supporting Context)
- **Method & Route**: `POST /campaigns`
- **Expected Request Data**:
  - `name` (string, required)
  - `description` (string, optional)
  - `status` (enum: "DRAFT")
- **Expected Response Data**:
  - `201 Created`: `{ "campaignId": "uuid-123", "name": "Q2 Phishing Awareness", "status": "DRAFT" }`
- **Common Error Responses**:
  - `401 Unauthorized` / `403 Forbidden`: Admin role required.
- **Linked Domain Entities**: `Campaign`
- **Related Requirement IDs**: FR-ADM-01, API-ADM-01

### `POST /campaigns/:campaignId/assign`

- **Purpose**: Links a list of employees to the campaign for training delivery.
- **Related Use Case / Base Feature**: Admin Context (Supporting Context)
- **Method & Route**: `POST /campaigns/:campaignId/assign`
- **Expected Request Data**:
  - `employeeIds` (array of strings, required)
- **Expected Response Data**:
  - `200 OK`: `{ "success": true, "assignedCount": 2 }`
- **Common Error Responses**:
  - `404 Not Found`: Campaign not found.
- **Linked Domain Entities**: `CampaignAssignment`, `User`
- **Related Requirement IDs**: FR-ADM-02, API-ADM-02

## QA and Testing Expectations

- **Reviewable Code**: QA can review these contracts against frontend logic to verify error states (like `400 Bad Request` or `404 Not Found`) are properly mapped to user-facing messages.
- **Mock Responses**: The exact JSON structures above should be used by developers and QA to build and test frontend mock servers before the backend is fully implemented.

## Cross-References

### SRS

See `SRS.md` for full Demo 1 requirements, use cases, and functional specifications.

### Domain Diagrams

See `diagrams/demo1-domain-model-(initial).drawio` for relationships between domain entities (e.g., `QuizAttempt`, `InteractionEvent`).

### Testing

See `testing.md` for QA strategies and test plans utilizing these contracts.

### Traceability

See `traceability.md` for tracking requirement alignment.
