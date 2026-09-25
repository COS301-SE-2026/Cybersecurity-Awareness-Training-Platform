# Architecture Overview

## SAS Content

- [0. Home](README.md)
- **[1. Architecture Overview](#1-architecture-overview)** &larr; _You are here_
- [2. API Contracts](api-contracts.md)
- [3. Deployment and Operations](deployment.md)
- [4. Privacy and Data Boundaries](privacy-and-data-boundaries.md)
- [5. Known Limitations](known-limitations.md)

---

## 1. Architecture Overview

### 1.1 Logical Architecture

The browser application is a React and TypeScript frontend. It renders public, trainee, organisation-administrator, and platform-administrator workflows, maintains transient form/editor state, and calls the backend through typed clients. Browser checks improve usability but are not trusted for authorisation, tenant isolation, lifecycle enforcement, or adaptive decisions.

Shared TypeScript schemas define provider-neutral request and response contracts, validation rules, enums, and DTOs consumed by both applications. The shared package does not perform authentication, business orchestration, or persistence.

The Express backend follows this normal dependency direction:

```text
React page or feature
  -> typed API client and shared contract
  -> Express route and controller
  -> application/domain service
  -> repository
  -> Prisma Client
  -> PostgreSQL
```

- **Routes and controllers** authenticate requests, validate transport input, apply rate limits where configured, establish actor context, call one service operation, and translate expected errors into safe HTTP responses.
- **Services** enforce permissions, organisation scope, lifecycle rules, domain validation, and multi-step workflow ordering.
- **Repositories** contain Prisma queries, scoped projections, transactions, and concurrency-sensitive persistence.
- **PostgreSQL** stores accounts, organisations, reusable content, Campaign graphs, assignments, attempts, interactions, resolutions, notifications, and audit data.

Cross-cutting middleware and services provide authentication, validation, rate limiting, error translation, notification delivery, audit recording, and backend-controlled organisation context.

### 1.2 Reusable-Content Architecture

Training Document, Quiz, Organisation Email, and Simulated Inbox authoring use dedicated React builders and backend services. Each builder maps shared Draft contracts into editable frontend state and persists through its normal API. Lifecycle services determine when content becomes immutable and Campaign-eligible.

The Campaign Builder does not copy full content bodies into Campaign state. It loads a scoped catalogue and saves references to eligible reusable content through the canonical `COMPONENT`, `ADAPTIVE`, and `GROUP` graph. Backend validation rechecks ownership, lifecycle status, content type, category compatibility, Quiz occurrence settings, and graph structure before persistence.

Active-to-Draft copy converts the source graph back through the same validated Draft persistence path. This creates fresh structural identities and deliberately excludes trainee runtime records.

### 1.3 Trainee Runtime and Adaptive Resolution

Trainee Campaign services load assignments and ordered items through trainee-scoped repositories. Content routes verify the authenticated Trainee Profile, assignment, Campaign Item, prerequisites, and current Campaign eligibility before returning activity data.

For a normal component, the Campaign Item directly identifies the selected reusable content. For an adaptive item:

1. the backend loads category-specific evidence for the trainee;
2. the deterministic category-state engine selects `EASY`, `MEDIUM`, or `HARD` from evidence, recency, and sufficiency rules;
3. the resolution repository validates that the candidate alternative belongs to the same Campaign Item and Assignment;
4. the selected content and basis are persisted under a unique assignment-item key;
5. concurrent requests read the winning record, and later requests reuse it.

AI is not involved in runtime difficulty selection. Quiz and Simulated Inbox evidence produced through resolved adaptive content is matched against the persisted selected content rather than an absent direct component foreign key.

### 1.4 AI Generation Boundary

AI functionality is backend-mediated. Domain services construct structured generation requests and depend on the provider-neutral `AiGenerationProvider` interface. The configured provider adapter owns provider authentication, transport, timeout, and provider-error translation. Generated output is parsed against an application schema before it reaches a builder or proposal response.

For organisation-scoped generation, the backend loads only approved AI-usable organisation context through repositories. The browser supplies administrator intent such as topic, objective, requested categories, or difficulty; it does not supply raw organisation records, trainee history, provider credentials, model selection, or algorithm tuning.

The implemented AI flows are:

- **Normal builder generation:** returns editable Training Document, Quiz, or Organisation Email Draft data to the existing builder.
- **Missing variant:** combines a bounded same-type source concept with target difficulty and categories, generates through the relevant normal content generator, and returns quality findings to that builder.
- **Complete Campaign proposal:** returns transient editable Campaign metadata, rationale, findings, and proposed content Drafts.
- **Follow-up Campaign proposal:** computes trainee category state on the backend, then returns a transient editable suggestion.

AI output cannot save or activate reusable content, publish a Quiz, approve a Simulation, attach inactive content to a Campaign, resolve trainee difficulty, save or activate a Campaign, assign a trainee, or send real email. Those actions remain in existing reviewed lifecycle and permission boundaries.

### 1.5 Security and Tenant Boundaries

- Authentication establishes the User and active session; services establish the applicable organisation and permission scope.
- Organisation repositories constrain tenant-owned records by Organisation ID and actor eligibility.
- Platform administration uses platform-role checks rather than organisation permissions.
- Campaign management uses `VIEW_CAMPAIGNS` or `MANAGE_CAMPAIGNS` according to the operation; assignment uses the separate `ASSIGN_CAMPAIGNS` authority.
- Trainee access uses the authenticated Trainee Profile and assignment/enrolment relationship, with safe-not-found behavior where revealing another trainee's resource would leak information.
- AI and audit boundaries exclude credentials, raw tokens, provider secrets, and unrestricted sensitive context.

### 1.6 Deliberate Architecture Limits

The architecture does not include a Live Quiz subsystem. Phishing-portal and real-email support artifacts do not form a complete administrator launch, scheduling, pause, or send architecture and are therefore not represented as a Demo 4 product flow.

The Demo 3 Draw.io architecture image is not reused because it predates the current Campaign graph, content lifecycle, adaptive-resolution, and AI boundaries. This page is the authoritative logical description until a reconciled diagram source is produced in a focused diagram update.

---

Previous section: [SAS Home](README.md)

Next section: [API Contracts](api-contracts.md)
