# Functional Requirements

### SRS Content

- [Home](README.md)
- [Introduction and Scope](introduction.md)
- [Users and User Stories](users-and-user-stories.md)
- **[Functional Requirements](functional-requirements.md)** &larr; _You are here_
- [Use Cases](use-cases.md)
- [Quality Requirements](quality-requirements.md)
- [Domain Model](domain-model.md)

---

# 3. Functional Requirements

The following functional requirements define the capabilities and observable behaviour that the Insightful Phish system shall provide.

## `R1` Authentication and Account Access

- `R1.1` The system shall allow an individual trainee to register for an account
  - `R1.1.1` The system shall require an individual trainee to provide a first name, last name, email address, password and password confirmation
  - `R1.1.2` The system shall validate the registration information before creating the account
  - `R1.1.3` The system shall create the account is a pending email-verification state
  - `R1.1.4` The system shall send an email verification link to the registered email address
  - `R1.1.5` The system shall activate the account after the email verification link has been successfully validated
  - `R1.1.6` The system shall reject registration when the email address conflics with an existing account, organisation registration request, or active invitation

- `R1.2` The system shall allow all supported user types to log in through a common login page
  - `R1.2.1` Users shall be able to log in using their email address and password
  - `R1.2.2` Users shall be able to request a remembered session where platform and organisation policy permits it
  - `R1.2.3` The system shall validate the user's credentials, account status, email verification status and applicable organisation status before granting access
  - `R1.2.4` The system shall create an authenticated session after a successful login
  - `R1.2.5` The system shall redirect authanticed users to the appropiate area depending on their user type and context
  - `R1.2.6` The system shall prevent disabled users from logging in
  - `R1.2.7` The system shall prevent organisation-linked users from logging in when their organisation's status prohibits access
  - `R1.2.8` The system shall display a generic error when login credentials are invalid

- `R1.3` The system shall allow authenticated users to log out
  - `R1.3.1` The system shall revoke the current authenticated session when a user logs out
  - `R1.3.2` The system shall return the user to a public page after logout

- `R1.4` The system shall allows users to recover access after forgetting their password
  - `R1.4.1` Users shall be able to request a password reset link using their email address
  - `R1.4.2` The system shall return the same safe regardless of whether the submitted email address belongs to an account
  - `R1.4.3` The system shall send a password resent link only when the account exists and is eligible for password recovery
  - `R1.4.4` The system shall allow the user to set a new password after presenting a valid password reset token
  - `R1.4.5` The system shall validate the new password against the platform's password policy
  - `R1.4.6` The system shall revoke the user's existing activt sessions adter a successfuly password reset
  - `R1.4.7` The system shall send a password change notification to the user's email address after a successful password reset

- `R1.5` The system shall allow eligible users to request new verification, password reset, setup, or invitation links
  - `R1.5.1` The system shall apply a resend cooldown
  - `R1.5.2` The system shall reject resend requests made before the resend cooldown expires
  - `R1.5.3` The system shall invalidate or supersede obsolete tokens when a new token is issued
  - `R1.5.4` The system shall use account enumeration safe responses where the existence of an account must remain private

- `R1.6` The system shall validate every tokenised action before completing it
  - `R1.6.1` The system shall reject a token that is missing, invalid, used, expired, revoked or intended for another purpose
  - `R1.6.2` The system shall verify that a token applies to the intended email address, user, invitation, request, or organisation context
  - `R1.6.3` The system shall mark a token as used only after its intended action has completed successfully
  - `R1.6.4` The system shall display an approprite recovery option where a failed tokenised action can safely be retried or resent

## `R2` Trainee Campaign Access

- `R2.1` The system shall allow authenticated trainees to view the campaigns available to them
  - `R2.1.1` Individual trainees shall be able to view campaigns in which they are validly enrolled
  - `R2.1.2` Organisation trainees shall be able to view campaigns assigned to them by their organisation
  - `R2.1.3` The system shall not disclose campaigns or campaign content that is not available to the authenticated trainee
  - `R2.1.4` The system shall display each available campaign's title, status, progress, and applicable start and end dates
  - `R2.1.5` The system shall display an appropriate empty state when a trainee has no available campaigns

