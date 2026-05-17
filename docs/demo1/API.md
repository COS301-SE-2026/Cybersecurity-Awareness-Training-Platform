# Demo 1 Preliminary API Contracts

## Purpose

This document defines the preliminary Demo 1 API contracts around the revised modular campaign domain model. The API is intentionally trainee-campaign oriented: campaigns provide access and sequencing, campaign items place reusable content, and trainee-facing endpoints resolve training, quiz, and simulation content through campaign assignments and campaign items.

These contracts support frontend/backend alignment, SRS traceability, and shared DTO planning. They are not final OpenAPI specifications.

## API and Domain Terminology Alignment

| API Route Area                                              | Aligned Domain Concept                                                              | Related SRS Area                  |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------- |
| `/auth/*`                                                   | `User`, trainee/admin profiles, optional `Organisation`                             | Base access                       |
| `/trainee/campaigns`                                        | `Campaign`, `CampaignAssignment`                                                    | Trainee campaign access           |
| `/trainee/campaigns/:campaignId`                            | `Campaign`, ordered `CampaignItem` records                                          | Trainee campaign detail           |
| `/trainee/campaign-items/:campaignItemId/*`                 | `CampaignItem`, `CampaignComponent`, `CampaignComponentGroup`                       | Campaign item activity            |
| `/trainee/campaign-items/:campaignItemId/training-document` | `TrainingDocumentComponent`, reusable `TrainingDocument`                            | UC-02 training document viewing   |
| `/trainee/campaign-items/:campaignItemId/quiz`              | `QuizComponent`, reusable `Quiz`, `QuizQuestion`, `AnswerOption`                    | UC-03 quiz content                |
| `/quiz-attempts/:attemptId/*`                               | `QuizAttempt`, `AttemptAnswer`, `AttemptAnswerOption`, `QuizResult`                 | UC-03 quiz submission/results     |
| `/trainee/campaign-items/:campaignItemId/simulated-inbox`   | `SimulationComponent`, reusable `Simulation`, `SimulatedInbox`                      | UC-01 simulated inbox             |
| `/trainee/simulated-emails/:emailId/*`                      | `SimulatedEmail`, `EmailClassificationResponse`, `EmailRedFlag`, `InteractionEvent` | UC-01 email interaction           |
| Supporting admin/campaign placeholders                      | `Campaign`, ordered `CampaignItem`, reusable content references                     | Supporting admin/campaign context |
| Future reporting placeholder                                | `ReportSummary`, `RiskIndicator`                                                    | Future reporting support          |

Training documents, quizzes, and simulations are reusable content records made available to trainees through campaign items.

## Base Feature Contracts

### `POST /auth/register`

- **Purpose**: Registers a new trainee account in the system.
- **Expected Request Data**:
  - `email` (string, required)
  - `password` (string, required)
  - `firstName` (string, required)
  - `lastName` (string, required)
- **Expected Response Data**:
  - `201 Created`: `{ "userId": "uuid", "token": "jwt-placeholder", "message": "Registration successful" }`
- **Linked Domain Entities**: `User`, optional trainee/admin profile

### `POST /auth/login`

- **Purpose**: Authenticates an existing account and returns a session token.
- **Expected Request Data**:
  - `email` (string, required)
  - `password` (string, required)
- **Expected Response Data**:
  - `200 OK`: `{ "userId": "uuid", "token": "jwt-placeholder" }`
- **Linked Domain Entities**: `User`

### `GET /auth/me`

- **Purpose**: Returns the authenticated user's identity, role, and applicable profile context.
- **Expected Response Data**:

```json
{
  "id": "user-001",
  "firstName": "Ava",
  "lastName": "Trainee",
  "email": "ava@example.com",
  "userType": "ORGANISATION_TRAINEE",
  "authStatus": "ACTIVE",
  "organisation": {
    "id": "org-001",
    "name": "Example Organisation"
  },
  "traineeProfile": {
    "id": "trainee-profile-001",
    "traineeStatus": "ACTIVE"
  }
}
```

`GeneralTrainee` users have no organisation. `OrganisationTrainee` and `OrganisationAdmin` users belong to exactly one organisation. `IPAdmin` users are platform-level and are not organisation-linked.

## Trainee Campaign Access

### `GET /trainee/campaigns`

- **Purpose**: Retrieves campaigns assigned to, or made available to, the authenticated trainee.
- **Expected Request Data**: None.
- **Expected Response Data**:

```json
{
  "campaigns": [
    {
      "id": "campaign-001",
      "organisationId": "org-001",
      "name": "Phishing Awareness Basics",
      "description": "Demo 1 phishing-awareness campaign.",
      "campaignType": "ORGANISATION_CUSTOM",
      "difficultyLevel": "BEGINNER",
      "status": "ACTIVE",
      "assignment": {
        "id": "assignment-001",
        "campaignId": "campaign-001",
        "traineeProfileId": "trainee-profile-001",
        "assignedAt": "2026-05-01T09:00:00Z",
        "dueDate": "2026-05-31T23:59:59Z",
        "assignmentStatus": "IN_PROGRESS",
        "accessType": "ASSIGNED"
      }
    }
  ]
}
```

### `GET /trainee/campaigns/:campaignId`

- **Purpose**: Retrieves a campaign, its trainee assignment context, and ordered top-level campaign items.
- **Expected Response Data**:

```json
{
  "id": "campaign-001",
  "organisationId": "org-001",
  "name": "Phishing Awareness Basics",
  "campaignType": "ORGANISATION_CUSTOM",
  "difficultyLevel": "BEGINNER",
  "status": "ACTIVE",
  "assignment": {
    "id": "assignment-001",
    "campaignId": "campaign-001",
    "traineeProfileId": "trainee-profile-001",
    "assignedAt": "2026-05-01T09:00:00Z",
    "assignmentStatus": "IN_PROGRESS",
    "accessType": "ASSIGNED"
  },
  "items": [
    {
      "id": "item-001",
      "campaignId": "campaign-001",
      "itemType": "COMPONENT",
      "componentType": "TRAINING_DOCUMENT",
      "title": "Identifying Phishing Emails",
      "position": 1,
      "isRequired": true,
      "availabilityStatus": "AVAILABLE",
      "trainingDocumentId": "train-001",
      "trainingDocument": {
        "id": "train-001",
        "title": "Identifying Phishing Emails",
        "contentSummary": "Sender verification, suspicious links, and safe reporting habits.",
        "estimatedReadTimeMinutes": 8,
        "difficultyLevel": "BEGINNER",
        "status": "AVAILABLE"
      }
    },
    {
      "id": "group-001",
      "campaignId": "campaign-001",
      "itemType": "GROUP",
      "groupType": "ASSESSMENT_SET",
      "completionRule": "COMPLETE_ALL",
      "title": "Practice",
      "position": 2,
      "isRequired": true,
      "availabilityStatus": "AVAILABLE",
      "children": [
        {
          "id": "item-002",
          "campaignId": "campaign-001",
          "parentGroupId": "group-001",
          "itemType": "COMPONENT",
          "componentType": "QUIZ",
          "title": "Phishing Knowledge Check",
          "position": 1,
          "isRequired": true,
          "availabilityStatus": "AVAILABLE",
          "quizId": "quiz-001",
          "quiz": {
            "id": "quiz-001",
            "title": "Phishing Knowledge Check",
            "passThresholdPercentage": 70,
            "difficultyLevel": "BEGINNER",
            "status": "PUBLISHED",
            "questionCount": 3
          }
        }
      ]
    }
  ]
}
```

Component groups support one level of grouping for Demo 1. API responses should not return groups inside groups.

### `POST /trainee/campaigns/:campaignId/start`

- **Purpose**: Marks a trainee's campaign assignment as started.
- **Expected Response Data**:
  - `200 OK`: `{ "success": true, "campaignId": "campaign-001" }`

### `POST /trainee/campaign-items/:campaignItemId/start`

- **Purpose**: Records that the trainee started a campaign item.
- **Expected Response Data**:
  - `200 OK`: `{ "success": true, "campaignItemId": "item-001" }`

### `POST /trainee/campaign-items/:campaignItemId/complete`

- **Purpose**: Records that the trainee completed a campaign item where completion can be explicitly marked.
- **Expected Response Data**:
  - `200 OK`: `{ "success": true, "campaignItemId": "item-001" }`

## UC-02: View Training Document Contracts

### `GET /trainee/campaign-items/:campaignItemId/training-document`

- **Purpose**: Retrieves the training document placed at a specific trainee-accessible campaign item.
- **Expected Request Data**: URL Param `campaignItemId`.
- **Access**: Requires authentication. The authenticated trainee must have an active campaign assignment for the campaign that contains the available campaign item.
- **Expected Response Data**:

```json
{
  "campaignItemId": "item-001",
  "campaignAssignmentId": "assignment-001",
  "trainingDocument": {
    "id": "train-001",
    "title": "Identifying Phishing Emails",
    "contentType": "MARKDOWN",
    "contentRef": "training/train-001",
    "contentSummary": "Common phishing indicators and safe response steps.",
    "estimatedReadTimeMinutes": 8,
    "difficultyLevel": "BEGINNER",
    "status": "AVAILABLE"
  },
  "campaignItem": {
    "title": "Identifying Phishing Emails",
    "description": "Read the guide before completing the quiz.",
    "position": 1,
    "isRequired": true,
    "availabilityStatus": "AVAILABLE"
  }
}
```

The backend resolves access through the campaign item placement:

`Trainee -> CampaignAssignment -> Campaign -> CampaignItem -> TrainingDocumentComponent -> TrainingDocument`

In the current Prisma implementation, the conceptual `TrainingDocumentComponent` is represented by a `CampaignItem` with `itemType = COMPONENT`, `componentType = TRAINING_DOCUMENT`, and `trainingDocumentId`.

Training documents are reusable content records. They are not owned by learning paths or training modules, and this endpoint does not require a linked quiz. Missing, unavailable, non-training, or unauthorised campaign items should return a safe `404` so the API does not leak content existence. The endpoint may return `429` if the trainee training route rate limit is exceeded.

### `POST /trainee/campaign-items/:campaignItemId/training-document/viewed`

- **Purpose**: Records a `TRAINING_VIEWED` interaction event for the campaign item.
- **Expected Request Data**: URL Param `campaignItemId`. No request body is required.
- **Expected Response Data**:

```json
{
  "success": true,
  "campaignItemId": "item-001",
  "trainingDocumentId": "train-001",
  "event": {
    "id": "event-001",
    "eventType": "TRAINING_VIEWED",
    "occurredAt": "2026-05-16T09:00:00.000Z"
  }
}
```

The backend reuses the same campaign assignment and item availability checks as the detail endpoint, then records a lightweight `InteractionEvent` with `targetType = TRAINING_DOCUMENT`, `targetId = trainingDocumentId`, `campaignAssignmentId`, and `campaignItemId`. Interaction event metadata should be omitted or kept minimal and must not contain sensitive values. No `TrainingProgress` record is created.

### `POST /trainee/campaign-items/:campaignItemId/training-document/completed`

- **Purpose**: Records a `TRAINING_COMPLETED` interaction event for the campaign item.
- **Expected Request Data**: URL Param `campaignItemId`. No request body is required.
- **Expected Response Data**:

```json
{
  "success": true,
  "campaignItemId": "item-001",
  "trainingDocumentId": "train-001",
  "event": {
    "id": "event-002",
    "eventType": "TRAINING_COMPLETED",
    "occurredAt": "2026-05-16T09:05:00.000Z"
  }
}
```

The backend records a lightweight `InteractionEvent` with `targetType = TRAINING_DOCUMENT`, `targetId = trainingDocumentId`, `campaignAssignmentId`, and `campaignItemId`. Missing auth returns `401`; malformed `campaignItemId` returns `400`; missing, unavailable, non-training, or unauthorised content returns a safe `404`; route rate limits may return `429`; unexpected failures return a safe `500`.

## UC-03: Complete Quiz Flow Contracts

### `GET /trainee/campaign-items/:campaignItemId/quiz`

- **Purpose**: Retrieves the quiz placed at a specific trainee-accessible campaign item.
- **Expected Request Data**: URL Param `campaignItemId`.
- **Expected Response Data**:

```json
{
  "id": "quiz-001",
  "campaignAssignmentId": "assignment-001",
  "campaignItemId": "item-002",
  "title": "Phishing Knowledge Check",
  "description": "Check understanding of phishing email indicators.",
  "passThresholdPercentage": 70,
  "difficultyLevel": "BEGINNER",
  "status": "PUBLISHED",
  "questions": [
    {
      "id": "q-001",
      "prompt": "What is the best way to verify an email sender?",
      "questionType": "SINGLE_CHOICE",
      "position": 1,
      "points": 1,
      "options": [
        { "id": "option-001", "label": "A", "text": "Click the link", "position": 1 },
        { "id": "option-002", "label": "B", "text": "Check the sender address", "position": 2 }
      ]
    }
  ]
}
```

Before submission, trainee-facing quiz fetch endpoints must not expose `AnswerOption.isCorrect` or `feedbackText`.

### `POST /trainee/campaign-items/:campaignItemId/quiz/attempts`

