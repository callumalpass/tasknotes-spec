# 10. Dependencies and Reminders

## 10.1 Purpose

This section defines canonical semantics for task dependencies (`blocked_by`) and task reminders (`reminders`).

## 10.2 Dependencies (`blocked_by`)

### 10.2.1 Data shape

`blocked_by` MUST be a list of dependency entries.

Each entry MUST be an object with:

- `uid` (required): reference to a blocking task (link or string)
- `reltype` (required): one of
  - `FINISHTOSTART`
  - `STARTTOSTART`
  - `FINISHTOFINISH`
  - `STARTTOFINISH`
- `gap` (optional): ISO 8601 duration string

If `reltype` is omitted on read in compatibility mode, implementations MAY treat it as `FINISHTOSTART` and SHOULD emit a warning.

### 10.2.2 UID normalization

Implementations SHOULD normalize `uid` values to a canonical reference representation on write.

If link formats are supported, both wikilink and markdown-link forms MAY be read. Canonical write form MUST be documented.
Link parsing and resolution MUST follow §11.

### 10.2.3 Dependency uniqueness

Within a task, dependency entries MUST be unique by normalized `uid`.

If duplicates occur:

- strict mode: MUST raise `duplicate_dependency_uid`.
- permissive mode: MAY normalize to one entry and emit warning.

### 10.2.4 Self-dependency

A task MUST NOT depend on itself.

Self-dependency is a validation error.

### 10.2.5 Blocking semantics (v0.1)

For v0.1, blocking evaluation MUST be status-presence based:

1. A task is blocked if it has at least one unresolved dependency.
2. A dependency is unresolved when the referenced task is missing or not in a completed status.
3. Completed status MUST be determined from configured `status.completed_values`.

For v0.1, `reltype` and `gap` are preserved and validated but MUST NOT change the unresolved/resolved decision.

### 10.2.6 Missing referenced task

When `uid` cannot be resolved:

- implementations SHOULD emit `unresolved_dependency_target` and treat dependency as unresolved.
- if `dependencies.require_resolved_uid_on_write=true`, add/update MUST fail with error.

### 10.2.7 Cycles

Implementations MUST reject direct self-cycles.

Detection of multi-hop dependency cycles is RECOMMENDED but not required for `core-lite` or `recurrence` profiles.

### 10.2.8 Reverse relation field

Some implementations maintain reverse relationships (for example `blocking`). Such fields are derived and non-canonical in this spec unless explicitly mapped.

If maintained, reverse updates SHOULD remain consistent with `blocked_by` edits.

### 10.2.9 Dependency operation semantics

#### Add dependency

Add dependency MUST:

- validate entry shape,
- reject or normalize duplicates by policy,
- preserve unrelated dependency entries,
- update `date_modified` on change.

#### Remove dependency

Remove dependency MUST remove by normalized `uid` and be idempotent.

#### Replace dependencies

Replace behavior MUST be explicit operation mode (not default for patch update).

### 10.2.10 Dependency examples

Example entry:

```yaml
blockedBy:
  - uid: "[[prepare-metrics]]"
    reltype: FINISHTOSTART
    gap: PT4H
```

Example unresolved dependency (target missing):

```yaml
blockedBy:
  - uid: "[[non-existent-task]]"
    reltype: FINISHTOSTART
```

## 10.3 Reminders (`reminders`)

### 10.3.1 Data shape

`reminders` MUST be a list of reminder entries.

Each reminder MUST include:

- `id` (required): unique string within the task
- `type` (required): `absolute` or `relative`

Optional field:

- `description` string

Type-specific fields:

- `absolute`: requires `absoluteTime` datetime
- `relative`: requires `relatedTo` (`due` or `scheduled`) and `offset` (ISO 8601 duration)

### 10.3.2 Reminder uniqueness

Reminder `id` values MUST be unique within the task.

If duplicates occur:

- strict mode: MUST raise `duplicate_reminder_id`.
- permissive mode: MAY normalize deterministically and emit warning.

### 10.3.3 Relative reminder base

`relatedTo` MUST reference semantic role `due` or `scheduled`.

If the referenced role is absent, the reminder is unresolved.

### 10.3.4 Trigger instant computation

Trigger instant MUST be computed as follows:

1. If `type=absolute`, trigger = `absoluteTime` instant.
2. If `type=relative`,
   - resolve base field from `relatedTo`,
   - if base is datetime: use that instant,
   - if base is date: convert to local datetime at configured `reminders.date_only_anchor_time`,
   - trigger = base + `offset`.

If `reminders.date_only_anchor_time` is not configured, implementations MUST use `00:00` local time.

### 10.3.5 Offset semantics

`offset` MUST be a valid ISO 8601 duration with optional sign.

- negative offset = before base
- positive offset = after base
- zero offset = at base instant

### 10.3.6 Invalid mixed fields

Entries with incompatible field combinations MUST fail validation in strict mode.

Examples:

- `type=absolute` with `relatedTo` and no `absoluteTime`
- `type=relative` with `absoluteTime` and missing `offset`

### 10.3.7 Reminder ordering

When computing reminder schedules, implementations MUST sort by trigger instant ascending.

For identical trigger instants, implementations MUST use stable tie-break ordering by `id` ascending.

### 10.3.8 Reminder operation semantics

#### Add reminder

Add reminder MUST validate shape and unique `id`, then update `date_modified`.

If `id` is omitted by caller and implementation supports auto-ID generation, generated IDs MUST be unique within the task.

#### Update reminder

Update reminder MUST address reminders by `id` and be patch-by-default.

#### Remove reminder

Remove reminder by `id` MUST be idempotent.

### 10.3.9 Default reminders

If `defaults.reminders` is configured (see §9):

- create without explicit reminders SHOULD apply defaults.
- create with explicit reminders MUST NOT append defaults unless configured to do so.

### 10.3.10 Reminder examples

Relative reminder:

```yaml
reminders:
  - id: due_minus_15m
    type: relative
    relatedTo: due
    offset: -PT15M
```

Absolute reminder:

```yaml
reminders:
  - id: call_now
    type: absolute
    absoluteTime: 2026-02-20T09:00:00Z
```

### 10.3.11 Reminder resolution error handling

If relative reminder base is unavailable (`relatedTo=due` but no `due` field):

- strict mode: validation error `unresolvable_reminder_base`.
- permissive mode: warning and reminder excluded from trigger computation.

## 10.4 Interactions

### 10.4.1 Rename interaction

If implementation supports rename/reference updates, dependency `uid` references SHOULD be updated consistently with other link references.

### 10.4.2 Completion interaction

Changing task completion state does not automatically remove dependencies or reminders unless explicitly configured.

### 10.4.3 Archive interaction

Archive operations MAY suppress reminder delivery in runtime systems, but archive MUST NOT silently delete reminder records from persisted frontmatter unless explicitly requested.
