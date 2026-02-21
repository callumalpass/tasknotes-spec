# 5. Operations

## 5.1 Purpose

This section defines normative behavior for task mutations and read-facing resolution concerns that affect persisted state.

## 5.2 General operation rules

For all mutating operations:

1. Validation MUST run before commit in strict mode.
2. Writes MUST be atomic at file level (all-or-nothing per file).
3. `date_modified` MUST be updated on successful state change.
4. Unknown fields MUST be preserved unless explicit normalization is requested.
5. Operations identified as idempotent MUST remain safe under repetition.

### 5.2.1 Target day/date resolution

Recurring instance operations act on a target day/date (`complete instance`, `uncomplete instance`, `skip`, `unskip`).
Non-recurring `complete` uses completion-day semantics for `completed_date`.

Resolution MUST be deterministic:

1. If caller provides an explicit target date/datetime, that value is authoritative.
2. If caller omits target for recurring instance operations, implementations MUST resolve in this order:
   - task `scheduled` date part, if present,
   - else task `due` date part, if present,
   - else current local day in active runtime timezone (§3.6).
3. For non-recurring complete, if caller omits explicit completion-day input, implementations MUST use current local day in active runtime timezone.

When an explicit target is datetime, operations that require day semantics MUST use its calendar date part in active runtime timezone unless documented otherwise.

## 5.3 Create

### 5.3.1 Input requirements

Create MUST provide at minimum semantic roles required by §2, directly or via defaults.

### 5.3.2 Required behavior

Create MUST:

- apply default values,
- generate `date_created` and `date_modified` when absent,
- resolve semantic `title` and filename/path behavior according to §9.13,
- apply create-time templating when enabled and supported (§5.3.5, §9.14, §7),
- serialize canonical keys and canonical temporal formats,
- fail with validation errors if required constraints are unmet,
- apply default reminders according to §10.3.9 when configured.

### 5.3.3 Title and filename resolution on create

Create MUST produce a deterministic initial filename/path.

Rules:

- Generated filenames MUST use filename-safe sanitization and MUST avoid invalid/empty basenames.
- If `title.storage=filename`:
  - basename MUST derive from semantic title,
  - title changes after create are handled by update semantics (§5.4.4),
  - `title.filename_format` and `title.custom_filename_template` MUST be ignored.
- If `title.storage=frontmatter`, create-time basename MUST follow `title.filename_format`:
  - `title`: sanitized semantic title,
  - `zettel`: implementation-defined zettel pattern (MUST be documented),
  - `timestamp`: implementation-defined timestamp pattern (MUST be documented),
  - `custom`: `title.custom_filename_template` expansion.
- If generated path already exists, implementation MUST resolve collision deterministically (for example numeric suffixing).

### 5.3.4 Example

Input intent:

```yaml
title: "Pay electricity bill"
```

Assume defaults:

- status default `open`
- priority default `normal`

Persisted frontmatter (example):

```yaml
title: Pay electricity bill
status: open
priority: normal
dateCreated: 2026-02-20T14:00:00Z
dateModified: 2026-02-20T14:00:00Z
```

### 5.3.5 Optional create-time templating

This subsection is required only for implementations claiming profile `templating` (§7.3.3).

Create-time templating pipeline MUST be deterministic:

1. Compute base create payload from explicit input, defaults (§9.8), and generated/system values (`date_created`, `date_modified`, resolved title policy).
2. Expand template variables using that base payload and active runtime date/time context.
3. Merge template frontmatter into base frontmatter with base payload precedence (base keys MUST win on conflict).
4. Resolve body output:
   - if expanded template body is non-empty, use it;
   - otherwise use caller-provided body/details (if any).

Template parse rules:

- If template content begins with `---`, implementations MUST treat the first `--- ... ---` block as template frontmatter and the remainder as template body.
- Frontmatter variable expansion MUST run before YAML parsing of template frontmatter.

Portable variable support:

- Implementations claiming `templating` MUST support `{{title}}`, `{{status}}`, `{{priority}}`, `{{dueDate}}`, `{{scheduledDate}}`, `{{details}}`, `{{contexts}}`, `{{tags}}`, `{{timeEstimate}}`, `{{date}}`, and `{{time}}`.
- Implementations MAY support additional variables.
- Unknown variables MUST be handled per `templating.unknown_variable_policy` (§9.14).

Failure behavior:

- `templating.failure_mode=error`: template read/parse failures MUST abort create.
- `templating.failure_mode=warning_fallback`: template read/parse failures MUST continue create using non-templated behavior (base frontmatter + caller body/details) and SHOULD emit warnings (`template_missing` or `template_parse_failed`).

## 5.4 Update

