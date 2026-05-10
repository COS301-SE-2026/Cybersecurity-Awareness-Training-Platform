# Demo 1 Software Requirements Specification

## Purpose

This document contains Demo 1 requirements for the Cybersecurity Awareness Training Platform.

## Demo 1 Scope

Demo 1 focuses on a controlled trainee-facing cybersecurity awareness journey supported by basic access features and preliminary administrative setup context.

The core Demo 1 use cases are:

### UC-01: View Emails in Simulated Inbox

The trainee views assigned simulated emails in a safe platform inbox. This use case covers listing simulated email summaries, opening a simulated email detail view, and preserving the boundary that no real mailbox is accessed.

### UC-02: View Training Document

The trainee views assigned training material. This use case covers finding available training material, opening a selected training document, reading the content, and optionally navigating toward a related quiz without making quiz completion part of `UC-02`.

### UC-03: Complete Quiz Flow

The trainee completes an assigned quiz. This use case covers opening quiz content, answering questions, submitting an attempt, and viewing result or feedback states.

## Base Features

### Login/Register

Login and registration are rudimentary base features that support access to the Demo 1 trainee flows. They exist to showcase the design and implementation of UC-01, UC-02, and UC-03, rather than to demonstrate a complete authentication feature set.

For Demo 1, login/register behaviour should remain minimal and sufficient for navigating into the core use cases. The screens may show the intended visual direction and basic validation behaviour, but full authentication workflows, production account management, password recovery, role administration, and security hardening are outside our Demo 1 scope.

Rudimentary login/register support should include:

- Required input fields must be visibly identified before submission.
- If a trainee submits an incomplete form, the system must show which required fields need attention.
- Error messages must be trainee-friendly and should not expose technical implementation details.
- If authentication succeeds, the trainee should receive appropriate navigation feedback and continue to the relevant trainee area.
- These behaviours are supporting form requirements only and must not be treated as additional Demo 1 use cases.

### Basic Themes

Basic themes are a supporting design feature for Demo 1. They cover the shared visual direction needed for the core trainee-facing screens, including colours, typography, spacing, component styling, and readable feedback states.

For Demo 1, basic theme work should:

- support visual consistency across Login/Register, the trainee dashboard, simulated inbox, training document, quiz, and feedback screens;
- follow the brand and style guidance in `docs/demo1/DESIGN.md`;
- remain a base feature, not a separate Demo 1 use case;
- avoid introducing production theming systems, runtime theme switching, or unrelated brand work unless separately scoped.

### General Form Validation

General form validation is a supporting base feature for Demo 1. It exists to keep trainee-facing forms, quiz submissions, and feedback states consistent, but it is not a separate core use case.

Reusable validation rules for Demo 1 should follow these principles:

- Required fields must be validated before submission where possible.
- Validation messages must appear close to the relevant field, question, or action.
- Page-level errors may be used when a problem affects the whole screen or submission.
- Error messages must describe what the trainee can do next, such as completing a missing answer or retrying a failed submission.
- Technical details such as stack traces, raw database errors, or internal exception names must not be shown to trainees.
- Loading and submitting states must clearly indicate that the system is processing an action.
- Buttons that could create duplicate requests should be disabled while the relevant action is being processed.
- Success messages should confirm that the trainee's action was completed.
- Empty and unavailable states should explain the situation and provide a safe next step where possible.
- Feedback messages should be accessible, readable, and understandable without relying only on colour.

These rules apply as supporting guidance for UC-02 and UC-03, and as base-feature support for login/register and other simple Demo 1 forms.

## Document Structure and Integration (Johan)

### Introduction

This SRS integrates the individual Demo 1 feature slices into one consistent requirements document.

### Project Scope

This SRS does not finalise production implementation details, final database schema, final diagrams, full reporting, real email integration, adaptive learning, AI-generated simulations, or an expanded use case list.

### User Characteristics

The primary actor is the **trainee**. This actor represents a person who accesses assigned simulated emails, training content, and quizzes through the platform.

The **Administrator** is documented as supporting context. The Administrator configures or assigns campaigns, simulated emails, training material, and quizzes, but full administrative workflows are not core Demo 1 use cases.

The **System** supports authentication, content retrieval, validation, tracking placeholders, and safe feedback states.

### Assumptions

- Demo 1 uses seeded or preconfigured safe content for simulated emails, training documents, and quizzes: Future use cases will allow adding, modifying and removing this content.
- The trainee is authenticated before accessing UC-01, UC-02, or UC-03.
- Administrative setup exists as preliminary supporting context for assigning content, but full admin workflows are not core Demo 1 flows.
- API contracts are preliminary planning references and may change during implementation.
- Domain model references are conceptual and should not be treated as final Prisma models or database migrations.

### Dependencies

- First drafts of the UC-01, UC-02, and UC-03 SRS feature slices.
- Preliminary API contracts in `docs/demo1/API.md`.
- Domain model references and diagrams in `docs/demo1/diagrams/`.
- Architecture and technical guidance in `docs/demo1/architecture.md`.
- Design and wireframe notes in `docs/demo1/DESIGN.md` and `docs/demo1/wireframes/`.
- QA and traceability planning in `docs/demo1/testing.md` and `docs/demo1/traceability.md`.

### Cross-Reference Structure

Primary supporting documents:

- `docs/demo1/API.md` for preliminary API contracts.
- `docs/demo1/architecture.md` for preliminary architecture and technical requirements.
- `docs/demo1/DESIGN.md` for design scope, wireframe direction, feedback states, and accessibility rules.
- `docs/demo1/testing.md` for QA planning and future test references.
- `docs/demo1/traceability.md` for integration placeholders and review traceability.
- `docs/demo1/diagrams/` for draft diagram sources and exports.

### Terminology Alignment Rules

The SRS, preliminary API contracts, traceability table, and domain model should use consistent terminology for Demo 1 concepts.

For Demo 1 documentation:

- `User` is the domain model entity representing a platform account.
- `trainee` is the SRS actor label used for the trainee-facing Demo 1 flows.
- `Trainee` is the conceptual learning-flow user type. A trainee may be company-linked through `OrganisationMembership` or general without organisation membership.
- `Administrator` or `Admin` is a supporting user type for campaign/content setup context.
- `CampaignAssignment` links a `Campaign` to a `User`; for organisation-based campaigns it may also reference `OrganisationMembership`.
- `SimulatedEmail` is the domain entity used for controlled simulated email content.
- `TrainingDocument` is the readable training content opened in UC-02.
- `TrainingModule` groups related training content.
- `LearningPath` groups training modules and quiz content for either organisation-context or general learning flows.
- `InteractionEvent`, `TrainingProgress`, `QuizAttempt`, `QuizResult`, and `FeedbackItem` are the main tracking/progress entities used across UC-01, UC-02, and UC-03.
- `ReportSummary` and `RiskIndicator` are future-facing reporting support concepts and should not be treated as final analytics or risk-scoring implementation details.

API routes and payloads remain preliminary placeholders. Domain entity names are conceptual and should not be treated as final Prisma model names, database table names, or final backend implementation details.

## UC-01: View Emails in Simulated Inbox

[UC-01 use case diagram](./diagrams/demo1-use-cases-uc01-simulated-inbox.svg)

### User Story

As a trainee, I want to view my simulated emails in a controlled inbox rather than my own mailbox so that I can recognise potentially suspicious messages in a safe training environment before encountering similar threats in real life.

### Purpose

UC-01 defines the Demo 1 simulated inbox feature slice. The simulated inbox allows a trainee to view a list of safe, preconfigured simulated emails, open an email to inspect its details, and receive clear simulated-phishing context where relevant.

This use case is limited to viewing simulated content. It does not include real email delivery, live corporate email integration, advanced campaign scheduling, AI-generated phishing content, or full reporting dashboards and email level difficulty (for gamification).

### Actor

Primary Actor:

- trainee

Supporting Actors:

- System
- Administrator (as future supporting context)

### Preconditions

- The trainee is authenticated and registered.
- The trainee has a simulated inbox, with available simulated emails determined by preliminary administrator-managed campaign assignment context.
- Simulated emails exist as controlled training content inside the platform.
- The simulated inbox is available from the trainee dashboard or equivalent navigation path.

### Postconditions

Successful Post conditions:

- The trainee can view a list of simulated emails in their simulated inbox.
- The trainee can open a selected simulated email and view its details.
- The system may record a lightweight interaction event when the trainee opens or views a simulated email.
- The trainee can identify that the email exists in a controlled training context.
- If the email represents a phishing scenario, the system may show safe contextual information or a placeholder link to training feedback.

