# Demo 2 Software Requirements Specification

## 1. Introduction

This document defines the Demo 2 Software Requirements Specification for Insightful Phish, a cybersecurity awareness training platform. Demo 2 builds upon the trainee-facing foundations of Demo 1 and introduces administration capabilities for managing platform onboarding.

Insightful Phish is intended to become a modular training platform for individual trainees, organisation-linked trainees, organisation admins, and Insightful Phish admins. The long-term direction includes campaign-based training, reusable campaign components, simulated inboxes and emails, training documents, quizzes, reports, dashboards, ethically constrained real-email simulations, AI-assisted content generation, and richer simulations. Demo 2 implements both the trainee-facing subset of features and initial platform administrator capabilities for organisation registration review.

Campaigns are the main assignment and ordering container. For Demo 2, campaign content is limited to a simulated inbox, a training document, and a quiz. The conceptual `CampaignComponent` is represented in current implementation and supporting documents as a `CampaignItem` where applicable.

### 1.1 Demo 2 Scope

Demo 2 covers four core use cases:

- UC-01: View emails in simulated inbox (Trainee-facing)
- UC-02: View training document (Trainee-facing)
- UC-03: Complete quiz flow and view results (Trainee-facing)
- UC-05: Review and Manage Organisation Registrations (Admin-facing)

The following base features support access and usability, but are not counted as core Demo 2 use cases:

- Login/register
- Basic themes
- Form validation

### 1.2 Scope Boundaries

| Capability                       | Demo 2 status                                                                         | Later-demo direction                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Authentication / registration    | Base feature only                                                                     | Production account management, password recovery, role administration |
| Basic themes                     | Base feature only                                                                     | Broader design system and theming                                     |
| Form validation                  | Base feature only                                                                     | Shared validation patterns across workflows                           |
| Simulated inbox                  | View/open seeded simulated emails                                                     | Classification, richer interactions, safe links, attachments          |
| Training documents               | View seeded markdown/content and mark completion where implemented                    | Authoring, uploading, richer content formats                          |
| Quiz flow                        | Single-choice quiz and result display                                                 | Advanced question types, richer scoring, quiz authoring               |
| Admin campaign management        | Supporting/future context                                                             | Campaign CRUD, assignment, scheduling, reporting                      |
| Reporting/risk dashboard         | Future-facing only                                                                    | Progress, completion, risk and organisation-level dashboards          |
| Real email delivery              | Out of scope                                                                          | Opt-in and ethically constrained delivery model                       |
| AI generation                    | Future-facing only                                                                    | Schema-controlled, reviewed content generation                        |
| Organisation registration review | Review contacted, approve, or reject requests; create organisations and admin invites | Automatic onboarding, domain verification, integration                |

Real email delivery, credential capture, punitive monitoring, adaptive learning, full reporting dashboards, final risk scoring formulas, and AI-generated simulations are not Demo 2 implementation requirements.

### 1.3 Assumptions

- Demo 2 uses seeded content for trainee campaigns, simulated emails, training documents, and quizzes.
- The trainee is authenticated before accessing UC-01, UC-02, or UC-03.
- The platform admin is authenticated and authorised as `IP_ADMIN` before performing UC-05 actions.
- Admin workflows for campaign management are supporting/future context, but organisation registration review is a core Demo 2 flow.
- Domain model references are conceptual and should not be treated as final Prisma models, database tables, or migrations.
- API route details are maintained in [API.md](./API.md), not duplicated in this SRS.

## 2. User Stories and User Characteristics

### 2.1 Trainee-Facing User Stories

- As a trainee, I want to view assigned simulated emails in a controlled inbox so that I can practise recognising suspicious messages safely.
- As a trainee, I want to view assigned training content so that I can learn how to recognise and respond to cyber threats.
- As a trainee, I want to complete an assigned quiz and view results so that I can check my understanding of the training material.

### 2.2 Admin-Facing User Stories

- As a platform admin, I want to review pending organisation registration requests so that I can verify and onboard organisations onto the platform.
- As a platform admin, I want to mark registration requests as contacted, approved, or rejected so that I can manage the communication flow and creation process.

