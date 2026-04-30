# Demo 1 Software Requirements Specification

## Purpose

This document collects Sprint 1 Demo 1 requirements for the Cybersecurity Awareness Training Platform.

## Demo 1 Scope

### UC-01: View Emails in Simulated Inbox

### UC-02: View Training Document

### UC-03: Complete Quiz Flow

## Base Features

### Login/Register

### Themes

### General Form Validation

## Document Structure and Integration (Johan)

### Introduction

### Project Scope

### User Characteristics

### Assumptions

### Dependencies

### Cross-Reference Structure

## UC-01: Simulated Inbox Requirements

### User Story

As an employee, I want to view my simulated emails in a controlled inbox(rather than my own) so that i can recognize potentially suspicious messages in a safe training environment before encountering similar effects/threats in real life.

### Purpose

UC-01 defines the Demo 1 simulated inbox feature slice. The simulated inbox allows an employee to view a list of safe, preconfigured simulated emails, open an email to inspect its details, and receive clear simulated-phishing context where relevant.

This use case is limited to viewing simulated content. It does not include real email delivery, live corporate email integration, advanced campaign scheduling, AI-generated phishing content, or full reporting dashboards and email level difficulty(for gamification).

### Actor

Primary Actor:

- Employee

Supporting Actors:

- System
- Admins (as a future supporting context for preparing simulated content)

### Preconditions

- The employee is authenticated and registered.
- **The employee has access to at least one assigned simulated email inbox (assigned via an admin-managed campaign, see Admin Supporting Context).**
- **Simulated emails exist as controlled training content inside the platform (configured by an Admin, see FR-ADM-03).**
- The simulated inbox is available from the learner/employee dashboard or equivalent employee navigation path.

### Postconditions

Successful Post conditions:

- The employee can view simulated email summaries.
- The employee can open a selected simulated email and view its details.
- The system may record a lightweight interaction event when the employee opens or views a simulated email.
- The employee can identify that the email exists in a controlled training context.
- If the email represents a phishing scenario, the system may show safe contextual information or a placeholder link to training feedback.

Unsuccessful Post conditions:

- If no simulated emails are assigned, the employee sees an appropriate empty state.
- If a selected simulated email cannot be found, the employee sees a safe error state.
- If interaction tracking fails, the employee should still be able to view the email where possible, while the system handles the tracking failure safely.

### Main Flow

1. The employee navigates to the simulated inbox from the learner/employee dashboard or navigation menu.
2. The system displays a list of simulated email summaries assigned to the employee.
3. Each summary shows enough information for safe review, such as sender label, subject, preview text, received date/status, and simulated/safety indicator where applicable.
4. The employee selects one simulated email from the inbox list.
5. The system opens the simulated email detail view.
6. The system displays the selected email content, including sender information, subject, body text, and any safe simulated-phishing context.
7. The system records a lightweight interaction event that the email was opened or viewed.
8. The employee reviews the email and may return to the simulated inbox list.
9. If a training follow-up exists, the system may display a placeholder link or prompt to related training feedback without starting the full training or quiz flow inside this use case.

### Exceptions

#### EX-UC01-01: No Simulated Emails Assigned

If the employee has no simulated emails assigned, the system displays an empty state explaining that no simulated emails are currently available.

#### EX-UC01-02: Simulated Email Not Found

If the employee tries to open an email that does not exist or is no longer assigned to them, the system displays an error state and allows the employee to return to the inbox list.

#### EX-UC01-03: Simulated Inbox Loading Failure

If the system cannot load the simulated inbox, it displays a safe error message and allows the employee to retry or return to the dashboard.

#### EX-UC01-04: Interaction Tracking Failure

If the system cannot record the email-open interaction, the system should not expose technical error details to the employee. The email may still be displayed if it is otherwise available.

#### EX-UC01-05: Attempted Real Email Access

If any flow attempts to access real external email infrastructure, the system must block or exclude that behavior for Demo 1.

### Functional Requirements