Unsuccessful Post conditions:

- If no simulated emails are assigned, the trainee sees an appropriate empty state.
- If a selected simulated email cannot be found, the trainee sees a safe error state.
- If interaction tracking fails, the trainee should still be able to view the email where possible, while the system handles the tracking failure safely.

### Main Flow

1. The trainee navigates to the simulated inbox from the trainee dashboard or navigation menu.
2. The system displays a list of simulated email summaries assigned to the trainee.
3. Each summary shows enough information for safe review, such as sender label, subject, preview text, received date/status, and simulated/safety indicator where applicable.
4. The trainee selects one simulated email from the inbox list.
5. The system opens the simulated email detail view.
6. The system displays the selected email content, including sender information, subject, body text, and any safe simulated-phishing context.
7. The system records a lightweight interaction event that the email was opened or viewed.
8. The trainee reviews the email and may return to the simulated inbox list.
9. If a training follow-up exists, the system may display a placeholder link or prompt to related training feedback without starting the full training or quiz flow inside this use case.

### Exceptions

#### EX-UC01-01: No Simulated Emails Assigned

If the trainee has no simulated emails assigned, the system displays an empty state explaining that no simulated emails are currently available.

#### EX-UC01-02: Simulated Email Not Found

If the trainee tries to open an email that does not exist or is no longer assigned to them, the system displays an error state and allows the trainee to return to the inbox list.

#### EX-UC01-03: Simulated Inbox Loading Failure

If the system cannot load the simulated inbox, it displays a safe error message and allows the trainee to retry or return to the dashboard.

#### EX-UC01-04: Interaction Tracking Failure

If the system cannot record the email-open interaction, the system should not expose technical error details to the trainee. The email may still be displayed if it is otherwise available.

#### EX-UC01-05: Attempted Real Email Access

If any flow attempts to access real external email infrastructure, the system must block or exclude that behaviour for Demo 1.

### Functional Requirements

| ID         | Requirement                                                                                                                            | Notes                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| FR-UC01-01 | The system shall allow a trainee to view a list of assigned simulated email summaries.                                                 | Summary content may include subject, sender label, preview text, received date/status, and simulated content indicator. |
| FR-UC01-02 | The system shall allow a trainee to open a selected simulated email from the inbox list.                                               | The detailed view should show the simulated email content in a readable format.                                         |
| FR-UC01-03 | The system shall clearly treat all inbox content as simulated, controlled training content.                                            | Demo 1 must not imply access to a real mailbox.                                                                         |
| FR-UC01-04 | The system shall record a lightweight interaction event when a trainee opens or views a simulated email.                               | This supports later reporting and traceability without requiring a full reporting dashboard in Demo 1.                  |
| FR-UC01-05 | The system shall provide safe simulated-phishing context where relevant.                                                               | This may include warning context, educational feedback, or a placeholder link to training.                              |
| FR-UC01-06 | The system shall display an empty state when no simulated emails are assigned to the trainee.                                          | The message should be clear and non-technical.                                                                          |
| FR-UC01-07 | The system shall display a safe error state when a selected simulated email cannot be loaded.                                          | The trainee should be able to return to the inbox list or dashboard.                                                    |
| FR-UC01-08 | The system shall not connect to or send messages through real external email infrastructure for Demo 1 UC-01.                          | Real email delivery is out of scope for this feature slice.                                                             |
| FR-UC01-09 | The system shall avoid collecting or storing sensitive credential input through the simulated inbox view.                              | Credential-submission simulations are future scope and must be handled safely if introduced later.                      |
| FR-UC01-10 | The system shall keep UC-01 separate from the full training document and quiz flows except for optional follow-up links or references. | Training and quiz flows remain covered by UC-02 and UC-03.                                                              |

### Non-Functional requirements and Safety Concerns

| ID          | Requirement                                                                                                            | Notes                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| NFR-UC01-01 | The simulated inbox interface should be clear and usable for non-technical trainees.                                   | Supports the platform goal of accessible cybersecurity awareness training. |
| NFR-UC01-02 | Simulated email content should be visually distinct enough to avoid confusion with real mailbox systems during Demo 1. | Helps maintain ethical and safe simulation boundaries.                     |
| NFR-UC01-03 | Interaction tracking should minimise personal data collection.                                                         | Track the action/event, not unnecessary sensitive content.                 |
| NFR-UC01-04 | Error messages should avoid exposing technical implementation details.                                                 | Keeps the trainee experience safe and understandable.                      |

### Interaction Tracking Requirements

| ID          | Tracking Requirement                                                                                     | Event Example                                 | Notes                                   |
| ----------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------- |
| TRK-UC01-01 | The system should record when a trainee opens a simulated email.                                         | `EMAIL_OPENED`                                | Used for later progress/risk reporting. |
| TRK-UC01-02 | The system may record when a trainee views the simulated inbox list.                                     | `INBOX_VIEWED`                                | Optional for Demo 1.                    |
| TRK-UC01-03 | The system should associate interaction events with the simulated email and `User` reference.            | `userId`, `emailId`, `eventType`, `timestamp` | Exact field names are preliminary.      |
| TRK-UC01-04 | The system should not store real credential values or sensitive trainee input as part of UC-01 tracking. | Not applicable                                | Important safety boundary.              |

### Domain References

Preliminary domain entities linked to UC-01:

| ID         | Entity            | Description                                                                                      |
| ---------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| DE-UC01-01 | trainee (`User`)  | The trainee who views assigned simulated emails.                                                 |
| DE-UC01-02 | SimulatedInbox    | The controlled inbox view containing simulated email summaries.                                  |
| DE-UC01-03 | SimulatedEmail    | A safe, preconfigured email used for training or phishing-awareness simulation.                  |
| DE-UC01-04 | InteractionEvent  | A lightweight record of trainee interaction, such as opening a simulated email.                  |
| DE-UC01-05 | SimulationContext | Supporting context explaining why the email is simulated or what learning objective it supports. |
| DE-UC01-06 | TrainingReference | Optional reference to related training feedback or follow-up content.                            |

### API References

Preliminary API placeholders linked to UC-01:

| ID          | Contract                                         | Purpose                                                                                 |
| ----------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| API-UC01-01 | `GET /simulations/inbox`                         | Retrieve assigned simulated email summaries for the trainee.                            |
| API-UC01-02 | `GET /simulations/emails/:emailId`               | Retrieve details for a selected simulated email.                                        |
| API-UC01-03 | `POST /simulations/emails/:emailId/interactions` | Record a lightweight interaction event, such as opening or viewing the simulated email. |

PLEASE NOTE: These contracts are subject to change throughout the course of implementation.

### Traceability References

| Traceability ID | Linked Item                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------- |
| TRACE-UC01-01   | UC-01 to FR-UC01-01, API-UC01-01, DE-UC01-02, `docs/demo1/DESIGN.md` Simulated Inbox section        |
| TRACE-UC01-02   | UC-01 to FR-UC01-02, API-UC01-02, DE-UC01-03, `docs/demo1/DESIGN.md` Simulated Email Detail section |
| TRACE-UC01-03   | UC-01 to FR-UC01-04, API-UC01-03, DE-UC01-04                                                        |
| TRACE-UC01-04   | UC-01 to FR-UC01-05, DE-UC01-05, `docs/demo1/DESIGN.md` Phishing Feedback Page section              |
| TRACE-UC01-05   | UC-01 to FR-UC01-08 and Demo 1 simulation safety boundary                                           |

## UC-02: View Training Document

[UC-02 use case diagram](./diagrams/demo1-use-cases-uc02-training-document.svg)

### User Story

As a trainee, I want to view training documents assigned to me so that I can learn how to recognise and respond to cyber threats in a controlled educational environment.

### Purpose

UC-02 defines the Demo 1 training document viewing feature slice. The feature allows a trainee to access a list of assigned training materials, open a selected training document, and view its contents in a structured and readable format.

This use case is limited to viewing training content and recording basic interaction tracking. It does not include training content creation, editing, campaign management, or full quiz execution.

### Actor

Primary Actor:

- trainee

Supporting Actors:

- System
- Administrator (as a supporting context for assigning training content via campaigns)

### Preconditions

- The trainee is authenticated and registered.
- The trainee has access to at least one assigned training document through preliminary administrator-managed campaign context.
- Training documents exist as controlled educational content within the platform.
- The training module list is accessible from the trainee dashboard or equivalent navigation path.

### Postconditions

Successful Post conditions:

- The trainee can view a list of assigned training documents.
- The trainee can open and read a selected training document.
- The system records a basic interaction event.
- The trainee understands that the content is part of a structured training experience.
- If a quiz is linked, the system may display a link or button to proceed to the associated quiz.

