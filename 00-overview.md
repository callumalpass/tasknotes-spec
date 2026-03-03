# 0. Overview

## 0.0 About tasknotes

**TaskNotes** is an [Obsidian](https://obsidian.md) plugin that stores tasks as individual markdown files with YAML frontmatter in a user's vault. Each task is a first-class file: readable and editable with any text editor, version-controllable, and searchable without special tooling.

A minimal task file looks like this:

```markdown
---
title: Buy groceries
status: open
priority: normal
due: 2026-02-21
tags: [task]
dateCreated: 2026-02-20T11:15:00Z
dateModified: 2026-02-20T11:15:00Z
---

Buy fruit and cleaning supplies.
```

Tasks are identified within the vault by a configurable detection method — by default, by the presence of a specific tag (e.g. `#task` in body or frontmatter). The plugin stores its configuration in `.obsidian/plugins/tasknotes/data.json` within the vault root.

**This specification** was derived from the behavior of the tasknotes plugin and is intended to serve as a stable, testable contract for:

- CLI tools and scripts that process task files outside Obsidian,
- any application that wants to interoperate with a tasknotes vault.

The spec is deliberately language-agnostic. It does not require any particular runtime, and the executable conformance suite (in `conformance/`) can be driven by an adapter written in any language.

The tasknotes plugin is the primary reference for how this spec was derived, but **the specification is normative** — where the spec and the plugin behavior differ, the spec defines the intended behavior. Known deviations are disclosed via conformance claims (§7.5).

## 0.1 Status and authority

This document is part of `tasknotes-spec` version `0.1.0-draft`.

This specification is normative for implementations that claim conformance.
No single implementation is normative; implementations are expected to conform to the specification.

## 0.2 Motivation

TaskNotes-style systems store tasks as markdown files with YAML frontmatter. This model has practical advantages:

- Task records are plain files that can be inspected and edited without proprietary tooling.
- Data remains portable across environments.
- Files are suitable for version control and collaboration workflows.

As soon as more than one tool reads and writes the same task files, implicit assumptions become an interoperability risk. In practice, these risks appear in three areas:

1. Field semantics and naming drift.
2. Date and timezone interpretation differences.
3. Recurring-task state transitions that are handled differently by different clients.

When these rules are not explicit, users can get inconsistent results from equivalent operations. A shared specification reduces that risk by making behavior testable and versioned.

## 0.3 Objectives

This specification defines a stable contract for:

- Representing task records in markdown frontmatter.
- Mapping storage keys to canonical semantic roles.
- Defining effective collection configuration via provider model (for example `tasknotes.yaml` and/or TaskNotes `data.json`).
- Interpreting date and datetime values consistently.
- Applying recurrence and per-instance completion/skip behavior.
- Managing time tracking sessions and `time_entries` lifecycle behavior.
- Parsing and resolving links consistently across task fields.
- Defining dependency and reminder behavior.
- Optionally applying deterministic create-time templating behavior.
- Executing write operations with predictable side-effects.
- Validating task records and reporting issues.

## 0.4 Non-objectives

This specification does not standardize:

- UI layout, styling, command palettes, or interaction design.
- Internal caching architecture or rendering pipelines.
- Transport protocols (HTTP, IPC, etc.) except where they affect persisted task semantics.
- Rich template-language features beyond the portable create-time templating contract in §5/§7/§9.

## 0.5 Scope

This specification is standalone. It does not require conformance to any other specification.

Implementations MAY internally reuse other libraries or specifications, but conformance claims under `tasknotes-spec` are evaluated only against this document.
Templating is optional and profile-gated; implementations that do not claim the templating profile remain conformant without template support.
References to TaskNotes plugin behavior, Obsidian behavior, or external specifications are informative context only unless this specification explicitly marks a requirement as normative.

## 0.6 Design principles

### 0.6.1 File-first persistence

Task state is represented in user-visible files. Derived indexes and caches are non-canonical.

### 0.6.2 Deterministic semantics

Equivalent inputs MUST produce equivalent persisted outputs under the same configuration and active runtime timezone.

### 0.6.3 Explicit mapping

Semantic roles are canonical. Storage key names are configurable and therefore must be mapped explicitly.

### 0.6.4 Backward evolution

The specification supports migration from legacy keys and historical behaviors through explicit compatibility rules.

## 0.7 Conformance

Conformance is profile-based (see §7). A minimal implementation can conform to a narrow profile while remaining interoperable for core operations.

## 0.8 Normative language

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are to be interpreted as described in RFC 2119.

## 0.9 Example collection

A default tasknotes vault looks like this:

```text
MyVault/
├── TaskNotes/
│   ├── Tasks/
│   │   ├── 260220abc1.md       ← task file (zettel filename by default)
│   │   └── 260220abc2.md
│   └── Archive/                ← archive folder (if moveArchivedTasks=true)
├── .obsidian/
│   └── plugins/
│       └── tasknotes/
│           └── data.json       ← plugin settings (primary config provider)
└── tasknotes.yaml              ← optional spec-level config (secondary provider)
```

Task files are identified by the `#task` tag by default (configurable). The full default collection state is described in §9.20.

Configuration provider semantics and effective configuration rules are defined in §9. An implementation MAY use either provider, both, or additional providers, based on its documented precedence policy.

A task file example (using default field mapping):

```markdown
---
title: Buy groceries
status: open
priority: normal
due: 2026-02-21
tags: [task, errands]
contexts: ["town"]
dateCreated: 2026-02-20T11:15:00Z
dateModified: 2026-02-20T11:15:00Z
---

Buy fruit and cleaning supplies.
```

## 0.10 Versioning policy

This specification uses semantic versioning.

- A **major** version introduces breaking semantic changes.
- A **minor** version introduces additive behavior or optional features.
- A **patch** version clarifies wording or fixes non-breaking defects.

Implementations MUST reject unsupported major versions when strict mode is enabled.

## 0.11 Change governance

Specification changes SHOULD be accompanied by:

- a motivation statement,
- precise normative edits,
- migration notes when behavior changes,
- updated examples.
