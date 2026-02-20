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
| `title` | string | yes |
| `status` | string/enum | yes |
| `date_created` | datetime | yes |
| `date_modified` | datetime | yes |

If storage omits a required role, validation MUST report an error (see §6).

## 2.3 Common semantic roles

Implementations conforming beyond minimal scope SHOULD support:

| Semantic role | Type | Notes |
|---|---|---|
| `priority` | string/enum | configurable values |
| `due` | date or datetime | see §3 |
| `scheduled` | date or datetime | see §3 |
| `completed_date` | date | non-recurring completion |
| `tags` | list<string> | free tags |
| `contexts` | list<string> | commonly prefixed with `@` |
| `projects` | list<link-or-string> | project references |
| `time_estimate` | integer >= 0 | minutes |
| `time_entries` | list<object> | see §2.6 |
| `recurrence` | string | RRULE-compatible |
| `recurrence_anchor` | enum | `scheduled` or `completion` |
| `complete_instances` | list<date> | recurring completion state |
| `skipped_instances` | list<date> | recurring skip state |

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

Conflict resolution policy MUST be documented. Recommended policy:

- canonical key wins,
- alias key ignored with warning.

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

This table is compatibility guidance, not a requirement to choose camelCase or snake_case as canonical.

## 2.6 Structured role schemas

### 2.6.1 time_entries

`time_entries` items MUST be objects with:

- `start_time` datetime (required)
- `end_time` datetime (optional)
- `description` string (optional)

An implementation MAY accept `duration` on read for backward compatibility, but canonical duration is derived from start/end.

### 2.6.2 projects

`projects` SHOULD be represented as links when link semantics are supported, but plain strings MAY be accepted.

## 2.7 Unknown fields

Unknown frontmatter keys MUST be preserved by default during updates, complete/uncomplete, skip/unskip, and archive operations.

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
