# Demo 1 Preliminary API Contracts

## Purpose

This document collects preliminary API contracts for Sprint 1 Demo 1. Contracts should support frontend, backend, SRS, domain, and testing alignment without becoming final production specifications.

## API Contract Principles (Rudolph)

### Preliminary Contract Baseline

### Request Summary Format

### Response Summary Format

### Common Error Responses

### Domain Entity References

### Requirement and Traceability References

## Base Feature Contracts (Rudolph)

### `POST /auth/register`

### `POST /auth/login`

### General Validation and Error Responses

## UC-01: Simulated Inbox Contracts (Rudolph)

### `GET /simulations/inbox`

### `GET /simulations/emails/:emailId`

### `POST /simulations/emails/:emailId/interactions`

## UC-02: Training Document Contracts (Rudolph)

### `GET /training/assigned`

### `GET /training/:trainingId`

### `POST /training/:trainingId/progress`

## UC-03: Quiz Flow Contracts (Rudolph)

### `GET /quizzes/:quizId`

### `POST /quizzes/:quizId/attempts`

### `POST /quiz-attempts/:attemptId/submit`

### `GET /quiz-attempts/:attemptId/results`

## Supporting Admin/Campaign Context (Rudolph)

### `POST /campaigns`

### `POST /campaigns/:campaignId/assign`

## Cross-References

### SRS

### Domain Diagrams

### Testing

### Traceability
