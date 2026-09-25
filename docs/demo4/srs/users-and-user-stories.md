# Users and User Stories

## SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- **[2. Users and User Stories](#2-users-and-user-stories)** &larr; _You are here_
- [3. Functional Requirements](functional-requirements.md)
- [4. Use Cases](use-cases.md)
- [5. Quality Requirements](quality-requirements.md)
- [6. Changelog](changelog.md)

---

## 2. Users and User Stories

### 2.1 User Classes

| User class                   | Implemented scope                                                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Individual Trainee           | Registers independently, self-enrols in available platform Campaigns, and completes personal training.                                             |
| Organisation Trainee         | Joins one organisation through an invitation or setup flow and completes assigned Campaigns.                                                       |
| Organisation Administrator   | Performs organisation-scoped operations allowed by explicit permissions, including people, content, Campaign, assignment, and security management. |
| Platform Administrator       | Reviews organisation requests and manages supported platform-owned organisations, administrators, reusable content, and Campaigns.                 |
| Platform Super-Administrator | Performs the supported highest-authority platform-administrator management operations.                                                             |

### 2.2 Account and Onboarding Stories

- `US-01` As an individual trainee, I want to register and verify my email address so that I can access training.
- `US-02` As a registered user, I want to log in and log out securely so that only I can use my session.
- `US-03` As an account holder, I want to recover my password without exposing whether another account exists.
- `US-04` As an authenticated user, I want to update supported profile, email, password, and session settings so that my account remains current and secure.
- `US-05` As an organisation representative, I want to request registration so that a platform administrator can review my organisation.
- `US-06` As a platform administrator, I want to approve or reject organisation requests and manage the initial setup invitation so that access follows review.
- `US-07` As an invited user, I want to accept an eligible organisation or role-change invitation so that membership and authority change with my consent.

### 2.3 Trainee Learning Stories

- `US-08` As an individual trainee, I want to browse and self-enrol in available platform Campaigns so that I can choose training.
- `US-09` As an organisation trainee, I want to see Campaigns assigned to me so that I can complete required training.
- `US-10` As a trainee, I want Campaign items shown in their configured order and lock state so that I understand what to complete next.
- `US-11` As a trainee, I want to read Training Documents and complete them so that I can learn the presented material.
- `US-12` As a trainee, I want to inspect, classify, and safely interact with simulated emails so that I can practise recognising threats.
- `US-13` As a trainee, I want to answer single-choice and multiple-choice Quiz questions and review submitted results and feedback.
- `US-14` As a trainee, I want an in-progress Quiz attempt resumed and another attempt offered only when the configured limit permits it.
- `US-15` As a trainee, I want adaptive Campaign content to remain one occurrence while the system selects an appropriate available alternative for me.

### 2.4 Organisation Administration Stories

- `US-16` As an authorised organisation administrator, I want to manage trainees, invitations, administrators, permissions, and security settings within my organisation.
- `US-17` As an administrator with `MANAGE_CAMPAIGNS`, I want to create and manage reusable content so that Campaigns can reference reviewed eligible material.
- `US-18` As an administrator with `MANAGE_CAMPAIGNS`, I want to build Campaigns from ordered required items and groups so that training has the intended structure.
- `US-19` As an administrator with `MANAGE_CAMPAIGNS`, I want to configure Quiz occurrence attempts and scoring and adaptive EASY, MEDIUM, and HARD alternatives.
- `US-20` As an administrator with `MANAGE_CAMPAIGNS`, I want to copy Active content and Campaigns into fresh Drafts so that published history remains immutable.
- `US-21` As an administrator with `ASSIGN_CAMPAIGNS`, I want to assign active Campaigns directly to eligible trainees and remove an incorrect assignment.
- `US-22` As an authorised Campaign manager, I want to review scoped Campaign statistics so that I can understand the implemented participation and outcome measures.

### 2.5 Content Creator Stories

- `US-23` As an authorised creator, I want to draft, preview, activate, archive, restore, and copy Training Documents where those lifecycle actions are available.
- `US-24` As an authorised creator, I want to draft and publish Quizzes with questions, answer options, categories, difficulty, correctness, and feedback.
- `US-25` As an organisation creator, I want to manage reusable Organisation Emails and compose, approve, activate, and copy Simulated Inbox content through the supported lifecycle.
- `US-26` As an authorised creator, I want AI generation to populate a normal editable builder Draft so that I retain control over saving and activation.
- `US-27` As an adaptive-item editor, I want AI help for a supported missing difficulty variant using a selected related alternative as bounded context.

### 2.6 Campaign Proposal Stories

- `US-28` As an administrator with `MANAGE_CAMPAIGNS`, I want to request and edit a complete Campaign proposal before choosing which real eligible content enters the Campaign Builder.
- `US-29` As an administrator with `MANAGE_CAMPAIGNS`, I want a follow-up proposal for an eligible selected trainee using backend-computed category state.
- `US-30` As an administrator, I want AI suggestions to remain transient and require normal content review, save, activation, and Campaign save steps.

### 2.7 Platform Administration Stories

- `US-31` As an authorised platform administrator, I want to manage supported organisation lifecycle actions and onboarding timelines.
- `US-32` As a platform administrator, I want to manage platform-owned reusable content and Campaigns for individual trainee discovery and organisation reuse.
- `US-33` As an authorised platform administrator, I want to manage platform administrators within the implemented role constraints.

---

Previous section: [Introduction and Scope](introduction.md)

Next section: [Functional Requirements](functional-requirements.md)