### 5.4.1 Patch semantics

Update MUST be patch-by-default: only targeted semantic roles are changed.

### 5.4.2 Preservation rules

Update MUST preserve:

- unrelated known roles,
- unknown fields,
- original date/datetime granularity for untouched fields.

### 5.4.3 Example

Before:

```yaml
title: Weekly review
scheduled: 2026-02-20
priority: normal
customClient: ACME
```

Operation: set priority to `high`.

After:

```yaml
title: Weekly review
scheduled: 2026-02-20
priority: high
customClient: ACME
```

### 5.4.4 Title updates and filename updates

If an update changes semantic `title`, behavior MUST follow `title.storage`:

- `title.storage=filename`: implementation MUST rename file basename to match updated title (with sanitization and deterministic collision handling), preserving parent folder unless caller requested a move.
- `title.storage=frontmatter`: implementation MUST update mapped title field and MUST NOT rename file unless an explicit rename operation is requested.

If implementation keeps frontmatter title for compatibility while `title.storage=filename`, it MUST keep stored title synchronized with effective filename-derived title.

## 5.5 Complete (non-recurring)

For non-recurring tasks, complete MUST:

1. Set `status` to a configured completed value, unless already completed.
   If multiple completed values are configured, implementation MUST choose deterministically (default: first entry in `status.completed_values`).
2. Set `completed_date` to completion day:
   - explicit completion-day input when provided,
   - otherwise current local day in active runtime timezone (§5.2.1).
3. Apply overwrite policy deterministically (`overwrite` or `preserve_if_present`).
4. Update `date_modified`.

Implementations MUST document completion-day input handling and `completed_date` overwrite policy.

Operation MUST be idempotent.

## 5.6 Uncomplete (non-recurring)

For non-recurring tasks, uncomplete MUST:

1. Set `status` to configured active/default status according to policy (default: `status.default`).
2. Clear or retain `completed_date` according to policy.
3. Update `date_modified` on state change.

Policy MUST be documented and deterministic.

Operation MUST be idempotent.

## 5.7 Complete instance (recurring)

For recurring tasks, complete with resolved target date `D` (§5.2.1) MUST follow §4.7.

Writers MUST NOT convert recurring completion into a base status rewrite unless explicit configuration requires it.

## 5.8 Uncomplete instance (recurring)

For recurring tasks, uncomplete with resolved target date `D` (§5.2.1) MUST follow §4.8.

## 5.9 Skip and unskip instance

Skip/unskip for recurring tasks with resolved target date `D` (§5.2.1) MUST follow §4.9 and §4.10.

## 5.10 Dependency operations

Dependency operations MUST follow §10.2.

### 5.10.1 Add dependency

Add dependency MUST:

- validate dependency entry schema,
- parse and resolve `uid` per §11,
- enforce duplicate and self-reference rules,
- preserve existing non-target dependency entries,
- update `date_modified` on change.

### 5.10.2 Remove dependency

Remove dependency by `uid` MUST be idempotent.

### 5.10.3 Replace dependency list

Replace dependency list MUST be explicit (not default patch behavior).

## 5.11 Reminder operations

Reminder operations MUST follow §10.3.

### 5.11.1 Add reminder

Add reminder MUST:

- validate reminder schema,
- enforce unique `id` within task,
- update `date_modified` on change.

### 5.11.2 Update reminder

Update reminder MUST target a reminder by `id` and be patch-by-default.

### 5.11.3 Remove reminder

Remove reminder by `id` MUST be idempotent.

## 5.12 Archive

Implementations MAY support archive semantics through:

- archive tag,
- archive status,
- dedicated boolean/archive field.

Archive behavior MUST be documented.

Archive MUST NOT implicitly delete the task.

## 5.13 Delete

Delete MUST remove the task file.

Optional safety behavior:

- Implementations MAY perform backlink/dependency checks.
- If checks are enabled, implementation MUST provide a bypass option for explicit force delete.

## 5.14 Rename

Rename operation changes file path/filename while preserving semantic record identity.

### 5.14.1 Rename interaction with title storage mode

- If `title.storage=filename`, basename changes from rename MUST update effective semantic title.
- If `title.storage=frontmatter`, rename MUST NOT implicitly rewrite mapped `title` unless explicitly requested.
- Implementations that persist frontmatter title in `title.storage=filename` mode MUST either update that field on rename or remove it to prevent divergence.

If implementation supports link/reference updating, it MUST:

- update resolvable references deterministically,
- report unresolved or ambiguous updates,
- update dependency `uid` and `projects` references consistently with normal links.

If implementation does not support reference updates, this limitation MUST be disclosed in conformance claim.

