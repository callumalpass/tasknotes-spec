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

## 5.3 Create

### 5.3.1 Input requirements

Create MUST provide at minimum semantic roles required by §2, directly or via defaults.

### 5.3.2 Required behavior

Create MUST:

- apply default values,
- generate `date_created` and `date_modified` when absent,
- serialize canonical keys and canonical temporal formats,
- fail with validation errors if required constraints are unmet,
- apply default reminders according to §10.3.9 when configured.

### 5.3.3 Example

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

## 5.5 Complete (non-recurring)

For non-recurring tasks, complete MUST:

1. Set `status` to a configured completed value, unless already completed.
   If multiple completed values are configured, implementation MUST choose deterministically (default: first entry in `status.completed_values`).
2. Set `completed_date` to target day if absent or policy says overwrite.
3. Update `date_modified`.

Implementations MUST document whether completion overwrites existing `completed_date`.

Operation MUST be idempotent.

## 5.6 Uncomplete (non-recurring)

For non-recurring tasks, uncomplete MUST:

1. Set `status` to configured active/default status according to policy (default: `status.default`).
2. Clear or retain `completed_date` according to policy.
3. Update `date_modified` on state change.

Policy MUST be documented and deterministic.

Operation MUST be idempotent.

## 5.7 Complete instance (recurring)

For recurring tasks, complete with target date `D` MUST follow §4.7.

Writers MUST NOT convert recurring completion into a base status rewrite unless explicit configuration requires it.

## 5.8 Uncomplete instance (recurring)

For recurring tasks, uncomplete with target date `D` MUST follow §4.8.

## 5.9 Skip and unskip instance

Skip/unskip for recurring tasks MUST follow §4.9 and §4.10.

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

## 5.19 Operation examples

### 5.19.1 Non-recurring complete

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

### 5.19.2 Recurring complete instance

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

### 5.19.3 Recurring skip instance overriding completion

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

### 5.19.4 Preserve unknown fields on update

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

### 5.19.5 Add dependency

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

### 5.19.6 Add reminder

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
