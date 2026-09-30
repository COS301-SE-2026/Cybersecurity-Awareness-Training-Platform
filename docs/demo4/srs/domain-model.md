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
  - [6.3 Domain Areas](#63-domain-areas)
    - [6.3.1 Core Account and Access Concepts](#631-core-account-and-access-concepts)
    - [6.3.2 Organisation and Administration Concepts](#632-organisation-and-administration-concepts)
    - [6.3.3 Campaign and Training Concepts](#633-campaign-and-training-concepts)
    - [6.3.4 Reporting, Audit and Safety Concepts](#634-reporting-audit-and-safety-concepts)
  - [6.4 Key Relationships](#64-key-relationships)
  - [6.5 Domain Model Limits and Information](#65-domain-model-limits-and-information)
- [7. Changelog](changelog.md)

---

## 6. Domain Model

### 6.1 Purpose

The domain model provides a conceptual view of the entities needed to support the SRS use cases, functional requirements, and quality requirements. It keeps business concepts understandable for stakeholders and future maintainers without tying the SRS to a specific persistence implementation.

### 6.2 Domain Diagram

To view the full rendered version of the diagram, click [here](../diagrams/srs/domain-model.drawio.svg).

![Domain Model Diagram for Insightful Phish](../diagrams/srs/domain-model.drawio.svg)
_Figure 6.1: Conceptual domain model for the Insightful Phish platform._

### 6.3 Domain Areas

#### 6.3.1 Core Account and Access concepts

- `User` represents the common identity, authentication status, verified-email state, account type, and account-lifecycle information shared by all platform accounts.
- `Trainee` represents the general form of a user who participates in cybersecurity-awareness training.
- `GeneralTrainee` represents a trainee who obtains general platform access through self-registration, invitation, seeding, administrator creation, or a role change.
- `OrganisationTrainee` represents a trainee who belongs to an organisation and records organisation-specific membership and lifecycle information.
- `OrganisationAdmin` represents an organisation-linked administrator, including whether the administrator is the organisation's initial administrator and whether the role originated from an invitation.
- `IPAdmin` represents an Insightful Phish platform administrator. Its platform administrator role distinguishes normal administrators from super-administrators.
- `UserSecurityPreferences` represents a user's preferred regular-session length, remembered-session length, and inactivity timeout where platform and organisation policy permit personal choice.
- `AuthSession` represents an authenticated browser or device session, including its expiry, activity, revocation, device, and location information.
- `RefreshToken` represents a hashed renewable credential associated with an authentication session and records rotation, use, expiry, replacement, and revocation.
- `ActionToken` represents a hashed, time-limited token for email verification, password reset, email-change verification, invitation acceptance, initial administrator setup, or platform administrator changes.
- `EmailChangeRequest` represents the lifecycle of a requested change from a user's current email address to a new email address.

#### 6.3.2 Organisation and Administration Concepts

- `OrganisationRegistrationRequest` represents a public request for an organisation to be reviewed and onboarded.
- `Organisation` represents an approved organisation using the platform.
- `OrganisationSecuritySettings` represents organisation-level policies that affect session behaviour and sensitive account actions.
- `OrganisationContext` represents organisation-owned reference material, its processing state, and whether it may be used by supported AI workflows.
- `Invitation` represents initial organisation administrator setup, organisation trainee invitations, organisation administrator promotions, platform administrator invitations, and platform administrator upgrades.
- `InvitationPermissionGrant` records a permission that will be applied if an invitation involving administrator permissions is accepted.
- `OrganisationPermission` represents a named organisation administrator capability, its category and access level, and any permissions that it implies.
- `OrganisationAdminPermission` records a permission granted to an organisation administrator, including who granted or revoked it and when the change occurred.

#### 6.3.3 Campaign and Training Concepts

- `Campaign` represents the main container for a training programme. It can be a platform Campaign or an organisation Campaign.
- `CampaignAssignment` links a campaign to a trainee or trainee scope and tracks availability, progress, due dates, and completion.
- `CampaignItem` represents an ordered activity in a campaign.
- `AdaptiveCampaignItem` represents an adaptive Campaign Item with one fixed component type.
- `CampaignAdaptiveAlternative` represents one eligible difficulty-specific content reference owned by an adaptive Campaign Item.
- `AdaptiveCampaignResolution` represents the persisted selection for one Campaign Assignment and adaptive Campaign Item.
- `TrainingDocument` represents reusable readable training content.
- `Quiz` represents a reusable assessment with questions, answer options, marking rules, and feedback.
- `QuizAttempt` represents a trainee's attempt at a quiz.
- `QuizResult` represents the outcome and permitted feedback for a submitted quiz attempt.
- `OrganisationEmail` represents reusable organisation-owned email content that can be used in Simulated Inboxes and real-email simulation pools.
- `SimulatedInbox` represents a controlled inbox used for training.
- `SimulatedEmail` represents a controlled simulated message within a simulated inbox.
- `EmailRedFlag` represents an educational indicator attached to a simulated email.
- `EmailClassificationResponse` represents a trainee's classification of a simulated email.
- `InteractionEvent` represents a controlled interaction with simulated links, attachments, or forms.
- `EmailProviderProfile` represents organisation-owned SMTP settings used by phishing simulations. SMTP passwords are stored outside the domain model.
- `PhishingSimulation` represents a scheduled real-email simulation linked to one organisation Campaign.
- `PhishingSimulationEmail` represents a snapshotted email in the simulation message pool.
- `PhishingSimulationRecipient` links one eligible Campaign Assignment to snapshotted recipient details.
- `PhishingSimulationMessage` represents one scheduled pool-email delivery to one recipient through a selected provider profile.
- `PhishingSimulationTrackingEvent` records a tracked event for one simulation message.
- `ManagedPortalLink` represents a hashed, expiring portal link for a Simulated Email or Phishing Simulation Message.
- `PortalInteractionEvent` records an interaction through a Managed Portal Link.

#### 6.3.4 Reporting, Audit, and Safety Concepts

- `AuditLogEntry` represents a safe record of supported sensitive account, organisation, permission, Campaign, lifecycle, or platform actions.
- `EmailDeliveryLog` represents the bounded outcome of a transactional or phishing-simulation delivery attempt.
- Campaign Insights and trainee results are calculated from persisted activity rather than stored as separate report entities.
- AI-generated Draft data and Campaign proposals remain transient until an administrator saves supported content or Campaign data through the normal workflow.

### 6.4 Key Relationships

- A `User` participates in the platform through a trainee or administrator role. `GeneralTrainee` and `OrganisationTrainee` are trainee roles, while `OrganisationAdmin` and `IPAdmin` provide organisation-level and platform-level administration.
- An `Organisation` brings together its trainees, administrators, settings, context, invitations, Campaigns, SMTP provider profiles, phishing simulations, and audit history.
- An `OrganisationRegistrationRequest` records the review process that may lead to an approved organisation and its initial administrator invitation.
- Invitations connect the intended recipient, organisation, issuing user, secure action tokens, and any permissions that will be granted after acceptance.
- Organisation administrators receive explicit organisation permissions. Permission changes retain their granting and revocation context so that administrative access remains accountable.
- A user's security preferences operate alongside organisation policy. Authentication sessions, rotating refresh tokens, action tokens, and email-change requests represent the main account-security lifecycles.
- A `Campaign` contains ordered campaign items and may depend on completion of other campaigns. Campaign assignments connect trainees to the campaigns available or assigned to them.
- Campaign components expose reusable training documents, quizzes, or simulations. Component groups organise related components using a defined completion rule without allowing nested groups.
- An adaptive `CampaignItem` owns exactly three `CampaignAdaptiveAlternative` records, one for each supported difficulty. An `AdaptiveCampaignResolution` is unique for one Campaign Assignment and adaptive Campaign Item.
- Quiz attempts connect a trainee to their submitted answers and resulting score, while preserving the campaign context in which the assessment was completed.
- A simulated inbox contains controlled simulated emails. Trainee classifications, identified red flags, and interaction events record the learning activity associated with those emails.
- A `PhishingSimulation` belongs to one Organisation and one Campaign and owns its pool emails, recipients, messages, and tracking events.
- Each `PhishingSimulationRecipient` represents one Campaign Assignment within a simulation. Each `PhishingSimulationMessage` links one recipient, pool email, and selected provider profile.
- A `ManagedPortalLink` records one supported email context and owns its `PortalInteractionEvent` records.
- Trainee progress is determined from campaign assignments, quiz attempts, results, classification responses, and interaction events rather than from a separate progress concept.
- Email delivery records connect delivery outcomes to account and invitation workflows or to the related Phishing Simulation Message.
- Audit entries connect sensitive actions to their actor, organisation, target, outcome, and safe change information without retaining credentials or raw security tokens.

### 6.5 Domain Model Limits and Information

- The domain model is conceptual. It is not a direct database entity-relationship diagram.
- Filled diamonds represent composition or ownership.
- Solid lines represent associations.
- Hollow triangles represent inheritance or generalisation.
- Multiplicities describe domain participation, not database indexes.
- AI-generated Draft data, Campaign proposals, Campaign Insights, and trainee results are not separate persistent domain entities.

---

Previous section: [Quality Requirements](quality-requirements.md)

Next section: [Changelog](changelog.md)