### 2.3 Supporting and Future User Stories

The following stories provide future platform context only:

- As an organisation admin, I want to add trainees to my organisation so that organisation employees can be onboarded into cybersecurity awareness training.
- Organisation admins may eventually add trainees manually, send onboarding emails, or configure an approved email domain so that sign-ups from that domain can be linked to the organisation.
- As an organisation admin, I want to create, edit, and delete campaigns for my organisation.
- As an organisation admin, I want to build campaigns from reusable components such as training documents, quizzes, and simulated inboxes.
- As an organisation admin, I want to drag and drop campaign components into an ordered campaign flow.
- As an organisation admin, I want to create and edit quizzes, including future support for multiple question types.
- As an organisation admin, I want to upload, create, edit, and organise training documents.
- As an organisation admin, I want to review trainee progress, campaign completion, quiz results, risky behaviour, and organisation-level risk on dashboards.
- As a trainee, I want to participate in assigned campaigns containing training documents, quizzes, and simulated inboxes.
- As a trainee not linked to an organisation, I want to access default Insightful Phish campaigns and optionally opt into extra features later.
- As the platform, I may eventually send opt-in real simulated emails to real inboxes, using safe and ethical constraints and organisation context where appropriate.
- As the platform, I may eventually use AI-assisted generation for quizzes, emails, training transformations, and company-context-aware content.

### 2.4 User Characteristics and Actors

- **Trainee:** The primary trainee-facing actor. A trainee accesses assigned campaigns which contain simulated inbox(es) with simulated emails, training content, and quizzes.
- **Insightful Phish Platform Admin (IPAdmin):** The primary administrator actor. An admin accesses the platform management page to review organisation registration requests, mark them contacted, approve them (which creates the organisation and sends setup invites), or reject them.
- **Email Service:** Supporting actor that handles queuing and sending invitation and notification emails.
- **Audit Log:** System actor that automatically records administrative actions and state changes for security and traceability.
- **System:** Supports authentication, content retrieval, validation, interaction tracking, quiz submission, organisation registration management, and audit logging.
- **Organisation admin:** A supporting/future actor who can configure and assign campaigns and content in later demos.

## 3. Use Cases

A core overview of the Demo 1 use cases can be seen in this diagram:

[UC-Overview Diagram](./diagrams/demo1-use-cases-overview.svg)

### 3.1 UC-01: View Emails in Simulated Inbox

[UC-01 use case diagram](./diagrams/demo1-use-cases-uc01-simulated-inbox.svg)

#### User Story

As a trainee, I want to view my simulated emails in a controlled inbox rather than my own mailbox so that I can recognise potentially suspicious messages in a safe training environment.

#### Purpose

UC-01 allows a trainee to view a list of assigned simulated emails, open an email detail view, and review the content in the email. It does not access a real mailbox, send real email, capture credentials, or require email classification in Demo 1.

#### Actors

- Primary actor: Trainee
- Supporting actor: System

#### Preconditions

- The trainee is authenticated.
- The trainee has access to a campaign item containing a simulated inbox.
- Simulated emails exist as controlled platform content.

#### Postconditions

- The trainee can view assigned simulated email summaries.
- The trainee can open a selected simulated email and view its details.
- The system may record that the simulated email was opened.
- If no email is assigned or the email cannot be loaded, the trainee receives a safe empty or error state.

#### Main Flow

1. The trainee navigates to the simulated inbox.
2. The system displays simulated email summaries assigned through the campaign item.
3. The trainee selects an email.
4. The system displays sender information, subject, received date, and body content.
5. The system records a lightweight open email interaction.
6. The trainee reads the email and may return to the inbox.

#### Exceptions

- No simulated emails are assigned: Show an empty state.
- Simulated email not found or not assigned: Show a safe error state and return path.
- Inbox or email loading fails: Show a retry or navigation option.
- Interaction tracking fails: Do not block email reading where the content loaded successfully.
- Any attempted real external email access: Exclude or block the behaviour for Demo 1.

### 3.2 UC-02: View Training Document

