# 4. Recurrence

## 4.1 Purpose

This section defines recurrence semantics, including rule representation, anchor behavior, and per-instance completion/skip state.

## 4.2 Recurrence applicability

A task is recurring when semantic role `recurrence` contains a valid RRULE-compatible string.

If `recurrence` is absent or empty, the task is non-recurring.

## 4.3 Rule format

### 4.3.1 Required format

`recurrence` MUST be an RFC 5545 RRULE-compatible string.

Examples:

- `FREQ=DAILY`
- `FREQ=WEEKLY;BYDAY=MO,WE,FR`
- `FREQ=MONTHLY;BYMONTHDAY=1`

### 4.3.2 Invalid rule handling

Invalid recurrence rules MUST produce a validation error in strict mode and SHOULD produce at least a warning in permissive mode.

## 4.4 Recurrence anchor

`recurrence_anchor` controls progression semantics and MUST be one of:

- `scheduled`
- `completion`

If missing, implementations SHOULD default to `scheduled` unless collection configuration defines another default.

## 4.5 Instance state fields

Per-instance state is represented by:

- `complete_instances`: list of date values
- `skipped_instances`: list of date values

These lists represent day-level instance outcomes.

## 4.6 Invariants

Implementations MUST enforce:

1. Items in instance lists are valid date values.
2. No date appears in both lists simultaneously.
3. Duplicate dates are normalized (set semantics) or rejected deterministically.

## 4.7 Instance completion semantics

Operation: `complete instance` for target date `D`.

Conforming behavior:

1. Add `D` to `complete_instances`.
2. Remove `D` from `skipped_instances` if present.
3. Leave base task status unchanged unless explicit policy states otherwise.
4. Update `date_modified`.

Operation MUST be idempotent.

## 4.8 Instance uncompletion semantics

Operation: `uncomplete instance` for target date `D`.

Conforming behavior:

1. Remove `D` from `complete_instances` if present.
2. Do not add `D` to `skipped_instances` implicitly.
3. Update `date_modified` when state changes.

Operation MUST be idempotent.

## 4.9 Instance skip semantics

Operation: `skip instance` for target date `D`.

Conforming behavior:

1. Add `D` to `skipped_instances`.
2. Remove `D` from `complete_instances` if present.
3. Update `date_modified`.

Operation MUST be idempotent.

## 4.10 Instance unskip semantics

Operation: `unskip instance` for target date `D`.

Conforming behavior:

1. Remove `D` from `skipped_instances` if present.
2. Do not add to `complete_instances` implicitly.
3. Update `date_modified` when state changes.

Operation MUST be idempotent.

## 4.11 Effective instance state

For target date `D`, effective state MUST be resolved in this order:

1. If `D` in `complete_instances`: state is `completed`.
2. Else if `D` in `skipped_instances`: state is `skipped`.
3. Else: state is unresolved/default for that instance.

Because overlap is invalid, this ordering is deterministic.

## 4.12 Interaction with base status

For recurring tasks:

- Base `status` is task-level metadata and MUST NOT be forcibly rewritten to a completed status on instance completion unless explicitly configured.
- Instance state determines completion for recurrence-aware views and operations.

For non-recurring tasks, completion uses base status semantics (§5).

## 4.13 Completed-status configuration

Implementations MUST define which status values are treated as complete for non-recurring tasks.

The completed-status set MUST be configurable or schema-driven and MUST NOT rely on a hardcoded single literal.

## 4.14 Example: complete then skip same day

Initial:

```yaml
recurrence: FREQ=DAILY
completeInstances: [2026-02-20]
skippedInstances: []
```

Skip target date `2026-02-20`:

```yaml
recurrence: FREQ=DAILY
completeInstances: []
skippedInstances: [2026-02-20]
```

## 4.15 Example: idempotent complete

Initial:

```yaml
completeInstances: [2026-02-20]
skippedInstances: []
```

Complete `2026-02-20` again:

- persisted instance lists remain unchanged,
- operation succeeds without duplicate entries.

## 4.16 Example: anchor semantics

Task:

```yaml
recurrence: FREQ=WEEKLY;BYDAY=FR
recurrenceAnchor: completion
```

If implementation supports next-occurrence materialization, it MUST compute next occurrence relative to completion progression when anchor is `completion`, not solely by scheduled chain.

## 4.17 Validation examples

Invalid overlap:

```yaml
completeInstances: [2026-02-20]
skippedInstances: [2026-02-20]
```

Result: validation error `instance_state_overlap`.

Invalid date in list:

```yaml
completeInstances: [2026-02-30]
```

Result: validation error `invalid_date_value`.
