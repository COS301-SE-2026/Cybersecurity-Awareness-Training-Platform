# Privacy and Data Boundaries

This page records implementation behavior relevant to privacy review. It is not the Insightful Phish Privacy Policy and does not replace the policy owned by issue #571.

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
- **[10. Privacy and Data Boundaries](#10-privacy-and-data-boundaries)** &larr; _You are here_
- [11. Known Limitations](known-limitations.md)
- [12. Changelog](changelog.md)

---

## 10. Privacy and Data Boundaries

### 10.1 AI Boundaries

- AI provider credentials and provider configuration remain in the backend provider adapter and are not accepted from browser requests.
- Organisation-scoped AI services load approved AI-usable organisation context server-side. Context is serialized as bounded reference material and treated as untrusted prompt input rather than authority or executable instructions.
- Follow-up Campaign proposal requests identify an eligible trainee; the backend computes category state from supported evidence. The browser does not submit raw trainee history to the AI boundary.
- Generated output is schema-validated and returned as editable Draft or proposal data. Human review and explicit normal save and lifecycle actions remain required.
- AI does not choose trainee adaptive difficulty, activate content, approve a Simulation, assign a Campaign, or send real email.

### 10.2 Training and Simulation Data

- Campaign assignments connect trainees to available training and retain progress needed for platform functionality.
- Quiz attempts retain submitted answers and results in Campaign occurrence context.
- Simulated Inbox activity retains supported email-open, classification, and controlled-link interaction evidence in trainee, assignment, Campaign Item, and simulation context.
- Adaptive category state uses Quiz and Simulated Inbox evidence. A persisted adaptive resolution records the selected content and difficulty for one assignment and item.
- Simulated flows are designed not to collect real passwords or submitted credentials. Generated Organisation Email instructions prohibit forms, credential requests, arbitrary destinations, and scripts.

### 10.3 Audit and Transactional Email

- Supported sensitive actions write scoped audit records containing actor, target, action, outcome, timestamp, and compact metadata where applicable.
- Audit persistence recursively replaces values under keys containing password, token, or secret with a redaction marker rather than recording those values.
- Transactional account, invitation, assignment, and lifecycle notifications are queued and dispatched by backend email infrastructure. Delivery state and bounded provider outcomes support retry and operational status.

### 10.4 Policy Dependency

No standalone Demo 4 Privacy Policy is present in the current repository. Legal basis, retention periods, third-party processing commitments, user rights, and formal policy promises are intentionally not defined here. The final documentation must link the policy produced by issue #571 when that authoritative file is available.

---

Previous section: [Deployment and Operations](deployment.md)

Next section: [Known Limitations](known-limitations.md)