[UC-02 use case diagram](./diagrams/demo1-use-cases-uc02-training-document.svg)

#### User Story

As a trainee, I want to view training documents assigned to me so that I can learn how to recognise and respond to cyber threats in a controlled educational environment.

#### Purpose

UC-02 allows a trainee to open and read assigned training content. It does not include training content authoring, uploading, campaign management, or quiz completion.

#### Actors

- Primary actor: Trainee
- Supporting actor: System

#### Preconditions

- The trainee is authenticated.
- The trainee has access to a campaign item containing a training document.
- Training content exists as controlled educational content.

#### Postconditions

- The trainee can open and read the assigned training document.
- The system may record that the training document was viewed or completed.
- If content is missing or unavailable, the trainee receives a safe empty or error state.

#### Main Flow

1. The trainee navigates to an assigned training item.
2. The system retrieves the training document for the campaign item.
3. The system displays the training content in a readable format.
4. The system records basic progress where available.
5. The trainee reads the content.
6. The trainee may return to the campaign view or proceed to a related quiz.

#### Exceptions

- No training document is assigned: Show an empty or unavailable state.
- Training document not found or no longer assigned: Show a safe error state.
- Training content loading fails: Show a retry or navigation option.
- Progress tracking fails: Do not block reading where content loaded successfully.

### 3.3 UC-03: Complete Quiz Flow and View Results

[UC-03 use case diagram](./diagrams/demo1-use-cases-uc03-quiz-flow.svg)

#### User Story

As a trainee, I want to complete a quiz after my training session so that I can verify my understanding of the material and receive feedback on my security knowledge.

#### Purpose

UC-03 allows a trainee to open assigned quiz content, answer supported questions, submit a quiz attempt, and view results or feedback. Demo 1 supports simple single-choice quiz questions. Quiz authoring, adaptive learning, AI-assisted generation, and full reporting dashboards are outside Demo 1 scope.

#### Actors

- Primary actor: Trainee
- Supporting actor: System

#### Preconditions

- The trainee is authenticated.
- The trainee has access to a campaign item containing a quiz.
- Quiz questions and answer options exist as controlled content.

#### Postconditions

- The system creates or uses a quiz attempt for the trainee.
- The trainee can answer and submit the quiz.
- Submitted answers are recorded against the attempt.
- The submitted attempt becomes read-only.
- The trainee can view a result summary and educational feedback where available.

#### Main Flow

1. The trainee navigates to an assigned quiz.
2. The system loads the quiz content.
3. The trainee starts or opens the quiz attempt.
4. The system displays questions and answer controls.
5. The trainee answers required questions and submits the attempt.
6. The system validates and records the submission.
7. The system calculates or retrieves the result.
8. The system displays results and educational feedback.

#### Exceptions

- Quiz not available or not assigned: Show a safe error state and return path.
- Quiz start fails: Show a retry or return option.
- Submission is incomplete or invalid: Prevent final submission and identify what must be corrected.
- Submission fails: Preserve answers where possible and allow retry.
- Results fail to load: Keep the attempt submitted and provide a retry or navigation option.

### 3.4 UC-05: Review and Manage Organisation Registrations

[UC-05 use case diagram](./diagrams/demo2-use-cases-uc05-organisation-registrations.png)

#### User Story

As a platform admin, I want to review and manage pending organisation registration requests so that I can safely onboard new organisations and initial organisation administrators onto the platform.

#### Purpose

UC-05 allows an Insightful Phish platform admin to inspect the list of organisation registration requests, view details for a specific request, mark a request as contacted (indicating manual verification is underway), approve a request (which automatically creates the Organisation record, creates an invitation for the initial organisation admin, and queues a setup invite email), or reject a request (recording a rejection reason and queueing a rejection email).

#### Scope

- **TUCBW**: An Insightful Phish platform admin reviews organisation registration requests on the platform organisation management page.
- **TUCEW**: The platform admin acknowledges that the selected organisation registration request has been contacted, approved, rejected, or reviewed successfully.

#### Actors

- Primary actor: Insightful Phish platform admin
- Supporting actor: Email service
- System actor: Audit log