Unsuccessful Post conditions:

- If no training documents are assigned, the trainee sees an appropriate empty state.
- If a selected training document cannot be found, the trainee sees a safe error state.
- If interaction tracking fails, the trainee can still view the training content.

### Main Flow

1. The trainee navigates from the dashboard to a training module ( cybersecurity learning category).
2. The system retrieves and displays the related training-material list for the selected topic.
3. Each training module and training item display summary information such as title, description, and basic interaction status (if available).
4. The trainee selects a training document from the list.
5. The system retrieves the selected training document.
6. The system displays the training content in a structured and readable format (e.g., text, sections, or embedded media).
7. The system records a basic interaction event (e.g., training viewed or started).
8. The trainee reviews the training material.
9. If a related quiz exists, the system may display a link or button to proceed to the quiz (covered in UC-03).
10. The trainee may return to the training module list or dashboard.

### Exceptions

#### EX-UC02-01: No Training Documents Assigned

If the trainee has no training documents assigned, the system displays an empty state indicating that no training content is currently available.

#### EX-UC02-02: Training Document Not Found

If the trainee attempts to open a training document that does not exist or is no longer assigned, the system displays an error state and allows the trainee to return to the training list.

#### EX-UC02-03: Training Content Loading Failure

If the system cannot load the training document, it displays a safe error message and allows the trainee to retry or return to the dashboard.

#### EX-UC02-04: Interaction Tracking Failure

If the system cannot record training interaction, the system should not expose technical details to the trainee. The training content should still be displayed where possible.

### Functional Requirements

| ID         | Requirement                                                                                     | Notes                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| FR-UC02-01 | The system shall allow a trainee to view a list of assigned training documents.                 | Includes summary information such as title, description, and basic interaction status (e.g., not started, started, completed). |
| FR-UC02-02 | The system shall allow a trainee to open a selected training document.                          | Displays full training content.                                                                                                |
| FR-UC02-03 | The system shall present training content in a structured and readable format.                  | Supports accessibility and clarity.                                                                                            |
| FR-UC02-04 | The system shall record a basic interaction event when training is viewed.                      | Supports more detailed future reporting.                                                                                       |
| FR-UC02-05 | The system shall display an empty state when no training documents are assigned.                | Clear, non-technical messaging.                                                                                                |
| FR-UC02-06 | The system shall display a safe error state when a training document cannot be loaded.          | Allow recovery navigation.                                                                                                     |
| FR-UC02-07 | The system shall allow navigation to a linked quiz without executing the quiz flow.             | Quiz handled in `UC-03`.                                                                                                       |
| FR-UC02-08 | The system shall not allow modification of training content by trainees.                        | Maintains scope boundary.                                                                                                      |
| FR-UC02-09 | The system shall treat all training documents as controlled educational content.                | Reinforces training context.                                                                                                   |
| FR-UC02-10 | The system shall allow the trainee to access training content independently of quiz completion. | Maintains separation between `UC-02` and `UC-03`.                                                                              |

### UC-02 Validation, Error-State, and Feedback Support

The training document view should use the shared validation and feedback rules defined for Demo 1. These rules support the trainee experience without expanding UC-02 beyond viewing assigned training content.

For UC-02, the system should provide the following feedback states:

- **Loading state:** When assigned training documents or document details are being loaded, the trainee should see a clear loading indication instead of an empty or broken page.
- **Empty state:** If the trainee has no assigned training documents, the system should show a friendly empty-state message explaining that no training is currently available.
- **Unavailable-content state:** If a selected training document is missing, unavailable, or no longer assigned, the system should explain that the content cannot be opened and provide a safe way to return to the training list or dashboard.
- **Load-failure state:** If the document cannot be loaded because of a system or network problem, the trainee should see a non-technical error message and, where appropriate, a retry or back-navigation option.
- **Progress feedback:** If the system records that the trainee opened or viewed a document, this should happen without interrupting the reading experience. If progress tracking fails, the trainee should still be able to read the content.
- **Quiz-link feedback:** If the document links to a quiz, the interface should make it clear that selecting the quiz link starts or continues the quiz flow under UC-03.
- **Accessible feedback:** Training feedback messages should be readable, keyboard-accessible, and understandable without relying only on colour.

These feedback rules are limited to supporting the training document viewing flow. They do not add content authoring, admin content management, or quiz completion behaviour to UC-02.

### Domain References

Preliminary domain entities linked to UC-02:

| ID         | Entity            | Description                                                            |
| ---------- | ----------------- | ---------------------------------------------------------------------- |
| DE-UC02-01 | trainee (`User`)  | The trainee viewing assigned training documents.                       |
| DE-UC02-02 | TrainingDocument  | A structured educational content item (e.g., PDF, HTML module).        |
| DE-UC02-03 | LearningPath      | Groups training modules and training content available to the trainee. |
| DE-UC02-04 | TrainingProgress  | A basic record of training interaction or status.                      |
| DE-UC02-05 | TrainingReference | Optional link or button to related quiz or follow-up content.          |

### API References

Preliminary API placeholders linked to UC-02:

| ID          | Contract                              | Purpose                                               |
| ----------- | ------------------------------------- | ----------------------------------------------------- |
| API-UC02-01 | `GET /training/assigned`              | Retrieve assigned training documents for the trainee. |
| API-UC02-02 | `GET /training/:trainingId`           | Retrieve full training document content.              |
| API-UC02-03 | `POST /training/:trainingId/progress` | Record a basic training interaction event.            |

PLEASE NOTE: These contracts are subject to change throughout the course of implementation.

### Traceability References

| Traceability ID | Linked Item                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------- |
| TRACE-UC02-01   | UC-02 to FR-UC02-01, API-UC02-01, DE-UC02-02, `docs/demo1/DESIGN.md` Training Module List section   |
| TRACE-UC02-02   | UC-02 to FR-UC02-02, API-UC02-02, DE-UC02-02, `docs/demo1/DESIGN.md` Training Material Page section |
| TRACE-UC02-03   | UC-02 to FR-UC02-04, API-UC02-03, DE-UC02-04                                                        |
| TRACE-UC02-04   | UC-02 to FR-UC02-07, DE-UC02-05, `docs/demo1/DESIGN.md` Training Material to Quiz Flow section      |
| TRACE-UC02-05   | UC-02 to FR-UC02-08                                                                                 |

## UC-03: Complete Quiz Flow

[UC-03 use case diagram](./diagrams/demo1-use-cases-uc03-quiz-flow.svg)

### User Story

As a trainee, I want to complete a quiz after my training session so that I can verify my understanding of the material and receive feedback on my security knowledge.

### Purpose

UC-03 defines the Demo 1 quiz flow feature slice. The quiz flow allows a trainee to open assigned quiz content, answer supported questions, submit a quiz attempt, and view results or feedback where available.

This use case is limited to completing a controlled quiz flow and viewing the submitted result or feedback. It does not include quiz authoring, campaign management, adaptive learning, gamified progression, or full reporting dashboards.

### Actor

Primary Actor:

- trainee

Supporting Actors:

- System

### Preconditions

- The trainee is authenticated and registered.
- The trainee has access to an assigned or available quiz.
- Quiz questions and answer content exist as controlled training content inside the platform.
- The quiz is available from the trainee dashboard, assigned training path, or related training follow-up path.

### Postconditions

Successful Post conditions:

- The system creates a quiz attempt when the trainee starts the quiz.
- The trainee can answer the quiz questions and submit the attempt.
- The submitted answers are recorded against the quiz attempt.
- The system marks the attempt as submitted and makes results available.
- The trainee receives a result summary and educational feedback for the submitted attempt.

Unsuccessful Post conditions:

- If the quiz cannot be loaded or started, no attempt is completed and the trainee sees a safe error state.
- If submission validation fails, the attempt remains unsubmitted and the trainee can correct the highlighted questions.
- If submission succeeds but the results or feedback view cannot be loaded, the attempt remains submitted while the system provides a retry or return path.

### Main Flow

1. The trainee navigates to an assigned quiz from the trainee dashboard, assigned training path, or related follow-up link.
2. The system loads the selected quiz and displays the quiz entry view or quiz page.
3. The trainee selects the option to start the quiz.
4. The system creates a quiz attempt for the trainee and opens the active quiz view.
5. The system displays the quiz questions and the supported answer controls for the selected quiz.
6. The trainee answers the quiz questions and may review or change answers before submission.
7. The trainee submits the quiz attempt.
8. The system validates the submission and, if valid, records the final answers and marks the attempt as submitted.
9. The system calculates or retrieves the result for the submitted attempt.
10. The system displays the quiz results, including the result summary and educational feedback where available.
11. The trainee reviews the results and feedback and may return to the relevant navigation path.

