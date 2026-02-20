# 3. Temporal Semantics

## 3.1 Purpose

This section defines how implementations MUST interpret, compare, and serialize task-related date and datetime values.

## 3.2 Supported temporal value classes

Implementations MUST support:

1. **Date values**: calendar day without time or timezone.
2. **Datetime values**: instant in time.

## 3.3 Canonical serialization

### 3.3.1 Date

Canonical date serialization is:

```text
YYYY-MM-DD
```

### 3.3.2 Datetime

Canonical datetime serialization is UTC ISO 8601 with `Z`, for example:

```text
2026-02-20T13:45:00Z
```

Implementations MAY accept alternative inbound datetime forms but MUST normalize outbound canonical writes.

## 3.4 Parsing requirements

### 3.4.1 Date parsing

Date parsing MUST reject invalid calendar dates.

- valid: `2026-02-28`
- invalid: `2026-02-30`

### 3.4.2 Datetime parsing

Datetime parsing MUST reject malformed values and SHOULD reject ambiguous local datetimes without offset in strict mode.

### 3.4.3 Mixed input tolerance

Implementations MAY accept both date and datetime values for roles like `due` and `scheduled` if configured to do so. The accepted form MUST be documented.

## 3.5 Day semantics vs instant semantics

### 3.5.1 Date roles

Date roles represent days, not instants, and MUST NOT be timezone-shifted.

### 3.5.2 Datetime roles

Datetime roles represent instants and MUST preserve instant equality through normalization.

Example:

- input `2026-02-20T08:00:00-05:00`
- canonical write `2026-02-20T13:00:00Z`

## 3.6 Local calendar-day evaluation

When calculating day-level concepts (for example overdue/day grouping/calendar day cells), implementations MUST evaluate against local calendar-day boundaries of the active runtime timezone unless explicitly configured otherwise.

This requirement prevents off-by-one day drift in positive and negative UTC offsets.

## 3.7 Comparison rules

### 3.7.1 Date-to-date

Compare by calendar day ordering.

### 3.7.2 Datetime-to-datetime

Compare by instant ordering.

### 3.7.3 Date-to-datetime

If compared, implementations MUST document coercion policy. Recommended policy:

- convert date to local start-of-day for day-level comparisons,
- avoid implicit coercion for instant-level comparisons.

## 3.8 due and scheduled semantics

`due` and `scheduled` MAY be either date or datetime by configuration.

Implementations MUST:

- preserve stored granularity unless explicit conversion is requested,
- avoid silently converting date to datetime during unrelated writes,
- apply consistent coercion policy in filters and status calculations.

## 3.9 Completion date semantics

`completed_date` is a date role.

For non-recurring completion, writers MUST set `completed_date` to the effective target day used by operation semantics (see §5).

## 3.10 Created/modified timestamps

`date_created` and `date_modified` are datetime roles.

Writers MUST:

- set both on create,
- update `date_modified` on successful mutating operations,
- preserve `date_created` unless explicit migration/edit operation changes it.

## 3.11 time_entries semantics

### 3.11.1 Timestamp format

`time_entries.start_time` and `time_entries.end_time` MUST be datetime instants in canonical form on write.

### 3.11.2 Range validity

If both times exist, `end_time` MUST be greater than or equal to `start_time`.

### 3.11.3 Duration handling

If duration is present, implementations SHOULD treat it as derived and MAY rewrite or remove stale duration values during normalization.

## 3.12 Example: local-day overdue evaluation

Assume local timezone `America/Los_Angeles` and local date `2026-02-20`.

Task A:

```yaml
due: 2026-02-19
status: open
```

Task A is overdue.

Task B:

```yaml
due: 2026-02-20
status: open
```

Task B is not overdue at start of day; it becomes overdue on `2026-02-21` local day.

## 3.13 Example: preserving granularity

Before update:

```yaml
due: 2026-02-20
priority: normal
```

Operation: update priority only.

After update (conforming):

```yaml
due: 2026-02-20
priority: high
```

Non-conforming behavior would silently rewrite `due` to a datetime.

## 3.14 Example: canonical datetime write

Input:

```yaml
timeEntries:
  - startTime: 2026-02-20T09:30:00+01:00
    endTime: 2026-02-20T10:00:00+01:00
```

Canonical write:

```yaml
timeEntries:
  - startTime: 2026-02-20T08:30:00Z
    endTime: 2026-02-20T09:00:00Z
```
