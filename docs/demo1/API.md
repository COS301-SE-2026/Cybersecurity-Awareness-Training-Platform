# Demo 1 Preliminary API Contracts

## Purpose

This document collects preliminary API contracts for Sprint 1 Demo 1. Contracts support frontend/backend alignment, SRS use cases, domain terminology, and testing preparation. They provide enough detail to unblock frontend mock development and backend routing without requiring final OpenAPI/Swagger specifications at this stage.

## API and Domain Terminology Alignment

These API contracts use preliminary route names and payload shapes to support planning and frontend/backend alignment. They are not final OpenAPI specifications.

The following terminology should remain aligned with the SRS and domain model:

| API Term / Route Area                       | Aligned Domain Concept                                                                | Related SRS Area                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------- |
| `/simulations/inbox`                        | `CampaignAssignment`, `CampaignItem`, `Simulation`, `SimulatedInbox`                  | UC-01 simulated inbox             |
| `/simulations/emails/:emailId`              | `SimulatedEmail`                                                                      | UC-01 simulated email detail      |
| `/simulations/emails/:emailId/interactions` | `InteractionEvent`                                                                    | UC-01 simulated email tracking    |
| `/training/assigned`                        | `CampaignAssignment`, `CampaignItem`, `TrainingDocumentComponent`, `TrainingDocument` | UC-02 training document viewing   |
| `/training/:trainingId`                     | `TrainingDocument`                                                                    | UC-02 selected training document  |
| `/training/:trainingId/progress`            | `InteractionEvent`                                                                    | UC-02 training interaction        |
| `/quizzes/:quizId`                          | `CampaignItem`, `QuizComponent`, `Quiz`, `QuizQuestion`, `AnswerOption`               | UC-03 quiz content                |
| `/quizzes/:quizId/attempts`                 | `QuizAttempt`                                                                         | UC-03 quiz attempt creation       |
| `/quiz-attempts/:attemptId/submit`          | `QuizAttempt`, `AttemptAnswer`, `AttemptAnswerOption`                                 | UC-03 quiz submission             |
| `/quiz-attempts/:attemptId/results`         | `QuizResult`, `AnswerOption`                                                          | UC-03 results and feedback        |
| `/campaigns`                                | `Campaign`, `CampaignItem`                                                            | Supporting admin/campaign context |
| `/campaigns/:campaignId/assign`             | `CampaignAssignment`, `LearnerProfile`                                                | Supporting admin/campaign context |
| Future reporting placeholder                | `ReportSummary`, `RiskIndicator`                                                      | Future reporting support          |

Where the API uses practical route names such as `trainingId` or `emailId`, these are preliminary identifiers for the related conceptual domain entities. Learner-facing content should be resolved through campaign assignments and campaign items/components.

## Base Feature Contracts

### `POST /auth/register`

- **Purpose**: Registers a new trainee account in the system.
- **Related Use Case / Base Feature**: Base Feature: Login/Register
- **Method & Route**: `POST /auth/register`
- **Expected Request Data**:
  - `email` (string, required)
  - `password` (string, required)
  - `firstName` (string, required)
  - `lastName` (string, required)
- **Expected Response Data**:
  - `201 Created`: `{ "userId": "uuid", "token": "jwt-placeholder", "message": "Registration successful" }`
- **Common Error Responses**:
  - `400 Bad Request`: `{ "error": "Validation failed", "fields": ["email"] }`
  - `409 Conflict`: `{ "error": "Email already in use" }`
- **Linked Domain Entities**: `User`, optional learner/admin profile
- **Related Requirement IDs**: SRS Base Features section

### `POST /auth/login`

- **Purpose**: Authenticates an existing account and returns a session token.
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

### Current User Shape

Current-user responses should expose the account and role context clearly:

```json
{
  "id": "user-001",
  "firstName": "Ava",
  "lastName": "Learner",
  "email": "ava@example.com",
  "userType": "ORGANISATION_LEARNER",
  "authStatus": "ACTIVE",
  "organisation": {
    "id": "org-001",
    "name": "Example Organisation"
  },
  "learnerProfile": {
    "id": "learner-001",
    "learnerStatus": "ACTIVE"
  }
}
```

`GeneralLearner` users have no organisation. `OrganisationLearner` and `OrganisationAdmin` users belong to exactly one organisation. `IPAdmin` users are platform-level and are not organisation-linked.

### General Form Validation Responses

