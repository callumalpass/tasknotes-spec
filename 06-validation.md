# 6. Validation

## 6.1 Purpose

Validation ensures persisted task records conform to this specification and collection configuration.

## 6.2 Validation phases

Implementations SHOULD validate in these phases:

1. Parse validation (YAML/frontmatter structure)
2. Schema validation (types and role constraints)
3. Semantic validation (cross-field invariants)

## 6.3 Validation modes

Implementations MUST support at least one of:

- `strict`: errors block writes.
- `permissive`: writes may continue with warnings.

Current mode MUST be discoverable.

## 6.4 Required checks

A conforming validator MUST check:

1. Required semantic roles are present.
2. Field values match role type requirements.
3. Temporal values conform to §3.
4. Recurrence values conform to §4.
5. Per-instance lists contain valid dates with no overlap.
6. `date_modified` is not earlier than `date_created` when both exist.
7. `time_estimate` is non-negative when present.
8. `time_entries` ranges are valid when end time exists.

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
| `invalid_recurrence_rule` | error | recurrence not RRULE-compatible |
| `invalid_recurrence_anchor` | error | anchor not allowed |
| `instance_state_overlap` | error | same date in complete and skipped lists |
| `invalid_time_range` | error | end before start in time entry |
| `alias_conflict_ignored` | warning | alias key ignored due to canonical conflict |
| `unknown_field` | info | unmapped field encountered |

Implementations MAY extend this code set but SHOULD preserve existing meanings.

## 6.8 Write-time validation behavior

In strict mode, mutating operations MUST fail if any error-severity issue is present after applying intended changes.

Warnings SHOULD NOT block writes unless explicitly configured.

## 6.9 Validation examples

### 6.9.1 Missing required role

Input:

```yaml
status: open
```

Issue:

```yaml
code: missing_required
severity: error
field: title
message: Required field 'title' is missing.
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

### 6.9.4 Unknown field in permissive mode

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
