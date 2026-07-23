# Insightful Phish Software Requirements Specification

## 1. Introduction

### 1.1 Purpose

This document defines the Software Requirements Specification for Insightful Phish, a web-based cybersecurity awareness and training platform that helps organisations and individuals identify and respond to threats through realistic phishing simulations, interactive training, quizzes, and user risk insights.

### 1.2 Intended Audience

This document is intended for Insightful Phish developers, our client (Southern Cross Solutions), and other stakeholders including the COS301 lecturers.

### 1.3 Product Scope

Insightful Phish is a modular cybersecurity awareness training platform intended for individual trainees, organisation-linked trainees, organisation administrators, and Insightful Phish platform administrators. The product provides role- and permission-based access control so that each user type can access only the features, workflows, and data appropriate to their responsibilities. This includes separating individual trainee activity from organisation-scoped activity, restricting organisation administration to authorised organisation administrators, and reserving platform-level administration for Insightful Phish administrators.

The product direction is centred on campaign-based cybersecurity awareness training. Campaigns act as the main assignment and ordering container for training experiences. A campaign may contain multiple campaign items in a defined order, allowing trainees to progress through structured cybersecurity awareness activities. Campaign content includes simulated inboxes and emails, training documents, and quizzes. In the current implementation and supporting documentation, they are represented as campaign items. Campaign items may also be grouped to support more complex campaign flows.

The long-term product scope includes organisation onboarding, organisation-scoped trainee management, campaign management, reporting dashboards, reusable campaign components, AI-assisted content generation, and richer cybersecurity simulations. These simulations may include simulated inbox experiences, phishing-style messages, training content, quizzes, and ethically constrained real-email simulation workflows that allow organisations to assess trainee responses in a controlled and authorised environment. The platform is intended to remain modular, secure, and extensible so that future training formats, reporting capabilities, simulation types, and organisation-level administration features can be added without changing the overall product direction.

### 1.4 Definitions, Acronyms, and Abbreviations

| Term                               | Definition                                                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trainee**                        | A user who completes cybersecurity awareness training through campaigns.                                                                     |
| **Organisation trainee**           | A trainee who is linked to an organisation and may be assigned campaigns by an organisation admin.                                           |
| **Organisation administrator**     | A user with administrative permissions for an organisation, able to manage organisation-specific campaigns, content, and organisation users. |
| **Insightful Phish administrator** | A platform-level administrator with permissions to manage the entire Insightful Phish platform.                                              |
| **Platform administrator**         | An Insightful Phish administrator. (see Insightful Phish admin)                                                                              |

<!-- Put acronyms in `` and keep abbreviations as above -->

| Abbreviation / Acronym | Definition                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`RBAC`**             | Role-Based Access Control: A system for restricting access to resources based on user roles and permissions.                                              |
| **`TUCBW`**            | This use case begins with: Defines the initial state and preconditions for the use case.                                                                  |
| **`TUCEW`**            | This use case ends with: Specifies the final state and postconditions for the use case.                                                                   |
| **`SRS`**              | Software Requirements Specification: A document that describes the software system to be developed, including functional and non-functional requirements. |

### 1.5 References

//TODO Add references

### 1.6 Document Overview

This document is divided into the following sections:

