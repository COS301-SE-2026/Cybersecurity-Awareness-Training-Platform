# Quality-to-Architecture Mapping

This section maps the selected SRS quality requirements to the architectural mechanisms used to address them. The mapping identifies affected architectural areas and records relevant limitations and trade-offs.

## SAS Content

- [0. Home](README.md)
- [1. Introduction](introduction.md)
- [2. Architectural Requirements](architectural-requirements.md)
- [3. Architecture Overview](architecture-overview.md)
- [4. Architectural Patterns](architectural-patterns.md)
- [5. Design Patterns](design-patterns.md)
- **[6. Quality-to-Architecture Mapping](#6-quality-to-architecture-mapping)** &larr; _You are here_
  - [6.1 Purpose](#61-purpose)
  - [6.2 Quality Mapping](#62-quality-mapping)
- [7. Technology Requirements](technology-requirements.md)
- [8. API Contracts](api-contracts.md)
- [9. Deployment and Operations](deployment.md)
- [10. Changelog](changelog.md)

---

## 6. Quality-to-Architecture Mapping

### 6.1 Purpose

The purpose of this mapping is to show how the intended architecture responds to the measurable quality requirements defined in the SRS. A quality requirement is not satisfied merely because an architectural pattern has been selected. It must be supported by concrete responsibilities, boundaries, controls, and verification.

### 6.2 Quality Mapping

| **Quality Requirement**                       | **Architectural Decision**                                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **QR-01: Secure authentication and sessions** | Central API access boundary with authentication, session, role, permission, and organisation checks.             |
| **QR-02: Sensitive data privacy**             | Safe contracts, redacted errors, hashed credentials and tokens, and restricted audit information.                |
| **QR-03: Usable training flow**               | Clear campaign states, consistent navigation, stable API responses, and understandable feedback.                 |
| **QR-04: Accessible core tasks**              | Semantic interfaces, labelled inputs, keyboard access, readable content, and visible validation.                 |
| **QR-05: Reliable tokenised actions**         | Purpose-scoped tokens, expiry checks, transactions, and single-use conditional updates.                          |
| **QR-06: Responsive standard requests**       | Direct layered processing, scoped database queries, limited repeated work, and finite external-service timeouts. |
| **QR-07: Maintainable traceability**          | Stable identifiers, modular documentation, shared contracts, and separated architectural responsibilities.       |
| **QR-08: Accountable audit review**           | Central audit service recording safe actor, action, target, outcome, and timestamp information.                  |
| **QR-09: Ethical email simulations**          | Planned approval, sending-scope, recipient-safety, access-control, and audit safeguards.                         |

---

Previous section: [Design Patterns](design-patterns.md)

Next section: [Technology Requirements](technology-requirements.md)
