# Functional Requirements

### SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- [2. Users and User Stories](users-and-user-stories.md)
- **[3. Functional Requirements](#3-functional-requirements)** &larr; _You are here_
  - [R1 Authentication and Account Access](#r1-authentication-and-account-access)
  - [R2 Trainee Campaign Access](#r2-trainee-campaign-access)
  - [R3 View Emails in Simulated Inbox](#r3-view-emails-in-a-simulated-inbox)
  - [R4 View a Training Document](#r4-view-a-training-document)
  - [R5 Complete a Quiz and View Results](#r5-complete-a-quiz-and-view-results)
  - [R6 Request Organisation Registration](#r6-request-organisation-registration)
  - [R7 Review and Manage Organisation Registrations](#r7-review-and-manage-organisation-registrations)
  - [R8 Complete Initial Organisation Administrator Setup](#r8-complete-initial-organisation-administrator-setup)
  - [R9 Accept an Organisation Invitation or Role Change](#r9-accept-an-organisation-invitation-or-role-change)
  - [R10 Manage Organisation Employees](#r10-manage-organisation-employees)
  - [R11 Manage Organisation Administrators and Permissions](#r11-manage-organisation-administrators-and-permissions)
- [4. Use Cases](use-cases.md)
- [5. Quality Requirements](quality-requirements.md)
- [6. Domain Model](domain-model.md)

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

- `R8.1` The system shall allow the invited initial organisation administrator to open a secure setup link
  - `R8.1.1` The system shall validate the setup token and its invitation, request, organisation, email, purpose, status and expiry
  - `R8.1.2` The system shall display the organisation and role context associated with the invitation
  - `R8.1.3` The system shall prevent setup when the organisation is no longer in a compatible onboarding state

- `R8.2` The system shall allow the initial administrator to complete the required account information
  - `R8.2.1` The system shall use the invited email address as the authorative account email
  - `R8.2.2` The system shall allow the invited administrator to confirm or complete their first and last name
  - `R8.2.3` The system shall require a password and matching password confirmation
  - `R8.2.4` The system shall validate the password against the current password policy
  - `R8.2.5` The system shall not require separate email verification because possession of the valid setup link verifies that the invited email exists

- `R8.3` The system shall create or activate the initial organisation administrator account after successful setup
  - `R8.3.1` The system shall associate the orgaminisation administrator with the approved organisation
  - `R8.3.2` The system shall create the initial organisation administrator profile
  - `R8.3.3` The system shall grant the initial administrator all current organisation administrator permissions
  - `R8.3.4` The system shall activate the organisation
  - `R8.3.5` The system shall updated the associated registration request and invitation to their completed states
  - `R8.3.6` The system shall mark the setup token as used only after the account, administrator profile, permissions, organisation, request and invitation updates succeed
  - `R8.3.7` The system shall prevent repeated setup from creating duplicate accounts, profiles or permissions

- `R8.4` The system shall notify the initial administrator after successful setuo
  - `R8.4.1` The system shall send a setup completed confirmation email
  - `R8.4.2` The system shall allow the organisation administrator to proceed to login
  - `R8.4.3` The system shall record the setup completion in the organisation onboarding history and audit log

## `R9` Accept an Organisation Invitation or Role Change

> [!Note]
> The Functional Requirements in `R9` are related to **Use Case 7**, which can be found [here]() <!-- TODO insert appropriate link-->

- `R9.1` The system shall allow an invited user to open an organisation invitation link
  - `R9.1.1` The system shall validate the invitation token, invitation type, target email, target user, organisation status, purpose and expiry
  - `R9.1.2` The system shall display the organisation, invited role and consequences of accepting the invite
  - `R9.1.3` The system shall identify whether the invitation requires new account setup or confirmation by an existing user
  - `R9.1.4` The system shall require an existing target user to authenticate before accpeing a role change

- `R9.2` The system shall allow a new invited organisation trainee to complete account setup
  - `R9.2.1` The system shall use the invited email address as the authoritative email
  - `R9.2.2` The system shall allow the invited trainee to complete their first name, last name and passowrd
  - `R9.2.3` The system shall create the user and organisation trainee membership only after successful setup
  - `R9.2.4` The system shall associate the trainee with the invitation's organisation

- `R9.3` The system shall allow an eligible existing user to accept an organisation role change
  - `R9.3.1` The system shall require explicit confirmation before changing the user's role or organisation membership
  - `R9.3.2` The system shall ensure that an organisation administrator promotion targets an active trainee in the same organisation
  - `R9.3.3` The system shall assign only the permissions recorded in the accepted administrator promotion invitation
  - `R9.3.4` The system shall reject a role change that conflicts with the user's current platform or organisation role
  - `R9.3.5` The system shall apply the the account conversion policy to the user's previous trainee access and progress
    - `R9.3.5.1` The system shall convert the user's existing organisation trainee account into an organisation administrator account only after the user explicitly accepts the promotion invitation
    - `R9.3.5.2` The system shall replace the user's organisation trainee access with organisation administrator access
    - `R9.3.5.3` The system shall remove the converted user's access to trainee-only features, selected campaigns and trainee progress
    - `R9.3.5.4` The system shall inform the user of the effects on their trainee access and progress before they confirm the conversion
    - `R9.3.5.5` The system shall leave the user's existing trainee role, access and progress unchanged if they invitation is rejected, ingored, expires or not successfully accepted
    - `R9.3.5.6` The system shall not restore the user's previous campaign selections or progess if the organisation administrator account is converted back into a trainee account

- `R9.4` The system shall allow an invited user to reject an invitation where rejection is supported
  - `R9.4.1` The system shall mark the invitation as rejected
  - `R9.4.2` The system shall leave the user's existing role and access unchanged after rejection

- `R9.5` The system shall complete invitation acceptance atomically
  - `R9.5.1` The system shall update the user, membership, role, permissions, invitation and token consistently
  - `R9.5.2` The system shall mark the invitation token as used only after acceptance succeeds
  - `R9.5.3` The system shall prevent an accepted, rejected, expired or revoked invitation from being used again

- `R9.6` The system shall send a confirmation email after successful invitation acceptance or role change

- `R9.7` The system shall record organisation membership and role changes in the audit log

## `R10` Manage Organisation Employees

> [!Note]
> The Functional Requirements in `R10` are related to **Use Case 8**, which can be found [here]() <!-- TODO insert appropriate link-->

- `R10.1` The system shall allow an organisation administrator to view trainees belonging to their organisation
  - `R10.1.1` The system shall restrict the list to the organisation administrator's organisation
  - `R10.1.2` The system shall require the applicable trainee view permission
  - `R10.1.3` The system shall display each trainee's name, email, role, membership status and invitation status where applicable
  - `R10.1.4` The system shall diplsay whether a trainee is invited, active, rejected, expired, revoked or disabled
  - `R10.1.5` The system shall display an appropriate empty state when the organisation has no trainees

- `R10.2` The system shall allow an authorised organisation administrator to invite a trainee
  - `R10.2.1` The system shall require a valid target email address
  - `R10.2.2` The system shall allow optional first name and last name information to be supplied
  - `R10.2.3` The system shall verify that the administrator has permission to invite organisation trainees
  - `R10.2.4` The system shall reject an invitation when the email belongs to an ineligible platform administrator or another organisation
  - `R10.2.5` The system shall reject a duplicate invitation for an already active organisation trainee
  - `R10.2.6` The system shall identify an existing pending invitation and offer the appropriate resend action
  - `R10.2.7` The system shall create an organisation scoped trainee invitation
  - `R10.2.8` The system shall send a secure invitation email
  - `R10.2.9` The system shall record a failed to send state when invitation delivery fails
- `R10.3` The system shall allow an authorised organisation administrator to resend an eligible trainee invitation
  - `R10.3.1` The system shall apply resend cooldown and rate limit rules
  - `R10.3.2` The system shall issue a replacement token where the existing token is no longer valid
  - `R10.3.3` The system shall update the invitation delivery status

- `R10.4` The system shall allow an authorised organisation administrator to revoke a pending trainee invitation
  - `R10.4.1` The system shall invalidate active tokens associated with the revoked invitation
  - `R10.4.2` The system shall prevent a revoked invitation from being accepted

- `R10.5` The system shall allow an authorised organisation administrator to disable an organisation trainee's membership
  - `R10.5.1` The system shall require confirmation of sensitive action
  - `R10.5.2` The system shall verify that the target trainee belongs to the administrator's organisation
  - `R10.5.3` The system shall prevent an administrator from disabling themselves through the trainee manangement flow
  - `R10.5.4` The system shall require the administrator role to be removed through the administrator management flow before disabling a trainee who is also an administrator
  - `R10.5.5` The system shall revoke the disabled trainee's organisation related sessions
  - `R10.5.6` The system shall notify the trainee of the membership change

- `R10.6` The system shall allow an authorised organisation administrator to reactivate an eligible disabled trainee membership
  - `R10.6.1` Reactivitation shall restore organisation access without creating a duplicate organisation membership
  - `R10.6.2` Reactiviation shall not automatically restore revoked administrator permissions

- `R10.7` The system shall audit trainee invitation, resend, revocation, disablement and reactiviation actions

## `R11` Manage Organisation Administrators and Permissions

> [!Note]
> The Functional Requirements in `R11` are related to **Use Case 9**, which can be found [here]() <!-- TODO insert appropriate link-->

- `R11.1` The system shall allow organisation administrators to view administrators in their organisation
  - `R11.1.1` The system shall display each administrator's name, email, status and assigned permissions
  - `R11.1.2` The system shall restrict the list to the authenticated administrator's organisation
  - `R11.1.3` The system shall not expose administrators or permissions from other organisations

- `R11.2` The system shall allow an authorised organisation administrator to invite an active organisation trainee to become an organisation administrator
  - `R11.2.1` The system shall require the administrator invitation permission
  - `R11.2.2` The system shall require the target to be an active organisation trainee in the same organisation
  - `R11.2.3` The system shall reject an individual trainee, platform administrator, user from another organisation, or exisiting organisation administrator
  - `R11.2.4` The system shall allow the inviting administrator to select the target administrator's initial permissions
  - `R11.2.5` The system shall validate permission dependencies before creating the invitation
  - `R11.2.6` The system shall create an organisation administrator promotion invitation
  - `R11.2.7` The system shall send a secure role change invitation to the organisation trainee
  - `R11.2.8` The system shall not change the trainee's role until the invitation is accepted

- `R11.3` The system shall allow an authorised organisation administrator to resend an eligible administrator promotion invitation
  - `R11.3.1` The system shall prevent duplicate active promotion invitations
  - `R11.3.2` The system shall apply resend cooldown and rate-limit rules

- `R11.4` The system shall allow an authorised organisation administrator to change an organisation administrator's permissions
  - `R11.4.1` The system shall require the appropriate permission management permission
  - `R11.4.2` The system shall verify that the actor and target belong to the same organisation
  - `R11.4.3` The system shall enforce read and edit permission dependencies
  - `R11.4.4` Granting an edit permission shall also grant its required read permission
  - `R11.4.5` The system shall record the old and new permission sets
  - `R11.4.6` The system shall prevent a permission change that would leave no administrator with the permission to invite organisation administrators
  - `R11.4.7` The system shall prevent a permission change that would leave no administrator with the permission to manage organisation administrator permissions
  - `R11.4.8` The system shall prevent an administrator from improperly removing their own final critical permissions

- `R11.5` The system shall allow an authorised organisastion administrator to remove another administrator's administrative privileges
  - `R11.5.1` The system shall require the appropriate administrator removal permission
  - `R11.5.2` The system shall require confirmation of the sensitive action
  - `R11.5.3` The system shall prevent removal when the target is the last administrator holding a required ciritical permission
  - `R11.5.4` The system shall convert the target to the organisation trainee state
  - `R11.5.5` The system shall revoke sessions that retain the removed administrative authority
  - `R11.5.6` The system shall notify the affected user of the role change

- `R11.6` The system shall enforce organisation administrator permissions on the server for every protected management action
- `R11.7` The system shall audit administrator invitations, role changes, permission changes, removals and failed attempts

## `R12` Manage Insightful Phish Platform Administrators

> [!Note]
> The Functional Requirements in `R12` are related to **Use Case 10**, which can be found [here]() <!-- TODO insert appropriate link-->

- `R12.1` The system shall allow platform administrators to view the platform administrator list
  - `R12.1.1` The system shall display each platform administrator's name, email, role and status
  - `R12.1.2` The system shall distinguish the platform super-administrator from normal platform administrators
  - `R12.1.3` Normal platform administrators shall have read-only access to platform administrator management information

- `R12.2` The system shall allow only the platform super-administrator to invite a platform administrator
  - `R12.2.1` The system shall require a valid target email address
  - `R12.2.2` The system shall allow optional first name and last name information to be supploed
  - `R12.2.3` The system shall create a setup invitation when the target email does not belong to an existing account
  - `R12.2.4` The system shall create an explicit upgrade confirmation invitation when the target is an eligible individual trainee
  - `R12.2.5` The system shall not change an existing trainee's role until the trainee accepts the upgrade
  - `R12.2.6` The system shall reject the invitation when the target is already a platform administrator
  - `R12.2.7` The system shall reject or require manual resolution when the target email belongs to an organisation administrator, organisation-linked account, or unresolved organisation representative
  - `R12.2.8` The system shall send a secure invitation or upgrade confirmation email
  - `R12.2.9` The system shal allow the super-administrator to resend an eligible pending invitation

- `R12.3` The system shall allow the invited user to accept or reject a platform administrator invitation or upgrade
  - `R12.3.1` A new user shall be able to complete account setup before receiving platform administrator access
  - `R12.3.2` An existing eligible user shall be shown the consequences of losing trainee access before confirming the upgrade
  - `R12.3.3` Rejection shall leave the existing user's role unchanged
  - `R12.3.4` Acceptance shall update the account role and revoke sessions carrying obsolete authority
  - `R12.3.5` The system shall send a confirmation notification after the role change

- `R12.4` The system shall allow the platform super-administrator to transfer the super-administrator role
  - `R12.4.1` The target shall be an active normal platform administrator
  - `R12.4.2` The system shall require the current super-administrator's password and typed confirmation
  - `R12.4.3` The system shall promote the selected administrator and demote the current super-administrator atomically
  - `R12.4.4` The system shall ensure thatexactly one active platform super-administrator exists after the transfer
  - `R12.4.5` The system shall prevent transfer when no eligible target administrator exists
  - `R12.4.6` The system shall update the current user's permissions immediately after transfer
  - `R12.4.7` The system shall notify both affected administrators of the transfer

- `R12.5` The system shall allow the platform super-administrator to demote or revoke a normal platform administrator
  - `R12.5.1` The system shall require password and typed confirmation for demotion or revocation
  - `R12.5.2` The system shall prevent the super-administrator from demoting themselves
  - `R12.5.3` The system shall prevent a normal platform administrator from performing the action
  - `R12.5.4` The system shall demote the target by returning their account status to what it was before they were invited or upgraded to be a platform administrator
  - `R12.5.5` The system shall revoke the target's active sessions
  - `R12.5.6` The system shall notify the target of the access change

- `R12.6` The system shall audit platform administrator invitations, upgrades, role transfers, demotions, revocations and failed attempts

## `R13` Configure Organisation Security Settings

> [!Note]
> The Functional Requirements in `R13` are related to **Use Case 11**, which can be found [here]() <!-- TODO insert appropriate link-->

- `R13.1` The system shall allow organisation administrators to view their organisation's security settings
  - `R13.1.1` The system shall restrict the settings to the authenticated administrator's organisation
  - `R13.1.2` Organisation administrators without the required edit permissions shall receive read-only access
  - `R13.1.3` The system shall identify the settings that are enforced by the organisation
  - `R13.1.4` The system shall explain that enforced setting apply to both organisation administrators and organisation trainees
- `R13.2` The system shall allow an authorised organisation administrator to configure the organisation's remember-me policy
  - `R13.2.1` The administrator shall be able to enable or disable organisation-wide enforcement of the remember-me policy
  - `R13.2.2` The administrator shall be able to allow or disallow remembered sessions when enforcement is enabled
  - `R13.2.3` The administrator shall be able to set the maximum remembered session length within platform limits

- `R13.3` The system shall allow an authorised organisation administrator to configure regular session length
  - `R13.3.1` The administrator shall be able to enable or disable organisation-wide enforcement of regular session length
  - `R13.3.2` The administrator shall be able ro select an allowed regular session length withn enforcement is enabled

- `R13.4` The system shall allow an authorised organisation administrator to configure idle-session timeout
  - `R13.4.1` The administrator shall be able to enable or disable organisation-wide enforcement of idle timeout
  - `R13.4.2` The administrator shall be able to select an allowed idle-timout value when enforcement is enabled

- `R13.5` The system shall allow an authorised organisation administrator to require re-authentication for sensitive actions

- `R13.6` The system shall allow an authorised organisation administrator to allow or prohibit organisation users from changing their own email addresses

- `R13.7` The system shall validate organisation security settings before saving them
  - `R13.7.1` The system shall reject values outside platform defined limits
  - `R13.7.2` The system shall reject conflicting combinations of settings
  - `R13.7.3` The system shall reject updates by an administrator who lacks the security settings permission
  - `R13.7.4` The system shall prevent updates against another organisation

- `R13.8` The system shall apply the effective organisation policy when creatong or refreshing sessions
  - `R13.8.1` Enforced organisation values shall override affected personal preferences
  - `R13.8.2` Personal preferences shall remain configurable wwhere organisation enforcement is disabled
  - `R13.8.3` The system shall indicate when a setting change applies only after a session is refreshed or recreated
  - `R13.8.4` Existing sessions shall not be represented as updated until the applicable policy has been enforced
- `R13.9` The system shall allow an administrator to discard unsaved setting changes and restore the last saved values

- `R13.10` The system shall audi organisation security setting changes
  - `R13.10.1` The audit record shall identify the actor, organisation, changed settings, previous values, new values, outcome and timestamp

## `R14` Manage Personal Account and Security Settings

> [!Note]
> The Functional Requirements in `R14` are related to **Use Case 12**, which can be found [here]() <!-- TODO insert appropriate link-->

- `R14.1` The system shall allow an authenciated user to view their account information
  - `R14.1.1` The system shall display the user's first name, last name and current email address
  - `R14.1.2` The system shall display the user's effective account and session settings
  - `R14.1.3` The system shall indicate which settings the user can edit
  - `R14.1.4` The system shall identify settings controlled by an organisation policy, if applicable

- `R14.2` The system shall allow an authenticated user to update their personal information
  - `R14.2.1` The user shall be able to update their first and last name
  - `R14.2.2` The system shall validate the name fields before saving
  - `R14.2.3` The system shall preserve the entered values and display an error when an update fails

- `R14.3` The system shall allow an eligible authenticated user to request an email address change
  - `R14.3.1` The user shall provide a new email address and matching confirmation field
  - `R14.3.2` The user shall provide their current password to confirm the sensitive action
  - `R14.3.3` The system shall reject an invalid, unchanged or already used email address
  - `R14.3.4` The system shall reject the request when an applicable organisation policy prohibits email changes
  - `R14.3.5` The system shall keep the current email address active until the new email address has been verified
  - `R14.3.6` The system shall send an email change verification link to the new email address
  - `R14.3.7` The system shall send a warning notification to the old email address
  - `R14.3.8` The system shall update the account email only after successful verification
  - `R14.3.9` The system shall reject final verification if the new email address becomes unavailable before verification completes
  - `R14.3.10` The system shall revoke existing sessions after the verified email change

- `R14.4` The system shall allow an authenticated user to change their password
  - `R14.4.1` The user shall provide their current password
  - `R14.4.2` The user shall provide a new password and matching password confirmation
  - `R14.4.3` The system shallvalidate the current password
  - `R14.4.4` The system shall validate the new password against the password policy
  - `R14.4.5` The system shall update the password only when all validation succeeds
  - `R14.4.6` The system shall revoke the user's existing sessions after the password change
  - `R14.4.7` The system shall send a password change notification email

- `R14.5` The system shall allow an authenticated user to view their active sessions
  - `R14.5.1` The system shall identify the current session
  - `R14.5.2` The system shall display tge available device or browser description for each session
  - `R14.5.3` The system shall display the session's last active time
  - `R14.5.4` The system shall display an approximate location where such information is available
  - `R14.5.5` The system shall safely display an unkown value when device or location information is unavailable

- `R14.6` The system shall allow an authenticated user to revoke an active session belonging to their account
  - `R14.6.1` The system shall prevent the user from revoking another user's session
  - `R14.6.2` The system shall require confirmation before revoking the current session
  - `R14.6.3` The system shall refresh the session list when a session has been revoked

- `R14.7` The system shall allow an authenticated user to revoke all other active sessions
  - `R14.7.1` The current session shall remain active
  - `R14.7.2` Revoked sessions shall be unable to obtain new access credentials

- `R14.8` The system shall allow an eligible user to manage personal session preferences
  - `R14.8.1` The user shall be able to select a preferred regular session length
  - `R14.8.2` The user shall be able to select a preferred remembered session length
  - `R14.8.3` The user shall be able to select a preferred idle timeout value
  - `R14.8.4` The system shall validate personal preferences against platform limits
  - `R14.8.5` The system shall disable a preference when an organisation policy overrides it.
  - `R14.8.6` The system shall display the enforced organisation value and explain why the personal control is unavailable
  - `R14.8.7` Personal perference changes shall apply to a new and refreshed sessions

- `R14.9` The system shall allow eligible individual trainees to request account deletion or deactiviation
  - `R14.9.1` The system shall require the user's current password
  - `R14.9.2` The system shall require explicit typed confirmation
  - `R14.9.3` The system shall prevent organisation administrators from deleting their account while they retain organisation administrator responsibilities
  - `R14.9.4` The system shall prevent an organisation user from selft-deleting when organisation policy prohibits it
  - `R14.9.5` The system shall preserve audit records when an account is deleted or deactivated
  - `R14.9.6` The system shall revoke all remaining sessions after account deletion or deactivation

- `R14.10` The system shall restrict every account and session operation to the authenticated user's own records

`R14.11` The system shall audit sensitive account, email, password, preference, session and deletion actions

---

The next section of the SRS is: [Use Cases](use-cases.md)
