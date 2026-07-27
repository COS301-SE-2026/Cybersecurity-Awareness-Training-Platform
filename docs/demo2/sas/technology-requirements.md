# Technology Requirements

This section explains the main technology choices used to express the Insightful Phish architecture. The technologies support the logical architecture, but they do not define it; the five-layer architecture remains the guiding structure for responsibilities and boundaries.

## SAS Content

- [0. Home](README.md)
- [1. Architectural Requirements](architectural-requirements.md)
- [2. Architectural Patterns](architectural-patterns.md)
- [3. Design Patterns](design-patterns.md)
- [4. Quality to Architecture Mapping](quality-architecture-mapping.md)
- **[5. Technology Requirements](#5-technology-requirements)** &larr; _You are here_
  - [5.1 Purpose](#51-purpose)
  - [5.2 Technology Selection Criteria](#52-technology-selection-criteria)
  - [5.3 Frontend Technologies](#53-frontend-technologies)
  - [5.4 Backend Technologies](#54-backend-technologies)
  - [5.5 Shared Contracts and Validation](#55-shared-contracts-and-validation)
  - [5.6 Data Management](#56-data-management)
  - [5.7 Deployment Technologies](#57-deployment-technologies)
  - [5.8 Testing and Quality Tools](#58-testing-and-quality-tools)
  - [5.9 Alternatives and Trade-offs](#59-alternatives-and-trade-offs)
  - [5.10 References](#510-references)
- [6. API Contracts](api-contracts.md)
- [7. Deployment and Operations](deployment.md)

## Related Architecture and Requirements

- [Demo 2 Architecture Overview](../architecture.md)
- [SRS Quality Requirements](../srs/quality-requirements.md)
- [Design Patterns](design-patterns.md)
- [Deployment and Operations](deployment.md)

---

## 5. Technology Requirements

### 5.1 Purpose

The purpose of this section is to explain why the main technologies were selected, what architectural need each technology supports, and which constraints or trade-offs must be adhered to during development.

### 5.2 Technology Selection Criteria

Technology choices are evaluated according to the fit with the five-layer architecture, and alignment with the SRS quality requirements.

### 5.3 Frontend Technologies

This section covers the browser-facing technologies that support the Presentation and Browser layer.

### 5.4 Backend Technologies

This section covers the server-side and framework choices that support API handling, access control, and the application services.

### 5.5 Shared Contracts and Validation

This section covers technologies used to keep request, response, and validation rules consistent across the application.

### 5.6 Data Management

This section covers technologies that support repository, data-access, and persistence responsibilities.

### 5.7 Deployment Technologies

This section covers technologies used to run the system in local, demonstration, and deployment environments provided by the client.

### 5.8 Testing and Quality Tools

This section covers tools that support verification, maintainability, quality feedback, and of course testing.

### 5.9 Alternatives and Trade-offs

Alternatives and trade-offs are documented alongside the tech selections so that rejected options and constraints remain visible.

### 5.10 References

- [Demo 2 Architecture Overview](../architecture.md)
- [SRS Quality Requirements](../srs/quality-requirements.md)
- [Design Patterns](design-patterns.md)
- [Deployment and Operations](deployment.md)

---

Previous section: [Quality to Architecture Mapping](quality-architecture-mapping.md)

Next section: [API Contracts](api-contracts.md)
