# Introduction

This introduction defines the purpose, scope, audience, structure, and architectural context of the Insightful Phish Software Architecture Specification.

## Contents

- [Introduction](#introduction)
  - [Contents](#contents)
  - [1. Purpose](#1-purpose)
  - [2. Scope](#2-scope)
  - [3. Intended Audience](#3-intended-audience)
  - [4. Document Structure](#4-document-structure)
  - [5. Architectural Context](#5-architectural-context)
  - [6. References](#6-references)

## 1. Purpose

This is the Software Architecture Specification, intended for Insightful Phish developers and COS301 lecturers.

## 2. Scope

The core of this specification focuses on the final technology-neutral logical architecture with five layers:

1. Presentation and Browser Layer
2. API and Access-Control Layer
3. Application Services Layer
4. Repository and Data-Access Layer
5. Persistence Layer

Requests originate in the Presentation and Browser Layer and cross the API and Access-Control Layer boundary. Validation, authentication, session checks, and access control are applied at that boundary where required. An application service coordinates the relevant use case and uses repositories to communicate with persistent storage. Normal dependencies point downwards through this structure.

Detailed responsibilities and dependency rules are defined in the [Architecture Overview](architecture-overview.md).

## 3. Intended Audience

This specification is intended for developers, maintainers, reviewers, testers, DevOps contributors, and project stakeholders who need to understand the system's architectural responsibilities, constraints, interfaces, and final direction.

## 4. Document Structure

1. [Introduction](introduction.md) defines the purpose, scope, audience, structure, and context of the specification.
2. [Architectural Requirements](architectural-requirements.md) records the drivers, responsibilities, constraints, interfaces, and quality traceability.
3. [Architecture Overview](architecture-overview.md) defines the five-layer logical architecture, dependency direction, supporting contracts, and cross-cutting services.
4. [Architectural Patterns](architectural-patterns.md) records recurring design-level collaborations within the logical architecture mechanisms, tactics, trade-offs, and limitations.
5. [Design Patterns](design-patterns.md) records recurring design-level collaborations within the logical architecture.
6. [Quality to Architecture Mapping](quality-architecture-mapping.md) maps quality requirements to architectural mechanisms, tactics, trade-offs, and limitations.
7. [Technology Requirements](technology-requirements.md) records technology capabilities, constraints, selections, and their architectural rationale.
8. [API Contracts](api-contracts.md) provides a brief description of the client-server boundary and links to the Swagger documentation.
9. [Deployment and Operations](deployment.md) is responsible for documenting deployment concerns, operational boundaries, configuration, and runtime support.
10. [Changelog](changelog.md) records major architectural and documentation changes by revision period.

## 5. Architectural Context

Insightful Phish uses a browser frontend, an Express backend, and PostgreSQL. The backend contains route middleware, controllers, services, repositories, Prisma persistence, the email dispatcher, and the phishing simulation worker.

Managed portal routes and Campaign Insights use the same backend boundaries. SMTP providers, Infisical, and Workers AI are external integrations described in the technology and deployment sections.

## 6. References

- [Software Requirements Specification](../srs/README.md)
- [SRS Function Requirements](../srs/functional-requirements.md)
- [SRS Quality Requirements](../srs/quality-requirements.md)
- [Architecture Overview](architecture-overview.md)

---

Previous section: [SAS Home](README.md)

Next section: [Architectural Requirements](architectural-requirements.md)
