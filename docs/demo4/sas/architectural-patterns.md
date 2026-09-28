# Architectural Patterns

This section describes the system-level patterns used to organise Insightful Phish, their interactions, and their limitations.

## SAS Content

- [0. Home](README.md)
- [1. Introduction](introduction.md)
- [2. Architectural Requirements](architectural-requirements.md)
- [3. Architecture Overview](architecture-overview.md)
- **[4. Architectural Patterns](#4-architectural-patterns)** &larr; _You are here_
- [5. Design Patterns](design-patterns.md)
- [6. Quality-to-Architecture Mapping](quality-architecture-mapping.md)
- [7. Technology Requirements](technology-requirements.md)
- [8. API Contracts](api-contracts.md)
- [9. Deployment and Operations](deployment.md)
- [10. Privacy and Data Boundaries](privacy-and-data-boundaries.md)
- [11. Known Limitations](known-limitations.md)
- [12. Changelog](changelog.md)

---

## 4. Architectural Patterns

### 4.1 Purpose

The selected patterns organise a browser-based modular application while keeping workflow, security, persistence, external-provider, and deployment concerns explicit.

### 4.2 Architectural Context

Authentication, organisations, reusable content, Campaigns, Quiz participation, simulations, adaptive learning, AI assistance, email, and audit share one application and PostgreSQL database. Feature modules provide ownership boundaries inside that deployment rather than pretending the system is composed of independent microservices.

### 4.3 Patterns

#### Client-server

The React browser communicates with an Express API. The server is authoritative for identity, permissions, tenant scope, validation, lifecycle, scoring, adaptive resolution, and persistence. Client-side filtering improves usability but never replaces backend checks.

#### Layered architecture

Backend dependencies flow through route/middleware, controller, service, repository, and Prisma/database layers. Cross-cutting authentication, auditing, email, and AI abstractions enter through explicit boundaries rather than bypassing feature ownership.

#### Service layer

Application services coordinate complete use cases, including lifecycle transitions, assignment, Quiz submission, adaptive resolution, and AI orchestration. They combine repositories and supporting services while remaining independent of HTTP rendering.

#### Repository/data-access separation

Repositories own Prisma calls, query shape, persistence transactions, and bounded data projections. This keeps database concerns out of controllers and prevents services from spreading direct persistence access.

#### Modular monolith

Frontend features, backend routes/controllers/services/repositories, and shared contracts are grouped by capability while deploying as one frontend and one backend. This supports coherent transactions and simpler operations while requiring disciplined module boundaries.

#### Shared-contract support

The shared workspace package defines reusable Zod schemas, enums, and TypeScript contracts for API and Campaign structures. Both clients and backend consume these definitions, while backend services remain authoritative for context-sensitive validation.

#### Ports and adapters for external providers

Email and AI workflows depend on application-facing abstractions. Provider-specific SMTP or AI details remain behind adapters/provider implementations and are not accepted from browser requests.

### 4.4 Layer Responsibilities

| Layer                          | Responsibility                                                                                 | Must not own                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Frontend presentation/features | Views, forms, transient editor state, typed client calls, safe user feedback                   | Authoritative permission, lifecycle, scoring, or adaptive decisions |
| Routes and middleware          | HTTP registration, authentication, rate limiting, organisation access, permissions, validation | Feature workflow or Prisma queries                                  |
| Controllers                    | HTTP input/output mapping and service invocation                                               | Persistence orchestration or provider implementation                |
| Services                       | Business workflows, lifecycle, transactions, policy coordination                               | Ad hoc route concerns or direct feature Prisma access               |
| Repositories                   | Scoped persistence queries, writes, projections, Prisma transactions                           | UI behaviour or external HTTP semantics                             |
| Prisma/PostgreSQL              | Durable relations, constraints, indexes, migrations                                            | Application workflow decisions                                      |
| Shared package                 | Cross-package schemas, enums, and public contracts                                             | Database access or organisation-context assembly                    |

### 4.5 Pattern Interactions

A browser action enters the client-server boundary through a typed API client. Route middleware authenticates and scopes the request. A controller maps validated input to a service. The service coordinates domain policy and repository calls. Repositories read/write PostgreSQL through Prisma and return bounded results. External email or AI work is invoked through its abstraction and validated before state or output crosses the boundary.

Campaign authoring demonstrates the interaction: frontend editor state maps to the shared canonical Draft contract; backend services validate graph/content/lifecycle rules; repositories persist the graph. Trainee adaptive access then uses separate runtime services/repositories to resolve and persist selected content without modifying the Campaign Draft.

### 4.6 Limitations and Trade-offs

- Layering adds interfaces and mapping work; bypassing it would erode testability and security boundaries.
- A repository does not automatically guarantee tenant isolation; callers and queries must use the correct scoped operation.
- Shared contracts can create coupling if persistence-only fields are exposed as public DTOs.
- A modular monolith allows coherent transactions but requires review discipline to avoid feature-boundary leakage.
- External adapters reduce provider coupling but cannot remove provider outages or malformed output; validation and truthful failure states remain necessary.

### 4.7 Quality Traceability

| Pattern               | Supported quality                  | Principal trade-off                                     |
| --------------------- | ---------------------------------- | ------------------------------------------------------- |
| Client-server         | `QR-AUTH-01`, `QR-DATA-01`         | Backend availability and latency affect all clients     |
| Layered architecture  | `QR-TRACE-01`, `QR-RELIABILITY-01` | More boundaries and mappings                            |
| Service layer         | `QR-RELIABILITY-01`, `QR-AUDIT-01` | Services can become too broad without feature ownership |
| Repository separation | `QR-AUTH-01`, `QR-RELIABILITY-01`  | Poor query design can hide performance cost             |
| Shared contracts      | `QR-TRACE-01`, `QR-DATA-01`        | Excessive sharing can expose internal shape             |
| Provider adapters     | `QR-DATA-01`, `QR-RELIABILITY-01`  | External failures still require handling                |
| Immutable deployment  | `QR-DEPLOY-01`                     | Requires revision and migration discipline              |

---

Previous section: [Architecture Overview](architecture-overview.md)

Next section: [Design Patterns](design-patterns.md)
