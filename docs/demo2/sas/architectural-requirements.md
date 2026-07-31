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

The architectural requirements translate the main SRS responsibilitties and quality expectations into system-wide archtecture concerns.

### 2.2 Architectural Drivers

The primary architectural drivers are:

- Secure authentication, sessions and tokenised account actions
- Role, Permission and Organisation Boundary enforcement.
- Reliable Organisation Onboarding and Invitation Workflows
- Modular Campaign, Training, Quiz and Simulated behavour
- Safe external email delivery
- Accountable audit logging
- Mainainable and testible responsibility boundaries
- Reliable database transactions and deployment migrations

### 2.3 Architectural Responsibilities

See the Architecture Layer responsibilities [here](architecture-overview.md#33-layer-responsibilities).

### 2.4 Architectural Constraints

- The application is a browser client communicating with a server-side API
- Authoritive validation and access constrol must occur on the server
- Senitive values must not be exposed through responses, logs, email records or audit metadata
- Business workflows should be coordinated by application services
- Persistent access should be isolated behing repositories
- External email failure should not silently corrupt business state
- Database migrations must be considered when deploying or rolling back releases
- Shared contracts may support multiple layuers but must not become the business logic layer

### 2.5 Interfaces and Integration

- The presentation layer communicates with the API using documented HTTP contracts
- The API invokes application services rather than coordinating persistence directly
- Application services use repository operations to access stored data
- Repositories communicate with the persistence layer
- The email service communicates with an external mail server through an adapter
- Deployment integrates with container-image storage, database migration and runtime health checks

### 2.6 Quality Requirements

The architecture responds to the SRS quality requirements through server-side access control, safe data handling, layer separation, repository isolation, transaction boundaries, health checks, audit records, shared contracts, and controlled external-service adapters.

### 2.7 Traceability

| Requirement area                  | Architectural response                                                 |
| --------------------------------- | ---------------------------------------------------------------------- |
| Authentication and account access | API access control, session handling, token services, repositories     |
| Organisation management           | Organisation-scoped services and repositories                          |
| Campaign participation            | Campaign services, content services, assignment repositories           |
| Quizzes and simulations           | Application services, reusable content boundaries, interaction records |
| Email delivery                    | Email service and external mail adapter                                |
| Audit and oversight               | Audit service and audit repository                                     |
| Reliability and deployment        | Transactions, migrations, health checks, and guarded deployment        |

---

Previous section: [Introduction](introduction.md)

Next section: [Architecture Overview](architecture-overview.md)