- `R2.2` The system shall allow trainees to view the ordered items within an available campaign
  - `R2.2.1` The system shall preserve the order defined for campaign items
  - `R2.2.2` The system shall show whether each campaign item is available, locked, completed or otherwise unavailable
  - `R2.2.3` The system shall prevent a trainee from opening a campaign item when its prerequisite conditions have not been satisifed
  - `R2.2.4` The system shall explain why a campaign item is locked or unavailable
  - `R2.2.5` The system shall make newly unlocked campaign items available when their prerequisites have been completed

- `R2.3` The system shall track trainee interaction and progress within campaign context
  - `R2.3.1` Tracked activity shall identify the trainee, campaign assignment, campaign item, interaction type, and timestamp where applicable
  - `R2.3.2` The system shall treat repeated completion requests idemponently where duplicate requests must not be created
  - `R2.3.3` The system shall not store passwords, submitted credentials or unnecessary sensitive content in campaign interaction records

## `R3` View Emails in a Simulated Inbox

> [!Note]
> The Functional Requirements in `R3` are related to **Use Case 1**, which can be found [here]() <!-- TODO insert appropriate link-->

- `R3.1` The system shall allow a trainee to open an assigned simulated inbox campaign item
  - `R3.1.1` The system shall verify that the simulated inbox campaign item belongs to a campaign available to the authenticated trainee
  - `R3.1.2` The system shall display the simulated inbox as controlled simulated training content
  - `R3.1.3` The system shall not connect the simulated inbox to the trainee's real email inbox

- `R3.2` The system shall allow a trainee to view simulated email summaries
  - `R3.2.1` Each emaul summary shall display the simulated sender
  - `R3.2.2` Each email summary shall display the email subject
  - `R3.2.3` Each email summary shall display a preview of the email if available
  - `R3.2.4` Each email summary shall display the simulated recieved date and time
  - `R3.2.5` The system shall display an empty state when the simulated inbox contains no simulated emails

- `R3.3` The system shall allow a trainee to open a selected simulated email
  - `R3.3.1` The system shall verify that the selected email belongs to th accessible simulated inbox campaign item
  - `R3.3.2` The system shall display the simulated sender information
  - `R3.3.3` The system shall display the simulated subject and received date and time
  - `R3.3.4` The system shall display the simulated email body in a readable format
  - `R3.3.5` The system shall present links and attachements using controlled representations that cannot expose a trainee to an unintended external threat
  - `R3.3.6` The system shall allow the reainee to return to the simulated inbox

- `R3.4` The system shall record that the trainee opened a simulated email
  - `R3.4.1` The system shall associate the opened event with the trainee, campaign, and simulated email
  - `R3.4.2` A failure to reord the opened interaction shall not falsely indicate that progress was recorded
  - `R3.4.3` A failure to record the opened interaction shall not prevent the trainee from safely reading content that has already been loaded

- `R3.5` The system shall display the safe loading, unavailable, not-found, and error states for the simulated inbox and email detail views

## `R4` View a Training Document

> [!Note]
> The Functional Requirements in `R4` are related to **Use Case 2**, which can be found [here]() <!-- TODO insert appropriate link-->

- `R4.1` The system shall allow a trainee to open an assigned training document campaign item
  - `R4.1.1` The system shall verify that the training document campaign item belongs to a campaign available to the authenticated trainee
  - `R4.1.2` The system shall enforce applicable campaign-item prerequisites before granting access to the training document
  - `R4.1.3` The system shall resolve training content through an approved training document content reference
  - `R4.1.4` The system shall reject unsupported or unsafe content references

- `R4.2` The system shall display training content in a structured and readable format
  - `R4.2.1` The system shall display the training document title
  - `R4.2.2` The system shall display the training document summary, where available
  - `R4.2.3` The system shall render supported headings, paragraphs, lists, links and other approved content elements
  - `R4.2.4` The system shall prevent trainees from modifying training content

- `R4.3` The system shall record relevent training document progress
  - `R4.3.1` The system shall be able to record that a trainee viewed a training document
  - `R4.3.2` The system shall be able to record that a trainee completed a training document
  - `R4.3.3` The system shall distinguish between viewed and completed activity
  - `R4.3.4` The system shall prevent repeated completion requests from creating duplicate completion records
  - `R4.3.5` A progress tracking failure shall not falsely mark a document as completed

