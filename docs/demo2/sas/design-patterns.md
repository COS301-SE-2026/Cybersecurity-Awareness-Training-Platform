# Design Patterns

This section records the design patterns used to explain important parts of the Insightful Phish application and how they were used to solve recurring software design issues that developers face. The document follows the COS214 style of describing the patterns intent, problem, participants, interaction, benefits, and trade-offs that it brings to Insightful Phish.

## SAS Content

- [0. Home](README.md)
- [1. Architectural Requirements](architectural-requirements.md)
- [2. Architectural Patterns](architectural-patterns.md)
- **[3. Design Patterns](#3-design-patterns)** &larr; _You are here_
  - [3.1 Selection Criteria](#31-selection-criteria)
  - [3.2 Design Patterns](#32-design-patterns)
    - [3.2.1 Facade](#321-facade)
    - [3.2.2 State](#322-state)
    - [3.2.3 Strategy](#323-strategy)
    - [3.2.4 Proxy](#324-proxy)
    - [3.2.5 Adapter](#325-adapter)
  - [3.3 Pattern Interactions](#33-pattern-interactions)
  - [3.4 Limitations](#34-limitations)
  - [3.5 Quality Traceability](#35-quality-traceability)
  - [3.6 References](#36-references)
- [4. Quality to Architecture Mapping](quality-architecture-mapping.md)
- [5. Technology Requirements](technology-requirements.md)
- [6. API Contracts](api-contracts.md)
- [7. Deployment and Operations](deployment.md)
- [8. Changelog](changelog.md)

---

## 3. Design Patterns

The five-layer architecture remains the main architectural structure. The patterns below explain recurring collaborations inside said structure.

### 3.1 Selection Criteria

A pattern is used in this catalogue when it satisfies the following points:

- **Named participants:** The pattern has identifiable participants in the domain model or architecture.
- **Clear interaction:** The collaboration between participants can be described without suffering the spaghetti code problem.
- **Domain relevance:** The pattern helps explain users, organisations, invitations, tokens, sessions, campaigns, audit entries, delivery logs, or security settings.
- **Quality value:** The pattern contributes to a quality requirement.
- **Honest trade-off:** The pattern makes a real design risk easier to reason about.

### 3.2 Design Patterns

The selected patterns are Facade, State, Strategy, Proxy, and Adapter for Demo 2. They support the five-layer architecture from different angles: workflow coordination, lifecycle control, policy variation, controlled access, and external-service translation that we use.

#### 3.2.1 Facade

| Aspect                        | Description                                                                                                                                                                                                                                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**                      | Facade                                                                                                                                                                                                                                                                                                                                 |
| **Classification / strategy** | Structural pattern used at selected application workflow boundaries.                                                                                                                                                                                                                                                                   |
| **Intent**                    | Provide one entry point that coordinates several operations behind this interface.                                                                                                                                                                                                                                                     |
| **Problem addressed**         | Sensitive workflows such as organisation registration approval, first organisation administrator setup, invitation acceptance, account security changes touch several places at once. Without a facade, controllers would have to assemble policy checks, token handling, persistence, audit recording, and email delivery themselves. |
| **Relevant domain concepts**  | `OrganisationRegistrationRequest`, `Organisation`, `Invitation`, `ActionToken`, `User`, `OrganisationAdmin`, `AuthSession`, `RefreshToken`, `CampaignAssignment`, `QuizAttempt`, `AuditLogEntry`, and `EmailDeliveryLog`.                                                                                                              |

| Pattern participant | Insightful Phish participant                                                                                                                                             | Responsibility                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Facade              | Use-case-oriented application operation, such as organisation approval, initial administrator setup, account change, session revocation, or campaign progress submission | Presents one entry point to the API layer.                                    |
| Client              | Route and controller boundary in the API and Access-Control layer                                                                                                        | Authenticates, validates the request shape, and calls the workflow operation. |
| Subsystem classes   | Policy checks, token lifecycle handling, data-access operations, audit logging, email delivery, and session handling                                                     | Carry out the specialised steps coordinated by a facade.                      |
| Domain objects      | Users, organisations, invitations, tokens, sessions, campaigns, attempts, audit records, and delivery logs                                                               | Hold the state changed or inspected by the workflow.                          |

**Relationships or interaction:** The API calls the facade operation. The operation applies policy and lifecycle rules, coordinates persistence work, records safe audit and delivery outcomes where required, and returns a compact response that the controller can send without knowing all subsystem details (decoupling).

**Benefit:** Controllers stay thin in terms of code length, workflows have one clear place for transactional and policy decisions, and audit or notification behaviour is easier to review.

**Limitation or trade-off:** A facade can become too complex if unrelated workflows are grouped behind the one large service. In Insightful Phish, the boundary should follow a real user task, such as onboarding.

#### 3.2.2 State

| Aspect                        | Description                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**                      | State                                                                                                                                                                                                                                                                                                                       |
| **Classification / strategy** | Behavioural pattern applied to lifecycle-sensitive behaviour in insightful Phish.                                                                                                                                                                                                                                           |
| **Intent**                    | Make behaviour depend on a domain object's lifecycle state and keep state transitions explicit.                                                                                                                                                                                                                             |
| **Problem addressed**         | Many Insightful Phish workflows must behave differently depending on whether an account, organisation, invitation has a specific state. These transitions must be guarded so stale tokens, duplicate submissions, repeated setup attempts, and suspended organisation changes do not create inconsistent outcomes.          |
| **Relevant domain concepts**  | `User.authStatus`, `Organisation.status`, `OrganisationRegistrationRequest.status`, `Invitation.status`, `ActionToken.usedAt`, `ActionToken.revokedAt`, `EmailChangeRequest.status`, `AuthSession.revokedAt`, `RefreshToken.revokedAt`, `Campaign.status`, `CampaignAssignment.assignmentStatus`, and `QuizAttempt.status`. |

| Pattern participant | Insightful Phish participant                                                       | Responsibility                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Context             | Workflow operation that handles a lifecycle-sensitive record                       | Requests an action such as setup completion, invitation acceptance, session revocation, campaign progress, or quiz submission. |
| State               | Current status or lifecycle marker on the record                                   | Determines which actions are permitted, rejected, or treated as stale.                                                         |
| Concrete states     | Pending, active, completed, expired, revoked, suspended, disabled, submitted, etc. | Represent the meaningful lifecycle cases used by the domain.                                                                   |
| Transition owner    | Application service + data-access operation                                        | Checks the current state, applies the allowed transition, and records audit or progresses the outcomes where required.         |

**Relationships or interaction:** A workflow reads or matches the current lifecycle state, verifies that the requested action is valid for that state, applies the transition where needed, and rejects stale or invalid transitions with a safe outcome and message.

**Benefit:** State-sensitive behaviour becomes easier to manage.

**Limitation or trade-off:** The design must keep transition ownership clear so lifecycle behaviour does not become scattered conditional checks.

#### 3.2.3 Strategy

| Aspect                        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**                      | Strategy                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Classification / strategy** | Behavioural pattern for policy and rule variation.                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Intent**                    | Encapsulate a decision rule so the workflow can use the right policy for the current organisation, user role, invitation type, session setting, or campaign context.                                                                                                                                                                                                                                                                               |
| **Problem addressed**         | Insightful Phish applies different rules depending on role and context. Organisation security settings influence account preferences, remember-me behaviour, idle timeout, and trainee email changes. Invitation validation differs by invitation type. Campaign access and quiz behaviour depend on assignment, progress, and content type. Keeping these decisions behind strategies prevents requests from filling up with unrelated branching. |
| **Relevant domain concepts**  | `OrganisationSecuritySettings`, `UserSecurityPreferences`, `AuthSession`, `Invitation.invitationType`, `OrganisationPermission`, `Campaign`, `CampaignAssignment`, `Quiz`, `QuizAttempt`, and `SimulatedEmail`.                                                                                                                                                                                                                                    |

| Pattern participant | Insightful Phish participant                                                      | Responsibility                                                                         |
| ------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Strategy            | Policy or rule used by an application workflow                                    | Defines a decision interface.                                                          |
| Concrete strategy   | Role-, organisation-, invitation-, session-, campaign-, or quiz-specific rule set | Applies the rule for the current context.                                              |
| Context             | Application service coordinating the workflow                                     | Chooses or applies the relevant rule and continues only when the policy allows it.     |
| Client              | API/controller boundary or calling workflow                                       | Supplies authenticated user, organisation, request, and domain context to the service. |

**Relationships or interaction:** The workflow gathers the relevant user, organisation, invitation, session, or campaign context, it then applies the policy decision, and uses the result to allow, reject, or shape the next step.

**Benefit:** Policy changes can be made and tested in one focused place, which is useful for organisation security settings, and campaign rules.

**Limitation or trade-off:** Strategy boundaries add indirection. Simple validation rules should stay simple; the pattern is useful where rule variation is meaningful and expected to change not for just simple validation rules.

#### 3.2.4 Proxy

| Aspect                        | Description                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Name**                      | Proxy                                                                                                                                                                                                                                                                                                                                                        |
| **Classification / strategy** | Structural pattern at the access boundary.                                                                                                                                                                                                                                                                                                                   |
| **Intent**                    | Controls access to protected operations before the request reaches application services.                                                                                                                                                                                                                                                                     |
| **Problem addressed**         | Account settings, organisation administration, platform administration, campaign reporting, audit review, and tokenised setup flows require authentication, role checks, permission checks, organisation scope, validation, rate limiting, and sometimes reauthentication. These checks must be applied consistently and must not rely on the browser alone. |
| **Relevant domain concepts**  | `User`, `Organisation`, `OrganisationAdmin`, `OrganisationTrainee`, `OrganisationPermission`, `OrganisationSecuritySettings`, `AuthSession`, `ActionToken`, `CampaignAssignment`, and `AuditLogEntry`.                                                                                                                                                       |

| Pattern participant | Insightful Phish participant                                                                                          | Responsibility                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Proxy               | API and Access-Control boundary, including authentication, validation, rate-limit, role, permission, and scope checks | Decides whether the request may reach the protected workflow.                                  |
| Real subject        | Protected application service operation                                                                               | Performs the sensitive account, organisation, invitation, campaign, audit, or platform action. |
| Client              | Browser or external API caller                                                                                        | Sends a request and receives a safe success or rejection response.                             |
| Access context      | Authenticated user, session, role, organisation scope, permissions, and request validation result                     | Carries the information needed to enforce the boundary.                                        |

**Relationships or interaction:** Requests pass through the proxy API. Valid requests are forwarded with authenticated context; rejected requests receive safe responses.

**Benefit:** The architecture has a first line of defence for sensitive endpoints, while the application service can still perform critical ownership and lifecycle checks.

**Limitation or trade-off:** Proxy-style access control is not a substitute for service-level checks. The protected service still has to verify sensitive ownership, organisation scope, and state rules before changing data.

#### 3.2.5 Adapter

| Aspect                        | Description                                                                                                                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**                      | Adapter                                                                                                                                                                                                                                              |
| **Classification / strategy** | Structural pattern at integration boundaries.                                                                                                                                                                                                        |
| **Intent**                    | Convert an external interface into the application-facing interface needed by Insightful Phish workflows.                                                                                                                                            |
| **Problem addressed**         | Email flows must work against development mail capture and the preliminary production SMTP provider without allowing provider-specific responses, credentials, or raw errors to leak into domain workflows, audit metadata, or user-facing messages. |
| **Relevant domain concepts**  | `EmailDeliveryLog`, `ActionToken`, `Invitation`, `EmailChangeRequest`, `OrganisationRegistrationRequest`, `User`, and `AuditLogEntry`.                                                                                                               |

| Pattern participant | Insightful Phish participant                                                                                        | Responsibility                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Target              | Application-facing email delivery boundary                                                                          | Defines the stable operation needed by services that send transactional email.                             |
| Adapter             | Central backend mail/email service and SMTP mailer boundary                                                         | Translates rendered email requests into SMTP-compatible delivery calls and returns safe delivery outcomes. |
| Adaptee             | SMTP-compatible providers, including MailPit for development and Resend as the preliminary production SMTP provider | Provides the external email transport behaviour.                                                           |
| Client              | Account, authentication, invitation, onboarding, and organisation workflows                                         | Requests email delivery without depending on provider-specific protocols or diagnostics.                   |

**Relationships or interaction:** A workflow asks the central email boundary to send a rendered email. The adapter translates the request for the configured SMTP provider, captures a safe outcome, and allows the workflow to record delivery status without storing raw provider details.

**Benefit:** Provider details stay outside business workflows, MailPit can be used safely in development, Resend can serve as the preliminary production SMTP provider, and future SMTP changes can be localised to the integration boundary.

**Limitation or trade-off:** If the adapter hides too much information then troubleshooting becomes too difficult. It should expose stable, safe outcomes while still protecting credentials, tokens.

### 3.3 Pattern Interactions

The selected patterns support the five-layer architecture in different places:

- The **Presentation and Browser layer** sends requests and receives safe responses through API boundaries.
- The **API and Access-Control layer** uses a proxy protection before protected workflows are reached.
- The **Application Services layer** uses a facade for complex user tasks.
- The **Application Services layer** also applies state and strategy decisions when lifecycle or policy behaviour changes.
- The **Data-Access layer** supports the persistence operations needed by those workflows.
- The **Persistence layer** stores the lifecycle state that makes accounts, organisations, invitations, tokens, sessions, campaigns, audits, and delivery logs reliable.
- The **External integration boundary** uses an adapter for email delivery, keeping MailPit and Resend SMTP behaviour outside insightful phish workflow.

### 3.4 Limitations

These patterns should stay useful, not decorative. The main risk is over-design: if every status, rule, middleware check, or provider call is treated as a full design pattern, the architecture becomes harder to read instead of clearer.

- **Facade boundaries must stay focused.** A service that coordinates one use case is helpful; a service that quietly grows into a general platform coordinator becomes a maintenance problem.
- **State must keep transition ownership clear.** The pattern is useful for lifecycle-sensitive behaviour, but a status field by itself does not enforce anything.
- **Strategy should be used for real variation.** Organisation policy, session policy, invitation type, campaign availability, and quiz rules are good fits where the rules vary by context. Fixed validation should not be over-designed.
- **Proxy checks must be backed by service checks.** Authentication and permission middleware reduce risk at the API boundary, but protected services still need ownership, scope, and lifecycle checks.
- **Adapter is narrowed to external translation boundaries.** The email delivery boundary is the clearest adapter in this SAS because the application has a stable delivery need while SMTP-compatible providers expose provider-specific behaviour.

### 3.5 Quality Traceability

The quality requirements below use the identifiers and wording from the Demo 2 SRS quality notes where they are explicit, plus the numbered quality sections in the consolidated SRS. Each mapping explains the mechanism rather than listing broad quality names.

| Pattern  | Quality requirement                        | Pattern contribution                                                                                                                                                                                               |
| -------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Facade   | `QR-SEC-001` Security, Privacy, and Safety | Facade-style account, onboarding, invitation, and organisation operations centralise current-password checks, organisation-scope checks, token lifecycle checks, and safe audit recording for sensitive workflows. |
| Facade   | `QR-REL-001` Error Handling and Resilience | Workflow operations can apply conditional updates and transactional steps together, reducing duplicate setup, stale token, repeated submission, and partial-update risks.                                          |
| State    | `QR-REL-001` Error Handling and Resilience | Explicit lifecycle checks protect against stale tokens, expired invitations, duplicate quiz submissions, revoked sessions, and invalid organisation transitions.                                                   |
| State    | `QR-TST-001` Testability and Traceability  | State-based workflows give tests clear success, failure, stale, and repeated-action cases to verify.                                                                                                               |
| Strategy | `QR-SEC-001` Security, Privacy, and Safety | Policy strategies keep organisation security settings, invitation rules, session preferences, and campaign access decisions tied to authenticated context.                                                         |
| Strategy | SRS 9.5 Maintainability                    | Context-specific rules can evolve without scattering policy branches through controllers and unrelated workflows.                                                                                                  |
| Proxy    | `QR-SEC-001` Security, Privacy, and Safety | Proxy-style API boundaries enforce authentication, rate limiting, validation, role checks, permission checks, and organisation scope before sensitive services are reached.                                        |
| Proxy    | `QR-ACC-001` Accessibility                 | Consistent request validation and safe rejection responses help the frontend present field-level and action-level feedback in predictable places.                                                                  |
| Adapter  | `QR-PRV-001` Privacy and data minimisation | The email adapter returns stable delivery outcomes and prevents raw provider responses, credentials, tokens, and unnecessary personal content from leaking into logs or audit records.                             |
| Adapter  | SRS 9.4 Error Handling and Resilience      | Email provider failures can be translated into safe application outcomes so workflows can decide whether to retry, report a safe error, or record a delivery failure without exposing internals.                   |

### 3.6 References

- [SRS Quality Requirements](../srs/quality-requirements.md)
- [Consolidated Demo 2 SRS](../srs/README.md)
- [SRS Domain Model](../srs/domain-model.md)
- [Demo 2 Domain Model Source](../domain-model-demo2.txt)
- [Architectural Requirements](architectural-requirements.md)
- [Architectural Patterns](architectural-patterns.md)
- [Technology Requirements](technology-requirements.md)
- COS214 design-patterns course notes, including the pattern description method of intent, problem, participants, relationships, improvements, and trade-offs.

---

Previous section: [Architectural Patterns](architectural-patterns.md)

Next section: [Quality to Architecture Mapping](quality-architecture-mapping.md)