#### Preconditions

- The platform admin is authenticated with `IP_ADMIN` role and has an active profile.
- Organisation registration requests exist in the system (submitted by organisation representatives via public sign-up).

#### Postconditions

- The registration request's status is updated to `CONTACTED`, `APPROVED`, or `REJECTED` in the database.
- If approved, a new `Organisation` record is created, and an `Invitation` for the initial organisation admin role is created with a setup action token.
- A corresponding email (setup invitation or rejection notice) is queued/sent via the Email service.
- An entry in the `AuditLogEntry` table is created to log the action details (actor, target request, action type, outcome, and changed state).

#### Main Flow

1. The platform admin navigates to the organisation management registration review interface.
2. The system retrieves and displays all organisation registration requests, showing their submitted details and current status.
3. The platform admin selects a specific registration request.
4. The system retrieves and displays the request's details: organisation name, description, size, website URL, representative first and last name, representative email, phone number, current status, and timestamps.
5. The platform admin reviews the details and performs one of the following management actions:
   - **Option A: Mark Contacted**
     a. The platform admin selects "Mark Contacted".
     b. The system updates the request's status to `CONTACTED` and records the timestamp and admin's ID.
     c. The system creates an `AuditLogEntry` record (`actionType: CONTACTED`, `outcome: SUCCESS`).
     d. The system updates the display to reflect the status change.
   - **Option B: Approve Request**
     a. The platform admin selects "Approve".
     b. The system creates a new `Organisation` record using the submitted organisation name.
     c. The system creates an `Invitation` record associated with the new organisation for the representative's email, assigned the organisation admin role.
     d. The system updates the request's status to `APPROVED`, associates it with the created organisation, and records the timestamp and admin's ID.
     e. The system creates an `AuditLogEntry` record (`actionType: APPROVED`, `outcome: SUCCESS`).
     f. The system queues an initial organisation admin setup email containing a link with the invitation's setup action token.
     g. The system displays a success confirmation.
   - **Option C: Reject Request**
     a. The platform admin selects "Reject" and provides a rejection reason.
     b. The system validates that the rejection reason is present and fits required limits.
     c. The system updates the request's status to `REJECTED` and records the timestamp, admin's ID, and rejection reason.
     d. The system creates an `AuditLogEntry` record (`actionType: REJECTED`, `outcome: SUCCESS`).
     e. The system queues a rejection email to the representative including the rejection reason.
     f. The system displays a success confirmation.
6. The platform admin acknowledges the outcome of the action and returns to the organisation requests list.

#### Exceptions

- **Request Already Reviewed**: The request has already been approved, rejected, or cancelled. The system disables the review actions in the UI. If a direct API request is made, the system returns a `409 Conflict` error and leaves the database state unchanged.
- **Rejection Reason Missing**: The platform admin attempts to reject a request without providing a rejection reason. The system blocks the action, displays a field validation error near the input, and prompts the admin to supply the reason.
- **Invalid ID / Request Not Found**: The requested registration request does not exist. The system displays a safe error message and returns the admin to the list view.
- **Email Dispatch Failure**: The system fails to queue or send the notification/setup email. The system logs the failure in `EmailDeliveryLog` (`outcome: FAILURE`) and creates an `AuditLogEntry` with outcome `FAILURE`. The system alerts the admin in the UI but does not rollback the database state update so that the approval/rejection itself is preserved.
- **RBAC Violation**: The user is authenticated but does not have the `IP_ADMIN` role. The system denies access, returns a `403 Forbidden` error, and logs an audit log entry for the unauthorized attempt.

## 4. Functional Requirements

### 4.1 Base Features

| ID         | Requirement                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-BASE-01 | The system shall support rudimentary login and registration sufficient for accessing Demo 1 trainee flows.                                                    |
| FR-BASE-02 | Required login/register fields shall be visibly identified and validated before submission.                                                                   |
| FR-BASE-03 | Authentication errors shall be trainee-friendly and shall not expose technical implementation details.                                                        |
| FR-BASE-04 | The system shall apply a consistent Demo 1 visual theme across trainee-facing screens.                                                                        |
| FR-BASE-05 | The system shall provide reusable form validation and feedback behaviour for required fields, quiz answers, loading states, success states, and error states. |

