# Technology Requirements

This section explains the main technology choices used to express the Insightful Phish architecture. The technologies support the logical architecture, but they do not define it; the five-layer architecture remains the guiding structure for responsibilities and boundaries.

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
  - [5.4 Backend Technologies](#54-backend-technologies)
  - [5.5 Shared Contracts and Validation](#55-shared-contracts-and-validation)
  - [5.6 Data Management](#56-data-management)
  - [5.7 Deployment Technologies](#57-deployment-technologies)
  - [5.8 Testing and Quality Tools](#58-testing-and-quality-tools)
  - [5.9 Alternatives and Trade-offs](#59-alternatives-and-trade-offs)
  - [5.10 References](#510-references)
- [6. API Contracts](api-contracts.md)
- [7. Deployment and Operations](deployment.md)

## Related Architecture and Requirements

- [Demo 2 Architecture Overview](../architecture.md)
- [SRS Quality Requirements](../srs/quality-requirements.md)
- [Design Patterns](design-patterns.md)
- [Deployment and Operations](deployment.md)

---

## 5. Technology Requirements

### 5.1 Purpose

The purpose of this section is to explain the main technology choices behind Insightful Phish. The focus is on architectural need, rationale, constraints, alternatives, and trade-offs.

The selected technologies support the five-layer architecture:

- **Presentation and Browser layer:** browser interface and static frontend delivery.
- **API and Access-Control layer:** HTTP routes, request validation, authentication, rate limiting, and API documentation.
- **Application Services layer:** use-case orchestration, policy decisions, email flows, and training logic.
- **Repository and Data-Access layer:** data access boundaries and persistence-specific translation.
- **Persistence layer:** database storage, migrations, and persisted domain state.

These technologies help realise the architecture, but the architecture remains a logical design. A tool such as React, Express, Prisma, or PostgreSQL supports a layer but it is not the layer by itself.

### 5.2 Technology Selection Criteria

Technology choices are evaluated using the following criteria:

- **Architectural fit:** The technology must support clear separation between browser presentation, API access control, application services, data access, and persistence.
- **Security:** The technology must support safe authentication, validation, rate limiting, secure headers, email handling, and protection of sensitive data.
- **Maintainability:** The development team should be able to understand, test, and evolve the technology without unnecessary ceremony.
- **Contract consistency:** Shared request, response, and validation rules should reduce drift between frontend and backend work.
- **Testability:** The technology should support unit, integration, end-to-end, coverage, and accessibility checks.
- **Deployment practicality:** The stack should run in local development, CI, Docker-based demonstration environments, and the client's hosting environment.
- **Honest scope:** The documentation should not claim production-scale maturity where the repository currently shows local, CI, or demonstration-level support.

### 5.3 Frontend Technologies

| Technology                                           | Purpose                                                                                                          | Rationale                                                                                                            | Constraints and trade-offs                                                                                                                 | Architecture alignment                                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| React                                                | Builds the interactive browser interface for trainees, organisation administrators, and platform administrators. | React supports component-based screens and reuse across training, account, and administration flows.                 | Component structure can become hard to follow if state and data fetching are not kept close to the screen or workflow that owns them.      | Supports the Presentation and Browser layer.                                                       |
| Vite                                                 | Provides frontend development, building, and preview tooling.                                                    | Vite gives a fast development loop and a production static build.                                                    | Vite is a build tool, not an application architecture. Runtime behaviour must still respect the layered API boundary.                      | Supports frontend development and static build output for the Presentation and Browser layer.      |
| React Router                                         | Handles browser-side navigation between public, trainee, account, organisation, and platform views.              | Route-based navigation matches the product's user journeys and access-controlled screens.                            | Route guards in the browser are only a usability layer; backend access control remains authoritative.                                      | Supports browser navigation while relying on the API and Access-Control layer for real protection. |
| TanStack Query                                       | Manages server-state fetching, caching, and refresh behaviour in the browser.                                    | It reduces duplicated loading and error handling for API-backed screens.                                             | Cached data must be invalidated carefully after sensitive account, session, invitation, or organisation changes.                           | Supports communication from the Presentation and Browser layer to API endpoints.                   |
| Material UI, Flowbite, Tailwind, and project styling | Provide UI components, styling primitives, and visual consistency.                                               | These tools help deliver a usable interface quickly while keeping common UI behaviours consistent.                   | Browser UI styling must not be reused directly for email-client HTML, and component libraries must not replace accessibility checks.       | Supports presentation concerns only.                                                               |
| DOMPurify                                            | Sanitises HTML where controlled content must be rendered in the browser.                                         | Training and simulated email content can include HTML-like presentation needs, so sanitisation is a safety boundary. | Sanitisation must be paired with backend validation and safe content modelling; it is not a licence to render arbitrary untrusted content. | Supports browser safety in the Presentation and Browser layer.                                     |

### 5.4 Backend Technologies

| Technology                              | Purpose                                                               | Rationale                                                                                                                    | Constraints and trade-offs                                                                                                                                    | Architecture alignment                                                          |
| --------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Node.js                                 | Runs the backend service.                                             | Node.js fits the TypeScript monorepo and supports the team's shared language across frontend, backend, and shared contracts. | Runtime version consistency matters; CI uses Node 22, while local environments should stay aligned with the documented tooling.                               | Supports the API and Access-Control and Application Services layers.            |
| TypeScript                              | Provides static typing across backend code and shared contracts.      | It helps reduce contract drift and makes sensitive account, token, invitation, campaign, and audit flows easier to maintain. | Types do not replace runtime validation for external input.                                                                                                   | Supports maintainability across application and shared layers.                  |
| Express                                 | Provides HTTP routing and middleware composition for the backend API. | Express is simple, familiar, and fits the route/controller/service structure already used by the project.                    | Express gives flexibility, so the project must keep route, controller, service, and repository boundaries disciplined.                                        | Supports the API and Access-Control layer.                                      |
| Helmet, CORS, and Express rate limiting | Apply secure headers, origin control, and request-rate protection.    | These tools support safe public and authenticated API exposure.                                                              | They must be configured according to deployment origin, authentication, and endpoint sensitivity.                                                             | Supports the API and Access-Control layer.                                      |
| Nodemailer                              | Sends transactional email through SMTP-compatible providers.          | It works with local MailPit and can be configured for a real SMTP provider later.                                            | Email delivery must avoid logging secrets, raw provider errors, or token values; email-client HTML also has stricter rendering constraints than browser HTML. | Supports application service workflows through an adapter-style email boundary. |
| Swagger JSDoc and Swagger UI Express    | Generate and expose API documentation.                                | OpenAPI-style documentation helps frontend and backend work stay aligned.                                                    | Swagger comments must stay current with routes, validation, and response shapes.                                                                              | Supports the API contract boundary.                                             |

### 5.5 Shared Contracts and Validation

| Technology               | Purpose                                                           | Rationale                                                                            | Constraints and trade-offs                                                                                           | Architecture alignment                                                              |
| ------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Workspace shared package | Provides shared DTOs, schemas, and validation rules.              | A shared package reduces duplication between browser forms, API handlers, and tests. | Shared contracts should describe public boundaries, not backend persistence internals.                               | Connects the Presentation and Browser layer with the API and Access-Control layer.  |
| Zod                      | Defines runtime validation schemas and inferred TypeScript types. | Zod supports input validation at API boundaries and reusable schema tests.           | Zod validation must still be applied at the correct boundary; inferred types alone do not validate runtime requests. | Supports validation in shared contracts and API access control.                     |
| pnpm workspaces          | Manages the frontend, backend, and shared package together.       | Workspaces make local development and CI consistent across the monorepo.             | Workspace coupling should not lead to frontend code importing backend-only concepts.                                 | Supports coordinated development across layers while preserving logical boundaries. |

### 5.6 Data Management

| Technology                         | Purpose                                                                                      | Rationale                                                                                            | Constraints and trade-offs                                                                                                                                | Architecture alignment                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| PostgreSQL                         | Stores persistent account, organisation, campaign, token, session, audit, and training data. | PostgreSQL is a mature relational database suited to the platform's relationship-heavy domain model. | Schema changes must be managed carefully through migrations; sensitive values such as passwords and tokens must never be stored raw.                      | Supports the Persistence layer.                                      |
| Prisma                             | Provides schema-driven data access, generated client types, and migration tooling.           | Prisma helps keep data access consistent and typed while supporting the repository boundary.         | Prisma should not leak into presentation or controller concerns. The logical architecture must remain independent of the ORM.                             | Supports the Repository and Data-Access layer and Persistence layer. |
| `pg` and Prisma PostgreSQL adapter | Connect backend data access to PostgreSQL.                                                   | These packages support the current Prisma/PostgreSQL integration.                                    | Connection configuration must be environment-specific and should not expose credentials in logs or documentation examples beyond safe local placeholders. | Supports the data-access to persistence boundary.                    |
| Prisma migrations and seed scripts | Apply database structure and create demonstration data.                                      | They make local and CI environments repeatable.                                                      | Migration changes belong to schema-focused issues and should not be mixed into documentation-only work.                                                   | Supports controlled persistence evolution.                           |

### 5.7 Deployment Technologies

| Technology                             | Purpose                                                                                                                    | Rationale                                                                                                                     | Constraints and trade-offs                                                                                                                                      | Architecture alignment                                                              |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Docker and Docker Compose              | Run local and demonstration services together.                                                                             | Compose defines Postgres, backend, frontend, workspace tools, test database setup, and MailPit in one repeatable environment. | Compose is strong for local and demonstration use, but it is not by itself a full production operations platform.                                               | Supports deployment of all runtime layers in a controlled environment.              |
| Backend Dockerfile                     | Builds the backend runtime image and generates Prisma client assets.                                                       | It provides a repeatable backend container for Docker-based runs and CI build checks.                                         | Runtime configuration still depends on environment variables and database readiness.                                                                            | Supports backend application and data-access deployment.                            |
| Frontend Dockerfile and Nginx          | Builds the frontend static assets and serves them through Nginx.                                                           | Nginx is suitable for serving the built single-page application in a small container.                                         | Nginx here is used for static frontend delivery. The repository evidence does not show a broader reverse-proxy or edge-routing setup for production.            | Supports deployment of the Presentation and Browser layer assets.                   |
| MailPit                                | Captures SMTP email locally for development and smoke testing.                                                             | It lets the team test email flows without sending real messages.                                                              | MailPit is a local/development tool, not the production email provider.                                                                                         | Supports safe email testing for application workflows.                              |
| Environment files and Docker variables | Configure database, frontend origin, SMTP, ports, and bootstrap values.                                                    | Environment configuration keeps local settings out of source code.                                                            | Secrets must be supplied by the environment and must not be committed or printed in logs.                                                                       | Supports secure deployment configuration across layers.                             |
| Reverse proxy and tunnelling           | No dedicated Cloudflare Tunnel, Caddy, Traefik, or general Nginx reverse-proxy configuration is evident in the repository. | The document should therefore avoid claiming mature reverse-proxy or tunnelling support.                                      | If the client hosting environment requires tunnelling, TLS termination, or an external reverse proxy, that configuration must be documented in deployment work. | Treated as deployment environment responsibility until repository evidence changes. |

### 5.8 Testing and Quality Tools

| Technology                                   | Purpose                                                                                                       | Rationale                                                                          | Constraints and trade-offs                                                                                                           | Architecture alignment                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Vitest                                       | Runs backend, frontend, and shared unit tests, plus coverage reports.                                         | One test runner across packages keeps the developer workflow consistent.           | Unit tests must still be scoped to meaningful behaviours rather than implementation details.                                         | Supports quality checks across all layers.                        |
| Supertest                                    | Tests backend HTTP behaviour.                                                                                 | It verifies API responses without requiring a browser.                             | It should be paired with service and repository tests where deeper workflow behaviour matters.                                       | Supports API and Access-Control layer verification.               |
| Playwright and Axe                           | Run frontend end-to-end and accessibility-oriented checks.                                                    | These tools support browser-flow verification and accessibility smoke testing.     | End-to-end tests are slower than unit tests and should focus on critical journeys.                                                   | Supports Presentation and Browser layer verification.             |
| Lighthouse CI                                | Checks frontend quality signals such as performance and accessibility.                                        | The workflow gives useful browser-quality feedback.                                | The current workflow is marked non-blocking, so it is guidance rather than a strict release gate.                                    | Supports quality feedback for the Presentation and Browser layer. |
| ESLint, TypeScript type checks, and Prettier | Enforce code quality, type correctness, and formatting.                                                       | They reduce review noise and catch common mistakes early.                          | Tooling cannot prove architectural correctness by itself; reviews still need to check layer boundaries and security-sensitive flows. | Supports maintainability across packages.                         |
| GitHub Actions CI                            | Runs formatting, linting, typechecking, tests, builds, coverage upload, Docker checks, and integration setup. | CI provides repeatable feedback before changes merge.                              | CI depends on reliable test data, generated Prisma clients, and correct environment configuration.                                   | Supports verification of the whole system.                        |
| Codecov                                      | Collects coverage and test-result feedback from CI.                                                           | Coverage helps highlight untested areas in backend, frontend, and shared packages. | Coverage percentages do not replace focused tests for sensitive behaviours.                                                          | Supports quality monitoring.                                      |
| Docker CI                                    | Validates Docker Compose config and container builds.                                                         | This catches packaging and configuration drift.                                    | Some Docker build jobs are currently allowed to continue on error, so they should be read as feedback until made blocking.           | Supports deployment confidence.                                   |

### 5.9 Alternatives and Trade-offs

| Area               | Selected direction                                          | Alternatives considered or available                                      | Trade-off                                                                                                                                      |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend framework | React with Vite                                             | Angular, Vue, server-rendered templates                                   | React and Vite fit the team's current SPA approach, but they require discipline around client-side state and access-control assumptions.       |
| Backend framework  | Express with TypeScript                                     | NestJS, Fastify, Hono                                                     | Express is familiar and lightweight, but it provides fewer architectural guardrails than a more opinionated framework.                         |
| Validation         | Zod shared schemas                                          | Joi, Yup, Valibot, hand-written validation                                | Zod keeps runtime validation and TypeScript types close together, but schemas must be maintained carefully as contracts evolve.                |
| Data access        | Prisma with PostgreSQL                                      | Direct SQL, Drizzle, TypeORM, another relational database                 | Prisma improves typed data access and migrations, but the architecture must avoid becoming ORM-driven.                                         |
| Email              | Nodemailer with SMTP and MailPit locally                    | Provider-specific SDKs, queue-backed email delivery                       | SMTP support is portable and easy to test locally, but advanced provider features and retry queues are outside the current evidence.           |
| Deployment         | Docker Compose for local and demonstration environments     | Kubernetes, platform-as-a-service deployment, manually configured servers | Compose is practical for demos and repeatable local runs, but production hardening still depends on the client's hosting and operations setup. |
| API documentation  | Swagger JSDoc and Swagger UI                                | OpenAPI generated from route schemas, Postman-only documentation          | Swagger comments are readable and useful, but they can drift if updates are not reviewed with route changes.                                   |
| Quality tooling    | Vitest, Playwright, Lighthouse, ESLint, TypeScript, Codecov | Separate specialised tools per layer                                      | Shared tooling keeps the workflow manageable, but no single tool proves the system is secure or accessible on its own.                         |

### 5.10 References

- [Demo 2 Architecture Overview](../architecture.md)
- [SRS Quality Requirements](../srs/quality-requirements.md)
- [Design Patterns](design-patterns.md)
- [Deployment and Operations](deployment.md)
- [API Contracts](api-contracts.md)
- [Root package scripts](../../../package.json)
- [Frontend package scripts and dependencies](../../../apps/frontend/package.json)
- [Backend package scripts and dependencies](../../../apps/backend/package.json)
- [Shared package scripts and dependencies](../../../packages/shared/package.json)
- [Docker Compose configuration](../../../docker-compose.yml)
- [Continuous Integration workflow](../../../.github/workflows/ci.yml)
- [Docker CI workflow](../../../.github/workflows/docker.yml)
- [Lighthouse CI workflow](../../../.github/workflows/lighthouse.yml)

---

Previous section: [Quality to Architecture Mapping](quality-architecture-mapping.md)

Next section: [API Contracts](api-contracts.md)
