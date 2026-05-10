# Demo 1 Traceability Table

## Purpose

This document links Demo 1 user stories, use cases, functional requirements, API contracts, domain entities, design artefacts, and QA/test planning.

## Traceability Scope (Johan)

### UC-01: View Emails in Simulated Inbox

Core Demo 1 trainee flow for viewing simulated inbox content determined by campaign assignment context.

### UC-02: View Training Document

Core Demo 1 trainee flow for opening and reading assigned training material.

### UC-03: Complete Quiz Flow

Core Demo 1 trainee flow for completing an assigned quiz and viewing results or feedback.

### Base Feature: Login/Register

Supporting access feature for the trainee flows.

### Base Feature: Basic Themes

Supporting visual consistency feature for the Demo 1 screens. This is not a core use case.

### Base Feature: General Form Validation

Supporting validation and feedback behaviour for forms and quiz submission.

## Traceability Table

| Area                                  | User Story / Source              | Use Case / Boundary         | Functional Requirements                                                      | API Contracts                                        | Domain Entities                                                                                       | Design/Wireframes                                                      | QA/Test References                    | Implementation Planning Reference                                           | Owner   | Status             |
| ------------------------------------- | -------------------------------- | --------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------- | ------- | ------------------ |
| UC-01: View Emails in Simulated Inbox | UC-01 user story in `SRS.md`     | UC-01 core use case         | FR-UC01-01 to FR-UC01-10; TRK-UC01-01 to TRK-UC01-05                         | API-UC01-01 to API-UC01-03; API-TRK-01               | `User`, `SimulatedInbox`, `SimulatedEmail`, `InteractionEvent`, `CampaignAssignment`                  | `DESIGN.md` Simulated Inbox and Email Detail sections                  | QA-UC01-01 to QA-UC01-05              | Frontend inbox/detail screens; backend simulated inbox/detail/tracking APIs | Adriano | Integrated draft   |
| UC-02: View Training Document         | UC-02 user story in `SRS.md`     | UC-02 core use case         | FR-UC02-01 to FR-UC02-10; TRK-UC02-01 to TRK-UC02-04                         | API-UC02-01 to API-UC02-03; API-TRK-02               | `User`, `LearningPath`, `TrainingModule`, `TrainingDocument`, `TrainingProgress`                      | `DESIGN.md` Training Module List and Training Material Page            | QA-UC02-01 to QA-UC02-05              | Frontend training list/document screens; backend training/progress APIs     | Connor  | Integrated draft   |
| UC-03: Complete Quiz Flow             | UC-03 user story in `SRS.md`     | UC-03 core use case         | FR-UC03-01 to FR-UC03-10; TRK-UC03-01 to TRK-UC03-06                         | API-UC03-01 to API-UC03-04; API-TRK-03 to API-TRK-05 | `User`, `Quiz`, `QuizQuestion`, `QuizAttempt`, `AttemptAnswer`, `QuizResult`, `FeedbackItem`          | `DESIGN.md` Quiz Page, Submission State, and Results Page              | QA-UC03-01 to QA-UC03-05              | Frontend quiz/results screens; backend quiz attempt/submission/result APIs  | Zoë     | Integrated draft   |
| Tracking/Progress/Reporting Support   | Supporting tracking requirements | UC-01, UC-02, UC-03 support | TRK-DEMO1-01 to TRK-DEMO1-08; RPT-DEMO1-01 to RPT-DEMO1-06                   | API-TRK-01 to API-TRK-06                             | `InteractionEvent`, `TrainingProgress`, `QuizAttempt`, `QuizResult`, `ReportSummary`, `RiskIndicator` | Domain model tracking/reporting support; no new design screen required | QA tracking/progress placeholders     | Future reporting/risk placeholders only; no dashboard implementation        | Adriano | Integrated draft   |
| Admin Context                         | US-ADM-01 to US-ADM-05           | Supporting context only     | FR-ADM-01 to FR-ADM-10                                                       | API-ADM-01 to API-ADM-05                             | `Administrator`, `Campaign`, `CampaignAssignment`                                                     | Supporting admin context only; no stable design ID                     | Supporting/future QA placeholder only | Future admin/campaign setup only; not a Demo 1 core flow                    | Rudolph | Supporting context |
| Base: Login/Register                  | Base feature section in `SRS.md` | Base feature                | SRS Base Features: Login/Register                                            | `POST /auth/register`, `POST /auth/login`            | `User`                                                                                                | `DESIGN.md` Register and Login sections                                | QA-AUTH-01 to QA-AUTH-05              | Frontend auth forms; backend auth endpoints needed to enter Demo 1 flows    | Shared  | Supporting context |
| Base: Basic Themes                    | Base feature section in `SRS.md` | Base feature                | SRS Base Features: Basic Themes                                              | No direct API contract                               | Not domain-specific                                                                                   | `DESIGN.md` Brand Style Guide and Component Styling Principles         | QA-THEME-01 to QA-THEME-03            | Shared UI styling/components for Demo 1 screens only                        | Connor  | Supporting context |
| Base: General Form Validation         | Base feature section in `SRS.md` | Base feature                | SRS Base Features: General Form Validation; validation/feedback requirements | General validation/error-response notes              | Not domain-specific                                                                                   | `DESIGN.md` Feedback, Validation, and Accessibility UI Rules           | QA-VALIDATION-01 to QA-VALIDATION-05  | Shared frontend validation and backend error-response handling              | Zoë     | Supporting context |

