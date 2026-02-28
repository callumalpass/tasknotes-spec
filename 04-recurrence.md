# 4. Recurrence

## 4.1 Purpose

This section defines recurrence semantics, including rule representation, anchor behavior, and per-instance completion/skip state.

## 4.2 Recurrence applicability

A task is recurring when semantic role `recurrence` contains a valid RRULE-compatible string.

If `recurrence` is absent or empty, the task is non-recurring.

## 4.3 Rule format

### 4.3.1 Required format

`recurrence` MUST be an RFC 5545 RRULE-compatible string.
It MAY include a leading `DTSTART` segment.

If `DTSTART` is present, it MUST use one of:

- `DTSTART:YYYYMMDD` (date-only)
- `DTSTART:YYYYMMDDTHHMMSSZ` (UTC datetime)

Canonical combined form is:

- `DTSTART:...;FREQ=...`

Implementations MAY accept inbound `RRULE:` prefixes for compatibility, but canonical writes SHOULD use the combined form above.

Examples:

- `FREQ=DAILY`
- `FREQ=WEEKLY;BYDAY=MO,WE,FR`
- `FREQ=MONTHLY;BYMONTHDAY=1`
- `DTSTART:20260220;FREQ=WEEKLY;BYDAY=FR`

### 4.3.2 Invalid rule handling

Invalid recurrence rules MUST produce a validation error in strict mode and SHOULD produce at least a warning in permissive mode.

## 4.4 Recurrence anchor

`recurrence_anchor` controls progression semantics and MUST be one of:

- `scheduled`
- `completion`

If missing, implementations SHOULD default to `scheduled` unless collection configuration defines another default.

### 4.4.1 Recurrence seed precedence

When recurrence generation requires a seed/start date, implementations MUST resolve it in this order:

1. `DTSTART` embedded in `recurrence`,
2. semantic `scheduled`,
3. semantic `date_created`.

If no seed can be resolved, recurrence materialization MUST fail deterministically and validation MUST report an error.

### 4.4.2 Anchor progression behavior

For `recurrence_anchor=scheduled`, progression is based on the scheduled chain and `DTSTART` MUST remain fixed after it is set.

For `recurrence_anchor=completion`, complete-instance operations MUST advance progression by updating `DTSTART` to the completion target (date or datetime per §4.4.3).

### 4.4.3 `DTSTART` update semantics

When `recurrence_anchor=completion` and instance completion succeeds for resolved target day `D`:

1. Instance-list state (`complete_instances`, `skipped_instances`) MUST always use day `D`.
2. If the caller provided an explicit datetime target, `DTSTART` MUST be rewritten as `DTSTART:YYYYMMDDTHHMMSSZ` using that target instant normalized to UTC.
3. Otherwise, `DTSTART` MUST be rewritten as `DTSTART:YYYYMMDD` for day `D`.
4. RRULE components other than `DTSTART` MUST be preserved unless an explicit recurrence-edit operation changes them.
5. If `DTSTART` is absent, completion-anchor progression MUST insert it before RRULE parameters.

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
4. Validators MUST NOT reject an instance date solely because it is not an RRULE-generated occurrence.

## 4.7 Instance completion semantics

Operation: `complete instance` for target date `D`.

Conforming behavior:

1. Add `D` to `complete_instances`.
2. Remove `D` from `skipped_instances` if present.
3. Leave base task status unchanged unless explicit policy states otherwise.
4. Update `date_modified` when state changes.

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
3. Update `date_modified` when state changes.

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
- Dependency blocked/unblocked evaluation for v0.1 follows §10.2.5 and is not recurrence-instance-aware unless explicitly extended by implementation policy.

For non-recurring tasks, completion uses base status semantics (§5).

## 4.13 Completed-status configuration

Implementations MUST define which status values are treated as complete for non-recurring tasks.

The completed-status list MUST be configurable or schema-driven and MUST NOT rely on a hardcoded single literal.

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
Implementations using `DTSTART` progression MUST update `DTSTART` to the completion date for this mode.

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
