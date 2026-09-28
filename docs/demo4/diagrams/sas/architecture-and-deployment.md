# Demo 4 Architecture and Deployment Diagrams

These Mermaid diagrams are the editable and repository-rendered source for the Demo 4 logical and deployment architecture.

## Logical Architecture

```mermaid
flowchart TB
  Browser[React browser application]
  Shared[Shared Zod schemas and TypeScript contracts]
  Routes[Express routes and middleware]
  Controllers[Controllers]
  Services[Application and domain services]
  Repositories[Repositories]
  Prisma[Prisma Client]
  Database[(PostgreSQL)]
  Email[Email adapter/provider]
  AI[AI provider abstraction]

  Browser -->|typed HTTP| Routes
  Browser -. consumes .-> Shared
  Routes -. validates with .-> Shared
  Routes --> Controllers
  Controllers --> Services
  Services --> Repositories
  Repositories --> Prisma
  Prisma --> Database
  Services --> Email
  Services --> AI
  AI -->|schema-validated Draft/proposal| Services
```

## Reusable Content, Campaign, and Adaptive Runtime

```mermaid
flowchart LR
  Builders[Normal reusable-content builders] --> ContentServices[Content lifecycle services]
  ContentServices --> ContentRepo[Content repositories]
  ContentRepo --> Eligible[(Eligible persisted content)]
  Eligible --> Builder[Existing Campaign Builder]
  Builder --> CampaignService[Campaign validation service]
  CampaignService --> CampaignRepo[Campaign repository]
  CampaignRepo --> Graph[(COMPONENT / ADAPTIVE / GROUP)]
  Graph --> Assignment[Campaign Assignment]
  Assignment --> Evidence[Category evidence services]
  Evidence --> State[Deterministic category state]
  State --> Resolution[Persisted adaptive resolution]
  Resolution --> Selected[Selected eligible content]
```

## AI Boundary

```mermaid
flowchart LR
  Admin[Administrator]
  Builder[Normal builder / Campaign proposal panel]
  API[Protected API]
  Context[Backend-approved organisation context]
  Category[Backend-computed category state]
  Orchestrator[AI orchestration services]
  Provider[AI provider implementation]
  Review[Editable Draft / proposal + findings]

  Admin --> Builder --> API --> Orchestrator
  Context --> Orchestrator
  Category --> Orchestrator
  Orchestrator --> Provider --> Orchestrator
  Orchestrator --> Review --> Builder
```

AI output has no automatic save, activation, publication, Campaign assignment, adaptive-difficulty, or email-send authority.

## Deployment and Promotion

```mermaid
flowchart LR
  Revision[Exact source revision] --> Build[Build frontend/backend images]
  Build --> Registry[GHCR revision-tagged images]
  Registry --> Pull[Target host pulls exact revision]
  Pull --> Migrate[Prisma migrate deploy]
  Migrate --> Start[Docker Compose services]
  Start --> Health[Container and API health checks]
  Health -->|pass| Promote[Record promoted revision]
  Health -->|fail| Rollback[Restore previous image revision]
  Rollback --> MigrateReview[Review migration compatibility]
  MigrateReview --> Start
```

Back to the [Architecture Overview](../../sas/architecture-overview.md) or [Deployment and Operations](../../sas/deployment.md).
