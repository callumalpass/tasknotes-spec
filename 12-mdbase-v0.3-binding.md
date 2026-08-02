# 12. mdbase v0.3 Data-Contract Binding

**Status:** Draft

**Record contract:** `tasknotes.task` `0.3.0-rc.3`

**Event contract:** `tasknotes.task.completed` `1.0.0`

**Target:** mdbase `0.3.x`

## 12.1 Purpose

This chapter defines how a TaskNotes task model is exposed through mdbase
without coupling TaskNotes to one record type or one application's private
extension.

The binding has three deliberately separate parts:

1. the `tasknotes.task` data contract defines the portable task view;
2. an mdbase type's `implements` entry maps that view to its own frontmatter
   fields and supplies TaskNotes behavior; and
3. the rest of the type file continues to define that type's storage,
   matching, defaults, lifecycle, links, and paths.

The normative artifacts are:

- [`mdbase/tasknotes.task.md`](mdbase/tasknotes.task.md), the record contract;
- [`schemas/tasknotes-task.schema.json`](schemas/tasknotes-task.schema.json),
  the projected task-view schema; and
- [`schemas/tasknotes-task-binding.schema.json`](schemas/tasknotes-task-binding.schema.json),
  the implementation binding schema.

The optional event-interoperability artifacts are:

- [`mdbase/tasknotes.task.completed.md`](mdbase/tasknotes.task.completed.md),
  the event contract; and
- [`schemas/tasknotes-task-completed.schema.json`](schemas/tasknotes-task-completed.schema.json),
  its event-data schema.

## 12.2 The mental model

A contract is not another record type. It is a view that several record types
can implement and several applications can consume.

```text
personal_task ─┐
work_task ─────┼─ implements tasknotes.task 0.3.0-rc.3 ── TaskNotes
issue_task ────┘                                  ├─ automation
                                                  └─ another task app
```

Reading or listing through the contract uses the union of all implementing
types. Creating a task is different: the caller MUST choose one exact target
type because the contract does not choose storage, paths, or lifecycle policy.

The contract version is an exact semantic version. For this draft it is also
the tasknotes-spec version whose task semantics the contract exposes. There is
no independent `x-tasknotes.version` or `spec_version` mirror.

Record types use `implements` because they adapt persisted fields and semantic
bindings to the `tasknotes.task` record contract. Event sources do not use a
type file. A TaskNotes application instead registers an event-source
declaration for `tasknotes.task.completed` with an active mdbase
interoperability bridge.

## 12.3 Layering

An implementing type MUST keep these responsibilities in their canonical
locations:

| Information | mdbase v0.3 location |
|---|---|
| Persisted frontmatter shape, required fields, enum values, formats | `schema` |
| Type identification | `match` |
| Display field, defaults, links, uniqueness, and path generation | `collection` |
| Managed create/update values | `lifecycle` |
| Contract identity and custom field names | `implements[].contract`, `version`, and `fields` |
| TaskNotes semantic behavior | `implements[].binding` |

TaskNotes metadata MUST NOT be encoded as custom JSON Schema keywords.
`x-tasknotes` MUST NOT be used for contract discovery, field mapping,
conformance, or authorization.

## 12.4 Declaring an implementation

An mdbase TaskNotes type declares one implementation:

```yaml
implements:
  - contract: tasknotes.task
    version: 0.3.0-rc.3
    fields:
      title: summary
      status: state
      priority: importance
      dateCreated: created_at
    binding:
      # TaskNotes behavior; abbreviated here
      profiles: [core-lite]
      capabilities: []
      title:
        storage: frontmatter
        filename_format: title
      status:
        values: [todo, doing, done]
        default: todo
        completed_values: [done]
        definitions: []
      priority:
        values: [normal]
        default: normal
        definitions: []
```

The contract file identified by the exact `contract` and `version` MUST exist
in the collection contract registry. The `binding` MUST validate against that
contract's `binding_schema`.

