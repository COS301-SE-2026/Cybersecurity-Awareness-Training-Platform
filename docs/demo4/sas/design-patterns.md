# Design Patterns

This section records recurring implementation-level collaborations used by Insightful Phish. A named pattern is included only where the current code exhibits the collaboration; the name does not imply every textbook variation is implemented.

## SAS Content

- [0. Home](README.md)
- [1. Introduction](introduction.md)
- [2. Architectural Requirements](architectural-requirements.md)
- [3. Architecture Overview](architecture-overview.md)
- [4. Architectural Patterns](architectural-patterns.md)
- **[5. Design Patterns](#5-design-patterns)** &larr; _You are here_
- [6. Quality-to-Architecture Mapping](quality-architecture-mapping.md)
- [7. Technology Requirements](technology-requirements.md)
- [8. API Contracts](api-contracts.md)
- [9. Deployment and Operations](deployment.md)
- [10. Privacy and Data Boundaries](privacy-and-data-boundaries.md)
- [11. Known Limitations](known-limitations.md)
- [12. Changelog](changelog.md)

---

## 5. Design Patterns

### 5.1 Selection Criteria

A pattern is documented when it has a repeated architectural role, helps explain current collaboration, and has a meaningful quality trade-off. Simple functions are not assigned pattern names merely to expand the catalogue.

### 5.2 Pattern Catalogue

#### 5.2.1 Facade / Application-Service Boundary

**Intent:** Present a focused operation for a complete use case while hiding repository and supporting-service coordination.

**Current use:** Controllers call services such as Campaign management, content lifecycle, assignment, AI generation, and adaptive resolution. These services coordinate validation, repositories, transactions, audit, and external abstractions.

**Demo 4 examples:**

- Campaign services accept canonical Draft input rather than exposing item-table persistence to controllers.
- AI builder/proposal services return validated editable data while hiding provider calls and organisation-context assembly.
- Quiz submission services coordinate answer validation, scoring, result persistence, and category evidence.

**Trade-off:** A facade can become oversized. Feature-specific services and repository boundaries are retained to prevent a single application god-service.

#### 5.2.2 State and Explicit Lifecycle Transitions

**Intent:** Make allowed behaviour depend on explicit persisted state and reject invalid transitions.

**Current use:** Account/invitation tokens, organisations, Training Documents, Quizzes, Organisation Emails, Simulations/Inboxes, Campaigns, assignments, Quiz attempts, and delivery jobs use explicit status values.

**Demo 4 examples:**

- Campaigns transition among `DRAFT`, `ACTIVE`, and `ARCHIVED` through dedicated operations.
- Quiz Drafts become `PUBLISHED`; active/published resources are copied when an editable Draft is required.
- Quiz attempts move from `IN_PROGRESS` to `SUBMITTED` once.
- Adaptive resolution is immutable after the first persisted assignment-item decision.

**Trade-off:** State enums alone are insufficient. Services must validate actor, ownership, current state, dependencies, and transaction outcome.

#### 5.2.3 Strategy / Policy Selection

**Intent:** Isolate interchangeable policy behaviour behind a stable caller contract.

**Current use:** AI provider interfaces separate orchestration from provider implementation. Quiz occurrence score policy selects `BEST`, `LATEST`, or `AVERAGE`. Adaptive category-state logic applies deterministic evidence/sufficiency policy without delegating difficulty to AI.

**Trade-off:** Strategies still require a validated selection mechanism. Browser callers cannot select arbitrary AI providers or adaptive tuning inputs.

#### 5.2.4 Proxy / Guard Boundary

**Intent:** Control access before protected behaviour is invoked.

**Current use:** Express middleware and route composition enforce authentication, account/organisation access, platform role, and named organisation permissions. Frontend guards improve navigation but are not security boundaries.

**Demo 4 example:** The follow-up proposal trainee-selector endpoint requires `MANAGE_CAMPAIGNS` and returns a minimal candidate projection without granting broad trainee-management access.

**Trade-off:** Route guards must remain paired with service/repository scoping for resource ownership and stale-state checks.

#### 5.2.5 Adapter

**Intent:** Translate between an external interface and an application-owned abstraction.

**Current use:** Transactional email delivery uses mail transport/adapters; AI providers implement backend-owned generation interfaces; frontend API clients adapt HTTP responses into feature state.

**Demo 4 example:** AI output is schema validated and adapted to Draft-shaped builder data. Organisation Email HTML is canonicalised against the persistence sanitizer policy before acceptance.

**Trade-off:** An adapter limits coupling but cannot guarantee provider availability or output quality. Callers preserve existing unsaved state and surface actionable failures.

#### 5.2.6 Repository

**Intent:** Encapsulate persistence operations and query-specific projections behind application-facing methods.

**Current use:** Feature repositories own Prisma access for users, organisations, content, Campaigns, assignments, Quiz attempts, adaptive resolutions, audit records, and delivery state.

**Demo 4 example:** Adaptive evidence accepts content only when it matches a direct Campaign Item reference or the persisted resolution selected for the same assignment/item.

**Trade-off:** Repository methods must be purpose-specific enough to preserve tenant and eligibility semantics without embedding the whole workflow.

### 5.3 Pattern Interactions

The proxy/guard boundary admits a request to a controller. The application-service facade coordinates state-transition and strategy decisions. Repositories persist the result. Adapters handle external systems. Shared contracts keep input/output shape aligned across these boundaries.

For missing-variant generation, the Campaign editor carries bounded metadata to a normal builder; the builder client calls the API; route guards protect the organisation scope; a generation service uses the variant strategy and AI provider adapter; schema validation returns editable Draft data and quality findings without persistence.

### 5.4 Limitations

- These patterns describe collaborations, not permission to add abstraction without need.
- Lifecycle validation remains feature-specific and cannot be replaced by a generic state machine without losing domain rules.
- Provider abstraction does not imply that multiple production providers are configured.
- Frontend API adapters do not make frontend state authoritative.
- Repository mocks in tests must satisfy newly introduced dependencies or tests can fail without indicating a production route defect.

### 5.5 Quality Traceability

| Pattern         | Principal quality requirements                    |
| --------------- | ------------------------------------------------- |
| Service facade  | `QR-RELIABILITY-01`, `QR-AUDIT-01`, `QR-TRACE-01` |
| Explicit state  | `QR-RELIABILITY-01`, `QR-AUDIT-01`                |
| Strategy/policy | `QR-RELIABILITY-01`, `QR-DATA-01`                 |
| Proxy/guard     | `QR-AUTH-01`, `QR-DATA-01`                        |
| Adapter         | `QR-DATA-01`, `QR-RELIABILITY-01`                 |
| Repository      | `QR-AUTH-01`, `QR-RELIABILITY-01`, `QR-PERF-01`   |

### 5.6 References

- [Architectural Requirements](architectural-requirements.md)
- [Architecture Overview](architecture-overview.md)
- [Architectural Patterns](architectural-patterns.md)
- [Quality Requirements](../srs/quality-requirements.md)

---

Previous section: [Architectural Patterns](architectural-patterns.md)

Next section: [Quality-to-Architecture Mapping](quality-architecture-mapping.md)