### 4.2 UC-01 Functional Requirements

#### View Emails in Simulated Inbox

| ID         | Requirement                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| FR-UC01-01 | The system shall allow a trainee to view assigned simulated email summaries.                            |
| FR-UC01-02 | The system shall allow a trainee to open a selected simulated email from the inbox list.                |
| FR-UC01-03 | The system shall display simulated email details in a readable format.                                  |
| FR-UC01-04 | The system shall clearly treat inbox content as simulated, controlled training content.                 |
| FR-UC01-05 | The system shall record a lightweight interaction event when a trainee opens a simulated email.         |
| FR-UC01-06 | The system shall display empty and error states for unavailable inboxes or emails.                      |
| FR-UC01-07 | The system shall not connect to or send messages through real external email infrastructure for Demo 1. |
| FR-UC01-08 | The system shall not collect or store sensitive credential input through the simulated inbox view.      |

### 4.3 UC-02 Functional Requirements

#### View Training Document

| ID         | Requirement                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| FR-UC02-01 | The system shall allow a trainee to open an assigned training document.                                          |
| FR-UC02-02 | The system shall present training content in a structured, readable format.                                      |
| FR-UC02-03 | The system shall record a basic viewed or completed interaction where tracking is available.                     |
| FR-UC02-04 | The system shall display empty and error states for unavailable training content.                                |
| FR-UC02-05 | The system shall allow navigation to a linked quiz where available without making quiz completion part of UC-02. |
| FR-UC02-06 | The system shall not allow trainees to modify training content.                                                  |

### 4.4 UC-03 Functional Requirements

#### Complete Quiz Flow and View Results

| ID         | Requirement                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| FR-UC03-01 | The system shall allow a trainee to open an assigned quiz.                                                                            |
| FR-UC03-02 | The system shall retrieve and display quiz questions and answer options.                                                              |
| FR-UC03-03 | The system shall create or use a quiz attempt when the trainee starts the quiz flow.                                                  |
| FR-UC03-04 | The system shall allow the trainee to answer supported quiz questions and review answers before submission.                           |
| FR-UC03-05 | The system shall validate required quiz answers before accepting final submission.                                                    |
| FR-UC03-06 | The system shall submit the trainee's quiz attempt and record final answers.                                                          |
| FR-UC03-07 | The system shall display submitted quiz results and educational feedback where available.                                             |
| FR-UC03-08 | The system shall prevent duplicate final submission or further editing of a completed quiz attempt.                                   |
| FR-UC03-09 | The system shall display safe validation and error states when quiz loading, attempt creation, submission, or result retrieval fails. |

### 4.5 Tracking, Progress, and Reporting Support

| ID        | Requirement                                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-TRK-01 | The system shall support lightweight interaction events for Demo 1 trainee actions.                                                          |
| FR-TRK-02 | Tracked events should reference the trainee, target type, target record, campaign context, and timestamp (where available).                  |
| FR-TRK-03 | Tracking failures should not block content viewing where the requested content loaded successfully.                                          |
| FR-TRK-04 | Tracking shall avoid storing real credentials, passwords, or unnecessary sensitive personal data.                                            |
| FR-TRK-05 | Quiz attempts, answers, and results shall support the UC-03 submission and result flow.                                                      |
| FR-TRK-06 | Reporting and risk concepts are future-facing placeholders only and shall not expand Demo 1 into a dashboard or risk-scoring implementation. |

### 4.6 Future/Admin Supporting Context

Future organisation admin capabilities may include campaign CRUD, campaign assignment, content authoring, reusable simulation templates, quiz authoring, reporting dashboards, and organisation/user management. These concepts provide context for the campaign-based domain model but are not Demo 2 acceptance criteria.

### 4.7 UC-05 Functional Requirements

#### Review and Manage Organisation Registrations

