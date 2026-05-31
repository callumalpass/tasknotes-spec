# 4. Recurrence

## 4.1 Purpose

This section defines recurrence semantics, including rule representation, anchor behavior, and per-instance completion/skip state.

## 4.2 Recurrence applicability

A task is recurring when semantic role `recurrence` contains a valid tasknotes recurrence string.

If `recurrence` is absent or empty, the task is non-recurring.

## 4.3 Rule format

### 4.3.1 Required format

`recurrence` MUST be a tasknotes recurrence string.
This syntax is RRULE-derived but is not a full RFC 5545 content line or multi-line iCalendar fragment.
The RRULE parameter portion MUST use RFC 5545 RRULE property syntax.
It MAY include a leading inline `DTSTART` segment.

If `DTSTART` is present, it MUST use one of:

- `DTSTART:YYYYMMDD` (date-only)
- `DTSTART:YYYYMMDDTHHMMSSZ` (UTC datetime)

Canonical combined form is:

- `DTSTART:...;FREQ=...`

Implementations MAY accept inbound `RRULE:` prefixes or multi-line iCalendar-like inputs for compatibility, but canonical writes SHOULD use the combined single-field form above.

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

### 4.4.4 Recalculation semantics for `recurrence_anchor=completion`

When calculating the next candidate occurrence for `recurrence_anchor=completion`:

1. Implementations MUST treat `DTSTART` progression as the consumed-history mechanism.
2. `complete_instances` MUST NOT be used as an exclusion set for future occurrence selection in this mode.
3. `skipped_instances` MUST still exclude matching candidate dates.
4. Candidate selection MUST choose the first RRULE occurrence strictly after the current `DTSTART` anchor (or resolved seed if `DTSTART` is absent).

This matches the completion-anchor progression model where each completion advances the chain by rewriting `DTSTART`.
This model is intentionally not fully reversible via ordinary `uncomplete instance`; progression history lives in `DTSTART`, not only in `complete_instances`.

### 4.4.5 `DTSTART` canonicalization on recurring writes

To ensure stable recurrence materialization across implementations, writers that persist recurring tasks MUST ensure `DTSTART` is present after create or successful recurring-instance completion.

Rules:

1. If persisted `recurrence` already contains `DTSTART`, keep it unless an explicit operation updates it per §4.4.3.
2. If persisted `recurrence` omits `DTSTART`, writers MUST resolve a seed using §4.4.1 and insert `DTSTART` before RRULE parameters.
3. For `recurrence_anchor=scheduled`, inserted `DTSTART` becomes the fixed progression baseline and MUST NOT be rewritten by later scheduled-anchor completions.
4. If seed resolution fails, operation MUST fail deterministically and emit `missing_recurrence_seed`.

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
3. For `recurrence_anchor=completion`, uncomplete MUST NOT rewrite or roll back `DTSTART`; restoring prior progression requires an explicit recurrence edit or implementation-specific rewind operation.
4. Update `date_modified` when state changes.

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

Worked example (`recurrence_anchor=completion`):

```yaml
recurrence: DTSTART:20260220;FREQ=DAILY
recurrence_anchor: completion
complete_instances: [2026-02-20, 2026-02-21]
skipped_instances: [2026-02-23]
```

Conforming recalculation:

- does **not** exclude `2026-02-22` because it is absent from `skipped_instances`,
- does exclude `2026-02-23` because it is skipped,
- ignores `complete_instances` for future exclusion in this mode (§4.4.4).

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

## 4.18 Recurrence materialization

This subsection is required only for implementations claiming profile `materialized-occurrences` (§7.3.4).

Recurrence materialization creates ordinary task files for specific target dates of a recurring parent task.
It is additive behavior: implementations that do not claim `materialized-occurrences` continue to use the instance-list model in §4.5-§4.12.
Materialized occurrence notes MUST be task files according to the collection's task-detection rules (§9.7).

### 4.18.1 Parent and occurrence ownership

The parent recurring task owns series-level semantics:

- `recurrence`
- `recurrence_anchor`
- recurrence generation and `DTSTART` progression
- parent instance-list compatibility state (`complete_instances`, `skipped_instances`)
- materialization policy fields (`occurrence_materialization`, `occurrence_next_trigger`, `occurrence_template`, `occurrence_past_horizon`, `occurrence_future_horizon`)

A materialized occurrence note owns per-date task semantics for its `occurrence_date`, including:

- `status`
- `completed_date`
- body content and checklists
- `time_entries`
- per-occurrence `due`, `scheduled`, `reminders`, `contexts`, `projects`, and unknown fields

