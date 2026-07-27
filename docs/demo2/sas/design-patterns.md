# Design Patterns

This section records the design patterns that are relevant to the Insightful Phish domain design and five-layer architecture. The patterns are documented using the COS214 design-pattern style of describing intent, problem, participants, relationships, benefits, and trade-offs, while avoiding a forced catalogue of unrelated patterns.

## SAS Content

- [0. Home](README.md)
- [1. Architectural Requirements](architectural-requirements.md)
- [2. Architectural Patterns](architectural-patterns.md)
- **[3. Design Patterns](#3-design-patterns)** &larr; _You are here_
  - [3.1 Selection Criteria](#31-selection-criteria)
  - [3.2 Design Patterns](#32-design-patterns)
  - [3.3 Pattern Interactions](#33-pattern-interactions)
  - [3.4 Limitations](#34-limitations)
  - [3.5 Quality Traceability](#35-quality-traceability)
  - [3.6 References](#36-references)
- [4. Quality to Architecture Mapping](quality-architecture-mapping.md)
- [5. Technology Requirements](technology-requirements.md)
- [6. API Contracts](api-contracts.md)
- [7. Deployment and Operations](deployment.md)

## Related Architecture and Requirements

- [Demo 2 Architecture Overview](../architecture.md)
- [SRS Domain Model](../srs/domain-model.md)
- [SRS Quality Requirements](../srs/quality-requirements.md)
- [Technology Requirements](technology-requirements.md)

---

## 3. Design Patterns

The architecture uses design patterns as supporting design tools inside the layered architecture. The patterns described here do not redefine the five-layer architecture; they explain design decisions that help the the elements of the architecture.

### 3.1 Selection Criteria

Design patterns are selected only where the domain model, requirements, or planned architectural structure show a clear recurring design problem. A pattern should help explain the architecture more clearly, improve a quality requirement, or make an important trade-off explicit.

### 3.2 Design Patterns

This section identifies the selected design patterns and documents each pattern's intent, problem addressed, relevant domain concepts, participants, relationships, benefits, limitations, and related quality requirements.

### 3.3 Pattern Interactions

This section explains how the selected patterns work together without duplicating each pattern entry.

### 3.4 Limitations

The limitations section records where a pattern introduces trade-offs, where a candidate pattern is intentionally not used, and where the design should remain simpler.

### 3.5 Quality Traceability

Quality traceability links selected patterns to the measurable [SRS Quality Requirements](../srs/quality-requirements.md).

### 3.6 References

- [Demo 2 Architecture Overview](../architecture.md)
- [SRS Domain Model](../srs/domain-model.md)
- [SRS Quality Requirements](../srs/quality-requirements.md)
- COS214 design-patterns course notes

---

Previous section: [Architectural Patterns](architectural-patterns.md)

Next section: [Quality to Architecture Mapping](quality-architecture-mapping.md)
