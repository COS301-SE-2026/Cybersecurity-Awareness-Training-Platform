# Introduction

This section defines the purpose, scope, audience, structure, and context of the Demo 4 Software Architecture Specification.

## SAS Content

1. **[Introduction](#1-purpose)** &larr; _You are here_
2. [Architectural Requirements](architectural-requirements.md)
3. [Architecture Overview](architecture-overview.md)
4. [Architectural Patterns](architectural-patterns.md)
5. [Design Patterns](design-patterns.md)
6. [Quality-to-Architecture Mapping](quality-architecture-mapping.md)
7. [Technology Requirements](technology-requirements.md)
8. [API Contracts](api-contracts.md)
9. [Deployment and Operations](deployment.md)
10. [Privacy and Data Boundaries](privacy-and-data-boundaries.md)
11. [Known Limitations](known-limitations.md)
12. [Changelog](changelog.md)

---

## 1. Purpose

This SAS describes how Insightful Phish is organised to satisfy the implemented Demo 4 requirements. It records system boundaries, dependency direction, technology constraints, recurring patterns, security and persistence responsibilities, external integrations, deployment mechanics, and the architectural response to quality requirements.

The SAS is not a source-code inventory. It explains the stable architectural decisions needed to understand and maintain the product while linking to implementation areas where detail matters.

## 2. Scope

The architecture covers:

- the React browser application and its route/feature boundaries;
- the Express API, controllers, services, repositories, and cross-cutting middleware;
- shared Zod schemas and TypeScript contracts;
- Prisma/PostgreSQL persistence and migration ownership;
- authentication, organisation tenancy, permissions, audit, and transactional email;
- reusable-content authoring and lifecycle;
- Campaign composition, assignment, trainee runtime, Quiz attempts, and adaptive resolution;
- provider-neutral AI generation and proposal boundaries;
- container build, SHA-based promotion, migration, health, and rollback mechanics.

Incomplete real-email Campaign artifacts and Live Quiz are not represented as delivered architecture flows.

## 3. Intended Audience

This specification is intended for developers, reviewers, operators, maintainers, Southern Cross Solutions, and COS301 assessors who need to understand architectural responsibilities and trade-offs.

## 4. Document Structure

1. Architectural Requirements translates SRS drivers into constraints and responsibilities.
2. Architecture Overview describes the logical layers, dependency direction, diagrams, shared contracts, and major Demo 4 flows.
3. Architectural Patterns records the system-level organisation and pattern interactions.
4. Design Patterns documents recurring implementation collaborations and limitations.
5. Quality-to-Architecture Mapping maps the final eight quality requirements to tactics without duplicating #574 evidence.
6. Technology Requirements records the verified toolchain and selection rationale.
7. API Contracts documents relevant client-server boundaries.
8. Deployment and Operations explains environments, SHA promotion, migrations, health, and rollback.
9. Privacy, limitations, and changelog material record boundaries and document evolution.

## 5. Architectural Context

Insightful Phish is a pnpm workspace containing frontend, backend, and shared packages. The browser invokes HTTP APIs. Backend routes apply authentication and authorisation before controllers invoke application services. Services coordinate business workflows through repositories; repositories own Prisma data access. PostgreSQL stores durable state.

Shared schemas support client-server consistency but do not replace backend validation or business services. External email and AI providers are reached through backend-owned adapters/provider abstractions so browser callers cannot supply provider credentials or bypass organisation context.

## 6. References

- [Demo 4 SRS](../srs/README.md)
- [Functional Requirements](../srs/functional-requirements.md)
- [Quality Requirements](../srs/quality-requirements.md)
- [Domain Model](../srs/domain-model.md)
- [Demo 4 Documentation Home](../README.md)

---

Previous section: [SAS Home](README.md)

Next section: [Architectural Requirements](architectural-requirements.md)
