# Demo 1 Preliminary API Contracts

## Purpose

This document defines the preliminary Demo 1 API contracts around the revised modular campaign domain model. The API is intentionally trainee-campaign oriented: campaigns provide access and sequencing, campaign items place reusable content, and trainee-facing endpoints resolve training, quiz, and simulation content through campaign assignments and campaign items.

These contracts support frontend/backend alignment, SRS traceability, and shared DTO planning. They are not final OpenAPI specifications.

## Contract Status Legend

Some API contracts are included to document planned support around the Demo 1 prototype. The detailed Demo 1 APIs are the priority; future/admin/reporting/AI/real-email APIs are placeholders or later-demo direction unless explicitly implemented elsewhere.

| Status                     | Meaning                                                               |
| -------------------------- | --------------------------------------------------------------------- |
| Demo 1 required            | Needed for the three detailed Demo 1 trainee use cases.               |
| Demo 1 optional/supporting | Useful supporting behaviour, but not a counted Demo 1 use case.       |
| Future/later-demo          | Directional placeholder only; not required for Demo 1 implementation. |

## API and Domain Terminology Alignment

| API Route Area                                                        | Aligned Domain Concept                                                              | Related SRS Area                |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------- |
| `/auth/*`                                                             | `User`, trainee/organisation admin profiles, optional `Organisation`                | Base access, Demo 1 supporting  |
| `/trainee/campaigns`                                                  | `Campaign`, `CampaignAssignment`                                                    | Trainee campaign access         |
| `/trainee/campaigns/:campaignId`                                      | `Campaign`, ordered `CampaignItem` records                                          | Trainee campaign detail         |
| `/trainee/campaign-items/:campaignItemId/*`                           | `CampaignItem`, `CampaignComponent`, `CampaignComponentGroup`                       | Campaign item activity          |
| `/trainee/campaign-items/:campaignItemId/training-document`           | `TrainingDocumentComponent`, reusable `TrainingDocument`                            | UC-02 training document viewing |
| `/trainee/campaign-items/:campaignItemId/quiz`                        | `QuizComponent`, reusable `Quiz`, `QuizQuestion`, `AnswerOption`                    | UC-03 quiz content              |
| `/quiz-attempts/:attemptId/*`                                         | `QuizAttempt`, `AttemptAnswer`, `AttemptAnswerOption`, `QuizResult`                 | UC-03 quiz submission/results   |
| `/trainee/campaign-items/:campaignItemId/simulated-inbox`             | `SimulationComponent`, reusable `Simulation`, `SimulatedInbox`                      | UC-01 simulated inbox           |
| `/trainee/campaign-items/:campaignItemId/simulated-emails/:emailId/*` | `SimulatedEmail`, `EmailClassificationResponse`, `EmailRedFlag`, `InteractionEvent` | UC-01 detail/future interaction |
| Supporting admin/campaign placeholders                                | `Campaign`, ordered `CampaignItem`, reusable content references                     | Future admin/campaign context   |
| Future reporting placeholder                                          | `ReportSummary`, `RiskIndicator`                                                    | Future reporting support        |

Training documents, quizzes, and simulations are reusable content records made available to trainees through campaign items.

## Base Feature Contracts

Base feature endpoints support access to the Demo 1 trainee flow. They are not counted as separate Demo 1 use cases.

### `POST /auth/register`

- **Purpose**: Registers a new trainee account in the system.
- **Status**: Demo 1 optional/supporting base feature.
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
- **Status**: Demo 1 optional/supporting base feature.
- **Expected Request Data**:
  - `email` (string, required)
  - `password` (string, required)
- **Expected Response Data**:
  - `200 OK`: `{ "userId": "uuid", "token": "jwt-placeholder" }`
- **Linked Domain Entities**: `User`

### `GET /auth/me`

- **Purpose**: Returns the authenticated user's identity, role, and applicable profile context.
- **Status**: Demo 1 optional/supporting base feature.
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