| ID         | Requirement                                                                                                                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-UC05-01 | The system shall restrict all organisation registration review features, screens, and endpoints to authenticated users with the `IP_ADMIN` role.                                                                 |
| FR-UC05-02 | The system shall display a list of all organisation registration requests to the platform admin, showing name, status, representative details, and submission date.                                              |
| FR-UC05-03 | The system shall allow the platform admin to view the complete details of any organisation registration request.                                                                                                 |
| FR-UC05-04 | The system shall allow the platform admin to transition a pending request's status to `CONTACTED` when manual contact has been initiated.                                                                        |
| FR-UC05-05 | The system shall allow the platform admin to approve a request, which must transactionally create the `Organisation` record and a pending admin `Invitation` record.                                             |
| FR-UC05-06 | Upon request approval, the system shall queue/send an initial admin setup email to the representative's email address with a secure signup link using an `ActionToken`.                                          |
| FR-UC05-07 | The system shall allow the platform admin to reject a request, requiring a rejection reason, and transition its status to `REJECTED`.                                                                            |
| FR-UC05-08 | Upon request rejection, the system shall queue/send a rejection email containing the specified rejection reason.                                                                                                 |
| FR-UC05-09 | The system shall write an entry to the `AuditLogEntry` table for every review decision, recording the admin ID, request ID, action type (contacted/approved/rejected), outcome (success/failure), and timestamp. |
| FR-UC05-10 | The system shall prevent modification or transition of registration requests that are already in a final state (`APPROVED`, `REJECTED`, or `CANCELLED`).                                                         |

## 5. API Contracts

Detailed Demo 1 route paths, request/response DTOs, validation notes, and endpoint behaviour are maintained in [API.md](./API.md). This SRS intentionally does not duplicate full payload details.

The backend API is also documented through Swagger/OpenAPI for interactive inspection during development. When the backend is running locally, the Swagger documentation can be accessed from the backend Swagger UI route, typically at:

`http://localhost:4000/api-docs`

This allows developers and reviewers to inspect available endpoints, request/response schemas, validation expectations, and example responses directly from the running backend.

At a high level:

- UC-01 uses campaign-item scoped simulated inbox, simulated email detail, and simulated email interaction endpoints.
- UC-02 uses campaign-item scoped training document and training progress endpoints.
- UC-03 uses campaign-item scoped quiz retrieval, quiz attempt creation, attempt submission, and result retrieval endpoints.
- Campaign discovery and assignment endpoints support access to trainee campaign items.

API routes and payloads remain implementation contracts documented in `API.md` and the backend Swagger/OpenAPI documentation; this SRS keeps only the requirement-level mapping.

## 6. Domain Model Description

The Demo 1 domain model provides a conceptual view of the entities required to support the trainee-facing use cases, API planning, traceability, and future database planning. It is not a final database schema and should not be treated as a direct Prisma model or migration design. Diagram sources and exports are maintained under [diagrams/](./diagrams/).

The domain model diagram can be found here: [Demo 1 domain model](./diagrams/demo1-domain-model-final.svg).

### 6.1 Core Domain Concepts

