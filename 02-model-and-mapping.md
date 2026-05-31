# 2. Model and Field Mapping

## 2.1 Task record model

A task record consists of:

- frontmatter object (structured fields),
- markdown body (freeform text),
- file metadata (path, created/modified time) where available.

Frontmatter is normative for task semantics. Body content is non-normative except where an implementation exposes body search or body-derived features.

## 2.2 Required semantic roles

Conforming implementations MUST support these semantic roles:

| Semantic role | Type | Required |
|---|---|---|
| `title` | string | support required (value required via configured title source, see §2.2.2) |
| `status` | string/enum | yes |
| `completed_date` | date | support required (conditionally required, see §2.2.1) |
| `date_created` | datetime | yes |
| `date_modified` | datetime | yes |

If storage omits a role marked `yes`, validation MUST report an error (see §6).
For operation-required roles, validation and operation rules in §5 and §6 apply.

### 2.2.1 Conditional requiredness (`completed_date`)

`completed_date` support is mandatory, but presence is conditional:

- For non-recurring tasks with `status` in configured `status.completed_values`, `completed_date` MUST be present.
- For non-recurring tasks with non-completed status, `completed_date` MAY be absent.
- For recurring tasks, `completed_date` is not required by recurrence completion semantics and MAY be absent.

Validators MUST apply this conditional rule and MUST NOT treat `completed_date` as unconditionally required.

### 2.2.2 Conditional requiredness (`title`)

Semantic `title` is always required, with deterministic read resolution and storage-mode-dependent read/write behavior:

- Readers MUST resolve semantic title using storage-mode-aware precedence (§9.13):
  1. when `title.storage=frontmatter`: mapped `title` key when present and non-empty, then file basename fallback;
  2. when `title.storage=filename`: file basename first, then mapped `title` fallback when basename is unavailable.
- If mapped title and filename-derived title both exist and differ, the source authoritative for active `title.storage` MUST win and implementations SHOULD emit `title_source_conflict`.
- When `title.storage=filename`, implementations MAY keep mapped `title` as a synchronized compatibility mirror, but filename-derived title remains authoritative.
- Title storage mode controls canonical writes (§9.13): `frontmatter` favors mapped-key writes; `filename` favors filename-derived title with rename-on-title-change behavior.

Validators MUST enforce semantic title presence using the active title-resolution policy (§9.13), not frontmatter key presence alone.

## 2.3 Common semantic roles

Implementations conforming beyond minimal scope SHOULD support:

| Semantic role | Type | Notes |
|---|---|---|
| `id` | string | stable task identity token; see §2.6.5 |
| `priority` | string/enum | configurable values |
| `due` | date or datetime | see §3 |
| `scheduled` | date or datetime | see §3 |
| `tags` | list<string> | free tags |
| `contexts` | list<string> | commonly prefixed with `@` |
| `projects` | list<link-or-string> | project references, see §11 |
| `time_estimate` | integer >= 0 | minutes |
| `time_entries` | list<object> | see §2.6 |
| `recurrence` | string | tasknotes recurrence string; see §4 |
| `recurrence_anchor` | enum | `scheduled` or `completion` |
| `complete_instances` | list<date> | recurring completion state |
| `skipped_instances` | list<date> | recurring skip state |
| `recurrence_parent` | link-or-string | parent recurring task reference for materialized occurrence notes; see §4.18 |
| `occurrence_date` | date | target date represented by a materialized occurrence note |
| `occurrence_materialization` | enum | parent task materialization mode: `manual`, `on_completion`, or `rolling` |
| `occurrence_next_trigger` | enum | parent task next-note trigger: `completion` or `completion_or_skip` |
| `occurrence_template` | link-or-string | optional template used when creating materialized occurrence notes |
| `occurrence_past_horizon` | duration | optional rolling materialization lookbehind bound |
| `occurrence_future_horizon` | duration | optional rolling materialization lookahead bound |
| `blocked_by` | list<object> | dependency records, see §10 and §11 |
| `reminders` | list<object> | reminder records, see §10 |