- `R4.4` The system shall allow the trainee to continue to the text available campaign item
- `R4.5` The system shall display the safe loading, unavailable, not-found, completion, retry and error states for training documents

## `R5` Complete a Quiz and View Results

> [!Note]
> The Functional Requirements in `R5` are related to **Use Case 3**, which can be found [here]() <!-- TODO insert appropriate link-->

- `R5.1` The system shall allow a trainee to open an assigned quiz campaign item
  - `R5.1.1` The system shall verify that the quiz campaign item belongs to a campaign available to the authenticated trainee
  - `R5.1.2` The system shall enforce applicable campaign item prerequisites before granting access to the quiz
  - `R5.1.3` The system shall retrieve supported quiz questions and answer options
  - `R5.1.4` The system shall not disclose correct answers, scoring indivators or restricted feedback before the quiz is submitted

- `R5.2` The system shall allow a trainee to start or resume a quiz attempt
  - `R5.2.1` The system shall create an attempt when no compatible in progress attempt exists
  - `R5.2.2` The system shall reuse a compatible in progress attempt rather than creating an unnecessary duplicate
  - `R5.2.3` The system shall ensure that an attempt belongs to the authenticated trainee and the campaign context
  - `R5.2.4` The system shall prevent a trainee from accessing another trainee's attempt

- `R5.3` The system shall allow the trainee to answer supported quiz questions
  - `R5.3.1` The system shall allow the trainee to select answers permitted by the question type
  - `R5.3.2` The system shall allow the trainee to review their selected answers before they submit the quiz
  - `R5.3.3` The system shall validate required answers before attempting final quiz submission
  - `R5.3.4` The system shall reject answer options that do not belong to the relevant question
  - `R5.3.5` The system shall identify incomplete or invalid answers without submitting the quiz attempt

- `R5.4` The system shall allow the trainee to submit a valid quiz attempt
  - `R5.4.1` The system shall calculate the quiz submittion score result using server-controlled scoring rules
  - `R5.4.2` The system shall store the submitted answers and the calculated quiz submittion score result
  - `R5.4.3` The system shall mark the attempt as submitted only after the submission has completed successfully
  - `R5.4.4` The system shall prevent duplicate final submission
  - `R5.4.5` The system shall prevent further editing of a submitted attempt
  - `R5.4.6` The system shall preserve an in-progress attempt when submission validation fails

- `R5.5` The syste shall allow the trainee to view the result of a submitted attempt
  - `R5.5.1` The system shall display the trainee's score
  - `R5.5.2` The system dhall display the applicable pass or completion state
  - `R5.5.3` The system shall display educational feedback where available
  - `R5.5.4` The system shall allow a submitted result to be revisited without reopening the attempt for editing
  - `R5.5.5` The system shall allow the trainee to return to the campaign or quiz context

- `R5.6` The system shall display safe loading, validation, submission-failure, result-failure and retry states for the quiz flow

## `R6` Request Organisation Registration

> [!Note]
> The Functional Requirements in `R6` are related to **Use Case 4**, which can be found [here]() <!-- TODO insert appropriate link-->

- `R6.1` The system shall provide a public organisation registration request form
  - `R6.1.1` The system shall allow an organisation representative to enter the organisation name, provide an organisation description, approximate organisation size and an optional organisation website URL
  - `R6.1.2` The system shall allow an organisation representative to enter their first name, last name and email address
  - `R6.1.3` The system shall validate the required and optional fields

- `R6.2` The system shall create a pending organisation registration request after a valid form submission
  - `R6.2.1` The system shall store the submitted organisation and representative ifnormation
  - `R6.2.2` The system shall record the date and status of the request
  - `R6.2.3` The system shall not create an organisation account when the request is initially submitted
  - `R6.2.4` The system shall not create an organisation administrator account before the organisation is approved by a platform administrator

- `R6.3` The system shall detect conflicting or duplicate organisation registration requests
  - `R6.3.1` The system shall detect an existing unresolved request for the same organisation where practical
  - `R6.3.2` The system shall reject a request when the representative email conflicts with an ineligible existing platform or organisation account
  - `R6.3.3` The system shall return a safe explanation when a request cannot be accepted

