# Changelog

This changelog summarises the major requirement and documentation changes that shape the Demo 2 Software Requirements Specification. It is not a raw Git history; it records the meaningful SRS-level changes that affect scope, traceability, and stakeholder understanding.

## SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- [2. Users and User Stories](users-and-user-stories.md)
- [3. Functional Requirements](functional-requirements.md)
- [4. Use Cases](use-cases.md)
- [5. Quality Requirements](quality-requirements.md)
- [6. Domain Model](domain-model.md)
- **[7. Changelog](#7-changelog)** &larr; _You are here_
  - [7.1 Purpose](#71-purpose)
  - [7.2 Revision Summary](#72-revision-summary)
  - [7.3 Demo 1 Baseline](#73-demo-1-baseline)
  - [7.4 Demo 2 Updates](#74-demo-2-updates)
  - [7.5 Additions](#75-additions)
  - [7.6 Updates](#76-updates)
  - [7.7 Restructures](#77-restructures)
  - [7.8 Removals](#78-removals)
  - [7.9 References](#79-references)

---

## 7. Changelog

### 7.1 Purpose

The purpose of this changelog is to explain how the SRS has evolved from the Demo 1 trainee-facing baseline into the Demo 2 requirements package. It helps reviewers understand which areas were preserved, expanded, reorganised, or clarified.

### 7.2 Revision Summary

| Revision period           | Area updated                      | Summary                                                                                                                                                                           |
| ------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Demo 1 baseline           | Trainee campaign participation    | Established the first trainee-facing requirements and use cases for simulated inboxes, training documents, and quizzes.                                                           |
| Demo 2 preparation        | SRS structure                     | Split the requirements into focused SRS files for introduction, users, functional requirements, use cases, quality requirements, domain model, and changelog.                     |
| Demo 2 content completion | Authentication and account access | Added detailed support use cases for registration, email verification, login, logout, account recovery, and resend flows.                                                         |
| Demo 2 content completion | Organisation and platform scope   | Extended functional requirements and high-level use cases for organisation lifecycle, administration, campaign management, reporting, audit, and planned simulation capabilities. |
| Demo 2 finalisation       | Quality and traceability          | Added measurable quality scenarios and aligned navigation between completed SRS sections.                                                                                         |

### 7.3 Demo 1 Baseline

Demo 1 focused on a small trainee-facing training slice:

- viewing simulated emails in a controlled simulated inbox;
- viewing a training document;
- completing a quiz and viewing results;
- using seeded training content rather than administrator-authored campaign content;
- keeping real email delivery, credential collection, reporting dashboards, and AI-assisted content generation outside the Demo 1 scope.

The Demo 1 change history shows that the SRS was refined through updates to the initial structure, trainee-facing use cases, validation and feedback expectations, use-case diagrams, and future-scope clarification. Those useful baseline ideas were preserved, but the Demo 2 SRS now expresses them through the split SRS structure and updated requirement numbering.

### 7.4 Demo 2 Updates

Demo 2 expands the SRS from the initial trainee-facing baseline to a broader platform scope:

- authentication and account access are now described as supporting use cases;
- organisation registration, platform review, and initial administrator setup are included;
- organisation invitations and role changes are included;
- organisation trainee, administrator, permission, and security-setting management are included;
- personal account and session security settings are included;
- future-facing campaign, reporting, audit, AI-assisted drafting, and ethical real email simulation capabilities are represented at a high level.

### 7.5 Additions

- Added a final SRS order covering introduction, users, functional requirements, use cases, quality requirements, domain model, and changelog.
- Added functional requirement groups `R15` to `R28` for remaining accepted use-case areas.
- Added detailed authentication and account access use cases `AUTH-01` to `AUTH-06`.
- Added high-level planned product use cases `UC-13` to `UC-35`.
- Added measurable quality scenarios for security, privacy, usability, accessibility, reliability, performance, maintainability, auditability, and ethical simulation safety.

### 7.6 Updates

- Updated terminology to use consistent Insightful Phish roles, including Individual Trainee, Organisation Trainee, Organisation Administrator, Platform Administrator, and Platform Super-Administrator.
- Updated use-case traceability so new use cases refer to the relevant functional requirement groups and user-story areas.
- Updated the domain model description to reflect Demo 2 authentication, organisation onboarding, account security, campaign, reporting, and audit concepts.
- Updated navigation so readers can move through the split SRS in the required order.

### 7.7 Restructures

- Restructured the SRS away from one large monolithic document into focused Markdown files.
- Kept grouped use-case diagrams in one use-case diagram section rather than creating individual diagrams for every planned use case.
- Kept future-facing use cases high level so that the SRS communicates scope without becoming an implementation tracker.

### 7.8 Removals

- Removed unfinished placeholder wording from completed Demo 2 SRS sections.
- Removed stale unfinished monolithic SRS content from the canonical reading path by replacing it with a navigation page to the split SRS sections.
- Removed reliance on raw revision history as the changelog format.

### 7.9 References

- [Demo 1 Software Requirements Specification](../../demo1/SRS.md)
- [Demo 2 Introduction and Scope](introduction.md)
- [Demo 2 Functional Requirements](functional-requirements.md)
- [Demo 2 Use Cases](use-cases.md)
- [Demo 2 Domain Model](domain-model.md)

---

Previous section: [Domain Model](domain-model.md)
