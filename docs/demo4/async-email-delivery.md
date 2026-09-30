# Asynchronous Email Delivery

This document explains how Insightful Phish handles transactional and phishing simulation email delivery in Demo 4. It focuses on the implemented backend behaviour and the boundaries between request handling, simulation scheduling, persistence, dispatching, and SMTP transport.

## Contents

- [Asynchronous Email Delivery](#asynchronous-email-delivery)
  - [Contents](#contents)
  - [1. Purpose](#1-purpose)
  - [2. Responsibility Boundaries](#2-responsibility-boundaries)
  - [3. Queue Acceptance and Provider Delivery](#3-queue-acceptance-and-provider-delivery)
  - [4. Outbox Persistence](#4-outbox-persistence)
  - [5. Dispatcher Lifecycle](#5-dispatcher-lifecycle)
  - [6. Retry and Failure Rules](#6-retry-and-failure-rules)
  - [7. Invitation and Delivery-State Transitions](#7-invitation-and-delivery-state-transitions)
  - [8. Mail Provider Boundary](#8-mail-provider-boundary)
  - [9. Safe Logging Rules](#9-safe-logging-rules)
  - [10. Testing and Operational Checks](#10-testing-and-operational-checks)
  - [11. Out of Scope](#11-out-of-scope)

## 1. Purpose

Transactional email submission no longer waits for SMTP delivery in the request path. Instead, feature services render the email, store a render-ready delivery job in the local database outbox, and return once the local queue accepts the job.

This keeps user-facing requests responsive while still recording the final provider outcome later through the dispatcher.

The phishing simulation worker starts scheduled simulations, plans due messages, and places eligible messages in the same database outbox. The dispatcher performs the final eligibility and delivery checks before the SMTP handoff.

## 2. Responsibility Boundaries

| Area                                  | Responsibility                                                                                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Request handlers and feature services | Validate the request, perform the feature workflow, and ask the central email service to queue transactional email work.                                                     |
| Email service                         | Renders and validates email, builds safe queue-submission results, and persists render-ready jobs through the repository boundary.                                           |
| Phishing simulation worker            | Starts scheduled simulations, plans messages, respects configured delivery windows, and queues due messages through the email service.                                       |
| Email-delivery repository             | Owns database writes, delivery logs, delivery jobs, claim and lease updates, retry scheduling, and terminal delivery-state persistence.                                      |
| Dispatcher                            | Recovers expired leases, claims due jobs, rechecks simulation eligibility, resolves the selected provider profile, applies retry rules, and records final delivery outcomes. |
| Email provider profile service        | Resolves the platform or organisation SMTP profile and retrieves organisation credentials from Infisical.                                                                    |
| SMTP mailer                           | Uses the selected transport and sender configuration, performs SMTP transport, and converts provider failures into safe internal reason codes.                               |

Controllers, feature services, and the phishing simulation worker do not call SMTP directly.

When delivery is required for a business operation, the feature service queues the render-ready email job inside the same database transaction as the token, invitation, or account-state change. If the local queue cannot persist the job, the related business change is rolled back instead of leaving a usable token or invitation without a durable delivery job.

For simulation messages, the worker stores the message and outbox state together. The dispatcher rechecks the simulation, Campaign, recipient, send window, and delivery claim before using the selected provider profile.

## 3. Queue Acceptance and Provider Delivery

For transactional requests, the immediate response only describes durable local queue acceptance.

| State                        | Meaning                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `queued: true`               | The rendered email job was stored locally and delivery will be attempted asynchronously.                   |
| `queued: false`              | The email could not be placed in the local queue, or rendering/validation failed before queue persistence. |
| `SENT` delivery log status   | The dispatcher later received provider acceptance from the SMTP boundary.                                  |
| `FAILED` delivery log status | The dispatcher reached a terminal failure and persisted a safe reason code.                                |

Immediate API responses and frontend messages therefore use wording such as "queued for delivery" or "delivery will be attempted shortly". They do not claim that the recipient has already received the email.

Simulation delivery status is stored on the planned message and linked delivery log instead of being returned as an immediate request result.

## 4. Outbox Persistence

The outbox stores a render-ready email job linked to an email delivery log. A queued job contains the recipient address, subject, text body, optional HTML body, email type, provider kind, attempt counters, lease fields, retry timing, and terminal outcome fields.

The delivery log remains the stable audit-style record for delivery status, related entities, provider message ID, final failure reason, and timestamps.

A simulation message records its planned send time, selected provider profile, dispatch status, and linked delivery log.

The job exists so the dispatcher can send the email without re-running request-context logic.

## 5. Dispatcher Lifecycle

The backend process starts the email dispatcher and phishing simulation worker when the server starts. Dispatcher configuration may disable the email dispatcher.

The simulation worker starts due simulations, plans their recipients and messages, and queues messages during the configured weekdays and delivery windows.

Each dispatcher cycle:

1. Recovers expired processing leases.
2. Reconciles missing Campaign email jobs.
3. Claims due `PENDING` or `RETRY_SCHEDULED` jobs and marks them as `PROCESSING` with a lease owner and lease expiry.
4. Revalidates reminder and simulation delivery state.
5. Resolves the selected simulation SMTP profile.
6. Attempts SMTP delivery for each eligible claimed job.
7. Records provider acceptance, schedules a retry, or persists a terminal failure.

The server shutdown path stops the dispatcher and phishing simulation worker before closing the HTTP server.

## 6. Retry and Failure Rules

The dispatcher uses bounded retry behaviour:

| Outcome                        | Dispatcher behaviour                                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Provider accepted              | Mark the delivery log as `SENT`, mark the job as `SUCCEEDED`, and do not retry.                                                         |
| Definite retryable failure     | Schedule another attempt using the configured backoff sequence while the attempt limit and deadline allow it.                           |
| Definite non-retryable failure | Mark the delivery log and job as failed.                                                                                                |
| Ambiguous provider outcome     | Do not retry automatically, because provider acceptance is unclear. Persist a terminal failure with a safe reason code.                 |
| Expired lease                  | Queue a safe pre-handoff claim again. Treat a claim with an uncertain provider handoff as ambiguous and do not resend it automatically. |

The implemented backoff defaults are approximately 15, 30, and 60 seconds after the initial attempt, with a hard retry deadline from the first provider attempt.

Simulation retries must remain within the active Campaign, simulation end time, recipient eligibility, allowed weekdays, and delivery window.

## 7. Invitation and Delivery-State Transitions

Invitation state transitions that depend on provider delivery happen at the dispatcher/repository transaction boundary.

When the dispatcher records provider acceptance for an invitation email, the repository updates the delivery log and marks the related active invitation as `SENT` in the same transaction.

When the dispatcher records terminal provider failure for an invitation email, the repository updates the delivery log and marks the related active invitation as `FAILED_TO_SEND` in the same transaction.

The update uses the stored related entity values, action-token state, active invitation statuses, and invitation version guard where available. This prevents stale delivery work from overwriting a used, revoked, accepted, or concurrently changed invitation.

## 8. Mail Provider Boundary

MailPit remains the development SMTP capture tool.

The platform SMTP configuration is the default transport. A phishing simulation may instead use an active organisation SMTP profile. Profile metadata is stored in PostgreSQL, while the organisation credential is read from Infisical at dispatch time.

Production startup validates the platform SMTP settings before the backend starts. Infisical settings are validated when an organisation profile credential is accessed. Organisation profiles validate their SMTP host, port, security, username, sender, and credential values before use. MailPit remains development-only.

Provider-specific details stay inside the SMTP adapter and dispatcher. Feature services receive safe queue semantics rather than raw provider responses.

## 9. Safe Logging Rules

Structured logs may include:

- Delivery job ID.
- Delivery log ID.
- Simulation ID.
- Simulation message ID.
- Email type.
- Provider kind.
- Provider profile ID.
- Attempt number.
- Duration.
- Safe reason codes.

Structured logs must not include:

- Recipient email addresses.
- Rendered HTML or text bodies.
- Raw tokens.
- Token hashes.
- Rendered action links.
- SMTP credentials.
- Database connection strings.
- Raw provider response bodies.

## 10. Testing and Operational Checks

The implemented tests cover:

- Queue submission returning after local persistence.
- Queue persistence failure returning a safe synchronous failure.
- Request-path email submission not calling SMTP directly.
- Dispatcher provider acceptance handling.
- Retry scheduling with bounded backoff.
- Terminal handling for max attempts and retry deadline.
- Ambiguous provider outcomes not being retried automatically.
- Expired lease recovery.
- Atomic due-job claiming.
- Invitation state transitions after terminal provider outcomes.
- Scheduled simulation start and delivery-window planning.
- Recipient and Campaign eligibility checks before SMTP handoff.
- Platform and organisation SMTP profile resolution.
- Stop and unassignment handling during active delivery.
- Simulation delivery reconciliation after accepted or ambiguous provider outcomes.
- Safe dispatcher logging without recipient addresses, raw tokens, or rendered action links.

For local manual checks, MailPit can be used to inspect delivered development email after the dispatcher has processed queued jobs. A queued API response means delivery will be attempted. It is not proof that the message is already visible in MailPit.

## 11. Out of Scope

The following are intentionally not part of this Demo 4 implementation:

- Redis, RabbitMQ, Kafka, or a separate worker deployment.
- A general-purpose job framework.
- Inbound provider webhooks.
- A user-facing transactional email delivery-status page.
- Resend API fallback.
- Changes to existing branded transactional email content.
- Logging or documenting raw tokens, credentials, recipient addresses, rendered links, or raw provider responses.
