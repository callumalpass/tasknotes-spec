# 12. mdbase v0.3 Type-File Binding

**Status:** Draft  
**Binding version:** `x-tasknotes.version: 1`  
**Target:** mdbase `0.3.x`

## 12.1 Purpose

This chapter defines how the storage-neutral TaskNotes model and effective
configuration are represented in an mdbase v0.3 task type file.

The binding has two goals:

1. generic mdbase implementations can validate and manage TaskNotes records
   without understanding TaskNotes operations; and
2. TaskNotes-aware implementations can discover the semantic role of custom
   frontmatter properties and apply the same task behavior as the producing
   application.

The normative schema for the TaskNotes domain extension is
[`schemas/mdbase-v0.3-x-tasknotes.schema.json`](schemas/mdbase-v0.3-x-tasknotes.schema.json).
The mdbase type-file schema remains authoritative for the surrounding type
file.

## 12.2 Layering

An mdbase v0.3 TaskNotes type file MUST use the following separation of
responsibilities:

| Information | mdbase v0.3 location |
|---|---|
| Persisted frontmatter shape, required fields, enum values, formats | `schema.value` |
| Task identification | `match` |
| Display field, effective read defaults, links, and path generation | `collection` |
| Managed create/update values | `lifecycle` |
| TaskNotes semantic roles and domain policies | `x-tasknotes` |

TaskNotes-specific metadata MUST NOT be added as custom JSON Schema keywords.
A generic mdbase consumer MAY ignore `x-tasknotes`, but it MUST preserve the
extension when rewriting the type file.

## 12.3 Extension envelope

The type file MUST contain one root-level `x-tasknotes` object:

```yaml
x-tasknotes:
  contract: tasknotes.task
  version: 1
  spec_version: 0.2.0
```

`contract` identifies the domain contract. `version` versions this mdbase
binding independently of both mdbase and tasknotes-spec. `spec_version`
identifies the tasknotes-spec semantics used by the producer.

Consumers MUST reject TaskNotes-aware writes for an unsupported major contract
version. They MAY continue in read-only or generic mdbase mode, and MUST
preserve unknown extension properties.

## 12.4 Semantic profiles and capabilities

`profiles` and `capabilities` describe the TaskNotes semantic surface that may
be used by records of this type:

```yaml
x-tasknotes:
  profiles: [core-lite, recurrence, templating, materialized-occurrences, extended]
  capabilities:
    - dependencies
    - reminders
    - links
    - time-tracking
    - materialized-occurrences
    - archive
    - templating
```

These arrays describe the collection contract; they are not a conformance
claim by the consuming implementation. Before mutating fields governed by a
profile or capability, a consumer SHOULD verify that it implements the
corresponding semantics from §7. A consumer that lacks a capability MAY still
perform unrelated operations if it preserves unsupported fields and their
invariants.

## 12.5 Field roles

`field_roles` maps TaskNotes contract role identifiers to actual frontmatter
property names:

```yaml
schema:
  dialect: json-schema-2020-12
  value:
    type: object
    properties:
      summary:
        type: string
      state:
        enum: [todo, doing, done, cancelled]

x-tasknotes:
  field_roles:
    title: summary
    status: state
```

Consumers MUST resolve a field through `field_roles` and MUST NOT assume that a
semantic role is stored under a property with the same name.

Contract version 1 retains the role identifiers used by existing TaskNotes
mdbase consumers. The following identifiers correspond to snake_case semantic
roles in §2:

| Contract v1 role | tasknotes-spec role |
|---|---|
| `timeEstimate` | `time_estimate` |
| `completedDate` | `completed_date` |
| `dateCreated` | `date_created` |
| `dateModified` | `date_modified` |
| `recurrenceAnchor` | `recurrence_anchor` |
| `completeInstances` | `complete_instances` |
| `skippedInstances` | `skipped_instances` |
| `recurrenceParent` | `recurrence_parent` |
| `occurrenceDate` | `occurrence_date` |
| `occurrenceMaterialization` | `occurrence_materialization` |
| `occurrenceNextTrigger` | `occurrence_next_trigger` |
| `occurrenceTemplate` | `occurrence_template` |
| `occurrencePastHorizon` | `occurrence_past_horizon` |
| `occurrenceFutureHorizon` | `occurrence_future_horizon` |
| `timeEntries` | `time_entries` |
| `blockedBy` | `blocked_by` |

