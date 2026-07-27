# Quality Requirements

This section defines measurable quality requirements for Insightful Phish using quality scenarios. These requirements complement the functional requirements by describing how well the system must behave under important conditions.

## SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- [2. Users and User Stories](users-and-user-stories.md)
- [3. Functional Requirements](functional-requirements.md)
- [4. Use Cases](use-cases.md)
- **[5. Quality Requirements](#5-quality-requirements)** &larr; _You are here_
  - [5.1 Purpose](#51-purpose)
  - [5.2 Quality Requirement Format](#52-quality-requirement-format)
  - [5.3 Quality Requirements](#53-quality-requirements)
  - [5.4 Quality Priorities](#54-quality-priorities)
  - [5.5 Quality Traceability](#55-quality-traceability)
  - [5.6 References](#56-references)
- [6. Domain Model](domain-model.md)
- [7. Changelog](changelog.md)

---

## 5. Quality Requirements

### 5.1 Purpose

The purpose of these quality requirements is to make the most important non-functional expectations testable. They focus on security, privacy, usability, accessibility, reliability, performance, maintainability, auditability, and ethical safety because those qualities directly affect a cybersecurity awareness training platform.

### 5.2 Quality Requirement Format

Each quality requirement is written as a scenario with:

- **Quality attribute:** The quality being measured.
- **Source of stimulus:** The actor or condition that causes the event.
- **Stimulus:** The event that the system must respond to.
- **Environment:** The operating condition in which the event occurs.
- **Affected artefact:** The part of the product being evaluated.
- **Response:** The required system behaviour.
- **Response measure:** The measurable outcome used to judge success.
- **Rationale:** Why the requirement matters.
- **Priority:** The relative importance for Demo 2 and later development.
- **Traceability:** Related functional or architectural areas.

### 5.3 Quality Requirements

#### `QR-01` Secure Authentication and Session Protection

| Field              | Scenario                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality attribute  | Security                                                                                                                                                                                                                                                                                                                                                                                                         |
| Source of stimulus | Unauthenticated or malicious user                                                                                                                                                                                                                                                                                                                                                                                |
| Stimulus           | The actor attempts to access protected account, organisation, training, or administration features without a valid session                                                                                                                                                                                                                                                                                       |
| Environment        | Normal operation through the web application or API                                                                                                                                                                                                                                                                                                                                                              |
| Affected artefact  | Authentication, authorisation, and session handling                                                                                                                                                                                                                                                                                                                                                              |
| Response           | The system denies protected access, returns a safe unauthorised or forbidden response, and does not expose protected data                                                                                                                                                                                                                                                                                        |
| Response measure   | 100% of protected endpoints and protected user-interface paths in Demo 2 verification require valid authentication and the appropriate role or permission                                                                                                                                                                                                                                                        |
| Rationale          | The platform stores sensitive account, organisation, training, and audit information that must not be exposed to unauthorised users                                                                                                                                                                                                                                                                              |
| Priority           | High                                                                                                                                                                                                                                                                                                                                                                                                             |
| Traceability       | [R1](functional-requirements.md#r1-authentication-and-account-access), [R10](functional-requirements.md#r10-manage-organisation-employees), [R11](functional-requirements.md#r11-manage-organisation-administrators-and-permissions), [R12](functional-requirements.md#r12-manage-insightful-phish-platform-administrators), [R14](functional-requirements.md#r14-manage-personal-account-and-security-settings) |

#### `QR-02` Sensitive Data Privacy

| Field              | Scenario                                                                                                                                                                                                                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality attribute  | Privacy and security                                                                                                                                                                                                                                                                                                                          |
| Source of stimulus | User, administrator, audit reviewer, or system event                                                                                                                                                                                                                                                                                          |
| Stimulus           | Sensitive actions involve passwords, tokens, email-change requests, sessions, invitations, or simulated threat interactions                                                                                                                                                                                                                   |
| Environment        | Normal operation, validation failure, error handling, and audit review                                                                                                                                                                                                                                                                        |
| Affected artefact  | Account workflows, audit views, email flows, and training interactions                                                                                                                                                                                                                                                                        |
| Response           | The system prevents passwords, raw tokens, token hashes, unnecessary request data, and unsafe credential-like values from being exposed in user-visible messages or audit summaries                                                                                                                                                           |
| Response measure   | Demo 2 security review and targeted tests find no passwords, raw tokens, token hashes, or unnecessary sensitive request bodies in audit summaries, safe error responses, or non-essential training records                                                                                                                                    |
| Rationale          | A cybersecurity training platform must model safe handling of sensitive information and avoid creating avoidable privacy risks                                                                                                                                                                                                                |
| Priority           | High                                                                                                                                                                                                                                                                                                                                          |
| Traceability       | [R1.6](functional-requirements.md#r1-authentication-and-account-access), [R14](functional-requirements.md#r14-manage-personal-account-and-security-settings), [R25](functional-requirements.md#r25-classify-and-interact-with-simulated-email-threats), [R27](functional-requirements.md#r27-review-audit-and-platform-oversight-information) |

#### `QR-03` Usable Training Flow

| Field              | Scenario                                                                                                                                                                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality attribute  | Usability                                                                                                                                                                                                                                                             |
| Source of stimulus | Trainee                                                                                                                                                                                                                                                               |
| Stimulus           | The trainee starts or resumes a campaign item such as a simulated inbox, training document, or quiz                                                                                                                                                                   |
| Environment        | Normal desktop or mobile browser use                                                                                                                                                                                                                                  |
| Affected artefact  | Trainee campaign participation experience                                                                                                                                                                                                                             |
| Response           | The system presents clear campaign-item state, safe unavailable states, readable content, and understandable feedback                                                                                                                                                 |
| Response measure   | In Demo 2 manual verification, a trainee can open an available campaign item, understand whether it is available or locked, and return to the campaign without needing external instructions                                                                          |
| Rationale          | Training effectiveness depends on users being able to follow the campaign flow without confusion                                                                                                                                                                      |
| Priority           | High                                                                                                                                                                                                                                                                  |
| Traceability       | [R2](functional-requirements.md#r2-trainee-campaign-access), [R3](functional-requirements.md#r3-view-emails-in-a-simulated-inbox), [R4](functional-requirements.md#r4-view-a-training-document), [R5](functional-requirements.md#r5-complete-a-quiz-and-view-results) |

#### `QR-04` Accessible Core Reading and Form Tasks

| Field              | Scenario                                                                                                                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality attribute  | Accessibility                                                                                                                                                                                                           |
| Source of stimulus | User relying on keyboard navigation, semantic structure, or assistive technology                                                                                                                                        |
| Stimulus           | The user completes registration, login, campaign reading, quiz, or account-settings tasks                                                                                                                               |
| Environment        | Supported modern browsers in the Demo 2 environment                                                                                                                                                                     |
| Affected artefact  | Public forms, authentication screens, trainee content, and account settings                                                                                                                                             |
| Response           | The system provides labelled inputs, meaningful headings, keyboard-accessible controls, readable text, and visible validation feedback                                                                                  |
| Response measure   | Core Demo 2 flows should pass keyboard-only smoke testing and automated accessibility checks without critical violations in the tested screens                                                                          |
| Rationale          | The platform must be usable by trainees and administrators with different access needs                                                                                                                                  |
| Priority           | High                                                                                                                                                                                                                    |
| Traceability       | [R1](functional-requirements.md#r1-authentication-and-account-access), [R2](functional-requirements.md#r2-trainee-campaign-access), [R14](functional-requirements.md#r14-manage-personal-account-and-security-settings) |

#### `QR-05` Reliable Tokenised Actions

| Field              | Scenario                                                                                                                                                                                                                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality attribute  | Reliability                                                                                                                                                                                                                                                                                                                   |
| Source of stimulus | User or administrator completing a tokenised action                                                                                                                                                                                                                                                                           |
| Stimulus           | A verification, password reset, setup, or invitation token is submitted                                                                                                                                                                                                                                                       |
| Environment        | Normal operation, expired-token use, repeated-token use, or interrupted delivery                                                                                                                                                                                                                                              |
| Affected artefact  | Tokenised account access and invitation workflows                                                                                                                                                                                                                                                                             |
| Response           | The system completes the intended action once, marks the token as used only after success, and rejects missing, expired, revoked, used, or wrong-purpose tokens safely                                                                                                                                                        |
| Response measure   | Targeted tests and manual verification show that repeated or stale token submissions do not create duplicate accounts, memberships, permissions, or success milestones                                                                                                                                                        |
| Rationale          | Tokenised workflows are sensitive and must remain consistent even when users retry links or emails are delayed                                                                                                                                                                                                                |
| Priority           | High                                                                                                                                                                                                                                                                                                                          |
| Traceability       | [R1.5](functional-requirements.md#r1-authentication-and-account-access), [R1.6](functional-requirements.md#r1-authentication-and-account-access), [R8](functional-requirements.md#r8-complete-initial-organisation-administrator-setup), [R9](functional-requirements.md#r9-accept-an-organisation-invitation-or-role-change) |

#### `QR-06` Responsive Performance for Standard Requests

| Field              | Scenario                                                                                                                                                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality attribute  | Performance                                                                                                                                                                                                                                                                                        |
| Source of stimulus | Authenticated user                                                                                                                                                                                                                                                                                 |
| Stimulus           | The user loads a standard list, detail, account, or campaign-participation page                                                                                                                                                                                                                    |
| Environment        | Demo 2 local or continuous-integration test environment with seeded test data                                                                                                                                                                                                                      |
| Affected artefact  | Backend request handling and frontend page response                                                                                                                                                                                                                                                |
| Response           | The system responds quickly enough for normal interaction and avoids unnecessary repeated work                                                                                                                                                                                                     |
| Response measure   | At least 95% of standard authenticated Demo 2 requests in the tested local environment should complete within 2 seconds, excluding intentionally slow external provider calls                                                                                                                      |
| Rationale          | Slow responses reduce training completion and administrative efficiency                                                                                                                                                                                                                            |
| Priority           | Medium                                                                                                                                                                                                                                                                                             |
| Traceability       | [R2](functional-requirements.md#r2-trainee-campaign-access), [R10](functional-requirements.md#r10-manage-organisation-employees), [R15](functional-requirements.md#r15-manage-organisation-lifecycle-and-access), [R26](functional-requirements.md#r26-view-progress-results-and-training-reports) |

#### `QR-07` Maintainable Requirement and Use-Case Traceability

| Field              | Scenario                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality attribute  | Maintainability                                                                                                                                       |
| Source of stimulus | Developer, reviewer, or future maintainer                                                                                                             |
| Stimulus           | The product scope changes or a new feature is added                                                                                                   |
| Environment        | During Sprint planning, implementation, review, or Demo preparation                                                                                   |
| Affected artefact  | SRS, functional requirements, use cases, tests, and architecture documentation                                                                        |
| Response           | The SRS keeps stable identifiers, relative links, grouped use-case diagrams, and clear traceability between user stories, requirements, and use cases |
| Response measure   | A reviewer can identify the user-story and requirement context for each completed SRS use case without searching unrelated implementation files       |
| Rationale          | Stable documentation reduces confusion and helps implementation and testing stay aligned                                                              |
| Priority           | Medium                                                                                                                                                |
| Traceability       | [Users and User Stories](users-and-user-stories.md), [Functional Requirements](functional-requirements.md), [Use Cases](use-cases.md)                 |

#### `QR-08` Accountable Audit Review

| Field              | Scenario                                                                                                                                                                                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quality attribute  | Auditability and traceability                                                                                                                                                                                                                                                                                                              |
| Source of stimulus | Organisation Administrator or Platform Administrator                                                                                                                                                                                                                                                                                       |
| Stimulus           | The administrator reviews sensitive organisation, account, session, lifecycle, or platform actions                                                                                                                                                                                                                                         |
| Environment        | Normal audit review and incident investigation                                                                                                                                                                                                                                                                                             |
| Affected artefact  | Organisation and platform audit views                                                                                                                                                                                                                                                                                                      |
| Response           | The system presents safe audit summaries with actor, target, action, outcome, timestamp, and relevant non-sensitive context                                                                                                                                                                                                                |
| Response measure   | Audit review for supported sensitive actions includes enough information to identify what changed and when, while excluding passwords, raw tokens, token hashes, and unnecessary request content                                                                                                                                           |
| Rationale          | Administrators need accountability without exposing sensitive implementation or credential material                                                                                                                                                                                                                                        |
| Priority           | High                                                                                                                                                                                                                                                                                                                                       |
| Traceability       | [R13](functional-requirements.md#r13-configure-organisation-security-settings), [R14](functional-requirements.md#r14-manage-personal-account-and-security-settings), [R15](functional-requirements.md#r15-manage-organisation-lifecycle-and-access), [R27](functional-requirements.md#r27-review-audit-and-platform-oversight-information) |

#### `QR-09` Ethical Real Email Simulation Safeguards

| Field              | Scenario                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality attribute  | Safety and compliance                                                                                                                                                |
| Source of stimulus | Organisation Administrator                                                                                                                                           |
| Stimulus           | The administrator configures or launches a real email simulation campaign                                                                                            |
| Environment        | Future approved real email simulation operation                                                                                                                      |
| Affected artefact  | Real email simulation configuration and launch workflow                                                                                                              |
| Response           | The system requires approved sending scope, blocks unauthorised recipients or domains, and prevents collection of real passwords or unnecessary personal information |
| Response measure   | Launch readiness checks must block 100% of tested campaigns that lack approved scope, valid sending identity, or permitted recipient targeting                       |
| Rationale          | Real email simulations must be ethical, authorised, and controlled to avoid harm                                                                                     |
| Priority           | High                                                                                                                                                                 |
| Traceability       | [R28](functional-requirements.md#r28-configure-ethical-real-email-simulation-campaigns)                                                                              |

### 5.4 Quality Priorities

| Priority         | Quality attributes                                                          | Reason                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| High             | Security, privacy, accessibility, reliability, auditability, ethical safety | These qualities protect users, organisations, and the credibility of the training platform.                              |
| Medium           | Usability, performance, maintainability                                     | These qualities make the system effective to use and practical to extend during later sprints.                           |
| Lower for Demo 2 | Large-scale operational scalability                                         | Demo 2 is evaluated in a limited academic and local testing context, so large production-scale claims are not made here. |

### 5.5 Quality Traceability

| Quality requirement | Related SRS areas                                                       |
| ------------------- | ----------------------------------------------------------------------- |
| `QR-01`             | Authentication, account settings, role and permission management        |
| `QR-02`             | Tokenised actions, audit history, simulated interactions                |
| `QR-03`             | Trainee campaign access, simulated inboxes, training documents, quizzes |
| `QR-04`             | Public forms, authenticated forms, trainee reading and quiz flows       |
| `QR-05`             | Registration, verification, recovery, setup, invitations                |
| `QR-06`             | Common list, detail, account, and campaign-participation flows          |
| `QR-07`             | SRS structure, use cases, functional requirements                       |
| `QR-08`             | Organisation audit, platform audit, sensitive account actions           |
| `QR-09`             | Ethical real email simulation campaigns                                 |

### 5.6 References

- [Functional Requirements](functional-requirements.md)
- [Use Cases](use-cases.md)
- [Software Architectural Specification](../sas/README.md)
- [Demo 2 Testing Documentation](../testing.md)

---

Previous section: [Use Cases](use-cases.md)

Next section: [Domain Model](domain-model.md)
