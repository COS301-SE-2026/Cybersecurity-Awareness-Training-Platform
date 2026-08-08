# Technology Requirements

This section explains the technology choices used to express the Insightful Phish architecture. It starts from architectural needs and constraints, then records the selected technologies and their trade-offs. The five-layer architecture remains the organising structure.

## SAS Content

- [0. Home](README.md)
- [1. Architectural Requirements](architectural-requirements.md)
- [2. Architectural Patterns](architectural-patterns.md)
- [3. Design Patterns](design-patterns.md)
- [4. Quality to Architecture Mapping](quality-architecture-mapping.md)
- **[5. Technology Requirements](#5-technology-requirements)** &larr; _You are here_
  - [5.1 Purpose](#51-purpose)
  - [5.2 Technology Selection Criteria](#52-technology-selection-criteria)
  - [5.3 Frontend Technologies](#53-frontend-technologies)
  - [5.4 Backend and Runtime](#54-backend-and-runtime)
  - [5.5 Shared Contracts and Validation](#55-shared-contracts-and-validation)
  - [5.6 Data Management and Persistence](#56-data-management-and-persistence)
  - [5.7 Email](#57-email)
  - [5.8 Deployment](#58-deployment)
  - [5.9 Testing and Quality Tools](#59-testing-and-quality-tools)
  - [5.10 API Documentation](#510-api-documentation)
  - [5.11 Alternatives and Trade-offs](#511-alternatives-and-trade-offs)
  - [5.12 References](#512-references)
- [6. API Contracts](api-contracts.md)
- [7. Deployment and Operations](deployment.md)
- [8. Changelog](changelog.md)

---

## 5. Technology Requirements

### 5.1 Purpose

Insightful Phish needs technology choices that support role-specific workflows, training content, organisation onboarding, account management, auditability, and repeatable delivery. The selected technologies must serve the architecture rather than defining it.

The technologies below support these layer responsibilities:

- **Presentation and Browser layer:** role-specific browser workflows and dynamic frontend.
- **API and Access-Control layer:** HTTP routing, authentication, validation, rate limiting, safe error handling, and API documentation.
- **Application Services layer:** use-case implementation, policy decisions, audit actions, email flows, and training behaviour.
- **Repository and Data-Access layer:** Persistence operations, query shaping, and transaction support.
- **Persistence layer:** durable account, organisation, invitation, token, session, campaign, quiz, audit, and delivery data.

### 5.2 Technology Selection Criteria

Technology choices are evaluated against these constraints:

- **Architectural fit:** The technology must support clear separation between browser presentation, API access control, application services, data access, and persistence.
- **Security and privacy:** It must support safe authentication, validation, rate limiting, secure headers, controlled email delivery, and protection of sensitive data.
- **Maintainability:** The team should be able to evolve the technology.
- **Contract consistency:** Shared request and response rules should better align the frontend and backend work.
- **Testability:** The technology should support unit, integration, end-to-end, accessibility, coverage, and quality checks.
- **Deployment practicality:** The stack must run in development, CI, Docker Compose, and the Ubuntu-hosted deployment server.

### 5.3 Frontend Technologies

The system needs a browser-based interface that can support authenticated role-specific workflows, accessible forms, validation feedback, training content, and reusable visual conventions.

| Selected technology                                  | Architectural need served                                                                            | Rationale                                                                                                     | Constraints and trade-offs                                                                                                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React with TypeScript                                | Interactive browser workflows for trainees, organisation administrators, and platform administrators | Component-based screens fit the product's role-specific journeys while TypeScript keeps UI contracts clearer. | Browser route guards improve usability but do not replace backend authorisation. Component state must stay close to the workflow that owns it.            |
| Vite                                                 | Fast frontend development and production static builds                                               | Vite gives a quick development loop and a simple build output that can be served as static assets.            | Vite is a build tool, not an architectural boundary. Runtime access control still belongs to the backend.                                                 |
| React Router                                         | Browser navigation across public, trainee, account, organisation, and platform areas                 | Route-based navigation matches the visible user journeys.                                                     | Protected routes must be treated as presentation hints; server-side checks remain authoritative.                                                          |
| Material UI, Flowbite, Tailwind, and project styling | Reusable browser UI conventions and consistent presentation                                          | These tools help the team deliver coherent screens without building every component from scratch.             | Browser UI classes and behaviour must not be reused for email-client HTML. Accessibility must be verified rather than assumed from the component library. |
| DOMPurify                                            | Controlled browser HTML sanitisation where rich content is rendered                                  | Simulated emails and training material can require controlled HTML-like display.                              | Sanitisation must be paired with backend validation and safe content modelling; it does not make arbitrary user HTML acceptable.                          |

### 5.4 Backend and Runtime

The backend needs a secure HTTP API that can enforce authentication, organisation scope, validation, rate limits, policy checks, and workflow implementation.

| Selected technology                                       | Architectural need served                                                                               | Rationale                                                                                          | Constraints and trade-offs                                                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js                                                   | Backend runtime for API and application services                                                        | Node fits the TypeScript workspace and allows shared language across the product.                  | Runtime versions must stay aligned across local, CI, and deployed environments.                                                                |
| TypeScript                                                | Static typing across backend services, repositories, and shared contracts                               | Types make sensitive account, token, invitation, campaign, and audit flows easier to reason about. | Runtime validation is still required for external input. Types cannot prove trust boundaries by themselves.                                    |
| Express                                                   | HTTP routing and middleware composition                                                                 | Express is familiar, lightweight, and fits route/controller/service separation.                    | Express is flexible, so the project must keep access-control, controller, service, and repository responsibilities disciplined.                |
| Helmet, CORS, cookie handling, and endpoint rate limiting | API exposure, browser boundary safety, and abuse reduction                                              | These capabilities support secure authenticated and public endpoints.                              | Configuration must reflect deployment origins and endpoint sensitivity. Public routes and sensitive authenticated routes need explicit limits. |
| Central application services                              | Use-case orchestration for account, onboarding, invitation, campaign, reporting, and platform workflows | Services keep workflow decisions out of controllers and presentation code.                         | Services can become too broad if they stop following coherent user tasks.                                                                      |

### 5.5 Shared Contracts and Validation

The system needs a consistent way to validate input at trust boundaries and describe request and response data without exposing persistence internals.

| Selected technology            | Architectural need served                                                 | Rationale                                                                                                                 | Constraints and trade-offs                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Workspace shared package       | Shared DTOs, schemas, and validation rules for public API boundaries      | It reduces duplicate validation logic between browser forms, backend controllers, and tests.                              | Shared contracts should describe boundary shapes, not backend-only persistence models.                            |
| Zod                            | Runtime validation schemas with inferred TypeScript types                 | Zod keeps validation rules and static types close together.                                                               | Validation only works where schemas are actually applied. Inferred types must not be mistaken for runtime checks. |
| Open shared domain terminology | Alignment between SRS, SAS, API contracts, validation, and implementation | Consistent terms make account, organisation, invitation, token, session, campaign, and audit behaviour easier to discuss. | Terminology must be updated deliberately when the domain model changes.                                           |

### 5.6 Data Management and Persistence

The system needs durable relational storage for organisation membership, invitations, action tokens, sessions, campaign progress, quiz attempts, audit logs, and email delivery logs. These records have strong relationships and lifecycle rules, so the persistence choice must support scoped queries, transactions, and conditional updates.

| Selected technology             | Architectural need served                                         | Rationale                                                                                                                                                                                                                      | Constraints and trade-offs                                                                                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PostgreSQL                      | Durable relational persistence                                    | PostgreSQL is well suited to the relationship-heavy domain model, including users, organisations, invitations, permissions, sessions, campaigns, attempts, and audit records.                                                  | Sensitive data such as passwords and token material must be stored only in safe derived forms. Operational backup, recovery, and tuning belong in deployment and operations documentation. |
| Prisma                          | Typed data access, schema-driven modelling, and migration support | Prisma helps keep data access predictable while supporting repository boundaries and transaction-aware workflows.                                                                                                              | Application services should not expose Prisma-specific shapes to controllers or clients. The architecture should not become ORM-driven.                                                    |
| Repository/data-access boundary | Capability grouping for scoped persistence operations             | Queries, conditional updates, and transaction-aware writes are grouped under application needs such as account settings, organisation onboarding, invitation handling, campaign progress, audit logging, and delivery logging. | Repository operations should remain meaningful to workflows instead of becoming a thin public wrapper around every database call.                                                          |

### 5.7 Email

The system needs centralised transactional email delivery for account, invitation, onboarding, and organisation workflows. Email must be testable in development, configurable for production SMTP delivery, and careful not to expose tokens, credentials, raw provider errors, or unnecessary personal data.

| Selected technology                      | Architectural need served                                              | Rationale                                                                                                                       | Constraints and trade-offs                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Central backend email service            | One application boundary for rendering and sending transactional email | Workflows call a single email capability instead of calling SMTP directly. This supports consistent audit and delivery logging. | The boundary must keep provider diagnostics safe and should not hide important delivery failures.                              |
| Nodemailer and SMTP-compatible transport | Provider-neutral SMTP delivery                                         | SMTP keeps the integration portable and works with both development capture and production provider configuration.              | Provider-specific features should be introduced deliberately if they become necessary.                                         |
| MailPit                                  | Development-only email capture                                         | MailPit allows the team to inspect outgoing messages locally without sending real email.                                        | MailPit is not the production email provider and should not be described as satisfying the production SMTP requirement.        |
| Resend production SMTP                   | Production email provider direction                                    | Resend gives the production deployment a concrete SMTP-compatible provider while keeping the application boundary stable.       | Production SMTP credentials, sender verification, deliverability rules, and operational monitoring remain deployment concerns. |

### 5.8 Deployment

The system needs a repeatable deployment direction that can run the delivered product on an Ubuntu host while reducing direct public exposure and keeping environment boundaries explicit.

| Selected technology          | Architectural need served                                                                     | Rationale                                                                                                                           | Constraints and trade-offs                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Ubuntu host                  | Intended server operating environment                                                         | Ubuntu is a common, maintainable Linux target for Docker-based application hosting.                                                 | Host hardening, patching, backups, and monitoring are operational responsibilities documented outside this technology overview.            |
| Docker Compose               | Delivered product composition and environment repeatability                                   | Compose packages the runtime services needed by the product into a repeatable deployment unit, not only a local development helper. | Compose is simpler than an orchestration platform but requires disciplined environment configuration and operational runbooks.             |
| Cloudflare Tunnel and DNS    | Accepted public access direction without direct host exposure                                 | The tunnel and DNS direction allows the product to be reached through controlled Cloudflare-managed entry points.                   | Tunnel setup, DNS records, certificates, and routing procedures belong in deployment documentation.                                        |
| Cloudflare Access boundaries | Additional access boundary for protected operational or administrative surfaces               | Access can protect selected surfaces before traffic reaches the host.                                                               | Application-level authentication and authorisation remain required. Cloudflare Access does not replace backend permission checks.          |
| Environment configuration    | Runtime configuration for database, origins, email provider, and deployment-specific settings | Environment-driven configuration keeps deployment-specific values out of source code.                                               | Secrets must be supplied securely and must not appear in committed examples, logs, screenshots, or documentation beyond safe placeholders. |

### 5.9 Testing and Quality Tools

The system needs automated feedback across backend logic, frontend behaviour, contracts, accessibility, coverage, security-sensitive flows, and packaging confidence.

| Selected technology                             | Architectural need served                                                | Rationale                                                                                   | Constraints and trade-offs                                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Vitest                                          | Unit and focused integration tests across packages                       | A common runner keeps backend, frontend, and shared-package testing consistent.             | Tests must still focus on meaningful behaviours rather than private implementation details.                          |
| Supertest                                       | Backend HTTP behaviour verification                                      | It checks route/controller responses without requiring a browser.                           | Service and repository tests are still needed where workflow state or persistence behaviour matters.                 |
| Playwright and Axe                              | Browser-flow and accessibility-oriented checks                           | These tools support verification of important user journeys and accessibility expectations. | End-to-end tests are slower and should focus on high-value journeys.                                                 |
| Lighthouse CI                                   | Browser performance and accessibility feedback                           | It provides extra frontend quality signals.                                                 | Scores are guidance and must be interpreted alongside functional and accessibility tests.                            |
| ESLint, TypeScript checks, and Prettier         | Maintainability, type correctness, and formatting feedback               | These tools reduce common defects and review noise.                                         | Tooling cannot prove architectural correctness or security by itself.                                                |
| GitHub Actions, CodeQL, SonarCloud, and Codecov | CI, security analysis, maintainability feedback, and coverage visibility | Automated checks provide repeatable feedback before changes merge.                          | Coverage percentages and static analysis findings need human judgement, especially for security-sensitive workflows. |

### 5.10 API Documentation

The system needs API documentation that supports frontend/backend coordination and makes request bodies, response bodies, validation errors, status codes, and authentication requirements visible.

| Selected technology                  | Architectural need served                                       | Rationale                                                                                   | Constraints and trade-offs                                                                               |
| ------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Swagger JSDoc and Swagger UI Express | OpenAPI documentation for backend endpoints                     | Inline route documentation and generated Swagger output help keep API expectations visible. | Comments can drift if route, validation, or response changes are not reviewed together.                  |
| Shared validation schemas            | Contract evidence for documented request and response behaviour | Schemas help align implementation, tests, and API documentation.                            | API documentation still needs clear descriptions and status-code coverage; schemas alone are not enough. |

### 5.11 Alternatives and Trade-offs

The alternatives below focus on major architectural choices rather than every package in the workspace.

| Area                 | Selected direction                                                                                  | Alternatives considered                                                                                                            | Trade-off                                                                                                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend             | React, TypeScript, and Vite                                                                         | Server-rendered templates, Angular, Vue, or heavier full-stack frontend frameworks                                                 | React/Vite fit the SPA experience and team workflow, but require strong backend authority for security because browser routing is not a trust boundary.                               |
| Backend/runtime      | Express on Node.js with TypeScript                                                                  | NestJS, Fastify, Hono, or a non-TypeScript backend                                                                                 | Express is simple and familiar, but it provides fewer guardrails than an opinionated framework. The team must preserve route/controller/service/repository discipline.                |
| Validation/contracts | Zod and shared DTO-style contracts                                                                  | Duplicated frontend/backend validation, Joi/Yup/Valibot, or OpenAPI-only contracts                                                 | Shared Zod schemas reduce drift and improve testability, but schemas must stay aligned with public API behaviour and should not expose persistence internals.                         |
| Persistence          | PostgreSQL with Prisma and repository boundaries                                                    | Document-store persistence, raw SQL-only access, TypeORM, Drizzle, or another relational database                                  | PostgreSQL/Prisma fit the relational domain and typed access needs. Raw SQL can offer fine control, but using it everywhere would increase boilerplate and contract drift.            |
| Email                | Central email service with SMTP, MailPit for development, and Resend as preliminary production SMTP | Direct SMTP calls scattered through services, provider-specific SDKs everywhere, or queue-backed email delivery                    | Central SMTP delivery is portable and testable. Advanced provider features, queues, retries, and dead-letter handling should be added only when the architecture requires them.       |
| Deployment           | Ubuntu host, Docker Compose delivery, Cloudflare Tunnel, DNS, and Cloudflare Access boundaries      | Development-machine-only deployment, direct public host exposure, unmanaged manual processes, platform-as-a-service, or Kubernetes | The accepted direction is practical for the product stage and reduces direct exposure. It is less automated than a mature orchestration platform and needs clear deployment runbooks. |
| API documentation    | Swagger JSDoc, Swagger UI, and schema-aligned tests                                                 | Postman-only documentation or generated OpenAPI from routes alone                                                                  | Swagger gives readable contracts close to routes, but comments require review discipline to avoid drift.                                                                              |

### 5.12 References

- [SRS Quality Requirements](../srs/quality-requirements.md)
- [Consolidated Demo 2 SRS](../srs/README.md)
- [Demo 2 Domain Model Source](../domain-model-demo2.txt)
- [Architectural Requirements](architectural-requirements.md)
- [Architectural Patterns](architectural-patterns.md)
- [Design Patterns](design-patterns.md)
- [Deployment and Operations](deployment.md)
- [API Contracts](api-contracts.md)

---

Previous section: [Quality to Architecture Mapping](quality-architecture-mapping.md)

Next section: [API Contracts](api-contracts.md)