Each type MUST declare at most one implementation of one exact contract
identity. A type may implement several different contracts.

## 12.5 Portable fields

`fields` maps contract field paths to record field paths. Consumers access
contract fields and MUST NOT assume that their names are also frontmatter
property names.

```yaml
fields:
  title: summary
  status: state
  blockedBy: dependencies
  attachments: files
```

Every unconditionally required contract field MUST be mapped. Every mapped
contract field and record field MUST exist in its respective JSON Schema.

The contract view contains only mapped fields. It does not expose unmapped
frontmatter or the Markdown body. A consumer that requires either needs
separate, explicit whole-record access.

`title` is optional in the portable schema because TaskNotes permits filename
title storage. When `binding.title.storage` is `filename`, consumers derive
the effective title from the record identity/path rules in §9.13 instead of
expecting a projected frontmatter value.

The camel-case contract field names are stable portable identifiers. Their
snake-case tasknotes-spec counterparts include:

| Contract field | tasknotes-spec role |
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
| `attachments` | `attachments` |

## 12.6 Semantic profiles and capabilities

`binding.profiles` and `binding.capabilities` describe semantics that records
of this implementation may use:

```yaml
binding:
  profiles: [core-lite, recurrence, materialized-occurrences]
  capabilities:
    - dependencies
    - reminders
    - attachments
    - links
    - time-tracking
    - materialized-occurrences
    - archive
```

These are properties of the implementation, not claims that every consuming
application supports them. Before mutating a governed field, a consumer SHOULD
verify its own corresponding capability. It may still perform unrelated
operations when it preserves unsupported fields and invariants.

## 12.7 Status and priority semantics

The implementing type schema defines the legal persisted values of the mapped
fields. The binding gives those values TaskNotes meaning:

```yaml
binding:
  status:
    values: [todo, doing, done, cancelled]
    default: todo
    completed_values: [done]
    skipped_values: [cancelled]
    default_skipped: cancelled
    definitions: []
  priority:
    values: [low, normal, high]
    default: normal
    definitions: []
```

The following consistency rules apply:

- binding values MUST equal the mapped type-schema enum values;
- defaults MUST equal mapped `collection.read_defaults` values when present;
- completed and skipped values MUST be members of `status.values`;
- `default_skipped` MUST be a skipped value;
- completed and skipped values MUST NOT overlap for materialized occurrences;
  and
- definition semantics MUST agree with completed/skipped membership.

Status and priority labels, colors, and icons are presentation hints. Status
cycle, completion, skipping, auto-archive, and priority weight are semantic.

## 12.8 Title, recurrence, links, and operations

The remaining binding sections project the effective TaskNotes behavior
defined elsewhere in this specification:

- `title` follows §9.13 and MUST agree with `collection.display` and
  `collection.path`;
- `recurrence` follows §4;
- `occurrences` follows §2.6.6, §4.18, §5.20, and §9.17;
- `links` follows §11;
- attachment membership is the portable `attachments` contract field; binary
  MIME type, digest, byte size, revision, and timestamps remain authoritative
  in mdbase file descriptors and are not projected into task frontmatter;
- `archive` follows §5.12;
- `time_tracking` follows §5.19 and §9.16;
- `templating` follows §5.3.5 and §9.14; and
- optional `nlp` triggers follow §9.18.

Archive always operates on the portable `tags` contract field, so the binding
does not repeat a record-specific `tags_field`. The implementation's `fields`
map determines the actual frontmatter property.

Application-local notification preferences and generator bookkeeping MUST NOT
be placed in the binding.

## 12.9 Multiple implementations

A collection may contain any number of types implementing
`tasknotes.task 0.3.0-rc.3`. TaskNotes-aware readers MUST:

1. resolve the exact local contract;
2. enumerate every implementation in canonical type-name order;
3. read each matching record through that implementation's projected view;
4. validate the projected view; and
5. retain the concrete type identity for updates.