## Tracking, Progress, Quiz Attempt, and Reporting Traceability

This section links lightweight Demo 1 tracking and progress requirements to the three core use cases. These references support future implementation planning and reporting alignment without defining final analytics dashboards or final risk scoring.

| Traceability ID | Area                                | Use Case            | Requirement IDs                                   | API Reference                                                 | Domain Entities                                                       | Notes                                                                                  | Status |
| --------------- | ----------------------------------- | ------------------- | ------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------ |
| TRACE-TRK-01    | Simulated email opened/viewed       | UC-01               | TRK-UC01-01, TRK-UC01-02, TRK-UC01-03, FR-UC01-04 | API-TRK-01 / `POST /simulations/emails/:emailId/interactions` | `InteractionEvent`, `SimulatedEmail`, `User`                          | Records lightweight simulated inbox interaction events.                                | Draft  |
| TRACE-TRK-02    | Simulated inbox safety boundary     | UC-01               | TRK-UC01-04, TRK-DEMO1-06, FR-UC01-09             | API-TRK-01                                                    | `InteractionEvent`                                                    | Ensures simulated inbox tracking does not store credentials or sensitive input.        | Draft  |
| TRACE-TRK-03    | Training document viewed/progressed | UC-02               | TRK-UC02-01, TRK-UC02-02, TRK-UC02-03, FR-UC02-04 | API-TRK-02 / `POST /training/:trainingId/progress`            | `TrainingProgress`, `TrainingDocument`, `InteractionEvent`, `User`    | Tracks high-level training engagement and progress state.                              | Draft  |
| TRACE-TRK-04    | Training tracking failure boundary  | UC-02               | TRK-UC02-04                                       | API-TRK-02                                                    | `TrainingProgress`, `InteractionEvent`                                | Tracking failure should not prevent safe training document viewing.                    | Draft  |
| TRACE-TRK-05    | Quiz attempt creation               | UC-03               | TRK-UC03-01, FR-UC03-03                           | API-TRK-03 / `POST /quizzes/:quizId/attempts`                 | `QuizAttempt`, `Quiz`, `User`                                         | Starting a quiz creates an attempt.                                                    | Draft  |
| TRACE-TRK-06    | Quiz answer submission              | UC-03               | TRK-UC03-02, TRK-UC03-03, FR-UC03-06, FR-UC03-09  | API-TRK-04 / `POST /quiz-attempts/:attemptId/submit`          | `QuizAttempt`, `AttemptAnswer`, `QuizQuestion`                        | Submitted attempts should record final answers and prevent duplicate final submission. | Draft  |
| TRACE-TRK-07    | Quiz result and feedback            | UC-03               | TRK-UC03-04, TRK-UC03-05, FR-UC03-07, FR-UC03-08  | API-TRK-05 / `GET /quiz-attempts/:attemptId/results`          | `QuizResult`, `FeedbackItem`                                          | Submitted attempts can produce result summaries and educational feedback.              | Draft  |
| TRACE-TRK-08    | Future report summary aggregation   | UC-01, UC-02, UC-03 | RPT-DEMO1-01, RPT-DEMO1-03, RPT-DEMO1-06          | API-TRK-06 future placeholder                                 | `ReportSummary`, `InteractionEvent`, `TrainingProgress`, `QuizResult` | Future-facing reporting support only. No dashboard implementation required for Demo 1. | Future |
| TRACE-TRK-09    | Future risk indicators              | UC-01, UC-02, UC-03 | RPT-DEMO1-02, RPT-DEMO1-04, RPT-DEMO1-05          | API-TRK-06 future placeholder                                 | `RiskIndicator`, `ReportSummary`                                      | Future-facing risk support only. No final risk formula is defined.                     | Future |

### Tracking Traceability Scope Notes

- Tracking and progress references are preliminary and exist to align SRS, API, domain, and testing terminology.
- `InteractionEvent`, `TrainingProgress`, `QuizAttempt`, `QuizResult`, `ReportSummary`, and `RiskIndicator` are conceptual domain references and should not be treated as final database schema names.
- Reporting and risk references are future-facing placeholders only.
- This traceability section does not add a new Demo 1 use case.
- No new UI screen is required for this tracking/progress issue.
- No change is required to the current domain model diagram for this issue.

