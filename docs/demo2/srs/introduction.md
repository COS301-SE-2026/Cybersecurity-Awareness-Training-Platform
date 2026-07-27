# Introduction and Scope

This section introduces the purpose, audience, scope, assumptions, terminology, and references for the Insightful Phish Demo 2 Software Requirements Specification.

## SRS Content

- [0. Home](README.md)
- **[1. Introduction and Scope](#1-introduction-and-scope)** &larr; _You are here_
  - [1.1 Purpose](#11-purpose)
  - [1.2 Intended Audience](#12-intended-audience)
  - [1.3 Product Scope](#13-product-scope)
  - [1.4 Assumptions](#14-assumptions)
  - [1.5 Definitions, Acronyms, and Abbreviations](#15-definitions-acronyms-and-abbreviations)
  - [1.6 References](#16-references)
- [2. Users and User Stories](users-and-user-stories.md)
- [3. Functional Requirements](functional-requirements.md)
- [4. Use Cases](use-cases.md)
- [5. Quality Requirements](quality-requirements.md)
- [6. Domain Model](domain-model.md)
- [7. Changelog](changelog.md)

---

## 1. Introduction and Scope

### 1.1 Purpose

This document defines the Software Requirements Specification for Insightful Phish, a web-based cybersecurity awareness and training platform that helps organisations and individuals identify and respond to threats through realistic phishing simulations, interactive training, quizzes, and user risk insights.

### 1.2 Intended Audience

This document is intended for Insightful Phish developers, our client (Southern Cross Solutions), and other stakeholders including the COS301 lecturers.

### 1.3 Product Scope

Insightful Phish is a modular cybersecurity awareness training platform intended for individual trainees, organisation-linked trainees, organisation administrators, and Insightful Phish platform administrators. The product provides role- and permission-based access control so that each user type can access only the features, workflows, and data appropriate to their responsibilities. This includes separating individual trainee activity from organisation-scoped activity, restricting organisation administration to authorised organisation administrators, and reserving platform-level administration for Insightful Phish administrators.

The product direction is centred on campaign-based cybersecurity awareness training. Campaigns act as the main assignment and ordering container for training experiences. A campaign may contain multiple campaign items in a defined order, allowing trainees to progress through structured cybersecurity awareness activities. Campaign content includes simulated inboxes and emails, training documents, and quizzes. These are represented as campaign items. Campaign items may also be grouped to support more complex campaign flows.

The long-term product scope is intended to provide a comprehensive cybersecurity awareness training, learning, and behavioural platform for organisations and their trainees, as well as individuals who would like to improve their cybersecurity awareness. The platform is intended to improve cybersecurity awareness through realistic simulations, interactive learning experiences, and organisation management capabilities, while remaining modular, secure, and extensible.

The long-term product scope includes:

- **Trainee learning and engagement**
  - Personalised learning paths
  - Interactive cybersecurity training campaigns
  - Knowledge assessments and quizzes in campaigns
  - Immediate feedback and remediation
  - Progress tracking
  - Personalised learning recommendations
- **Cybersecurity simulations**
  - Simulated inbox experiences
  - Phishing-style emails and messages
  - Interactive cybersecurity scenarios
  - Real email simulation workflows
  - Organisation-specific simulation content
- **Organisation administration**
  - Organisation onboarding
  - Organisation-wide reporting dashboards
  - Behavioural analytics
  - Risk scoring and trend analysis
  - Campaign effectiveness reporting
  - Exportable reports

The platform is intended to remain modular, secure, and extensible so that future training formats, reporting capabilities, simulation types, and organisation-level administration features can be added without changing the overall product direction.

### 1.4 Assumptions

The requirements for Insightful Phish are based on the following assumptions about its users, administrative responsibilities and communication channels.

- **Web Browser and Internet Access:** Users are assumed to have access to a modern web browser and a stable internet connection. Because Insightful Phish is a web based platform, users cannot access its functionality without an internet connection.
- **Email Access and Delivery:** Users are assumed to have access to a valid email account and inbox. Insightful Phish uses email to send account invitations, verification messages, notifications and other important communication. Users who cannot receive these messages will not be able to create or access an Insightful Phish account.
- **Organisation Registration Oversight:** Insightful Phish administrators are responsible for reviewing organisation registration requests. They must approve or reject each request and take reasonable steps to ensure that access is only granted to legitimate organisations.
- **Organisation Self-Management:** Each organisation is responsible for managing its own trainees, administrators, campaigns and training content. Organisation administrators perform these tasks within the boundaries of their assigned permissions. Insightful Phish administrators oversee the platform and organisation registration process, but are not responsible for the routine management of individual organisations or their training activities.
- **Trainee Communication and Onboarding:** Organisations are assumed to have an appropriate way to communicate with their trainees, such as email or an internal communication channel. Each organisation is responsible for informing its trainees that it uses Insightful Phish and explaining how they should access and complete the organisation's onboarding process.

### 1.5 Definitions, Acronyms, and Abbreviations

| Term                               | Definition                                                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trainee**                        | A user who completes cybersecurity awareness training through campaigns.                                                                     |
| **Organisation trainee**           | A trainee who is linked to an organisation and may be assigned campaigns by an organisation administrator.                                   |
| **Organisation administrator**     | A user with administrative permissions for an organisation, able to manage organisation-specific campaigns, content, and organisation users. |
| **Insightful Phish administrator** | A platform-level administrator with permissions to manage the entire Insightful Phish platform.                                              |
| **Platform administrator**         | An Insightful Phish administrator. (see Insightful Phish admin)                                                                              |

<!-- Put acronyms in `` and keep abbreviations as above -->

| Abbreviation / Acronym | Definition                                                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`RBAC`**             | **Role-Based Access Control:** A system for restricting access to resources based on user roles and permissions.                                                                         |
| **`TUCBW`**            | **This use case begins with:** Defines the initial state and preconditions for the use case.                                                                                             |
| **`TUCEW`**            | **This use case ends with:** Specifies the final state and postconditions for the use case.                                                                                              |
| **`SRS`**              | **Software Requirements Specification:** A document that describes the software system to be developed, including functional and non-functional requirements. (This is the SRS document) |

### 1.6 References

- [Insightful Phish Demo 2 documentation](../README.md)
- [Software Architectural Specification](../sas/README.md)
- [Demo 2 API Contract Documentation](../API.md)
- [Demo 2 Design Documentation](../DESIGN.md)
- [Demo 2 Traceability Matrix](../traceability.md)
- [Demo 1 Software Requirements Specification](../../demo1/SRS.md)

---

Previous section: [Home](README.md)

Next section: [Users and User Stories](users-and-user-stories.md)
