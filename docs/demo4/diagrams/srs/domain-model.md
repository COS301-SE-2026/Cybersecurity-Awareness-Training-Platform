# Demo 4 Domain Model Diagram

This Mermaid diagram is the editable and repository-rendered source for the Demo 4 conceptual domain model. It intentionally shows requirement-level relationships rather than every Prisma field.

```mermaid
classDiagram
  direction LR

  class User
  class TraineeProfile
  class Organisation
  class OrganisationTraineeProfile
  class OrganisationAdminProfile
  class PlatformAdminProfile
  class OrganisationPermission
  class ActionToken
  class AuthSession

  User "1" --> "0..1" TraineeProfile
  User "1" --> "0..1" OrganisationAdminProfile
  User "1" --> "0..1" PlatformAdminProfile
  User "1" --> "0..*" AuthSession
  User "1" --> "0..*" ActionToken
  TraineeProfile "1" --> "0..1" OrganisationTraineeProfile
  Organisation "1" --> "0..*" OrganisationTraineeProfile
  Organisation "1" --> "0..*" OrganisationAdminProfile
  OrganisationAdminProfile "1" --> "0..*" OrganisationPermission

  class TrainingDocument
  class Quiz
  class QuizQuestion
  class AnswerOption
  class OrganisationEmail
  class Simulation
  class SimulatedInbox
  class SimulatedEmail

  Organisation "0..1" --> "0..*" TrainingDocument : owns
  Organisation "0..1" --> "0..*" Quiz : owns
  Organisation "1" --> "0..*" OrganisationEmail : owns
  Organisation "0..1" --> "0..*" Simulation : owns
  Quiz "1" *-- "1..*" QuizQuestion
  QuizQuestion "1" *-- "2..*" AnswerOption
  Simulation "1" *-- "0..1" SimulatedInbox
  SimulatedInbox "1" *-- "0..*" SimulatedEmail
  OrganisationEmail "0..1" --> "0..*" SimulatedEmail : source snapshot

  class Campaign
  class CampaignItem
  class CampaignAdaptiveAlternative
  class CampaignAssignment
  class AdaptiveCampaignResolution

  Organisation "0..1" --> "0..*" Campaign : owns
  Campaign "1" *-- "0..*" CampaignItem
  CampaignItem "0..1" *-- "0..*" CampaignItem : direct group children
  CampaignItem "1" *-- "0..3" CampaignAdaptiveAlternative
  Campaign "1" --> "0..*" CampaignAssignment
  TraineeProfile "1" --> "0..*" CampaignAssignment
  CampaignAssignment "1" --> "0..*" AdaptiveCampaignResolution
  CampaignItem "1" --> "0..*" AdaptiveCampaignResolution
  CampaignAdaptiveAlternative "0..1" --> "0..*" AdaptiveCampaignResolution : selected

  CampaignItem --> TrainingDocument : COMPONENT reference
  CampaignItem --> Quiz : COMPONENT reference
  CampaignItem --> Simulation : COMPONENT reference
  CampaignAdaptiveAlternative --> TrainingDocument : EASY MEDIUM HARD
  CampaignAdaptiveAlternative --> Quiz : EASY MEDIUM HARD
  CampaignAdaptiveAlternative --> Simulation : EASY MEDIUM HARD

  class QuizAttempt
  class AttemptAnswer
  class QuizResult
  class EmailClassificationResponse
  class InteractionEvent

  CampaignAssignment "1" --> "0..*" QuizAttempt
  CampaignItem "1" --> "0..*" QuizAttempt
  Quiz "1" --> "0..*" QuizAttempt
  QuizAttempt "1" *-- "0..*" AttemptAnswer
  QuizAttempt "1" *-- "0..1" QuizResult
  CampaignAssignment "1" --> "0..*" EmailClassificationResponse
  CampaignAssignment "1" --> "0..*" InteractionEvent
```

## Legend

- Filled composition relationships indicate lifecycle-owned children.
- Associations indicate scoped references or participation.
- `Organisation "0..1"` ownership distinguishes platform-owned from organisation-owned resources.
- `CampaignItem` represents exactly one canonical form: `COMPONENT`, `ADAPTIVE`, or `GROUP`.
- A `GROUP` has only direct `COMPONENT` or `ADAPTIVE` children.
- An adaptive item has exactly one `EASY`, `MEDIUM`, and `HARD` alternative.

Back to the [Demo 4 Domain Model](../../srs/domain-model.md).