- **Request Context**: Any endpoint accepting input data or requiring authorization.
- **Purpose**: Establishes a standard error shape for frontend forms and actions to consume consistently.
- **Related Use Case / Base Feature**: Base Feature: General form validation responses
- **Expected Response Shape**:
  ```json
  {
    "error": "Validation Error",
    "details": [{ "field": "password", "message": "Password is required" }]
  }
  ```
- **Common Validation/Status Errors**:
  - `400 Bad Request`: General malformed input or missing required fields.
  - `401 Unauthorized`: Missing or invalid authentication token.
  - `403 Forbidden`: Authenticated, but lacking permission.
  - `422 Unprocessable Entity`: Data is formatted correctly but semantically invalid.
- **Linked Domain Entities**: Not domain-specific.
- **Related Requirement IDs**: SRS validation sections.

## UC-01: View Emails in Simulated Inbox Contracts

### `GET /simulations/inbox`

- **Purpose**: Retrieves simulated emails available to the authenticated trainee through assigned or available campaign simulation components.
- **Related Use Case / Base Feature**: UC-01: View Emails in Simulated Inbox
- **Method & Route**: `GET /simulations/inbox`
- **Expected Request Data**: None (relies on auth context)
- **Expected Response Data**:
  - `200 OK`:
    ```json
    {
      "emails": [
        {
          "id": "email-001",
          "campaignAssignmentId": "assignment-001",
          "campaignItemId": "item-003",
          "senderLabel": "IT Support",
          "senderAddress": "support@example-security.test",
          "subject": "Urgent Password Reset",
          "preview": "Please confirm your account details...",
          "receivedAt": "2026-05-01T10:00:00Z",
          "hasAttachment": false
        }
      ]
    }
    ```
- **Common Error Responses**:
  - `401 Unauthorized`: Missing or invalid token.
- **Linked Domain Entities**: `CampaignAssignment`, `CampaignItem`, `Simulation`, `SimulatedInbox`, `SimulatedEmail`
- **Related Requirement IDs**: FR-UC01-01, API-UC01-01

### `GET /simulations/emails/:emailId`

- **Purpose**: Retrieves the detailed content of a specific simulated email that the trainee can access through campaign simulation content.
- **Related Use Case / Base Feature**: UC-01: View Emails in Simulated Inbox
- **Method & Route**: `GET /simulations/emails/:emailId`
- **Expected Request Data**: URL Param `emailId`
- **Expected Response Data**:
  - `200 OK`:
    ```json
    {
      "id": "email-001",
      "campaignAssignmentId": "assignment-001",
      "campaignItemId": "item-003",
      "senderLabel": "IT Support",
      "senderAddress": "support@example-security.test",
      "subject": "Urgent Password Reset",
      "preview": "Please confirm your account details...",
      "bodyHtml": "<p>Please click here to reset your password...</p>",
      "receivedAt": "2026-05-01T10:00:00Z",
      "hasAttachment": false,
      "simulatedLinkTarget": "/simulations/credential-warning"
    }
    ```
- **Common Error Responses**:
  - `404 Not Found`: `{ "error": "Email not found or access denied" }`
- **Linked Domain Entities**: `SimulatedEmail`, `CampaignAssignment`, `CampaignItem`
- **Related Requirement IDs**: FR-UC01-02, FR-UC01-05, API-UC01-02

Learner-facing responses should not reveal the expected classification or correct red flags before feedback is intentionally shown.

### `POST /simulations/emails/:emailId/interactions`

- **Purpose**: Records a lightweight interaction event for a simulated email.
- **Related Use Case / Base Feature**: UC-01: View Emails in Simulated Inbox
- **Method & Route**: `POST /simulations/emails/:emailId/interactions`
- **Expected Request Data**:
  - `eventType` (enum: `SIMULATED_EMAIL_OPENED`, `SIMULATED_EMAIL_LINK_CLICKED`, `CREDENTIAL_SUBMISSION_ATTEMPTED`, required)
  - `campaignAssignmentId` (string, optional)
  - `campaignItemId` (string, optional)
  - `metadata` (object, optional; must not include credential values or sensitive submitted input)
- **Expected Response Data**:
  - `201 Created`: `{ "success": true }`
- **Common Error Responses**:
  - `404 Not Found`: If email does not exist or access is denied.
- **Linked Domain Entities**: `InteractionEvent`, `SimulatedEmail`, `CampaignAssignment`, `CampaignItem`
- **Related Requirement IDs**: FR-UC01-04, TRK-UC01-01, API-UC01-03

## UC-02: View Training Document Contracts

### `GET /training/assigned`

