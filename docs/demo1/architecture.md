# Demo 1 Architecture

## Purpose

This document describes the architectural structure, quality concerns, and design decisions for Demo 1 of the Cybersecurity Awareness Training Platform. It focuses on the system's components, their responsibilities, and how they interact to support the core training use cases. It provides a technology-neutral foundation for implementing UC-01, UC-02, and UC-03.

## Architecture Scope

The architecture is designed to support the following core use cases for Demo 1:

- **UC-01: View Emails in Simulated Inbox**: Managing the presentation and tracking of simulated phishing content within a controlled environment.
- **UC-02: View Training Document**: Delivering structured educational content and tracking trainee engagement.
- **UC-03: Complete Quiz Flow**: Managing assessment logic, capturing responses, scoring, and providing educational feedback.

Architecture guidance in this document is preliminary and scoped to Demo 1 implementation. It should be read alongside [SRS.md](./SRS.md), [API.md](./API.md), and [traceability.md](./traceability.md).

### Organisation Admin/Campaign Control Plane (Preliminary Context)

The Admin Control Plane is a preliminary, mostly future-facing orchestration layer that supports trainee-facing activities. It outlines the conceptual management of configurations for simulations and training modules without requiring full admin campaign management for Demo 1.

- **Campaign Orchestration**: Logic for managing campaign states (e.g., Draft, Active) to ensure content visibility.
- **Content Resolution**: A mechanism to map campaign configurations to simulation templates and training documents.
- **Assignment Mapping**: Mapping between campaigns and trainee groups for targeted content delivery.

For Demo 1, campaigns act as the assignment and ordering container for trainee activities. Campaigns contain ordered campaign components/items, limited to simulated inbox, training document, and quiz components. Current implementation references may use `CampaignItem` to represent the conceptual campaign component placement. Later demos may extend the same modular model with richer simulations, fake login pages, simulated calls, smart password checker activities, and other cybersecurity awareness components.

## Quality Requirements

### Security

- **Identity Verification**: The system must verify account identity before allowing access to simulation or training data.
- **Simulation Boundaries**: All simulated phishing content must remain strictly internal. No communication with real external mail or messaging systems is permitted.
- **Data Integrity**: All user-provided data, particularly quiz answers, must be validated and sanitized to prevent injection or manipulation.

### Reliability

- **Resilience**: The client interface must handle application failures gracefully, displaying trainee-friendly error messages.
- **Stateless Logic**: The application logic should remain stateless where possible, relying on the data tier for persistent state and progress tracking.

### Maintainability

- **Logical Separation**: Business logic must be kept distinct from display logic and data storage mechanisms.
- **Shared Contracts**: Common data structures and validation rules should be shared across the system to ensure consistency and ease of updates.

### Modularity

- **Extensible Content Types**: The architecture treats specific simulation types (e.g., Email) as modular additions, allowing future formats to be added without modifying core campaign logic.
- **Reusable UI Patterns**: Presentation components should be designed for reuse across different learning contexts.

### Scalability

- **Event-Based Tracking**: Interaction events (opens, clicks) are stored in a unified, append-only structure to support growth in users and activity.
- **Data Optimization**: Persistence structures should be optimized to maintain fast read times for trainee dashboards and assignments.

## Architectural Approach

The platform utilizes a **3-tier client-server architecture**. This structure provides a clear separation between presentation, logic, and data storage.

### 1. Client Tier

- **Description**: The trainee-facing interface responsible for presenting information and capturing interactions.
- **Responsibilities**:
  - Rendering the simulated inbox, training document views, and quiz interfaces.
  - Managing client-side navigation and local UI state.
  - Communicating with the Application Tier via structured requests.
  - Displaying feedback (loading, success, error) to the trainee.

### 2. Application/API Tier

- **Description**: The server-side component that coordinates use-case logic and serves as the boundary for request handling.
- **Internal Layered Structure**:
  - **Controller/API Layer**: Receives requests, validates inputs, and shapes responses.
  - **Service/Domain Layer**: Coordinates business rules and use-case logic (e.g., scoring a quiz, validating assignment access).
  - **Data-Access Layer**: Isolates persistence operations, providing a clean interface for reading from and writing to the Data Tier.

### 3. Data Tier

- **Description**: The persistence layer responsible for storing system state and content.
- **Responsibilities**:
  - Storing user accounts, campaign assignments, and educational content.
  - Persisting interaction events, quiz attempts, and progress records.
  - Ensuring data integrity and relationship consistency.

## Architecture Justification

The 3-tier client-server architecture is selected for Demo 1 for the following reasons:

- **Scope Alignment**: It provides a robust yet simple structure suitable for the three core use cases without the complexity of distributed architecture styles.
- **Repository Structure**: The project organization (separate applications for the client and server) directly aligns with this tiered approach.
- **Maintainability**: The internal layering of the Application Tier ensures that business logic is isolated from both transport-level concerns and storage-specific details.
- **Simulation Safety**: A centralized Application Tier allows for strict enforcement of simulation boundaries and interaction tracking.

## Architectural Principles

### Modular Simulation Handling

The system handles diverse simulation formats by delegating type-specific logic to modular components. This ensures the core interaction logic remains decoupled from the details of any single simulation type, supporting the future addition of new simulation formats.

### Reusable Content Configuration

Simulation and training content are managed through reusable configurations. Generic content structures are mapped to specific trainee assignments, allowing for dynamic delivery while maintaining consistency across the platform.

### Isolation of Persistence Concerns

Business logic is isolated from specific storage implementations. This decoupling ensures that the application's core logic remains independent of the underlying persistence mechanism, improving system flexibility and testability.

### Contract Consistency

A centralized set of data definitions ensures that the Client and Application Tiers stay aligned on request and response formats. This prevents drift between system components and ensures reliable communication across the tier boundary.

### Immutable Interaction Auditing

A unified pattern is used to track trainee activity. Instead of simple status flags, the system records discrete interaction events to create an accurate and immutable audit trail for learning progress and future reporting.

## System Constraints and Standards

### Client Application Standards

- The Client Tier must provide a continuous, unified flow for the trainee across inbox, training, and quiz screens.
- Interaction with the Application Tier must follow a standardized communication protocol to maintain a responsive user experience.
- Must consume data using shared definitions to ensure consistency with the Application Tier.

### Application API Standards

- Must expose a consistent, resource-oriented boundary for the client.
- All requests targeting trainee-specific data must be protected by an identity verification mechanism.
- Input validation must be applied before any data persistence or logic execution.

### Data Persistence Standards

- All storage access must go through the defined Data-Access Layer.
- Seed data must be provided to populate the environment for the three core use cases.
- Sensitive information, such as passwords, must be securely hashed before storage.

### Simulation Safety Standards

- Simulated interactions must never leave the platform's controlled environment.
- All simulated links must route back to internal feedback handlers.
- No actual credentials or sensitive personal data may be captured or stored during simulations.
- Real email delivery to actual inboxes is future scope only. If introduced later, it must be opt-in, ethically constrained, and reviewed against organisation context.
- AI-assisted generation is future scope only. If introduced later, generated quizzes, simulated emails, and training transformations should use controlled schemas, prepared context, and review workflows rather than unrestricted model output.

## Cross-References

### SRS

See [SRS.md](./SRS.md) for full Demo 1 requirements and use cases.

### API

See [API.md](./API.md) for specific communication contracts and payload shapes.

### Testing

See [testing.md](./testing.md) for QA strategies and verification plans.

### Traceability

See [traceability.md](./traceability.md) for tracking requirements through the architecture.