### Exceptions

#### EX-UC03-01: Quiz Not Available

If the selected quiz does not exist, is no longer assigned, or cannot be accessed by the trainee, the system displays a safe error state and allows the trainee to return to the previous path.

#### EX-UC03-02: Quiz Start Failure

If the system cannot create or open a quiz attempt after the trainee starts the quiz, the system displays a safe error message and allows the trainee to retry or return without exposing technical details.

#### EX-UC03-03: Incomplete or Invalid Submission

If the trainee attempts to submit the quiz with missing required answers or invalid answer data, the system prevents submission, highlights the affected questions, and allows the trainee to correct the attempt.

#### EX-UC03-04: Quiz Submission Failure

If the system cannot record the final submission, the system informs the trainee that the submission was not completed and allows a retry without discarding answers where possible.

#### EX-UC03-05: Results or Feedback Loading Failure

If the submitted attempt cannot load its results or feedback, the system displays a safe error state and allows the trainee to retry or return later to the results view.

### Functional Requirements

| ID         | Requirement                                                                                                                 | Notes                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| FR-UC03-01 | The system shall allow a trainee to start an assigned or available quiz.                                                    | Starting the quiz begins the Demo 1 quiz flow for the trainee.                            |
| FR-UC03-02 | The system shall retrieve and display the selected quiz content, including its questions and answer content.                | The quiz content should be presented in a clear and readable format.                      |
| FR-UC03-03 | The system shall create a quiz attempt when the trainee starts the quiz.                                                    | The attempt provides the reference used for submission and results retrieval.             |
| FR-UC03-04 | The system shall allow the trainee to answer supported quiz questions and review or change answers before submission.       | Demo 1 question formats remain implementation-dependent.                                  |
| FR-UC03-05 | The system shall validate required quiz answers before accepting a final submission.                                        | Missing or invalid answers should produce clear correction feedback.                      |
| FR-UC03-06 | The system shall submit the trainee's quiz attempt and record the final answers against that attempt.                       | The attempt should be marked as submitted once accepted.                                  |
| FR-UC03-07 | The system shall display the submitted attempt's results to the trainee.                                                    | Results may include score, status, or summary outcome where defined.                      |
| FR-UC03-08 | The system shall display educational feedback for the submitted attempt.                                                    | Feedback may include correct/incorrect indicators, explanations, or improvement guidance. |
| FR-UC03-09 | The system shall prevent further editing or duplicate final submission of a completed quiz attempt.                         | A completed attempt should remain read-only.                                              |
| FR-UC03-10 | The system shall display safe validation and error states when quiz content, attempt creation, submission, or results fail. | Messages should be clear, non-technical, and safe for the trainee.                        |

### UC-03 Validation, Submission, and Feedback Support

The quiz flow must provide clear validation and feedback so that the trainee understands what is required, what is being processed, and what result or next step is available. These rules support UC-03 and do not create a separate validation use case.

For UC-03, the system should support the following behaviours:

- **Required-answer validation:** The trainee must be informed when one or more required quiz questions have not been answered before submission.
- **Answer-format validation:** If an answer is malformed, unsupported, or cannot be accepted, the system should show a clear message explaining what needs to be corrected.
- **Inline guidance:** Validation messages should appear close to the relevant question where possible, with a page-level summary used only when helpful.
- **Submission state:** When the trainee submits a quiz, the system should show a submitting or processing state.
- **Duplicate-submission prevention:** The submit action should be disabled or guarded while the submission is being processed.
- **Submission success feedback:** After a successful submission, the trainee should receive confirmation that the attempt was submitted and that results or feedback are available.
- **Submission failure feedback:** If submission fails, the trainee should see a safe, non-technical error message and should not lose their current answers where possible.
- **Results-loading feedback:** If quiz results or feedback are still loading, the system should indicate that the result is being prepared.
- **Results failure feedback:** If results cannot be loaded, the trainee should receive a retry or safe navigation option.
- **Educational feedback:** Quiz feedback should explain correct and incorrect answers in a supportive learning tone.
- **Unavailable quiz state:** If a quiz is unavailable, empty, or no longer assigned, the system should explain the situation and provide a safe way back to the training material or trainee dashboard.
- **Accessible feedback:** Quiz validation, submission, and result messages should be perceivable to keyboard and screen-reader users and should not rely only on colour.

The quiz flow should prioritise clear trainee recovery: the trainee should know what happened, what needs attention, and what action they can take next.

### Domain References

Preliminary domain entities linked to UC-03:

| ID         | Entity           | Description                                                                  |
| ---------- | ---------------- | ---------------------------------------------------------------------------- |
| DE-UC03-01 | trainee (`User`) | The trainee who starts, completes, and reviews an assigned quiz.             |
| DE-UC03-02 | Quiz             | The assigned assessment that the trainee can open and complete.              |
| DE-UC03-03 | QuizQuestion     | An individual question presented to the trainee inside the quiz flow.        |
| DE-UC03-04 | QuizAttempt      | The trainee's attempt record for a started or submitted quiz.                |
| DE-UC03-05 | AttemptAnswer    | A recorded answer linked to a question within a specific quiz attempt.       |
| DE-UC03-06 | QuizResult       | The result summary produced after a quiz attempt is submitted and processed. |
| DE-UC03-07 | FeedbackItem     | Educational feedback linked to the submitted attempt or its questions.       |

### API References

Preliminary API placeholders linked to UC-03:

| ID          | Contract                                | Purpose                                                                        |
| ----------- | --------------------------------------- | ------------------------------------------------------------------------------ |
| API-UC03-01 | `GET /quizzes/:quizId`                  | Retrieve the selected quiz content before or when the trainee starts the quiz. |
| API-UC03-02 | `POST /quizzes/:quizId/attempts`        | Create a quiz attempt for the trainee when the quiz is started.                |
| API-UC03-03 | `POST /quiz-attempts/:attemptId/submit` | Submit the completed quiz attempt and record the final answers.                |
| API-UC03-04 | `GET /quiz-attempts/:attemptId/results` | Retrieve the submitted attempt's results and feedback.                         |

PLEASE NOTE: These contracts are subject to change throughout the course of implementation.

### Traceability References

| Traceability ID | Linked Item                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| TRACE-UC03-01   | UC-03 to FR-UC03-01, FR-UC03-02, API-UC03-01, DE-UC03-02, DE-UC03-03, `docs/demo1/DESIGN.md` Quiz Page section                     |
| TRACE-UC03-02   | UC-03 to FR-UC03-03, API-UC03-02, DE-UC03-04, `docs/demo1/DESIGN.md` Quiz Page section                                             |
| TRACE-UC03-03   | UC-03 to FR-UC03-04, FR-UC03-05, DE-UC03-05, `docs/demo1/DESIGN.md` Quiz Page section                                              |
| TRACE-UC03-04   | UC-03 to FR-UC03-06, FR-UC03-09, API-UC03-03, DE-UC03-04, `docs/demo1/DESIGN.md` Quiz Submission State section                     |
| TRACE-UC03-05   | UC-03 to FR-UC03-07, FR-UC03-08, FR-UC03-10, API-UC03-04, DE-UC03-06, DE-UC03-07, `docs/demo1/DESIGN.md` Quiz Results Page section |

## Validation, Error-State, and Feedback Requirements (Zoë)

This section defines supporting validation, error-state, and feedback requirements for Demo 1 trainee-facing flows. These requirements support UC-02, UC-03, and base form behaviour, but they are not a separate Demo 1 core use case.

Demo 1 core use cases remain limited to:

- UC-01: View Emails in Simulated Inbox
- UC-02: View Training Document
- UC-03: Complete Quiz Flow

### Required Field Validation

For Demo 1, required fields and required quiz questions should be validated before final submission is accepted. If required information is missing, the system should identify the affected field or question and allow the trainee to complete it without losing other valid input.

For UC-03, quiz submission should validate that all required questions have an answer before the final submission is accepted.

### Quiz Answer Validation

Quiz answer validation is limited to ensuring that submitted answers match the expected input structure for the question types supported in Demo 1. The system should reject malformed or unsupported answer data safely and display a clear correction message to the trainee.

This requirement does not define final backend validation logic or final quiz schemas.

### Submission Feedback

When the trainee submits a quiz attempt, the system should show clear progress feedback that the attempt is being processed. During this state, duplicate submission actions should be prevented where possible.

If submission fails, the system should explain that the attempt was not completed and allow a safe retry where possible.

