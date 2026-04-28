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
- The employee has access to at least one assigned simulated email inbox.
- Simulated emails exist as controlled training content inside the platform.
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

## UC-02: Training Document Viewing Requirements (Connor)

### User Story

### Actor

### Preconditions

### Postconditions

### Main Flow

### Exceptions

### Functional Requirements

### Domain References

### API References

### Traceability References

## UC-03: Quiz Flow Requirements (Zoë)

### User Story

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

### Administrator User Characteristics

### Basic Campaign Concept

### Employee Assignment Context

### Simulation Content Setup

### Training and Quiz Setup

## Supporting Document References

### Domain Model and Diagrams

### API Contracts

### Architecture and Technical Requirements

### Design and Wireframes

### Testing and Traceability
