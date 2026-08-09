# Asynchronous Email Delivery

This document explains how Insightful Phish handles transactional email delivery after the Demo 3 asynchronous email outbox work. It focuses on the implemented backend behaviour and the boundaries between request handling, persistence, dispatching, and SMTP transport.

## Contents

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

## 2. Responsibility Boundaries

| Area                                  | Responsibility                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Request handlers and feature services | Validate the request, perform the feature workflow, and ask the central email service to queue transactional email work.                   |
| Email service                         | Renders and validates the email, builds safe queue-submission results, and persists render-ready jobs through the repository boundary.     |
| Email-delivery repository             | Owns database writes, delivery logs, delivery jobs, claim and lease updates, retry scheduling, and terminal delivery-state persistence.    |
| Dispatcher                            | Recovers expired leases, claims due jobs, calls the configured provider adapter, applies retry rules, and records final delivery outcomes. |
| SMTP mailer                           | Performs SMTP transport only and converts provider failures into safe internal reason codes.                                               |

Controllers and feature services do not call SMTP directly.

## 3. Queue Acceptance and Provider Delivery

The immediate response only describes durable local queue acceptance.

| State                        | Meaning                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `queued: true`               | The rendered email job was stored locally and delivery will be attempted asynchronously.                   |
| `queued: false`              | The email could not be placed in the local queue, or rendering/validation failed before queue persistence. |
| `SENT` delivery log status   | The dispatcher later received provider acceptance from the SMTP boundary.                                  |
| `FAILED` delivery log status | The dispatcher reached a terminal failure and persisted a safe reason code.                                |

Immediate API responses and frontend messages therefore use wording such as "queued for delivery" or "delivery will be attempted shortly". They do not claim that the recipient has already received the email.

## 4. Outbox Persistence

The outbox stores a render-ready email job linked to an email delivery log. A queued job contains the recipient address, subject, text body, optional HTML body, email type, provider kind, attempt counters, lease fields, retry timing, and terminal outcome fields.

The delivery log remains the stable audit-style record for delivery status, related entities, provider message ID, final failure reason, and timestamps.

The job exists so the dispatcher can send the email without re-running request-context logic.

## 5. Dispatcher Lifecycle

The backend process starts the email dispatcher when the server starts, unless dispatcher configuration disables it.

Each dispatcher cycle:

1. Recovers expired processing leases.
2. Claims due `PENDING` or `RETRY_SCHEDULED` jobs.
3. Marks claimed jobs as `PROCESSING` with a lease owner and lease expiry.
4. Attempts SMTP delivery for each claimed job.
5. Records provider acceptance, schedules a retry, or persists a terminal failure.

The server shutdown path stops the dispatcher before closing the HTTP server.

## 6. Retry and Failure Rules

The dispatcher uses bounded retry behaviour:

| Outcome                        | Dispatcher behaviour                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Provider accepted              | Mark the delivery log as `SENT`, mark the job as `SUCCEEDED`, and do not retry.                                         |
| Definite retryable failure     | Schedule another attempt using the configured backoff sequence while the attempt limit and deadline allow it.           |
| Definite non-retryable failure | Mark the delivery log and job as failed.                                                                                |
| Ambiguous provider outcome     | Do not retry automatically, because provider acceptance is unclear. Persist a terminal failure with a safe reason code. |
| Expired lease                  | Return the job to retry scheduling so another cycle can claim it.                                                       |

The implemented backoff defaults are approximately 15, 30, and 60 seconds after the initial attempt, with a hard retry deadline from the first provider attempt.

## 7. Invitation and Delivery-State Transitions

Invitation state transitions that depend on provider delivery happen at the dispatcher/repository transaction boundary.

When the dispatcher records provider acceptance for an invitation email, the repository updates the delivery log and marks the related active invitation as `SENT` in the same transaction.

When the dispatcher records terminal provider failure for an invitation email, the repository updates the delivery log and marks the related active invitation as `FAILED_TO_SEND` in the same transaction.

The update uses the stored related entity values, action-token state, active invitation statuses, and invitation version guard where available. This prevents stale delivery work from overwriting a used, revoked, accepted, or concurrently changed invitation.

## 8. Mail Provider Boundary

MailPit remains the development SMTP capture tool.

The configured SMTP mailer remains the primary production transport boundary. Resend may be used through SMTP configuration, but a Resend API fallback is not implemented in this issue.

Provider-specific details stay inside the SMTP adapter and dispatcher. Feature services receive safe queue semantics rather than raw provider responses.

## 9. Safe Logging Rules

Structured logs may include:

- delivery job ID;
- delivery log ID;
- email type;
- provider kind;
- attempt number;
- duration;
- safe reason codes.

Structured logs must not include:

- recipient email addresses;
- rendered HTML or text bodies;
- raw tokens;
- token hashes;
- rendered action links;
- SMTP credentials;
- database connection strings;
- raw provider response bodies.

## 10. Testing and Operational Checks

The implemented tests cover:

- queue submission returning after local persistence;
- queue persistence failure returning a safe synchronous failure;
- request-path email submission not calling SMTP directly;
- dispatcher provider acceptance handling;
- retry scheduling with bounded backoff;
- terminal handling for max attempts and retry deadline;
- ambiguous provider outcomes not being retried automatically;
- expired lease recovery;
- atomic due-job claiming;
- invitation state transitions after terminal provider outcomes;
- safe dispatcher logging without recipient addresses, raw tokens, or rendered action links.

For local manual checks, MailPit can be used to inspect delivered development email after the dispatcher has processed queued jobs. A queued API response means delivery will be attempted; it is not proof that the message is already visible in MailPit.

## 11. Out of Scope

The following are intentionally not part of this Demo 3 implementation:

- Redis, RabbitMQ, Kafka, or a separate worker deployment.
- A general-purpose job framework.
- Inbound provider webhooks.
- User-facing delivery-status pages.
- Resend API fallback.
- Changes to branded email content.
- Logging or documenting raw tokens, credentials, recipient addresses, rendered links, or raw provider responses.
