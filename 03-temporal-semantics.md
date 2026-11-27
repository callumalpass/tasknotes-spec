# 3. Temporal Semantics

## 3.1 Purpose

This section defines how implementations MUST interpret, compare, and serialize task-related date and datetime values.

## 3.2 Supported temporal value classes

Implementations MUST support:

1. **Date values** represent calendar days without a time or timezone.
2. **Floating (local) datetime values** represent calendar days and clock times without an offset. They use the mdbase `local-date-time` format.
3. **Instant values** represent points in time. They use RFC 3339 `date-time` with `Z` or a numeric offset.

## 3.3 Canonical serialization

### 3.3.1 Date

Canonical date serialization is:

```text
YYYY-MM-DD
```

### 3.3.2 Instant

Canonical instant serialization uses UTC with `Z`, for example:

```text
2026-02-20T13:45:00Z
```

Canonical instant writes MUST use second precision (`YYYY-MM-DDTHH:MM:SSZ`) and MUST truncate fractional seconds.

### 3.3.3 Floating datetime

Canonical timed `due` and `scheduled` writes MUST use `YYYY-MM-DDTHH:MM`,
with optional `:SS` and optional fractional seconds after `:SS`. For example,
write `2026-02-20T09:00` for a task due at 09:00 in the collection's time zone.

## 3.4 Parsing requirements

### 3.4.1 Date parsing

Date parsing MUST reject invalid calendar dates.

- valid: `2026-02-28`
- invalid: `2026-02-30`

### 3.4.2 Datetime parsing

Datetime parsing MUST reject invalid calendar and clock values, such as
`2026-02-30T09:00` and `2026-02-20T24:00`. A floating datetime MUST use `T`
and the syntax in §3.3.3 without a `Z` or numeric offset. An instant MUST use
the RFC 3339 offset form.

### 3.4.3 Mixed input tolerance

Readers MUST accept dates, floating datetimes, and instants for `due` and
`scheduled`. Readers MUST accept instants and floating datetimes for
`date_created`, `date_modified`, and `time_entries` timestamps. Date-only
values are invalid for those timestamp roles in strict mode.

### 3.4.4 Inbound acceptance matrix

Conforming parsers MUST follow this matrix for roles that accept the form's
value class (§3.4.3).

Date forms:

| Form | Example | Strict | Permissive |
|---|---|---|---|
| Canonical date | `2026-02-20` | accept | accept |
| Basic date (no separators) | `20260220` | reject (`invalid_date_value`) | MAY accept only under documented compatibility policy; SHOULD emit warning |

Datetime forms:

| Form | Example | Strict | Permissive |
|---|---|---|---|
| UTC instant | `2026-02-20T09:00:00Z` | accept | accept |
| Instant with numeric offset | `2026-02-20T09:00:00+10:00` | accept | accept |
| Instant with fractional seconds | `2026-02-20T09:00:00.250Z` | accept | accept |
| Floating datetime | `2026-02-20T09:00`, `2026-02-20T09:00:00`, `2026-02-20T09:00:00.250` | accept for the roles listed in §3.4.3; reject for instant-only roles (`invalid_datetime_value`) | accept for the roles listed in §3.4.3; for instant-only roles MAY accept under documented compatibility policy and SHOULD emit a warning |
| Space-separated datetime | `2026-02-20 09:00:00` | reject (`invalid_datetime_value`) | MAY accept only under documented compatibility policy; SHOULD emit warning |
| Basic datetime (no separators) | `20260220T090000Z` | reject (`invalid_datetime_value`) | MAY accept only under documented compatibility policy; SHOULD emit warning |

Canonical writes MUST follow the serialization for the field's role in §3.3,
including when permissive mode accepts a legacy form.

## 3.5 Day semantics vs instant semantics

### 3.5.1 Date roles

Date roles represent days, not instants, and MUST NOT be timezone-shifted.

### 3.5.2 Instant roles

Instant roles MUST preserve the instant when normalizing, subject to the
whole-second precision of canonical writes (§3.3.2). Resolve accepted
floating inputs under §3.6.3 before normalizing them.

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

1. the caller-provided temporal execution context, when present
2. the collection authority's configured timezone
3. the process/system local timezone.