- `R6.4` The system shall send a request received confirmation email after submission
  - `R6.4.1` The system shall retain the submitted request if the confirmation email cannot be delivered
  - `R6.4.2` The system shall record the outcome of the email delivery attempt
  - `R6.4.3` The system shall display a safe submission acknolwedgement in the email message that explains that platfrom review is required before the organisation will be created

## `R7` Review and Manage Organisation Registrations

> [!Note]
> The Functional Requirements in `R7` are related to **Use Case 5**, which can be found [here]() <!-- TODO insert appropriate link-->

- `R7.1` The system shall allow platform administrators to view organisation registration requests and registered organisations
  - `R7.1.1` The system shal restrict this information to authenticated platform administrators
  - `R7.1.2` The system shall display the organisation name, size, website, representative email, request status, organisation status and last updated date where applicable
  - `R7.1.3` The system shall allow platform administrators to search requests by organisation name, website or representative email
  - `R7.1.4` The system shall allow platform administrators to filter request by request or organisation status
  - `R7.1.5` The system shall allow platform administrators to sort and paginate the list
- `R7.2` The system shall allow a platform administrator to view the details of an organisation registration request
  - `R7.2.1` The system shall display the submitted organisation information
  - `R7.2.2` The system shall display the organisation representative's submitted information
  - `R7.2.3` The system shall display the current request status
  - `R7.2.4` The system shall prevent stale review actions when another platform administrator has already changed the request
  - `R7.2.5` The system shall display the request's status and action history where available

- `R7.3` The system shall allow a platform administrator to mark a pending organisation registration request as contacted
  - `R7.3.1` The system shall retain the request for later approval or rejection
  - `R7.3.2` The system shall record the administrator and time associated with the action

- `R7.4` The system shall allow a platform administrator to approve an eligible organisation registration request
  - `R7.4.1` The system shall require confirmation of the organisation and initial administrator details before approval
  - `R7.4.2` The system shall create the organisation in an onboarding state
  - `R7.4.3` The system shall create an initial organisation administrator setup invitation
  - `R7.4.4` The system shall send the organisation representative a secure initial administrator setup link
  - `R7.4.5` The system shall update the request to an approved waiting for setup state
  - `R7.4.6` The system shall create the organisation, setup invitation and request state transiation atomically
  - `R7.4.7` The system shall prevent repeated approval from creating dupliccate organisations or duplicate invitations
  - `R7.4.8` The system shall retain the onboarding organisation and record a failed delivery state when email delivrty fails after successful approval

- `R7.5` The system shall allow a platform administrator to reject an eligible organisation registration request
  - `R7.5.1` The system shall require a rejection reason
  - `R7.5.2` The system shall store the rejection reason and rejecting platfrom administrator
  - `R7.5.3` The system shall update the request status to rejected
  - `R7.5.4` The system shall notify the representative of the rejection and supplied reason
  - `R7.5.5` The system shall retain the rejected state if the notification email cannot be delivered

- `R7.6` The system shall allow a platform administrator to resend an eligible initial administrator setup invitation
  - `R7.6.1` Resending shall be available when the previous invitation failed, expired or other qualifies for replacement
  - `R7.6.2` The system shall apply resend cooldown and rate limit rules
  - `R7.6.3` The system shall prevent multiple simultaneously valid setup tokens where the token policy requires only one

- `R7.7` The system shall allow a platform adminisrator to view surface level details for an approved or active organisation
  - `R7.7.1` The system shall display organisation information and status
  - `R7.7.2` The system shall display the organisation's initial administrator's setup status
  - `R7.7.3` The system shall display a high level list of organisation administrators where permitted
  - `R7.7.4` The system shall not expose unnecessary organisation internal trainee, campaign or content data

- `R7.8` The system shall audit organisation registration review actions
  - `R7.8.1` The system shall record contacted, approved, rejected, resent and other supported state changes
  - `R7.8.2` The audit entry shall identify the actor, target request or organisation, action, outcome and timestamp

## `R8` Complete Initial Organisation Administrator Setup

> [!Note]
> The Functional Requirements in `R8` are related to **Use Case 6**, which can be found [here]() <!-- TODO insert appropriate link-->

---

The next section of the SRS is: [Use Cases](use-cases.md)
