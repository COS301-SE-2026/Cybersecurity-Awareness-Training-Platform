# Deployment and Operations

This section provides a view of the Insightful Phish deployments and CI/CD processes.

## SAS Content

- [0. Home](README.md)
- [1. Introductions](introduction.md)
- [2. Architectural Requirements](architectural-requirements.md)
- [3. Architecture Overview](architecture-overview.md)
- [4. Architectural Patterns](architectural-patterns.md)
- [5. Design Patterns](design-patterns.md)
- [6. Quality to Architecture Mapping](quality-architecture-mapping.md)
- [7. Technology Requirements](technology-requirements.md)
- [8. API Contracts](api-contracts.md)
- **[9. Deployment and Operations](#9-deployment-and-operations)** &larr; _You are here_
  - [9.1 Purpose](#91-purpose)
  - [9.2 Environment Separations](#92-environment-separation)
  - [9.3 Deployment Diagrams](#93-deployment-diagrams)
  - [9.4 Deployment Failure Behaviour](#94-deployment-failure-behaviour)
  - [9.5 Rollback Strategy](#95-rollback-strategy)
- [10. Changelog](changelog.md)

---

## 9. Deployment and Operations

### 9.1 Purpose

Insightful Phish has distinct production and development environments. Production is hosted on an Ubuntu Server which was supplied by our client, while Development is hosted on a separate ARM64 Ubuntu Virtual machine in Microsoft Azure.

Both environments use Docker Engine and Docker Compose to run the application. Application HTTP traffic reaches each host through a separate Cloudflare Tunnel. Github Actions uses native SSH to invoke a restricted deployment wrapper on the appropriate host. Deployment SSH does not pass through the Cloudflare Tunnel.

Backend and Frontend environments are build by Github Actions and are stored in the Github Container Registry (GHCR). Each environment uses immutable image tags derived from the full Git commit SHA. Production uses `<full SHA>` tags, while development uses `dev-<full SHA>` tags.

<!-- TODO Add a section here desribing how to complete host bootstrap and deployment reproducibility -->

### 9.2 Environment Separation

Production and Development are completely separate. They do not share deployment destinations, Github Environments, SSH credentials, secrets, databases, volumes or release records. A development deployment cannot update the production application or its deployment state.

#### Production Environment

The Production frontend is publicly available at [insightfulphish.co.za](https://insightfulphish.co.za), and the Production API is available at [api.insightfulphish.co.za](https://api.insightfulphish.co.za).

Production is deployed from successful pushes to `main`. After all required jobs succeed, Github Actions publishes the following images to GHCR:

- `backend:<full SHA>`
- `frontend:<full SHA>`

The production frontend is built with `https://api.insightfulphish.co.za` as its `VITE_API_BASE_URL`. This is build-time configuration compiled into the frontend image rather than a runtime environment variable.

Automatic deployment occurs only when `PRODUCTION_DEPLOY_ENABLED` is `true`. The deployment job uses the GitHub Environment named `production` and the concurrency group `insightfulphish-production`. Once a production deployment starts, a newer workflow run does not cancel it.

#### Development Environment

The Development frontend is publicly available at [dev.insightfulphish.co.za](https://dev.insightfulphish.co.za), and the Development API is available at [api-dev.insightfulphish.co.za](https://api-dev.insightfulphish.co.za). Captured development emails can be viewed using the Mailpit UI at [mail-dev.insightfulphish.co.za](https://mail-dev.insightfulphish.co.za)

The Development frontend and Mailpit UI are protected by Cloudflare Access. To gain access to these Development environment pages, use your email address. If you are allowed to access the development environment, you will receive an OTP and can use that to gain access to the Development pages.

Production is deployed from successful pushes to `dev`. After all required jobs succeed, Github Actions publishes AMD64 images to GHCR using these tags:

- `backend:dev-<full SHA>`
- `frontend:dev-<full SHA>`

The development frontend is built with the repository variable `DEVELOPMENT_FRONTEND_API_URL`, whose deployed value is `https://api-dev.insightfulphish.co.za`. Because this URL is compiled into the frontend image, the `dev-` tag prefix prevents development frontend content from overwriting a production image created from the same Git commit.

Automatic deployment occurs only when `DEVELOPMENT_DEPLOY_ENABLED` is `true`. The deployment job uses the GitHub Environment named `development` and the concurrency group `insightfulphish-development`. Once a development deployment starts, a newer workflow run does not cancel it.

### 9.3 Deployment Diagrams

#### 9.3.1 Production Deployment

![Production Deployment](../diagrams/sas/production-deployment-diagram.drawio.svg)

_Figure 9.1: Production Deployment on client provided server architecture._

To view the full rendered version of the diagram, click [here](../diagrams/sas/production-deployment-diagram.drawio.svg).

#### 9.3.2 Development Deployment

![Development Deployment](../diagrams/sas/development-deployment-diagram.drawio.svg)

_Figure 9.2: Development Deployment on Microsoft Azure Ubuntu VM._

To view the full rendered version of the diagram, click [here](../diagrams/sas/development-deployment-diagram.drawio.svg).

#### 9.3.3 CI/CD Pipeline

![CICD Pipeline Diagram](../diagrams/sas/cicd-diagram.drawio.svg)
_Figure 9.3: Continuous-integration and production-deployment flow for Insightful Phish._

To view the full rendered version of the diagram, click [here](../diagrams/sas/cicd-diagram.drawio.svg).

### 9.4 Deployment Failure Behaviour

Production and Development use the same guarded deployment implementation with an allow-listed target, separate application directory, Compose config, image-tag format and deployment locks. Before modifying the application, the script validates the target and the 40 character SHA, verifies the required files and runtime environment, creates a candidate release file, validates the rendered Compose config, pulls the immutable images and applies Prisma migrations.

After migration, the script recreates the application services, waits for the backend and frontend container health checks, and performs host-level HTTP smoke tests. Development additionally verifies that the backend can connect to Mailpit at `mailpit:1025`.

If candidate recreation or health verifications fail, the script recreates the rpevious backend and frontend images using the unchaged successful `release.env`. It then repeats the container and HTTP health checks against the restored application. The candidate remains unsuccessful and the deployment returns a non-zero status even when restoration succeeds.

The automatic system recovery does not reverse Prisma migration, restore database data or reset PostgreSQL volums. Because of this, automatic deployment requires that every migration be backward-compatible with the immediately previous application release.

Both `Production` and `Development` use this failure behaviour.

### 9.5 Rollback Strategy

<!-- TODO Update once automatic rollback is implemented -->

The deployment script records the Git commit SHAs of the current and previous successful releases in:

- `deploy/releases/current`
- `deploy/releases/previous`

Successful deployments are also appended to `deploy/releases/deployment-history.log`.

If a candidate release fails, it does not replace the successful `current`, `previous` or `release.env` state. The deployment history records candidate start, candidate failure, restoration start, restoration result and successful candidate promotion without recording runtime secrets. Automatic recovery restores only the previous application containers. It does not reverse database migrations. Because of this, all database migrations must be backward compatible.

Both `Production` and `Development` use this rollback strategy.

---

Previous section: [API Contracts](api-contracts.md)

Next section: [SAS Changelog](changelog.md)
