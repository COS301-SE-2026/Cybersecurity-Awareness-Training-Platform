# Demo 1 Architecture and Technical Requirements

## Purpose

This document collects preliminary Demo 1 architecture, quality requirements, design patterns, technical requirements, constraints, and developer workflow safeguards. It provides a technical foundation for implementing UC-01, UC-02, and UC-03, keeping guidance clear, preliminary, and useful for implementation decisions.

## Architecture Scope (Rudolph)

### UC-01: View Emails in Simulated Inbox

The architecture supports retrieving and rendering a list of simulated emails assigned to the current user. It handles the display of phishing characteristics and tracks interaction events (e.g., email opened, simulated malicious link clicked) without integrating with real email infrastructure.

### UC-02: View Training Document

The system supports fetching structured training content associated with the user's active assignments. The architecture ensures that training content is delivered reliably, with tracking for when a user views or completes reading the material.

### UC-03: Complete Quiz Flow

The architecture manages the state of a quiz attempt, including presenting questions, capturing user responses, evaluating the submission against correct answers, and persistently storing the result and score for future reporting.

### Admin/Campaign Control Plane (Preliminary Context)

The Admin Control Plane is documented as a preliminary orchestration layer to support the platform's employee-facing activities. It outlines the conceptual management of configuration and targeting for simulations and training modules.

- **Campaign Orchestration**: Conceptual logic for managing campaign states (Draft, Active) to ensure content visibility for employees.
- **Content Resolution**: A mechanism to map campaign configurations to simulation templates (UC-01) and training documents (UC-02).
- **Assignment Mapping**: Conceptual mapping between campaigns and employee groups for targeted content delivery.
- **Preliminary Telemetry (Future Scope)**: Future capability for aggregating interaction events (opens, clicks) for reporting and analytics.

## Quality Requirements (Rudolph)

### Security

- **Authentication & Authorization**: API endpoints must verify user identity (e.g., JWT) before returning simulation or training data.
- **Safe Simulated Data**: Simulated phishing content must be purely internal. No actual emails or SMS messages will be sent or received in Demo 1.
- **Data Sanitization**: All user inputs, specifically quiz answers, must be validated and sanitized to prevent injection attacks.

### Reliability

- **Graceful Error Handling**: The frontend must handle API failures gracefully, displaying user-friendly error messages (e.g., if a training document fails to load).
- **Stateless API**: The Express backend should remain stateless, relying on the database for session and progress tracking to ensure consistent request handling.

### Maintainability

- **Monorepo Structure**: The project uses a monorepo approach (e.g., pnpm workspace) separating the frontend, backend, and shared code (types, validation schemas) to improve maintainability and code reuse.
- **Clear Separation of Concerns**: Keep business logic in the backend controllers/services and pure display logic in frontend React components.

### Modularity

- **Decoupled Simulation Types**: The architecture must treat "Email Simulation" as one specific type of simulation, allowing future additions (e.g., SMS, USB drops) to be implemented without rewriting core campaign tracking logic.
- **Reusable UI Components**: Frontend components (buttons, form fields, modal dialogs) should be highly reusable across the inbox, training, and quiz views.

### Scalability

- **Event-Based Tracking**: Interaction events (opens, clicks) should be stored in a unified, append-only structure that can easily scale as the number of users and campaigns grows.
- **Database Indexing**: Ensure appropriate indexing on user assignments and campaign IDs to maintain fast read times for the employee dashboard.

### Usability and Accessibility

- **Responsive Design**: The application must be fully usable on both desktop and mobile devices.
- **Accessibility (a11y)**: All interactive elements (inbox items, quiz forms) must support keyboard navigation and screen readers.
- **Clear Feedback**: Loading spinners and success/error toasts must be utilized to keep the user informed during asynchronous operations.

### Testability

- **Component Testing**: UI components for UC-01, UC-02, and UC-03 must be written as testable, pure functions where possible.
- **API Testing**: Backend routes for fetching content and submitting quizzes must be covered by automated integration tests.
- **Mocked Data**: The architecture should support dependency injection or easy mocking of the database layer for testing purposes.

## Architectural Approach (Rudolph)

### System Overview

The platform utilizes a standard 3-tier client-server architecture consisting of a React-based frontend SPA, a Node.js/Express backend REST API, and a relational database. This split ensures a clear boundary between presentation, business logic, and data persistence without over-engineering for Demo 1.

### Frontend Boundary

- **Stack**: React (potentially via Vite) for building the user interface.
- **Responsibilities**: Routing between the simulated inbox, training view, and quiz interface; managing local UI state; rendering data fetched from the API; handling user interactions.
- **Structure**: Housed in an `apps/frontend` directory within the monorepo.

