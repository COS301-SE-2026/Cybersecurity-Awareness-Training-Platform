# Deployment and Operations

## SAS Content

- [0. Home](README.md)
- [1. Architecture Overview](architecture-overview.md)
- **[2. Deployment and Operations](#2-deployment-and-operations)** &larr; _You are here_

---

## 2. Deployment and Operations

### 2.1 Release Inputs and Isolation

Continuous Deployment runs only after a successful Continuous Integration workflow triggered by a push to `main` or `dev` in the same repository. Eligibility checks require the exact 40-character lowercase commit SHA and expected branch before build or deployment jobs proceed.

Production images use immutable `backend:<full SHA>` and `frontend:<full SHA>` tags. Development uses `backend:dev-<full SHA>` and `frontend:dev-<full SHA>`. The workflow checks out that exact SHA, builds and publishes images to GHCR, and passes the same SHA to the target deployment wrapper. The host pulls published images and does not rebuild them.

Production and development use separate GitHub environments, destinations, credentials, application directories, Compose inputs, image-tag formats, release records, and deployment locks.

### 2.2 Candidate Verification and Promotion

The deployment script validates the target, SHA, required files, runtime environment, and current release state before changing application services. It creates a protected candidate release environment, validates the rendered Compose configuration, pulls the immutable images, and applies Prisma migrations.

The candidate starts without rebuilding images. Promotion requires:

1. backend and frontend containers to report healthy;
2. backend `/health` and frontend root HTTP smoke checks to succeed;
3. development deployments additionally to prove backend connectivity to Mailpit;
4. candidate release metadata to replace `release.env` only after those checks pass;
5. `current` and `previous` SHA markers and deployment history to be updated.

These mechanics define how a candidate can be promoted. They do not constitute Demo 4 release evidence by themselves; issue #573 identifies the exact release candidate and issue #574 records the verification result required by `QR-DEPLOY-01`.

### 2.3 Failure and Rollback

Before candidate recreation, the script preserves the current successful release environment when one exists. If recreation or health verification fails, it restores the previous application images and release state, repeats container and HTTP health checks, records the failure/restoration outcome, and still exits unsuccessfully for the candidate.

Automatic rollback restores application containers and release markers only. It does not reverse Prisma migrations or restore database volumes, so deployed migrations must remain backward-compatible with the immediately previous application release.

### 2.4 Operational Records and Secrets

Successful release SHAs are stored in `deploy/releases/current` and `deploy/releases/previous`; deployment outcomes are appended to `deploy/releases/deployment-history.log`. Runtime secrets remain in protected environment configuration and are not written into release history.

Host bootstrap configures deployment prerequisites but does not create credentials. Infrastructure, DNS, tunnel configuration, GHCR authentication, environment secrets, and the final release evidence remain environment-owner responsibilities.

---

Previous section: [Architecture Overview](architecture-overview.md)

Back to the [Demo 4 SAS Home](README.md).
