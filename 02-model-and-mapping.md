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

Semantic `title` is always required, with deterministic read resolution and storage-mode-dependent write behavior:

- Readers MUST resolve semantic title using this order:
  1. mapped `title` key when present and non-empty;
  2. file basename fallback.
- If both mapped `title` and filename-derived title exist and differ, mapped `title` value MUST win and implementations SHOULD emit `title_source_conflict`.
- Title storage mode controls canonical writes (§9.13): `frontmatter` favors mapped-key writes; `filename` favors filename-derived title with rename-on-title-change behavior.

Validators MUST enforce semantic title presence using title resolution policy (§9.13), not frontmatter key presence alone.

## 2.3 Common semantic roles

Implementations conforming beyond minimal scope SHOULD support:

| Semantic role | Type | Notes |
|---|---|---|
| `priority` | string/enum | configurable values |
| `due` | date or datetime | see §3 |
| `scheduled` | date or datetime | see §3 |
| `tags` | list<string> | free tags |
| `contexts` | list<string> | commonly prefixed with `@` |
| `projects` | list<link-or-string> | project references, see §11 |
| `time_estimate` | integer >= 0 | minutes |
| `time_entries` | list<object> | see §2.6 |
| `recurrence` | string | RRULE-compatible |
| `recurrence_anchor` | enum | `scheduled` or `completion` |
| `complete_instances` | list<date> | recurring completion state |
| `skipped_instances` | list<date> | recurring skip state |
| `blocked_by` | list<object> | dependency records, see §10 and §11 |
| `reminders` | list<object> | reminder records, see §10 |

Optional extended roles are defined in §7 profiles.

## 2.4 Field mapping requirements

### 2.4.1 Mapping presence

An implementation MUST have an effective mapping from each supported semantic role to a canonical write key.
Mapping configuration is defined in §9.

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
| `recurrence_anchor` | `recurrenceAnchor` | `recurrence_anchor` |
| `complete_instances` | `completeInstances` | `complete_instances` |
| `skipped_instances` | `skippedInstances` | `skipped_instances` |
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

## 2.7 Unknown fields

Unknown frontmatter keys MUST be preserved by default during updates, complete/uncomplete, skip/unskip, dependency mutations, reminder mutations, and archive operations.

Unknown fields MAY be removed only when:

- explicit normalization/migration is requested, or
- strict schema replacement is explicitly requested.

## 2.8 Example mapping

Example effective mapping:

```yaml
mapping:
  title: title
  status: status
  date_created: dateCreated
  date_modified: dateModified
  completed_date: completedDate
  recurrence: recurrence
  recurrence_anchor: recurrenceAnchor
  complete_instances: completeInstances
  skipped_instances: skippedInstances
  time_estimate: timeEstimate
  time_entries: timeEntries
  blocked_by: blockedBy
  reminders: reminders
```

## 2.9 Example task record

```markdown
---
title: Weekly review
status: open
priority: high
scheduled: 2026-02-20
recurrence: FREQ=WEEKLY;BYDAY=FR
recurrenceAnchor: scheduled
completeInstances: [2026-02-13]
skippedInstances: []
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
recurrenceAnchor: scheduled
recurrence_anchor: completion
```

If canonical key is `recurrenceAnchor`, a conforming loader using canonical-precedence policy MUST resolve semantic `recurrence_anchor` as `scheduled` and SHOULD emit a compatibility warning.
