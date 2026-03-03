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

Canonical datetime writes MUST use second precision (`YYYY-MM-DDTHH:MM:SSZ`) and MUST NOT include fractional seconds.
Implementations MAY accept alternative inbound datetime forms but MUST normalize outbound canonical writes.
If an accepted inbound datetime includes fractional seconds, writers MUST normalize deterministically by truncating fractional precision to whole seconds.

## 3.4 Parsing requirements

### 3.4.1 Date parsing

Date parsing MUST reject invalid calendar dates.

- valid: `2026-02-28`
- invalid: `2026-02-30`

### 3.4.2 Datetime parsing

Datetime parsing MUST reject malformed values.
In strict mode, datetime parsing MUST reject ambiguous local datetimes without offset (for example `2026-02-20T09:00:00` with no timezone offset).
In permissive mode, implementations MAY accept such values only under an explicitly documented compatibility policy and SHOULD emit a warning.

### 3.4.3 Mixed input tolerance

Implementations MAY accept both date and datetime values for roles like `due` and `scheduled` if configured to do so. The accepted form MUST be documented.

### 3.4.4 Inbound acceptance matrix

To avoid ambiguity, conforming parsers MUST follow this matrix.

Date forms:

| Form | Example | Strict | Permissive |
|---|---|---|---|
| Canonical date | `2026-02-20` | accept | accept |
| Basic date (no separators) | `20260220` | reject (`invalid_date_value`) | MAY accept only under documented compatibility policy; SHOULD emit warning |

Datetime forms:

| Form | Example | Strict | Permissive |
|---|---|---|---|
| Canonical UTC | `2026-02-20T09:00:00Z` | accept | accept |
| ISO with explicit offset | `2026-02-20T09:00:00+10:00` | accept | accept |
| ISO with fractional seconds | `2026-02-20T09:00:00.250Z` | accept (normalize to second precision on write) | accept (normalize to second precision on write) |
| Offset-less local datetime | `2026-02-20T09:00:00` | reject (`invalid_datetime_value`) | MAY accept only under documented compatibility policy; SHOULD emit warning |
| Space-separated datetime | `2026-02-20 09:00:00` | reject (`invalid_datetime_value`) | MAY accept only under documented compatibility policy; SHOULD emit warning |
| Basic datetime (no separators) | `20260220T090000Z` | reject (`invalid_datetime_value`) | MAY accept only under documented compatibility policy; SHOULD emit warning |

When permissive-mode compatibility accepts a non-canonical form, canonical writes MUST still follow §3.3.

## 3.5 Day semantics vs instant semantics

### 3.5.1 Date roles

Date roles represent days, not instants, and MUST NOT be timezone-shifted.

### 3.5.2 Datetime roles

Datetime roles represent instants and MUST preserve instant equality through normalization.

Example:

- input `2026-02-20T08:00:00-05:00`
- canonical write `2026-02-20T13:00:00Z`

### 3.5.3 Implementation guidance: UTC-anchor strategy (non-normative)

Because date-only fields are human-readable (`YYYY-MM-DD`) while implementations often compute using datetime objects, a common strategy is to use a UTC-midnight anchor for date-only internals.

Recommended approach:

1. Parse date-only values to a UTC-midnight anchor instant for internal computations.
2. Format date-only values from UTC calendar components when writing `YYYY-MM-DD`.
3. Keep date-only roles as date-only on write unless an explicit conversion operation is requested.
4. Evaluate user-facing day semantics (today, overdue, day grouping) using local calendar-day boundaries per §3.6.

Implementations MAY use different internal representations as long as all normative requirements in this section are preserved.

## 3.6 Local calendar-day evaluation

### 3.6.1 Active runtime timezone

For day-level semantics, the active runtime timezone is:

1. configured collection `runtime_timezone` if provided, otherwise
2. the process/system local timezone.

Implementations MUST make the effective timezone discoverable.

### 3.6.2 Local calendar-day rules

When calculating day-level concepts (for example overdue/day grouping/calendar day cells), implementations MUST evaluate against local calendar-day boundaries of the active runtime timezone.

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
- require documented explicit policy for date-to-datetime conversion operations,
- apply consistent coercion policy in filters and status calculations.

## 3.9 Completion date semantics

`completed_date` is a date role.

For non-recurring completion, writers MUST set `completed_date` using §5 semantics:

- explicit completion-day input when provided,
- otherwise current local day in active runtime timezone.

## 3.10 Created/modified timestamps

`date_created` and `date_modified` are datetime roles.

Writers MUST:

- set both on create,
- update `date_modified` on successful mutating operations that change persisted state,
- preserve `date_created` unless explicit migration/edit operation changes it.

## 3.11 time_entries semantics

### 3.11.1 Timestamp format

`time_entries.startTime` and `time_entries.endTime` MUST be datetime instants in canonical form on write.

### 3.11.2 Range validity

If both times exist, `endTime` MUST be greater than or equal to `startTime`.

### 3.11.3 Duration handling

If duration is present, implementations SHOULD treat it as derived and MAY rewrite or remove stale duration values during normalization.

### 3.11.4 Active session semantics

An entry with `startTime` and no `endTime` represents an active/running session.

Implementations that support time-tracking management operations (§5.19) MUST enforce at most one active session per task at commit time.

### 3.11.5 Derived time calculations

For interoperability, implementations SHOULD expose both derived views when reporting tracked time:

- `closed_minutes`: sum of entries where both `startTime` and `endTime` exist.
- `live_minutes`: `closed_minutes` plus elapsed minutes of active entries (if any).

Implementations MUST document which derived view is used by each reporting surface (for example task cards, stats, APIs).

## 3.12 reminder temporal semantics

Reminder time fields are governed by §10.3 and MUST follow canonical datetime and duration formats from this section.

Rules:

- `reminders[].absoluteTime` MUST be a canonical datetime on write.
- `reminders[].offset` MUST be a valid ISO 8601 duration string.
- relative reminder base conversion for date-only values MUST use `reminders.date_only_anchor_time` from §9, or `00:00` local time if unset.

## 3.13 Example: local-day overdue evaluation

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

## 3.14 Example: preserving granularity

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

## 3.15 Example: canonical datetime write

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

## 3.16 Example: UTC-anchor roundtrip for date-only field

Input:

```yaml
due: 2026-02-20
```

Internal computation anchor:

```text
2026-02-20T00:00:00Z
```

After unrelated update, conforming write:

```yaml
due: 2026-02-20
```

Non-conforming behavior would rewrite `due` as a datetime or shift it to another day based on local offset.
