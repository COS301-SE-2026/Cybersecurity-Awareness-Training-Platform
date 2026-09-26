# Known Limitations

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
- [9. Deployment and Operations](deployment.md)
- [10. Privacy and Data Boundaries](privacy-and-data-boundaries.md)
- **[11. Known Limitations](#11-known-limitations)** &larr; _You are here_
- [12. Changelog](changelog.md)

---

## 11. Known Limitations

These statements describe the current Demo 4 boundary and are not commitments to future delivery.

- **Live competitive Quiz:** No Live Quiz feature is present. Current Quizzes are reusable Campaign content completed by trainees through occurrence-scoped attempts.
- **Real-email Campaign operations:** Partial phishing-portal and real-email artifacts do not provide a complete administrator workflow for launching, scheduling, pausing, delivering, or monitoring real-email Campaigns.
- **Trainee tags:** Organisation trainees cannot be grouped by tags, and Campaign assignment selects eligible trainees directly.
- **Progress reset:** The product has no standalone Campaign progress-reset action. Removing an assignment is a separate destructive unassignment operation with its own confirmation and cleanup contract.
- **Audit review:** Supported actions persist audit records and lifecycle events, but Demo 4 does not provide a broad audit dashboard or general oversight interface.
- **Reporting:** Campaign statistics expose the implemented scoped measures. A broad cross-Campaign reporting and export facility is not present.
- **Simulated Inbox AI generation:** AI can generate an Organisation Email Draft, but it does not generate or approve an entire Campaign-eligible Simulation. Normal Simulated Inbox authoring and activation remain required.
- **Release evidence:** Deployment mechanics exist, but final Demo 4 release-candidate evidence depends on the exact revision owned by issue #573 and the verification record owned by issue #574.
- **Privacy Policy:** Implementation data boundaries are documented, but the standalone policy remains dependent on issue #571.

---

Previous section: [Privacy and Data Boundaries](privacy-and-data-boundaries.md)

Next section: [Changelog](changelog.md)
