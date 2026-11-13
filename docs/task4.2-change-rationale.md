# Task 4.2 – Documentation Change Rationale

## Purpose

Task 1–3 deliverables are kept under `docs/requirements`, `docs/diagrams`, and `docs/architecture`. This log records why those documents were added or revised and distinguishes merged GitHub history from changes that are still only in the working tree.

## Merged documentation pull requests

| Pull request | Deliverables | Rationale |
|---|---|---|
| [#1 – docs: complete task 1](https://github.com/quang-vu2808/brewlite-assignment2/pull/1) | Task 1 context/scope, requirements, and use-case materials | Establish a reviewable baseline for stakeholders, scope, functional and non-functional requirements, and the primary use cases before modeling or implementation. |
| [#2 – docs: complete task 2](https://github.com/quang-vu2808/brewlite-assignment2/pull/2) | Task 2 activity, sequence, and class diagrams | Make the main order flow, interactions, and domain model explicit so requirements can be checked against the design. |
| [#3 – docs(task-3): complete architecture and deployment design](https://github.com/quang-vu2808/brewlite-assignment2/pull/3) | Architecture, ADRs, and deployment design | Record architectural alternatives and deployment assumptions, and distinguish proposed decisions from behavior verified in code. |
| [#4 – docs: complete task 4](https://github.com/quang-vu2808/brewlite-assignment2/pull/4) | Traceability matrix | Connect requirements and design artifacts to implementation and tests while calling out evidence and scope that remain unverified. |

The pull-request history is the evidence that these earlier deliverables were reviewed and merged. The rationale above explains their purpose; it does not claim that every proposed architecture decision has been accepted or implemented.

## Current working-tree documentation changes

The following rationale applies to the Task 1–3 documentation changes currently in the working tree. Some are staged and some are unstaged; none has a new commit or pull request yet, so they are not represented by the merged history above.

| Affected artifacts | Rationale | History status |
|---|---|---|
| `docs/requirements/context-and-scope.md`, `srs.md`, and `use-case-checkout.md` | Clarify scope and align requirements and checkout behavior so downstream diagrams do not encode contradictory rules. | Working tree; commit/PR evidence pending |
| `docs/diagrams/*.puml` and corresponding PNGs | Resolve naming/content inconsistencies in the Task 1–3 diagrams and keep rendered images synchronized with their PlantUML sources, including legacy Task 2 aliases. | Working tree; commit/PR evidence pending |
| `docs/traceability-matrix.md` and `docs/README.md` | Make the document inventory and requirement-to-design references easier to follow without presenting referenced application code as proof that it exists in this repository. | Working tree; commit/PR evidence pending |

When these working-tree changes are submitted, link the pull request here and update the status with its actual URL. Do not record a commit hash or review outcome before it exists.