Optional extended roles are defined in §7 profiles.

## 2.4 Field mapping requirements

### 2.4.1 Mapping presence

An implementation MUST have an effective mapping from each supported semantic role to a canonical write key.
Mapping configuration is defined in §9.
If semantic role `id` is supported, it MUST also have a canonical write key.

### 2.4.2 Read behavior

Readers MUST:

1. Read the canonical mapped key if present.
2. Support configured aliases where enabled.
3. Resolve conflicts deterministically when canonical and alias keys coexist.
4. When canonical and alias keys both exist for the same semantic role, canonical key value MUST win.
5. When canonical key wins over alias, validator/loader SHOULD emit warning `alias_conflict_ignored`.

### 2.4.3 Write behavior

Writers MUST:

- write only canonical keys,
- avoid introducing alias keys in new writes,
- preserve unknown fields unless the operation explicitly opts into normalization.

## 2.5 Legacy alias compatibility

Implementations SHOULD accept these aliases on read for interoperability:

| Semantic role | Canonical example | Alias examples |
|---|---|---|
| `recurrence_anchor` | `recurrence_anchor` | `recurrenceAnchor` |
| `complete_instances` | `complete_instances` | `completeInstances` |
| `skipped_instances` | `skipped_instances` | `skippedInstances` |
| `recurrence_parent` | `recurrence_parent` | `recurrenceParent` |
| `occurrence_date` | `occurrence_date` | `occurrenceDate` |
| `occurrence_materialization` | `occurrence_materialization` | `occurrenceMaterialization` |
| `occurrence_next_trigger` | `occurrence_next_trigger` | `occurrenceNextTrigger` |
| `occurrence_template` | `occurrence_template` | `occurrenceTemplate` |
| `occurrence_past_horizon` | `occurrence_past_horizon` | `occurrencePastHorizon` |
| `occurrence_future_horizon` | `occurrence_future_horizon` | `occurrenceFutureHorizon` |
| `date_created` | `dateCreated` | `date_created` |
| `date_modified` | `dateModified` | `date_modified` |
| `completed_date` | `completedDate` | `completed_date` |
| `time_entries` | `timeEntries` | `time_entries` |
| `time_estimate` | `timeEstimate` | `time_estimate` |
| `blocked_by` | `blockedBy` | `blocked_by` |

This table is compatibility guidance, not a requirement to choose camelCase or snake_case as canonical.

## 2.6 Structured role schemas

### 2.6.1 time_entries

`time_entries` items MUST be objects with:

- `startTime` datetime (required)
- `endTime` datetime (optional)
- `description` string (optional)

Additional constraints:

- a task MUST NOT contain more than one active time entry (entry with `startTime` and no `endTime`) at commit time.
- an entry with missing `endTime` is interpreted as an active/running session.
- an implementation MAY accept `duration` on read for backward compatibility, but canonical duration is derived from start/end and SHOULD NOT be persisted on canonical writes.

Nested key names in `time_entries` are fixed by this specification and are not independently configurable in `mapping`.

### 2.6.2 projects

`projects` SHOULD be represented as links when link semantics are supported, but plain strings MAY be accepted.
When interpreted as links, parsing and resolution MUST follow §11.

### 2.6.3 blocked_by

`blocked_by` items MUST be objects with:

- `uid` link-or-string task reference (required)
- `reltype` enum (required; default allowed by §10 when omitted)
- `gap` ISO 8601 duration string (optional)

Detailed semantics are defined in §10. `uid` parsing and resolution MUST follow §11.

### 2.6.4 reminders

`reminders` items MUST be objects with:

- `id` string (required)
- `type` enum `absolute|relative` (required)
- relative-only fields: `relatedTo`, `offset`
- absolute-only fields: `absoluteTime`
- `description` string (optional)

Detailed semantics are defined in §10.

### 2.6.5 id (stable task identity)

When semantic role `id` is present:

- value MUST be a non-empty string.
- value MUST be treated as stable identity metadata and MUST NOT be rewritten by rename, move, or title-change operations.
- readers and link resolution MAY use it as an identity lookup key (see §11.4 Step 3).
- implementations SHOULD keep `id` unique within a collection; duplicate IDs SHOULD produce a validation issue.

### 2.6.6 Materialized occurrence roles

The roles in this subsection are required only for implementations claiming profile `materialized-occurrences` (§7.3.4).

Parent recurring task roles:

- `occurrence_materialization`: enum `manual|on_completion|rolling`; controls when occurrence notes are created (§4.18.5).
- `occurrence_next_trigger`: enum `completion|completion_or_skip`; controls whether skip/cancel transitions advance creation of the next occurrence note (§4.18.6).
- `occurrence_template`: link-or-string reference to a template file used when creating occurrence notes. Link parsing/resolution follows §11 when supported.
- `occurrence_past_horizon` and `occurrence_future_horizon`: ISO 8601 durations used by rolling materialization (§4.18.7).

Materialized occurrence note roles:

- `recurrence_parent`: link-or-string reference to the parent recurring task. Wikilinks are the default interoperable representation in Obsidian-oriented collections.
- `occurrence_date`: date value identifying the target date this occurrence note represents.

Implementations claiming `materialized-occurrences` MUST treat `recurrence_parent` and `occurrence_date` together as the occurrence identity key.
Within a resolved parent task, at most one materialized occurrence note SHOULD exist for each `occurrence_date`; duplicate notes MUST be reported when detected (§6.4).

Materialized occurrence notes MAY also use normal task roles such as `status`, `completed_date`, `scheduled`, `due`, `time_entries`, `reminders`, `contexts`, `projects`, and body content.
For dates where a materialized occurrence note exists, its own task state is authoritative as defined in §4.18.3.

## 2.7 Unknown fields

Unknown frontmatter keys MUST be preserved by default during updates, complete/uncomplete, skip/unskip, dependency mutations, reminder mutations, and archive operations.

Unknown fields MAY be removed only when:

- explicit normalization/migration is requested, or
- strict schema replacement is explicitly requested.

## 2.8 Example mapping

Example effective mapping:

```yaml
mapping:
  id: id
  title: title
  status: status
  date_created: dateCreated
  date_modified: dateModified
  completed_date: completedDate
  recurrence: recurrence
  recurrence_anchor: recurrence_anchor
  complete_instances: complete_instances
  skipped_instances: skipped_instances
  recurrence_parent: recurrence_parent
  occurrence_date: occurrence_date
  occurrence_materialization: occurrence_materialization
  occurrence_next_trigger: occurrence_next_trigger
  occurrence_template: occurrence_template
  occurrence_past_horizon: occurrence_past_horizon
  occurrence_future_horizon: occurrence_future_horizon
  time_estimate: timeEstimate
  time_entries: timeEntries
  blocked_by: blockedBy
  reminders: reminders
```

## 2.9 Example task record

```markdown
---
id: task-2026-01-10-weekly-review
title: Weekly review
status: open
priority: high
scheduled: 2026-02-20
recurrence: FREQ=WEEKLY;BYDAY=FR
recurrence_anchor: scheduled
complete_instances: [2026-02-13]
skipped_instances: []
blockedBy:
  - uid: "[[prepare-metrics]]"
    reltype: FINISHTOSTART
    gap: P1D
reminders:
  - id: rem_day_before
    type: relative
    relatedTo: due
    offset: -P1D
  - id: rem_start
    type: absolute
    absoluteTime: 2026-02-20T09:00:00Z
dateCreated: 2026-01-10T09:30:00Z
dateModified: 2026-02-20T08:02:11Z
---

Review completed work and plan next week.
```

## 2.10 Deterministic load example

Given frontmatter:

```yaml
recurrence_anchor: scheduled
recurrenceAnchor: completion
```

If canonical key is `recurrence_anchor`, a conforming loader using canonical-precedence policy MUST resolve semantic `recurrence_anchor` as `scheduled` and SHOULD emit a compatibility warning.