### Success Messages

After a successful submission, the trainee should receive confirmation that the quiz was submitted and that results are available. Success messaging should be concise, trainee-facing, and consistent with the controlled training context.

Success messages may also support base features, such as confirming successful login or registration, where relevant.

### Error Messages

Errors should be presented in plain, non-technical language. Messages should distinguish between validation issues, unavailable content, loading failures, submission failures, and results-loading failures without exposing internal system details.

Error messages should explain what happened at a trainee-facing level and what action the trainee can take next.

### Loading States

The system should provide a visible loading state when training content, quiz content, submission, results, or feedback are being retrieved or processed. The trainee should not be left on a blank or broken page while content is loading.

During final quiz submission, duplicate submission actions should be prevented where possible.

### Empty States

If a trainee has no assigned training documents, or if a quiz has no available questions, results, or feedback, the system should present a safe empty or unavailable state with a clear return path.

Empty states should explain the situation in trainee-friendly language and should not make the page appear broken.

### Unavailable-Content States

If assigned content cannot be accessed, such as a missing training document or unavailable quiz, the system should explain that the content is not currently available and provide a safe way to return to the training list, quiz page, or trainee dashboard.

Unavailable-content messages should not blame the trainee or expose internal system details.

### Accessibility Considerations

Validation, feedback, loading, empty, and error messages should be accessible to trainees using keyboard navigation or assistive technologies.

At minimum:

- important messages should appear near the relevant content, field, question, or action;
- feedback should not rely only on colour;
- recovery actions such as retry, return, or continue should be keyboard-accessible;
- screen-reader users should be able to understand important validation, submission, success, and error states.

### Trainee-Friendly Wording Guidelines

Feedback wording should be clear, calm, and supportive. The system should avoid harsh, vague, or technical phrasing.

Preferred examples:

- “Please answer all required questions before submitting.”
- “We could not load this training document. Please try again or return to the training list.”
- “Your quiz was submitted. Your results are ready.”
- “This quiz is not currently available.”

Avoid examples:

- “Validation failed.”
- “Invalid payload.”
- “Unhandled exception.”
- “Backend submission error.”

## Interaction Tracking, Progress, Quiz Attempts, and Reporting Support Requirements

This section defines lightweight Demo 1 requirements for tracking trainee activity across the three core use cases:

- `UC-01: View Emails in Simulated Inbox`
- `UC-02: View Training Document`
- `UC-03: Complete Quiz Flow`

These requirements exist to support traceability, future reporting, and later database/API planning. They do not define final analytics dashboards, final risk scoring formulas, production reporting schemas, or adaptive learning rules.

For Demo 1, tracking should remain lightweight, safe, and trainee-supportive. The system should record only the minimum information needed to show that a trainee interacted with simulated content, training material, or quiz attempts.

### Tracking and Progress Scope

In scope for Demo 1:

- recording when a trainee views or opens a simulated email;
- recording basic simulated inbox interaction events;
- recording when a trainee views or progresses through a training document;
- recording quiz attempts, submitted answers, quiz results, and educational feedback at a high level;
- linking tracking records to relevant `User` records and domain concepts such as simulations, simulated emails, training documents, quiz attempts, and progress records;
- preparing lightweight reporting/risk placeholders for future dashboards.

Out of scope for Demo 1:

- final analytics dashboards;
- final risk scoring formulas;
- production reporting algorithms;
- database migrations or final Prisma models;
- advanced adaptive learning rules;
- real phishing delivery metrics outside the simulated inbox scope;
- storing sensitive credentials, passwords, or unnecessary personal data.

### General Tracking Requirements

| ID           | Requirement                                                                                                                          | Related Domain Entities                                                 | Notes                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| TRK-DEMO1-01 | The system shall support lightweight interaction events for trainee actions across Demo 1 use cases.                                 | `User`, `InteractionEvent`                                              | Events should capture what happened without storing sensitive content.        |
| TRK-DEMO1-02 | Each tracked event should reference the acting `User` record where possible.                                                         | `User`, `InteractionEvent`                                              | Exact field names are implementation details and may change.                  |
| TRK-DEMO1-03 | Each tracked event should identify the target type and target reference where possible.                                              | `InteractionEvent`, `SimulatedEmail`, `TrainingDocument`, `QuizAttempt` | Example target types: `SIMULATED_EMAIL`, `TRAINING_DOCUMENT`, `QUIZ_ATTEMPT`. |
| TRK-DEMO1-04 | Tracked events should include a timestamp or equivalent recorded time.                                                               | `InteractionEvent`                                                      | Supports later progress and reporting views.                                  |
| TRK-DEMO1-05 | Tracking failures should not block trainee access to readable simulated content where the content itself can still be loaded safely. | `InteractionEvent`                                                      | Supports resilience and avoids interrupting learning.                         |
| TRK-DEMO1-06 | Tracking should avoid storing real credentials, passwords, or sensitive trainee input.                                               | `InteractionEvent`                                                      | Important safety and privacy boundary.                                        |
| TRK-DEMO1-07 | Tracking records should support future aggregation without defining final reporting dashboards in Demo 1.                            | `InteractionEvent`, `ReportSummary`, `RiskIndicator`                    | Reporting concepts remain future-facing.                                      |
| TRK-DEMO1-08 | Tracking and progress data should remain aligned with the domain model and preliminary API contracts.                                | `InteractionEvent`, `TrainingProgress`, `QuizAttempt`, `QuizResult`     | Supports SRS, API, domain, and traceability consistency.                      |

### UC-01 Simulated Inbox Tracking Requirements

UC-01 tracking focuses on the trainee viewing simulated inbox content and opening simulated emails.

| ID          | Requirement                                                                                               | Event or State Example                    | Related Requirement/API                  | Notes                                                |
| ----------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| TRK-UC01-01 | The system should record when a trainee opens a simulated email.                                          | `EMAIL_OPENED`                            | `FR-UC01-04`, `API-UC01-03`              | Existing UC-01 tracking requirement.                 |
| TRK-UC01-02 | The system may record when a trainee views the simulated inbox list.                                      | `INBOX_VIEWED`                            | `FR-UC01-04`, `API-UC01-03`              | Optional for Demo 1.                                 |
| TRK-UC01-03 | Simulated email interaction events should reference the `User` record and simulated email where possible. | `userId`, `emailId`                       | `DE-UC01-01`, `DE-UC01-03`, `DE-UC01-04` | Exact field names are preliminary.                   |
| TRK-UC01-04 | UC-01 tracking must not store real credential values or sensitive trainee input.                          | Not applicable                            | `FR-UC01-09`                             | Credential-submission capture is out of scope.       |
| TRK-UC01-05 | UC-01 tracking may support future reporting about simulated email engagement.                             | Email opened count, interaction timestamp | Future `ReportSummary` / `RiskIndicator` | No final reporting dashboard is required for Demo 1. |

### UC-02 Training Progress Requirements

UC-02 progress tracking focuses on whether a trainee opened, viewed, started, or completed assigned training material at a high level.

| ID          | Requirement                                                                                                | Event or State Example                          | Related Requirement/API                  | Notes                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------- | --------------------------------------------------- |
| TRK-UC02-01 | The system should record when a trainee views or opens a training document.                                | `TRAINING_VIEWED`                               | `FR-UC02-04`, `API-UC02-03`              | Supports training engagement tracking.              |
| TRK-UC02-02 | The system may record a high-level progress state for a training document.                                 | `NOT_STARTED`, `STARTED`, `VIEWED`, `COMPLETED` | `API-UC02-03`                            | Exact state names are preliminary.                  |
| TRK-UC02-03 | Training progress should reference the `User` record and training document where possible.                 | `userId`, `trainingId`, `status`                | `TrainingProgress`, `TrainingDocument`   | Supports future reporting and progress views.       |
| TRK-UC02-04 | Training progress tracking failure should not prevent the trainee from reading available training content. | Progress save failure                           | `EX-UC02-04`                             | The learning experience should continue where safe. |
| TRK-UC02-05 | Training progress may support future reporting about training engagement and completion.                   | Completion status, viewed timestamp             | Future `ReportSummary` / `RiskIndicator` | No advanced analytics are required in Demo 1.       |

### UC-03 Quiz Attempt and Result Tracking Requirements

UC-03 tracking focuses on starting a quiz attempt, submitting answers, recording a result, and showing feedback.

