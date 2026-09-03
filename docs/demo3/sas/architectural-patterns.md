# Architectural Patterns

This section describes the architectural patterns used to organise Insightful Phish and explains how they interact, what qualities they support, and where their limitations apply.

## SAS Content

- [0. Home](README.md)
- [1. Introduction](introduction.md)
- [2. Architectural Requirements](architectural-requirements.md)
- [3. Architecture Overview](architecture-overview.md)
- **[4. Architectural Patterns](#4-architectural-patterns)** &larr; _You are here_
  - [4.1 Purpose](#41-purpose)
  - [4.2 Architectural Context](#42-architectural-context)
  - [4.3 Architectural Patterns](#43-architectural-patterns)
  - [4.4 Layer Responsibilities](#44-layer-responsibilities)
  - [4.5 Pattern Interactions](#45-pattern-interactions)
  - [4.6 Limitations](#46-limitations)
  - [4.7 Quality Traceability](#47-quality-traceability)
- [5. Design Patterns](design-patterns.md)
- [6. Quality to Architecture Mapping](quality-architecture-mapping.md)
- [7. Technology Requirements](technology-requirements.md)
- [8. API Contracts](api-contracts.md)
- [9. Deployment and Operations](deployment.md)
- [10. Changelog](changelog.md)

---

## 4. Architectural Patterns

### 4.1 Purpose

The selected patterns provide a practical structure for a browser-based modular application while keeping business workflows, access control, and persistence concerns separated.

### 4.2 Architectural Context

Insightful Phish supports several related domains, including authentication, organisations, campaigns, training content, quizzes, simulations, email, and audit. These capabilities share one deployed application and database but require clear internal boundaries.

### 4.3 Architectural Patterns

- **Client-server:** The browser client communicates with a server-side API. The server remains authoritative for validation, authentication, access control, and business rules.
- **Layered architecture:** Responsibilities are divided between presentation, API access control, application services, repositories, and persistence.
- **Service layer:** Application services coordinate complete use cases and provide a boundary for workflow and transaction logic.
- **Repository and data-access separation:** Repositories isolate persistence queries and writes from application workflows.
- **Shared-contract support:** Shared request, response, and validation structures reduce avoidable client-server contract drift.

### 4.4 Layer Responsibilities

The browser presents information and invokes API contracts. The API boundary validates and authorises requests. Application services coordinate use cases. Repositories isolate data access. The persistence layer stores durable state.

Shared contracts support the presentation, API, and service layers, but do not replace server-side validation or form an additional processing layer.

### 4.5 Pattern Interactions

Client-server communication enters the layered architecture through the API boundary. The service-layer pattern keeps business workflows outside controllers, while repositories prevent persistence concerns from spreading into services.

Email and audit services are invoked by application services and use adapters or repositories for external delivery and persistence.

### 4.6 Limitations

- Layers can become superficial if controllers or services bypass their intended boundaries.
- A repository does not automatically guarantee correct access control or organisation isolation.
- Shared contracts can create coupling if internal persistence models are exposed as public contracts.

### 4.7 Quality Traceability

| Pattern                  | Supported qualities                    | Important trade-off                                       |
| ------------------------ | -------------------------------------- | --------------------------------------------------------- |
| Client-server            | Security and consistent access control | The API can become a bottleneck                           |
| Layered architecture     | Maintainability and testability        | Additional boundaries add code and coordination           |
| Service layer            | Consistent workflows and transactions  | Services can grow too large                               |
| Repository separation    | Testability and persistence isolation  | Poor repository design can hide inefficient queries       |
| Shared contracts         | Contract consistency                   | Excessive sharing increases coupling                      |
| Email and audit services | Reuse and accountability               | External delivery and audit persistence add failure paths |

---

Previous section: [Architecture Overview](architecture-overview.md)

Next section: [Design Patterns](design-patterns.md)