- `Healthcheck` represents a simple system health response. This is not in the Domain model diagram as it serves no business purpose.
- `User` represents the platform account and carries identity, authentication status, and user type information.
- `Trainee` is the conceptual trainee role. A trainee may be a `GeneralTrainee` with no organisation or an `OrganisationTrainee` linked to exactly one organisation.
- `OrganisationAdmin` is an organisation-linked administrator for future campaign/content setup.
- `IPAdmin` is a platform-level administrator for future platform oversight.
- `Organisation` represents an organisation using the platform. `OrganisationContext` stores future organisation-specific context such as logos, brand guidelines, security policies, approved domains, terminology, and related metadata.
- `Campaign` is the main assignment and ordering container. A campaign may belong to an organisation or may represent default Insightful Phish campaigns.
- `CampaignAssignment` links a `Campaign` to a `Trainee` and tracks assignment-level availability, progress, due dates, and completion.
- `CampaignItem` is the ordered campaign structure used to make content available. `CampaignComponent` and `CampaignComponentGroup` specialise campaign items; groups support one grouping level only.
- `TrainingDocumentComponent`, `QuizComponent`, and `SimulationComponent` are campaign component specialisations that link campaign placement to a `TrainingDocument`, `Quiz`, or `Simulation`.
- `TrainingDocument` is reusable readable content for UC-02.
- `Quiz`, `QuizQuestion`, `ChoiceQuestion`, `SingleChoiceQuestion`, `MultiChoiceQuestion`, `AnswerOption`, `QuizAttempt`, `AttemptAnswer`, and `QuizResult` support UC-03. Demo 1 uses simple single-choice quiz behaviour, while richer question and marking behaviour remains future-facing.
- `Simulation`, `SimulatedInbox`, and `SimulatedEmail` support UC-01. Demo 1 simulation scope is limited to viewing and opening controlled simulated emails.
- `EmailRedFlag` describes potential red flags associated with a simulated email. `EmailClassificationResponse` is future trainee judgement on a simulated email, separate from quiz attempts.
- `InteractionEvent` records lightweight trainee actions such as campaign progress, training viewed/completed, quiz activity, simulated email opened, and future simulation interactions.

### 6.2 Domain Relationships and Limits

A trainee sees Demo 1 content through campaign assignment and campaign item placement. A campaign contains ordered campaign items. A campaign component may expose a simulated inbox, training document, or quiz through its component subtype. In the current implementation, the conceptual component placement may be represented by `CampaignItem` records with component fields. Demo 1 uses seeded content and does not have admin authoring flows.

For Demo 1 simplicity, component groups support one grouping level only. A `CampaignComponentGroup` can contain `CampaignComponent` records, but not other component groups. This can be changed easily in the future if needed.

Simulated emails belong to a simulated inbox campaign component. Demo 1 requires only safe viewing/opening of these emails. Email classification, simulated links, attachments, fake login pages, richer interaction tracking, real email delivery, and AI-assisted generation will be implemented in the future.

Interaction tracking must remain safe and must not store real credentials or sensitive submitted values. Quiz answers are stored as attempt answers and may reference selected answer options; quiz results summarise submitted attempts.

## 7. Architectural Requirements

Architecture, quality drivers, deployment assumptions, layering, persistence boundaries, API standards, and technical constraints are documented in [architecture.md](./architecture.md).

At requirement level, Demo 1 should:

- Separate frontend, backend, shared DTO/validation, and persistence responsibilities;
- Use campaign-item access control consistently for trainee content;
- Keep simulation interactions inside the controlled platform boundary;
- Preserve clear contracts between frontend, backend, shared types, and database access;
- Support local development and CI validation for Demo 1 functionality.

## 8. Technology Requirements

Demo 1 uses the following technology stack:

- React, Vite, and TypeScript for the frontend
- Express and TypeScript for the backend API
- Prisma ORM for database access
- PostgreSQL for relational persistence
- a shared package for DTOs, shared types, and validation contracts
- Zod for request/DTO validation where applicable
- Vitest, Supertest, and relevant frontend testing tools for automated checks
- Docker Compose for local database support
- GitHub Actions for CI

## 9. Quality Requirements

### 9.1 Usability

- Trainee-facing flows shall use clear, non-technical wording.
- The system shall provide understandable loading, empty, unavailable, success, and error states.
- The trainee shall have a safe way to retry, go back, or continue when content cannot be loaded.

### 9.2 Accessibility

- Feedback and validation messages shall not rely only on colour.
- Primary recovery actions shall be keyboard-accessible.
- Important messages should be placed near the relevant content, field, question, or action where possible.

### 9.3 Security, Privacy, and Safety

- Demo 1 simulated inbox content shall remain controlled platform content.
- The system shall not access real trainee mailboxes for UC-01.
- Simulated interactions shall not collect or store real credentials.
- Tracking shall follow data minimisation and avoid unnecessary personal or sensitive data.
- Technical error details, stack traces, and internal exception names shall not be shown to trainees.

### 9.4 Error Handling and Resilience

- Content loading failures shall produce safe messages and recovery options.
- Interaction tracking failures should not block reading simulated emails or training documents when the content itself loaded successfully.
- Quiz submission failures should preserve answers where possible and allow retry.