Implementations MUST NOT merge type schemas into one synthetic schema. A record
is validated by its concrete type and then by its projected contract view.

When an approval, cache, or external protocol pins an implementation set, it
MUST pin the exact contract digest and sorted implementation descriptors,
including each implementation digest. A newly installed type is therefore not
silently added to an existing approval.

Creation MUST name one concrete implementing type. If no type is selected,
creation fails as ambiguous.

## 12.10 Task-completed event

An event source that claims `tasknotes.task.completed 1.0.0` MUST emit one
CloudEvents structured event for each observed transition from a
non-completed status to a completed status. Its `data` contains only:

- `task_id`, using the stable TaskNotes ID when present and otherwise the
  normalized path;
- `task_path`;
- the current `title` and completed `status`; and
- `completed_at`, the instant when TaskNotes observed the transition.

The event source MUST use the mdbase event/action interoperability profile
`0.1`, pin the exact event-contract digest, and preserve any correlation and
causation identifiers supplied by the mutation context. It MUST NOT include a
complete task record merely because one is locally available. An authorized
consumer can retrieve current state separately, avoiding stale snapshots and
unnecessary disclosure.

Contract compatibility and bridge authorization are independent. Installing
TaskNotes or resolving this contract does not grant permission to publish or
consume the event.

## 12.11 Precedence and consistency

The complete implementation is self-describing:

1. the contract schema is authoritative for the portable projected view;
2. the type schema is authoritative for persisted value shapes;
3. `collection` is authoritative for generic mdbase behavior;
4. `lifecycle` is authoritative for generic managed writes; and
5. `implements[].binding` is authoritative for TaskNotes semantics.

Where values intentionally mirror each other, producers MUST keep them equal.
A TaskNotes-aware consumer MUST report a configuration error instead of
silently choosing between contradictory values.

## 12.12 Safe writes

TaskNotes-aware consumers MUST preserve:

- unknown frontmatter properties unless explicit replacement or migration was
  requested;
- Markdown body content unless an operation explicitly replaces it;
- fields governed by unsupported capabilities; and
- unrelated type metadata and implementations.

Generic mdbase operations are safe only when they preserve the same data.
Completion, recurrence mutation, occurrence materialization, dependency
updates, time tracking, archive, and other domain operations MUST follow the
TaskNotes semantics referenced by the binding.

## 12.13 Complete custom-field example

```yaml
---
kind: mdbase.type
name: work_task
version: 1
schema:
  dialect: json-schema-2020-12
  value:
    type: object
    additionalProperties: true
    required: [summary, state, created_at]
    properties:
      summary: { type: string, minLength: 1 }
      state: { enum: [todo, doing, done, cancelled] }
      importance: { enum: [low, normal, high] }
      created_at: { type: string, format: date-time }
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
implements:
  - contract: tasknotes.task
    version: 0.3.0-rc.3
    fields:
      title: summary
      status: state
      priority: importance
      dateCreated: created_at
      tags: tags
    binding:
      profiles: [core-lite]
      capabilities: [archive]
      title:
        storage: frontmatter
        filename_format: title
      status:
        values: [todo, doing, done, cancelled]
        default: todo
        completed_values: [done]
        skipped_values: [cancelled]
        default_skipped: cancelled
        definitions: []
      priority:
        values: [low, normal, high]
        default: normal
        definitions: []
      recurrence:
        syntax: tasknotes
        maintain_due_date_offset: false
        reset_body_checkboxes: false
      occurrences:
        identity_roles: [recurrenceParent, occurrenceDate]
        default_materialization: manual
        default_next_trigger: completion
      links:
        accepted_formats: [wikilink, markdown]
        write_format: wikilink
      archive:
        archived_tag: archived
        move_on_archive: false
      time_tracking:
        auto_stop_on_complete: true
      templating:
        enabled: false
        occurrence_enabled: false
---
```
