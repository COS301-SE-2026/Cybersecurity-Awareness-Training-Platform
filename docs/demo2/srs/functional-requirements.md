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
  - `R3.2.5` The system shall allow a trainee to open a selected email.

-

---

The next section of the SRS is: [Use Cases](use-cases.md)