All `field_roles` values MUST identify properties in
`schema.value.properties`. A producer MAY omit a role that its collection does
not support.

## 12.6 Status semantics

The JSON Schema enum for the mapped status field defines the legal persisted
values. `x-tasknotes.status` defines how those values behave:

```yaml
collection:
  read_defaults:
    state: todo

x-tasknotes:
  field_roles:
    status: state
  status:
    default: todo
    completed_values: [done]
    skipped_values: [cancelled]
    default_skipped: cancelled
```

The rules in §9.9 apply. In addition:

- every completed or skipped value MUST occur in the mapped schema enum;
- `default` MUST equal the mapped value in `collection.read_defaults` when both
  are present;
- `default_skipped` MUST occur in `skipped_values`; and
- completed and skipped values MUST NOT overlap when
  `materialized-occurrences` is listed.

`definitions` MAY provide TaskNotes status cycling, automation, and
presentation metadata:

```yaml
status:
  definitions:
    - value: doing
      label: Doing
      color: "#0066cc"
      icon: circle-dot
      order: 2
      is_completed: false
      is_skipped: false
      exclude_from_cycle: false
      next_status: done
      auto_archive: false
      auto_archive_delay_minutes: 5
```

`value`, completion/skipping flags, ordering, cycle behavior, and auto-archive
behavior are semantic. `label`, `color`, and `icon` are presentation hints;
consumers MAY render them differently. Each definition's `is_completed` and
`is_skipped` values MUST agree with membership in `completed_values` and
`skipped_values`, respectively.

## 12.7 Priority semantics

The mapped priority schema defines legal values. The extension supplies the
TaskNotes default and stable sorting weight:

```yaml
priority:
  default: normal
  definitions:
    - value: high
      label: High
      color: "#ff0000"
      icon: chevrons-up
      weight: 3
```

Higher `weight` values sort as more important. `default` MUST equal the mapped
`collection.read_defaults` value when both are present. Labels, colors, and
icons are presentation hints.

## 12.8 Title and path policy

`title` projects the effective title configuration from §9.13:

```yaml
title:
  storage: frontmatter
  filename_format: custom
  custom_filename_template: "{{priority}}-{{title}}"
```

`storage` determines whether the mapped title frontmatter property or file
basename is authoritative. Consumers MUST follow the read and write precedence
from §9.13. TaskNotes producers MAY additionally emit `uuid` as a
`filename_format`; consumers that do not support it MUST delegate creation to
the runtime named by `collection.path.runtime` or require an explicit path.

`collection.display`, `collection.path`, and `x-tasknotes.title` MUST describe
compatible behavior. The generic collection metadata remains authoritative for
mdbase path generation; `x-tasknotes.title` defines TaskNotes title ownership
and rename semantics.

## 12.9 Recurrence and materialized occurrences

```yaml
recurrence:
  syntax: tasknotes
  maintain_due_date_offset: false
  reset_body_checkboxes: false

occurrences:
  identity_roles: [recurrenceParent, occurrenceDate]
  default_materialization: manual
  default_next_trigger: completion
  past_horizon: P0D
  future_horizon: P14D
```

`syntax: tasknotes` selects the recurrence syntax and semantics in §4.
`maintain_due_date_offset` and `reset_body_checkboxes` project the corresponding
TaskNotes recurrence settings.

`identity_roles` MUST contain `recurrenceParent` and `occurrenceDate` for
contract version 1. The mapped fields form the materialized occurrence identity
key described by §2.6.6. Occurrence defaults follow §9.17 and MUST agree with
mapped values in `collection.read_defaults` when both are present.

`runtime_timezone`, when emitted, MUST be an IANA timezone and follows §9.5.1.
Producers that intentionally use the consumer's local timezone SHOULD omit it.

## 12.10 Links

`collection.links` identifies link-bearing field paths and their targets.
`x-tasknotes.links` defines accepted and canonical frontmatter serialization:

```yaml
links:
  accepted_formats: [wikilink, markdown]
  write_format: wikilink
```

Consumers MUST parse every listed accepted format. Canonical writes SHOULD use
`write_format`; updates that do not modify a link SHOULD preserve its existing
representation.

## 12.11 Archive, time tracking, and templating

```yaml
archive:
  tags_field: tags
  archived_tag: archived
  move_on_archive: false
  folder: TaskNotes/Archive

time_tracking:
  auto_stop_on_complete: true

templating:
  enabled: true
  template_path: Templates/Task.md
  occurrence_enabled: true
  occurrence_template_path: Templates/Occurrence.md
```

Archive semantics follow §5.12. `tags_field` MUST equal the property mapped by
`field_roles.tags`. A consumer that implements `archive` MUST add or remove the
configured tag and apply the move policy. A consumer that does not implement
archive MUST preserve archive state.

Time-tracking behavior follows §5.19 and §9.16. Notification preferences are
application-local and MUST NOT be emitted in the type contract.

Task templating follows §5.3.5 and §9.14. Occurrence template settings apply
only when materializing an occurrence and the parent does not select its own
mapped `occurrenceTemplate` value.

## 12.12 Precedence and consistency

The type file is a self-contained snapshot of the effective TaskNotes contract.
The following precedence rules apply:

1. `schema.value` is authoritative for persisted value shapes and legal enum
   values.
2. `collection` is authoritative for generic mdbase defaults, display, links,
   and path behavior.
3. `lifecycle` is authoritative for generic managed writes.
4. `x-tasknotes` is authoritative for TaskNotes semantic interpretation and
   TaskNotes-specific operation policy.

Duplicated values are compatibility mirrors, not independent settings. A
producer MUST keep them equal. A TaskNotes-aware consumer MUST report a
configuration error rather than silently choose between contradictory values.

If another configuration provider is selected, provider precedence MUST follow
§9.2 and be disclosed by the consumer. Producers SHOULD regenerate generated
type files whenever the effective settings represented by this binding change.

## 12.13 Safe writes and forward compatibility

TaskNotes-aware consumers MUST preserve:

- unknown frontmatter properties unless explicit schema replacement or
  migration was requested;
- Markdown body content unless an operation explicitly replaces it;
- unknown `x-tasknotes` properties; and
- fields governed by unsupported capabilities.

A consumer MAY use generic mdbase operations without understanding this
extension only when those operations preserve the same data. Cross-record or
domain operations such as completion, recurrence mutation, occurrence
materialization, dependency updates, time tracking, and archive MUST follow the
referenced TaskNotes semantics.

## 12.14 Complete example with custom field names

```yaml
---
kind: mdbase.type
name: task
version: 1
schema:
  dialect: json-schema-2020-12
  value:
    $schema: https://json-schema.org/draft/2020-12/schema
    type: object
    additionalProperties: true
    required: [summary, state, created_at]
    properties:
      summary:
        type: string
        minLength: 1
      state:
        enum: [todo, doing, done, cancelled]
      importance:
        enum: [low, normal, high]
      finished_on:
        type: string
        format: date
      created_at:
        type: string
        format: date-time
      updated_at:
        type: string
        format: date-time
      tags:
        type: array
        items: { type: string }
collection:
  display:
    name_field: summary
  read_defaults:
    state: todo
    importance: normal
lifecycle:
  on_create:
    set:
      created_at: { now: true }
      updated_at: { now: true }
  on_update:
    set:
      updated_at: { now: true }
x-tasknotes:
  contract: tasknotes.task
  version: 1
  spec_version: 0.2.0
  profiles: [core-lite]
  capabilities: [archive]
  field_roles:
    title: summary
    status: state
    priority: importance
    completedDate: finished_on
    dateCreated: created_at
    dateModified: updated_at
    tags: tags
  title:
    storage: frontmatter
    filename_format: title
  status:
    default: todo
    completed_values: [done]
    skipped_values: [cancelled]
    default_skipped: cancelled
  priority:
    default: normal
  archive:
    tags_field: tags
    archived_tag: archived
    move_on_archive: false
---
```
