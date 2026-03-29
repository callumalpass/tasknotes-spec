# 6. Validation

## 6.1 Purpose

Validation ensures persisted task records conform to this specification and collection configuration.

## 6.2 Validation phases

Implementations SHOULD validate in these phases:

1. Parse validation (YAML/frontmatter structure)
2. Schema validation (types and role constraints)
3. Semantic validation (cross-field invariants)

## 6.3 Validation modes

Conforming implementations MUST support:

- `strict`: errors block writes.

Implementations MAY additionally support:

- `permissive`: writes may continue with warnings.

Current mode MUST be discoverable.

## 6.4 Required checks

A conforming validator MUST implement checks required by the claimed profile(s):

| Check ID | Requirement | Required for |
|---|---|---|
| 1 | Unconditionally required semantic roles are present (`status`, `date_created`, `date_modified`). | `core-lite` and above |
| 1a | `completed_date` conditional requiredness is enforced per §2.2.1. | `core-lite` and above |
| 1b | `title` resolves via active title policy (§2.2.2 and §9.13): storage-mode-aware precedence and fallback. | `core-lite` and above |
| 2 | Field values match role type requirements. | `core-lite` and above |
| 3 | Temporal values conform to §3. | `core-lite` and above |
| 4 | Recurrence values conform to §4 (including tasknotes recurrence-string syntax and anchor-seed resolution rules). | `recurrence` and above |
| 5 | Per-instance lists contain valid dates with no overlap. | `recurrence` and above |
| 6 | `date_modified` is not earlier than `date_created` when both exist. | `core-lite` and above |
| 7 | `time_estimate` is non-negative when present. | any profile that supports `time_estimate` |
| 8 | `time_entries` entries include required `startTime`, ranges are valid when `endTime` exists, and at most one active entry exists per task. | any profile that supports `time_entries` |
| 9 | `blocked_by` entries conform to §10.2 (shape, enum, duplicates, self-reference). | `extended` |
| 10 | `reminders` entries conform to §10.3 (shape, type-specific fields, unique ids). | `extended` |
| 11 | relative reminders have resolvable base fields or produce configured error/warning behavior. | `extended` |
| 12 | link-bearing fields (`projects`, `blocked_by.uid`) conform to §11 parsing/resolution and traversal safety. | `extended` |
| 13 | templating configuration is valid when provided (`templating` schema and enums). | `templating` |
| 14 | create-time template failures obey configured failure mode (`error` vs fallback). | `templating` |
| 15 | semantic `id` (when present) is a non-empty string; duplicate collection-level IDs SHOULD be reported when detectable. | any profile that supports semantic `id` |

## 6.5 Unknown field policy

Unknown fields:

- MUST NOT fail validation by default unless collection is configured for strict schema closure.
- SHOULD generate informational warnings when strict schema closure is desired but not enabled.

## 6.6 Issue structure

Validation issues MUST include:

- `code` (machine-readable)
- `severity` (`error`, `warning`, or `info`)
- `message` (human-readable)

Issues SHOULD include:

- `field` or path
- `expected` and `actual` details where useful

## 6.7 Recommended issue codes

