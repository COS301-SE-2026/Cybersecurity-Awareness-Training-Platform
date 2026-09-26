# Users and User Stories

This section identifies the users of Insightful Phish and records their goals in the established Demo 3 story format. Stories describe implemented user value; permissions and detailed acceptance behaviour are defined in the linked requirements and use cases.

## SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- **[2. Users and User Stories](#2-users-and-user-stories)** &larr; _You are here_
  - [2.1 Product Perspective](#21-product-perspective)
  - [2.2 User Classes and Characteristics](#22-user-classes-and-characteristics)
  - [2.3 User Stories](#23-user-stories)
- [3. Functional Requirements](functional-requirements.md)
- [4. Use Cases](use-cases.md)
- [5. Quality Requirements](quality-requirements.md)
- [6. Domain Model](domain-model.md)
- [7. Changelog](changelog.md)

---

## 2. Users and User Stories

### 2.1 Product Perspective

Insightful Phish is a multi-tenant cybersecurity awareness platform. Individual trainees use platform-owned Campaigns independently. Organisation trainees receive training through an organisation membership and assignments. Organisation administrators manage only the people and resources allowed by their permissions and organisation scope. Platform administrators govern platform resources and supported organisation lifecycle operations.

The same reusable content can participate in different Campaign occurrences without making trainee progress global. Content authorship, Campaign composition, assignment, and trainee participation remain separate responsibilities.

### 2.2 User Classes and Characteristics

#### Individual Trainee

An individual trainee registers directly, verifies an email address, discovers available platform Campaigns, self-enrols, and completes training. The trainee can manage supported personal account and session settings but has no organisation-administration authority.

#### Organisation Trainee

An organisation trainee joins through an invitation or setup flow and completes Campaigns assigned by that organisation. Access depends on active account, membership, profile, and organisation state.

#### Organisation Administrator

An organisation administrator manages permitted organisation-scoped functions. Permissions independently control people management, Campaign management, assignment, and other protected actions. Administrators cannot cross organisation boundaries or use Campaign permissions as general trainee-management access.

#### Platform Administrator

A platform administrator reviews organisation registration requests, manages supported organisation lifecycle actions, and manages platform-owned reusable content and Campaigns according to platform authority.

#### Platform Super-Administrator

The platform super-administrator performs the highest-authority supported platform-administrator operations, including protected administrator-management and role-transfer actions.

### 2.3 User Stories

#### 1. Organisation Registration and Setup

**1.1** As an organisation representative, I want to submit an organisation registration request so that the platform team can review access.

**1.2** As a platform administrator, I want to review, approve, or reject registration requests so that only reviewed organisations enter setup.

**1.3** As an approved initial organisation administrator, I want to complete setup from a valid single-use link so that I can establish the organisation's first administrative account.

**1.4** As a platform administrator, I want to review onboarding progress and resend an eligible setup invitation so that expired or failed delivery does not permanently block setup.

#### 2. Authentication and Account Management

**2.1** As an individual trainee, I want to register and verify my email address so that I can access training.

**2.2** As a registered user, I want to log in and log out securely so that only I can use my authenticated session.

**2.3** As an account holder, I want to recover a forgotten password without exposing whether another account exists.

**2.4** As an invited user, I want invalid, expired, superseded, or used links to fail safely and offer an appropriate recovery path.

**2.5** As an authenticated user, I want to update supported personal information, email, and password settings so that my account remains current and secure.

**2.6** As an authenticated user, I want to inspect and revoke supported sessions so that I can control account access.

#### 3. Individual Trainee Access

**3.1** As an individual trainee, I want to browse available platform Campaigns so that I can choose relevant training.

**3.2** As an individual trainee, I want to self-enrol once in an available Campaign so that it appears in my Campaign list without duplicate enrolments.

**3.3** As an individual trainee, I want my Campaign progress and results scoped to my own enrolment so that other users cannot access them.

#### 4. Organisation Trainee Membership

**4.1** As an invited trainee, I want to accept an eligible organisation invitation so that I can join the correct organisation.

**4.2** As an organisation trainee, I want to see Campaigns assigned to me so that I can complete required training.

**4.3** As an organisation trainee, I want my access to follow my account, profile, membership, and organisation state so that inactive access is not treated as eligible.

#### 5. Training Campaign Participation

**5.1** As a trainee, I want Campaign items shown in configured order with required, completion, and lock states so that I know what to complete next.

**5.2** As a trainee, I want to read and complete Training Documents so that I can learn the presented material.

**5.3** As a trainee, I want to inspect, classify, and safely interact with simulated emails so that I can practise recognising threats.

**5.4** As a trainee, I want single-choice questions to accept one answer and multiple-choice questions to accept multiple answers where required.

**5.5** As a trainee, I want to submit a Quiz and review its result and educational feedback without seeing protected answers before submission.

**5.6** As a trainee, I want an in-progress Quiz attempt resumed and another attempt offered only when the Campaign occurrence permits it.

**5.7** As a trainee, I want the configured best, latest, or average scoring rule applied consistently across my submitted attempts.

**5.8** As a trainee, I want an adaptive Campaign occurrence to remain stable after the system selects an eligible difficulty alternative for my assignment.

#### 6. Organisation Administration

**6.1** As an authorised organisation administrator, I want to invite and manage trainees within my organisation.

**6.2** As an authorised organisation administrator, I want to invite administrators and manage supported roles and permissions without crossing organisation boundaries.

**6.3** As an authorised organisation administrator, I want to configure supported organisation security settings so that organisation sessions follow approved policy.

**6.4** As an authorised content creator, I want to draft, preview, activate, archive, restore, and copy Training Documents where those actions are supported.

**6.5** As an authorised content creator, I want to draft and publish Quizzes with questions, answer options, categories, difficulty, correctness, and feedback.

**6.6** As an organisation content creator, I want to manage reusable Emails and compose Simulated Inboxes through their supported lifecycle.

**6.7** As a Campaign manager, I want to build a Campaign from eligible reusable content, groups, ordering, and required state.

**6.8** As a Campaign manager, I want to configure Quiz attempt/scoring settings and adaptive `EASY`, `MEDIUM`, and `HARD` alternatives for one occurrence.

**6.9** As a Campaign manager, I want to copy an Active Campaign to a fresh Draft so that published history remains immutable while I prepare changes.

**6.10** As an authorised assignment administrator, I want to assign an active organisation Campaign directly to eligible selected trainees.

**6.11** As an authorised assignment administrator, I want to permanently unassign an incorrect selected assignment through a confirmed operation.

**6.12** As an authorised Campaign manager, I want to review scoped Campaign statistics so that I can understand implemented participation and outcomes.

**6.13** As an authorised creator, I want AI generation to populate a normal editable builder Draft so that I retain control over review, saving, and activation.

**6.14** As an adaptive-item editor, I want AI help for a supported missing difficulty using a selected same-type, same-category alternative as bounded source context.

**6.15** As a Campaign manager, I want to request and edit a complete Campaign proposal before choosing which real eligible content enters the Campaign Builder.

**6.16** As a Campaign manager, I want a follow-up proposal for an eligible selected trainee using backend-computed category state.

**6.17** As an administrator, I want AI suggestions to remain transient so that normal content and Campaign lifecycle actions stay under human control.

#### 7. Platform Administration

**7.1** As a platform administrator, I want to review organisation requests and manage supported onboarding actions.

**7.2** As a platform administrator, I want to suspend or reactivate organisation access so that platform-level access can be governed safely.

**7.3** As a platform administrator, I want to manage platform-owned reusable content and Campaigns so that individual trainees can discover training and organisations can reuse eligible platform content.

**7.4** As a platform administrator, I want to copy Active content and Campaigns into fresh Drafts so that immutable published history is preserved.

#### 8. Platform Super-Administrator

**8.1** As a platform super-administrator, I want to view and invite platform administrators so that platform responsibilities can be shared.

**8.2** As a platform super-administrator, I want to revoke or demote platform administrators under the implemented authority constraints.

**8.3** As a platform super-administrator, I want to transfer the super-administrator role to another eligible active platform administrator so that exactly one accountable super-administrator remains.

---

Previous section: [Introduction and Scope](introduction.md)

Next section: [Functional Requirements](functional-requirements.md)