- **Purpose**: Retrieves training documents available to the trainee through campaign training document components.
- **Related Use Case / Base Feature**: UC-02: View Training Document
- **Method & Route**: `GET /training/assigned`
- **Expected Request Data**: None (relies on auth context)
- **Expected Response Data**:
  - `200 OK`:
    ```json
    {
      "trainingDocuments": [
        {
          "id": "train-001",
          "campaignAssignmentId": "assignment-001",
          "campaignItemId": "item-001",
          "title": "Identifying Phishing Emails",
          "description": "Learn the common red flags of phishing.",
          "contentType": "MARKDOWN",
          "estimatedReadTimeMinutes": 8,
          "difficultyLevel": "BEGINNER",
          "status": "AVAILABLE"
        }
      ]
    }
    ```
- **Common Error Responses**:
  - `401 Unauthorized`
- **Linked Domain Entities**: `CampaignAssignment`, `CampaignItem`, `TrainingDocumentComponent`, `TrainingDocument`
- **Related Requirement IDs**: FR-UC02-01, API-UC02-01

### `GET /training/:trainingId`

- **Purpose**: Retrieves the full content of a specific training document that is available through campaign content.
- **Related Use Case / Base Feature**: UC-02: View Training Document
- **Method & Route**: `GET /training/:trainingId`
- **Expected Request Data**: URL Param `trainingId`
- **Expected Response Data**:
  - `200 OK`:
    ```json
    {
      "id": "train-001",
      "campaignAssignmentId": "assignment-001",
      "campaignItemId": "item-001",
      "title": "Identifying Phishing Emails",
      "contentType": "MARKDOWN",
      "contentRef": "training/train-001",
      "contentSummary": "Common phishing indicators and safe response steps.",
      "estimatedReadTimeMinutes": 8,
      "difficultyLevel": "BEGINNER",
      "status": "AVAILABLE"
    }
    ```
- **Common Error Responses**:
  - `404 Not Found`: `{ "error": "Training document not found or access denied" }`
- **Linked Domain Entities**: `TrainingDocument`, `CampaignAssignment`, `CampaignItem`
- **Related Requirement IDs**: FR-UC02-02, API-UC02-02

### Training Document Status Meaning

- `AVAILABLE`: The training document can currently be shown to learners.
- `UNAVAILABLE`: The training document exists but should not currently be shown.
- `ARCHIVED`: The training document is retained for history/reference but is no longer active in current learner flows.

### `POST /training/:trainingId/progress`

- **Purpose**: Records a lightweight training interaction event for the selected training document.
- **Related Use Case / Base Feature**: UC-02: View Training Document
- **Method & Route**: `POST /training/:trainingId/progress`
- **Expected Request Data**:
  - `eventType` (enum: `TRAINING_VIEWED`, `TRAINING_COMPLETED`, required)
  - `campaignAssignmentId` (string, optional)
  - `campaignItemId` (string, optional)
  - `metadata` (object, optional)
- **Expected Response Data**:
  - `201 Created`: `{ "success": true }`
- **Common Error Responses**:
  - `404 Not Found`
- **Linked Domain Entities**: `InteractionEvent`, `TrainingDocument`, `CampaignAssignment`, `CampaignItem`
- **Related Requirement IDs**: FR-UC02-04, API-UC02-03

## UC-03: Complete Quiz Flow Contracts

### `GET /quizzes/:quizId`

- **Purpose**: Retrieves the content and structure of a quiz before starting an attempt.
- **Related Use Case / Base Feature**: UC-03: Complete Quiz Flow
- **Method & Route**: `GET /quizzes/:quizId`
- **Expected Request Data**: URL Param `quizId`
- **Expected Response Data**:
  - `200 OK`:
    ```json
    {
      "id": "quiz-001",
      "campaignAssignmentId": "assignment-001",
      "campaignItemId": "item-002",
      "title": "Phishing Knowledge Check",
      "description": "Check understanding of phishing email indicators.",
      "passThresholdPercentage": 70,
      "questions": [
        {
          "id": "q-001",
          "prompt": "What is the best way to verify an email sender?",
          "questionType": "SINGLE_CHOICE",
          "position": 1,
          "options": [
            { "id": "option-001", "label": "A", "text": "Click the link", "position": 1 },
            { "id": "option-002", "label": "B", "text": "Check the sender address", "position": 2 }
          ]
        }
      ]
    }
    ```
- **Common Error Responses**:
  - `404 Not Found`: `{ "error": "Quiz not found or access denied" }`
- **Linked Domain Entities**: `CampaignItem`, `QuizComponent`, `Quiz`, `QuizQuestion`, `AnswerOption`
- **Related Requirement IDs**: FR-UC03-02, API-UC03-01

