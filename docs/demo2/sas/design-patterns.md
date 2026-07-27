# Design Patterns

This section records the design patterns that are relevant to the Insightful Phish domain design and five-layer architecture. The patterns are documented using the COS214 design-pattern style of describing intent, problem, participants, relationships, benefits, and trade-offs, while avoiding a forced catalogue of unrelated patterns.

## SAS Content

- [0. Home](README.md)
- [1. Architectural Requirements](architectural-requirements.md)
- [2. Architectural Patterns](architectural-patterns.md)
- **[3. Design Patterns](#3-design-patterns)** &larr; _You are here_
  - [3.1 Selection Criteria](#31-selection-criteria)
  - [3.2 Design Patterns](#32-design-patterns)
    - [3.2.1 Facade](#321-facade)
    - [3.2.2 Repository](#322-repository)
    - [3.2.3 Strategy](#323-strategy)
    - [3.2.4 State](#324-state)
    - [3.2.5 Adapter](#325-adapter)
    - [3.2.6 Protection Proxy](#326-protection-proxy)
  - [3.3 Pattern Interactions](#33-pattern-interactions)
  - [3.4 Limitations](#34-limitations)
  - [3.5 Quality Traceability](#35-quality-traceability)
  - [3.6 References](#36-references)
- [4. Quality to Architecture Mapping](quality-architecture-mapping.md)
- [5. Technology Requirements](technology-requirements.md)
- [6. API Contracts](api-contracts.md)
- [7. Deployment and Operations](deployment.md)

## Related Architecture and Requirements

- [Demo 2 Architecture Overview](../architecture.md)
- [SRS Domain Model](../srs/domain-model.md)
- [SRS Quality Requirements](../srs/quality-requirements.md)
- [Technology Requirements](technology-requirements.md)

---

## 3. Design Patterns

The architecture uses design patterns as supporting design tools inside the layered architecture. The patterns described here do not redefine the five-layer architecture; they explain design decisions that help the elements of the architecture work together.

### 3.1 Selection Criteria

Design patterns are selected only where the domain model, requirements, or planned architectural structure show a clear recurring design problem. A pattern should help explain the architecture more clearly, improve a quality requirement, or make an important trade-off explicit.

The COS214 design-patterns guidance treats a pattern as more than a name: each pattern should describe its intent, the problem it addresses, the participants involved, the relationships between those participants, the improvement achieved, and the limitations introduced. This section uses that method, but applies it only to patterns that are visible in Insightful Phish.

The selected patterns must satisfy these criteria:

- **Domain evidence:** The pattern must relate to named domain concepts such as users, organisations, invitations, tokens, sessions, campaigns, campaign items, audit entries, delivery logs, or security settings.
- **Architectural fit:** The pattern must support the five-layer architecture without redefining it.
- **Quality value:** The pattern must support an architectural quality concern such as security, privacy, maintainability, reliability, auditability, testability, or safe extensibility.
- **Practical trade-off:** The pattern must make an actual design trade-off easier to discuss.
- **No forced catalogue:** A textbook pattern is excluded when the project does not have a clear recurring problem that needs it.

Patterns intentionally not selected at this stage include:

- **Observer:** Audit and email reactions exist as system concerns, but the current SAS evidence does not require the use of this pattern.
- **Factory** Token creation and email rendering involve structured object creation, but the domain model does not require a separate object-creation pattern to explain the architecture.
- **Template Method:** Several workflows have ordered steps, but the SAS does not yet define a stable algorithm skeleton with specialised subclasses.
- **Decorator:** No requirement shows runtime wrapping of domain behaviour as a central architectural decision.

### 3.2 Design Patterns

The selected patterns are Facade, Strategy, State, Adapter, and Proxy. They are described at architecture level.

#### 3.2.1 Facade

| Aspect                           | Description                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**                         | Facade                                                                                                                                                                                                                                                                                                                                                                                        |
| **Intent**                       | Provide a simple use-case-oriented interface over several lower-level operations.                                                                                                                                                                                                                                                                                                             |
| **Problem addressed**            | User-visible workflows such as organisation approval, initial administrator setup, account settings, invitation acceptance, session revocation, campaign participation, and reporting involve several domain concepts. Without a facade-style service boundary, controllers and presentation code would need to understand too many validation, persistence, notification, and audit details. |
| **Relevant domain concepts**     | `OrganisationRegistrationRequest`, `Organisation`, `Invitation`, `ActionToken`, `User`, `AuthSession`, `RefreshToken`, `CampaignAssignment`, `QuizAttempt`, `AuditLogEntry`, and `EmailDeliveryLog`.                                                                                                                                                                                          |
| **Participants**                 | API and Access-Control layer, Application Services layer, Repository and Data-Access layer, notification boundary, audit boundary, and domain entities.                                                                                                                                                                                                                                       |
| **Relationships or interaction** | The API layer calls a use-case-level service operation. The service coordinates validation, policy checks, repository calls, token changes, audit recording, and notification outcomes before returning a compact response.                                                                                                                                                                   |
| **Benefit**                      | Keeps the API boundary readable, keeps presentation concerns away from business orchestration, and gives sensitive workflows one clear place to enforce transactional and policy rules.                                                                                                                                                                                                       |
| **Limitation or trade-off**      | Facade-style services can grow too broad if unrelated workflows are grouped together. The design should keep service boundaries aligned to coherent use cases rather than creating one large application service.                                                                                                                                                                             |
| **Related quality requirements** | Supports security, maintainability, reliability, auditability, and testability concerns in the [SRS Quality Requirements](../srs/quality-requirements.md).                                                                                                                                                                                                                                    |

#### 3.2.2 Strategy

| Aspect                           | Description                                                                                                                                                                                                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**                         | Strategy                                                                                                                                                                                                                                                                                                                              |
| **Intent**                       | Encapsulate policy decisions that can vary by user type, organisation context, campaign rule, or security setting.                                                                                                                                                                                                                    |
| **Problem addressed**            | Insightful Phish must apply different rules for remember-me sessions, idle timeouts, email-change permissions, invitation validation, campaign availability, quiz scoring, and simulated interaction handling. Placing all variations directly inside request handlers would make policy behaviour harder to reason about and change. |
| **Relevant domain concepts**     | `OrganisationSecuritySettings`, `UserSecurityPreferences`, `AuthSession`, `Invitation`, `OrganisationPermission`, `Campaign`, `CampaignAssignment`, `Quiz`, `QuizAttempt`, and `SimulatedEmail`.                                                                                                                                      |
| **Participants**                 | Application Services layer, policy or validation components, shared validation contracts, organisation settings, and domain workflows that need a decision.                                                                                                                                                                           |
| **Relationships or interaction** | A service identifies the relevant context, then delegates a policy decision to a strategy-like component or rule set. The selected rule determines whether the workflow may continue, which session duration applies, which invitation path is valid, or how a training action is evaluated.                                          |
| **Benefit**                      | Keeps policy rules explicit and easier to test. It supports future changes to organisation security policy, campaign rules, and scoring behaviour without scattering conditional logic across unrelated workflows.                                                                                                                    |
| **Limitation or trade-off**      | Strategy boundaries add indirection. For simple rules, a separate strategy can be unnecessary; the pattern should be used where rule variation is meaningful and expected to change.                                                                                                                                                  |
| **Related quality requirements** | Supports security, privacy, maintainability, reliability, and ethical safety concerns in the [SRS Quality Requirements](../srs/quality-requirements.md).                                                                                                                                                                              |

#### 3.2.3 State

| Aspect                           | Description                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**                         | State                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Intent**                       | Make lifecycle-dependent behaviour explicit by modelling important statuses and permitted transitions.                                                                                                                                                                                                                                                                                                           |
| **Problem addressed**            | Many Insightful Phish workflows depend on state: accounts can be pending, active, or disabled; invitations can be sent, accepted, completed, expired, revoked, or rejected; organisations move through onboarding and lifecycle states; campaign assignments and quiz attempts also have progress states. These transitions must be controlled so repeated or stale actions do not create inconsistent outcomes. |
| **Relevant domain concepts**     | `User.authStatus`, `Organisation.status`, `OrganisationRegistrationRequest.status`, `Invitation.status`, `ActionToken.usedAt`, `ActionToken.revokedAt`, `EmailChangeRequest.status`, `AuthSession.revokedAt`, `RefreshToken.revokedAt`, `Campaign.status`, `CampaignAssignment.assignmentStatus`, and `QuizAttempt.status`.                                                                                      |
| **Participants**                 | Domain entities with status fields, application services that enforce transitions, repositories that apply conditional updates, and audit records that preserve transition history.                                                                                                                                                                                                                              |
| **Relationships or interaction** | A workflow checks the current state, verifies that the requested transition is allowed, applies the transition atomically where required, and records the resulting state or rejection.                                                                                                                                                                                                                          |
| **Benefit**                      | Improves reliability, auditability, and security by making stale-token use, repeated setup, expired invitations, suspended organisations, and duplicate submissions easier to prevent.                                                                                                                                                                                                                           |
| **Limitation or trade-off**      | A status enum alone is not the full State pattern. The architecture must keep transition rules explicit; otherwise state fields can become scattered condition checks with unclear ownership.                                                                                                                                                                                                                    |
| **Related quality requirements** | Supports reliability, security, auditability, and sensitive-data safety concerns in the [SRS Quality Requirements](../srs/quality-requirements.md).                                                                                                                                                                                                                                                              |

#### 3.2.4 Adapter

| Aspect                           | Description                                                                                                                                                                                                                                                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**                         | Adapter                                                                                                                                                                                                                                                                                                     |
| **Intent**                       | Wrap external or infrastructure-specific interfaces so application services depend on stable application-facing boundaries.                                                                                                                                                                                 |
| **Problem addressed**            | The system interacts with infrastructure such as email delivery, development email capture, persistence tooling, API documentation generation, and validation libraries. Application workflows should not depend directly on provider-specific details such as SMTP responses or ORM-specific query shapes. |
| **Relevant domain concepts**     | `EmailDeliveryLog`, `ActionToken`, `Invitation`, `EmailChangeRequest`, `AuditLogEntry`, and persisted campaign or account data.                                                                                                                                                                             |
| **Participants**                 | Application Services layer, email boundary, persistence boundary, validation boundary, API documentation boundary, and external or infrastructure tools.                                                                                                                                                    |
| **Relationships or interaction** | Services call application-facing functions for sending email, recording delivery outcomes, validating data, or accessing persistence. Adapter boundaries translate between application needs and provider-specific protocols or libraries.                                                                  |
| **Benefit**                      | Limits provider coupling, keeps sensitive provider details away from business workflows, and allows development tools such as MailPit or local persistence infrastructure to support the same architectural boundary.                                                                                       |
| **Limitation or trade-off**      | Adapters can hide provider capabilities or errors if they are too generic. They should expose enough safe information for audit, retry, and diagnostics without leaking raw provider details.                                                                                                               |
| **Related quality requirements** | Supports maintainability, reliability, privacy, and operational safety concerns in the [SRS Quality Requirements](../srs/quality-requirements.md).                                                                                                                                                          |

#### 3.2.5 Proxy

| Aspect                           | Description                                                                                                                                                                                                                                                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**                         | Proxy                                                                                                                                                                                                                                                                                                                      |
| **Intent**                       | Control access to protected operations before the request reaches sensitive application services.                                                                                                                                                                                                                          |
| **Problem addressed**            | Account settings, organisation administration, platform administration, campaign reporting, audit review, and tokenised setup flows all require identity, role, permission, organisation-scope, and sometimes reauthentication checks. These checks must be applied consistently and should not rely on presentation code. |
| **Relevant domain concepts**     | `User`, `Organisation`, `OrganisationAdministrator`, `OrganisationPermission`, `OrganisationSecuritySettings`, `AuthSession`, `ActionToken`, `CampaignAssignment`, and `AuditLogEntry`.                                                                                                                                    |
| **Participants**                 | Presentation and Browser layer, API and Access-Control layer, authentication middleware, permission guards, policy checks, application services, and protected domain operations.                                                                                                                                          |
| **Relationships or interaction** | Requests pass through authentication, rate-limit, validation, and permission boundaries before service operations execute. The proxy-like access-control boundary either forwards the request with an authenticated context or rejects it with a safe response.                                                            |
| **Benefit**                      | Improves security and privacy by centralising access checks at the API boundary and reducing the chance that protected operations are reached without the required context.                                                                                                                                                |
| **Limitation or trade-off**      | A proxy must stay aligned with service-level checks. Boundary checks improve safety, but sensitive services should still verify critical ownership and state rules so that access control is not only enforced at the outer edge.                                                                                          |
| **Related quality requirements** | Supports security, privacy, auditability, and reliability concerns in the [SRS Quality Requirements](../srs/quality-requirements.md).                                                                                                                                                                                      |

### 3.3 Pattern Interactions

The selected patterns work best when they are seen as a small set of supporting decisions rather than as isolated boxes.

Facade is the main organising pattern at the Application Services layer. A use case such as completing initial administrator setup, accepting an invitation, changing an email address, or submitting a quiz is exposed as one clear operation, even though the operation touches tokens, users, permissions, sessions, audit records, and notifications. This keeps the API layer from becoming a place where business workflows are assembled piece by piece.

Strategy and State then support those facade-style services from different angles. Strategy handles rules that may vary, such as organisation security settings, session duration rules, invitation validation rules, campaign availability, or quiz marking behaviour. State handles where the system is in a lifecycle, such as whether an invitation is still pending, whether a token has already been used, whether an organisation is active, or whether a quiz attempt has already been submitted.

Adapter keeps infrastructure concerns at the edge of those workflows. Email delivery, development email capture, persistence tooling, validation libraries, and API documentation are useful technologies, but the application should not be shaped around their provider-specific details. The adapter boundary gives the services a stable way to use those tools without leaking raw provider behaviour into the domain flow.

Proxy sits at the access-control boundary. It protects the facade-style operations by checking authentication, permissions, organisation scope, request validation, and rate limits before sensitive services are reached. The service still performs important ownership and state checks, but the proxy-like boundary reduces the chance that obviously invalid or unauthorised requests enter the application workflow.

Together, these patterns support the five-layer architecture in a practical way:

- The **Presentation and Browser layer** asks for clear operations and receives safe responses.
- The **API and Access-Control layer** applies proxy-like protection and validation.
- The **Application Services layer** uses facade-style orchestration with strategy and state rules.
- The **Repository and Data-Access layer** keeps persistence access behind stable operations.
- The **Persistence layer** stores the state that makes token, account, campaign, audit, and organisation lifecycles reliable.

### 3.4 Limitations

These patterns should stay useful, not decorative. The main risk is over-design: if every small rule is forced into a named pattern, the architecture becomes harder to read instead of easier.

Facade services must stay focused. A service that coordinates one use case is helpful; a service that quietly grows into a general platform coordinator becomes a maintenance problem. The boundary should follow real workflows such as onboarding, account security, organisation administration, campaign participation, or reporting.

Strategy should be used where rules genuinely vary. Organisation security policy, invitation validation, and session policy are good fits because the rules depend on context. A simple fixed validation rule does not need a separate strategy just to look more architectural.

State is useful only when the allowed transitions are explicit. A status field by itself does not protect the system. The architecture still needs clear rules for when a token, invitation, organisation, session, campaign assignment, or quiz attempt may move from one state to another.

Adapter boundaries should not hide all detail. They should protect the application from provider-specific noise, but still return enough safe information for audit, diagnostics, and user-facing outcomes. For example, email delivery failures should be visible as safe delivery outcomes without exposing raw provider errors.

Proxy-style access control is not a substitute for service-level checks. The API boundary can reject unauthenticated or unauthorised requests early, but sensitive services must still check ownership, organisation scope, and lifecycle state before changing data.

Some familiar patterns are intentionally not used here. Observer, Factory, Template Method, and Decorator may become useful later, but the current domain evidence does not need them as primary SAS patterns. Keeping them out makes the document more honest and keeps attention on the patterns that explain the current design.

### 3.5 Quality Traceability

The split [SRS Quality Requirements](../srs/quality-requirements.md) section is the intended home for measurable quality scenarios. Until those scenarios are fully expanded in this branch, the traceability below links the selected patterns to the quality concerns already described in the architecture and SRS material.

| Pattern  | Main quality concerns supported                         | How the pattern contributes                                                                                                                                                              |
| -------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Facade   | Maintainability, reliability, auditability, testability | Keeps multi-step workflows in one use-case boundary so transactional rules, audit recording, notification outcomes, and validation can be tested and reviewed together.                  |
| Strategy | Security, privacy, maintainability, reliability         | Keeps variable rules such as session policy, email-change permission, invitation validation, campaign availability, and quiz scoring from being scattered through unrelated code paths.  |
| State    | Reliability, security, auditability                     | Makes lifecycle-sensitive behaviour explicit for tokens, invitations, organisations, sessions, campaigns, and quiz attempts, reducing duplicate success outcomes and stale-action risks. |
| Adapter  | Maintainability, reliability, privacy                   | Keeps provider-specific details such as email delivery behaviour, persistence tooling, and validation mechanics behind safer application-facing boundaries.                              |
| Proxy    | Security, privacy, auditability                         | Protects sensitive operations before they reach application services by enforcing authentication, permission, organisation-scope, validation, and rate-limit checks.                     |

These links also support the architecture quality themes in the [Demo 2 Architecture Overview](../architecture.md), especially security, reliability, maintainability, modularity, and traceability.

### 3.6 References

- [Demo 2 Architecture Overview](../architecture.md)
- [SRS Domain Model](../srs/domain-model.md)
- [SRS Quality Requirements](../srs/quality-requirements.md)
- [Demo 2 Domain Model Source](../new-domain-model.txt)
- [Technology Requirements](technology-requirements.md)
- COS214 design-patterns course notes, including the pattern description method of intent, problem, participants, relationships, improvements, and trade-offs.

---

Previous section: [Architectural Patterns](architectural-patterns.md)

Next section: [Quality to Architecture Mapping](quality-architecture-mapping.md)