| ID         | Requirement                                                                                                                            | Priority | Notes                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------- |
| FR-UC01-01 | The system shall allow an employee to view a list of assigned simulated email summaries.                                               |     Must | Summary content may include subject, sender label, preview text, received date/status, and simulated content indicator. |
| FR-UC01-02 | The system shall allow an employee to open a selected simulated email from the inbox list.                                             |     Must | The detailed view should show the simulated email content in a readable format.                                         |
| FR-UC01-03 | The system shall clearly treat all inbox content as simulated, controlled training content.                                            |     Must | Demo 1 must not imply access to a real mailbox.                                                                         |
| FR-UC01-04 | The system shall record a lightweight interaction event when an employee opens or views a simulated email.                             |   Should | This supports later reporting and traceability without requiring a full reporting dashboard in Demo 1.                  |
| FR-UC01-05 | The system shall provide safe simulated-phishing context where relevant.                                                               |   Should | This may include warning context, educational feedback, or a placeholder link to training.                              |
| FR-UC01-06 | The system shall display an empty state when no simulated emails are assigned to the employee.                                         |     Must | The message should be clear and non-technical.                                                                          |
| FR-UC01-07 | The system shall display a safe error state when a selected simulated email cannot be loaded.                                          |     Must | The employee should be able to return to the inbox list or dashboard.                                                   |
| FR-UC01-08 | The system shall not connect to or send messages through real external email infrastructure for Demo 1 UC-01.                          |     Must | Real email delivery is out of scope for this feature slice.                                                             |
| FR-UC01-09 | The system shall avoid collecting or storing sensitive credential input through the simulated inbox view.                              |     Must | Credential-submission simulations are future scope and must be handled safely if introduced later.                      |
| FR-UC01-10 | The system shall keep UC-01 separate from the full training document and quiz flows except for optional follow-up links or references. |   Should | Training and quiz flows remain covered by UC-02 and UC-03.                                                              |

### Non-Functional requirements and Safety Concerns

| ID          | Requirement                                                                                                            | Notes                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| NFR-UC01-01 | The simulated inbox interface should be clear and usable for non-technical employees.                                  | Supports the platform goal of accessible cybersecurity awareness training. |
| NFR-UC01-02 | Simulated email content should be visually distinct enough to avoid confusion with real mailbox systems during Demo 1. | Helps maintain ethical and safe simulation boundaries.                     |
| NFR-UC01-03 | Interaction tracking should minimise personal data collection.                                                         | Track the action/event, not unnecessary sensitive content.                 |
| NFR-UC01-04 | Error messages should avoid exposing technical implementation details.                                                 | Keeps the learner experience safe and understandable.                      |

### Interaction Tracking Requirements

| ID          | Tracking Requirement                                                                                  | Event Example                                     | Notes                                   |
| ----------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------- |
| TRK-UC01-01 | The system should record when an employee opens a simulated email.                                    | `EMAIL_OPENED`                                    | Used for later progress/risk reporting. |
| TRK-UC01-02 | The system may record when an employee views the simulated inbox list.                                | `INBOX_VIEWED`                                    | Optional for Demo 1.                    |
| TRK-UC01-03 | The system should associate interaction events with the simulated email and employee/user reference.  | `employeeId`, `emailId`, `eventType`, `timestamp` | Exact field names are preliminary.      |
| TRK-UC01-04 | The system should not store real credential values or sensitive user input as part of UC-01 tracking. | Not applicable                                    | Important safety boundary.              |

### Domain References

Preliminary domain entities linked to UC-01:

| ID         | Entity            | Description                                                                                      |
| ---------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| DE-UC01-01 | Employee/User     | The learner who views assigned simulated emails.                                                 |
| DE-UC01-02 | SimulatedInbox    | The controlled inbox view containing simulated email summaries.                                  |
| DE-UC01-03 | SimulatedEmail    | A safe, preconfigured email used for training or phishing-awareness simulation.                  |
| DE-UC01-04 | InteractionEvent  | A lightweight record of learner interaction, such as opening a simulated email.                  |
| DE-UC01-05 | SimulationContext | Supporting context explaining why the email is simulated or what learning objective it supports. |
| DE-UC01-06 | TrainingReference | Optional reference to related training feedback or follow-up content.                            |