- [Section 1: Introduction](#1-introduction): Provides an overview of the document, including its purpose, intended audience, product scope, definitions, acronyms, and references.
- [Section 2: Overall Description](#2-overall-description): Describes the product perspective, product functions, and user classes and characteristics.

//TODO: Add more sections here

## 2. Overall Description

### 2.1 Product Perspective

The Insightful Phish platform is a web-based browser accessed application that provides cybersecurity awareness training through campaigns. It is designed to be secure and modular, allowing for future expansion of features, content types, and reporting capabilities. The platform is intended to be used by individual trainees, organisation-linked trainees, organisation administrators, and Insightful Phish platform administrators. The product is designed to be accessed through modern web browsers and is intended to provide a consistent user experience across different devices and screen sizes for trainees. Administration and management features are primarily intended for desktop or larger-screen devices, where more complex workflows can be effectively managed.

### 2.2 Product Functions

The Insightful Phish platform provides the following core functions:

- Individual Trainee registration and authentication
- Organisation Trainee invitation, account setup, and authentication
- Organisation Administrator invitation and role upgrade, account setup, and authentication
- Organisation Administrator management of organisation trainees, campaigns, and content
- Campaign creation, assignment, and management by organisation admins to organisation trainees
- Self-enrolment in campaigns by individual trainees
- Campaign participation by trainees, including simulated inboxes, training documents, and quizzes
- Reporting and analytics for organisation admins to monitor organisation trainee progress, campaign completion, and risk assessment
- Insightful Phish platform administrator management of organisations, organisation admins, and platform-level settings

### 2.3 User Classes and Characteristics

| User class                     | Goals                                                                                                       | Expected skill                                                                                     | Authority / Sensitivity                                                  | Usability Considerations                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Individual Trainee**         | Complete self-enrolled campaigns, learn to recognise and respond to cyber threats                           | Basic computer literacy, familiarity with web browsers                                             | Own profile and personal data                                            | Plain language, clear instructions, mobile responsive design, accessible content, clear flows                  |
| **Organisation Trainee**       | Complete assigned campaigns, learn to recognise and respond to cyber threats                                | Basic computer literacy, familiarity with web browsers                                             | Own profile and personal data, Organisation-controlled settings and data | Plain language, clear instructions, mobile responsive design, accessible content, clear flows                  |
| **Organisation Administrator** | Manage organisation trainees, campaigns, and content; monitor trainee progress and risk                     | Intermediate computer literacy, familiarity with web applications and administrative workflows     | Organisation-level data, trainee data, campaign content                  | Clear administrative workflows, role-based access control, audit logging, responsive design for larger screens |
| **Platform Administrator**     | Manage organisations, organisation admins, and platform-level settings; monitor platform usage and security | Advanced computer literacy, familiarity with web applications and complex administrative workflows | Platform-level data, organisation data, trainee data, campaign content   | Clear administrative workflows, role-based access control, audit logging, responsive design for larger screens |

### 2.4 Operating Environment

Insightful Phish is a web-based application that is designed to run on modern web browsers. The platform's operating environment is split between the client-side (front-end) and server-side (back-end) components. The client-side is accessed through web browsers on desktop and mobile devices, and this is where users interact with the platform and where local data storage and caching occur. The server-side is hosted on the client's provided server infrastructure, where the platform's back-end services, databases, and APIs are deployed. The server-side is responsible for processing requests, managing data storage, enforcing security policies, and providing the necessary functionality to support the client-side application.

### 2.5 Design and Implementation Constraints

The Insightful Phish platform is subject to the following design and implementation constraints:

| Constraint ID | Constraint Description                                                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`CON-01`**  | The system shall comply with all applicable privacy laws and data-protection obligations for personal data handling                                                                                     |
| **`CON-02`**  | The system shall be designed to prevent unauthorised access to sensitive data, including trainee personal information and organisation data                                                             |
| **`CON-03`**  | The system shall be designed to ensure that privileged actions are restricted by explicit role and permission checks                                                                                    |
| **`CON-04`**  | The system shall be designed to prevent accidental or malicious data loss, including through audit logging and change tracking                                                                          |
| **`CON-05`**  | The system shall run on the client's provided server hosting infrastructure and be deployable through Docker containers                                                                                 |
| **`CON-06`**  | The system shall be designed to be modular and extensible, allowing for future expansion of features, content types, and reporting capabilities without requiring major architectural changes           |
| **`CON-07`**  | Documentation shall remain version-controlled and separately identifiable from earlier demo documentation versions, with clear versioning and change history to support traceability and accountability |

### 2.6 Assumptions and Dependencies

InsightfulPhish aims to be as self-contained and independent as possible, but the following assumptions and dependencies are relevant to the current implementation and future development:

- The system assumes that users have access to modern web browsers and a stable internet connection for accessing the platform.
- The system assumes that users have access to email for receiving invitations, notifications, and other communications from the platform. Without email access, users will not be able to create an account, and thus will not be able to access the platform.
- The system assumes that Insightful Phish administrators will manage organisation registration requests. This means that Insightful Phish administrators will have the ability to approve or reject organisation registration requests, and will be responsible for ensuring that only legitimate organisations are granted access to the platform.
- The system assumes that organisation administrators will manage their own organisation's trainees, campaigns, and content. This means that organisation administrators will have the ability to add and remove trainees, create and manage campaigns, and upload and manage training content for their organisation. Insightful Phish administrators will not be responsible for managing organisations, trainees, campaigns, or content.
- The system assumes that the platform will be deployed on the client's provided server hosting infrastructure, and that the client will provide the necessary resources and support for maintaining the platform's availability, performance, and security.
- The system assumes that organisations have a way of communicating with their trainees, such as through email or other communication channels, to inform them of their organisation's registration and onboarding process. This means that organisations will be responsible for ensuring that their trainees are aware of the platform and how to access it.

### 2.7 System Boundaries

Insightful Phish tries to be as self-contained as possible, but the following system boundaries are relevant to the current implementation and future development:

- **Email delivery**: Insightful Phish owned emails will be sent by an SMTP server hosted on the client's provided server infrastructure. The system will not send emails from external email providers or third-party services for these types of emails. Once supported, Campaign owned real email delivery will be opt-in and ethically constrained, and will require explicit organisation context, domain, and SMTP configuration. This means that organisations that want their own domain and SMTP configuration for sending real emails will need to provide the necessary information and configuration to the platform.
- **AI-assisted content generation**: Insightful Phish may eventually support AI-assisted content generation for quizzes, emails, and training content. How AI-assisted content generation is implemented is currently under investigation and will be determined in future. For now the focus is first on getting the core platform functionality implemented and tested, and then exploring how AI-assisted content generation can be integrated into the platform in a secure and ethical manner.

### 2.8 Current Product Status

Insightful Phish is currently in development, with the first demo (Demo 1) focusing on core trainee-facing use cases, including viewing simulated emails, accessing training documents, and completing quizzes. Demo 2 features focus on authentication and access control, which includes secure individual trainee registration, organisation registration and approval, organisation admin setup, and organisation trainee invitation and acceptance. Demo 2 also includes the first organisation admin management features, including managing organisation trainees, organisation security settings, and organisation admin permissions. Future demos will expand on campaign creation, assignment, and management, as well as reporting and analytics for organisation admins and Insightful Phish administrators.

## 3. User Stories

### 3.1 User Story Format

Insightful Phish is used by multiple user types, each with different goals and responsibilities. User stories are written in the following format:

```
As a [type of user]
I want to [perform some action]
So that [benefit or value is achieved]
```

A user story is not the same as a use case. A user story describes a user's goal or need, while a use case describes the steps and interactions required to achieve that goal or need. User stories are written from the perspective of the user. In the table below, the following fields are used to describe each user story:

- **User story ID**: A unique identifier for the user story.
- **User story**: A description of the user's goal or need, written in the user story format above.
- **Business value**: A description of the benefit or value that the user story provides to the user or the organisation.
- **Acceptance criteria**: A list of conditions that must be met for the user story to be considered complete and successful. Acceptance criteria are written in a clear and testable format, and should be specific enough to allow for verification of the user story's implementation.
- **Related to:** IDs of related user stories, use cases, or requirements that are relevant to the user story. This field helps to establish traceability and context for the user story within the overall system.

### 3.2 External Organisation Representative User Story

| User Story ID      | User Story                                                                                                                                                                                 | Business Value                                                                                                                                                                | Acceptance Criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Related to |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **`US-ORGREQ-01`** | As an organisation representative, I want to submit an organisation registration request so that my organisation can be onboarded into the Insightful Phish platform after being reviewed. | The organisation representative can submit a registration request for their organisation, which will be reviewed and approved (or denied) by Insightful Phish administrators. | The organisation representative can access the organisation registration form The form includes fields for organisation name, contact information, and any other required details. Upon submission, the system validates the input and provides feedback on any errors. The system sends a confirmation email to the organisation representative acknowledging receipt of the registration request. The system records the registration request in the platform's database for review by Insightful Phish administrators. | ...        |

### 3.3 Shared Account and Authentication User Stories

| User Story ID       | User Story                                                                                                                                                                          | Business Value                                                                                                                                           | Acceptance Criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Related to |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **`US-AUTH-01`**    | As a registered user, I want to log in through a common login page so that I am authenticated and securely redirected to the area for my user type.                                 | The registered user can log in to the platform and access the appropriate area for their user type.                                                      | The login page is accessible from the platform's main page. The login page includes fields for email and password. Upon submission, the system validates the input and provides feedback on any errors. If the credentials are valid, the system authenticates the user and redirects them to the appropriate area for their user type (e.g., trainee dashboard, organisation admin dashboard, etc.). If the credentials are invalid, the system displays an error message and allows the user to retry.                                                                                                               | ...        |
| **`US-AUTH-02`**    | As an authenticated user, I want to log out and revoke any of my active sessions so that I can protect my account on my current and previously used devices/browsers.               | The authenticated user can log out of the platform and revoke any active sessions to protect their account.                                              | The logout option is accessible from the platform's main navigation or user menu. Upon selecting the logout option, the system terminates the user's current session and revokes the current session's authentication token. The system also provides an option for the user to view and revoke any other active sessions associated with their account. The system confirms that the user has been logged out and redirects them to the login page or main page.                                                                                                                                                      | ...        |
| **`US-AUTH-03`**    | As an account golder, I want to reset a forgotten password password securely so that I can regain access to my account without exposing whether the account exists.                 | The account holder can reset their password securely without revealing whether the account exists.                                                       | The password reset option is accessible from the login page. Upon selecting the password reset option, the system prompts the user to enter their email address. The system sends a password reset email to the provided email address, regardless of whether the account exists or not. The email contains a secure link to reset the password, which expires after a certain period. The user can follow the link to set a new password for their account. The system confirms that the password has been successfully reset and allows the user to log in with the new password.                                    | ...        |
| **`US-ACCOUNT-01`** | As an authenticated user, I want to update my personal information, including my password, so that my account remains accurate and secure.                                          | The authenticated user can update their personal information and password to maintain account accuracy and security.                                     | The account settings option is accessible from the platform's main navigation or user menu. The account settings page includes fields for updating personal information (e.g. name, email) and password. To update the user's password, they must provide their current password and the new password. Upon submission, the system validates the input and provides feedback on any errors. If the input is valid, the system updates the user's personal information and/or password in the platform's database. The system confirms that the changes have been successfully saved and provides feedback to the user. | ...        |
| **`US-ACCOUNT-02`** | As an authenticated user, I want to change and verify my email address, subject to organisation policy if applicable, so that my account communication reaches the correct address. | The authenticated user can change and verify their email address to ensure that account communication reaches the correct address.                       | The email change option is accessible from the account settings page. The user can enter a new email address and submit the request. The system sends a verification email to the new email address, containing a secure link to confirm the change. The user must follow the link to verify the new email address. Upon successful verification, the system updates the user's email address in the platform's database and confirms that the change has been successfully made.                                                                                                                                      | ...        |
| **`US-ACCOUNT-03`** | As an authenticated user, I want to view and revoke active sessions and manage my account security settings so that I can protect my account from unauthorised access.              | The authenticated user can view and revoke active sessions and manage their account security settings to protect their account from unauthorised access. | The account security settings option is accessible from the account settings page. The user can view a list of active sessions associated with their account, including device information and login timestamps. The user can select an active session and revoke it, terminating the session and requiring re-authentication for that device/browser. The system confirms that the session has been successfully revoked and provides feedback to the user.                                                                                                                                                           | ...        |

### 3.4 Individual Trainee User Stories

| User Story ID  | User Story                                                                                                                                                            | Business Value                                                                                                                         | Acceptance Criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Related to |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **`US-IT-01`** | As an individual trainee, I want to register and verify my email address so that I can securely access general cybersecurity training.                                | The individual trainee can register for an account and verify their email address to securely access general cybersecurity training.   | The registration option is accessible from the platform's main page. The registration form includes fields for personal information (e.g. name, email) and password. Upon submission, the system validates the input and provides feedback on any errors. The system sends a verification email to the provided email address, containing a secure link to confirm the registration. The user must follow the link to verify their email address and complete the registration process. Upon successful verification, the system confirms that the account has been successfully created and allows the user to log in with their credentials.                             | ...        |
| **`US-IT-02`** | As an individual trainee, I want to browse published premade campaigns and view their details so that I can decide which campaigns interest me                        | The individual trainee can browse published premade campaigns and view their details to decide which campaigns interest them.          | The campaign browsing option is accessible from the trainee dashboard or main page. The system displays a list of published premade campaigns, including campaign titles, descriptions, and any relevant metadata (e.g. difficulty level, estimated completion time). The trainee can select a campaign to view its details, including the campaign's objectives, content types (e.g. simulated inboxes, training documents, quizzes), and any prerequisites or requirements. The system provides clear navigation and filtering options to help the trainee find campaigns that match their interests and goals.                                                          | ...        |
| **`US-IT-03`** | As an individual trainee, I want to self-enrol in selected premade campaigns so that I can begin training that interests me.                                          | The individual trainee can self-enrol in selected premade campaigns to begin training that interests them.                             | The campaign self-enrolment option is accessible from the campaign details page. The trainee can select a campaign and click the "Enrol" button to initiate the enrolment process. The system validates the enrolment request and confirms that the trainee has been successfully enrolled in the selected campaign. The system provides feedback to the trainee, including any relevant information about the campaign. Upon successful enrolment, the trainee can access the campaign's content and begin their training journey.                                                                                                                                        | ...        |
| **`US-IT-04`** | As an individual trainee, I want to explicitly reset progress for a selected self-enrolled campaign so that I can restart the training experience from the beginning. | The individual trainee can reset progress for a selected self-enrolled campaign to restart the training experience from the beginning. | The campaign progress reset option is accessible from the trainee dashboard or campaign details page. The trainee can select a self-enrolled campaign and click the "Reset Progress" button to initiate the reset process. The system prompts the trainee to confirm their decision to reset progress, providing a clear warning about the consequences of this action. Upon confirmation, the system resets the trainee's progress for the selected campaign, including any completed content, quiz attempts, and interaction history. The system confirms that the progress has been successfully reset and allows the trainee to begin the campaign from the beginning. | ...        |

### 3.5 Organisation Trainee User Stories

| User Story ID  | User Story                                                                                                                                                                                      | Business Value                                                                                                                                                              | Acceptance Criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Related to |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| **`US-OT-01`** | As an organisation trainee, I want to accept or reject my invitation to join my organisation and securely complete account setup so that I can control whether I want to join the organisation. | The organisation trainee can choose to accept the invitation to join their organisation and securely complete account setup.                                                | The organisation trainee receives an invitation email from their organisation administrator, containing a secure link to accept the invitation. Upon clicking the link, the system prompts the trainee create an account. The system validates the trainee's credentials and confirms their identity. The trainee can choose to accept the invitatation by clicking on the link in the email, which will redirect them to the account setup page. The system confirms that the trainee has successfully joined the organisation and allows them to access organisation-specific campaigns and content. The trainee can ignore the invitation email, in which case they will not be added to the organisation and will not have access to organisation-specific campaigns and content.                                                                                          | ...        |
| **`US-OT-02`** | As an organisation trainee, I want to view campaigns assigned by my organisation so that I can complete the training required by my organisation.                                               | The organisation trainee can view campaigns assigned by their organisation to complete the required training.                                                               | The campaign overview option is accessible from the trainee dashboard or main page. The system displays a list of campaigns assigned to the organisation trainee by their organisation administrator, including campaign titles, descriptions, status (e.g. not started, in progress, completed), progress indicators (e.g. percentage completed), and any relevant start and end dates. The trainee can select a campaign to view its details and access the campaign's content. The system provides clear navigation and filtering options to help the trainee find campaigns that match their interests and goals.                                                                                                                                                                                                                                                          | ...        |
| **`US-OT-03`** | As an organisation trainee invited for promotion, I want to review and accept or reject the organisation-admin role and its permission so that my authority is changed only with my consent.    | The organisation trainee can review and accept or reject the organisation-admin role and its permissions to ensure that their authority is changed only with their consent. | The organisation trainee receives a promotion invitation email from their organisation administrator, containing a secure link to review the promotion. Upon clicking the link, the system displays the details of the organisation-admin role, including its permissions and responsibilities. The trainee can choose to accept the promotion by clicking on the "Accept" button, which will update their role and permissions in the platform's database. The system confirms that the trainee has successfully accepted the promotion and allows them to access organisation-admin features and workflows. The trainee can also choose to reject the promotion by clicking on the "Reject" button, in which case their role and permissions will remain unchanged. The system confirms that the trainee has rejected the promotion and provides feedback on their decision. | ...        |

### 3.6 User Stories Shared by both Trainee Types

| User Story ID  | User Story                                                                                                                                                                                         | Business Value                                                                                                                                                                     | Acceptance Criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Related to |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| **`US-TR-01`** | As a trainee, I want to view the campaigns available to me, including their status, progress, and where applicable, their start and end dates, so that I know what training to complete.           | The trainee can view the campaigns available to them, including their status, progress, and relevant dates, to know what training to complete.                                     | The campaign overview option is accessible from the trainee dashboard or main page. The system displays a list of campaigns available to the trainee, including campaign titles, descriptions, status (e.g. not started, in progress, completed), progress indicators (e.g. percentage completed), and any relevant start and end dates. The trainee can select a campaign to view its details and access the campaign's content. The system provides clear navigation and filtering options to help the trainee find campaigns that match their interests and goals.                                                                                                                                                                                  | ...        |
| **`US-TR-02`** | As a trainee, I want to follow campaign items in their defined order and understand locked prerequisites so that I can complete the training in the intended sequence.                             | The trainee can follow campaign items in their defined order and understand locked prerequisites to complete the training in the intended sequence.                                | The campaign item navigation option is accessible from the campaign details page. The system displays a list of campaign items in their defined order, including any locked prerequisites or dependencies. The trainee can select a campaign item to view its content and complete the associated training activities. The system provides clear feedback on the trainee's progress through the campaign items, including any locked items that require completion of previous items. The system ensures that the trainee cannot access locked items until the prerequisites have been met.                                                                                                                                                            | ...        |
| **`US-TR-03`** | As a trainee, I want to view and open simulated emails in a controlled inbox that is part of a campaign, so that I can practise recognising suspicious messages safely.                            | The trainee can view and open simulated emails in a controlled inbox that is part of a campaign to practise recognising suspicious messages safely.                                | The simulated inbox option is accessible from the campaign details page or campaign item page. The system displays a list of simulated emails assigned to the trainee, including sender information, subject lines, and received dates. The trainee can select a simulated email to view its content in a controlled environment. The system ensures that the simulated emails are safe and do not contain any malicious links or attachments. The system provides clear feedback on the trainee's interactions with the simulated emails, including any actions taken (e.g. opened, marked as suspicious).                                                                                                                                            | ...        |
| **`US-TR-04`** | As a trainee, I want to classify simulated emails and receive educational feedback so that I can learn to recognise and respond to potential cyber threats.                                        | The trainee can classify simulated emails and receive educational feedback to learn to recognise and respond to potential cyber threats.                                           | The email classification option is accessible from the simulated email view. The trainee can select a classification option (e.g. safe, suspicious, phishing) for the simulated email. Upon submission, the system provides educational feedback based on the trainee's classification, including explanations of why the email is considered safe or suspicious. The system records the trainee's classification and feedback for future reference and progress tracking. The system ensures that the feedback is clear, informative, and aligned with best practices for cybersecurity awareness training.                                                                                                                                           | ...        |
| **`US-TR-05`** | As a trainee, I want to interact safely with simulated links, attachments and forms so that I can experience realistic threats without exposing real credentials, sensitive information or devices | The trainee can interact safely with simulated links, attachments, and forms to experience realistic threats without exposing real credentials, sensitive information, or devices. | The simulated interaction option is accessible from the simulated email view. The system provides simulated links, attachments, and forms that mimic real-world threats in a controlled environment. The trainee can interact with these elements without exposing any real credentials or sensitive information. The system ensures that all interactions are safe and do not compromise the trainee's device or personal data. The system provides clear feedback on the trainee's interactions, including any potential risks or best practices for handling similar situations in real-world scenarios.                                                                                                                                            | ...        |
| **`US-TR-06`** | As a trainee, I want to read training documents that are part of a campaign so that I can learn how to recognise and respond to cyber threats.                                                     | The trainee can read training documents that are part of a campaign to learn how to recognise and respond to cyber threats.                                                        | The training document option is accessible from the campaign details page or campaign item page. The system displays a list of training documents assigned to the trainee, including titles, descriptions, and any relevant metadata (e.g. estimated reading time). The trainee can select a training document to view its content in a readable format. The system ensures that the training documents are clear, informative, and aligned with best practices for cybersecurity awareness training. The system provides feedback on the trainee's progress through the training documents, including any completed readings or assessments.                                                                                                          | ...        |
| **`US-TR-07`** | As a trainee, I want to complete campaign quizzes and view their results and feedback so that I can assess my understanding of the training material and identify areas for improvement.           | The trainee can complete campaign quizzes and view their results and feedback to assess their understanding of the training material and identify areas for improvement.           | The quiz option is accessible from the campaign details page or campaign item page. The system displays a list of quizzes assigned to the trainee, including titles, descriptions, and any relevant metadata (e.g. number of questions, time limit). The trainee can select a quiz to begin the assessment. Upon completion, the system provides immediate feedback on the trainee's performance, including correct answers, explanations, and areas for improvement. The system records the trainee's quiz results for future reference and progress tracking. The system ensures that the quizzes are clear, informative, and aligned with best practices for cybersecurity awareness training.                                                      | ...        |
| **`US-TR-08`** | As a trainee, I want to view my campaign completion, scores, activity and educational risk feedback so that I can understand my progress and areas for improvement in cybersecurity awareness.     | The trainee can view their campaign completion, scores, activity, and educational risk feedback to understand their progress and areas for improvement in cybersecurity awareness. | The campaign progress overview option is accessible from the trainee dashboard or campaign details page. The system displays a summary of the trainee's campaign completion status, including scores, completed activities, and any relevant feedback on their performance. The trainee can view detailed information on their progress through each campaign item, including quiz results, training document completions, and simulated email interactions. The system provides clear feedback on the trainee's educational risk level based on their performance and interactions with the training material. The system ensures that the feedback is informative, actionable, and aligned with best practices for cybersecurity awareness training. | ...        |

### 3.7 Organisation Adminitrator User Stories

| User Story ID  | User Story                                                                                                                                                                                                           | Business Value                                                                                                                                                                                                       | Acceptance Criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Related to |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **`US-OA-01`** | As the initial organisation administrator, I want to complete secure account setup so that I can activate and begin configuring and managing my organisation.                                                        | The initial organisation administrator can complete secure account setup to activate and begin configuring and managing their organisation.                                                                          | The initial organisation administrator receives an invitation email from Insightful Phish, containing a secure link to complete the account setup process. Upon clicking the link, the system prompts the administrator to create a secure password and set up multi-factor authentication (MFA) for their account. The system validates the input and provides feedback on any errors. Upon successful completion of the account setup process, the system confirms that the administrator's account has been activated and allows them to access organisation management features and workflows.                                                                                                                                                                                                                                                                                                                  | ...        |
| **`US-OA-02`** | As an organisation administrator, I want to view organisation trainees and invitation statuses so that I can understand membership and onboarding state.                                                             | The organisation administrator can view organisation trainees and invitation statuses to understand membership and onboarding state.                                                                                 | The trainee overview option is accessible from the organisation admin dashboard or main page. The system displays a list of organisation trainees, including their names, email addresses, roles, and invitation statuses (e.g. pending, accepted, rejected). The administrator can filter and sort the list of trainees based on various criteria (e.g. role, invitation status). The system provides clear feedback on the trainee's onboarding state, including any pending invitations or actions required by the administrator. The system ensures that the administrator can easily manage and track the progress of their organisation's trainees.                                                                                                                                                                                                                                                           | ...        |
| **`US-OA-03`** | As an organisation administrator, I want to invite trainees and resend or revoke eligible invitations so that I can manage employee onboarding.                                                                      | The organisation administrator can invite trainees and resend or revoke eligible invitations to manage employee onboarding.                                                                                          | The trainee invitation option is accessible from the organisation admin dashboard or main page. The administrator can enter the email addresses of the trainees they wish to invite and submit the invitation request. The system sends invitation emails to the provided email addresses, containing secure links for the trainees to accept the invitations and complete their account setup. The administrator can view the status of each invitation (e.g. pending, accepted, rejected) and has the option to resend or revoke eligible invitations as needed. The system provides clear feedback on the success or failure of invitation actions and ensures that the administrator can effectively manage their organisation's trainee onboarding process.                                                                                                                                                    | ...        |
| **`US-OA-04`** | As an organisation administrator, I want to disable or reactive trainee membership so that organisation access reflects employment or participation status.                                                          | The organisation administrator can disable or reactivate trainee membership to ensure that organisation access reflects employment or participation status.                                                          | The trainee management option is accessible from the organisation admin dashboard or main page. The administrator can select a trainee from the list and choose to disable or reactivate their membership. The system updates the trainee's access status in the platform's database and provides clear feedback on the success or failure of the action. When a trainee's membership is disabled, they will no longer have access to organisation-specific campaigns and content. When a trainee's membership is reactivated, they will regain access to organisation-specific campaigns and content. The system ensures that the administrator can effectively manage their organisation's trainee access based on employment or participation status.                                                                                                                                                            | ...        |
| **`US-OA-05`** | As an organisation administrator, I want to view administrators and their permissions so that I understand the organisation's administrative structure and access control.                                           | The organisation administrator can view administrators and their permissions to understand the organisation's administrative structure and access control.                                                           | The administrator overview option is accessible from the organisation admin dashboard or main page. The system displays a list of organisation administrators, including their names, email addresses, roles, and permissions. The administrator can filter and sort the list of administrators based on various criteria (e.g. role, permission level). The system provides clear feedback on the organisation's administrative structure and ensures that the administrator can effectively manage and understand access control within their organisation.                                                                                                                                                                                                                                                                                                                                                       | ...        |
| **`US-OA-06`** | As an organisation administrator, I want to promote an active organisation trainee and assign initial permissions, so that administrative responsibility can be delgated safely.                                     | The organisation administrator can promote an active organisation trainee and assign initial permissions to delegate administrative responsibility safely.                                                           | The trainee promotion option is accessible from the organisation admin dashboard or main page. The administrator can select an active organisation trainee from the list and choose to promote them to an organisation administrator role. The system prompts the administrator to assign initial permissions for the promoted trainee, including access to specific features and workflows. Upon confirmation, the system updates the trainee's role and permissions in the platform's database and provides clear feedback on the success or failure of the promotion action. The promoted trainee will receive a notification of their new role and permissions, allowing them to access organisation-admin features and workflows. The system ensures that the administrator can safely delegate administrative responsibility while maintaining control over access and permissions within their organisation. | ...        |
| **`US-OA-07`** | As an organisation administrator with appropriate permission, I want to change or remove another administrator's permissions so that access remains appropriate without leaving the organisation unmanaged.          | The organisation administrator with appropriate permission can change or remove another administrator's permissions to ensure that access remains appropriate without leaving the organisation unmanaged.            | The administrator management option is accessible from the organisation admin dashboard or main page. The administrator can select another organisation administrator from the list and choose to change or remove their permissions. The system prompts the administrator to confirm their action and provides clear feedback on the success or failure of the permission change or removal. The system ensures that the organisation remains managed and that access control is maintained appropriately, preventing any gaps in administrative oversight.                                                                                                                                                                                                                                                                                                                                                        | ...        |
| **`US-OA-08`** | As an organisation administrator, I want to configure organisation security policies so that organisation sessions and sensitive account actions follow the organisation's security requirements.                    | The organisation administrator can configure organisation security policies to ensure that organisation sessions and sensitive account actions follow the organisation's security requirements.                      | The security policy configuration option is accessible from the organisation admin dashboard or main page. The administrator can set various security policies, including session timeouts, multi-factor authentication requirements, password complexity rules, and other relevant security settings. The system validates the input and provides feedback on any errors. Upon successful configuration, the system applies the security policies to all organisation members and ensures that their sessions and sensitive account actions adhere to the defined requirements. The system provides clear feedback on the success or failure of the security policy configuration and ensures that the organisation's security posture is maintained effectively.                                                                                                                                                  | ...        |
| **`US-OA-09`** | As an authorised organisation administrator, I want to create and manage employee tags and tag memberships so that trainees can be grouped flexibly for campaign assignment and reporting.                           | The authorised organisation administrator can create and manage employee tags and tag memberships to group trainees flexibly for campaign assignment and reporting.                                                  | The tag management option is accessible from the organisation admin dashboard or main page. The administrator can create new tags, edit existing tags, and delete tags as needed. The system allows the administrator to assign trainees to specific tags, enabling flexible grouping for campaign assignment and reporting purposes. The system provides clear feedback on the success or failure of tag management actions and ensures that the organisation can effectively organise its trainees for training and reporting purposes.                                                                                                                                                                                                                                                                                                                                                                           | ...        |
| **`US-OA-10`** | As an authorised organisation administrator, I want to manage approved organisation context such as branding, policies, terminology and domains so that training can reflect the organisation accurately and safely. | The authorised organisation administrator can manage approved organisation context, including branding, policies, terminology, and domains, to ensure that training reflects the organisation accurately and safely. | The organisation context management option is accessible from the organisation admin dashboard or main page. The administrator can update branding elements (e.g. logos, colors), configure policies (e.g. acceptable use, security guidelines), define terminology (e.g. internal jargon, acronyms), and manage approved domains for email communications. The system validates the input and provides feedback on any errors. Upon successful configuration, the system applies the updated organisation context to all relevant training materials and communications, ensuring that they accurately reflect the organisation's identity and requirements. The system provides clear feedback on the success or failure of the organisation context management actions and ensures that the organisation's training materials are consistent with its branding and policies.                                     | ...        |
| **`US-OA-11`** | As an authorised organisation administrator, I want to create, edit, archive and manage organisation campaigns so that training can be tailored to organisational needs                                              | The authorised organisation administrator can create, edit, archive, and manage organisation campaigns to tailor training to organisational needs.                                                                   | The campaign management option is accessible from the organisation admin dashboard or main page. The administrator can create new campaigns, edit existing campaigns, archive campaigns that are no longer needed, and manage the overall structure and content of organisation campaigns. The system allows the administrator to define campaign objectives, assign training materials (e.g. simulated inboxes, training documents, quizzes), set start and end dates, and configure any relevant prerequisites or dependencies. The system provides clear feedback on the success or failure of campaign management actions and ensures that the organisation can effectively deliver tailored cybersecurity awareness training to its trainees.                                                                                                                                                                  | ...        |
| **`US-OA-12`** | As an authorised organisation administrator, I want to create reusable campaign items, such as training documents, quizzes, and simulated inboxes, so that I can build campaigns efficiently and consistently.       | The authorised organisation administrator can create reusable campaign items, including training documents, quizzes, and simulated inboxes, to build campaigns efficiently and consistently.                         | The campaign item management option is accessible from the organisation admin dashboard or main page. The administrator can create new campaign items, edit existing items, and organise them into reusable components for future campaigns. The system allows the administrator to define the content, structure, and objectives of each campaign item, ensuring that they align with best practices for cybersecurity awareness training. The system provides clear feedback on the success or failure of campaign item management actions and ensures that the organisation can efficiently build and maintain high-quality training campaigns for its trainees.                                                                                                                                                                                                                                                 | ...        |

| **`US-OA-13`** | As an authorised organisation administrator, I want to assign campaigns to selected trainees and the current members of selected tags so that the correct employees receive training | The authorised organisation administrator can assign campaigns to selected trainees and the current members of selected tags to ensure that the correct employees receive training. | The campaign assignment option is accessible from the organisation admin dashboard or main page. The administrator can select a campaign and choose to assign it to specific trainees or to all members of selected tags. The system validates the selection and provides feedback on any errors. Upon successful assignment, the system updates the campaign access for the selected trainees and tag members, ensuring that they receive notifications and access to the assigned training materials. The system provides clear feedback on the success or failure of the campaign assignment actions and ensures that the organisation can effectively deliver targeted cybersecurity awareness training to its employees. | ... |
| **`US-OA-14`** | As an authorised organisation administrator, I want to reset progress for an explicitly selected campaign-and-trainee scope so that retraining can be completed safely and without affecting other campaigns or trainees. | The authorised organisation administrator can reset progress for an explicitly selected campaign-and-trainee scope to ensure that retraining can be completed safely and without affecting other campaigns or trainees. | The progress reset option is accessible from the organisation admin dashboard or main page. The administrator can select a specific campaign and choose to reset the progress for individual trainees or for all members of selected tags. The system validates the selection and provides feedback on any errors. Upon successful reset, the system clears the progress data for the selected campaign-and-trainee scope, allowing the trainees to retake the training materials and assessments as needed. The system provides clear feedback on the success or failure of the progress reset actions and ensures that the organisation can effectively manage retraining efforts without impacting other campaigns or trainees. | ... |
| **`US-OA-15`** | As an authorised organisation administrator, I want to view campaign progress, performance, and risk scoring for trainees and tags so that I can understand the organisation's cybersecurity awareness posture. | The authorised organisation administrator can view campaign progress, performance, and risk scoring for trainees and tags to understand the organisation's cybersecurity awareness posture. | The campaign progress and risk overview option is accessible from the organisation admin dashboard or main page. The system displays a summary of campaign progress, performance metrics, and risk scoring for individual trainees and for all members of selected tags. The administrator can filter and sort the data based on various criteria (e.g. campaign, trainee, tag) to gain insights into the organisation's overall cybersecurity awareness posture. The system provides clear visualizations and feedback on the data, allowing the administrator to identify areas for improvement and make informed decisions about future training initiatives. The system ensures that the organisation can effectively monitor and assess its cybersecurity awareness efforts. | ... |
| **`US-OA-16`** | As an authorised organisation administrator, I want to review organisation audit history so that important membership, membership, permission, security, content and campaign changes are accountable. | The authorised organisation administrator can review organisation audit history to ensure that important membership, permission, security, content, and campaign changes are accountable. | The audit history review option is accessible from the organisation admin dashboard or main page. The system displays a chronological log of significant actions taken within the organisation, including changes to trainee memberships, administrator permissions, security settings, content updates, and campaign configurations. The administrator can filter and search the audit history based on specific actions, users, or timeframes to investigate any concerns or verify compliance with organisational policies. The system provides clear feedback on the audit entries and ensures that all relevant changes are recorded accurately for accountability and transparency purposes. | ... |
| **`US-OA-17`** | As an authorised organisation administrator, I want to configure and launch opt-in, ethically constrained real-email simulations that are part of a campaign, so that employees can be assessed in a realistic but controlled environment. | The authorised organisation administrator can configure and launch opt-in, ethically constrained real-email simulations that are part of a campaign to assess employees in a realistic but controlled environment. | The real-email simulation configuration option is accessible from the organisation admin dashboard or main page. The administrator can select a campaign and configure the parameters for the real-email simulation, including the email content, target recipients, scheduling, and ethical constraints (e.g. opt-in requirements, safe links). The system validates the configuration and provides feedback on any errors. Upon successful configuration, the system launches the real-email simulation according to the defined parameters, ensuring that it adheres to ethical guidelines and does not compromise employee privacy or security. The system provides clear feedback on the success or failure of the simulation launch and ensures that the organisation can effectively assess employee cybersecurity awareness in a controlled manner. | ... |
| **`US-OA-18`** | As an authorised organisation administrator, I want AI assitance to draft campaign content, including simulated emails, training documents, and quizzes, and require human review before publication so that content creation is faster without surrendering quality or safety. | The authorised organisation administrator can use AI assistance to draft campaign content, including simulated emails, training documents, and quizzes, while requiring human review before publication to ensure that content creation is faster without compromising quality or safety. | The AI-assisted content drafting option is accessible from the organisation admin dashboard or main page. The administrator can initiate the AI content generation process by providing input parameters (e.g. topic, objectives, target audience) for the desired campaign content. The system generates draft content based on the provided parameters and presents it to the administrator for review. The administrator can edit, approve, or reject the AI-generated content before it is published as part of a campaign. The system ensures that all AI-generated content undergoes human review to maintain quality, accuracy, and safety standards. The system provides clear feedback on the success or failure of the content generation and review process and ensures that the organisation can efficiently create high-quality training materials. | ... |

### 3.8 Platform Administrator User Stories

| User Story ID  | User Story                                                                                                                                                                                                                      | Business Value                                                                                                                                                                                                                 | Acceptance Criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Related to |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **`US-PA-01`** | As a platform administrator, I want to review, filter and mark organisation registration requests as contacted so that onboarding requests can be managed consistently.                                                         | The platform administrator can review, filter, and mark organisation registration requests as contacted to ensure that onboarding requests are managed consistently.                                                           | The organisation registration request management option is accessible from the platform admin dashboard or main page. The system displays a list of organisation registration requests, including organisation names, contact information, submission dates, and current statuses (e.g. pending, contacted). The platform administrator can filter and sort the list based on various criteria (e.g. submission date, organisation name) to efficiently manage the requests. The administrator can mark requests as contacted, which updates the status in the system and provides clear feedback on the action taken. The system ensures that all organisation registration requests are tracked and managed consistently to facilitate effective onboarding processes.                                                                                                                              | ...        |
| **`US-PA-02`** | As a platform administrator, I want to approve or reject an organisation request and invite its initial administrator so that only reviewed and approved organisations can access the platform.                                 | The platform administrator can approve or reject an organisation request and invite its initial administrator to ensure that only reviewed and approved organisations can access the platform.                                 | The organisation request approval option is accessible from the platform admin dashboard or main page. The system allows the platform administrator to review the details of each organisation registration request, including submitted information and any supporting documentation. The administrator can choose to approve or reject the request based on the review. Upon approval, the system sends an invitation email to the designated initial administrator of the organisation, containing a secure link to complete their account setup. Upon rejection, the system notifies the organisation of the decision and provides feedback on any necessary actions or requirements for future consideration. The system ensures that only vetted organisations gain access to the platform, maintaining security and integrity.                                                                 | ...        |
| **`US-PA-03`** | As a platform administrator, I want to track organisation onboarding and resend an eligible initial admin invitation so that failed or expired delivery does not leave onboarding permantently blocked                          | The platform administrator can track organisation onboarding and resend an eligible initial admin invitation to ensure that failed or expired delivery does not leave onboarding permanently blocked.                          | The organisation onboarding tracking option is accessible from the platform admin dashboard or main page. The system displays a list of organisations that have been approved for access, including their onboarding status (e.g. pending, completed, failed). The platform administrator can identify organisations with failed or expired initial admin invitations and choose to resend the invitation. The system validates the action and provides feedback on any errors. Upon successful resending, the system sends a new invitation email to the designated initial administrator, allowing them to complete their account setup and access the platform. The system ensures that organisations can successfully onboard without being permanently blocked due to technical issues or missed communications.                                                                                 | ...        |
| **`US-PA-04`** | As a platform administrator, I want to view organisation details and suspend or reactivate organisation access so that platform-level access can be governed safely and consistently.                                           | The platform administrator can view organisation details and suspend or reactivate organisation access to ensure that platform-level access is governed safely and consistently.                                               | The organisation access management option is accessible from the platform admin dashboard or main page. The system displays detailed information about each organisation, including their name, contact information, registration status, and current access level (e.g. active, suspended). The platform administrator can choose to suspend or reactivate an organisation's access based on their review of the details. The system validates the action and provides feedback on any errors. Upon successful suspension or reactivation, the system updates the organisation's access status in the platform's database and provides clear feedback on the action taken. The system ensures that platform-level access is managed effectively, maintaining security and compliance with organisational policies.                                                                                   | ...        |
| **`US-PA-05`** | As a platform administrator, I want to create and manage premade campaigns and reusable general training content so that individual organisations can access high-quality training without needing to author their own content. | The platform administrator can create and manage premade campaigns and reusable general training content to ensure that individual organisations can access high-quality training without needing to author their own content. | The premade campaign and training content management option is accessible from the platform admin dashboard or main page. The system allows the platform administrator to create new campaigns, edit existing campaigns, and organise them into reusable components for future use by organisations. The administrator can define the objectives, structure, and content of each campaign, ensuring that they align with best practices for cybersecurity awareness training. The system provides clear feedback on the success or failure of campaign and content management actions and ensures that organisations can efficiently access high-quality training materials without the need for extensive content creation efforts.                                                                                                                                                                  | ...        |
| **`US-PA-06`** | As a platform administrator, I want to publish or unpublish premade campaigns so that I control what individual trainees can discover without erasing existing enrolments or progress.                                          | The platform administrator can publish or unpublish premade campaigns to control what individual trainees can discover without erasing existing enrolments or progress.                                                        | The campaign publication management option is accessible from the platform admin dashboard or main page. The system allows the platform administrator to select premade campaigns and choose to publish or unpublish them based on their review and organisational needs. The system validates the action and provides feedback on any errors. Upon successful publication or unpublication, the system updates the visibility of the campaigns for individual trainees, ensuring that they can access only the appropriate training materials. The system ensures that existing enrolments and progress are preserved, allowing trainees to continue their training without disruption while maintaining control over campaign availability.                                                                                                                                                         | ...        |
| **`US-PA-07`** | As a platform administrator, I want to view aggregate platform usage, organisation lifecycle and security insightsso that I can operate the platform without unecessarily accessing organisation or trainee data.               | The platform administrator can view aggregate platform usage, organisation lifecycle, and security insights to operate the platform without unnecessarily accessing organisation or trainee data.                              | The platform insights option is accessible from the platform admin dashboard or main page. The system displays aggregate data and visualizations related to platform usage, organisation lifecycle stages (e.g. registration, onboarding, active use), and security insights (e.g. common threats, training effectiveness). The platform administrator can filter and sort the data based on various criteria to gain insights into overall platform performance and trends. The system ensures that the administrator can make informed decisions about platform operations while maintaining the privacy and confidentiality of individual organisations and trainees.                                                                                                                                                                                                                              | ...        |
| **`US-PA-08`** | As a platform administrator, I want to review platform audit and security events so that privileged actions and suspicious activity can be investigated.                                                                        | The platform administrator can review platform audit and security events to investigate privileged actions and suspicious activity.                                                                                            | The platform audit and security event review option is accessible from the platform admin dashboard or main page. The system displays a chronological log of significant actions taken within the platform, including changes to organisation access, campaign management, user permissions, and security-related events. The platform administrator can filter and search the audit and security events based on specific actions, users, or timeframes to investigate any concerns or verify compliance with platform policies. The system provides clear feedback on the audit entries and ensures that all relevant actions are recorded accurately for accountability and transparency purposes.                                                                                                                                                                                                 | ...        |
| **`US-PA-09`** | As a platform administrator, I want to review and accept or reject a role change request from another platform administrator so that platform privileges are granted only with my consent.                                      | The platform administrator can review and accept or reject a role change request from another platform administrator to ensure that platform privileges are granted only with their consent.                                   | The role change request management option is accessible from the platform admin dashboard or main page. The system displays a list of pending role change requests, including the requesting administrator's name, current role, requested role, and any supporting information. The platform administrator can review each request and choose to accept or reject it based on their assessment. Upon acceptance, the system updates the requesting administrator's role and permissions in the platform's database and provides clear feedback on the action taken. Upon rejection, the system notifies the requesting administrator of the decision and provides feedback on any necessary actions or requirements for future consideration. The system ensures that platform privileges are managed effectively and securely, maintaining control over access and permissions within the platform. | ...        |

### 3.9 Platform Super-admin User Stories

| User Story ID  | User Story                                                                                                                                                                       | Business Value                                                                                                                                                                  | Acceptance Criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Related to |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **`US-SA-01`** | As a platform super-admin, I want to view and invite platform administrators so that platform responsibilities can be shared                                                     | The platform super-admin can view and invite platform administrators to share platform responsibilities.                                                                        | The platform administrator management option is accessible from the platform super-admin dashboard or main page. The system displays a list of current platform administrators, including their names, email addresses, roles, and permissions. The super-admin can invite new platform administrators by entering their email addresses and sending invitation requests. The system validates the input and provides feedback on any errors. Upon successful invitation, the system sends an email to the invited administrator with a secure link to complete their account setup. The system ensures that the super-admin can effectively manage platform administrators and share responsibilities while maintaining security and access control.             | ...        |
| **`US-SA-02`** | As a platform super-admin, I want to revoke or demote platform administrators so that platform access can be governed safely and consistently                                    | The platform super-admin can revoke or demote platform administrators to ensure that platform access is governed safely and consistently.                                       | The platform administrator management option is accessible from the platform super-admin dashboard or main page. The system displays a list of current platform administrators, including their names, email addresses, roles, and permissions. The super-admin can select a platform administrator and choose to revoke their access or demote their role based on their review. The system validates the action and provides feedback on any errors. Upon successful revocation or demotion, the system updates the administrator's access status in the platform's database and provides clear feedback on the action taken. The system ensures that platform access is managed effectively, maintaining security and compliance with organisational policies. | ...        |
| **`US-SA-03`** | As a platform super-admin, I want to transfer the super-admin role to another active platform administrator so that the platform always has exactly one accountable super-admin. | The platform super-admin can transfer the super-admin role to another active platform administrator to ensure that the platform always has exactly one accountable super-admin. | The super-admin role transfer option is accessible from the platform super-admin dashboard or main page. The system displays a list of current platform administrators, including their names, email addresses, roles, and permissions. The super-admin can select an active platform administrator and choose to transfer the super-admin role to them. The system validates the action and provides feedback on any errors. Upon successful transfer, the system updates the roles and permissions of both the current and new super-admin in the platform's database and provides clear feedback on the action taken. The system ensures that there is always exactly one accountable super-admin for the platform, maintaining security and governance.       | ...        |

## 4. Use Cases

A core overview of the currently implemented use cases can be seen in this diagram:

[UC-Overview Diagram](./diagrams/demo1-use-cases-overview.svg)

### 4.1 Status Model

Use cases and requirements in this SRS use the following status values:
| Status | Meaning |
| ------ | ------- |
| **Implemented** | The use case or requirements exists in the current implementation |
| **In Progress** | The use case or requirements is currently being implemented |
| **Planned** | The use case or requirements is planned for future implementation |

### 4.2 Product Use Case Summary

Below are the use case IDs, their names and their current implementation status.
| Use Case ID | Use Case Name | Status |
| ----------- | ------------- | ------ |
| **`UC-01`** | View Emails in Simulated Inbox | Implemented |
| **`UC-02`** | View Training Document | Implemented |
| **`UC-03`** | Complete Quiz Flow and View Results | Implemented |
| **`UC-04`** | Request Organisation Registration | In Progress |
| **`UC-05`** | Review/Approve Organisation Registration Request | In Progress |
| **`UC-06`** | Complete First Organisation Admin Setup | In Progress |
| **`UC-07`** | Accept Organisation Trainee Invitation | In Progress |
| **`UC-08`** | Manage Organisation Employees | In Progress |
| **`UC-09`** | Manage Organisation Admins and Permissions | In Progress |
| **`UC-10`** | Manage Insightful Phish Admins | In Progress |
| **`UC-11`** | Configure Organisation Security Settings | In Progress |
| **`UC-12`** | Manage (Personal) Account & Security Settings | In Progress |
| **`UC-13`** | Manage Organisation Lifecycle and Access | Planned |
| **`UC-14`** | Manage Organisation Employee Tags | Planned |
| **`UC-15`** | Create and Manage Premade Campaigns | Planned |
| **`UC-16`** | Create and Manage Organisation Campaigns | Planned |
| **`UC-17`** | Build and Structure Campaigns from Reusable Components | Planned |
| **`UC-18`** | Create and Manage Training Documents | Planned |
| **`UC-19`** | Create and Manage Quizzes | Planned |
| **`UC-20`** | Create and Manage Simulated Inboxes and Emails | Planned |
| **`UC-21`** | Publish and Unpublish Premade Campaigns | Planned |
| **`UC-22`** | Browse Published Premade Campaigns | Planned |
| **`UC-23`** | Self-enrol in Premade Campaigns | Planned |
| **`UC-24`** | Manage Individual Campaign Enrolments, Progress and Resets | Planned |
| **`UC-25`** | Assign Campaigns to Organisation Trainees | Planned |
| **`UC-26`** | Reset Organisation Campaign Progress | Planned
| **`UC-27`** | View Trainee Campaign Progress and Results | Planned |
| **`UC-28`** | Classify Simulated Emails and Provide Feedback | Planned | Planned |
| **`UC-29`** | Interact with Simulated Links and Attachments and Track Interactions | Planned |
| **`UC-30`** | View Organisation Training Progress, Performance and Risk Scoring | Planned |
| **`UC-31`** | Configure and Launch Ethical Real-Email Simulation Campaigns | Planned |
| **`UC-32`** | Generate and Review Campaign Content with AI Assistance | Planned |
| **`UC-33`** | View Platform Usage and Security Overview | Planned |

### 4.3 Actor Summary

Below are all the actors used by the use cases specified in this SRS:
| Actor | Role | Primary Goal |
| ----- | ---- | ------------ |
| | |

### 4.4 Use Cases

#### **`UC01`**: View Emails in Simulated Inbox

**Status:** Implemented
**Frequency of Use:** Multiple times per campaign
**Expected Completion:** Demo 1

##### Related Functional Requirements

###### **`FR-UC01`**: Simulated Inbox and Email Viewing

- `FR-UC01-01`: **View email summaries**: The system shall allow a trainee to view a list of email summaries in an assigned simulated inbox campaign item, including sender, subject, and received date.
- `FR-UC01-02`: **Open simulated email:** The system shall allow a trainee to open a selected simulated email from a simulated inbox.
- `FR-UC01-03`: **Display email details:** The system shall display simulated email details in a controlled and safe manner, including sender information, subject, received date, body content, and safe representations of links or attachments.
- `FR-UC01-04`: **Record email opening:** The system shall record that an accessible simulated email has been opened by the trainee, ensuring that the interaction is idempotent and does not create duplicate records.
- `FR-UC01-05`: **Display unavailable states:** The system shall display appropriate empty and unavailable states for inaccessible inboxes or emails.
- `FR-UC01-06`: **Preserve simulation boundary:** The system shall not connect to a trainee's real email inbox or send/receive real emails, ensuring that all interactions remain within the controlled simulation environment. _(Note: Accessing real email or sending real email is covered in `UC-31`.)_
- `FR-TRK-O3`: **Track email interactions:** The system shall allow readable content to remain accessible even if the email-open interaction cannot be recorded due to a system error.

[UC-01 use case diagram](./diagrams/demo1-use-cases-uc01-simulated-inbox.svg)

##### User Story

**Overall UC story:** As a trainee, I want to access an assigned simulated-inbox campaign item and safely view its simulated emails, so that I can practise recognising suspicious messages while following the intended training sequence.
_This is a combination of `US-TR-03` and `US-TR-02`._

##### Business Goal

The trainee gains practical exposure to realistic suspicious messages disguised among normal simulated messages, and can practise recognising them in a safe environement without accessing a real mailbox or sending real email. The trainee can also practise safe email reading habits, such as not clicking links or opening attachments in suspicious messages.

##### Scope

- **TUCBW**: A trainee opening an available simulated inbox campaign item from an assigned campaign and viewing its simulated emails.
- **TUCEW**: The trainee viewing a selected simulated email or returning to the campaign.

##### Actors

- **Primary actor:** Trainee (Individual Trainee or Organisation Trainee)
- **Supporting actors:** System
- **External systems::** None (This Use Case does not access real email or external systems.)

##### Preconditions

- The trainee is authenticated and has an active traine profile.
- The trainee has an active assignment for the relevant campaign.
- Any required preceding campaign items have been completed.
- The simulated inbox and selected email are active and belong to the accessible campaign item.

##### Trigger

The trainee selects an available simulated inbox campaign item from the campaign view.

##### Postconditions

- The trainee can view assigned simulated email summaries.
- The trainee can view the details of an accessible simulated email, including sender information, subject, received date, and body content.
- An email-open interaction is recorded indempotently, without blocking the trainee from reading the email.
- No real email inbox is accessed, and no real email is sent or received.
- On failure, campaign content, assignment state and existing progress are preserved, and the trainee receives a safe empty or error state.

##### Main Success Scenario

1. The trainee selects an available campaign item which is a simulated inbox.
2. The system verifies authentication, assignment access, prerequisites, item availability and simulation state.
3. The system displays the controlled simulated inbox and its email summaries.
4. The trainee selects an email.
5. The system verifies that the email belongs to the accessible simulated inbox.
6. The system displays the email sender, subject, received date, body and safe link or attachment representations.
7. The system records a lightweight open interaction.
8. The trainee reads the email and returns to the inbox or campaign view.

##### Alternate Flows

###### A1: Empty Simulated Inbox

1. The inbox is valid but contains no available emails.
2. The system displays a safe empty state and allows the trainee to return to the campaign view.
3. The trainee returns to the campaign view.

###### A2: Previusly Opened Email

1. The trainee selects an email that has already been opened.
2. The system displays the email normally.
3. The open-event processing remains idemponent and does not create duplicate open interactions.

##### Error / Exception Flows

###### E1: Inaccessible Campaign Item or Email

1. The campaign item, inbox or email is unavailable, unassigned or outside the trainee's access scope.
2. The system returns a safe forbidden or not found response.
3. No foreign campaign or trainee information is exposed.
4. The trainee can return to an accessible campaign item or the campaign view.

###### E2: Interaction Tracking Failure

1. The email content loads, but the open interaction cannot be recorded due to a system error.
2. The system allows the trainee to continue reading the email normally.
3. The tracking failure is logged without creating false progress.
4. The trainee continues normally.

##### Business Rules

- `UC-01` covers viewing and opening simulated emails only.
- Classifying emails and getting educational feedback is covered in `UC-28`.
- Simulated link, attachment and form behaviour is covered in `UC-29`.
- Correct classifications and red flag explanations shouldn't be disclosed by normal inbox-list or email-viewing behaviour to avoid spoiling the educational experience.
- Only controleld platform content my be rendered.

##### RBAC and Access Control

- An authenticated active trainee role is required.
- Access is derived from the trainee-s active campaign assignment.
- Campaign, item, inbox and email relationships are validated server-side.
- An organisation administrator cannot use `UC-01` to access another trainee's campaign as that trainee.
- Platform administrators do not receive implicit trainee campaign access.

##### Data and Domain Model

- `User` and `TraineeProfile`: Identity performing the training.
- `Campaign`, `CampaignAssignment` and `CampaignItem`: The campaign assignment and activity context.
- `Simulation`, `SimulatedInbox` and `SimulatedEmail`: The controlled training content being accessed.
- `InteractionEvent`: Records that the trainee opened the email. There is only a single open interaction per email per trainee, and it is recorded idempotently.
- The simulated email must belong to the inbox associated with the campaign item, and the campaign item must belong to the assigned campaign.

##### API Contract References

- `GET /trainee/campaign-items/:campaignItemId/simulated-inbox`: Retrieve the simulated inbox and its email summaries for the campaign item.
- `GET /trainee/campaign-items/:campaignItemId/simulated-emails/:emailId`: Retrieve one accessible email from the simulated inbox for the campaign item.
- `POST /trainee/campaign-items/:campaignItemId/simulated-emails/:emailId/interactions`: Record an email-open interaction for the trainee and the selected email.
- Bearer authentication and active-assignment checks are required.
- Expected errors include safe `401`, `403`, `404`, validation, and server-error responses.
- The interaction endpoint can create an idempotent tracking side effect.

##### Design / Wireframe References

- `DESIGN.md`: Campaign Page, Simulated Inbox, and Simulated Email Detail
- `SimulatedInbox.png`: Inbox List Wireframe
- `SimulatedEmailDetail.png`: Email Detail Wireframe
- Loading, empty, inaccessible and retry states should exist.
- Email content and navigation should have a clear structure and offer keyboard navigation and screen-reader accessibility.

##### Quality Requirements

- `QR-SEC-001` — Safely resolve and render only supported content.
- `QR-ACC-001` — Provide semantic structure and accessible navigation.
- `QR-REL-001` — Make viewed and completed events idempotent.
- `QR-PRV-001` — Avoid unnecessary trainee data in content interactions.
- `QR-TST-001` — Test content resolution separately from assignment access.

##### Verification / Acceptance Criteria

- Given an assigned available simulated inbox campaign item, when the trainee selects it, then the system displays the controlled simulated inbox and its email summaries.
- Given an email belonging to that inbox, when the trainee selects it, then the system displays the email sender, subject, received date, body and safe link or attachment representations.
- Given an email outside the assignment, when it is requested, then access is denied without discloding its content.
- Given a repeated email-open interaction, when the interaction is recorded, then the system does not create duplicate open interactions.
- Given an interaction-tracking failure, when the email content loaded successfully, then the trainee can continue reading the email normally.

##### Traceability

| Artefact         | Reference                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| User stories     | `US-TR-03` (Controlled simulated inbox). `US-TR-02` (Campaign ordering and prerequisites)                                                            |
| SRS requirements | `FR-UC01-01` to `FR-UC01-08` (Inbox viewing, safe content, errors and boundaries).`FR-TRK-01` to `FR-TRK-04` (Interaction tracking)                  |
| API contracts    | `API.md` (Simulated Inbox API endpoints)                                                                                                             |
| Design           | `DESIGN.md` (Campaigns Page, Simulated Inbox, and Simulated Email Detail)                                                                            |
| Domain model     | `CampaignAssignment`, `CampaignItem`, `Simulation`, `SimulatedInbox`, `SimulatedEmail`, `InteractionEvent`                                           |
| Tests            | `QA-UC01-01` (Inbox success). `QA-UC01-02` (UI states). `QA-UC01-03` (Email detail). `QA-UC01-04` (Invalid email). `QA-UC01-05` (Authenticated flow) |

#### **`UC02`**: View Training Document

**Status:** Implemented
**Expected Completion:** Demo 1

[UC-02 use case diagram](./diagrams/demo1-use-cases-uc02-training-document.svg)

##### User Story

**Overall UC story:** As a trainee, I want to open and read an assigned training document in its intended campaign sequence, so that I can learn how to recognise and respond to cyber threats in a controlled educational environment.
_This is a combination of `US-TR-06` and `US-TR-02`._

##### Business Goal

The trainee acquires relevant cybersecurity knowledge and skills and can make measureable progress through the assigned training content.

##### Scope

- **TUCBW**: A trainee opening an available training document campaign item from an assigned campaign and reading its content.
- **TUCEW**: The trainee reading or completing the training document and returning to the campaign view or proceeding to a related activity.

##### Actors

- **Primary actor:** Trainee (Individual Trainee or Organisation Trainee)
- **Supporting actor:** System
- **External systems:** None

##### Preconditions

- The trainee is authenticated and active.
- The trainee has an active assignment for the relevant campaign.
- Any required preceding campaign items have been completed.
- The campaign item is a training document and is available to the trainee.

##### Trigger

The trainee selects an available training document campaign item from the campaign view.

##### Postconditions

- The trainee has been able to read the training document content.
- Viewed or completed progress is recorded where the applicable tracking request succeeds.
- A trainee cannot modify the trainee document.
- A failure does not corrupt the document or campaign assignment.

##### Main Success Scenario

1. The trainee selects an assigned training document campaign item.
2. The system validates the assignment, prerequisites and item availability.
3. The system resolves the controlled training document content.
4. The system displays the document in a structured, readable format with navigation and accessibility support.
5. The system records that the document was viewed.
6. The trainee reads the document.
7. The trainee marks it complete where completion is supported.
8. The system records completion and presents the appropriate next step in the campaign sequence.

##### Alternate Flows

###### A1: Resume Previously Opened Document

1. The trainee selects a training document that was previously opened but not completed.
2. The system displays the document at the last read position or page, allowing the trainee to continue reading from where they left off.
3. The trainee continues reading and marks the document complete when finished.

##### Error / Exceptions Flows

###### E1: Document Unavailable

1. The campaign item or training document is missing, inactive, locked, or no longer assigned.
2. The system shows a safe unavailable state.
3. Existing progress remains unchanged.
4. The trainee returns to the campaign.

###### E2: Progress Tracking Failure

1. The document loads, but a viewed or completed event cannot be saved.
2. The system preserves access to the readable document.
3. The failed event is logged and may be retried
4.

##### Business Rules

- Trainees have read-only access to available assigned documents.
- Training-document authoring and lifecycle management are outside UC-02.
- Viewed events may be repeatable; completion must be idempotent.
- Content is resolved through a controlled reference rather than an arbitrary client-supplied path.
- Quiz completion remains part of UC-03.
-

##### RBAC and Access Control

- An authenticated active trainee is required.
- The item must belong to the trainee’s active campaign assignment.
- Prerequisite and component-state checks are enforced server-side.
- Administrative content-management permissions do not grant trainee progress on another user’s behalf.

##### Data and Domain Model

- `User`, `TraineeProfile`, `CampaignAssignment`, and `CampaignItem`: The trainee and the campaign assignment context.
- `TrainingDocumentComponent` and `TrainingDocument`: The controlled training content being accessed.
- `InteractionEvent` for viewed and completed activity.
- Viewed and completed events represent distinct progress concepts.

##### API Contract References

- `GET /trainee/campaign-items/:campaignItemId/training-document`: Retrieve assigned content.
- `POST /trainee/campaign-items/:campaignItemId/training-document/viewed`: Record a view.
- `POST /trainee/campaign-items/:campaignItemId/training-document/completed`: Record completion.
- Bearer authentication and assignment checks are required.
- Side effects are limited to progress or interaction records.

##### Design / Wireframe References

- `DESIGN.md` — Campaigns Page, Training Document, and Activity Overview.
- `TrainingMaterialPage.png` — training material presentation.
- Loading, unavailable, completion, retry, and next-activity states are required.
- Content requires semantic headings, readable typography, and accessible link treatment.

##### Quality Requirements

- `QR-SEC-001` — Safely resolve and render only supported content.
- `QR-ACC-001` — Provide semantic structure and accessible navigation.
- `QR-REL-001` — Make viewed and completed events idempotent.
- `QR-PRV-001` — Avoid unnecessary trainee data in content interactions.
- `QR-TST-001` — Test content resolution separately from assignment access.

##### Verification / Acceptance Criteria

- Given an assigned available document, when the trainee opens it, then readable content is displayed.
- Given an inaccessible campaign item, when it is requested, then content is not disclosed.
- Given a completed document, when completion is submitted again, then duplicate completion is not created.
- Given a related available quiz, when the document is completed, then the trainee can navigate to it.
- Given tracking failure, when content loaded successfully, then reading remains available without false progress.

##### Traceability

| Artefact         | Reference                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| User stories     | `US-TR-06` — read campaign training documents; `US-TR-02` — campaign ordering                                                                       |
| SRS requirements | `FR-UC02-01`–`FR-UC02-06` — document viewing, tracking and boundaries; `FR-TRK-01`–`FR-TRK-04` — safe tracking                                      |
| API contracts    | `API.md` — Training Document API                                                                                                                    |
| Design           | `DESIGN.md` — Training Document and Activity Overview                                                                                               |
| Domain model     | `CampaignAssignment`, `CampaignItem`, `TrainingDocumentComponent`, `TrainingDocument`, `InteractionEvent`                                           |
| Tests            | `QA-UC02-01` — entry point; `QA-UC02-02` — document view; `QA-UC02-03` — UI states; `QA-UC02-04` — invalid document; `QA-UC02-05` — quiz navigation |

#### **`UC-03`**: Complete Quiz Flow and View Results

**Status:** Implemented
**Expected Completion:** Demo 1

[UC-03 use case diagram](./diagrams/demo1-use-cases-uc03-quiz-flow.svg)

##### User Story

**Overall UC story:** As a trainee, I want to complete an assigned campaign quiz in the intended sequence and view my results and educational feedback, so that I can assess my understanding and identify areas for improvement.
_This is a combination of `US-TR-07` and `US-TR-02`._

##### Business Goal

The trainee receives a trustworthy assessment of their knowledge and actionable educational feedback.

##### Scope

- **TUCBW**: A trainee opening an available quiz campaign item from an assigned campaign, answering its questions, submitting the attempt, and viewing the results and feedback.
- **TUCEW**: The trainee completes the quiz attempt and views the results and feedback.

##### Actors

- **Primary actor:** Trainee (Individual Trainee or Organisation Trainee)
- **Supporting actor:** System
- **External systems:** None

##### Preconditions

- The trainee is authenticated and active.
- The trainee has an active campaign assignment containing the quiz.
- Required preceding items have been completed.
- The quiz contains supported questions and answer options.
- Any existing attempt is in a state compatible with the requested action.

##### Trigger

The trainee selects an available assigned quiz item.

##### Postconditions

- A quiz attempt exists for the trainee and campaign context.
- Valid submitted answers and the server-calculated result are stored.
- The submitted attempt is read-only.
- Permitted educational feedback is available after submission.
- A failed submission preserves the previous attempt state and recoverable answers.

##### Main Success Scenario

1. The trainee opens the assigned quiz.
2. The system validates assignment access, prerequisites, and quiz availability.
3. The system returns question content without correctness indicators.
4. The trainee starts or resumes an in-progress attempt.
5. The trainee answers the questions and reviews the selections.
6. The trainee submits the attempt.
7. The system validates attempt ownership, state, required answers, and option identifiers.
8. The system stores the answers, calculates the score, and marks the attempt submitted atomically.
9. The system displays the result and educational feedback.
10. The trainee acknowledges the result or returns to the campaign.

##### Alternate Flows

###### A1: Resume In-progress Attempt

1. A compatible in-progress attempt already exists.
2. The system reuses that attempt rather than creating a duplicate.
3. The trainee continues from the answer stage.

###### A2: Revisit Submitted Result

1. The trainee opens a previously submitted attempt.
2. The system keeps the attempt read-only.
3. The stored result and permitted feedback are displayed.

##### Error / Exception Flows

###### E1: Incomplete or Invalid Submission

1. Required answers are missing or an option is invalid.
2. The system rejects final submission with question-level validation.
3. The attempt remains in progress.
4. The trainee corrects the answers and retries.

###### E2: Duplicate or Foreign Submission

1. The attempt is already submitted or belongs to another trainee.
2. The system rejects the mutation.
3. Stored answers and results remain unchanged.
4. No foreign attempt information is exposed.

###### E3: Result Retrieval Failure

1. Submission succeeds, but the result response cannot be loaded.
2. The submitted state remains authoritative.
3. The system offers a safe retry.
4. The attempt is not reopened for editing.

##### Business Rules

- Correct answers and explanatory feedback are not exposed before final submission.
- Scores are calculated server-side.
- A compatible current in-progress attempt is reused where applicable.
- Submitted attempts are immutable.
- Supported question types and selection limits are validated server-side.

##### RBAC and Access Control

- An authenticated active trainee is required.
- The attempt must belong to the authenticated trainee and accessible campaign item.
- Attempt identifiers alone are not proof of access.
- Administrators cannot submit or alter a trainee attempt through trainee endpoints.

##### Data and Domain Model

- `QuizComponent`, `Quiz`, `QuizQuestion`, and `AnswerOption`: The controlled quiz content being accessed.
- `QuizAttempt`, `AttemptAnswer`, `AttemptAnswerOption`, and `QuizResult`: The trainee's attempt, submitted answers, and calculated result.
- `CampaignAssignment`, `CampaignItem`, and `TraineeProfile`: The campaign and trainee information.
- A result belongs to one submitted attempt: An attempt belongs to one trainee and campaign context.

##### API Contract References

- `GET /trainee/campaign-items/:campaignItemId/quiz`: Retrieve safe quiz content.
- `POST /trainee/campaign-items/:campaignItemId/quiz/attempts`: Start or reuse an attempt.
- `POST /quiz-attempts/:attemptId/submit`: Validate and submit answers.
- `GET /quiz-attempts/:attemptId/results`: Retrieve a submitted result.
- Pre-submission responses exclude correct-answer information.
- Submission stores answers, result, final state, and applicable tracking atomically.

##### Design / Wireframe References

- `DESIGN.md` — Quiz Page, Quiz Submission State, and Quiz Feedback and Results.
- `QuizPage.png` — question and answer interface.
- `QuizSubmission.png` — submission and result state.
- Unanswered-question validation, confirmation, retry, and read-only result states are required.
- Validation summaries and question errors must be accessible.

##### Quality Requirements

- `QR-SEC-001` — Never trust client-calculated correctness or score data.
- `QR-REL-001` — Protect against duplicate and concurrent submissions.
- `QR-ACC-001` — Provide accessible validation and feedback.
- `QR-PRV-001` — Prevent cross-trainee attempt disclosure.
- `QR-TST-001` — Use deterministic quiz fixtures and scoring rules.

##### Verification / Acceptance Criteria

- Given an assigned quiz, when the trainee opens it, then questions appear without correct-answer information.
- Given an in-progress attempt, when the trainee starts again, then the attempt is reused.
- Given missing required answers, when submission is attempted, then the attempt remains in progress.
- Given valid answers, when submitted, then the attempt becomes read-only and a server-calculated result is available.
- Given a submitted attempt, when another submission is attempted, then stored answers and score remain unchanged.

##### Traceability

| Artefact         | Reference                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| User stories     | `US-TR-07` — complete quizzes and view feedback; `US-TR-02` — campaign ordering                                               |
| SRS requirements | `FR-UC03-01`–`FR-UC03-09` — complete quiz lifecycle; applicable `FR-TRK-*` — quiz tracking                                    |
| API contracts    | `API.md` — Quiz API                                                                                                           |
| Design           | `DESIGN.md` — Quiz Page, Submission, Feedback and Results                                                                     |
| Domain model     | `Quiz`, `QuizQuestion`, `AnswerOption`, `QuizAttempt`, `AttemptAnswer`, `QuizResult`                                          |
| Tests            | `QA-UC03-01` — quiz view; `QA-UC03-02` — validation; `QA-UC03-03` — submission; `QA-UC03-04` — errors; `QA-UC03-05` — results |

#### UC-09: Manage Organisation Admins and Permissions

##### User Story

As an organisation admin with admin-management permissions, I want to view and manage organisation admins and their permissions so that my organisation can maintain controlled, traceable, and safe administrator access.

##### Purpose

This use case allows an organisation admin to view the organisation's admins, review assigned permissions, promote an active organisation trainee to an organisation admin, update another admin's permissions, and remove organisation admin privileges where permitted. The use case ensures that all admin-management actions stay within the actor's organisation, respect permission-based access control, preserve critical-admin safeguards, and record meaningful changes for audit purposes.

##### Scope

- **TUCBW**: An organisation admin manages organisation admins and permissions on the organisation admin management page.
- **TUCEW**: The organisation admin acknowledges that admin invitation, promotion, permission viewing, or permission change work has completed successfully.

##### Actors

- Primary actor: Organisation admin with admin-management permissions
- Supporting actor: Email service
- System actor: Audit log

##### Preconditions

- The organisation admin is authenticated.
- The organisation admin has an active organisation admin profile.
- The organisation admin belongs to the organisation being managed.
- The organisation exists and is not in a state that blocks the selected admin-management action.
- The organisation admin has the required permission for the selected action.

##### Postconditions

- The organisation admin list and permission state are displayed or updated according to the selected action.
- If a trainee is promoted, a pending organisation admin promotion invitation is created for an active trainee in the same organisation.
- If permissions are changed, the target admin's active permission set is updated.
- If admin privileges are removed, the target user is left in a valid non-admin organisation access state where applicable.
- The organisation is not left without an admin who can manage admin permissions or invite/manage users.
- Successful admin-management changes are recorded in the audit log.
- Failed validation, permission, or safeguard checks leave the previous admin and permission state unchanged.

##### Main Flow

1. The organisation admin navigates to the organisation admin management page.
2. The system retrieves and displays the organisation admins, their statuses, and their assigned permissions.
3. The organisation admin reviews the current admin list and chooses one of the available management actions:
   - Option A: View admin permissions
     a. The organisation admin selects an admin from the list.
     b. The system displays the selected admin's assigned permissions.
     c. The organisation admin returns to the admin list or chooses another management action.
   - Option B: Promote organisation trainee to admin
     a. The organisation admin selects the promote-admin action.
     b. The organisation admin enters or selects the active trainee to promote.
     c. The organisation admin selects the permissions that should apply after promotion.
     d. The system verifies that the trainee belongs to the same organisation and is eligible for promotion.
     e. The system creates a pending promotion invitation and queues the promotion email.
     f. The system records the promotion invitation action in the audit log.
     g. The system displays a confirmation that the promotion invitation has been created or sent.
   - Option C: Change organisation admin permissions
     a. The organisation admin selects an existing organisation admin.
     b. The organisation admin updates the selected admin's permissions.
     c. The system validates the permission selection and checks critical-admin safeguards.
     d. The system saves the updated permission set.
     e. The system records the old and new permission state in the audit log.
     f. The system displays the updated permission state.
   - Option D: Remove organisation admin privileges
     a. The organisation admin selects an existing organisation admin to remove.
     b. The system asks for confirmation and any required password or typed confirmation.
     c. The system verifies the confirmation and checks critical-admin safeguards.
     d. The system removes the target user's organisation admin privileges.
     e. The system records the removal in the audit log.
     f. The system displays a confirmation that the admin privileges were removed.
4. The organisation admin acknowledges the outcome and returns to the organisation admin management page.

##### Exceptions

- **Unauthenticated User**: The user is not signed in. The system redirects the user to login or returns an unauthorised response.
- **Inactive Organisation Admin**: The actor is not an active organisation admin. The system denies access to organisation admin management.
- **Cross-Organisation Access Attempt**: The actor attempts to manage admins for another organisation. The system denies access and does not expose the other organisation's admin data.
- **Missing Permission**: The actor lacks the permission required for the selected action. The system blocks the action and leaves the current admin state unchanged.
- **Invalid Promotion Target**: The selected trainee is not active, does not belong to the organisation, or is already an organisation admin. The system rejects the promotion request.
- **Duplicate Pending Promotion**: A pending promotion invitation already exists for the selected trainee. The system prevents a duplicate invitation and shows the current pending state.
- **Invalid Permission Selection**: The submitted permission set contains an invalid or unsupported permission. The system rejects the update and identifies the invalid selection.
- **Critical Admin Safeguard Violation**: The requested change would leave the organisation without an admin who can change admin permissions or invite/manage users. The system blocks the change and preserves the previous permission state.
- **Suspended Organisation**: The organisation is suspended. The system shows only the permitted read-only state or blocks state-changing work according to product policy.
- **Email Delivery Failure**: The promotion invitation is created but the email cannot be sent. The system records the delivery failure and shows that follow-up or resend may be required.
- **Audit Logging Failure**: The system cannot record the required audit entry. The system follows the platform's audit-failure policy and does not silently hide sensitive admin-management changes.

##### Traceability

- SRS documentation issue: #273
- Foundation/migration issue: #272
- Frontend issue: #274
- Backend endpoint issue: #275
- Integration issue: #276
- Backend integration-test issue: #280

#### UC-11: Configure Organisation Security Settings

##### User Story

As an organisation admin with security-settings permission, I want to configure organisation-level security settings so that my organisation can control session behaviour and sensitive account policies for organisation users.

##### Purpose

This use case allows an authorised organisation admin to view and update organisation-level security settings, including remember-me policy, regular session length, idle timeout, sensitive-action reauthentication, and trainee email-change policy. The use case ensures that the submitted settings stay within platform limits, conflicting combinations are rejected, changes are audit logged, and the saved policy is applied by authentication and session services according to defined enforcement timing.

##### Scope

- **TUCBW**: An organisation admin configures organisation-level security settings on the organisation security settings page.
- **TUCEW**: The organisation admin acknowledges that the organisation security settings have been saved successfully.

##### Actors

- Primary actor: Organisation admin with security-settings permission
- System actor: Authentication/session service
- System actor: Audit log

##### Preconditions

- The organisation admin is authenticated.
- The organisation admin has an active organisation admin profile.
- The organisation admin belongs to the organisation being configured.
- The organisation admin has the `Change organisation-level security settings` permission.
- The organisation exists and is in a state that allows security settings to be viewed or updated.

##### Postconditions

- Valid organisation security settings are saved for the organisation.
- Invalid settings are rejected and previous settings remain active.
- The old and new settings are recorded in the audit log.
- The saved policy is available for login, refresh, and session creation enforcement.
- The organisation admin is informed when the change applies to current sessions, future sessions, or the next refresh/login.

##### Main Flow

1. The organisation admin navigates to the organisation security settings page.
2. The system retrieves and displays the organisation's current security settings.
3. The system displays the platform limits and indicates whether the current actor may edit the settings.
4. The organisation admin reviews the current settings and changes one or more configurable options:
   - remember-me policy;
   - maximum remembered session length;
   - regular session length;
   - idle timeout;
   - sensitive-action reauthentication;
   - trainee email-change policy.
5. The organisation admin submits the updated settings.
6. The system verifies that the actor is an active organisation admin in the same organisation.
7. The system verifies that the actor has permission to change organisation-level security settings.
8. The system validates the submitted values against platform limits and setting-combination rules.
9. The system saves the updated settings.
10. The system records the old and new settings in the audit log.
11. The system displays the saved settings and explains when the changes take effect.
12. The organisation admin acknowledges the successful save.

##### Exceptions

- **Unauthenticated User**: The user is not signed in. The system redirects the user to login or returns an unauthorised response.
- **Inactive Organisation Admin**: The actor is not an active organisation admin. The system denies access to the security settings page.
- **Cross-Organisation Access Attempt**: The actor attempts to configure settings for another organisation. The system denies access and does not expose the organisation's settings.
- **Missing Security-Settings Permission**: The actor can view only the permitted read-only state, or update attempts are rejected with a permission error.
- **Suspended Organisation**: The organisation is suspended. The system shows read-only settings or blocks updates according to product policy.
- **Value Outside Platform Limits**: A submitted value exceeds the allowed minimum or maximum. The system rejects the save and shows field-level validation feedback.
- **Conflicting Settings**: The submitted combination is invalid, such as enforcing a policy without a valid required value. The system rejects the save and keeps the previous settings active.
- **Existing Sessions Still Active**: The settings are saved, but some active sessions only apply the new policy on refresh, next login, or new session creation. The system explains this timing to the admin.
- **Audit Logging Failure**: The system cannot record the required audit entry. The system follows the platform's audit-failure policy and does not silently hide sensitive settings changes.

##### Traceability

- SRS documentation issue: #285
- Foundation/migration issue: #284
- Frontend issue: #286
- Backend endpoint issue: #287
- Integration issue: #288
- Backend account/security settings integration-test issue: #291

## 4. Functional Requirements

### 4.1 Base Features

| ID         | Requirement                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-BASE-01 | The system shall support rudimentary login and registration sufficient for accessing Demo 1 trainee flows.                                                    |
| FR-BASE-02 | Required login/register fields shall be visibly identified and validated before submission.                                                                   |
| FR-BASE-03 | Authentication errors shall be trainee-friendly and shall not expose technical implementation details.                                                        |
| FR-BASE-04 | The system shall apply a consistent Demo 1 visual theme across trainee-facing screens.                                                                        |
| FR-BASE-05 | The system shall provide reusable form validation and feedback behaviour for required fields, quiz answers, loading states, success states, and error states. |

### 4.2 UC-01 Functional Requirements

##### View Emails in Simulated Inbox

| ID         | Requirement                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| FR-UC01-01 | The system shall allow a trainee to view assigned simulated email summaries.                            |
| FR-UC01-02 | The system shall allow a trainee to open a selected simulated email from the inbox list.                |
| FR-UC01-03 | The system shall display simulated email details in a readable format.                                  |
| FR-UC01-04 | The system shall clearly treat inbox content as simulated, controlled training content.                 |
| FR-UC01-05 | The system shall record a lightweight interaction event when a trainee opens a simulated email.         |
| FR-UC01-06 | The system shall display empty and error states for unavailable inboxes or emails.                      |
| FR-UC01-07 | The system shall not connect to or send messages through real external email infrastructure for Demo 1. |
| FR-UC01-08 | The system shall not collect or store sensitive credential input through the simulated inbox view.      |

### 4.3 UC-02 Functional Requirements

#### View Training Document

| ID         | Requirement                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| FR-UC02-01 | The system shall allow a trainee to open an assigned training document.                                          |
| FR-UC02-02 | The system shall present training content in a structured, readable format.                                      |
| FR-UC02-03 | The system shall record a basic viewed or completed interaction where tracking is available.                     |
| FR-UC02-04 | The system shall display empty and error states for unavailable training content.                                |
| FR-UC02-05 | The system shall allow navigation to a linked quiz where available without making quiz completion part of UC-02. |
| FR-UC02-06 | The system shall not allow trainees to modify training content.                                                  |

### 4.4 UC-03 Functional Requirements

#### Complete Quiz Flow and View Results

| ID         | Requirement                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| FR-UC03-01 | The system shall allow a trainee to open an assigned quiz.                                                                            |
| FR-UC03-02 | The system shall retrieve and display quiz questions and answer options.                                                              |
| FR-UC03-03 | The system shall create or use a quiz attempt when the trainee starts the quiz flow.                                                  |
| FR-UC03-04 | The system shall allow the trainee to answer supported quiz questions and review answers before submission.                           |
| FR-UC03-05 | The system shall validate required quiz answers before accepting final submission.                                                    |
| FR-UC03-06 | The system shall submit the trainee's quiz attempt and record final answers.                                                          |
| FR-UC03-07 | The system shall display submitted quiz results and educational feedback where available.                                             |
| FR-UC03-08 | The system shall prevent duplicate final submission or further editing of a completed quiz attempt.                                   |
| FR-UC03-09 | The system shall display safe validation and error states when quiz loading, attempt creation, submission, or result retrieval fails. |

### 4.5 Tracking, Progress, and Reporting Support

| ID        | Requirement                                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-TRK-01 | The system shall support lightweight interaction events for Demo 1 trainee actions.                                                          |
| FR-TRK-02 | Tracked events should reference the trainee, target type, target record, campaign context, and timestamp (where available).                  |
| FR-TRK-03 | Tracking failures should not block content viewing where the requested content loaded successfully.                                          |
| FR-TRK-04 | Tracking shall avoid storing real credentials, passwords, or unnecessary sensitive personal data.                                            |
| FR-TRK-05 | Quiz attempts, answers, and results shall support the UC-03 submission and result flow.                                                      |
| FR-TRK-06 | Reporting and risk concepts are future-facing placeholders only and shall not expand Demo 1 into a dashboard or risk-scoring implementation. |

### 4.6 Future/Admin Supporting Context

Future organisation admin capabilities may include campaign CRUD, campaign assignment, content authoring, reusable simulation templates, quiz authoring, reporting dashboards, and organisation/user management. These concepts provide context for the campaign-based domain model but are not Demo 1 acceptance criteria.

## 5. API Contracts

Detailed Demo 1 route paths, request/response DTOs, validation notes, and endpoint behaviour are maintained in [API.md](./API.md). This SRS intentionally does not duplicate full payload details.

The backend API is also documented through Swagger/OpenAPI for interactive inspection during development. When the backend is running locally, the Swagger documentation can be accessed from the backend Swagger UI route, typically at:

`http://localhost:4000/api-docs`

This allows developers and reviewers to inspect available endpoints, request/response schemas, validation expectations, and example responses directly from the running backend.

At a high level:

- UC-01 uses campaign-item scoped simulated inbox, simulated email detail, and simulated email interaction endpoints.
- UC-02 uses campaign-item scoped training document and training progress endpoints.
- UC-03 uses campaign-item scoped quiz retrieval, quiz attempt creation, attempt submission, and result retrieval endpoints.
- Campaign discovery and assignment endpoints support access to trainee campaign items.

API routes and payloads remain implementation contracts documented in `API.md` and the backend Swagger/OpenAPI documentation; this SRS keeps only the requirement-level mapping.

## 6. Domain Model

The Demo 1 domain model provides a conceptual view of the entities required to support the trainee-facing use cases, API planning, traceability, and future database planning. It is not a final database schema and should not be treated as a direct Prisma model or migration design. Diagram sources and exports are maintained under [diagrams/](./diagrams/).

The domain model diagram can be found here: [Demo 1 domain model](./diagrams/demo1-domain-model-final.svg).

### 6.1 Core Domain Concepts

- `Healthcheck` represents a simple system health response. This is not in the Domain model diagram as it serves no business purpose.
- `User` represents the platform account and carries identity, authentication status, and user type information.
- `Trainee` is the conceptual trainee role. A trainee may be a `GeneralTrainee` with no organisation or an `OrganisationTrainee` linked to exactly one organisation.
- `OrganisationAdmin` is an organisation-linked administrator for future campaign/content setup.
- `IPAdmin` is a platform-level administrator for future platform oversight.
- `Organisation` represents an organisation using the platform. `OrganisationContext` stores future organisation-specific context such as logos, brand guidelines, security policies, approved domains, terminology, and related metadata.
- `Campaign` is the main assignment and ordering container. A campaign may belong to an organisation or may represent default Insightful Phish campaigns.
- `CampaignAssignment` links a `Campaign` to a `Trainee` and tracks assignment-level availability, progress, due dates, and completion.
- `CampaignItem` is the ordered campaign structure used to make content available. `CampaignComponent` and `CampaignComponentGroup` specialise campaign items; groups support one grouping level only.
- `TrainingDocumentComponent`, `QuizComponent`, and `SimulationComponent` are campaign component specialisations that link campaign placement to a `TrainingDocument`, `Quiz`, or `Simulation`.
- `TrainingDocument` is reusable readable content for UC-02.
- `Quiz`, `QuizQuestion`, `ChoiceQuestion`, `SingleChoiceQuestion`, `MultiChoiceQuestion`, `AnswerOption`, `QuizAttempt`, `AttemptAnswer`, and `QuizResult` support UC-03. Demo 1 uses simple single-choice quiz behaviour, while richer question and marking behaviour remains future-facing.
- `Simulation`, `SimulatedInbox`, and `SimulatedEmail` support UC-01. Demo 1 simulation scope is limited to viewing and opening controlled simulated emails.
- `EmailRedFlag` describes potential red flags associated with a simulated email. `EmailClassificationResponse` is future trainee judgement on a simulated email, separate from quiz attempts.
- `InteractionEvent` records lightweight trainee actions such as campaign progress, training viewed/completed, quiz activity, simulated email opened, and future simulation interactions.

### 6.2 Domain Relationships and Limits

A trainee sees Demo 1 content through campaign assignment and campaign item placement. A campaign contains ordered campaign items. A campaign component may expose a simulated inbox, training document, or quiz through its component subtype. In the current implementation, the conceptual component placement may be represented by `CampaignItem` records with component fields. Demo 1 uses seeded content and does not have admin authoring flows.

For Demo 1 simplicity, component groups support one grouping level only. A `CampaignComponentGroup` can contain `CampaignComponent` records, but not other component groups. This can be changed easily in the future if needed.

Simulated emails belong to a simulated inbox campaign component. Demo 1 requires only safe viewing/opening of these emails. Email classification, simulated links, attachments, fake login pages, richer interaction tracking, real email delivery, and AI-assisted generation will be implemented in the future.

Interaction tracking must remain safe and must not store real credentials or sensitive submitted values. Quiz answers are stored as attempt answers and may reference selected answer options; quiz results summarise submitted attempts.

## 7. Architectural Requirements

Architecture, quality drivers, deployment assumptions, layering, persistence boundaries, API standards, and technical constraints are documented in [architecture.md](./architecture.md).

At requirement level, Demo 1 should:

- Separate frontend, backend, shared DTO/validation, and persistence responsibilities;
- Use campaign-item access control consistently for trainee content;
- Keep simulation interactions inside the controlled platform boundary;
- Preserve clear contracts between frontend, backend, shared types, and database access;
- Support local development and CI validation for Demo 1 functionality.

## 8. Technology Requirements

Demo 1 uses the following technology stack:

- React, Vite, and TypeScript for the frontend
- Express and TypeScript for the backend API
- Prisma ORM for database access
- PostgreSQL for relational persistence
- a shared package for DTOs, shared types, and validation contracts
- Zod for request/DTO validation where applicable
- Vitest, Supertest, and relevant frontend testing tools for automated checks
- Docker Compose for local database support
- GitHub Actions for CI

## 9. Quality Requirements

### 9.1 Usability

- Trainee-facing flows shall use clear, non-technical wording.
- The system shall provide understandable loading, empty, unavailable, success, and error states.
- The trainee shall have a safe way to retry, go back, or continue when content cannot be loaded.

### 9.2 Accessibility

- Feedback and validation messages shall not rely only on colour.
- Primary recovery actions shall be keyboard-accessible.
- Important messages should be placed near the relevant content, field, question, or action where possible.

### 9.3 Security, Privacy, and Safety

- Demo 1 simulated inbox content shall remain controlled platform content.
- The system shall not access real trainee mailboxes for UC-01.
- Simulated interactions shall not collect or store real credentials.
- Tracking shall follow data minimisation and avoid unnecessary personal or sensitive data.
- Technical error details, stack traces, and internal exception names shall not be shown to trainees.

### 9.4 Error Handling and Resilience

- Content loading failures shall produce safe messages and recovery options.
- Interaction tracking failures should not block reading simulated emails or training documents when the content itself loaded successfully.
- Quiz submission failures should preserve answers where possible and allow retry.

### 9.5 Maintainability

- Requirements, API contracts, domain terminology, and traceability should remain aligned across this SRS, [API.md](./API.md), [architecture.md](./architecture.md), and [traceability.md](./traceability.md).
- Domain names in this SRS are conceptual unless the implementation documents define them otherwise.
- Future-facing concepts shall be marked clearly so Demo 1 scope does not expand accidentally.

### 9.6 Testability and Traceability

- Core use cases and base features should be testable through frontend, backend, integration, or manual Demo 1 verification as appropriate.
- QA planning is maintained in [testing.md](./testing.md).
- Traceability references are maintained in [traceability.md](./traceability.md).

---

## Appendix A: Document Change History

| Version | Date       | Author(s)                | Sections / Area Updated                            | Summary of Change                                                                                    |
| ------- | ---------- | ------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 0.1.0   | 2026-04-27 | Johan Nel                | Initial document                                   | Created the initial Demo 1 SRS structure.                                                            |
| 0.1.1   | 2026-04-28 | Adriano Jorge            | UC-01 simulated inbox; traceability references     | Added simulated inbox requirements and related SRS refinements.                                      |
| 0.1.2   | 2026-04-30 | Rudolph Lamprecht        | Admin/campaign context; architecture/API alignment | Added campaign/admin-related SRS content and aligned with early API/architecture thinking.           |
| 0.1.3   | 2026-04-30 | Zoë Joubert; Connor Bell | UC-03 quiz flow; traceability                      | Added quiz-flow requirements and corrected related traceability.                                     |
| 0.1.4   | 2026-04-30 | Connor Bell              | UC-02 training document                            | Added final Demo 1 training-view SRS requirements.                                                   |
| 0.1.5   | 2026-05-01 | Adriano Jorge            | Domain model alignment                             | Added SRS alignment for the initial domain model.                                                    |
| 0.1.6   | 2026-05-03 | Zoë Joubert              | Validation; feedback; phishing feedback scope      | Added validation and UI feedback requirements for Demo 1.                                            |
| 0.1.7   | 2026-05-07 | Johan Nel                | Document structure; cross-references; use cases    | Reworked SRS structure and aligned it with related Demo 1 documents.                                 |
| 0.1.8   | 2026-05-07 | Johan Nel                | Use-case diagrams                                  | Linked or referenced Demo 1 use-case diagrams from the SRS.                                          |
| 0.1.9   | 2026-05-08 | Rudolph Lamprecht        | API/architecture cross-reference                   | Added API-contract linkage and architecture-related SRS references.                                  |
| 0.1.10  | 2026-05-09 | Connor Bell              | Minor SRS amendments                               | Applied minor SRS wording/consistency updates alongside design navigation documentation.             |
| 0.1.11  | 2026-05-09 | Adriano Jorge            | Tracking; progress requirements                    | Added tracking and progress-related SRS requirements.                                                |
| 0.1.12  | 2026-05-09 | Adriano Jorge            | Domain/API terminology                             | Aligned SRS terminology with domain and API language.                                                |
| 0.1.13  | 2026-05-10 | Johan Nel                | Terminology; integration; traceability             | Performed a broad SRS integration pass, including learner/employee to trainee terminology alignment. |
| 0.1.14  | 2026-05-16 | Johan Nel                | Domain model; campaign-item model; terminology     | Updated SRS to match the revised modular campaign/domain model and trainee terminology.              |
| 0.1.15  | 2026-05-19 | Johan Nel                | Demo 1 scope; future scope                         | Clarified Demo 1 scope and later-demo planned features.                                              |
| 0.1.16  | 2026-05-21 | Johan Nel                | Headings; links; formatting                        | Cleaned headings/file links and formatted SRS as part of final domain-model documentation updates.   |
