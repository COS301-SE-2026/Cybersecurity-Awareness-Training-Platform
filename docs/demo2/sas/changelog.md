# SAS Changelog

This changelog summarises the main Software Architecture Spec changes since Demo 1. It is written as a document history.

## Contents

- [1. Demo 1 Architecture Baseline](#1-demo-1-architecture-baseline)
- [2. Demo 2 SAS Restructure](#2-demo-2-sas-restructure)
- [3. Domain and Quality Alignment](#3-domain-and-quality-alignment)
- [4. Design Pattern Reassessment](#4-design-pattern-reassessment)
- [5. Technology and Deployment Updates](#5-technology-and-deployment-updates)
- [6. Removed or Superseded Material](#6-removed-or-superseded-material)

---

## 1. Demo 1 Architecture Baseline

The Demo 1 architecture history established the first version of the architecture document, it added:

- Campaign and administration context
- Linked the architecture to API contracts
- Refined the technical constraints
- Aligned terminology from learner or employee wording to trainee wording.

This baseline was intentionally narrow for Demo 1. It supported the Demo 1 trainee-facing flows and documented early architecture principles, but it did not yet provide a full SAS as required by the marking guidelines(which the team established).

## 2. Demo 2 SAS Restructure

The Demo 2 SAS separates architecture content into sections:

- architectural requirements;
- architectural patterns;
- design patterns;
- quality-to-architecture mapping;
- technology requirements;
- API contracts;
- deployment and operations.

The index now points to the SAS sections directly and no longer links completed SAS pages to the outdated Demo 1 architecture.

## 3. Domain and Quality Alignment

The SAS is aligned to the expanded Demo 2 domain model source, including:

- organisation registration requests
- invitations
- action tokens
- sessions
- refresh tokens
- security settings
- email delivery logs.

Quality traceability has also been improved so architectural layers map to SRS quality requirements such as security and privacy, resilience, accessibility, maintainability, and testability.

## 4. Design Pattern Reassessment

The design pattern catalogue was also introduced which is centred around the domain model, these patterns include:

- Facade for use-case workflow boundaries;
- State for lifecycle behaviour;
- Strategy for context-specific policies;
- Proxy for the access-control;
- Adapter for the external email delivery service we use.

## 5. Technology and Deployment Updates

Technology Requirements now start from architectural needs before naming our selected technologies. The section groups artifacts under capabilities such as frontend delivery, backend runtime, shared contracts, persistence, email, deployment, quality tooling, and API documentation.

Deployment wording now also reflects the accepted direction: an Ubuntu host, Docker Compose as part of product delivery, Cloudflare Tunnel and DNS, Cloudflare Access, MailPit for development-only email capture, and Resend as the production SMTP provider.

---

Previous section: [Deployment and Operations](deployment.md)

Back to [SAS Home](README.md)
