# Technology Requirements

This section records verified technology capabilities, current selections, constraints, and trade-offs. Versions are taken from the current workspace manifests where stated.

## SAS Content

- [0. Home](README.md)
- [1. Introduction](introduction.md)
- [2. Architectural Requirements](architectural-requirements.md)
- [3. Architecture Overview](architecture-overview.md)
- [4. Architectural Patterns](architectural-patterns.md)
- [5. Design Patterns](design-patterns.md)
- [6. Quality-to-Architecture Mapping](quality-architecture-mapping.md)
- **[7. Technology Requirements](#7-technology-requirements)** &larr; _You are here_
- [8. API Contracts](api-contracts.md)
- [9. Deployment and Operations](deployment.md)
- [10. Privacy and Data Boundaries](privacy-and-data-boundaries.md)
- [11. Known Limitations](known-limitations.md)
- [12. Changelog](changelog.md)

---

## 7. Technology Requirements

### 7.1 Purpose

Technology choices must support the architectural requirements rather than define product behaviour by themselves. Selection favours typed contracts, maintainable package boundaries, server-side authority, relational consistency, repeatable tooling, and containerised deployment.

### 7.2 Selection Criteria

- Type safety across frontend, backend, and shared packages.
- Mature ecosystem support for browser UI and HTTP APIs.
- Schema validation at trust boundaries.
- Relational transactions, constraints, and migrations.
- Test, lint, format, accessibility, and build automation.
- Container compatibility and immutable image promotion.
- Provider abstraction for email and AI integrations.

### 7.3 Workspace and Language

| Requirement               | Current selection                                                | Architectural role                                                                       |
| ------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Workspace/package manager | pnpm `10.33.2` workspace                                         | Coordinates frontend, backend, shared package, scripts, and lockfile-controlled installs |
| Language                  | TypeScript (workspace/backend/shared `5.9.3`; frontend `~6.0.2`) | Typed application code and cross-package contracts                                       |
| Module format             | ECMAScript modules                                               | Consistent modern module loading across packages/tooling                                 |
| Runtime tooling           | Node-compatible scripts with `tsx` for backend execution         | Development server, migrations, seeds, and focused smoke tooling                         |

### 7.4 Frontend Technologies

| Technology              | Current manifest selection         | Responsibility                                                   |
| ----------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| React / React DOM       | `19.2.5`                           | Component-based presentation and feature composition             |
| React Router DOM        | `7.15.1`                           | Public, trainee, organisation, and platform route composition    |
| Vite                    | `8.0.16`                           | Development server and production frontend bundling              |
| TanStack Query          | `5.100.5`                          | Server-state fetching/caching where adopted by features          |
| Material UI / Emotion   | MUI `9.0.1`, Emotion `11.14.x`     | Shared accessible UI primitives and styling support              |
| Tailwind CSS / Flowbite | Tailwind `4.3.1`, Flowbite `4.0.2` | Existing utility/component styling conventions                   |
| DOMPurify               | `3.4.13`                           | Browser-side defensive rendering support where HTML is displayed |

Frontend code must use typed feature clients and shared contracts where available. It may perform usability filtering and transient Draft mapping but cannot be the sole enforcer of permission, lifecycle, Campaign eligibility, scoring, or adaptive resolution.

### 7.5 Backend and Runtime

| Technology         | Current manifest selection   | Responsibility                                                      |
| ------------------ | ---------------------------- | ------------------------------------------------------------------- |
| Express            | `4.21.2`                     | HTTP routes, middleware composition, controllers, and API delivery  |
| Zod                | `3.24.1`                     | Request, response, AI-output, and shared schema validation          |
| Helmet / CORS      | Helmet `8.0.0`, CORS `2.8.5` | HTTP security headers and configured cross-origin policy            |
| express-rate-limit | `8.5.1`                      | Rate limits on selected public/sensitive routes                     |
| sanitize-html      | `2.17.7`                     | Parser-based Organisation Email HTML allowlist and canonicalisation |
| Nodemailer         | `9.0.1`                      | Backend transactional email transport abstraction                   |

Backend modules preserve `Route -> Controller -> Service -> Repository -> Prisma/DB`. Provider/model settings, organisation context, and trainee evidence used by AI remain backend controlled.

### 7.6 Shared Contracts and Validation

The `@insightful-phish/shared` workspace package uses TypeScript and Zod to define reusable enums, validated DTOs, Campaign Draft/detail contracts, content schemas, and AI proposal/generation contracts. It is consumed by frontend and backend to reduce contract drift.

Shared contracts must not:

- expose Prisma models as public API by default;
- perform database access;
- replace context-sensitive service validation;
- accept provider credentials, raw organisation context, or raw trainee history from browser callers.

### 7.7 Data Management and Persistence

| Technology                | Current manifest selection                     | Responsibility                                                                 |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| PostgreSQL                | Compose/deployment-managed relational database | Durable application, lifecycle, assignment, attempt, evidence, and audit state |
| Prisma Client / CLI       | `7.0.0`                                        | Typed repository data access and migration tooling                             |
| Prisma PostgreSQL adapter | `7.0.0`                                        | PostgreSQL connection integration                                              |
| `pg`                      | `8.20.0`                                       | PostgreSQL driver used by the adapter/runtime                                  |

Repositories own Prisma calls. Database constraints support unique assignment pairs, ordered children, one adaptive alternative per difficulty, and one adaptive resolution per assignment/item. Migrations are deployed before application promotion and remain a rollback consideration.

### 7.8 Email and AI Integrations

Development email capture uses MailPit through Compose. Production transactional delivery uses the configured mail provider/SMTP boundary described by deployment configuration. Business services persist bounded delivery state and do not treat provider acceptance as proof of user receipt.

AI generation uses backend service/provider abstractions and validated structured output. The architecture does not expose Cloudflare/provider/model settings to browsers and does not claim multiple production providers merely because an abstraction exists.

### 7.9 Deployment Technologies

- Multi-stage frontend and backend Dockerfiles produce deployable images.
- Docker Compose defines local, development, and deployment service composition.
- GHCR stores revision-addressable images used by promotion scripts.
- PostgreSQL supplies durable state and migration targets.
- Cloudflare Tunnel/DNS provide the documented production routing direction where environment owners configure them.
- Release scripts promote an exact image revision, run migrations, verify health, and retain rollback inputs.

### 7.10 Testing and Quality Tools

| Tool                                | Role                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| Vitest `4.1.5`                      | Frontend, backend, and shared unit/integration suites according to package configuration |
| Testing Library                     | Component interaction and accessible query testing                                       |
| Playwright `1.61.0`                 | Browser end-to-end and selected accessibility checks                                     |
| axe-core Playwright `4.11.3`        | Automated accessibility checks for selected screens                                      |
| Lighthouse CI `0.15.1`              | Configured browser quality/performance auditing                                          |
| ESLint `10.2.1` / typescript-eslint | Static code-quality checks                                                               |
| Prettier `3.6.2`                    | Repository formatting verification                                                       |
| Supertest `7.0.0`                   | Backend route/API test requests                                                          |

These tools provide mechanisms, not automatic evidence. #574 records the executable NFR mapping and results for the identified release candidate.

### 7.11 API Documentation

The backend includes Swagger tooling, but API/Swagger completeness is not a Demo 4 quality-completion requirement. The implementation-grounded [API Contracts](api-contracts.md) page documents the relevant product boundaries for this SAS.

### 7.12 Alternatives and Trade-offs

- A modular monolith is simpler to deploy and transact than microservices, but requires disciplined feature boundaries.
- Shared Zod contracts reduce drift, but over-sharing internal fields would increase coupling and data exposure.
- Prisma improves typed repository access and migration management, but does not replace query/scoping review.
- Provider adapters reduce lock-in at the application boundary, but the configured provider still determines runtime availability and capability.
- Docker Compose supports repeatable small-environment deployment, but does not provide orchestration features expected from a larger cluster platform.

---

Previous section: [Quality-to-Architecture Mapping](quality-architecture-mapping.md)

Next section: [API Contracts](api-contracts.md)