## 5.15 Batch operations

Batch operations MAY be supported.

If supported, implementation MUST report per-item outcomes and summary counts:

- total
- succeeded
- failed

Partial success behavior MUST be documented.

## 5.16 Concurrency

Implementations SHOULD provide write-conflict detection (for example based on modified timestamp or file hash).

When conflict is detected, operation MUST fail safely unless explicit overwrite is requested.

## 5.17 Dry run

If dry run mode is supported, operation MUST:

- execute validation and transformation logic,
- report intended changes,
- perform no file write.

## 5.18 Error model

Operation failures MUST return structured errors with:

- operation name,
- error code,
- message,
- optional field/path context.

## 5.19 Time tracking management

This subsection applies to implementations that support `time_entries`.

### 5.19.1 Start time tracking

Start on task `T` MUST:

- fail when `T` already has an active time entry,
- append a new entry with canonical `startTime` and no `endTime`,
- MAY set a default `description`,
- update `date_modified`,
- persist canonical `time_entries` shape (including removal of legacy/stale `duration` fields when normalizing).

Recommended error code when already active: `time_tracking_already_active`.

### 5.19.2 Stop time tracking

Stop on task `T` MUST:

- fail when `T` has no active time entry,
- set `endTime` on the active entry to canonical current datetime,
- update `date_modified`,
- preserve non-target entries and unknown frontmatter fields.

Recommended error code when no active session exists: `no_active_time_entry`.

### 5.19.3 Edit or replace time entries

When replacing/editing `time_entries` explicitly, implementations MUST:

- validate each entry per §2.6.1 and §3.11,
- persist canonical datetime formats,
- treat `duration` as derived compatibility input and SHOULD remove it from canonical writes,
- update `date_modified` when persisted state changes.

### 5.19.4 Remove a time entry

Remove MUST target one deterministic entry (for example by index or stable selector) and update `date_modified` on change.
Selector semantics MUST be documented.

### 5.19.5 Completion-triggered auto-stop

If `time_tracking.auto_stop_on_complete=true` (§9.16), completion transitions MUST trigger stop behavior for the same task only.

Rules:

- non-recurring tasks: trigger when status transitions from non-completed to completed status.
- recurring tasks: trigger when `complete_instances` grows.
- implementations MUST NOT stop active sessions on unrelated tasks.
- if `time_tracking.auto_stop_notification=true`, implementations MAY emit a user-visible notice.

### 5.19.6 Reporting tracked time

For reporting surfaces (for example task summaries or stats), implementations MUST document whether totals use `closed_minutes` or `live_minutes` semantics from §3.11.5.

## 5.20 Operation examples

### 5.20.1 Non-recurring complete

Before:

```yaml
title: Buy groceries
status: open
completedDate:
dateModified: 2026-02-20T09:00:00Z
```

After complete on `2026-02-20`:

```yaml
title: Buy groceries
status: done
completedDate: 2026-02-20
dateModified: 2026-02-20T09:05:00Z
```

### 5.20.2 Recurring complete instance

Before:

```yaml
title: Weekly review
status: open
recurrence: FREQ=WEEKLY;BYDAY=FR
completeInstances: []
skippedInstances: []
dateModified: 2026-02-20T08:00:00Z
```

After complete instance on `2026-02-20`:

```yaml
title: Weekly review
status: open
recurrence: FREQ=WEEKLY;BYDAY=FR
completeInstances: [2026-02-20]
skippedInstances: []
dateModified: 2026-02-20T08:10:00Z
```

### 5.20.3 Recurring skip instance overriding completion

Before:

```yaml
completeInstances: [2026-02-20]
skippedInstances: []
```

After skip `2026-02-20`:

```yaml
completeInstances: []
skippedInstances: [2026-02-20]
```

### 5.20.4 Preserve unknown fields on update

Before:

```yaml
title: Plan Q2
status: open
vendorTicket: ZX-42
```

Update status to `in-progress`.

After:

```yaml
title: Plan Q2
status: in-progress
vendorTicket: ZX-42
```

### 5.20.5 Add dependency

Before:

```yaml
blockedBy: []
```

Add dependency:

```yaml
uid: "[[prepare-metrics]]"
reltype: FINISHTOSTART
```

After:

```yaml
blockedBy:
  - uid: "[[prepare-metrics]]"
    reltype: FINISHTOSTART
```

### 5.20.6 Add reminder

Before:

```yaml
reminders: []
```

Add reminder:

```yaml
id: due_minus_1h
type: relative
relatedTo: due
offset: -PT1H
```

After:

```yaml
reminders:
  - id: due_minus_1h
    type: relative
    relatedTo: due
    offset: -PT1H
```