### API References

Preliminary API placeholders linked to UC-01:

| ID          | Contract                                         | Purpose                                                                                 |
| ----------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| API-UC01-01 | `GET /simulations/inbox`                         | Retrieve assigned simulated email summaries for the employee.                           |
| API-UC01-02 | `GET /simulations/emails/:emailId`               | Retrieve details for a selected simulated email.                                        |
| API-UC01-03 | `POST /simulations/emails/:emailId/interactions` | Record a lightweight interaction event, such as opening or viewing the simulated email. |

PLEASE NOTE: These contracts are subjected to change throughout the course of implementation.

### Traceability References

| Traceability ID | Linked Item                                               |
| --------------- | --------------------------------------------------------- |
| TRACE-UC01-01   | UC-01 to FR-UC01-01, API-UC01-01, DE-UC01-02, DES-UC01-01 |
| TRACE-UC01-02   | UC-01 to FR-UC01-02, API-UC01-02, DE-UC01-03, DES-UC01-02 |
| TRACE-UC01-03   | UC-01 to FR-UC01-04, API-UC01-03, DE-UC01-04              |
| TRACE-UC01-04   | UC-01 to FR-UC01-05, DE-UC01-05, DES-UC01-03              |
| TRACE-UC01-05   | UC-01 to FR-UC01-08 and Demo 1 simulation safety boundary |

## UC-02: Training Document Viewing Requirements 

### User Story

As a learner, I want to view training documents assigned to me so that I can learn how to recognise and respond to cyber threats in a controlled educational environment.

### Purpose 

UC-02 defines the Demo 1 "training document viewing feature" slice. The feature allows a learner to access a list of assigned training materials, open a selected training document, and view its contents in a structured and readable format.

This use case is limited to viewing training content and recording basic interaction tracking. It does not include training content creation, editing, campaign management, or full quiz execution.

### Actor

#### Primary Actor: 
- Learner

#### Supporting Actors:

- System
- Administrator (as a supporting context for assigning training content via campaigns)

### Preconditions

- The learner is authenticated and registered.
- The learner has access to at least one assigned training document (via an administrator-managed campaign, see `FR-ADM-04`).
- Training documents exist as controlled educational content within the platform.
- The training module list is accessible from the learner dashboard or equivalent navigation path.

### Postconditions

#### Successful Postconditions:

- The learner can view a list of assigned training documents.
- The learner can open and read a selected training document.
- The system records a basic interaction event.
- The learner understands that the content is part of a structured training experience.
- If a quiz is linked, the system may display a link or button to proceed to the associated quiz.

#### Unsuccessful Postconditions:

- If no training documents are assigned, the learner sees an appropriate empty state.
- If a selected training document cannot be found, the learner sees a safe error state.
- If interaction tracking fails, the learner can still view the training content.

### Main Flow

1. The learner navigates to the training module list from the dashboard or navigation menu.
2. The system retrieves and displays a list of training documents assigned to the learner.
3. Each training item displays summary information such as title, description, and basic interaction status (if available).
4. The learner selects a training document from the list.
5. The system retrieves the selected training document.
6. The system displays the training content in a structured and readable format (e.g., text, sections, or embedded media).
7. The system records a basic interaction event (e.g., training viewed or started).
8. The learner reviews the training material.
9. If a related quiz exists, the system may display a link or button to proceed to the quiz (covered in UC-03).
10. The learner may return to the training module list or dashboard.

### Exceptions

#### `EX-UC02-01`: No Training Documents Assigned

If the learner has no training documents assigned, the system displays an empty state indicating that no training content is currently available. 

#### `EX-UC02-02`: Training Document Not Found

If the learner attempts to open a training document that does not exist or is no longer assigned, the system displays an error state and allows the learner to return to the training list.

#### `EX-UC02-03`: Training Content Loading Failure

If the system cannot load the training document, it displays a safe error message and allows the learner to retry or return to the dashboard.

#### `EX-UC02-04`: Interaction Tracking Failure

If the system cannot record training interaction, the system should not expose technical details to the learner. The training content should still be displayed where possible.