- **Purpose**: Creates a quiz attempt for the quiz placed at the selected campaign item.
- **Expected Request Data**:
  - `campaignAssignmentId` (string, optional)
- **Expected Response Data**:

```json
{
  "attemptId": "attempt-123",
  "traineeProfileId": "trainee-profile-001",
  "quizId": "quiz-001",
  "campaignAssignmentId": "assignment-001",
  "campaignItemId": "item-002",
  "status": "IN_PROGRESS",
  "startedAt": "2026-05-01T10:15:00Z"
}
```

### `POST /quiz-attempts/:attemptId/submit`

- **Purpose**: Submits final answers for an existing quiz attempt and calculates the result.
- **Expected Request Data**:
  - `answers` (array of objects containing `questionId` and `selectedOptionIds`)
- **Expected Response Data**:
  - `200 OK`: `{ "success": true, "attemptId": "attempt-123", "status": "SUBMITTED" }`

### `GET /quiz-attempts/:attemptId/results`

- **Purpose**: Retrieves the result summary and answer-level educational feedback for a submitted attempt.
- **Expected Response Data**:

```json
{
  "attemptId": "attempt-123",
  "quizId": "quiz-001",
  "campaignAssignmentId": "assignment-001",
  "campaignItemId": "item-002",
  "scorePercentage": 100,
  "passed": true,
  "summary": "Passed",
  "answers": [
    {
      "questionId": "q-001",
      "isCorrect": true,
      "awardedPoints": 1,
      "feedbackShown": "Checking the exact sender address helps detect spoofing.",
      "selectedOptions": [
        {
          "optionId": "option-002",
          "label": "B",
          "text": "Check the sender address",
          "isCorrect": true,
          "feedbackText": "Checking the exact sender address helps detect spoofing."
        }
      ]
    }
  ]
}
```

## UC-01: View Emails in Simulated Inbox Contracts

### `GET /trainee/campaign-items/:campaignItemId/simulated-inbox`

- **Purpose**: Retrieves the simulated inbox placed at a specific trainee-accessible campaign item.
- **Expected Request Data**: URL Param `campaignItemId`.
- **Expected Response Data**:

```json
{
  "emails": [
    {
      "id": "email-001",
      "campaignAssignmentId": "assignment-001",
      "campaignItemId": "item-003",
      "inboxId": "inbox-001",
      "senderLabel": "IT Support",
      "senderAddress": "support@example-security.test",
      "subject": "Urgent Password Reset",
      "preview": "Please confirm your account details...",
      "receivedAt": "2026-05-01T10:00:00Z",
      "difficultyLevel": "BEGINNER"
    }
  ]
}
```

This endpoint returns campaign-provided simulation content. It does not expose a permanent user-owned inbox.

### `GET /trainee/simulated-emails/:emailId`

- **Purpose**: Retrieves a simulated email that the trainee can access through an assigned or available campaign simulation item.
- **Access Rule**: The backend must resolve the simulated email through a campaign item and campaign assignment available to the authenticated trainee. The `emailId` alone is not sufficient authorization.
- **Expected Response Data**:

```json
{
  "id": "email-001",
  "campaignAssignmentId": "assignment-001",
  "campaignItemId": "item-003",
  "inboxId": "inbox-001",
  "senderLabel": "IT Support",
  "senderAddress": "support@example-security.test",
  "subject": "Urgent Password Reset",
  "preview": "Please confirm your account details...",
  "bodyHtml": "<p>Please click here to reset your password...</p>",
  "receivedAt": "2026-05-01T10:00:00Z",
  "difficultyLevel": "BEGINNER",
  "hasAttachment": false,
  "simulatedLinkTarget": "/simulations/credential-warning"
}
```

Trainee-facing responses must not reveal `expectedClassification` or correct red flags before classification feedback is intentionally shown.

### `POST /trainee/simulated-emails/:emailId/opened`

- **Purpose**: Records a `SIMULATED_EMAIL_OPENED` interaction event.
- **Expected Request Data**:
  - `campaignAssignmentId` (string, optional)
  - `campaignItemId` (string, optional)
- **Expected Response Data**:
  - `201 Created`: `{ "success": true, "eventType": "SIMULATED_EMAIL_OPENED" }`

### `POST /trainee/simulated-emails/:emailId/link-clicked`

- **Purpose**: Records a `SIMULATED_EMAIL_LINK_CLICKED` interaction event.
- **Expected Request Data**:
  - `campaignAssignmentId` (string, optional)
  - `campaignItemId` (string, optional)
