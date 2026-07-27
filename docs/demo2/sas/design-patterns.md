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

The architecture uses design patterns as supporting design tools inside the layered architecture. The patterns described here do not redefine the five-layer architecture; they explain design decisions that help the the elements of the architecture.

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

This section explains how the selected patterns work together without duplicating each pattern entry.

### 3.4 Limitations

The limitations section records where a pattern introduces trade-offs, where a candidate pattern is intentionally not used, and where the design should remain simpler.

### 3.5 Quality Traceability

Quality traceability links selected patterns to the measurable [SRS Quality Requirements](../srs/quality-requirements.md).

### 3.6 References

- [Demo 2 Architecture Overview](../architecture.md)
- [SRS Domain Model](../srs/domain-model.md)
- [SRS Quality Requirements](../srs/quality-requirements.md)
- COS214 design-patterns course notes

---

Previous section: [Architectural Patterns](architectural-patterns.md)

Next section: [Quality to Architecture Mapping](quality-architecture-mapping.md)
