# Deployment and Operations

This section describes environment separation, immutable image promotion, database migration, health verification, failure behaviour, rollback, and host responsibilities.

## SAS Content

- [0. Home](README.md)
- [1. Introduction](introduction.md)
- [2. Architectural Requirements](architectural-requirements.md)
- [3. Architecture Overview](architecture-overview.md)
- [4. Architectural Patterns](architectural-patterns.md)
- [5. Design Patterns](design-patterns.md)
- [6. Quality-to-Architecture Mapping](quality-architecture-mapping.md)
- [7. Technology Requirements](technology-requirements.md)
- [8. API Contracts](api-contracts.md)
- **[9. Deployment and Operations](#9-deployment-and-operations)** &larr; _You are here_
- [10. Privacy and Data Boundaries](privacy-and-data-boundaries.md)
- [11. Known Limitations](known-limitations.md)
- [12. Changelog](changelog.md)

---

## 9. Deployment and Operations

### 9.1 Purpose

Deployment must promote a known source revision without rebuilding unknown code on the host, apply required schema migrations, verify service health before promotion, preserve the previous application revision, and avoid writing secrets into release records.

The architecture and promotion sequence are shown in [Architecture and Deployment Diagrams](../diagrams/sas/architecture-and-deployment.md).

### 9.2 Environment Separation

#### Production

Production images use immutable `backend:<full SHA>` and `frontend:<full SHA>` tags. Production has dedicated environment protection, host destination, credentials, Compose input, application directory, deployment lock, and release records.

#### Development

Development images use `backend:dev-<full SHA>` and `frontend:dev-<full SHA>`. Development uses separate destinations/configuration and additionally verifies backend connectivity to MailPit where configured.

#### Local development

The root Compose configuration provides frontend, backend, PostgreSQL, MailPit, and optional workspace tooling. Local commands can build, lint, typecheck, test, migrate, seed, and inspect services without defining release evidence.

Environment separation prevents a development image tag, secret set, lock, or release marker from being mistaken for production state.

### 9.3 Release Inputs

Continuous Deployment is eligible only after the configured successful CI relationship for the expected `main` or `dev` revision. Eligibility validates the exact lowercase 40-character Git SHA and expected branch/repository context.

The workflow:

1. checks out the exact revision;
2. builds frontend and backend images from that revision;
3. publishes revision-addressable images to GHCR;
4. passes the same revision to the target deployment wrapper;
5. has the host pull those images rather than rebuild source.

The release environment includes the image names/tags and required runtime configuration. Secrets remain owner-provided protected environment values.

### 9.4 Candidate Verification and Promotion

Before changing application services, the deployment script validates:

- target environment and exact SHA format;
- required deployment files and executable prerequisites;
- environment configuration and image references;
- rendered Docker Compose configuration;
- current/previous release metadata and deployment lock state.

Candidate promotion then:

1. pulls immutable images;
2. runs Prisma migration deployment against the target database;
3. starts/recreates application services without rebuilding images;
4. waits for backend and frontend container health;
5. checks backend `/health` and the frontend root over HTTP;
6. performs the development MailPit connectivity check where applicable;
7. writes candidate release metadata only after checks pass;
8. updates current/previous SHA markers and appends deployment history.

These mechanisms define a repeatable procedure; they are not themselves proof that a particular release candidate passed. #573 identifies the exact candidate and #574 records `QR-DEPLOY-01` evidence.

### 9.5 Health and Readiness

The backend health route passes through controller, service, and repository layers so database reachability can be represented without placing Prisma in the controller. Health responses remain bounded and must not expose connection credentials or internal secret configuration.

Container health and HTTP smoke checks serve different purposes: container state verifies process/service readiness while HTTP checks verify that routed application surfaces respond. Both are required before promotion.

### 9.6 Failure Behaviour

If image pull, migration, Compose rendering, service startup, or health verification fails, the candidate is not recorded as successfully promoted. The deployment command exits unsuccessfully even when automatic restoration succeeds, so automation cannot misreport the candidate as deployed.

Failures must not overwrite the last known successful release markers with candidate values. Operational output may identify revision, stage, service, and bounded error status but must not print environment secrets.

### 9.7 Rollback Strategy

Before candidate recreation, the script preserves the current successful release environment when available. On supported candidate startup or health failure it restores previous application image references and release state, recreates services, and repeats health checks.

Automatic rollback restores application containers and revision markers. It does not reverse Prisma migrations or restore database volumes. Therefore migrations promoted with a candidate must be reviewed for compatibility with the immediately previous application revision or require an explicit operator recovery plan.

Rollback cannot recover from unavailable infrastructure, corrupted external state, missing previous images, or an incompatible irreversible schema change without environment-owner action.

### 9.8 Operational Records

Successful revisions are recorded under `deploy/releases/current` and `deploy/releases/previous`; deployment outcomes append to `deploy/releases/deployment-history.log`. The release environment example documents required non-secret structure.

Records identify revision and outcome without storing passwords, database URLs, registry tokens, Cloudflare credentials, AI credentials, or mail-provider secrets.

### 9.9 Production Host Bootstrap

The host bootstrap script prepares supported deployment prerequisites and directories. It does not create product credentials, DNS records, tunnel credentials, GHCR access, or environment secrets.

Environment owners remain responsible for:

- Ubuntu host and Docker/Compose availability;
- protected runtime environment files;
- PostgreSQL storage and backup policy;
- GHCR authentication and image retention;
- Cloudflare DNS/Tunnel/Access configuration where used;
- mail and AI provider credentials;
- monitoring, certificate/routing ownership, and final release evidence.

### 9.10 Deployment Constraints

- The host must have access to the exact published revision images.
- The database must be reachable before migration and health verification.
- Frontend build-time API configuration and backend runtime configuration must identify the intended environment.
- Development-only MailPit must not be mistaken for production email delivery.
- Rollback planning must account for schema compatibility.
- Source inspection, Compose validation, and performance dry-run do not prove a successful runtime deployment.

---

Previous section: [API Contracts](api-contracts.md)

Next section: [Privacy and Data Boundaries](privacy-and-data-boundaries.md)
