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

## 2. Scope

The core of this specification focuses on an intended technology-neutral logical arhictecture with five layers:

1. Presnetation and Browser Layer
2. API and Access-Control Layer
3. Application Services Layer
4. Repository and Data-Access Layer
5. Persistence Layer

Requests originate in the Presentation and Browser Layer and cross the API and Access-Control Layer boundary. Validation, authentication, session checks, and access control are applied at that boundary where required. An application service coordinates the relevant use case, uses a repository to access data and relies on those repositories to communicate with persistant storage. Normal dependencies point downwards through this structure.

Detailed responsibilities and dependency rules are defined in the [Architecture Overview](architecture-overview.md)

## 3. Intended Audience

This specification is intended for developers, maintainers, reviewers, testers, DevOps contributros, and project stakeholders who need to understand the system's architectural reponsibilities, contraints, interfaces, and intended direction.

## 4. Document Structure

1. [Introduction](introduction.md) defines the purpose, scope, audience. structure, and context of the specification.
2. [Architectural Requirements](architectural-requirements.md) records the drivers, responsibilities, contraints, interfaces, qaulity traceability.
3. [Architecture Overview](architecture-overview.md) defines the five-layer logical architecture, dependency direction, supporting contracts, cross-cutting services, and known deviations.
4. [Architectural Patterns](architectural-patterns.md) records recurring design-level collaborations within the logical architecture mechanisms, tactics, trade-offs, and limitations.
5. [Design Patterns](design-patterns.md) records recurring design-level collaborations within the logical architecture.
6. [Quality to Architecture Mapping](quality-architecture-mapping.md) maps quality requirements to architectural mechanisms, tactics, trade-offs, and limitations.
7. [Technology Requirements](technology-requirements.md) records technology capabilities, constraints, selections, and their architectural rationale.
8. [API Contracts](api-contracts.md) is responsible for documenting the client-server boundary, request and response contracts, access expectations, and safe error behaviour.
9. [Deployment and Operations](deployment.md) is responsible for documenting deployment concerns, operational boundaries, configuration, and runtime support.
10. [Changelog](changelog.md) records major architecturak and documentation changes by revision period.

## 5. Architectural Context

## 6. References

- [Demo 2 Software Requirements Specification](../srs/README.md)
- [SRS Function Requirements](../srs/functional-requirements.md)
- [SRS Quality Requirements](../srs/quality-requirements.md)
- [Architecture Overview](architecture-overview.md)

---

Previous section: [Software Architecture Specification](README.md)

Next section: [Architectural Requirements](architectural-requirements.md)
