# Demo 1 Architecture and Technical Requirements

## Purpose

This document collects preliminary Demo 1 architecture, quality requirements, design patterns, technical requirements, constraints, and developer workflow safeguards.

## Architecture Scope (Rudolph)

### UC-01: View Emails in Simulated Inbox

### UC-02: View Training Document

### UC-03: Complete Quiz Flow

### Admin/Campaign Control Plane

The Admin Control Plane serves as the orchestration layer for the platform's security awareness activities. It manages the configuration, scheduling, and targeting of simulations and training modules.

- **Campaign Orchestrator**: Logic for transitioning campaigns through their lifecycle (Draft -> Active -> Completed) and enforcing state-based visibility rules for employees.
- **Content Resolver**: A service that maps high-level campaign configurations to specific simulation templates (UC-01) and training documents (UC-02).
- **Assignment Engine**: Manages the relationships between campaigns and employee cohorts, ensuring that content delivery is correctly targeted based on organizational groups.
- **Telemetry Aggregator**: Collects interaction events (opens, clicks, quiz results) from the employee-facing apps and associates them with the correct campaign/user context for future reporting.

## Quality Requirements (Rudolph)

### Security

### Reliability

### Maintainability

### Modularity

### Scalability

### Usability and Accessibility

### Testability

## Architectural Approach (Rudolph)

### System Overview

### Frontend Boundary

### Backend API Boundary

### Database Boundary

### Shared Types and Constants

## Design Patterns and Simulation Modularity (Rudolph)

### Simulation Type Modularity

### Email Simulation

### Future Simulation Types

### Training Module and Quiz Separation

### Interaction Event Tracking

### Progress Tracking

### Campaign-Simulation Linkage

Simulations and training modules are decoupled from campaigns through a linking entity. This allows the same simulation template or training document to be reused across multiple campaigns while maintaining independent tracking for each campaign instance.

## Technical Requirements and Constraints (Rudolph)

### Frontend Application

### Backend API

### Database and Prisma Usage

### Authentication and Base Features

### Automated Testing

### Safe Simulated Data

### Data Privacy

### Sprint 1 Constraints

## Cross-References

### SRS

### API

### Testing

### Traceability