These endpoints are **discovery endpoints**. Their primary purpose is to allow the frontend trainee dashboard to discover accessible campaigns, campaign metadata, campaign item tree structures, progress, and `campaignItemId` values to build navigation and display. They do not start, run, or complete activities, and they do not replace existing activity endpoints.

All trainee campaign endpoints require authentication.

### Demo 1 Seeded Campaign Notes

After running the Demo 1 seed, the populated trainee has two active assigned campaigns:

- phishing awareness campaign
- password security campaign

The empty-state trainee still has no campaign assignments.

The password security campaign is intentionally simple:

1. password-security training document
2. password-security quiz

The training item is seeded as `AVAILABLE` and should be openable through campaign detail when the backing training document is available. The quiz item is seeded as `LOCKED`, so it should not be openable unless a future dynamic unlock engine is implemented.

Training completion records interaction data, but this issue does not add sequential unlock behavior. The campaign discovery endpoint should show both assigned campaigns for the populated trainee after reseeding, and the campaign detail endpoint should show the password campaign items in training-to-quiz order with their seeded availability and openability.

### `GET /trainee/campaigns`

- **Purpose**: Allows the frontend dashboard to discover active campaigns assigned or available to the authenticated active trainee.
- **Access Control & Filtering**:
  - Requires a valid Bearer JWT token in the `Authorization` header.
  - The trainee profile associated with the user must be `ACTIVE`.
  - The campaign status must be `ACTIVE`.
  - The trainee must have an associated campaign assignment.
  - Allowed assignment statuses are:
    - `AVAILABLE`
    - `ASSIGNED`
    - `IN_PROGRESS`
    - `COMPLETED`
  - Assignments with other statuses (such as cancelled, expired, or archived) are excluded.
- **Security & Scope Guards**:
  - No internal or administrative fields (such as `createdByUserId` or internal database keys) are exposed in the response DTO.
  - No LearningPath, TrainingModule, TrainingProgress, or permanent user-owned inbox assumptions are made.
- **Expected Response Data**:
  - `200 OK`: Returns a list of campaigns with summary info and counts.

```json
{
  "campaigns": [
    {
      "campaignId": "44444444-4444-4444-8444-444444444444",
      "name": "Phishing Fundamentals",
      "description": "Build safe email habits.",
      "campaignType": "PREMADE_GENERAL",
      "difficultyLevel": "BEGINNER",
      "status": "ACTIVE",
      "startDate": "2026-05-16T08:00:00.000Z",
      "endDate": null,
      "assignment": {
        "assignmentId": "55555555-5555-4555-8555-555555555555",
        "assignmentStatus": "IN_PROGRESS",
        "accessType": "ASSIGNED",
        "currentCampaignItemId": "88888888-8888-4888-8888-888888888888",
        "assignedAt": "2026-05-16T08:00:00.000Z",
        "dueDate": "2026-06-16T08:00:00.000Z",
        "startedAt": "2026-05-16T08:30:00.000Z",
        "completedAt": null
      },
      "accessType": "ASSIGNED",
      "itemCount": 4,
      "availableItemCount": 3
    }
  ]
}
```

- **Safe Error Responses**:
  - `401 Unauthorized`: Returned if the request is missing authentication or the credentials are invalid.
  - `429 Too Many Requests`: Returned if the client has exceeded rate limits.
  - `500 Internal Server Error`: Returned for unexpected system errors.

---

### `GET /trainee/campaigns/:campaignId`