### Functional Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| `FR-UC02-01` | The system shall allow a learner to view a list of assigned training documents. | **Must** | Includes summary information such as title, description, and basic interaction status (e.g., not started, started, completed). |
| `FR-UC02-02` | The system shall allow a learner to open a selected training document. | **Must** | Displays full training content. |
| `FR-UC02-03` | The system shall present training content in a structured and readable format. | **Must** | Supports accessibility and clarity. |
| `FR-UC02-04` | The system shall record a basic interaction event when training is viewed. | Should | Supports more detailed future reporting. |
| `FR-UC02-05` | The system shall display an empty state when no training documents are assigned. | **Must** | Clear, non-technical messaging. |
| `FR-UC02-06` | The system shall display a safe error state when a training document cannot be loaded. | **Must** | Allow recovery navigation. |
| `FR-UC02-07` | The system shall allow navigation to a linked quiz without executing the quiz flow. | Should | Quiz handled in `UC-03`. |
| `FR-UC02-08` | The system shall not allow modification of training content by learners. | **Must** | Maintains scope boundary. |
| `FR-UC02-09` | The system shall treat all training documents as controlled educational content. | **Must** | Reinforces training context. |
| `FR-UC02-10` | The system shall allow the learner to access training content independently of quiz completion. | Should | Maintains separation between `UC-02` and `UC-03`. |

### Domain References

| ID | Entity | Description |
|----|--------|-------------|
| `DE-UC02-01` | Learner | The user viewing assigned training documents. |
| `DE-UC02-02` | TrainingDocument | A structured educational content item (e.g., PDF, HTML module). |
| `DE-UC02-03` | TrainingAssignment | Links a training document to a learner via a campaign. |
| `DE-UC02-04` | TrainingProgress | A basic record of training interaction or status. |
| `DE-UC02-05` | TrainingReference | Optional link or button to related quiz or follow-up content. |

### API References

| ID | Contract | Purpose |
|----|----------|---------|
| `API-UC02-01` | `GET /training/assigned` | Retrieve assigned training documents for the learner. |
| `API-UC02-02` | `GET /training/:trainingId` | Retrieve full training document content. |
| `API-UC02-03` | `POST /training/:trainingId/progress` | Record a basic training interaction event. |

### Traceability References

| Traceability ID | Linked Item |
|-----------------|-------------|
| `TRACE-UC02-01` | `UC-02 -> FR-UC02-01, API-UC02-01, DE-UC02-02, DES-UC02-01` |
| `TRACE-UC02-02` | `UC-02 -> FR-UC02-02, API-UC02-02, DE-UC02-02, DES-UC02-02` |
| `TRACE-UC02-03` | `UC-02 -> FR-UC02-04, API-UC02-03, DE-UC02-04` |
| `TRACE-UC02-04` | `UC-02 -> FR-UC02-07, DE-UC02-05, DES-UC02-03` |
| `TRACE-UC02-05` | `UC-02 -> FR-UC02-08` |

## UC-03: Quiz Flow Requirements (Zoë)

### User Story

As an employee, I want to complete a quiz after my training session so that I can verify my understanding of the material and receive feedback on my security knowledge.

### Actor

### Preconditions

### Postconditions

### Main Flow

### Exceptions

### Functional Requirements

### Domain References

### API References

### Traceability References

## Validation, Error-State, and Feedback Requirements (Zoë)

### Required Field Validation

### Quiz Answer Validation

### Submission Feedback

### Success Messages

### Error Messages

### Loading States

### Empty States

## Interaction Tracking, Progress, and Reporting Requirements

### Simulated Inbox Interaction Tracking

For Demo 1, simulated inbox tracking is limited to lightweight learner/employee interaction events that support future traceability and reporting.

The primary tracked interaction for UC-01 is opening or viewing a simulated email. This event helps the system later determine whether a learner engaged with a simulated email item.

