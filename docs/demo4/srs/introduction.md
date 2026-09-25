# Introduction and Scope

## SRS Content

- [0. Home](README.md)
- **[1. Introduction and Scope](#1-introduction-and-scope)** &larr; _You are here_
- [2. Functional Requirements](functional-requirements.md)
- [3. Quality Requirements](quality-requirements.md)
- [4. Changelog](changelog.md)

---

## 1. Introduction and Scope

### 1.1 Purpose and Audience

This SRS defines the implemented Demo 4 behaviour of Insightful Phish for developers, Southern Cross Solutions, reviewers, and COS301 lecturers. It replaces planned Demo 3 statements with requirements grounded in the current application.

### 1.2 Product Scope

Insightful Phish is a web-based cybersecurity awareness training platform for individual trainees, organisation trainees, organisation administrators, and platform administrators. Role and permission checks separate personal, organisation, and platform operations.

Campaigns organise reusable Training Documents, Quizzes, and Simulated Inboxes into ordered learning experiences. Administrators can author eligible content, compose Campaign Drafts, group compatible items, configure adaptive occurrences, activate Campaigns, and assign organisation Campaigns. Trainees can access available Campaigns, complete their content, and receive Quiz and simulated-threat feedback.

AI assistance generates editable Draft-shaped content inside the normal Training Document, Quiz, and Organisation Email builders. It also provides transient complete and follow-up Campaign proposals and supported missing-variant generation. AI output never bypasses administrator review, content lifecycle transitions, Campaign saving, or assignment.

### 1.3 Explicit Scope Boundaries

Demo 4 does not include Live Quiz, trainee tags, progress reset, broad report export, or a broad audit-review interface. The repository contains limited phishing-portal and real-email support artifacts, but not a complete administrator flow for launching, pausing, or sending real-email Campaigns; that flow is not a Demo 4 requirement.

### 1.4 Operating Assumptions

- Users have a modern browser, network access, and an email address for account communications.
- Platform administrators review organisation registration requests.
- Organisations manage their own administrators, trainees, content, Campaigns, and assignments within granted permissions.
- Generated content remains subject to the same validation and lifecycle rules as manually authored content.

### 1.5 Terms

| Term                       | Meaning                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Campaign                   | An ordered training container composed from eligible reusable content.                                                    |
| Adaptive item              | One Campaign occurrence with fixed content type and EASY, MEDIUM, and HARD alternatives resolved per assignment and item. |
| Reusable content           | A Training Document, Quiz, Organisation Email, or Simulated Inbox managed through its normal lifecycle.                   |
| Organisation administrator | An organisation-linked user whose actions are limited by explicit permissions.                                            |
| Platform administrator     | A user authorised to manage platform-owned resources and platform administration.                                         |
| SRS                        | Software Requirements Specification.                                                                                      |

---

Previous section: [SRS Home](README.md)

Next section: [Functional Requirements](functional-requirements.md)
