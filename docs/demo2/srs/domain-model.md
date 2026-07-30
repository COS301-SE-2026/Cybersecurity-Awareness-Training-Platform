# Domain Model

The domain model describes the major conceptual entities used by Insightful Phish at requirement level. It is a shared language for the SRS and should not be read as a database schema or migration design.

## SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- [2. Users and User Stories](users-and-user-stories.md)
- [3. Functional Requirements](functional-requirements.md)
- [4. Use Cases](use-cases.md)
- [5. Quality Requirements](quality-requirements.md)
- **[6. Domain Model](#6-domain-model)** &larr; _You are here_
  - [6.1 Purpose](#61-purpose)
  - [6.2 Domain Diagram](#62-domain-diagram)
  - [6.3 Core Account and Access Concepts](#63-core-account-and-access-concepts)
  - [6.4 Organisation and Administration Concepts](#64-organisation-and-administration-concepts)
  - [6.5 Campaign and Training Concepts](#65-campaign-and-training-concepts)
  - [6.6 Reporting, Audit, and Safety Concepts](#66-reporting-audit-and-safety-concepts)
  - [6.7 Domain Relationships and Limits](#67-domain-relationships-and-limits)
- [7. Changelog](changelog.md)

---

## 6. Domain Model

### 6.1 Purpose

The domain model provides a conceptual view of the entities needed to support the SRS use cases, functional requirements, and quality requirements. It keeps business concepts understandable for stakeholders and future maintainers without tying the SRS to a specific persistence implementation.

### 6.2 Domain Diagram

The Demo 2 domain model source can be found here: [Demo 2 domain model](../diagrams/srs/domain-model.drawio).

### 6.3 Core Account and Access Concepts

- `User` represents a platform account with identity, authentication status, verified email state, and account-level security information.
- `UserSecurityPreferences` represents a user's preferred session and account-security settings where the platform and organisation policy allow personal choice.
- `AuthSession` represents an authenticated browser or device session.
- `RefreshToken` represents the renewable credential associated with an authenticated session.
- `ActionToken` represents a secure tokenised action such as email verification, password reset, initial setup, invitation acceptance, or email-change verification.
- `EmailChangeRequest` represents the lifecycle of a requested account email-address change.
- `IndividualTrainee` represents a trainee account that is not linked to an organisation.
- `OrganisationTrainee` represents a trainee who belongs to an organisation.
- `OrganisationAdministrator` represents an organisation-linked administrator with assigned permissions.
- `PlatformAdministrator` represents an Insightful Phish administrator who can perform platform-level actions.

### 6.4 Organisation and Administration Concepts

- `OrganisationRegistrationRequest` represents a public request for an organisation to be reviewed and onboarded.
- `Organisation` represents an approved organisation using the platform.
- `OrganisationInvitation` represents an invitation for a user to join an organisation or accept a role change.
- `OrganisationSecuritySettings` represents organisation-level policies that affect session behaviour and sensitive account actions.
- `OrganisationContext` represents approved organisation-specific context such as terminology, domains, and branding values.
- `OrganisationPermission` represents the administrative capabilities assigned to organisation administrators.
- `TraineeTag` represents a grouping label for organisation trainees.
- `TraineeTagMembership` links eligible trainees to organisation tags.

### 6.5 Campaign and Training Concepts

- `Campaign` represents the main container for a training programme. It can be a premade campaign or an organisation campaign.
- `CampaignAssignment` links a campaign to a trainee or trainee scope and tracks availability, progress, due dates, and completion.
- `CampaignItem` represents an ordered activity in a campaign.
- `TrainingDocument` represents reusable readable training content.
- `Quiz` represents a reusable assessment with questions, answer options, marking rules, and feedback.
- `QuizAttempt` represents a trainee's attempt at a quiz.
- `QuizResult` represents the outcome and permitted feedback for a submitted quiz attempt.
- `SimulatedInbox` represents a controlled inbox used for training.
- `SimulatedEmail` represents a controlled simulated message within a simulated inbox.
- `EmailRedFlag` represents an educational indicator attached to a simulated email.
- `EmailClassificationResponse` represents a trainee's classification of a simulated email.
- `SimulatedInteractionEvent` represents a controlled interaction with simulated links, attachments, or forms.

### 6.6 Reporting, Audit, and Safety Concepts

- `ProgressRecord` represents campaign and campaign-item progress for a trainee.
- `TrainingReport` represents organisation-level reporting over campaign completion, results, and risk indicators.
- `AuditLogEntry` represents a safe record of sensitive account, organisation, permission, campaign, lifecycle, or platform actions.
- `PlatformOverview` represents aggregated platform-level usage, onboarding, lifecycle, and security indicators.
- `AIContentDraft` represents AI-assisted draft training content that requires human review before publication.
- `RealEmailSimulationCampaign` represents an ethically constrained campaign that may use real email delivery only within an approved organisation scope.
- `DeliveryOutcome` represents the result of an email delivery attempt without exposing unnecessary provider or credential details.

### 6.7 Domain Relationships and Limits

- A `User` may act as an Individual Trainee, Organisation Trainee, Organisation Administrator, Platform Administrator, or Platform Super-Administrator depending on account status and assigned role.
- An `Organisation` may have many Organisation Trainees, Organisation Administrators, invitations, security settings, context values, tags, campaigns, reports, and audit entries.
- Organisation-scoped concepts must remain within the owning organisation unless an explicit platform-level feature allows otherwise.
- A `Campaign` contains ordered campaign items. Campaign items can expose training documents, quizzes, simulated inboxes, or future supported training activities.
- Trainee progress belongs to the trainee and the campaign context in which the activity occurred.
- Tokenised actions must be tied to their intended account, invitation, organisation, request, or email context.
- Audit entries must describe sensitive changes with safe summaries and must not expose passwords, raw tokens, token hashes, or unnecessary request content.
- AI-assisted content is draft content until an authorised human administrator reviews and approves it.
- Real email simulation campaigns require explicit organisation approval, approved sending scope, and safeguards that prevent collection of real credentials or unnecessary personal information.

---

Previous section: [Quality Requirements](quality-requirements.md)

Next section: [Changelog](changelog.md)