## Domain, SRS, and API Alignment Review

This section records the Demo 1 alignment pass between the SRS feature slices, preliminary API contracts, traceability references, and domain model terminology.

| Alignment Area           | SRS Term                            | API Reference                                         | Domain Model Term                                    | Status  | Notes                                                                                                   |
| ------------------------ | ----------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------- |
| Trainee-facing account   | trainee                             | Auth context / `userId`                               | `User`                                               | Aligned | `trainee` is the SRS actor label; `User` is the conceptual domain entity.                               |
| User types               | Admin, Trainee                      | Auth/user context                                     | `User.userType`                                      | Aligned | `Trainee` covers company-linked and general learning-flow accounts; actor wording remains `trainee`.    |
| Campaign wrapper         | Campaign                            | `POST /campaigns`                                     | `Campaign`                                           | Aligned | Supporting context only for Demo 1.                                                                     |
| Campaign assignment      | Campaign assignment context         | `POST /campaigns/:campaignId/assign`                  | `CampaignAssignment`                                 | Aligned | Assignment links a `Campaign` to a `User` record; organisation membership is optional where applicable. |
| Simulated inbox          | Simulated inbox                     | `GET /simulations/inbox`                              | `SimulatedInbox`                                     | Aligned | Represents controlled platform inbox content only.                                                      |
| Simulated email          | Simulated email                     | `GET /simulations/emails/:emailId`                    | `SimulatedEmail`                                     | Aligned | Does not represent real mailbox email delivery.                                                         |
| Simulated email tracking | Email opened/viewed interaction     | `POST /simulations/emails/:emailId/interactions`      | `InteractionEvent`                                   | Aligned | Used for lightweight UC-01 interaction tracking.                                                        |
| Training list/content    | Training document / training module | `GET /training/assigned`, `GET /training/:trainingId` | `LearningPath`, `TrainingModule`, `TrainingDocument` | Aligned | `LearningPath` and `TrainingModule` group content; `TrainingDocument` is the readable item.             |
| Training progress        | Training progress                   | `POST /training/:trainingId/progress`                 | `TrainingProgress`, `InteractionEvent`               | Aligned | Records high-level progress only.                                                                       |
| Quiz content             | Quiz                                | `GET /quizzes/:quizId`                                | `Quiz`, `QuizQuestion`                               | Aligned | Supports UC-03 quiz display.                                                                            |
| Quiz attempt             | Quiz attempt                        | `POST /quizzes/:quizId/attempts`                      | `QuizAttempt`                                        | Aligned | Created when quiz starts.                                                                               |
| Quiz submission          | Submitted quiz attempt              | `POST /quiz-attempts/:attemptId/submit`               | `QuizAttempt`, `AttemptAnswer`                       | Aligned | Records final answers and submitted state.                                                              |
| Quiz results/feedback    | Quiz results and feedback           | `GET /quiz-attempts/:attemptId/results`               | `QuizResult`, `FeedbackItem`                         | Aligned | Supports result summary and educational feedback.                                                       |
| Future reporting         | Reporting support                   | Future reporting placeholder                          | `ReportSummary`                                      | Aligned | Future-facing only; no dashboard implementation.                                                        |
| Future risk              | Risk support                        | Future reporting placeholder                          | `RiskIndicator`                                      | Aligned | Future-facing only; no final risk scoring formula.                                                      |

### Alignment Scope Notes

- This alignment pass does not introduce new Demo 1 use cases.
- API contracts remain preliminary placeholders and should not be treated as final backend implementation details.
- Domain model entities remain conceptual and should not be treated as final database tables or Prisma models.
- Reporting and risk terminology remains future-facing and should not expand the Demo 1 scope.
- The current domain model diagram already contains the main entities needed for UC-01, UC-02, UC-03, tracking/progress, and future reporting support.

## Integration Notes (Johan)

### SRS References

- `docs/demo1/SRS.md` is the primary integrated requirements source for UC-01, UC-02, UC-03, base features, and supporting admin/campaign context.
- SRS traceability rows should not reference design IDs unless those IDs are explicitly defined in the design document.

### API References

- `docs/demo1/API.md` contains preliminary API contracts only.
- API references should be treated as planning placeholders, not final route or schema commitments.

### Domain References

- `docs/demo1/diagrams/demo1-domain-model-(initial).drawio` is the current domain model source file.
- Domain references are conceptual and should not be treated as final database schema or Prisma model names.

### Design and Wireframe References

- `docs/demo1/DESIGN.md` contains the current design and wireframe notes.
- `docs/demo1/wireframes/` indexes first-pass wireframe coverage.
- Use section references where stable design IDs do not exist.

### Testing References

- `docs/demo1/testing.md` contains QA planning and future test placeholders for UC-01, UC-02, UC-03, and base features.