| ID          | Requirement                                                                                           | Event or State Example                | Related Requirement/API                  | Notes                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------- | ----------------------------------------------------- |
| TRK-UC03-01 | The system shall create a quiz attempt when a trainee starts a quiz.                                  | `IN_PROGRESS` attempt                 | `FR-UC03-03`, `API-UC03-02`              | Supports submission and result retrieval.             |
| TRK-UC03-02 | The system shall record submitted answers against the quiz attempt.                                   | `AttemptAnswer` records               | `FR-UC03-06`, `API-UC03-03`              | Answer structure remains preliminary.                 |
| TRK-UC03-03 | The system shall mark a completed quiz attempt as submitted.                                          | `SUBMITTED`                           | `FR-UC03-06`, `FR-UC03-09`               | Helps prevent duplicate final submissions.            |
| TRK-UC03-04 | The system shall make a result summary available after a submitted quiz attempt is processed.         | `QuizResult`                          | `FR-UC03-07`, `API-UC03-04`              | Result details remain high level for Demo 1.          |
| TRK-UC03-05 | The system should link educational feedback to the submitted quiz attempt or result.                  | `FeedbackItem`                        | `FR-UC03-08`, `API-UC03-04`              | Supports learning without defining adaptive learning. |
| TRK-UC03-06 | Quiz attempt tracking should reference the `User` record and quiz where possible.                     | `userId`, `quizId`, `attemptId`       | `Quiz`, `QuizAttempt`, `QuizResult`      | Exact implementation fields may change.               |
| TRK-UC03-07 | Quiz attempt and result records may support future reporting about quiz completion and understanding. | Score, pass/fail, submitted timestamp | Future `ReportSummary` / `RiskIndicator` | No final risk scoring formula is defined in Demo 1.   |

### Preliminary Reporting and Risk Support Requirements

Reporting and risk support for Demo 1 is limited to future-facing placeholders. The system should prepare terminology and traceability for later reporting without committing the team to final dashboards or scoring logic.

| ID           | Requirement                                                                                                             | Related Domain Entities                                               | Notes                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| RPT-DEMO1-01 | The system may later aggregate simulated email interactions, training progress, and quiz results into report summaries. | `InteractionEvent`, `TrainingProgress`, `QuizResult`, `ReportSummary` | Future-facing only.                                    |
| RPT-DEMO1-02 | The system may later derive basic risk indicators from aggregated learning and interaction data.                        | `ReportSummary`, `RiskIndicator`                                      | No final risk formula is defined.                      |
| RPT-DEMO1-03 | Demo 1 reporting support should remain limited to traceability and domain alignment.                                    | `ReportSummary`, `RiskIndicator`                                      | No dashboard implementation required.                  |
| RPT-DEMO1-04 | Reporting placeholders should not introduce punitive monitoring language.                                               | `ReportSummary`, `RiskIndicator`                                      | The platform should remain educational and supportive. |
| RPT-DEMO1-05 | Reporting concepts should respect data minimisation and avoid storing sensitive credential content.                     | `InteractionEvent`, `ReportSummary`                                   | Aligns with simulation safety constraints.             |
| RPT-DEMO1-06 | Reporting/risk concepts should be marked as preliminary or future scope wherever they are referenced.                   | `ReportSummary`, `RiskIndicator`                                      | Prevents Demo 1 scope expansion.                       |

### Tracking and Progress Domain References

| ID        | Entity             | Usage in Tracking/Progress                                                                    |
| --------- | ------------------ | --------------------------------------------------------------------------------------------- |
| DE-TRK-01 | `InteractionEvent` | Records lightweight actions such as simulated email opened, inbox viewed, or training viewed. |
| DE-TRK-02 | `TrainingProgress` | Tracks high-level training document status.                                                   |
| DE-TRK-03 | `QuizAttempt`      | Tracks quiz start/submission state.                                                           |
| DE-TRK-04 | `AttemptAnswer`    | Represents submitted answers in a quiz attempt.                                               |
| DE-TRK-05 | `QuizResult`       | Represents the submitted attempt result.                                                      |
| DE-TRK-06 | `FeedbackItem`     | Represents educational feedback linked to quiz results or learning outcomes.                  |
| DE-TRK-07 | `ReportSummary`    | Future-facing aggregation concept.                                                            |
| DE-TRK-08 | `RiskIndicator`    | Future-facing risk/reporting concept.                                                         |

### Tracking and Progress API References

| ID         | Preliminary API Reference                        | Tracking Purpose                                                               |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| API-TRK-01 | `POST /simulations/emails/:emailId/interactions` | Records UC-01 simulated email interaction events.                              |
| API-TRK-02 | `POST /training/:trainingId/progress`            | Records UC-02 training progress or viewed status.                              |
| API-TRK-03 | `POST /quizzes/:quizId/attempts`                 | Creates a UC-03 quiz attempt.                                                  |
| API-TRK-04 | `POST /quiz-attempts/:attemptId/submit`          | Submits a UC-03 quiz attempt and answer set.                                   |
| API-TRK-05 | `GET /quiz-attempts/:attemptId/results`          | Retrieves UC-03 quiz result and feedback.                                      |
| API-TRK-06 | Future reporting endpoint placeholder            | Future reporting/risk summaries only; no final endpoint is defined for Demo 1. |

These API references are preliminary planning references and may change during implementation. They should not be treated as final backend route or payload commitments.

### Tracking and Progress Traceability References

| Traceability ID | Linked Item                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| TRACE-TRK-01    | UC-01 to TRK-UC01-01, TRK-UC01-02, TRK-UC01-03, FR-UC01-04, API-TRK-01, DE-TRK-01                                    |
| TRACE-TRK-02    | UC-02 to TRK-UC02-01, TRK-UC02-02, TRK-UC02-03, FR-UC02-04, API-TRK-02, DE-TRK-02                                    |
| TRACE-TRK-03    | UC-03 to TRK-UC03-01, TRK-UC03-02, TRK-UC03-03, FR-UC03-03, FR-UC03-06, API-TRK-03, API-TRK-04, DE-TRK-03, DE-TRK-04 |
| TRACE-TRK-04    | UC-03 to TRK-UC03-04, TRK-UC03-05, FR-UC03-07, FR-UC03-08, API-TRK-05, DE-TRK-05, DE-TRK-06                          |
| TRACE-TRK-05    | Demo 1 reporting support to RPT-DEMO1-01 through RPT-DEMO1-06, DE-TRK-07, DE-TRK-08                                  |
| TRACE-TRK-06    | Demo 1 safety boundary to TRK-DEMO1-06, RPT-DEMO1-05, FR-UC01-09, and the no-sensitive-credential-storage constraint |

## Admin and Campaign Supporting Context (Rudolph)

> [!NOTE]
> The following User Stories and Functional Requirements are provided as **supporting context** and **future-facing placeholders** only. They describe the administrative setup required to enable the trainee-facing use cases (UC-01, UC-02, and UC-03) and are not part of the core Demo 1 implementation scope.

### User Stories (Supporting Context)

| ID        | User Story                                                                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-ADM-01 | As an Administrator, I want to create a new campaign so that I can group related simulations and learning paths for specific security initiatives.                    |
| US-ADM-02 | As an Administrator, I want to assign specific trainees to a campaign so that they receive the targeted training relevant to their role or risk profile.              |
| US-ADM-03 | As an Administrator, I want to configure simulations and learning paths for a campaign so that the trainee experience is aligned with current organizational threats. |
| US-ADM-04 | As an Administrator, I want to monitor the progress of a campaign so that I can identify high-risk groups or trainees who need additional support.                    |
| US-ADM-05 | As an Administrator, I want to manage a library of simulation templates so that I can quickly deploy standardized training across different campaigns.                |

### Administrator User Characteristics

The Administrator is a specialized user responsible for managing the security awareness program. For Demo 1, the Administrator role is documented as the source of configuration for the trainee-facing use cases.

- **Goal:** To set up training campaigns that improve the organization's security posture.
- **Technical Literacy:** Moderate to high; familiar with organizational structure and common cyber threats.
- **Responsibilities:**
  - **Campaign Management:** Defining start/end dates, target groups, and objectives.
  - **Content Curation:** Selecting or creating simulations, learning paths, training documents, and quizzes.
  - **User Orchestration:** Mapping trainees to specific learning paths.
  - **Risk Analysis:** Reviewing interaction data to assess organizational vulnerability.

### Preliminary Campaign Lifecycle (Supporting Context)

To support the delivery of simulations and training, a preliminary campaign lifecycle is envisioned:

1. **Draft:** The campaign is being configured. No content is visible to trainees.
2. **Scheduled:** (Future Scope) The campaign is prepared for automatic activation at a specific date.
3. **Active:** The campaign is live, making assigned content visible to trainees.
4. **Paused:** (Future Scope) Temporary suspension of content accessibility.
5. **Completed:** The campaign duration has ended. Final status is recorded.
6. **Archived:** (Future Scope) Historical record storage.

