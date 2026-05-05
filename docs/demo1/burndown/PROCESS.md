# Burndown Tracking Process

## Sprint Identification

Sprint milestones must use this format:

```text
Sprint N (Demo M)
```

Example: `Sprint 1 (Demo 1)`

The milestone description must include:

`Start: YYYY-MM-DD`

The milestone due date is treated as the sprint end date.

## Story Points

Each issue body must include the following line:

```text
Story Points: 1
```

Replace `1` with the estimate for the issue.
The parser is case-insensitive and also accepts Markdown formatting such as `**Story Points:** 1` or `**Story Points: 1**`.

We use the following scale:

| Points | Meaning                             |
| ------ | ----------------------------------- |
| 1      | Very small, clearly understood task |
| 2      | Small task with limited uncertainty |
| 3      | Medium task with some uncertainty   |
| 5      | Large task or high uncertainty      |

Issues larger than 5 points should be split into sub-issues.

## Rules

- Every sprint issue must be assigned to the correct milestone.
- Every sprint issue must be on the GitHub Project board.
- Every sprint issue must have a Story Points value.
- Story points must not be changed after an issue enters a sprint.
- Closed issues burn down their full point value on the day they are closed.
- Partially completed issues do not reduce remaining work.
- Burndown charts are regenerated daily at midnight SAST by GitHub Actions.

## Outputs

Latest sprint charts are stored under:

`docs/demoM/burndown/`

The project-wide burndown chart is stored under:

`docs/burndown/`