### 9.5 Maintainability

- Requirements, API contracts, domain terminology, and traceability should remain aligned across this SRS, [API.md](./API.md), [architecture.md](./architecture.md), and [traceability.md](./traceability.md).
- Domain names in this SRS are conceptual unless the implementation documents define them otherwise.
- Future-facing concepts shall be marked clearly so Demo 1 scope does not expand accidentally.

### 9.6 Testability and Traceability

- Core use cases and base features should be testable through frontend, backend, integration, or manual Demo 1 verification as appropriate.
- QA planning is maintained in [testing.md](./testing.md).
- Traceability references are maintained in [traceability.md](./traceability.md).

---

## Appendix A: Document Change History

| Version | Date       | Author(s)                | Sections / Area Updated                            | Summary of Change                                                                                    |
| ------- | ---------- | ------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 0.1.0   | 2026-04-27 | Johan Nel                | Initial document                                   | Created the initial Demo 1 SRS structure.                                                            |
| 0.1.1   | 2026-04-28 | Adriano Jorge            | UC-01 simulated inbox; traceability references     | Added simulated inbox requirements and related SRS refinements.                                      |
| 0.1.2   | 2026-04-30 | Rudolph Lamprecht        | Admin/campaign context; architecture/API alignment | Added campaign/admin-related SRS content and aligned with early API/architecture thinking.           |
| 0.1.3   | 2026-04-30 | Zoë Joubert; Connor Bell | UC-03 quiz flow; traceability                      | Added quiz-flow requirements and corrected related traceability.                                     |
| 0.1.4   | 2026-04-30 | Connor Bell              | UC-02 training document                            | Added final Demo 1 training-view SRS requirements.                                                   |
| 0.1.5   | 2026-05-01 | Adriano Jorge            | Domain model alignment                             | Added SRS alignment for the initial domain model.                                                    |
| 0.1.6   | 2026-05-03 | Zoë Joubert              | Validation; feedback; phishing feedback scope      | Added validation and UI feedback requirements for Demo 1.                                            |
| 0.1.7   | 2026-05-07 | Johan Nel                | Document structure; cross-references; use cases    | Reworked SRS structure and aligned it with related Demo 1 documents.                                 |
| 0.1.8   | 2026-05-07 | Johan Nel                | Use-case diagrams                                  | Linked or referenced Demo 1 use-case diagrams from the SRS.                                          |
| 0.1.9   | 2026-05-08 | Rudolph Lamprecht        | API/architecture cross-reference                   | Added API-contract linkage and architecture-related SRS references.                                  |
| 0.1.10  | 2026-05-09 | Connor Bell              | Minor SRS amendments                               | Applied minor SRS wording/consistency updates alongside design navigation documentation.             |
| 0.1.11  | 2026-05-09 | Adriano Jorge            | Tracking; progress requirements                    | Added tracking and progress-related SRS requirements.                                                |
| 0.1.12  | 2026-05-09 | Adriano Jorge            | Domain/API terminology                             | Aligned SRS terminology with domain and API language.                                                |
| 0.1.13  | 2026-05-10 | Johan Nel                | Terminology; integration; traceability             | Performed a broad SRS integration pass, including learner/employee to trainee terminology alignment. |
| 0.1.14  | 2026-05-16 | Johan Nel                | Domain model; campaign-item model; terminology     | Updated SRS to match the revised modular campaign/domain model and trainee terminology.              |
| 0.1.15  | 2026-05-19 | Johan Nel                | Demo 1 scope; future scope                         | Clarified Demo 1 scope and later-demo planned features.                                              |
| 0.1.16  | 2026-05-21 | Johan Nel                | Headings; links; formatting                        | Cleaned headings/file links and formatted SRS as part of final domain-model documentation updates.   |
| 0.2.0   | 2026-07-01 | Rudolph Lamprecht        | Title, Intro, Actors, UC-05, Requirements, History | Updated for Demo 2; defined UC-05, admin actors, workflows, functional requirements.                 |