### Detailed Campaign Configuration

#### Simulation Content Setup (UC-01)

Administrators configure simulations that use simulated emails shown in the trainee's inbox.

- **Sender Metadata:** Setting the display name (e.g., "IT Support") and a spoofed-style email address (e.g., `support@corp-security.com`).
- **Phishing Indicators:** Configuring specific "red flags" in the email body (e.g., urgent language, suspicious links, grammatical errors) to be used for educational feedback.
- **Link Tracking:** Defining the destination for any links in the simulated email (usually a "You've been phished" landing page).

#### Training and Quiz Setup (UC-02, UC-03)

Administrators link learning paths and assessments to the campaign context.

- **Document Library:** A central repository of training materials (PDFs, HTML modules).
- **Quiz Builder:** Configuration of questions, multiple-choice options, and correct answer explanations.
- **Mastery Criteria:** Setting a minimum percentage (e.g., 80%) for a quiz to be considered "passed".

### Preliminary Reporting and Data Support (Future Scope)

To support future analytics, the system provides placeholders for capturing lightweight interaction data:

- **Email Interaction:** Basic timestamps for `OpenedAt` or `LinkClickedAt`.
- **Training/Quiz Progress:** Placeholders for `StartedAt` or `CompletionStatus`.

### Data Privacy and Ethical Constraints

Administrators must adhere to strict boundaries when configuring campaigns:

- **No Real Credential Harvesting:** Simulated landing pages must never capture or store actual trainee passwords.
- **Tone and Content:** Simulations should not use overly traumatic themes (e.g., fake termination notices) without organizational approval.
- **Data Minimization:** Interaction tracking should focus on learning outcomes rather than punitive monitoring.

### Admin/Campaign Functional Requirements (Supporting Context)

| ID        | Requirement                                                                                       | Notes                                 |
| --------- | ------------------------------------------------------------------------------------------------- | ------------------------------------- |
| FR-ADM-01 | The system shall support a Campaign entity to group simulations, learning paths, and assignments. | Precondition for UC-01, UC-02, UC-03. |
| FR-ADM-02 | The system shall support assigning a Campaign to trainees.                                        | Precondition for Demo 1 use cases.    |
| FR-ADM-03 | The system shall support the configuration of Simulations and Simulated Emails for a Campaign.    | Precondition for UC-01.               |
| FR-ADM-04 | The system shall support the linking of Learning Paths and training content to a Campaign.        | Precondition for UC-02.               |
| FR-ADM-05 | The system shall support the linking of Quizzes to Training Documents.                            | Precondition for UC-03.               |
| FR-ADM-06 | The system may provide placeholders for recording campaign-level interaction data.                | Future reporting support.             |
| FR-ADM-07 | The system may support a repository for Simulation Templates.                                     | Future optimization.                  |
| FR-ADM-08 | The system should support transition logic to activate a campaign.                                | Controls visibility to actors.        |
| FR-ADM-09 | The system may allow previewing simulation content before activation.                             | Future quality check.                 |
| FR-ADM-10 | The system should prevent the collection of sensitive PII through simulated links.                | Safety constraint.                    |

### Domain References (Admin Context)

| ID        | Entity             | Description                                                            |
| --------- | ------------------ | ---------------------------------------------------------------------- |
| DE-ADM-01 | Administrator      | The user who manages campaigns and content.                            |
| DE-ADM-02 | Campaign           | The core entity grouping simulations, learning paths, and assignments. |
| DE-ADM-03 | CampaignAssignment | The link between a Campaign and a trainee.                             |

### Traceability References (Admin Context)

| Traceability ID | Linked Item                                                        |
| --------------- | ------------------------------------------------------------------ |
| TRACE-ADM-01    | Admin Context to FR-ADM-01, API Contract ID: API-ADM-01, DE-ADM-02 |
| TRACE-ADM-02    | Admin Context to FR-ADM-02, API Contract ID: API-ADM-02, DE-ADM-03 |
| TRACE-ADM-03    | Admin Context to FR-ADM-03, DE-UC01-03                             |
| TRACE-ADM-04    | Admin Context to FR-ADM-04, DE-UC02-01 (Placeholder)               |
| TRACE-ADM-05    | Admin Context to FR-ADM-05, DE-UC03-01 (Placeholder)               |
| TRACE-ADM-06    | Admin Context to FR-ADM-06, API Contract ID: API-ADM-04            |
| TRACE-ADM-07    | Admin Context to FR-ADM-07, API Contract ID: API-ADM-05            |
| TRACE-ADM-08    | Admin Context to FR-ADM-08, API Contract ID: API-ADM-04            |
| TRACE-ADM-09    | Admin Context to FR-ADM-09                                         |
| TRACE-ADM-10    | Admin Context to FR-ADM-10                                         |

## Supporting Document References

### Domain Model and Diagrams

### Demo 1 Domain Model

The Demo 1 domain model provides a high-level UML view of the main concepts required to support the first three Demo 1 use cases:

- `UC-01: View Emails in Simulated Inbox`
- `UC-02: View Training Document`
- `UC-03: Complete Quiz Flow`

The model is intended for SRS alignment, terminology consistency, API planning, traceability, and future database planning. It is not a final database schema and should not be treated as a direct Prisma model or migration design.

Diagram file:

- `docs/demo1/diagrams/demo1-domain-model-(initial).drawio`
- `docs/demo1/diagrams/demo1-domain-model-(initial).svg`

![Demo 1 domain model](<./diagrams/demo1-domain-model-(initial).svg>)

#### Domain Model Scope

The model is divided into four main areas:

| Area                            | Purpose                                                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Users and Access Context        | Represents platform users, organisation membership, company context, and general trainee access.                                  |
| Campaign and Simulation Support | Represents the supporting campaign structure used to assign simulations, learning paths, and simulated emails.                    |
| Training and Quiz Flow          | Represents the core Demo 1 learning entities for training documents, quizzes, attempts, answers, results, feedback, and progress. |
| Future / Reporting Support      | Represents future-facing reporting and risk concepts without defining a full reporting schema.                                    |

#### Domain Relationship Overview

The domain model can be read as the following working structure for Demo 1:

- A trainee is represented by a `User` record. In company-specific flows, the `User` is linked to an `Organisation` through `OrganisationMembership`; in general learning flows, the trainee can access general content without organisation membership.
- Each trainee owns one `SimulatedInbox`. The inbox is a platform-controlled view, not a real mailbox.
- A trainee can be assigned to zero or more `Campaign` records through `CampaignAssignment`.
- A `Campaign` can provide simulated emails, training content, quizzes, or a combination of these through its linked `Simulation` and `LearningPath` records.
- The trainee's `SimulatedInbox` shows `SimulatedEmail` records made available by all campaigns assigned to that trainee.
- A `Simulation` groups one or more `SimulatedEmail` records. Opening a simulated email may create an `InteractionEvent`.
- A `LearningPath` groups one or more `TrainingModule` records. A `TrainingModule` groups one or more `TrainingDocument` records.
- A trainee can open assigned `TrainingDocument` records. Viewing training content may update `TrainingProgress` and may also create an `InteractionEvent`.
- A `TrainingDocument` can optionally link to a `Quiz`. If a quiz is linked, opening or completing that quiz is handled by UC-03, not by UC-02.
- A `Quiz` contains one or more `QuizQuestion` records. When a trainee starts a quiz, the system creates a `QuizAttempt`.
- A `QuizAttempt` contains the trainee's `AttemptAnswer` records. After submission, the attempt can produce a `QuizResult` and trainee-facing `FeedbackItem` records.
- `ReportSummary` and `RiskIndicator` are future-facing concepts. Demo 1 may leave traceability placeholders for them, but it does not define final analytics, dashboards, or risk scoring.

This means the team should treat campaign assignment as the main link between a trainee and the Demo 1 learning/simulation content they can see. The use cases then read from that assigned content: UC-01 reads simulated emails into the inbox, UC-02 reads training documents, and UC-03 creates and submits quiz attempts.

#### User Types

The model supports two high-level user categories:

| User Type | Description                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `Admin`   | A company-linked account that manages trainees, campaigns, simulations, and training setup.                                     |
| `Trainee` | A learning-flow account that may be company-linked through `OrganisationMembership` or general without organisation membership. |

Administrators and trainee accounts are connected to an organisation through `OrganisationMembership` when company context applies.

General trainee accounts are not required to belong to an organisation. They may access general cybersecurity content through `GeneralLearningAccess` and general `LearningPath` records.

