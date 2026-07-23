# Introduction and Scope

### SRS Content

- [Home](README.md)
- **[Introduction and Scope](introduction.md)** &larr; _You are here_
- [Users and User Stories](users-and-user-stories.md)
- [Functional Requirements](functional-requirements.md)
- [Use Cases](use-cases.md)
- [Quality Requirements](quality-requirements.md)
- [Domain Model](domain-model.md)

---

# 1. Introduction

## 1.1 Purpose

This document defines the Software Requirements Specification for Insightful Phish, a web-based cybersecurity awareness and training platform that helps organisations and individuals identify and respond to threats through realistic phishing simulations, interactive training, quizzes, and user risk insights.

## 1.2 Intended Audience

This document is intended for Insightful Phish developers, our client (Southern Cross Solutions), and other stakeholders including the COS301 lecturers.

## 1.3 Product Scope

Insightful Phish is a modular cybersecurity awareness training platform intended for individual trainees, organisation-linked trainees, organisation administrators, and Insightful Phish platform administrators. The product provides role- and permission-based access control so that each user type can access only the features, workflows, and data appropriate to their responsibilities. This includes separating individual trainee activity from organisation-scoped activity, restricting organisation administration to authorised organisation administrators, and reserving platform-level administration for Insightful Phish administrators.

The product direction is centred on campaign-based cybersecurity awareness training. Campaigns act as the main assignment and ordering container for training experiences. A campaign may contain multiple campaign items in a defined order, allowing trainees to progress through structured cybersecurity awareness activities. Campaign content includes simulated inboxes and emails, training documents, and quizzes. These are represented as campaign items. Campaign items may also be grouped to support more complex campaign flows.

The long-term product scope is intended to provide a comprehensvie cybersecurity awareness training, learning and behavioural platform for organisations and their trainees, as well as individuals who would like to improve their cybersecurity awareness. The platform is intended to improve cybersecurity awareness through realistic simulations, interactive learning experiences, and organisation management capabilities, while remaning modular, secure and extendible.

The long-term product scope includes:

- **Trainee learning and engagement**
  - Personalied learning paths
  - Interactive cybersecurity training campaigns
  - Knowledge assessments and quizzes in campaigns
  - Immediate feedback and rememdiation
  - Progress tracking
  - Personalised learning recommendations
- **Cybersecurity simulations**
  - Simulated inbox experiences
  - Phishing-style emails and messages
  - Interactive cybersecurity scenarios
  - Real email simulation workflows
  - Organisation specific simulation content
- **Organisation administration**
  - Organisation onboarding
  - Organisation-wide reporting dashboards
  - Behavioural analytics
  - Risk scoring and trend analysis
  - Campaign effectivenetss reporting
  - Exportable reports

The platform is intended to remain modular, secure, and extensible so that future training formats, reporting capabilities, simulation types, and organisation-level administration features can be added without changing the overall product direction.

## 1.4 Definitions, Acronyms, and Abbreviations

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

## 1.5 References

//TODO Add references

---

The next section of the SRS is: [Users and User Stories](users-and-user-stories.md)