- **Purpose**: Retrieves detail for a specific campaign, including its assignment context, item count summaries, and an ordered hierarchy of campaign items (including group and child item structures).
- **Access Control & Filtering**:
  - Requires a valid Bearer JWT token in the `Authorization` header.
  - The trainee profile associated with the user must be `ACTIVE`.
  - The campaign status must be `ACTIVE`.
  - The trainee must have an active campaign assignment for the specified `campaignId` with an allowed status (`AVAILABLE`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`).
- **Security & Scope Guards**:
  - Requesting an invalid or malformed UUID string format returns a `400 Bad Request` validation error.
  - Requesting a missing campaign, or a campaign that is not assigned to the trainee, returns a safe `404 Not Found` response. This prevents leaking the existence of other campaigns in the system.
  - The endpoint does not expose internal administrative fields (such as `createdByUserId` or DB internal primary keys).
  - No sensitive activity content is exposed, such as correct quiz answers, quiz question feedback, simulated email expected classifications, or correct email red flags.
  - No legacy model assumptions (like `LearningPath`, `TrainingModule`, `TrainingProgress`, or permanent user-owned inboxes) are present.
- **Hierarchy & Ordering Rules**:
  - Top-level items (where `parentGroupId` is `null`) are returned first.
  - Group items (`itemType` = `GROUP`) include a nested `children` array containing their immediate child component items.
  - Campaign items are ordered deterministically by `parentGroupId` (ascending) and then by `position` (ascending).
  - Component groups only support one level of grouping (nested groups/groups within groups are not supported).
- **Activity API Path Mapping**:
  - Group items are not openable and have `isOpenable` set to `false` and `activityApiPath` set to `null`.
  - Component items have their `activityApiPath` populated based on their type:
    - `SIMULATED_INBOX` -> `/trainee/campaign-items/:campaignItemId/simulated-inbox`
    - `TRAINING_DOCUMENT` -> `/trainee/campaign-items/:campaignItemId/training-document`
    - `QUIZ` -> `/trainee/campaign-items/:campaignItemId/quiz`
- **Lightweight Progress Status Derivation**:
  - Group items have `progressStatus` set to `null`.
  - Component items resolve a progress status dynamically:
    - **`TRAINING_DOCUMENT`**:
      - `COMPLETED`: If a `TRAINING_COMPLETED` interaction event exists.
      - `VIEWED`: If a `TRAINING_VIEWED` interaction event exists (and not completed).
      - `NOT_STARTED`: Default state if no interaction events exist.
    - **`QUIZ`**:
      - `SUBMITTED`: If a submitted quiz attempt exists.
      - `IN_PROGRESS`: If an in-progress quiz attempt exists.
      - `NOT_STARTED`: Default state if no quiz attempts exist.
    - **`SIMULATED_INBOX`**:
      - `CLASSIFIED`: If a classification response or `SIMULATED_EMAIL_CLASSIFIED` event exists.
      - `INTERACTED`: If a link click (`SIMULATED_EMAIL_LINK_CLICKED`) or credential submission (`CREDENTIAL_SUBMISSION_ATTEMPTED`) event exists.
      - `VIEWED`: If a simulated email opened event exists.
      - `NOT_STARTED`: Default state if no events exist.
- **Expected Response Data**:
  - `200 OK`: Returns the detailed campaign object.

```json
{
  "campaignId": "44444444-4444-4444-8444-444444444444",
  "name": "Phishing Fundamentals",
  "description": "Build safe email habits.",
  "campaignType": "PREMADE_GENERAL",
  "difficultyLevel": "BEGINNER",
  "status": "ACTIVE",
  "startDate": "2026-05-16T08:00:00.000Z",
  "endDate": null,
  "assignment": {
    "assignmentId": "55555555-5555-4555-8555-555555555555",
    "assignmentStatus": "IN_PROGRESS",
    "accessType": "ASSIGNED",
    "currentCampaignItemId": "88888888-8888-4888-8888-888888888888",
    "assignedAt": "2026-05-16T08:00:00.000Z",
    "dueDate": "2026-06-16T08:00:00.000Z",
    "startedAt": "2026-05-16T08:30:00.000Z",
    "completedAt": null
  },
  "accessType": "ASSIGNED",
  "itemCount": 4,
  "availableItemCount": 3,
  "items": [
    {
      "campaignItemId": "66666666-6666-4666-8666-666666666666",
      "campaignId": "44444444-4444-4444-8444-444444444444",
      "parentGroupId": null,
      "itemType": "GROUP",
      "componentType": null,
      "groupType": "MODULE",
      "completionRule": "COMPLETE_REQUIRED_ONLY",
      "title": "Email safety module",
      "description": "Work through the essentials.",
      "position": 2,
      "isRequired": true,
      "availabilityStatus": "AVAILABLE",
      "isOpenable": false,
      "activityApiPath": null,
      "progressStatus": null,
      "children": [
        {
          "campaignItemId": "88888888-8888-4888-8888-888888888888",
          "campaignId": "44444444-4444-4444-8444-444444444444",
          "parentGroupId": "66666666-6666-4666-8666-666666666666",
          "itemType": "COMPONENT",
          "componentType": "TRAINING_DOCUMENT",
          "groupType": null,
          "completionRule": null,
          "title": "Phishing basics",
          "description": "Read this first.",
          "position": 1,
          "isRequired": true,
          "availabilityStatus": "AVAILABLE",
          "isOpenable": true,
          "activityApiPath": "/trainee/campaign-items/88888888-8888-4888-8888-888888888888/training-document",
          "progressStatus": "NOT_STARTED",
          "trainingDocument": {
            "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            "title": "Identifying Phishing Emails",
            "contentSummary": "Common phishing indicators.",
            "estimatedReadTimeMinutes": 8,
            "difficultyLevel": "BEGINNER",
            "status": "AVAILABLE"
          },
          "quiz": null,
          "simulation": null
        },
        {
          "campaignItemId": "77777777-7777-4777-8777-777777777777",
          "campaignId": "44444444-4444-4444-8444-444444444444",
          "parentGroupId": "66666666-6666-4666-8666-666666666666",
          "itemType": "COMPONENT",
          "componentType": "QUIZ",
          "groupType": null,
          "completionRule": null,
          "title": "Phishing quiz",
          "description": "Check your judgement.",
          "position": 2,
          "isRequired": true,
          "availabilityStatus": "AVAILABLE",
          "isOpenable": false,
          "activityApiPath": "/trainee/campaign-items/77777777-7777-4777-8777-777777777777/quiz",
          "progressStatus": "NOT_STARTED",
          "trainingDocument": null,
          "quiz": {
            "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            "title": "Phishing Check",
            "description": "Choose the safest action.",
            "passThresholdPercentage": 70,
            "difficultyLevel": "BEGINNER",
            "status": "PUBLISHED",
            "questionCount": 4
          },
          "simulation": null
        }
      ]
    },
    {
      "campaignItemId": "99999999-9999-4999-8999-999999999999",
      "campaignId": "44444444-4444-4444-8444-444444444444",
      "parentGroupId": null,
      "itemType": "COMPONENT",
      "componentType": "SIMULATED_INBOX",
      "groupType": null,
      "completionRule": null,
      "title": "Inbox drill",
      "description": "Classify the emails.",
      "position": 3,
      "isRequired": true,
      "availabilityStatus": "AVAILABLE",
      "isOpenable": true,
      "activityApiPath": "/trainee/campaign-items/99999999-9999-4999-8999-999999999999/simulated-inbox",
      "progressStatus": "NOT_STARTED",
      "trainingDocument": null,
      "quiz": null,
      "simulation": {
        "id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        "title": "Inbox Simulation",
        "description": "Practice with a realistic inbox.",
        "difficultyLevel": "BEGINNER"
      }
    }
  ]
}
```

- **Safe Error Responses**:
  - `400 Bad Request`: Returned if the URL parameter `campaignId` is malformed (not a valid UUID string).
  - `401 Unauthorized`: Returned if the request is missing authentication or the credentials are invalid.
  - `404 Not Found`: Returned if the campaign does not exist or is not assigned to the authenticated active trainee (or is not in an allowed assignment status).
  - `429 Too Many Requests`: Returned if the client has exceeded rate limits.
  - `500 Internal Server Error`: Returned for unexpected system errors.

---

### Preliminary Activity Placeholders

> [!NOTE]
> The following endpoints are preliminary placeholders. They indicate how status or completion was modeled historically or for future extensions. They are not the primary endpoints for starting and completing activities in Demo 1.

### `POST /trainee/campaigns/:campaignId/start`

- **Purpose**: Marks a trainee's campaign assignment as started.
- **Status**: Demo 1 optional/supporting tracking.
- **Expected Response Data**:
  - `200 OK`: `{ "success": true, "campaignId": "campaign-001" }`

### `POST /trainee/campaign-items/:campaignItemId/start`

- **Purpose**: Records that the trainee started a campaign item.
- **Status**: Demo 1 optional/supporting tracking.
- **Expected Response Data**:
  - `200 OK`: `{ "success": true, "campaignItemId": "item-001" }`

### `POST /trainee/campaign-items/:campaignItemId/complete`

- **Purpose**: Records that the trainee completed a campaign item where completion can be explicitly marked.
- **Status**: Demo 1 optional/supporting tracking.
- **Expected Response Data**:
  - `200 OK`: `{ "success": true, "campaignItemId": "item-001" }`

## UC-02: View Training Document Contracts

### `GET /trainee/campaign-items/:campaignItemId/training-document`

- **Purpose**: Retrieves the training document placed at a specific trainee-accessible campaign item.
- **Status**: Demo 1 required for UC-02.
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
    "contentRef": "demo://training/phishing-warning-signs",
    "content": "# Phishing Warning Signs\n\nPhishing emails try to create urgency. Watch for mismatched domains and unexpected attachments.",
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

When the training document reference is not supported by the backend allowlist, the response still succeeds and returns `content: null`:

```json
{
  "campaignItemId": "item-002",
  "campaignAssignmentId": "assignment-001",
  "trainingDocument": {
    "id": "train-002",
    "title": "External Training Resource",
    "contentType": "URL",
    "contentRef": "https://training.example.com/phishing",
    "content": null,
    "contentSummary": "External phishing training resource.",
    "estimatedReadTimeMinutes": 5,
    "difficultyLevel": "BEGINNER",
    "status": "AVAILABLE"
  },
  "campaignItem": {
    "title": "External Training Resource",
    "description": "Open the external guide.",
    "position": 2,
    "isRequired": false,
    "availabilityStatus": "AVAILABLE"
  }
}
```

Content field behavior:

- When the `contentRef` matches an allowlisted Demo 1 ref, the backend returns the resolved markdown string.
- When the `contentRef` is not allowlisted, `content` is `null` to indicate there is no backend-readable content.

The backend resolves access through the campaign item placement:

`Trainee -> CampaignAssignment -> Campaign -> CampaignItem -> TrainingDocumentComponent -> TrainingDocument`

In the current Prisma implementation, the conceptual `TrainingDocumentComponent` is represented by a `CampaignItem` with `itemType = COMPONENT`, `componentType = TRAINING_DOCUMENT`, and `trainingDocumentId`.

Training documents are reusable content records. They are not owned by learning paths or training modules, and this endpoint does not require a linked quiz. Missing, unavailable, non-training, or unauthorised campaign items should return a safe `404` so the API does not leak content existence. The endpoint may return `429` if the trainee training route rate limit is exceeded.

Expected status codes and error responses:

- `200 OK`: Training document response with `content` resolved or `null`.
- `400 Bad Request`: Invalid campaign item UUID format.
- `401 Unauthorized`: Missing or invalid authentication.
- `404 Not Found`: The training document is missing, unavailable, or not accessible for the trainee.
- `429 Too Many Requests`: Training route rate limit exceeded.
- `500 Internal Server Error`: `TRAINING_CONTENT_UNAVAILABLE` when demo content fails to resolve, or an unexpected error.

### `POST /trainee/campaign-items/:campaignItemId/training-document/viewed`

- **Purpose**: Records a `TRAINING_VIEWED` interaction event for the campaign item.
- **Status**: Demo 1 optional/supporting tracking.
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
- **Status**: Demo 1 optional/supporting tracking if completion marking is included.
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
- **Status**: Demo 1 required for UC-03.
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
- **Status**: Demo 1 required for UC-03.
- **Expected Request Data**: None. The backend resolves trainee, campaign assignment, campaign item, and quiz context from authenticated server-side state and the URL parameter.
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
- **Status**: Demo 1 required for UC-03.
- **Expected Request Data**:
  - `answers` (array of objects containing `questionId` and `selectedOptionIds`)
- **Expected Response Data**:
  - `200 OK`: `{ "success": true, "attemptId": "attempt-123", "status": "SUBMITTED" }`

### `GET /quiz-attempts/:attemptId/results`

- **Purpose**: Retrieves the result summary and answer-level educational feedback for a submitted attempt.
- **Status**: Demo 1 required for UC-03. Results are available only after submission.
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
- **Status**: Demo 1 required for UC-01.
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
      "difficultyLevel": "BEGINNER",
      "isOpened": false
    }
  ]
}
```

This endpoint returns campaign-provided simulation content. It does not expose a permanent user-owned inbox.

`isOpened` is derived from `SIMULATED_EMAIL_OPENED` interaction events for the current trainee, campaign assignment, campaign item, and simulated email. The frontend can use this field for read/unread styling.

### `GET /trainee/campaign-items/:campaignItemId/simulated-emails/:emailId`

- **Purpose**: Retrieves a simulated email that the trainee can access through an assigned or available campaign simulation item.
- **Status**: Demo 1 required for UC-01.
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

Trainee-facing responses must not reveal `expectedClassification` or correct red flags before any future/optional classification feedback is intentionally shown.

### `POST /trainee/campaign-items/:campaignItemId/simulated-emails/:emailId/interactions`

- **Purpose**: Records a Demo 1 optional/supporting simulated-email interaction event, such as `SIMULATED_EMAIL_OPENED`.
- **Expected Request Data**:
  - `eventType` (string enum, required)
- **Expected Response Data**:
  - `201 Created` or `200 OK`: `{ "success": true, "eventType": "SIMULATED_EMAIL_OPENED" }`
- **Duplicate opened events**: Reposting `SIMULATED_EMAIL_OPENED` for the same trainee, campaign assignment, campaign item, and simulated email is idempotent and must not create another opened event.

### Future/optional simulated-email interactions

Link-clicked, credential-submission-attempted, and classification flows are future/optional unless the team explicitly chooses to demo them. Credential-submission tracking must never store or return submitted credential values.

### `POST /trainee/campaign-items/:campaignItemId/simulated-emails/:emailId/classification`

- **Purpose**: Records a trainee's classification judgement for a simulated email.
- **Status**: Future/later-demo or optional support. Not required for Demo 1's core UC-01 viewing/opening flow.
- **Expected Request Data**:
  - `selectedClassification` (enum: `SAFE`, `SUSPICIOUS`, `PHISHING`, required)
  - `selectedRedFlagIds` (string array, optional)
  - `freeTextReason` (string, optional)
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

Email classification is separate from quiz attempts and is not required for the core Demo 1 viewing/opening flow.

## Cross-Use-Case Tracking and Reporting Support

Interaction events are lightweight tracking records created by trainee actions such as:

- campaign started, campaign item started, or campaign item completed, where supporting tracking is included;
- training viewed or training completed, where supporting tracking is included;
- quiz started, quiz answer submitted, or quiz completed;
- simulated email opened;
- future/optional simulated email link clicked, simulated email classified, or credential submission attempted events.

Interaction event metadata must not include real credentials or sensitive submitted values. For Demo 1, interaction event creation should normally happen inside the specific action endpoints above instead of exposing a broad arbitrary public event-ingestion endpoint.

### Future Reporting Endpoint Placeholder

> [!NOTE]
> This endpoint is future-facing only. It is not required for the Demo 1 backend implementation and should not be treated as a final route or response schema.

#### `GET /reports/demo1/summary`

- **Purpose**: Future placeholder for a lightweight summary of interaction, quiz result, optional email classification, and risk-support data.
- **Linked Domain Entities**: `ReportSummary`, `RiskIndicator`, `InteractionEvent`, `EmailClassificationResponse`, `QuizResult`
- **Scope Notes**:
  - This does not define a final analytics dashboard.
  - This does not define a final risk scoring algorithm.
  - This does not define production reporting schemas.
  - This does not require implementation for Demo 1.

## Supporting Organisation Admin and Campaign Context

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