- **Expected Response Data**:
  - `201 Created`: `{ "success": true, "eventType": "SIMULATED_EMAIL_LINK_CLICKED" }`

### `POST /trainee/simulated-emails/:emailId/credential-submission-attempted`

- **Purpose**: Records that a trainee attempted credential submission inside a simulation.
- **Expected Request Data**:
  - `campaignAssignmentId` (string, optional)
  - `campaignItemId` (string, optional)
- **Expected Response Data**:
  - `201 Created`: `{ "success": true, "eventType": "CREDENTIAL_SUBMISSION_ATTEMPTED" }`

This endpoint must never store or return submitted credential values.

### `POST /trainee/simulated-emails/:emailId/classification`

- **Purpose**: Records a trainee's classification judgement for a simulated email.
- **Expected Request Data**:
  - `selectedClassification` (enum: `SAFE`, `SUSPICIOUS`, `PHISHING`, required)
  - `selectedRedFlagIds` (string array, optional)
  - `freeTextReason` (string, optional)
  - `campaignAssignmentId` (string, optional)
  - `campaignItemId` (string, optional)
- **Expected Response Data**:

```json
{
  "success": true,
  "responseId": "classification-001",
  "selectedClassification": "PHISHING",
  "isCorrect": true,
  "feedback": "Correct. The sender domain and urgent request are suspicious.",
  "redFlags": [
    {
      "id": "red-flag-001",
      "redFlagType": "DOMAIN",
      "label": "Suspicious sender domain",
      "severity": "HIGH"
    }
  ]
}
```

Email classification is separate from quiz attempts.

## Cross-Use-Case Tracking and Reporting Support

Interaction events are lightweight tracking records created by trainee actions such as:

- campaign started;
- campaign item started;
- campaign item completed;
- training viewed;
- training completed;
- quiz started;
- quiz answer submitted;
- quiz completed;
- simulated email opened;
- simulated email link clicked;
- simulated email classified;
- credential submission attempted.

Interaction event metadata must not include real credentials or sensitive submitted values. For Demo 1, interaction event creation should normally happen inside the specific action endpoints above instead of exposing a broad arbitrary public event-ingestion endpoint.

### Future Reporting Endpoint Placeholder

> [!NOTE]
> This endpoint is future-facing only. It is not required for the Demo 1 backend implementation and should not be treated as a final route or response schema.

#### `GET /reports/demo1/summary`

- **Purpose**: Future placeholder for a lightweight summary of interaction, quiz result, email classification, and risk-support data.
- **Linked Domain Entities**: `ReportSummary`, `RiskIndicator`, `InteractionEvent`, `EmailClassificationResponse`, `QuizResult`
- **Scope Notes**:
  - This does not define a final analytics dashboard.
  - This does not define a final risk scoring algorithm.
  - This does not define production reporting schemas.
  - This does not require implementation for Demo 1.

## Supporting Admin/Campaign Context

> [!NOTE]
> The following endpoints are preliminary placeholders only. They establish campaign-managed data context and are not required backend endpoints for the Demo 1 implementation.

### `POST /campaigns`

- **Purpose**: Creates a campaign shell with ordered campaign items/components.
- **Expected Request Data**:
  - campaign metadata;
  - optional organisation ownership;
  - ordered top-level campaign items;
  - optional one-level component groups;
  - reusable content references for training documents, quizzes, and simulations.

### `POST /campaigns/:campaignId/assign`

- **Purpose**: Assigns a campaign to one or more trainee profiles.
- **Expected Request Data**:
  - `traineeProfileIds` (string array, required)
  - `dueDate` (string, optional)

## Validation Notes

- Auth services should trim and lowercase emails before insert and lookup because PostgreSQL text uniqueness is case-sensitive.
- Organisation campaigns should require `organisationId`; platform/premade general campaigns should keep `organisationId` null.
- Campaign item ordering should be consistent within each campaign/group scope.
- A component group may contain campaign components for Demo 1. Nested groups are out of scope.
- For `SINGLE_CHOICE`, exactly one answer option should be correct per question.
- Submitted answer option IDs should belong to the submitted question.
- Trainee-facing quiz retrieval must not leak correct answers or feedback before submission.
- Trainee-facing simulated email retrieval must not leak expected classifications or correct red flags before classification feedback.
- Trainee-facing simulated email retrieval must verify that the requested email belongs to a simulated inbox placed in a campaign item available to the authenticated trainee.
- Interaction event metadata must not include real credentials or sensitive submitted values.
