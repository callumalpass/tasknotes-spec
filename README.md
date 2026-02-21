# tasknotes-spec

A standalone specification for representing and operating on task data stored in markdown files with YAML frontmatter.

**Version:** 0.1.0-draft  
**Status:** Draft  
**Canonical Source of Truth:** This specification

## Purpose

`tasknotes-spec` defines behavior for tools that read and write task notes in a shared vault.
The goal is interoperable behavior across implementations, including full-featured applications and lighter clients.

The specification focuses on:

- Task data model and field semantics
- Date, datetime, and timezone rules
- Time tracking entry and session-management semantics
- Recurrence and per-instance completion semantics
- Link parsing and resolution semantics
- Dependencies and reminders semantics
- Optional create-time templating semantics
- Operation semantics and write side-effects
- Validation and conformance expectations

The specification does not define UI design or plugin-internal architecture.

## Why this spec exists

Task data in markdown files is useful because it remains readable and editable with standard tools.
However, multiple tools operating on the same files can diverge in behavior unless they share explicit rules.
Divergence is most costly in recurring tasks, timezone handling, and completion state transitions.

This specification provides a precise contract so independent tools can make compatible reads and writes.

## Document structure

| Section | File | Content |
|---|---|---|
| §0 | `00-overview.md` | Motivation, scope, governance, and principles |
| §1 | `01-terminology.md` | Normative definitions |
| §2 | `02-model-and-mapping.md` | Task model, canonical semantic roles, field mapping |
| §3 | `03-temporal-semantics.md` | Date/datetime/timezone semantics and serialization |
| §4 | `04-recurrence.md` | RRULE semantics and per-instance state |
| §5 | `05-operations.md` | Create/update/complete/skip/delete/rename behaviors |
| §6 | `06-validation.md` | Validation rules and issue model |
| §7 | `07-conformance.md` | Conformance profiles and claims |
| §8 | `08-compatibility-and-migrations.md` | Migration and compatibility policy |
| §9 | `09-configuration.md` | effective configuration schema and provider model (`tasknotes.yaml`, TaskNotes `data.json`, etc.) |
| §10 | `10-dependencies-and-reminders.md` | Dependency and reminder semantics |
| §11 | `11-links.md` | Link syntax, parsing, resolution, and rename update behavior |
| Changelog | `CHANGELOG.md` | Spec release history |

## Conformance model

Implementations claim conformance to one or more profiles defined in §7. A conformance claim MUST include:

- specification version
- profile name(s)
- known deviations

## Executable conformance

This repository ships a reusable fixture-based conformance suite in `conformance/`.

- generate fixtures: `npm run conformance:generate`
- run suite: `TASKNOTES_ADAPTER=<adapter-path> npm run conformance:test`
- run against `../mdbase-tasknotes`: `npm run conformance:test:mdbase-tasknotes`

## Versioning

The specification uses semantic versioning.

- Patch: clarifications and non-breaking fixes
- Minor: additive behavior and optional features
- Major: breaking semantic changes

## License

MIT
