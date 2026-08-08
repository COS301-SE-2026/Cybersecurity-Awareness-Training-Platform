# Users and User Stories

This section describes the main user classes for Insightful Phish and their user goals.

## SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- **[2. Users and User Stories](#2-users-and-user-stories)** &larr; _You are here_
  - [2.1 Product Perspective](#21-product-perspective)
  - [2.2 User Classes and Characteristics](#22-user-classes-and-characteristics)
    - [Individual Trainee](#individual-trainee)
    - [Organisation Trainee](#organisation-trainee)
    - [Organisation Administrator](#organisation-administrator)
    - [Insightful Phish Administrator](#insightful-phish-administrator)
  - [2.3 User Stories](#23-user-stories)
    - [Organisation Registration](#1-organisation-registration)
    - [Authentication and Account Management](#2-authentication-and-account-management)
    - [Individual Trainee Access](#3-individual-trainee-access)
    - [Organisation Trainee Membership](#4-organisation-trainee-membership)
    - [Training Campaign Participation](#5-training-campaign-participation)
    - [Organisation Administration](#6-organisation-administration)
    - [Platform Administration](#7-platform-administration)
    - [Platform Super-Administrator](#8-platform-super-administrator)
- [3. Functional Requirements](functional-requirements.md)
- [4. Use Cases](use-cases.md)
- [5. Quality Requirements](quality-requirements.md)
- [6. Domain Model](domain-model.md)
- [7. Changelog](changelog.md)

---

## 2. Users and User Stories

### 2.1 Product Perspective

The Insightful Phish platform is a web-based application that provides cybersecurity awareness training through campaigns. It is designed to be secure and modular, allowing for future expansion of features, content types, and reporting capabilities. The platform is intended to be used by individual trainees, organisation-linked trainees, organisation administrators, and Insightful Phish platform administrators. The product is designed to be accessed through modern web browsers and to provide a consistent user experience across different devices and screen sizes for trainees. Administration and management features are primarily intended for desktop or larger-screen devices, where more complex workflows can be effectively managed.

### 2.2 User Classes and Characteristics

### Individual Trainee

An Individual Trainee is a self-enrolled user who uses the platform independently to improve their cybersecurity awareness. They are not linked to an organisation. They self-enrol and participate in training campaigns, complete simulations and quizzes and can monitor and track their own progress through personal dashboards and feedback.

Individual trainees are expected to have basic computer literacy and be familiar with standard web browsers. They can only access their own profile, learning history and personal data. Their interface should prioritise simplicity, clear navigation, plain language, accessibility and responsive design across desktop and mobile devices.

### Organisation Trainee

An Organisation Trainee is a member of an organisation who completes cybersecurity awareness campaigns assigned to them by their organisation's administrators. They can also review their own results, feedback and learning progress while following organisation-defined security awareness programmes.

Organisation trainees, like individual trainees, are expected to have basic computer literacy and be familiar with standard web browsers. They have access to their own profile and training information. They can also access organisation-specific settings and the campaigns that are assigned to them by organisation administrators. Their interface should prioritise simplicity, clear navigation, plain language, accessibility and responsive design across desktop and mobile devices.

### Organisation Administrator

An Organisation Administrator manages cybersecurity awareness in a single organisation. Their responsibilities include managing trainees, creating and scheduling campaigns, reviewing trainee performance, monitoring organisation risk and configuring organisation-specific settings.

Organisation administrators are expected to have intermediate computer literacy and be comfortable with web-based administrator systems. They have authority over organisation-level data, campaign content, and trainee management within their organisation. Administrative interfaces should be efficient to use, present information clearly, have role-based access control and be auditable. The administrator interface should also be responsive and suited to larger displays.

### Insightful Phish Administrator

> [!Note]
> Insightful Phish Administrators are also referred to as **Platform Administrators** as they administer the Insightful Phish platform. Our documentation uses these two terms interchangeably.

An Insightful Phish Administrator oversees the entire platform and is responsible for managing organisations, organisation administrators, platform configuration and overall system health. They monitor platform usage, maintain security and perform platform-wide administrative functions.

Insightful Phish administrators are expected to have advanced computer literacy and experience with complex web-based administration systems. They have access to platform-wide data and administrative functionality across all organisations. Administrative interfaces should support efficient management of large datasets, comprehensive audit logging, role-based access control and clear workflows for security and sensitive operations.

### 2.3 User Stories

The following user stories describe the goals that each user type aims to achieve by using Insightful Phish. They are grouped according to the functionality that they relate to.

### 1. Organisation Registration

**1.1** As an organisation representative, I want to submit an organisation registration request, so that my organisation can be reviewed and onboarded onto Insightful Phish.

### 2. Authentication and Account Management

**2.1** As a registered user, I want to log in through a common login page, so that I can securely access the area of the platform appropriate to my user type.

**2.2** As an authenticated user, I want to log out, so that I can protect my account when I am no longer using the platform.

**2.3** As an account holder, I want to reset a forgotten password securely, so that I can regain access to my account without the platform revealing whether my account exists.

**2.4** As an authenticated user, I want to update my personal information and password, so that my account details remain accurate and secure.

**2.5** As an authenticated user, I want to change and verify my email address, subject to my organisation's security policy where applicable, so that account communication can reach the correct email address.

**2.6** As an authenticated user, I want to view and revoke my active sessions and manage my account security settings, so that I can protect my account from unauthorised access.

### 3. Individual Trainee Access

**3.1** As an individual trainee, I want to register and verify my email address, so that I can securely access general cybersecurity awareness training campaigns.

**3.2** As an individual trainee, I want to browse publisher premade campaigns and view their details, so that I can find training campaigns that interest me.

**3.3** As an individual trainee, I want to enrol myself in a selected premade campaign, so that I can begin training that interests me.

**3.4** As an individual trainee, I want to reset my progress for a selected self-enrolled campaign, so that I can restart that training experience from the beginning.

### 4. Organisation Trainee Membership

**4.1** As an invited organisation trainee, I want to accept an invitation and securely set up my account, so that I can control whether I join an organisation.

**4.2** As an organisation trainee, I want to view the campaigns assigned to me by my organisation, so that I can complete the training required by my organisation.

**4.3** As an organisation trainee invited for promotion, I want to review and accept or reject the organisation administrator role and its permissions, so that my authority only changes with my consent.

### 5. Training Campaign Participation

**5.1** As a trainee, I want to view the campaigns available to me, including their status, progress and, where applicable, their start and end dates, so that I know which training I need to complete.

**5.2** As a trainee, I want to follow campaign items in their defined order and understand any locked prerequisites, so that I can complete the training in its intended sequence.

**5.3** As a trainee, I want to view and open simulated emails in a controlled inbox, so that I can safely practise recognising suspicious messages.

**5.4** As a trainee, I want to classify simulated emails and receive educational feedback, so that I can learn to recognise and respond to potential cybersecurity threats.

**5.5** As a trainee, I want to interact safely with simulated links, attachments and forms, so that I can experience realistic threats without exposing real credentials, sensitive information or devices.

**5.6** As a trainee, I want to read training documents included in a campaign, so that I can learn about cybersecurity and how to recognise and respond to cyber threats.

**5.7** As a trainee, I want to complete campaign quizzes and view my results and feedback, so that I can assess my understanding and identify areas for improvement.

**5.8** As a trainee, I want to view my campaign completion, scores, activity and educational and risk feedback, so that I can understand my progress and identify areas for improvement.

### 6. Organisation Administration

**6.1** As the initial organisation administrator, I want to complete my account setup, so that I can activate and begin configuring and managing my organisation.

**6.2** As an organisation administrator, I want to view organisation trainees and their invitation statuses, so that I can understand the organisation's membership and onboarding state.

**6.3** As an organisation administrator, I want to invite trainees and resend or revoke eligible invitations, so that I can manage employee onboarding.

**6.4** As an organisation administrator, I want to disable or reactivate a trainee's membership, so that the trainee's organisation access reflects their current employment or participation status.

**6.5** As an organisation administrator, I want to view the organisation's administrators and their permissions, so that I can understand its administrative structure and access controls.

**6.6** As an organisation administrator with the appropriate permission, I want to promote an active organisation trainee and assign their initial permissions, so that I can delegate administrative responsibility safely.

**6.7** As an organisation administrator with the appropriate permission, I want to change or remove another administrator's permissions, so that administrative access remains appropriate without leaving the organisation unmanaged.

**6.8** As an organisation administrator with the appropriate permission, I want to configure organisation security policies, so that user sessions and sensitive account actions follow the organisation's security requirements.

**6.9** As an organisation administrator with the appropriate permission, I want to manage approved organisation context, including branding, policies, terminology and domains, so that training can represent the organisation accurately and safely.

**6.10** As an organisation administrator with the appropriate permission, I want to create and manage employee tags and tag memberships, so that trainees can be grouped flexibly for campaign assignment and reporting.

**6.11** As an organisation administrator with the appropriate permission, I want to create, edit, archive and manage organisation campaigns, so that training can be tailored to the organisation's needs.

**6.12** As an organisation administrator with the appropriate permission, I want to create reusable campaign items, including training documents, quizzes and simulated inboxes, so that I can build campaigns efficiently and consistently.

**6.13** As an organisation administrator with the appropriate permission, I want to assign campaigns to selected trainees and the current trainees of selected tags, so that the correct employees can receive the required training.

**6.14** As an organisation administrator with the appropriate permission, I want to reset progress for an explicitly selected campaign and trainee scope, so that retraining can occur without affecting other campaigns or trainees.

**6.15** As an organisation administrator with the appropriate permission, I want to view campaign progress, performance and risk score for trainees and tags, so that I can understand the organisation's cybersecurity awareness understanding and readiness.

**6.16** As an organisation administrator with the appropriate permission, I want to review the organisation's audit history, so that important membership permission, security, content and campaign changes remain accountable.

**6.17** As an organisation administrator with the appropriate permission, I want AI assistance when drafting simulated emails, training documents and quizzes, with human review required before publication, so that content can be created more efficiently without compromising quality or safety.

### 7. Platform Administration

**7.1** As a platform administrator, I want to review and filter organisation registration requests and mark them as contacted, so that onboarding requests can be managed consistently.

**7.2** As a platform administrator, I want to approve or reject an organisation registration request and invite its initial administrator following approval, so that only reviewed and approved organisations can access the platform.

**7.3** As a platform administrator, I want to track an organisation's onboarding progress and resend an eligible initial-administrator invitation, so that failed or expired email delivery does not leave the organisation's onboarding permanently blocked.

**7.4** As a platform administrator, I want to view organisation details and suspend or reactivate organisation access, so that platform-level access can be governed safely and consistently.

**7.5** As a platform administrator, I want to create and manage premade campaigns and reusable campaign items, so that individual trainees can access high-quality training content and organisation administrators can create their own campaigns more easily.

**7.6** As a platform administrator, I want to publish or unpublish premade campaigns, so that I can control what individual trainees can discover without erasing existing enrolments or progress.

**7.7** As a platform administrator, I want to view aggregated platform usage, organisation-lifecycle and security insights, so that I can operate the platform without unnecessarily accessing organisation- or trainee-level data.

**7.8** As a platform administrator, I want to review platform audit and security events, so that privileged actions and suspicious activity can be investigated.

### 8. Platform Super-Administrator

**8.1** As a platform super-administrator, I want to view and invite platform administrators, so that platform management responsibilities can be shared.

**8.2** As a platform super-administrator, I want to revoke or demote platform administrators, so that platform access can be governed safely and consistently.

**8.3** As a platform super-administrator, I want to transfer the super-administrator role to another active platform administrator, so that the platform always has exactly one accountable super-administrator.

---

Previous section: [Introduction and Scope](introduction.md)

Next section: [Functional Requirements](functional-requirements.md)
