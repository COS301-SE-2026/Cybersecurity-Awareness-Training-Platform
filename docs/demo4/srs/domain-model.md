# Domain Model

The Demo 4 domain model describes business concepts and relationships rather than duplicating the physical Prisma schema.

## SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- [2. Users and User Stories](users-and-user-stories.md)
- [3. Functional Requirements](functional-requirements.md)
- [4. Use Cases](use-cases.md)
- [5. Quality Requirements](quality-requirements.md)
- **[6. Domain Model](#6-domain-model)** &larr; _You are here_
  - [6.1 Purpose and Context](#61-purpose-and-context)
  - [6.2 Domain Diagram](#62-domain-diagram)
  - [6.3 Identity, Organisation, and Access](#63-identity-organisation-and-access)
  - [6.4 Reusable Content](#64-reusable-content)
  - [6.5 Campaign Composition](#65-campaign-composition)
  - [6.6 Quiz Participation](#66-quiz-participation)
  - [6.7 Adaptive Learning](#67-adaptive-learning)
  - [6.8 Activity, Statistics, and Audit](#68-activity-statistics-and-audit)
  - [6.9 Key Relationships and Boundaries](#69-key-relationships-and-boundaries)
  - [6.10 Lifecycle Summary](#610-lifecycle-summary)
  - [6.11 Diagram Legend and Model Limits](#611-diagram-legend-and-model-limits)
- [7. Changelog](changelog.md)

---

## 6. Domain Model

### 6.1 Purpose and Context

The domain model provides a common requirement-level vocabulary for the SRS, use cases, architecture, and manuals. It explains ownership, lifecycle, composition, assignment, participation, and adaptive resolution without treating every implementation table as a separate business concept.

Demo 4 replaces the obsolete planned inheritance and tag concepts with the implemented profile, membership, reusable-content, Campaign graph, and assignment relationships. The model distinguishes authoring-time objects from trainee runtime records and transient AI output from persisted product entities.

### 6.2 Domain Diagram

The repository-rendered Mermaid source is available in the [Demo 4 Domain Model Diagram](../diagrams/srs/domain-model.md).

The diagram shows the main cardinalities and lifecycle-owned children for identity, reusable content, Campaign composition, Quiz participation, simulated interactions, and adaptive resolution. The tables below provide the detail and constraints that cannot be conveyed safely by one diagram.

### 6.3 Identity, Organisation, and Access

| Concept                            | Responsibility                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| User                               | Common authenticated identity, account status, verified email, and platform user type.                                |
| Trainee Profile                    | Training identity associated with a User and used for Campaign assignments, attempts, and evidence.                   |
| Organisation                       | Tenant boundary for organisation users, content, Campaigns, assignments, settings, and audit records.                 |
| Organisation Trainee Profile       | Active or disabled membership joining a Trainee Profile to one Organisation.                                          |
| Organisation Administrator Profile | Organisation-linked administrator identity whose authority comes from explicit Organisation Permissions.              |
| Platform Administrator Profile     | Platform-level administrator identity, including the supported super-administrator distinction.                       |
| Organisation Registration Request  | Reviewable request that may create an Organisation and initial-administrator setup flow.                              |
| Invitation and Action Token        | Scoped, time-limited, single-use authority for verification, setup, recovery, invitation, and supported role changes. |
| Authentication Session             | Authenticated device/browser session with expiry, activity, revocation, and renewable credential state.               |
| Organisation Permission            | Named organisation-administrator capability granted and revoked with accountable actor and timing context.            |
| Organisation Security Settings     | Organisation-level limits for supported session and sensitive-account behaviour.                                      |

User roles are represented by associated profiles and membership records. The model does not require an obsolete inheritance hierarchy between general, organisation, and administrator users.

An `OrganisationRegistrationRequest` precedes an approved Organisation and its initial-administrator setup. Invitations and action tokens confer only the bounded authority represented by their purpose and current state. User security preferences operate within platform and organisation policy.

### 6.4 Reusable Content

| Concept            | Ownership and lifecycle                                                                                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Training Document  | Platform- or organisation-owned Markdown training content with categories and `EASY`, `MEDIUM`, or `HARD` difficulty. The authoring lifecycle uses `DRAFT`, `AVAILABLE`, `UNAVAILABLE`, and `ARCHIVED` where supported. |
| Quiz               | Platform- or organisation-owned assessment with `DRAFT`, `PUBLISHED`, and `ARCHIVED` states.                                                                                                                            |
| Quiz Question      | Ordered `SINGLE_CHOICE` or `MULTIPLE_CHOICE` question with category metadata and answer-selection rules.                                                                                                                |
| Quiz Answer Option | Ordered answer text, positional label, correctness, and feedback belonging to a question.                                                                                                                               |
| Organisation Email | Organisation-owned reusable simulated message with `DRAFT` or `ACTIVE` status, classification, categories, and difficulty.                                                                                              |
| Simulation         | Organisation- or platform-scoped simulation container. A Simulated Inbox Campaign reference requires `APPROVED` safety state.                                                                                           |
| Simulated Inbox    | Controlled collection of ordered simulated emails. Campaign eligibility requires an `ACTIVE` inbox under an approved Simulation.                                                                                        |
| Simulated Email    | Snapshot or authored message in a Simulated Inbox, optionally sourced from an Organisation Email.                                                                                                                       |
| Email Red Flag     | Educational warning sign attached to reusable or snapshotted simulated message content.                                                                                                                                 |

Lifecycle state makes reusable content eligible or ineligible for Campaign selection. A Draft is editable; an eligible activated or published resource is referenced by ID from Campaign items. Editing immutable active content uses the supported copy-to-Draft workflow rather than changing published history.

Organisation Email activation does not make the email itself a Campaign component. A Campaign-eligible Simulated Inbox still requires the approved parent Simulation and active inbox state. Snapshot relationships preserve delivered training content when a reusable library entry later changes.

### 6.5 Campaign Composition

| Concept               | Responsibility                                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campaign              | Platform `PREMADE_GENERAL` or organisation `ORGANISATION_CUSTOM` training container. The implemented management lifecycle is `DRAFT`, `ACTIVE`, and `ARCHIVED`. |
| Campaign Item         | Ordered occurrence in a Campaign with required state and one of the canonical item forms below.                                                                 |
| Campaign Prerequisite | Requires completion of another Campaign before the dependent Campaign becomes available.                                                                        |
| Campaign Assignment   | Joins one Campaign to one Trainee Profile through direct assignment or self-selection and tracks current availability and progress.                             |
| Adaptive Alternative  | One difficulty-specific eligible content reference owned by an adaptive Campaign Item.                                                                          |

The canonical Campaign graph is:

| Item form   | Structure                                                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `COMPONENT` | References exactly one eligible `TRAINING_DOCUMENT`, `QUIZ`, or `SIMULATED_INBOX`. A Quiz occurrence also carries `maxAttempts` and `BEST`, `LATEST`, or `AVERAGE` score policy supported by the Campaign contract. |
| `ADAPTIVE`  | Fixes one component type and contains exactly one `EASY`, one `MEDIUM`, and one `HARD` alternative with the same required non-empty category set. Quiz adaptive occurrences carry the same occurrence settings.     |
| `GROUP`     | Contains at least two direct `COMPONENT` or `ADAPTIVE` children, a group type, completion rule, ordering, and required state. A group cannot contain another group.                                                 |

An Active Campaign can be copied into a fresh Draft. The copy receives new Campaign, Campaign Item, group, and adaptive-alternative identities while preserving eligible references and configuration. Assignment, attempt, progress, evidence, and adaptive-resolution history are not copied.

The `parentGroupId` relationship represents direct group membership. Because a group child may only be `COMPONENT` or `ADAPTIVE`, the graph cannot recursively contain another group. Item identity represents one occurrence: changing an adaptive alternative set creates replacement occurrence identity, while supported setting-only edits can retain identity.

### 6.6 Quiz Participation

| Concept        | Responsibility                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Quiz Attempt   | One `IN_PROGRESS` or `SUBMITTED` trainee attempt scoped to a Quiz, Campaign Assignment, and Campaign Item occurrence.   |
| Attempt Answer | The option IDs selected for one question in one attempt.                                                                |
| Quiz Result    | Score, pass state, summary, and permitted post-submission feedback for a submitted attempt.                             |
| Answer Option  | A logical Quiz choice whose positional label is derived from visible order and whose text contains the complete answer. |

Starting a Quiz reuses an existing in-progress attempt. A submitted attempt remains historical, and a new attempt may be created only while the occurrence limit allows it. The occurrence score is derived according to its supported `BEST`, `LATEST`, or `AVERAGE` policy.

`SINGLE_CHOICE` questions require exactly one correct option and accept one submitted selection. `MULTIPLE_CHOICE` questions retain their configured valid selection bounds and can accept multiple options. Correctness and protected feedback remain absent from the safe trainee Quiz payload before submission.

### 6.7 Adaptive Learning

| Concept                      | Responsibility                                                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Category Evidence            | Category-specific Quiz performance and Simulated Inbox classification and link behaviour associated with the trainee. Missing evidence is not treated as zero.                    |
| Category State               | Deterministic backend result containing evidence sufficiency and selected `EASY`, `MEDIUM`, or `HARD` difficulty.                                                                 |
| Adaptive Campaign Resolution | Immutable selection for one Campaign Assignment and one adaptive Campaign Item, including selected alternative, content, difficulty, evidence status, basis, and resolution time. |

The backend computes category state and resolves an alternative. A unique assignment-item relationship makes concurrent first resolution converge on one persisted result. Later reads reuse that result instead of asking AI or recalculating a different item.

Accepted evidence consists of category-specific Quiz performance and Simulated Inbox classification/link behaviour. Evidence from adaptive items is associated through the persisted selected content for the same assignment and item. Missing evidence is not treated as failure, and repeated link events do not inflate occurrence counts.

### 6.8 Activity, Statistics, and Audit

- Quiz attempts and results retain assessment activity in Campaign context.
- Email classification and controlled interaction events retain Simulated Inbox evidence in Campaign context.
- Campaign statistics aggregate the implemented scoped assignment, progress, interaction, and Quiz measures without creating a separate report-export domain.
- Audit records retain truthful actor, target, scope, outcome, timestamp, and redacted metadata for supported sensitive actions.
- Lifecycle timelines expose the supported persisted organisation registration and setup events in defined order.
- Email delivery jobs/logs retain bounded delivery state for account and lifecycle notifications without becoming a real-email Campaign domain.

### 6.9 Key Relationships and Boundaries

- An Organisation owns organisation content and custom Campaigns; platform content and premade Campaigns have no Organisation owner.
- An organisation Campaign may reference eligible platform content or content owned by the same Organisation. Platform Campaigns reference platform-owned content.
- A Campaign Assignment belongs to one Campaign and one Trainee Profile and is unique for that pair.
- Campaign Items reference reusable content; they do not embed full Training Document, Quiz, or Simulation bodies.
- AI-generated Draft data and Campaign proposals are transient application data until an administrator explicitly saves through the normal lifecycle. They are not separate persisted Campaign or reusable-content entities.
- A Quiz Attempt may reference a Campaign Assignment and Campaign Item so attempt limits and effective scoring remain occurrence-scoped.
- An Adaptive Campaign Resolution is unique for one Campaign Assignment and Campaign Item and points to the selected alternative/content.
- Classification responses and interaction events belong to the same assignment/item context used by evidence collection.
- Organisation context used for AI is backend-approved context; it is not a browser-supplied organisation-context editor domain.

### 6.10 Lifecycle Summary

| Aggregate                    | Editable state        | Campaign-eligible state                                  | Historical-change approach                                          |
| ---------------------------- | --------------------- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| Training Document            | `DRAFT`               | `AVAILABLE`                                              | Copy or supported Draft workflow; archive/restore where implemented |
| Quiz                         | `DRAFT`               | `PUBLISHED`                                              | Copy to a fresh Draft rather than rewriting published children      |
| Organisation Email           | `DRAFT`               | Not directly Campaign-eligible; `ACTIVE` for library use | Copy to a fresh Draft                                               |
| Simulation / Simulated Inbox | Draft/authoring state | Parent `APPROVED` and inbox `ACTIVE`                     | Supported copy lifecycle                                            |
| Campaign                     | `DRAFT`               | `ACTIVE`                                                 | Active-to-Draft copy with fresh structural identities               |

Campaign copy preserves eligible reusable references and configuration but excludes assignments, progress, attempts, evidence, and adaptive resolutions. Content activation/publication and Campaign activation remain explicit administrator actions.

### 6.11 Diagram Legend and Model Limits

- Composition indicates a lifecycle-owned child, such as Quiz Questions or Campaign adaptive alternatives.
- Association indicates a scoped reference or participation relationship.
- Multiplicity communicates domain participation rather than database indexing.
- Optional Organisation ownership distinguishes platform-owned from organisation-owned content and Campaigns.
- The diagram is conceptual and intentionally omits implementation-only join tables, indexes, provider details, and transient frontend state.
- AI Drafts and proposals are described as transient boundaries, not fabricated database entities.

---

Previous section: [Quality Requirements](quality-requirements.md)

Next section: [Changelog](changelog.md)