### 4.18.2 Occurrence identity and parent reference

A materialized occurrence note MUST store:

- `recurrence_parent`: a link-or-string reference to the parent recurring task
- `occurrence_date`: the target date represented by the occurrence note

The preferred Obsidian-compatible representation for `recurrence_parent` is a wikilink, for example:

```yaml
recurrence_parent: "[[Weekly Review]]"
occurrence_date: 2026-02-27
```

Implementations claiming `materialized-occurrences` MUST resolve `recurrence_parent` using §11 link semantics for this role, even if they do not claim full `extended`.
If the parent cannot be resolved, validation SHOULD report `invalid_recurrence_parent`.

For one resolved parent, there SHOULD be at most one materialized occurrence note per `occurrence_date`.
Duplicate detected occurrence notes SHOULD report `duplicate_occurrence_note` and MUST NOT be chosen nondeterministically for writes.

### 4.18.3 Effective state precedence

For target date `D`, recurrence-aware effective state MUST be resolved in this order:

1. If a materialized occurrence note exists for `(parent, D)`, derive state from that note's own task state:
   - `completed` when its `status` is in `status.completed_values`;
   - `skipped` when its `status` is in `status.skipped_values`;
   - otherwise unresolved/default for that instance.
2. Else if `D` is in parent `complete_instances`: state is `completed`.
3. Else if `D` is in parent `skipped_instances`: state is `skipped`.
4. Else: state is unresolved/default for that instance.

If a materialized occurrence note disagrees with the parent instance lists, the materialized occurrence note wins for `D`.
Validators SHOULD report `occurrence_state_conflict`, and repair/normalization operations MAY update parent lists to match occurrence notes.

### 4.18.4 Parent instance lists as compatibility state

When materialized occurrence notes are supported, parent `complete_instances` and `skipped_instances` remain part of canonical persisted state.
They serve as interoperability state for unmaterialized occurrences and as a compatibility index for clients that do not read occurrence notes.

Conforming writers SHOULD reconcile parent lists after materialized occurrence completion, skip, uncompletion, or unskip:

- completed child state: add `D` to `complete_instances`, remove `D` from `skipped_instances`;
- skipped child state: add `D` to `skipped_instances`, remove `D` from `complete_instances`;
- active/unresolved child state after uncompletion/unskip: remove `D` from the relevant parent list.

Reconciliation failure MUST NOT silently change the occurrence note state.
Implementations SHOULD surface a recoverable error or warning.

### 4.18.5 Materialization modes

`occurrence_materialization` controls when materialized occurrence notes are created.
Allowed values:

- `manual`: occurrence notes are created only by explicit user or API action.
- `on_completion`: completing a materialized occurrence note creates the next occurrence note.
- `rolling`: the implementation maintains a bounded materialized window, such as today through the next 14 days.

If absent, `occurrence_materialization` MUST default to `manual`.

`on_completion` does not by itself create the first occurrence note in a series.
The first materialized occurrence MUST be created by explicit materialization, rolling materialization, or a documented create-time option.

Conforming implementations MUST NOT create occurrence notes merely as a side effect of read-only browsing.

### 4.18.6 Next-occurrence trigger

`occurrence_next_trigger` controls whether skip/cancel transitions also create the next occurrence note when `occurrence_materialization=on_completion`.
Allowed values:

- `completion`: only completion creates the next occurrence note.
- `completion_or_skip`: completion and skip/cancel create the next occurrence note.

If absent, `occurrence_next_trigger` MUST default to `completion`.

The next occurrence MUST be computed from the parent recurring task after applying the triggering state transition and §4.4 anchor semantics.
Materializing the next occurrence MUST be idempotent: if the next occurrence note already exists, the operation MUST return or reuse it rather than creating a duplicate.

### 4.18.7 Rolling materialization bounds

For `occurrence_materialization=rolling`, implementations MUST enforce finite bounds.
Unbounded future materialization is non-conformant.

Bounds SHOULD be expressed with ISO 8601 durations such as:

```yaml
occurrence_past_horizon: P0D
occurrence_future_horizon: P14D
```

If bounds are absent and rolling mode is enabled, implementations MUST use documented finite defaults.

### 4.18.8 Recurrence edits and historical notes

Materialized occurrence notes are durable task files.
Editing the parent recurrence rule MUST NOT silently delete, rewrite, or move existing materialized occurrence notes.

If an existing occurrence note's `occurrence_date` is no longer generated by the current parent recurrence rule, validators MAY report `materialization_target_not_generated` as a warning.
This condition MUST NOT be treated as an error by default because recurrence edits can make historical notes intentionally non-generated.