| ID          | Requirement                                                                                                              | Notes                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| TRK-UC01-01 | The system should record when a learner opens a simulated email.                                                         | Supports later reporting and campaign analysis.                              |
| TRK-UC01-02 | The system may record when a learner views the simulated inbox list.                                                     | Optional for Demo 1.                                                         |
| TRK-UC01-03 | The system should record event metadata such as learner reference, simulated email reference, event type, and timestamp. | Exact implementation fields are preliminary.                                 |
| TRK-UC01-04 | The system must not record real passwords, real credentials, or sensitive user input as part of UC-01.                   | Important safety and privacy requirement.                                    |
| TRK-UC01-05 | Interaction tracking failure should not prevent the learner from safely viewing simulated content where possible.        | Avoids blocking the learner experience due to non-critical tracking failure. |

### Training Progress

Training progress is primarily covered by UC-02. UC-01 may only reference training progress when a simulated email provides a safe follow-up link or feedback prompt to related training content about the specific email.

### Quiz Attempts

Quiz attempts are covered by UC-03 and are out of scope for UC-01.

### Quiz Results

Quiz results are covered by UC-03 and are out of scope for UC-01.

### Preliminary Reporting Support

UC-01 prepares for future reporting by defining lightweight interaction events. Demo 1 does not require a full reporting dashboard for simulated inbox behavior.

## Admin and Campaign Supporting Context (Rudolph)

> [!NOTE]
> The following User Stories and Functional Requirements are provided as **supporting context** and **future-facing placeholders** only. They describe the administrative setup required to enable the employee-facing use cases (UC-01, UC-02, and UC-03) and are not part of the core Demo 1 implementation scope.

### User Stories (Supporting Context)

| ID | User Story |
| :--- | :--- |
| US-ADM-01 | As an Administrator, I want to create a new campaign so that I can group related simulations and training materials for specific security initiatives. |
| US-ADM-02 | As an Administrator, I want to assign specific employees to a campaign so that they receive the targeted training relevant to their role or risk profile. |
| US-ADM-03 | As an Administrator, I want to configure simulated emails and training content for a campaign so that the learner experience is aligned with current organizational threats. |
| US-ADM-04 | As an Administrator, I want to monitor the progress of a campaign so that I can identify high-risk groups or employees who need additional support. |
| US-ADM-05 | As an Administrator, I want to manage a library of simulation templates so that I can quickly deploy standardized training across different campaigns. |

### Administrator User Characteristics

The Administrator is a specialized user responsible for managing the security awareness program. For Demo 1, the Administrator role is documented as the source of configuration for the employee-facing use cases.

- **Goal:** To set up training campaigns that improve the organization's security posture.
- **Technical Literacy:** Moderate to high; familiar with organizational structure and common cyber threats.
- **Responsibilities:**
    - **Campaign Management:** Defining start/end dates, target groups, and objectives.
    - **Content Curation:** Selecting or creating simulated emails, training documents, and quizzes.
    - **User Orchestration:** Mapping employees to specific training paths.
    - **Risk Analysis:** Reviewing interaction data to assess organizational vulnerability.

### Preliminary Campaign Lifecycle (Supporting Context)

To support the delivery of simulations and training, a preliminary campaign lifecycle is envisioned:

1.  **Draft:** The campaign is being configured. No content is visible to employees.
2.  **Scheduled:** (Future Scope) The campaign is prepared for automatic activation at a specific date.
3.  **Active:** The campaign is live, making assigned content visible to employees.
4.  **Paused:** (Future Scope) Temporary suspension of content accessibility.
5.  **Completed:** The campaign duration has ended. Final status is recorded.
6.  **Archived:** (Future Scope) Historical record storage.

### Detailed Campaign Configuration

#### Simulation Content Setup (UC-01)
Administrators configure the simulated emails that appear in the employee's inbox.
- **Sender Metadata:** Setting the display name (e.g., "IT Support") and a spoofed-style email address (e.g., `support@corp-security.com`).
- **Phishing Indicators:** Configuring specific "red flags" in the email body (e.g., urgent language, suspicious links, grammatical errors) to be used for educational feedback.
- **Link Tracking:** Defining the destination for any links in the simulated email (usually a "You've been phished" landing page).

