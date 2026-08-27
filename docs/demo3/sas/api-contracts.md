# API Contracts

This section provides a brief overview of the Insightful Phish API boundary.

## SAS Content

- [0. Home](README.md)
- [1. Introduction](introduction.md)
- [2. Architectural Requirements](architectural-requirements.md)
- [3. Architecture Overview](architecture-overview.md)
- [4. Architectural Patterns](architectural-patterns.md)
- [5. Design Patterns](design-patterns.md)
- [6. Quality to Architecture Mapping](quality-architecture-mapping.md)
- [7. Technology Requirements](technology-requirements.md)
- **[8. API Contracts](#8-api-contracts)** &larr; _You are here_
  - [8.1 Purpose](#81-purpose)
  - [8.2 Swagger Documentation](#82-swagger-documentation)
  - [8.3 Service Contracts](#83-service-contracts)
- [9. Deployment and Operations](deployment.md)
- [10. Changelog](changelog.md)

---

## 8. API Contracts

### 8.1 Purpose

The API provides the boundary between the Presentation layer and the server application. API contracts descrive the available endpoints, request parameters and bodies, response structures, authentication requirements and possible status codes.

### 8.2 Swagger Documentation

The current interactive API documentation is available at: **[swagger.insightfulphish.co.za](https://swagger.insightfulphish.co.za)**

Please use this interactive documentation for more details on the API contracts.

### 8.3 Service Contracts

Key service contracts and shared schemas are maintained in `@insightful-phish/shared` and documented in OpenAPI:

| Operation                        | Method | Route                                                               | Shared Schemas                                                                                                  | Permissions                                                                    |
| :------------------------------- | :----- | :------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| Organisation Campaign Statistics | `GET`  | `/organisations/{organisationId}/campaigns/{campaignId}/statistics` | `packages/shared/src/campaign-statistics.ts`<br>`packages/shared/src/validation/campaign-statistics.schemas.ts` | `VIEW_CAMPAIGNS` (read statistics)<br>`ASSIGN_CAMPAIGNS` (Unassign capability) |

#### Organisation Campaign Statistics Contract Semantics

- **Trainee Started Definition**: A trainee is considered _started_ if they have at least one persisted interaction event with any consumable campaign item (e.g. viewing a Training Document, beginning a Quiz attempt, opening at least one Simulated Inbox email). The legacy `CampaignAssignment.startedAt` timestamp is not used as the authoritative source.
- **Countable Campaign Items**: Only actual consumable component items (Training Documents, Quizzes, Simulated Inboxes) contribute to total `itemCount` and completion denominators. Structural or grouping records are excluded. All consumable items count toward progress, including items whose `isRequired` flag is `false`.
- **Item-Specific Completion Rules**:
  - _Training Documents_: Require an authoritative completed progress event (`TRAINING_DOCUMENT_COMPLETED`).
  - _Quizzes_: Require an authoritative submitted/completed attempt result.
  - _Simulated Inboxes_: Require every individual email within the inbox to have an authoritative read/open progress event.
  - _Partial Progress_: Partial quiz attempts or partial inbox reads mark the trainee as started but do not grant partial item completion.
- **Disabled Trainees**: Trainees whose organisation profile is disabled (`traineeStatus: 'INACTIVE'`) remain active cohort members and are fully included in all campaign summary and trainee metrics until explicitly unassigned.
- **Action Capabilities (`canUnassign`)**: Explicit boolean capability indicating whether the requesting admin may unassign the trainee. Set to `true` only when the admin possesses the `ASSIGN_CAMPAIGNS` permission and the assignment `accessType` is `ASSIGNED`. For `accessType: 'SELF_SELECTED'`, organisation admins cannot unassign the trainee, and `canUnassign` is always `false`.
- **Rounding Order & Aggregation Rules**:
  - _Per-Trainee Progress Percentage_: Integer 0..100 calculated as `Math.round((completedItemCount / totalItemCount) * 100)`. If `totalItemCount` is 0, returns 0.
  - _Per-Trainee Average Quiz Score_: Integer 0..100 calculated as `Math.round(sum(submittedScores) / scores.length)`, or `null` if no quizzes have been submitted.
  - _Campaign Overall Progress Percentage_: Arithmetic mean of each assigned trainee's already-rounded integer progress percentage across the complete cohort (`Math.round(sum(traineeProgress) / traineeCount)`), or `null` if no trainees are assigned (`assignedTraineeCount === 0`).
  - _Campaign Average Quiz Score Percentage_: Arithmetic mean of contributing trainees' already-averaged quiz scores (`Math.round(sum(traineeAverages) / contributingTrainees)`), or `null` if no quizzes have been submitted across the cohort. Raw quiz attempts are not averaged directly.
- **Status Codes**: `200` (success), `401` (unauthenticated), `403` (lacking `VIEW_CAMPAIGNS`), `404` (missing/cross-org campaign safe isolation), `422` (malformed path UUIDs or bounded query parameters), `429` (`CAMPAIGN_MANAGEMENT_RATE_LIMITED`), and `500` (safe central error handling).

---

Previous section: [Technology Requirements](technology-requirements.md)

Next section: [Deployment and Operations](deployment.md)