Before submission, learner-facing quiz fetch endpoints should not expose `AnswerOption.isCorrect` or feedback text.

### Schema-Aligned Validation Notes

- Auth services should trim and lowercase emails before insert and lookup because PostgreSQL text uniqueness is case-sensitive.
- `OrganisationContext.processingStatus` should represent uploaded context item processing state independently of organisation account status.
- Organisation campaigns should require `organisationId`; platform/premade general campaigns should keep `organisationId` null.
- If both campaign dates are provided, `endDate` should be greater than or equal to `startDate`.
- `CampaignAssignment.learnerProfileId` should reference the learner who receives or self-selects the campaign.
- Campaign item ordering is one-based or zero-based consistently within each campaign/group scope; services should choose one convention and apply it consistently.
- A `CampaignComponentGroup` may contain campaign components for Demo 1. Nested groups are out of scope.
- For `TrainingContentType.URL`, `contentRef` should be a valid URL. For `MARKDOWN` or `HTML`, `contentRef` should be a valid internal content reference.
- `passThresholdPercentage` and `scorePercentage` should be in the range 0-100.
- For `SINGLE_CHOICE`, exactly one answer option should be correct per question.
- Submitted answer option IDs should belong to the submitted question.
- For campaign-scoped interaction events and attempts, services should set `campaignAssignmentId` and `campaignItemId` when known.
- Interaction event metadata must not include real credentials or sensitive submitted values.

### `POST /quizzes/:quizId/attempts`

- **Purpose**: Creates a new attempt session when the trainee starts the quiz.
- **Related Use Case / Base Feature**: UC-03: Complete Quiz Flow
- **Method & Route**: `POST /quizzes/:quizId/attempts`
- **Expected Request Data**:
  - `campaignAssignmentId` (string, optional)
  - `campaignItemId` (string, optional)
- **Expected Response Data**:
  - `201 Created`: `{ "attemptId": "attempt-123", "status": "IN_PROGRESS" }`
- **Common Error Responses**:
  - `404 Not Found`
- **Linked Domain Entities**: `QuizAttempt`, `CampaignAssignment`, `CampaignItem`
- **Related Requirement IDs**: FR-UC03-03, API-UC03-02

### `POST /quiz-attempts/:attemptId/submit`

- **Purpose**: Submits the final answers for a quiz attempt and calculates the result.
- **Related Use Case / Base Feature**: UC-03: Complete Quiz Flow
- **Method & Route**: `POST /quiz-attempts/:attemptId/submit`
- **Expected Request Data**:
  - `answers` (array of objects containing `questionId` and `selectedOptionIds`)
- **Expected Response Data**:
  - `200 OK`: `{ "success": true, "attemptId": "attempt-123", "status": "SUBMITTED" }`
- **Common Error Responses**:
  - `400 Bad Request`: `{ "error": "Unanswered required questions", "unanswered": ["q-001"] }`
  - `409 Conflict`: `{ "error": "Attempt already submitted" }`
- **Linked Domain Entities**: `AttemptAnswer`, `AttemptAnswerOption`, `QuizAttempt`
- **Related Requirement IDs**: FR-UC03-05, FR-UC03-06, API-UC03-03

### `GET /quiz-attempts/:attemptId/results`

