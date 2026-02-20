# 9. Configuration

## 9.1 Purpose

This section defines the normative configuration model for collections using `tasknotes-spec`.

## 9.2 Configuration file

A collection MUST have a configuration file named `tasknotes.yaml` at the configured collection root.

If `tasknotes.yaml` is missing, implementations MAY fall back to defaults in permissive mode but MUST report a configuration warning.

## 9.3 Required top-level keys

| Key | Type | Required | Description |
|---|---|---|---|
| `spec_version` | string | yes | target spec version |
| `mapping` | object | yes | semantic role to storage key mapping |

## 9.4 Recommended top-level keys

| Key | Type | Description |
|---|---|---|
| `runtime_timezone` | string | IANA timezone for day-level semantics |
| `task_detection` | object | task file identification rules |
| `defaults` | object | role defaults used during create |
| `status` | object | status set and completed-value semantics |
| `validation` | object | strict/permissive behavior |
| `dependencies` | object | dependency behavior policy |
| `reminders` | object | reminder behavior policy |
| `compatibility` | object | legacy alias/behavior switches |

## 9.5 spec_version behavior

`spec_version` MUST be a semantic version string.

Implementations in strict mode MUST reject unsupported major versions.

Implementations in permissive mode MAY proceed with warning when major version differs.

### 9.5.1 runtime_timezone behavior

If `runtime_timezone` is configured, it MUST be a valid IANA timezone identifier and MUST be used for day-level semantics.

If `runtime_timezone` is absent, implementations MUST use system local timezone.
The effective timezone MUST be discoverable.

## 9.6 mapping schema

`mapping` MUST map semantic roles (from §2) to string storage keys.

Minimum required roles in mapping:

- `title`
- `status`
- `completed_date`
- `date_created`
- `date_modified`

Example:

```yaml
mapping:
  title: title
  status: status
  date_created: dateCreated
  date_modified: dateModified
  completed_date: completedDate
  recurrence: recurrence
  recurrence_anchor: recurrenceAnchor
  complete_instances: completeInstances
  skipped_instances: skippedInstances
  time_entries: timeEntries
  blocked_by: blockedBy
  reminders: reminders
```

## 9.7 task_detection schema

`task_detection` controls how task files are identified.

At least one detection method MUST be enabled.

Supported methods:

- `path_glob` (example: `tasks/**/*.md`)
- `field_presence` (example: required key `status`)
- `field_match` (example: `type == "task"`)
- `tag_match` (example: file contains tag `task`)

If multiple methods are configured, implementation MUST apply deterministic OR/AND semantics documented by the implementation.

Recommended default is OR semantics.

Example:

```yaml
task_detection:
  path_glob: tasks/**/*.md
  field_match:
    key: type
    values: [task]
```

## 9.8 defaults schema

`defaults` defines values used at create time when caller input omits a role.

Defaults MUST NOT override explicit user input.

Example:

```yaml
defaults:
  status: open
  priority: normal
  recurrence_anchor: scheduled
  reminders:
    - id: due_minus_1d
      type: relative
      relatedTo: due
      offset: -P1D
```

`defaults.reminders` behavior is defined in §10.3.9.

## 9.9 status schema

`status` defines known status values and completion semantics.

Example:

```yaml
status:
  values: [open, in-progress, done, cancelled]
  default: open
  completed_values: [done, cancelled]
```

Rules:

- `default` MUST be one of `values`.
- `completed_values` MUST be a non-empty list.
- Each `completed_values` entry MUST be in `values`.
- Non-recurring completion MUST use this list, not hardcoded literals.
- When a complete operation does not provide an explicit target status, writers MUST use the first entry of `completed_values`.

## 9.10 validation schema

Example:

```yaml
validation:
  mode: strict
  reject_unknown_fields: false
```

Rules:

- `mode` MUST be `strict` or `permissive`.
- `reject_unknown_fields=true` enforces closed-schema behavior for mapped roles.

## 9.11 dependencies schema

Example:

```yaml
dependencies:
  default_reltype: FINISHTOSTART
  treat_missing_target_as_blocked: true
  enforce_unique_uid: true
```

Rules:

- `default_reltype` MUST be one of the allowed reltype values in §10.2.
- `treat_missing_target_as_blocked` controls runtime blocked evaluation for unresolved targets.
- `enforce_unique_uid=true` enforces uniqueness at validation/write time.

## 9.12 reminders schema

Example:

```yaml
reminders:
  date_only_anchor_time: "00:00"
  apply_defaults_when_explicit: false
```

Rules:

- `date_only_anchor_time` MUST be `HH:MM` 24-hour local time format.
- `date_only_anchor_time` is used by §10.3.4 for relative reminders against date-only bases.
- `apply_defaults_when_explicit=false` means explicit input reminders replace default-reminder application at create time.

## 9.13 compatibility schema

Example:

```yaml
compatibility:
  read_aliases: true
  legacy_duration_field: true
  legacy_local_datetime_input: false
```

Rules:

- Compatibility flags MUST default to conservative behavior in new collections.
- Enabled compatibility flags SHOULD be disclosed in conformance output (§7).

## 9.14 Complete configuration example

```yaml
spec_version: 0.1.0-draft
runtime_timezone: America/Los_Angeles

mapping:
  title: title
  status: status
  priority: priority
  due: due
  scheduled: scheduled
  completed_date: completedDate
  date_created: dateCreated
  date_modified: dateModified
  recurrence: recurrence
  recurrence_anchor: recurrenceAnchor
  complete_instances: completeInstances
  skipped_instances: skippedInstances
  time_entries: timeEntries
  blocked_by: blockedBy
  reminders: reminders

task_detection:
  path_glob: tasks/**/*.md

defaults:
  status: open
  priority: normal
  recurrence_anchor: scheduled
  reminders:
    - id: due_minus_1d
      type: relative
      relatedTo: due
      offset: -P1D

status:
  values: [open, in-progress, done, cancelled]
  default: open
  completed_values: [done, cancelled]

validation:
  mode: strict
  reject_unknown_fields: false

dependencies:
  default_reltype: FINISHTOSTART
  treat_missing_target_as_blocked: true
  enforce_unique_uid: true

reminders:
  date_only_anchor_time: "00:00"
  apply_defaults_when_explicit: false

compatibility:
  read_aliases: true
  legacy_duration_field: true
```

## 9.15 Configuration errors

Configuration validation MUST report structured errors with key path context.

Examples:

- missing `mapping.title`
- `status.default` not present in `status.values`
- unsupported `validation.mode`
- invalid `dependencies.default_reltype`
- invalid `reminders.date_only_anchor_time`