The timezone is runtime context, not TaskNotes type-binding configuration. A
remote caller SHOULD send its current IANA timezone for interactive operations;
a headless authority SHOULD use its durable collection timezone. Every
operation MUST resolve this precedence once and use one effective timezone for
all day-level semantics in that operation.

Implementations MUST make the effective timezone discoverable.

### 3.6.2 Local calendar-day rules

When calculating day-level concepts (for example overdue/day grouping/calendar day cells), implementations MUST evaluate against local calendar-day boundaries of the active runtime timezone.

This requirement prevents off-by-one day drift in positive and negative UTC offsets.

### 3.6.3 Resolving floating datetimes

To resolve a stored floating datetime to an instant, use the collection's
IANA time zone in `settings.timezone`. In a daylight-saving overlap, choose
the earlier instant. In a gap, move the clock time forward by the length of
the gap. This follows RFC 5545 and Temporal's `compatible` disambiguation.
For example, in `America/New_York`, `2026-11-01T01:30` resolves to
`2026-11-01T05:30:00Z`, and `2026-03-08T02:30` resolves to
`2026-03-08T07:30:00Z`. Resolution leaves the stored value intact.

At an mdbase date-time location, if `settings.timezone` is missing, mdbase
MUST keep a floating value as a string and emit a warning that the collection
needs a time zone. mdbase MUST NOT substitute the runtime zone. Fields such
as `due` and `scheduled` that allow both dates and datetimes remain strings
in mdbase queries. TaskNotes resolves their timed values when it needs an
instant, for example to schedule a relative reminder.

Outside mdbase typing, a vault client without a configured collection zone
MAY use its documented vault or device zone. When `settings.timezone` is
set, the vault client MUST use it to resolve stored floating datetimes.
Without a collection zone or an applicable vault fallback, the floating
value remains unresolved for operations that require an instant.
The active runtime timezone in §3.6.1 governs day-level evaluation.

## 3.7 Comparison rules

### 3.7.1 Date-to-date

Compare by calendar day ordering.

### 3.7.2 Datetime-to-datetime

For instant-level comparisons, resolve floating values under §3.6.3 and
compare by instant ordering.

### 3.7.3 Date-to-datetime

If compared, implementations MUST document coercion policy. Recommended policy:

- convert date to local start-of-day for day-level comparisons,
- avoid implicit coercion for instant-level comparisons.

## 3.8 due and scheduled semantics

`due` and `scheduled` represent calendar days or local clock times. New or
explicitly changed timed values MUST be written as floating datetimes.
Previously stored instants remain valid on read. When writing a timed value
from an instant, use its calendar date and clock time in the collection's
zone or the applicable vault fallback (§3.6.3).

Implementations MUST:

- preserve existing values on unrelated writes,
- preserve date-only or timed granularity unless explicit conversion is requested,
- require documented explicit policy for date-to-datetime conversion operations,
- apply consistent coercion policy in filters and status calculations.

## 3.9 Completion date semantics

`completed_date` is a date role.

For non-recurring completion, writers MUST set `completed_date` using §5 semantics:

- explicit completion-day input when provided,
- otherwise current local day in active runtime timezone.

## 3.10 Created/modified timestamps

`date_created` and `date_modified` (`dateCreated` and `dateModified` in the
portable view) are instant roles. Readers MUST also accept floating values,
such as a value saved by the Obsidian properties editor, and resolve them
under §3.6.3 when an instant is needed.

Writers MUST:

- set both on create using the canonical instant format,
- update `date_modified` in canonical instant form on successful mutating operations that change persisted state,
- preserve `date_created` unless explicit migration/edit operation changes it.

## 3.11 time_entries semantics

### 3.11.1 Timestamp format

`time_entries.startTime` and `time_entries.endTime` MUST use the canonical
instant format on write. Readers MUST also accept floating values and
resolve them under §3.6.3 before validating ranges or calculating durations.

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

Reminder time fields are governed by §10.3 and MUST follow the canonical instant and duration formats from this section.

Rules:

- `reminders[].absoluteTime` MUST be a canonical instant on write.
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

## 3.15 Example: canonical writes by role

Input in a collection with `settings.timezone` set to `Europe/Paris`:

```yaml
due: 2026-02-20T08:00:00Z
timeEntries:
  - startTime: 2026-02-20T09:30:00+01:00
    endTime: 2026-02-20T10:00:00
```

Canonical serialization when explicitly writing these values:

```yaml
due: 2026-02-20T09:00
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