- **Purpose**: Retrieves the result summary and answer-level educational feedback for a submitted attempt.
- **Related Use Case / Base Feature**: UC-03: Complete Quiz Flow
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
          "selectedOptionIds": ["option-002"],
          "isCorrect": true,
          "feedbackText": "Checking the exact sender address helps detect spoofing."
        }
      ]
    }
    ```
- **Common Error Responses**:
  - `400 Bad Request`: If attempt is not yet submitted.
- **Linked Domain Entities**: `QuizResult`, `AttemptAnswer`, `AnswerOption`
- **Related Requirement IDs**: FR-UC03-07, FR-UC03-08, API-UC03-04

## Cross-Use-Case Tracking, Progress, and Reporting Support

The following table summarises the preliminary API contracts that support lightweight interaction tracking, quiz attempts, quiz results, and future reporting alignment for Demo 1.

These references do not introduce final analytics dashboards, final risk scoring, production reporting schemas, or database implementation details.

| Tracking API ID | Existing / Placeholder Contract                  | Related Use Case         | Purpose                                                                               | Related Requirements                                     |
| --------------- | ------------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| API-TRK-01      | `POST /simulations/emails/:emailId/interactions` | UC-01                    | Records lightweight simulated email interaction events.                               | `FR-UC01-04`, `TRK-UC01-01`, `TRK-UC01-02`               |
| API-TRK-02      | `POST /training/:trainingId/progress`            | UC-02                    | Records lightweight training document interaction events.                             | `FR-UC02-04`, `TRK-UC02-01`, `TRK-UC02-02`               |
| API-TRK-03      | `POST /quizzes/:quizId/attempts`                 | UC-03                    | Creates a quiz attempt when the trainee starts a quiz.                                | `FR-UC03-03`, `TRK-UC03-01`                              |
| API-TRK-04      | `POST /quiz-attempts/:attemptId/submit`          | UC-03                    | Submits quiz answers and marks the quiz attempt as submitted.                         | `FR-UC03-06`, `TRK-UC03-02`, `TRK-UC03-03`               |
| API-TRK-05      | `GET /quiz-attempts/:attemptId/results`          | UC-03                    | Retrieves quiz result and answer-level educational feedback for a submitted attempt.  | `FR-UC03-07`, `FR-UC03-08`, `TRK-UC03-04`, `TRK-UC03-05` |
| API-TRK-06      | Future reporting endpoint placeholder            | Future reporting support | May later retrieve aggregate interaction, quiz, classification, or risk summary data. | `RPT-DEMO1-01` to `RPT-DEMO1-06`                         |

### Future Reporting Endpoint Placeholder

> [!NOTE]
> This endpoint is a future-facing placeholder only. It is not required for the Demo 1 backend implementation and should not be treated as a final route or response schema.

#### `GET /reports/demo1/summary`

- **Purpose**: Future placeholder for retrieving a lightweight summary of interaction, quiz result, email classification, and risk-support data.
- **Related Use Case / Base Feature**: Future reporting support only.
- **Method & Route**: `GET /reports/demo1/summary`
- **Expected Request Data**: None defined for Demo 1.
- **Expected Response Data**: Not finalised. Future responses may include aggregate counts or summaries such as:
  - simulated emails opened;
  - training documents viewed or completed;
  - quiz attempts submitted;
  - quiz pass/fail summaries;
  - email classifications submitted;
  - preliminary risk indicators.
- **Linked Domain Entities**: `ReportSummary`, `RiskIndicator`, `InteractionEvent`, `EmailClassificationResponse`, `QuizResult`
- **Related Requirement IDs**: `RPT-DEMO1-01` to `RPT-DEMO1-06`
- **Scope Notes**:
  - This does not define a final analytics dashboard.
  - This does not define a final risk scoring algorithm.
  - This does not define production reporting schemas.
  - This does not require implementation for Demo 1.

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
  - `status` (enum: `DRAFT`)
  - `items` (array of campaign item/component descriptors, optional for preliminary planning)
- **Expected Response Data**:
  - `201 Created`: `{ "campaignId": "uuid-123", "name": "Q2 Phishing Awareness", "status": "DRAFT" }`
- **Common Error Responses**:
  - `401 Unauthorized` / `403 Forbidden`: Admin role required.
- **Linked Domain Entities**: `Campaign`, `CampaignItem`
- **Related Requirement IDs**: FR-ADM-01, API-ADM-01

### `POST /campaigns/:campaignId/assign`

- **Purpose**: Links one or more learner profiles to a campaign for training delivery.
- **Related Use Case / Base Feature**: Admin Context (Supporting Context)
- **Method & Route**: `POST /campaigns/:campaignId/assign`
- **Expected Request Data**:
  - `learnerProfileIds` (array of strings, required)
  - `dueDate` (ISO datetime string, optional)
  - `accessType` (enum: `ASSIGNED`, `SELF_SELECTED`, optional)
- **Expected Response Data**:
  - `200 OK`: `{ "success": true, "assignedCount": 2 }`
- **Common Error Responses**:
  - `404 Not Found`: Campaign not found.
- **Linked Domain Entities**: `CampaignAssignment`, `LearnerProfile`
- **Related Requirement IDs**: FR-ADM-02, API-ADM-02

## QA and Testing Expectations

- **Reviewable Code**: QA can review these contracts against frontend logic to verify error states are properly mapped to trainee-facing messages.
- **Mock Responses**: The JSON structures above can be used by developers and QA to build and test frontend mock servers before the backend is fully implemented.

## Cross-References

### SRS

See `SRS.md` for full Demo 1 requirements, use cases, and functional specifications.

### Domain Diagrams

See `diagrams/demo1-domain-model-(initial).drawio` for relationships between domain entities.

### Testing

See `testing.md` for QA strategies and test plans utilizing these contracts.

### Traceability

See `traceability.md` for tracking requirement alignment.
