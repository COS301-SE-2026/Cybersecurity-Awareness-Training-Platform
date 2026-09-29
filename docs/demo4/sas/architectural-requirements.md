# Architectural Requirements

This section identifies the principal drivers, responsibilities, constraints, interfaces, and quality concerns shaping the Demo 4 architecture.

## SAS Content

- [0. Home](README.md)
- [1. Introduction](introduction.md)
- **[2. Architectural Requirements](#2-architectural-requirements)** &larr; _You are here_
- [3. Architecture Overview](architecture-overview.md)
- [4. Architectural Patterns](architectural-patterns.md)
- [5. Design Patterns](design-patterns.md)
- [6. Quality-to-Architecture Mapping](quality-architecture-mapping.md)
- [7. Technology Requirements](technology-requirements.md)
- [8. API Contracts](api-contracts.md)
- [9. Deployment and Operations](deployment.md)
- [10. Privacy and Data Boundaries](privacy-and-data-boundaries.md)
- [11. Known Limitations](known-limitations.md)
- [12. Changelog](changelog.md)

---

## 2. Architectural Requirements

### 2.1 Purpose

Architectural requirements translate the SRS responsibilities and quality expectations into system-wide design obligations. They describe what the architecture must preserve even as individual screens, endpoints, and persistence queries evolve.

### 2.2 Architectural Drivers

- Secure authentication, sessions, and purpose-bound token actions.
- Role, permission, ownership, user, and organisation-boundary enforcement.
- Reliable organisation onboarding, invitations, assignment, and lifecycle transitions.
- Editable reusable content with explicit lifecycle eligibility.
- One canonical Campaign graph and Campaign Builder.
- Repeat Quiz attempts with occurrence-scoped limits and score policy.
- Deterministic adaptive evidence and persisted per-assignment resolution.
- Provider-neutral AI drafting and proposals under backend-controlled context.
- Safe external email delivery for account/lifecycle notifications.
- Truthful, redacted audit records and lifecycle timelines.
- Maintainable/testable layer boundaries and shared HTTP contracts.
- Transactional persistence, migrations, health checks, and revision-safe deployment.

### 2.3 Architectural Responsibilities

| Concern          | Required architectural response                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Presentation     | React features render role-appropriate views and maintain transient editing state without becoming authoritative for security or lifecycle validation. |
| HTTP boundary    | Express routes and middleware authenticate, rate-limit where applicable, enforce scope/permission, validate requests, and map safe responses.          |
| Workflow         | Services coordinate complete use cases and transactions without direct browser or provider trust.                                                      |
| Persistence      | Repositories own Prisma queries and enforce query-level scope needed by the service operation.                                                         |
| Shared contracts | Shared Zod schemas and TypeScript types define reusable request/response and Campaign graph shapes.                                                    |
| External systems | Email and AI abstractions isolate provider-specific concerns and credentials behind backend-owned adapters.                                            |
| Operations       | Deployment scripts build immutable revisions, apply migrations, verify health, and preserve rollback inputs.                                           |

### 2.4 Architectural Constraints

- The product is a browser client communicating with a server-side API.
- Authoritative validation and access control occur on the backend.
- Backend feature flow follows `Route -> Controller -> Service -> Repository -> Prisma/PostgreSQL`.
- Controllers and services do not perform ad hoc Prisma access for feature persistence.
- Shared contracts are not a substitute business-logic layer and do not expose private persistence records automatically.
- Organisation-owned data remains tenant scoped; Campaign permissions do not imply broad trainee-management permission.
- Reusable content must satisfy ownership and lifecycle eligibility before Campaign references are persisted.
- Campaign runtime state is separate from Campaign Draft structure and is not copied to new Drafts.
- AI provider/model credentials, raw organisation context, and raw trainee history are not browser-controlled inputs.
- Generated content remains transient/editable until normal explicit save and lifecycle transitions.
- Sensitive values are excluded from responses, logs, audit metadata, AI boundaries, and verification evidence.
- Database migrations are part of deployment and must be considered during rollback.

### 2.5 Interfaces and Integration

- The frontend calls typed API clients built around shared request/response contracts.
- Route middleware establishes authentication, organisation access, and named permission requirements before controller execution.
- Controllers translate HTTP input/output and delegate workflows to services.
- Services call repositories and supporting domain services; they coordinate transactions and lifecycle rules.
- Repositories use Prisma to query PostgreSQL and return bounded domain/application data.
- The transactional email subsystem uses durable delivery state and a mail adapter rather than coupling business workflows directly to SMTP.
- AI orchestration invokes a provider abstraction and schema-validates generated output before returning Draft/proposal data.
- Health endpoints report bounded application/database readiness used by deployment scripts.

### 2.6 Demo 4 Flow Requirements

#### Reusable content and Campaigns

Training Document, Quiz, Organisation Email, and Simulated Inbox creators persist through their normal services and repositories. Campaigns store eligible references through the canonical `COMPONENT`, `ADAPTIVE`, and `GROUP` graph. Groups contain only direct component/adaptive children.

#### Quiz runtime

Quiz attempts belong to trainee and occurrence context. The service reuses an in-progress attempt, enforces `maxAttempts`, calculates submission results server-side, and derives the effective `BEST`, `LATEST`, or `AVERAGE` score.

#### Adaptive runtime

Evidence services calculate category state deterministically. Adaptive resolution reads the persisted alternatives, selects the matching difficulty, and creates or reuses the unique assignment-item resolution. AI does not choose difficulty.

#### AI assistance

Normal generation, missing-variant orchestration, complete Campaign proposals, and follow-up proposals remain provider-neutral outside the provider layer. Organisation context and trainee category state are assembled on the backend. Proposal and Draft data have no persistence side effect.

### 2.7 Quality Requirements

The architecture responds to the final quality requirements through server-side access control, safe data boundaries, semantic/keyboard-aware presentation, idempotency and transaction boundaries, bounded performance verification, stable contracts and links, scoped audit persistence, and immutable-revision deployment.

The detailed mapping is maintained in [Quality-to-Architecture Mapping](quality-architecture-mapping.md). Executable check mapping and evidence remain owned by #574.

### 2.8 Traceability

| Requirement area                  | Architectural response                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| Authentication and account access | Auth middleware, session/token services, account repositories, transactional notifications |
| Organisation management           | Organisation-scoped route guards, services, candidate predicates, and repositories         |
| Reusable content                  | Dedicated builders, shared Draft schemas, lifecycle services, content repositories         |
| Campaign composition              | Canonical shared graph, Campaign Builder, validation service, Campaign repository          |
| Quiz participation                | Attempt/result services and repositories with occurrence settings                          |
| Adaptive delivery                 | Evidence services, category-state engine, adaptive-resolution repository                   |
| AI assistance                     | AI orchestration services, provider abstraction, backend context, schema validation        |
| Audit and lifecycle               | Audit service/repository and persisted timeline events                                     |
| Deployment                        | Container builds, migration scripts, health checks, SHA promotion and rollback             |

---

Previous section: [Introduction](introduction.md)

Next section: [Architecture Overview](architecture-overview.md)
