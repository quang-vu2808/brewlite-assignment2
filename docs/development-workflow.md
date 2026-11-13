# Task 4.1 – Repository Workflow and Product Backlog

## Repository workflow

- `main` is the integration branch. Do not commit task work directly to `main`.
- Create a short-lived branch from `main`. Keep the existing `docs/task-<number>` pattern for documentation tasks; use `feat/<scope>` or `fix/<scope>` for implementation changes.
- Open a pull request targeting `main`. Link the relevant GitHub Issue, explain the change and its rationale, and list the checks or manual verification performed.
- Keep each pull request focused on one task or a small, related set of changes. Review the diff, respond to review comments, and merge only after the change is approved.

## Commit message convention

Use the Conventional Commits shape:

```text
<type>(<scope>): <short imperative summary>
```

Common types are `feat`, `fix`, `docs`, `test`, `refactor`, and `chore`. Examples:

```text
docs(task-4): document repository workflow
feat(products): add product detail endpoint
test(web): cover menu error state
```

Keep commits focused and do not include credentials, local environment files, generated dependencies, or unrelated formatting changes.

## Definition of Done

A task is done when:

1. Its acceptance criteria are met, and any scope change is recorded in the Issue or pull request.
2. The implementation and related requirements/design documents agree; affected diagrams and their rendered images are updated together.
3. Relevant tests and local checks have been run, with results recorded in the pull request. Any test that could not be run is called out with the reason.
4. The change has been self-reviewed, contains no secrets or unrelated files, and is submitted in a pull request linked to its Issue.
5. Review feedback is resolved and the pull request is approved before merging to `main`.

## Product Backlog by Sprint

This table organizes the repository's task-level GitHub Issues into the two assignment Sprints. Issue links and states are a snapshot from 2026-11-13; the linked Issues remain the source of truth for current status and acceptance criteria. No separate GitHub Projects board was confirmed during this review.

| Sprint | Assignment task | Backlog item | GitHub Issue |
|---|---|---|---|
| Sprint 1 | Task 1 | Context, scope, requirements, and use cases | [#5](https://github.com/quang-vu2808/brewlite-assignment2/issues/5) |
| Sprint 1 | Task 2 | Activity, sequence, and class diagrams | [#6](https://github.com/quang-vu2808/brewlite-assignment2/issues/6) |
| Sprint 1 | Task 3 | Architecture and deployment design | [#7](https://github.com/quang-vu2808/brewlite-assignment2/issues/7) |
| Sprint 1 | Task 4.1 | Repository setup, workflow, and backlog | [#8](https://github.com/quang-vu2808/brewlite-assignment2/issues/8) |
| Sprint 1 | Task 4.2 | Bring Task 1–3 deliverables into `docs` and record change rationale | No matching GitHub Issue was found in the repository at the time of review |
| Sprint 1 | Task 4.3 | Products API and responsive menu MVP | [#9](https://github.com/quang-vu2808/brewlite-assignment2/issues/9) |
| Sprint 1 | Task 4.4 | Continuous integration and pull-request quality gates | [#10](https://github.com/quang-vu2808/brewlite-assignment2/issues/10) |
| Sprint 2 | Task 5.1 | Product options, cart, authentication, orders, mock payment, and order tracking | [#11](https://github.com/quang-vu2808/brewlite-assignment2/issues/11) |
| Sprint 2 | Task 5.2 | Integration/E2E testing, database migrations and seed, Compose runtime, and health check | [#12](https://github.com/quang-vu2808/brewlite-assignment2/issues/12) |
| Sprint 2 | Task 5.3 | Continuous delivery and production deployment | [#13](https://github.com/quang-vu2808/brewlite-assignment2/issues/13) |
| Sprint 2 | Task 5.4 | Deployment, handover, release, demo, and retrospective evidence | [#14](https://github.com/quang-vu2808/brewlite-assignment2/issues/14) |

At the snapshot date, Issues #5–#14 were open. The repository has merged pull requests for Tasks 1–4, but an open Issue is not automatically considered complete; update its status when the work is accepted. Task 4.2 should be added to the GitHub backlog if the team is tracking each assignment task as an Issue.
