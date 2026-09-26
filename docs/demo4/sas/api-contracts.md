# API Contracts

## SAS Content

- [0. Home](README.md)
- [1. Introduction](introduction.md)
- [2. Architectural Requirements](architectural-requirements.md)
- [3. Architecture Overview](architecture-overview.md)
- [4. Architectural Patterns](architectural-patterns.md)
- [5. Design Patterns](design-patterns.md)
- [6. Quality-to-Architecture Mapping](quality-architecture-mapping.md)
- [7. Technology Requirements](technology-requirements.md)
- **[8. API Contracts](#8-api-contracts)** &larr; _You are here_
  - [8.1 Contract Authority](#81-contract-authority)
  - [8.2 Shared Contract Boundary](#82-shared-contract-boundary)
  - [8.3 Access and Error Conventions](#83-access-and-error-conventions)
  - [8.4 Demo 4 Contract Areas](#84-demo-4-contract-areas)
  - [8.5 Lifecycle and AI Boundaries](#85-lifecycle-and-ai-boundaries)
- [9. Deployment and Operations](deployment.md)
- [10. Privacy and Data Boundaries](privacy-and-data-boundaries.md)
- [11. Known Limitations](known-limitations.md)
- [12. Changelog](changelog.md)

---

## 8. API Contracts

### 8.1 Contract Authority

The running backend exposes its generated OpenAPI 3 specification through the Swagger UI at `/api-docs`. The specification is assembled from the backend Swagger configuration and route annotations, so it is the documentation entry point for implemented HTTP methods, paths, parameters, request bodies, response bodies, and status codes.

This SAS deliberately does not duplicate an endpoint-by-endpoint route catalogue. A handwritten list would drift as routes and annotations change. For exact API details, run the backend and inspect `/api-docs`; for implementation review, follow the mounted route modules and the shared schemas they consume.

| Concern                                                   | Authority                                                                         |
| --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| HTTP methods, paths, parameters, and documented responses | Generated OpenAPI specification at `/api-docs`                                    |
| Runtime route mounting and middleware order               | Backend application and route modules                                             |
| Validated request and response shapes                     | Zod schemas and TypeScript contracts in `@insightful-phish/shared`, where defined |
| Permission, tenant, lifecycle, and eligibility rules      | Backend services and repositories                                                 |
| Persisted relational structure                            | Prisma schema and migrations                                                      |

### 8.2 Shared Contract Boundary

The frontend and backend consume shared schemas for reusable-content Drafts, Quiz questions and options, Campaign Draft/detail structures, adaptive alternatives, AI generation/proposal messages, pagination, and common errors. Backend parsing establishes the transport shape before application services apply actor- and state-dependent rules.

Shared contracts remain provider-neutral and persistence-neutral. They do not expose Prisma records directly, carry AI provider credentials or model settings, or allow the browser to submit raw organisation context or trainee history as authoritative AI input.

The canonical Campaign item contract is a discriminated union:

- `COMPONENT` references one eligible `TRAINING_DOCUMENT`, `QUIZ`, or `SIMULATED_INBOX` occurrence;
- `ADAPTIVE` fixes one component type and provides exact `EASY`, `MEDIUM`, and `HARD` eligible alternatives with the same non-empty category set;
- `GROUP` contains direct `COMPONENT` or `ADAPTIVE` children and cannot contain another group.

Quiz occurrences carry `maxAttempts` and `BEST`, `LATEST`, or `AVERAGE` score policy. Non-Quiz occurrences omit those Quiz-only settings.

### 8.3 Access and Error Conventions

Protected routes require an authenticated active session. Organisation operations establish organisation membership and the dedicated permission for the requested action. Platform operations use platform-administrator authority. Trainee content operations resolve the authenticated Trainee Profile and assignment or enrolment rather than trusting a browser-supplied trainee identity.

Organisation IDs, content ownership, Campaign ownership, assignment scope, and reusable-content eligibility are revalidated on the backend. Cross-scope trainee resources may use safe-not-found behaviour where disclosing existence would create an enumeration risk.

Validation failures, permission failures, lifecycle conflicts, stale updates, and unavailable resources are translated to bounded public errors. Internal provider errors, credentials, stack traces, raw tokens, and sensitive organisation or trainee context are not part of public error contracts.

### 8.4 Demo 4 Contract Areas

The generated OpenAPI documentation groups the current HTTP surface around these implemented areas:

| Area                                     | Contract responsibility                                                                                                      |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Authentication and accounts              | Registration, verification, login/logout, recovery, invitations, setup, sessions, and supported account changes              |
| Organisation and platform administration | Registration review, membership, administrators, permissions, security settings, and organisation lifecycle                  |
| Reusable content                         | Training Document, Quiz, Organisation Email, and Simulated Inbox authoring and lifecycle operations                          |
| Campaign management                      | Scoped catalogues, canonical Draft graphs, lifecycle transitions, Active-to-Draft copy, and statistics                       |
| Assignment and trainee access            | Eligible assignment candidates, direct assignment/unassignment, platform self-enrolment, and trainee-scoped Campaign content |
| Quiz attempts                            | Safe Quiz reads, in-progress attempt reuse, bounded repeat attempts, submission, scoring, and post-submission results        |
| Adaptive runtime                         | Backend category state and persisted per-assignment/item content resolution                                                  |
| AI assistance                            | Builder generation, bounded missing-variant generation, and transient complete/follow-up Campaign proposals                  |

This table describes architectural responsibilities, not substitute endpoint documentation. The exact current path and schema remain in `/api-docs` and the shared contracts.

### 8.5 Lifecycle and AI Boundaries

API acceptance does not bypass product lifecycle rules. Generated Training Documents, Quizzes, and Organisation Emails return editable Draft-shaped data to their normal builders. Administrators explicitly save and perform the applicable activation, publication, or approval action before content becomes Campaign-eligible.

An Organisation Email is not itself a Campaign-eligible Simulated Inbox. It must pass through the normal Simulation/Simulated Inbox authoring and approval lifecycle before an eligible Simulation reference exists.

Complete and follow-up Campaign proposal responses are transient suggestions. Proposal-local keys and generated Draft payloads are not persisted as Campaign content references. Only eligible persisted content IDs can enter the existing Campaign Builder, and ordinary Campaign save/activation and assignment operations remain authoritative.

AI endpoints cannot save or activate content, publish a Quiz, approve a Simulation, save or activate a Campaign, assign a trainee, choose adaptive difficulty, or send real email.

---

Previous section: [Technology Requirements](technology-requirements.md)

Next section: [Deployment and Operations](deployment.md)