#### Training and Quiz Setup (UC-02, UC-03)
Administrators link educational content and assessments to the campaign.
- **Document Library:** A central repository of training materials (PDFs, HTML modules).
- **Quiz Builder:** Configuration of questions, multiple-choice options, and correct answer explanations.
- **Mastery Criteria:** Setting a minimum percentage (e.g., 80%) for a quiz to be considered "passed".

### Preliminary Reporting and Data Support (Future Scope)

To support future analytics, the system provides placeholders for capturing lightweight interaction data:

- **Email Interaction:** Basic timestamps for `OpenedAt` or `LinkClickedAt`.
- **Training/Quiz Progress:** Placeholders for `StartedAt` or `CompletionStatus`.

### Data Privacy and Ethical Constraints

Administrators must adhere to strict boundaries when configuring campaigns:
- **No Real Credential Harvesting:** Simulated landing pages must never capture or store actual user passwords.
- **Tone and Content:** Simulations should not use overly traumatic themes (e.g., fake termination notices) without organizational approval.
- **Data Minimization:** Interaction tracking should focus on learning outcomes rather than punitive monitoring.

### Admin/Campaign Functional Requirements (Supporting Context)

| ID | Requirement | Priority | Notes |
| :--- | :--- | :--- | :--- |
| FR-ADM-01 | The system shall support a Campaign entity to group simulations and training. | Should | Precondition for UC-01, UC-02, UC-03. |
| FR-ADM-02 | The system shall support assigning a Campaign to Employees. | Should | Precondition for Demo 1 use cases. |
| FR-ADM-03 | The system shall support the configuration of Simulated Emails for a Campaign. | Should | Precondition for UC-01. |
| FR-ADM-04 | The system shall support the linking of Training Documents to a Campaign. | Should | Precondition for UC-02. |
| FR-ADM-05 | The system shall support the linking of Quizzes to Training Documents. | Should | Precondition for UC-03. |
| FR-ADM-06 | The system may provide placeholders for recording campaign-level interaction data. | May | Future reporting support. |
| FR-ADM-07 | The system may support a repository for Simulation Templates. | May | Future optimization. |
| FR-ADM-08 | The system should support transition logic to activate a campaign. | Should | Controls visibility to actors. |
| FR-ADM-09 | The system may allow previewing simulation content before activation. | May | Future quality check. |
| FR-ADM-10 | The system should prevent the collection of sensitive PII through simulated links. | Should | Safety constraint. |

### Domain References (Admin Context)

| ID | Entity | Description |
| :--- | :--- | :--- |
| DE-ADM-01 | Administrator | The user who manages campaigns and content. |
| DE-ADM-02 | Campaign | The core entity grouping simulations, training, and assignments. |
| DE-ADM-03 | CampaignAssignment | The link between a Campaign and an Employee. |

### Traceability References (Admin Context)

| Traceability ID | Linked Item |
| :--- | :--- |
| TRACE-ADM-01 | Admin Context to FR-ADM-01, API Contract ID: API-ADM-01, DE-ADM-02 |
| TRACE-ADM-02 | Admin Context to FR-ADM-02, API Contract ID: API-ADM-02, DE-ADM-03 |
| TRACE-ADM-03 | Admin Context to FR-ADM-03, DE-UC01-03 |
| TRACE-ADM-04 | Admin Context to FR-ADM-04, DE-UC02-01 (Placeholder) |
| TRACE-ADM-05 | Admin Context to FR-ADM-05, DE-UC03-01 (Placeholder) |
| TRACE-ADM-06 | Admin Context to FR-ADM-06, API Contract ID: API-ADM-04 |
| TRACE-ADM-07 | Admin Context to FR-ADM-07, API Contract ID: API-ADM-05 |
| TRACE-ADM-08 | Admin Context to FR-ADM-08, API Contract ID: API-ADM-04 |
| TRACE-ADM-09 | Admin Context to FR-ADM-09 |
| TRACE-ADM-10 | Admin Context to FR-ADM-10 |

## Supporting Document References

### Domain Model and Diagrams

### API Contracts

### Architecture and Technical Requirements

### Design and Wireframes

### Testing and Traceability