#### Core Entity Summary

| Entity                   | Role in Demo 1                                                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`                   | Represents the person using the platform. A user may act as an Administrator, company-linked trainee, or general trainee.                                                          |
| `Organisation`           | Represents a company or organisation using the platform.                                                                                                                           |
| `OrganisationMembership` | Links users to organisations and captures whether they act as Administrators or trainee accounts in that organisation.                                                             |
| `CompanyContext`         | Provides optional company-specific context used to support realistic simulations and training.                                                                                     |
| `Campaign`               | Groups simulations, learning paths, quizzes, and assignments. A campaign may be organisation-assigned or premade/general.                                                          |
| `CampaignAssignment`     | Links a `Campaign` to a `User`. For organisation-based campaigns it may also reference `OrganisationMembership`; for general trainees it does not require organisation membership. |
| `LearningPath`           | Groups training and quiz content. It may be company-context or general learning content.                                                                                           |
| `Simulation`             | Represents a controlled simulated security-awareness scenario.                                                                                                                     |
| `SimulatedEmail`         | Represents a safe simulated email shown in the simulated inbox for UC-01.                                                                                                          |
| `SimulatedInbox`         | Represents the trainee-facing inbox view for assigned simulated emails.                                                                                                            |
| `InteractionEvent`       | Records lightweight trainee interactions, such as opening a simulated email or viewing training content.                                                                           |
| `TrainingModule`         | Groups related training content.                                                                                                                                                   |
| `TrainingDocument`       | Represents readable training material for UC-02.                                                                                                                                   |
| `TrainingProgress`       | Tracks trainee progress through assigned training content.                                                                                                                         |
| `Quiz`                   | Represents an assessment linked to training content.                                                                                                                               |
| `QuizQuestion`           | Represents a question inside a quiz.                                                                                                                                               |
| `QuizAttempt`            | Represents a trainee's attempt at completing a quiz.                                                                                                                               |
| `AttemptAnswer`          | Represents an answer recorded as part of a quiz attempt.                                                                                                                           |
| `QuizResult`             | Represents the result summary after a quiz attempt is submitted.                                                                                                                   |
| `FeedbackItem`           | Represents educational feedback shown after a quiz or simulation-related interaction.                                                                                              |
| `ReportSummary`          | Future-facing reporting aggregation concept.                                                                                                                                       |
| `RiskIndicator`          | Future-facing risk indicator concept for reporting and dashboards.                                                                                                                 |

#### Domain, SRS, and API Alignment Notes

The domain model, SRS feature slices, preliminary API contracts, and traceability table use the following aligned terminology:

| Concept             | Domain Model Name                | SRS Reference                      | Preliminary API Reference                                                               | Notes                                                                                              |
| ------------------- | -------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Platform account    | `User`                           | trainee, Admin                     | Auth context / `userId` fields                                                          | `trainee` is the SRS actor label; `User` is the domain entity.                                     |
| Campaign wrapper    | `Campaign`                       | Admin/Campaign Supporting Context  | `POST /campaigns`                                                                       | Supporting context only for Demo 1; not a full scheduling implementation.                          |
| Campaign assignment | `CampaignAssignment`             | Campaign assignment context        | `POST /campaigns/:campaignId/assign`                                                    | Links campaigns to `User` records; organisation membership is optional depending on campaign type. |
| Simulated inbox     | `SimulatedInbox`                 | UC-01 simulated inbox              | `GET /simulations/inbox`                                                                | Represents the trainee-facing controlled inbox view.                                               |
| Simulated email     | `SimulatedEmail`                 | UC-01 simulated email              | `GET /simulations/emails/:emailId`                                                      | Represents controlled simulated email content, not a real mailbox email.                           |
| Interaction event   | `InteractionEvent`               | UC-01/UC-02 tracking               | `POST /simulations/emails/:emailId/interactions`; `POST /training/:trainingId/progress` | Records lightweight trainee actions without sensitive credential storage.                          |
| Training content    | `TrainingDocument`               | UC-02 training document            | `GET /training/:trainingId`                                                             | Represents readable training content.                                                              |
| Training grouping   | `TrainingModule`, `LearningPath` | UC-02 training module/list context | `GET /training/assigned`                                                                | `LearningPath` groups training/quiz content; `TrainingModule` groups documents.                    |
| Training progress   | `TrainingProgress`               | UC-02 progress tracking            | `POST /training/:trainingId/progress`                                                   | Tracks high-level progress only.                                                                   |
| Quiz                | `Quiz`                           | UC-03 quiz flow                    | `GET /quizzes/:quizId`                                                                  | Represents an assessment linked to training content.                                               |
| Quiz question       | `QuizQuestion`                   | UC-03 quiz questions               | Included in `GET /quizzes/:quizId` response                                             | Represents individual quiz questions.                                                              |
| Quiz attempt        | `QuizAttempt`                    | UC-03 attempt                      | `POST /quizzes/:quizId/attempts`                                                        | Created when a trainee starts a quiz.                                                              |
| Attempt answer      | `AttemptAnswer`                  | UC-03 submitted answers            | `POST /quiz-attempts/:attemptId/submit`                                                 | Represents answers submitted for a quiz attempt.                                                   |
| Quiz result         | `QuizResult`                     | UC-03 result summary               | `GET /quiz-attempts/:attemptId/results`                                                 | Represents a submitted attempt result.                                                             |
| Feedback            | `FeedbackItem`                   | UC-03 educational feedback         | `GET /quiz-attempts/:attemptId/results`                                                 | Represents trainee-facing feedback.                                                                |
| Reporting summary   | `ReportSummary`                  | Future reporting support           | Future reporting placeholder                                                            | Future-facing only.                                                                                |
| Risk indicator      | `RiskIndicator`                  | Future risk support                | Future reporting placeholder                                                            | No final risk scoring formula is defined for Demo 1.                                               |

UC-01 is supported by:

- `User`
- `OrganisationMembership`
- `CampaignAssignment`
- `Simulation`
- `SimulatedEmail`
- `SimulatedInbox`
- `InteractionEvent`
- optional `TrainingDocument` reference

A trainee is represented as a `User` connected to an organisation through `OrganisationMembership` when company context applies. A campaign assignment can determine which simulated emails are available to the trainee. The simulated inbox displays assigned `SimulatedEmail` summaries and allows the trainee to open a selected email.

When an email is opened, the system may record an `InteractionEvent`, such as `EMAIL_OPENED`.

For Demo 1, the simulated inbox is controlled platform content only. It does not connect to a real mailbox and does not send real external emails.

#### Support for UC-02: View Training Document

UC-02 is supported by:

- `User`
- `LearningPath`
- `TrainingModule`
- `TrainingDocument`
- `TrainingProgress`
- `InteractionEvent`
- optional `Quiz` reference

A trainee accesses training content through a learning path. A learning path contains training modules, and a training module contains one or more training documents. When a trainee opens or views a training document, the system may update `TrainingProgress` or record a lightweight `InteractionEvent`.

If a quiz is linked to the training document, the trainee may navigate to that quiz, but the quiz execution flow remains part of UC-03.

#### Support for UC-03: Complete Quiz Flow

UC-03 is supported by:

- `User`
- `Quiz`
- `QuizQuestion`
- `QuizAttempt`
- `AttemptAnswer`
- `QuizResult`
- `FeedbackItem`

When a trainee starts a quiz, the system creates a `QuizAttempt`. The quiz contains one or more `QuizQuestion` records. The trainee's submitted responses are represented as `AttemptAnswer` records. Once the attempt is submitted, the system can produce a `QuizResult` and related `FeedbackItem` records.

This supports the Demo 1 quiz flow without requiring adaptive learning, advanced analytics, or a full reporting dashboard.

#### Scope Boundary

This domain model does not define:

- final database migrations,
- Prisma models,
- a full ERD,
- every final field required for production,
- real external email delivery,
- advanced campaign scheduling,
- AI-generated simulations,
- adaptive learning,
- or full reporting/dashboard schemas.

The purpose of the model is to align Demo 1 terminology across the SRS, API planning, diagrams, and traceability.

### API Contracts

See `docs/demo1/API.md` for preliminary API contracts and payloads supporting these use cases.

### Architecture and Technical Requirements

See `docs/demo1/architecture.md` for the overarching architectural approach, quality requirements, design patterns, and constraints guiding Demo 1 implementation.

### Design and Wireframes

See `docs/demo1/DESIGN.md` for UI guidelines, interaction states, and accessibility standards.

### Testing and Traceability

See `docs/demo1/testing.md` and `docs/demo1/traceability.md` for QA strategies and testing scope boundaries.
