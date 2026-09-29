# Introduction and Scope

This section introduces the purpose, audience, product context, scope, assumptions, terminology, and documentation boundaries for the Insightful Phish Demo 4 Software Requirements Specification.

## SRS Content

- [0. Home](README.md)
- **[1. Introduction and Scope](#1-introduction-and-scope)** &larr; _You are here_
  - [1.1 Purpose](#11-purpose)
  - [1.2 Intended Audience](#12-intended-audience)
  - [1.3 Product Context](#13-product-context)
  - [1.4 Product Scope](#14-product-scope)
    - [Demo 4 Wow Factors](#demo-4-wow-factors)
      - [Wow Factor 1: Real-Email Phishing Simulations](#wow-factor-1-real-email-phishing-simulations)
      - [Wow Factor 2: Portals and Educational Feedback](#wow-factor-2-portals-and-educational-feedback)
      - [Wow Factor 3: Adaptive Campaign Items, Risk Engine, and AI Content Generation](#wow-factor-3-adaptive-campaign-items-risk-engine-and-ai-content-generation)
  - [1.5 Scope Boundaries](#15-scope-boundaries)
  - [1.6 Assumptions and Dependencies](#16-assumptions-and-dependencies)
  - [1.7 Definitions, Acronyms, and Abbreviations](#17-definitions-acronyms-and-abbreviations)
- [2. Users and User Stories](users-and-user-stories.md)
- [3. Functional Requirements](functional-requirements.md)
- [4. Use Cases](use-cases.md)
- [5. Quality Requirements](quality-requirements.md)
- [6. Domain Model](domain-model.md)
- [7. Changelog](changelog.md)

---

## 1. Introduction and Scope

### 1.1 Purpose

This SRS defines the implemented Demo 4 requirements for Insightful Phish, a web-based cybersecurity awareness and training platform. It describes the externally visible behaviour expected from account access, organisation administration, reusable-content authoring, Campaign management, trainee learning, adaptive delivery, AI-assisted drafting, organisation context, real-email phishing simulations, managed portals, and Campaign Insights.

The SRS provides a shared baseline for implementation review, use-case validation, architecture alignment, user guidance, and non-functional verification. Statements in this document describe current behaviour rather than aspirational issue scope.

### 1.2 Intended Audience

This document is intended for:

- Insightful Phish developers and maintainers.
- Southern Cross Solutions as the project client.
- COS301 lecturers, reviewers, and assessors.
- Product stakeholders validating Demo 4 scope.
- Contributors maintaining the linked architecture, manuals, and verification material.

Readers looking for implementation structure should continue to the [Demo 4 SAS](../sas/README.md). Trainee-facing instructions are in the [Trainee User Manual](../user-manual.md). Quality expectations remain in the [Quality Requirements](quality-requirements.md).

### 1.3 Product Context

Insightful Phish supports individual trainees, organisation trainees, organisation administrators, platform administrators, and the protected platform super-administrator authority. Role, permission, account, membership, organisation, and resource-scope checks separate these contexts. A user's account capabilities may be additionally restricted by organisation policy or lifecycle state.

Campaigns are the main ordering and assignment container for learning. They reference reusable Training Documents, Quizzes, and Simulated Inboxes rather than embedding complete content copies. Campaign items can be individual components, adaptive occurrences, or groups with direct component/adaptive children.

Reusable content follows type-specific authoring lifecycles. Administrators review and explicitly transition content before it becomes eligible for Campaign selection. Trainee attempts, progress, simulated interactions, and adaptive resolutions remain tied to the relevant Campaign assignment and occurrence.

Organisation administrators can maintain approved organisation context for AI use, configure organisation SMTP profiles, and run real-email phishing simulations for Active organisation Campaigns. Each simulation uses copied Organisation Email snapshots, eligible Campaign recipients, configured delivery windows, and recorded delivery and interaction outcomes. Controlled links can open managed educational portals for Simulated Inbox and real-email exercises.

### 1.4 Product Scope

Demo 4 includes the following implemented capability areas.

#### Account and organisation access

- Registration, email verification, login, logout, password recovery, invitations, and initial setup.
- Personal profile, email, password, and session management.
- Organisation registration review and lifecycle control.
- Organisation trainee, administrator, permission, and security-setting management.
- Platform-administrator management under the implemented authority constraints.

#### Reusable content

- Training Document Draft creation, Markdown preview, activation, archive/restore, and copy where supported.
- Quiz Draft creation with single-choice and multiple-choice questions, publication, and copy.
- Organisation reusable Email creation, activation, copy, and optional fixed managed-portal template.
- Simulated Inbox composition from controlled messages and its approval/activation lifecycle.
- Difficulty and category metadata used by Campaign eligibility and adaptive alternatives.

#### Campaigns and trainee learning

- Platform and organisation Campaign Draft creation and validated lifecycle transitions.
- Ordered Campaign items, required state, groups, and Quiz occurrence settings.
- Active-to-Draft copy with fresh structural identities.
- Direct assignment to eligible organisation trainees and self-enrolment in available platform Campaigns.
- Training Document participation, repeated Quiz attempts, Quiz results, and Simulated Inbox classification/link interactions.
- Organisation-scoped Campaign Insights covering participation, results, adaptive resolutions, real-email delivery, link activity, and managed-portal interactions.
- Real-email phishing simulation Draft configuration, scheduling, launch, monitoring, Refresh, and Stop.
- Managed educational portals that record supported interactions without accepting or storing entered credential values.

#### Adaptive and AI-assisted workflows

- Adaptive Campaign occurrences with one fixed content type and exact `EASY`, `MEDIUM`, and `HARD` alternatives.
- Deterministic backend difficulty selection from accepted evidence and persisted resolution per assignment and item.
- AI-generated editable Training Document, Quiz, and Organisation Email Draft data in normal builders.
- Supported missing-variant generation using bounded source metadata.
- Transient complete and follow-up Campaign proposals reviewed by an administrator.

AI output does not bypass validation or lifecycle controls. It cannot save or activate content, publish a Quiz, approve a Simulation, save or activate a Campaign, assign a trainee, send real email, or choose adaptive difficulty.

#### Demo 4 Wow Factors

The Demo 4 wow factors combine realistic phishing practice, immediate education, personalised training, and human-controlled AI. They extend the existing Campaign workflow instead of operating as isolated demonstrations.

##### Wow Factor 1: Real-Email Phishing Simulations

Most phishing training keeps every message inside a simulated inbox. Insightful Phish can deliver controlled phishing simulations to real email inboxes, which makes the exercise closer to the messages trainees encounter during normal work. Organisation Administrators choose approved email content and recipients, configure when messages may be sent, and schedule the simulation within an Active organisation Campaign.

Administrators can launch the simulation, monitor its progress, Refresh the latest outcomes, and Stop it when necessary. Insightful Phish records which messages were planned, accepted for delivery, failed, cancelled, or interacted with. This creates a complete workflow from Campaign preparation to real delivery and measured trainee response while keeping the exercise controlled by the organisation.

##### Wow Factor 2: Portals and Educational Feedback

A simulated phishing link can open a managed educational portal instead of ending at a static page or sending the trainee to an unsafe destination. The portal creates a realistic interaction where the trainee can notice page-level warning signs and attempt a simulated response. Insightful Phish records supported actions such as visits, field interaction, and simulated credential submission attempts without accepting or storing the values entered by the trainee.

After a simulated credential submission attempt, the portal immediately explains the warning signs that were missed and provides a training path where one is available. The same factual interaction outcomes appear in Campaign Insights for authorised administrators. This turns a phishing mistake into a safe teaching moment and connects realistic behaviour, immediate feedback, and organisation reporting in one workflow.

##### Wow Factor 3: Adaptive Campaign Items, Risk Engine, and AI Content Generation

Traditional awareness Campaigns give every trainee the same material regardless of their current understanding. Insightful Phish Campaigns can contain adaptive items with `EASY`, `MEDIUM`, and `HARD` alternatives. The risk engine uses accepted Quiz and Simulated Inbox evidence to choose a suitable difficulty for each trainee, then keeps that decision stable for the assignment. Trainees therefore receive training that responds to their demonstrated strengths and weaknesses without random selection or AI-controlled scoring.

AI helps administrators prepare editable Training Documents, Quizzes, Organisation Emails, missing adaptive variants, and complete or follow-up Campaign proposals. Follow-up proposals can use the category state calculated by the risk engine together with approved organisation context. Every result remains under human control because an administrator reviews it and decides what to save, activate, include, or assign. This combines personalised learning and faster content preparation while preserving the normal review and approval process.

### 1.5 Scope Boundaries

Demo 4 does not include trainee tags, Campaign progress reset, broad report export, a broad audit-review or platform-oversight interface, or Live Quiz. Organisation Campaign assignment selects eligible trainees directly.

Real-email phishing simulations support `DRAFT`, `SCHEDULED`, `RUNNING`, `COMPLETED`, and `STOPPED` states. Authorised administrators can stop a scheduled or running simulation. Pause and resume operations are not supported.

Managed portals use fixed templates and controlled system links. They record supported interaction types and show an educational reveal after a simulated credential submission attempt. Entered identifier and credential values are not accepted or stored.

An AI-generated Organisation Email is reusable Draft content. It does not become a Campaign item until it is included in an approved Simulation or Simulated Inbox through the normal lifecycle.

### 1.6 Assumptions and Dependencies

- **Browser and network:** Users have a supported modern browser and network access to the deployed application.
- **Email delivery:** Account email and real-email simulations depend on configured delivery infrastructure. Organisation SMTP profiles must pass the required validation before use.
- **Public simulation origins:** Portal-enabled and tracked real-email links depend on a configured public simulation origin.
- **Platform review:** Platform administrators review organisation registration requests and govern supported organisation lifecycle actions.
- **Organisation responsibility:** Organisations manage their own trainees, administrators, context, SMTP profiles, content, Campaigns, assignments, simulations, and security settings within granted permissions.
- **Content review:** Administrators review manually authored and AI-generated content before explicit save and lifecycle transitions.
- **Background processing:** Scheduled simulations depend on the simulation worker and email dispatcher running in the backend process.
- **Deployment:** Environment owners provide the required infrastructure, secrets, DNS, tunnel, registry, and deployment configuration.
- **Quality verification:** The final quality requirements remain defined in the [Quality Requirements](quality-requirements.md).

### 1.7 Definitions, Acronyms, and Abbreviations

| Term                           | Definition                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Trainee**                    | A user who completes cybersecurity awareness training through Campaigns.                                                                 |
| **Individual trainee**         | A trainee who registers independently and can self-enrol in available platform Campaigns.                                                |
| **Organisation trainee**       | A trainee with an active organisation membership who can receive organisation Campaign assignments.                                      |
| **Organisation administrator** | An organisation-linked user whose available management actions depend on explicit permissions.                                           |
| **Platform administrator**     | A platform-level administrator who manages supported platform resources and organisation lifecycle operations.                           |
| **Campaign**                   | An ordered training container that references eligible reusable content.                                                                 |
| **Campaign occurrence**        | One configured Campaign item in an assignment context, including its required and type-specific settings.                                |
| **Reusable content**           | A Training Document, Quiz, Organisation Email, or Simulated Inbox managed through its normal lifecycle.                                  |
| **Organisation context**       | Organisation-controlled reference material that an authorised administrator may make available to supported AI workflows.                |
| **SMTP profile**               | An organisation-scoped email provider configuration used to deliver real-email phishing simulations.                                     |
| **Phishing simulation**        | A scheduled real-email exercise attached to an organisation Campaign.                                                                    |
| **Managed portal**             | A controlled educational page opened through a system-managed simulated link.                                                            |
| **Campaign Insights**          | Organisation-scoped Campaign participation, result, adaptive, delivery, link, and portal measures.                                       |
| **Adaptive item**              | One Campaign occurrence with a fixed component type and exact `EASY`, `MEDIUM`, and `HARD` alternatives.                                 |
| **Adaptive resolution**        | The persisted selected alternative for one Campaign assignment and Campaign item.                                                        |
| **Risk engine**                | Backend calculation that derives category state from accepted training evidence for adaptive resolution and follow-up proposal guidance. |
| **Draft**                      | Editable content or Campaign state that is not yet eligible for trainee delivery.                                                        |
| **Proposal**                   | Transient AI-generated Campaign or content guidance requiring administrator review.                                                      |
| **`RBAC`**                     | Role-Based Access Control: restricting operations according to roles and permissions.                                                    |
| **`SRS`**                      | Software Requirements Specification.                                                                                                     |
| **`SAS`**                      | Software Architecture Specification.                                                                                                     |
| **`TUCBW`**                    | This use case begins with: the initial state and preconditions for a use case.                                                           |
| **`TUCEW`**                    | This use case ends with: the final state and postconditions for a use case.                                                              |

---

Previous section: [SRS Home](README.md)

Next section: [Users and User Stories](users-and-user-stories.md)