### Backend API Boundary

- **Stack**: Node.js with Express.
- **Responsibilities**: Serving RESTful endpoints for the frontend; enforcing business rules (e.g., validating a quiz submission); managing authentication contexts; interacting with the database.
- **Structure**: Housed in an `apps/backend` directory.

### Database Boundary

- **Stack**: Relational Database (e.g., PostgreSQL) managed via Prisma ORM.
- **Responsibilities**: Persistent storage of users, campaigns, simulation content, training modules, and interaction telemetry.
- **Usage**: Prisma acts as the single source of truth for the data model, generating type-safe database clients for the backend.

### Shared Types and Constants

- **Stack**: TypeScript interfaces and Zod schemas (or similar validation library).
- **Responsibilities**: A shared package (e.g., `packages/shared`) contains data transfer objects (DTOs), API response types, and validation logic. This ensures the frontend and backend are strongly typed and perfectly aligned.

## Design Patterns and Simulation Modularity (Rudolph)

### Simulation Type Modularity

The core `Simulation` entity acts as a generic wrapper. Specific simulation details are stored in specialized tables or JSON structures. This prevents the core campaign logic from becoming bloated with type-specific fields.

### Email Simulation

For Demo 1, the primary simulation type is Email. The database stores the simulated sender, subject, body, and payload links. The frontend renders this exactly as an email client would, relying on the backend to serve the precise payload configuration.

### Future Simulation Types

The modular design guarantees that adding a "Smishing" (SMS) simulation in the future will only require adding a new specific UI component and database relation, without modifying the base campaign assignment engine.

### Training Module and Quiz Separation

Training content (reading material/videos) and Quizzes (assessments) are modeled as distinct but linkable entities. A user can complete the training module, which may optionally unlock or direct them to a related quiz.

### Interaction Event Tracking

A unified `InteractionEvent` pattern is used to track all user activity. Instead of updating a boolean flag on an assignment, the system logs discrete events (e.g., `type: 'LINK_CLICKED', timestamp: '...'`). This append-only pattern is crucial for future reporting and analytics.

### Progress Tracking

User progress through a campaign is derived by aggregating their `InteractionEvents` against the assigned simulations and training modules.

### Campaign-Simulation Linkage

Simulations and training modules are decoupled from campaigns through a linking entity. This allows the same simulation template or training document to be reused across multiple campaigns while maintaining independent tracking for each campaign instance.

## Technical Requirements and Constraints (Rudolph)

### Frontend Application

- Must be a Single Page Application (SPA) using React.
- State management should be kept simple, favoring localized state or a robust data-fetching library (like React Query) over heavy global state stores (like Redux) for Demo 1.

### Backend API

- Built with Express.js.
- Must follow RESTful principles, providing predictable endpoints (e.g., `GET /simulations/inbox`, `POST /quiz-attempts/:attemptId/submit`).
- Do not over-specify microservices; a modular monolith approach in Express is sufficient and expected for Demo 1.

### Database and Prisma Usage

- Relational database structure defined via Prisma schema.
- Migrations must be handled systematically using Prisma's migration tooling.

### Authentication and Base Features

- Base features like login/registration are foundational and must be integrated as middleware on the backend and context providers on the frontend.

### Automated Testing

- Setup foundational unit tests using Jest/Vitest.
- Define a testing strategy for UC-01, UC-02, and UC-03 UI components to ensure forms and interactions work as expected.

### Safe Simulated Data

- **Constraint**: Under no circumstances should the system attempt to connect to an external SMTP server or send real emails during Demo 1 execution. All simulated phishing occurs purely within the internal React UI.

### Data Privacy

- **Constraint**: Only capture necessary interaction events. Ensure that any future analytics queries cannot expose sensitive user identification beyond their designated administrative groups.

### Sprint 1 Constraints

- Focus entirely on the employee portal (the target of the simulated phishing and training).
- Hardcode or seed campaign data in the database rather than building the Admin UI to manage it.
- Keep the design strictly bounded to Demo 1 requirements without premature optimization for long-term production deployment environments.

## QA and Testing Expectations

- **Reviewable Code**: All new endpoints and UI components must include unit or integration tests that validate happy paths and at least one failure mode (e.g., invalid quiz submission).
- **Test Scenarios**: QA must verify that viewing an email (UC-01) generates a database event, viewing training (UC-02) updates progress, and submitting a quiz (UC-03) records a score.

## Cross-References

### SRS

See `SRS.md` for full Demo 1 requirements and use cases.

### API

See `API.md` for specific endpoint contracts and payload shapes.

### Testing

See `testing.md` for QA strategies and test plans.

### Traceability

See `traceability.md` for tracking requirements to test cases.
