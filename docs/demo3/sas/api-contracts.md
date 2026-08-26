# API Contracts

This section provides a brief overview of the Insightful Phish API boundary.

## SAS Content

- [0. Home](README.md)
- [1. Introduction](introduction.md)
- [2. Architectural Requirements](architectural-requirements.md)
- [3. Architecture Overview](architecture-overview.md)
- [4. Architectural Patterns](architectural-patterns.md)
- [5. Design Patterns](design-patterns.md)
- [6. Quality to Architecture Mapping](quality-architecture-mapping.md)
- [7. Technology Requirements](technology-requirements.md)
- **[8. API Contracts](#8-api-contracts)** &larr; _You are here_
  - [8.1 Purpose](#81-purpose)
  - [8.2 Swagger Documentation](#82-swagger-documentation)
  - [8.3 Service Contracts](#83-service-contracts)
- [9. Deployment and Operations](deployment.md)
- [10. Changelog](changelog.md)

---

## 8. API Contracts

### 8.1 Purpose

The API provides the boundary between the Presentation layer and the server application. API contracts descrive the available endpoints, request parameters and bodies, response structures, authentication requirements and possible status codes.

### 8.2 Swagger Documentation

The current interactive API documentation is available at: **[swagger.insightfulphish.co.za](https://swagger.insightfulphish.co.za)**

Please use this interactive documentation for more details on the API contracts.

### 8.3 Service Contracts

Key service contracts and shared schemas are maintained in `@insightful-phish/shared` and documented in OpenAPI:

| Operation                        | Method | Route                                                               | Shared Schemas                                                                                                  | Permissions                                                                    |
| :------------------------------- | :----- | :------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| Organisation Campaign Statistics | `GET`  | `/organisations/{organisationId}/campaigns/{campaignId}/statistics` | `packages/shared/src/campaign-statistics.ts`<br>`packages/shared/src/validation/campaign-statistics.schemas.ts` | `VIEW_CAMPAIGNS` (read statistics)<br>`ASSIGN_CAMPAIGNS` (Unassign capability) |

---

Previous section: [Technology Requirements](technology-requirements.md)

Next section: [Deployment and Operations](deployment.md)
