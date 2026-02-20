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
| `task_detection` | object | task file identification rules |
| `defaults` | object | role defaults used during create |
| `status` | object | status set and completed-value semantics |
| `validation` | object | strict/permissive behavior |
| `compatibility` | object | legacy alias/behavior switches |

## 9.5 spec_version behavior

`spec_version` MUST be a semantic version string.

Implementations in strict mode MUST reject unsupported major versions.

Implementations in permissive mode MAY proceed with warning when major version differs.

## 9.6 mapping schema

`mapping` MUST map semantic roles (from §2) to string storage keys.

Minimum required roles in mapping:

- `title`
- `status`
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
```

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
- Each `completed_values` entry MUST be in `values`.
- Non-recurring completion MUST use this set, not hardcoded literals.

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

## 9.11 compatibility schema

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

## 9.12 Complete configuration example

```yaml
spec_version: 0.1.0-draft

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

task_detection:
  path_glob: tasks/**/*.md

defaults:
  status: open
  priority: normal
  recurrence_anchor: scheduled

status:
  values: [open, in-progress, done, cancelled]
  default: open
  completed_values: [done, cancelled]

validation:
  mode: strict
  reject_unknown_fields: false

compatibility:
  read_aliases: true
  legacy_duration_field: true
```

## 9.13 Configuration errors

Configuration validation MUST report structured errors with key path context.

Examples:

- missing `mapping.title`
- `status.default` not present in `status.values`
- unsupported `validation.mode`
