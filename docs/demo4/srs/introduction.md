# Introduction and Scope

This section introduces the purpose, audience, product context, scope, assumptions, terminology, and documentation boundaries for the Insightful Phish Demo 4 Software Requirements Specification.

## SRS Content

- [0. Home](README.md)
- **[1. Introduction and Scope](#1-introduction-and-scope)** &larr; _You are here_
  - [1.1 Purpose](#11-purpose)
  - [1.2 Intended Audience](#12-intended-audience)
  - [1.3 Product Context](#13-product-context)
  - [1.4 Product Scope](#14-product-scope)
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

This SRS defines the implemented Demo 4 requirements for Insightful Phish, a web-based cybersecurity awareness and training platform. It describes the externally visible behaviour expected from account access, organisation administration, reusable-content authoring, Campaign management, trainee learning, adaptive delivery, and AI-assisted drafting.

The SRS provides a shared baseline for implementation review, use-case validation, architecture alignment, user guidance, and non-functional verification. Statements in this document describe current behaviour rather than aspirational issue scope.

### 1.2 Intended Audience

This document is intended for:

- Insightful Phish developers and maintainers;
- Southern Cross Solutions as the project client;
- COS301 lecturers, reviewers, and assessors;
- product stakeholders validating Demo 4 scope;
- contributors maintaining the linked architecture, manuals, and verification material.

Readers looking for implementation structure should continue to the [Demo 4 SAS](../sas/README.md). Trainee-facing instructions are in the [Trainee User Manual](../user-manual.md). Executable NFR mapping and release evidence are owned by issue #574 and are not duplicated in this SRS.

### 1.3 Product Context

Insightful Phish supports individual trainees, organisation trainees, organisation administrators, platform administrators, and the protected platform super-administrator authority. Role, permission, account, membership, organisation, and resource-scope checks separate these contexts. A user's account capabilities may be additionally restricted by organisation policy or lifecycle state.

Campaigns are the main ordering and assignment container for learning. They reference reusable Training Documents, Quizzes, and Simulated Inboxes rather than embedding complete content copies. Campaign items can be individual components, adaptive occurrences, or groups with direct component/adaptive children.

Reusable content follows type-specific authoring lifecycles. Administrators review and explicitly transition content before it becomes eligible for Campaign selection. Trainee attempts, progress, simulated interactions, and adaptive resolutions remain tied to the relevant Campaign assignment and occurrence.

### 1.4 Product Scope

Demo 4 includes the following implemented capability areas.

#### Account and organisation access

- registration, email verification, login, logout, password recovery, invitations, and initial setup;
- personal profile, email, password, and session management;
- organisation registration review and lifecycle control;
- organisation trainee, administrator, permission, and security-setting management;
- platform-administrator management under the implemented authority constraints.

#### Reusable content

- Training Document Draft creation, Markdown preview, activation, archive/restore, and copy where supported;
- Quiz Draft creation with single-choice and multiple-choice questions, publication, and copy;
- organisation reusable Email creation and activation;
- Simulated Inbox composition from controlled messages and its approval/activation lifecycle;
- difficulty and category metadata used by Campaign eligibility and adaptive alternatives.

#### Campaigns and trainee learning

- platform and organisation Campaign Draft creation and validated lifecycle transitions;
- ordered Campaign items, required state, groups, and Quiz occurrence settings;
- Active-to-Draft copy with fresh structural identities;
- direct assignment to eligible organisation trainees and self-enrolment in available platform Campaigns;
- Training Document participation, repeated Quiz attempts, Quiz results, and Simulated Inbox classification/link interactions;
- scoped Campaign statistics and insights.

#### Adaptive and AI-assisted workflows

- adaptive Campaign occurrences with one fixed content type and exact `EASY`, `MEDIUM`, and `HARD` alternatives;
- deterministic backend difficulty selection from accepted evidence and persisted resolution per assignment and item;
- AI-generated editable Training Document, Quiz, and Organisation Email Draft data in normal builders;
- supported missing-variant generation using bounded source metadata;
- transient complete and follow-up Campaign proposals reviewed by an administrator.

AI output does not bypass validation or lifecycle controls. It cannot save or activate content, publish a Quiz, approve a Simulation, save or activate a Campaign, assign a trainee, send real email, or choose adaptive difficulty.

### 1.5 Scope Boundaries

Demo 4 does not include trainee tags, Campaign progress reset, broad report export, a broad audit-review or platform-oversight interface, or Live Quiz. Organisation Campaign assignment selects eligible trainees directly.

The repository contains limited phishing-portal and real-email support artifacts, but it does not provide a complete administrator workflow for launching, scheduling, pausing, sending, or monitoring real-email phishing Campaigns. Those artifacts are not represented as a delivered Demo 4 flow.

An AI-generated Organisation Email is reusable Draft content, not a Campaign-eligible Simulated Inbox. The normal parent Simulation and Simulated Inbox lifecycle remains required.

### 1.6 Assumptions and Dependencies

- **Browser and network:** Users have a supported modern browser and network access to the deployed application.
- **Email delivery:** Users have access to a valid email inbox for verification, recovery, invitations, setup, and relevant notifications. Delivery depends on configured backend email infrastructure.
- **Platform review:** Platform administrators review organisation registration requests and govern supported organisation lifecycle actions.
- **Organisation responsibility:** Organisations manage their own trainees, administrators, content, Campaigns, assignments, and security settings within granted permissions.
- **Content review:** Administrators review manually authored and AI-generated content before explicit save and lifecycle transitions.
- **Deployment:** Environment owners provide infrastructure, secrets, DNS, tunnel, registry, and deployment configuration. Issue #573 identifies the release candidate.
- **Quality verification:** Issue #574 maps the final quality requirements to executable checks and recorded evidence.
- **Privacy policy:** This SRS records product boundaries but does not replace the standalone Privacy Policy owned by issue #571.

### 1.7 Definitions, Acronyms, and Abbreviations

| Term                           | Definition                                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Trainee**                    | A user who completes cybersecurity awareness training through Campaigns.                                       |
| **Individual trainee**         | A trainee who registers independently and can self-enrol in available platform Campaigns.                      |
| **Organisation trainee**       | A trainee with an active organisation membership who can receive organisation Campaign assignments.            |
| **Organisation administrator** | An organisation-linked user whose available management actions depend on explicit permissions.                 |
| **Platform administrator**     | A platform-level administrator who manages supported platform resources and organisation lifecycle operations. |
| **Campaign**                   | An ordered training container that references eligible reusable content.                                       |
| **Campaign occurrence**        | One configured Campaign item in an assignment context, including its required and type-specific settings.      |
| **Reusable content**           | A Training Document, Quiz, Organisation Email, or Simulated Inbox managed through its normal lifecycle.        |
| **Adaptive item**              | One Campaign occurrence with a fixed component type and exact `EASY`, `MEDIUM`, and `HARD` alternatives.       |
| **Adaptive resolution**        | The persisted selected alternative for one Campaign assignment and Campaign item.                              |
| **Draft**                      | Editable content or Campaign state that is not yet eligible for trainee delivery.                              |
| **Proposal**                   | Transient AI-generated Campaign or content guidance requiring administrator review.                            |
| **`RBAC`**                     | Role-Based Access Control: restricting operations according to roles and permissions.                          |
| **`SRS`**                      | Software Requirements Specification.                                                                           |
| **`SAS`**                      | Software Architecture Specification.                                                                           |
| **`TUCBW`**                    | This use case begins with: the initial state and preconditions for a use case.                                 |
| **`TUCEW`**                    | This use case ends with: the final state and postconditions for a use case.                                    |

---

Previous section: [SRS Home](README.md)

Next section: [Users and User Stories](users-and-user-stories.md)
