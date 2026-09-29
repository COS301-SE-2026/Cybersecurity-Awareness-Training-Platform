# Architectural Requirements

This section identifies the principal drivers, responsibilities, constraints, interfaces, and quality concerns that shape the Insightful Phish architecture.

## SAS Content

- [0. Home](README.md)
- [1. Introduction](introduction.md)
- **[2. Architectural Requirements](#2-architectural-requirements)** &larr; _You are here_
  - [2.1 Purpose](#21-purpose)
  - [2.2 Architectural Drivers](#22-architectural-drivers)
  - [2.3 Architectural Responsibilities](#23-architectural-responsibilities)
  - [2.4 Architectural Constraints](#24-architectural-constraints)
  - [2.5 Interfaces and Integration](#25-interfaces-and-integration)
  - [2.6 Quality Requirements](#26-quality-requirements)
  - [2.7 Traceability](#27-traceability)
- [3. Architecture Overview](architecture-overview.md)
- [4. Architectural Patterns](architectural-patterns.md)
- [5. Design Patterns](design-patterns.md)
- [6. Quality to Architecture Mapping](quality-architecture-mapping.md)
- [7. Technology Requirements](technology-requirements.md)
- [8. API Contracts](api-contracts.md)
- [9. Deployment and Operations](deployment.md)
- [10. Changelog](changelog.md)

---

## 2. Architectural Requirements

### 2.1 Purpose

The architectural requirements translate the main SRS responsibilities and quality expectations into system-wide architecture concerns.

### 2.2 Architectural Drivers

The primary architectural drivers are:

- Secure authentication, sessions, and tokenised account actions
- Role, permission, and organisation boundary enforcement
- Reliable organisation onboarding and invitation workflows
- Modular Campaign, Training Document, Quiz, Simulated Inbox, and real-email simulation behaviour
- Safe external email delivery
- Accountable audit logging
- Maintainable and testable responsibility boundaries
- Reliable database transactions and deployment migrations
- Scheduled real-email simulations, managed portals, and Campaign Insights
- Organisation SMTP profiles and external secret storage
- Backend-controlled AI drafting and Campaign proposals

### 2.3 Architectural Responsibilities

See the Architecture Layer responsibilities [here](architecture-overview.md#33-layer-responsibilities).

### 2.4 Architectural Constraints

- The application is a browser client communicating with a server-side API
- Authoritative validation and access control must occur on the server
- Sensitive values must not be exposed through responses, logs, email records, or audit metadata
- Business workflows are coordinated by application services
- Persistent access is isolated behind repositories
- External email failure must not silently corrupt business state
- Database migrations must be considered when deploying or rolling back releases
- Shared contracts may support multiple layers but must not become the business logic layer

### 2.5 Interfaces and Integration

- The presentation layer communicates with the API using documented HTTP contracts
- The API invokes application services rather than coordinating persistence directly
- Application services use repository operations to access stored data
- Repositories use Prisma to communicate with PostgreSQL
- The email dispatcher and phishing simulation worker run inside the backend process
- The email service communicates with platform and organisation SMTP providers through an adapter
- PostgreSQL stores SMTP profile metadata while Infisical stores organisation SMTP passwords
- AI services communicate with Workers AI through a provider adapter
- Managed portal routes use configured public simulation origins
- Deployment integrates with container-image storage, database migration, and runtime health checks

### 2.6 Quality Requirements

The architecture responds to the SRS quality requirements through server-side access control, safe data handling, layer separation, repository isolation, transaction boundaries, health checks, audit records, shared contracts, and controlled external-service adapters.

### 2.7 Traceability

| Requirement area                  | Architectural response                                                  |
| --------------------------------- | ----------------------------------------------------------------------- |
| Authentication and account access | API access control, session handling, token services, repositories      |
| Organisation management           | Organisation-scoped services and repositories                           |
| Campaign composition and insights | Campaign services, statistics services, and Campaign repositories       |
| Quizzes and simulations           | Application services, reusable content boundaries, interaction records  |
| Email delivery                    | Email dispatcher, simulation worker, SMTP adapters, and repositories    |
| Managed portals                   | Public routes, portal services, token handling, and interaction records |
| AI assistance                     | AI services, backend context, schema validation, and provider adapter   |
| Audit and oversight               | Audit service and audit repository                                      |
| Reliability and deployment        | Transactions, migrations, health checks, and guarded deployment         |

---

Previous section: [Introduction](introduction.md)

Next section: [Architecture Overview](architecture-overview.md)