| Code | Severity (default) | Meaning |
|---|---|---|
| `missing_required` | error | required role missing |
| `invalid_type` | error | value type mismatch |
| `invalid_enum_value` | error | value not in configured set |
| `invalid_date_value` | error | malformed or impossible date |
| `invalid_datetime_value` | error | malformed datetime |
| `invalid_recurrence_rule` | error | recurrence not valid tasknotes recurrence syntax |
| `missing_recurrence_seed` | error | recurrence has no resolvable seed/start date |
| `invalid_recurrence_anchor` | error | anchor not allowed |
| `instance_state_overlap` | error | same date in complete and skipped lists |
| `invalid_time_range` | error | end before start in time entry |
| `missing_time_entry_start` | error | time entry is missing required startTime |
| `multiple_active_time_entries` | error | more than one active time entry exists in one task |
| `invalid_dependency_entry` | error | dependency object missing required fields |
| `invalid_dependency_reltype` | error | dependency reltype not allowed |
| `invalid_dependency_gap` | error | dependency gap not valid ISO 8601 duration |
| `duplicate_dependency_uid` | error in strict mode when `dependencies.enforce_unique_uid=true`; warning otherwise by policy | repeated dependency uid in task |
| `self_dependency` | error | task depends on itself |
| `unresolved_dependency_target` | warning | dependency target not resolvable |
| `invalid_reminder_entry` | error | reminder object missing required fields |
| `duplicate_reminder_id` | error | repeated reminder id in task |
| `invalid_reminder_type` | error | reminder type not allowed |
| `invalid_reminder_offset` | error | relative reminder offset not valid duration |
| `invalid_reminder_related_to` | error | relatedTo must be due or scheduled |
| `invalid_reminder_absolute_time` | error | absoluteTime invalid datetime |
| `unresolvable_reminder_base` | error | relative reminder base field missing/unusable |
| `invalid_link_format` | error | link value cannot be parsed as supported format |
| `ambiguous_link` | warning | link resolves to multiple candidates |
| `path_traversal` | error | resolved path escapes collection root |
| `unresolved_link_target` | warning | link target cannot be resolved |
| `invalid_task_id` | error | semantic `id` is empty or invalid type |
| `duplicate_task_id` | warning | duplicate semantic `id` detected in collection scope |
| `alias_conflict_ignored` | warning | alias key ignored due to canonical conflict |
| `unresolvable_title` | error | title cannot be resolved from title resolution policy |
| `title_source_conflict` | warning | mapped title and filename title differ; active title-storage policy selected authoritative source |
| `template_missing` | warning | configured template file cannot be read/found |
| `template_parse_failed` | warning | template frontmatter/body parsing or expansion failed |
| `unknown_field` | info | unmapped field encountered |

Implementations MAY extend this code set but SHOULD preserve existing meanings.

## 6.8 Write-time validation behavior

In strict mode, mutating operations MUST fail if any error-severity issue is present after applying intended changes.

Warnings SHOULD NOT block writes unless explicitly configured.

Datetime/date acceptance and rejection in validation MUST follow the normative matrix in §3.4.4.

## 6.9 Validation examples

### 6.9.1 Missing required role

Input:

```yaml
title: Plan workshop
status: open
dateCreated: 2026-02-20T09:00:00Z
```

Issue:

```yaml
code: missing_required
severity: error
field: dateModified
message: Required field 'dateModified' is missing.
```

### 6.9.2 Invalid recurrence anchor

Input:

```yaml
recurrence: FREQ=DAILY
recurrenceAnchor: due
```

Issue:

```yaml
code: invalid_recurrence_anchor
severity: error
field: recurrenceAnchor
message: recurrence anchor must be 'scheduled' or 'completion'.
```

### 6.9.3 Overlap in instance state

Input:

```yaml
completeInstances: [2026-02-20]
skippedInstances: [2026-02-20]
```

Issue:

```yaml
code: instance_state_overlap
severity: error
message: same date exists in complete and skipped instance lists.
```

### 6.9.4 Invalid dependency reltype

Input:

```yaml
blockedBy:
  - uid: "[[task-a]]"
    reltype: BLOCKS
```

Issue:

```yaml
code: invalid_dependency_reltype
severity: error
field: blockedBy[0].reltype
message: reltype must be one of FINISHTOSTART, STARTTOSTART, FINISHTOFINISH, STARTTOFINISH.
```

### 6.9.5 Unresolvable reminder base

Input:

```yaml
reminders:
  - id: due_minus_1d
    type: relative
    relatedTo: due
    offset: -P1D
```

Issue when `due` missing:

```yaml
code: unresolvable_reminder_base
severity: error
field: reminders[0]
message: relative reminder references due but no due value exists.
```

### 6.9.6 Unknown field in permissive mode

Input:

```yaml
title: Plan workshop
status: open
vendorPriority: p1
```

Issue example:

```yaml
code: unknown_field
severity: info
field: vendorPriority
message: field is not mapped to a known semantic role.
```

### 6.9.7 Multiple active time entries

Input:

```yaml
timeEntries:
  - startTime: 2026-02-20T10:00:00Z
  - startTime: 2026-02-20T11:00:00Z
```

Issue:

```yaml
code: multiple_active_time_entries
severity: error
field: timeEntries
message: task contains more than one active time entry.
```
