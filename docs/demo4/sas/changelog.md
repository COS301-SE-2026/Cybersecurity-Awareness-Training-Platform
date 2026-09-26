# SAS Changelog

This changelog records meaningful architecture-specification changes from the earlier demonstration baselines to Demo 4. It is not a raw Git history.

## Contents

- [1. Demo 1 Architecture Baseline](#1-demo-1-architecture-baseline)
- [2. Demo 2 SAS Structure](#2-demo-2-sas-structure)
- [3. Demo 3 Architecture Baseline](#3-demo-3-architecture-baseline)
- [4. Demo 4 Architecture Updates](#4-demo-4-architecture-updates)
- [5. Restored SAS Breadth](#5-restored-sas-breadth)
- [6. Intentionally Excluded Architecture](#6-intentionally-excluded-architecture)

---

## 1. Demo 1 Architecture Baseline

Demo 1 established the browser/API/database direction for the initial trainee learning slice and linked architecture to the first API contracts. It introduced Campaign participation terminology but did not yet provide a complete modular SAS.

## 2. Demo 2 SAS Structure

Demo 2 separated architecture material into requirements, overview, architectural patterns, design patterns, quality mapping, technology requirements, API contracts, deployment, and changelog documents. It expanded account, organisation, session, invitation, security-setting, email, and administration context.

## 3. Demo 3 Architecture Baseline

Demo 3 retained the modular monolith and layered backend, expanded Campaign management and assignment, documented Docker Compose deployment direction, and connected measurable quality requirements to architecture and NFR evidence.

## 4. Demo 4 Architecture Updates

- Added reusable Training Document, Quiz, Organisation Email, and Simulated Inbox creator/lifecycle boundaries.
- Added the shared canonical `COMPONENT`, `ADAPTIVE`, and `GROUP` Campaign graph and existing Campaign Builder ownership.
- Added repeat Quiz attempts and occurrence scoring responsibilities.
- Added deterministic category-state calculation and persisted assignment-item adaptive resolution.
- Added provider-neutral AI generation, bounded organisation context, missing variants, and complete/follow-up proposal flows.
- Added explicit lifecycle safety: generated output remains editable and cannot save, activate, assign, resolve difficulty, or send email automatically.
- Updated deployment for exact image revision promotion, migrations, health checks, previous-revision recording, and rollback.

## 5. Restored SAS Breadth

- Restored architectural requirements and constraints.
- Restored architectural and design-pattern catalogues with current examples and limitations.
- Restored the eight-ID quality-to-architecture mapping without duplicating #574 evidence.
- Restored technology requirements using versions verified from current manifests.
- Restored logical and deployment diagrams as repository-renderable Mermaid source.
- Restored detailed SAS navigation and document history.

## 6. Intentionally Excluded Architecture

- No Live Quiz subsystem is documented because none is present.
- Partial phishing-portal/real-email artifacts are not presented as a complete launch, scheduling, pause, send, or monitoring architecture.
- Trainee tags, progress reset, broad report export, and broad audit/oversight UI are not represented.
- #574 owns executable NFR mapping and evidence; #571 owns formal Privacy Policy wording; #573 identifies the release candidate.

---

Previous section: [Known Limitations](known-limitations.md)

Back to [SAS Home](README.md).
