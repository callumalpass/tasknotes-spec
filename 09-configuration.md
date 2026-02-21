# 9. Configuration

## 9.1 Purpose

This section defines the normative configuration model for collections using `tasknotes-spec`.

## 9.2 Configuration provider model

Implementations MUST derive an **effective configuration** from one or more configuration providers.

A provider is a source adapter that returns a partial configuration normalized to this section's schema.

Implementations MUST:

- support at least one provider,
- document supported providers,
- document provider precedence order,
- disclose active providers and fallback behavior in conformance output (§7).

### 9.2.1 Common provider types

Common providers include:

- `yaml_file`: a `tasknotes.yaml` document at collection root,
- `tasknotes_plugin_data_json`: `.obsidian/plugins/tasknotes/data.json`,
- `built_in_defaults`: implementation defaults,
- optional runtime/CLI/env overrides.

This list is not exhaustive.

### 9.2.2 Deterministic precedence and merge

Provider precedence MUST be deterministic.

Unless explicitly documented otherwise, implementations MUST resolve configuration per top-level key:

- for each key in §9.3/§9.4, the highest-precedence provider that supplies that key wins,
- winning object values replace lower-precedence object values as whole objects (no implicit deep merge).

If an implementation supports deep-merge behavior, it MUST be explicitly documented and deterministic.

### 9.2.3 Strict vs permissive provider behavior

In strict mode:

- failure to resolve required effective keys (`spec_version`, `mapping`) MUST be a configuration error.

If permissive mode is implemented, then in permissive mode:

- implementations MAY continue with defaults when providers are missing/unreadable,
- implementations MUST emit configuration warnings,
- implementations MUST disclose that effective configuration is partial/default-derived.

### 9.2.4 TaskNotes plugin provider mapping (`data.json`)

When using `.obsidian/plugins/tasknotes/data.json` (relative to collection/vault root) as a provider, normalization SHOULD map:

- `fieldMapping` -> `mapping` for all supported semantic roles (role-name normalization required; e.g. `dateCreated` -> `date_created`, `completedDate` -> `completed_date`, `blockedBy` -> `blocked_by`),
- `storeTitleInFilename` -> `title.storage` (`true` => `filename`, `false` => `frontmatter`),
- `taskFilenameFormat` -> `title.filename_format`,
- `customFilenameTemplate` -> `title.custom_filename_template`,
- `taskCreationDefaults.useBodyTemplate` -> `templating.enabled`,
- `taskCreationDefaults.bodyTemplate` -> `templating.template_path`,
- `customStatuses[].value` -> `status.values`,
- `defaultTaskStatus` -> `status.default`,
- `customStatuses[isCompleted=true].value` -> `status.completed_values`,
- `defaultTaskStatus` -> `defaults.status`,
- `defaultTaskPriority` -> `defaults.priority`,
- `autoStopTimeTrackingOnComplete` -> `time_tracking.auto_stop_on_complete`,
- `autoStopTimeTrackingNotification` -> `time_tracking.auto_stop_notification`,
- `taskIdentificationMethod` + related keys -> `task_detection` (for example tag/property-based detection).

Provider keys with no equivalent in this specification MAY be ignored by `tasknotes-spec` consumers.

## 9.3 Required top-level keys

Required keys apply to the effective configuration after provider resolution.

| Key | Type | Required | Description |
|---|---|---|---|
| `spec_version` | string | yes | target spec version (provider-supplied or synthesized per §9.5) |
| `mapping` | object | yes | semantic role to storage key mapping |

## 9.4 Recommended top-level keys

| Key | Type | Description |
|---|---|---|
| `runtime_timezone` | string | IANA timezone for day-level semantics |
| `task_detection` | object | task file identification rules |
| `defaults` | object | role defaults used during create |
| `status` | object | status set and completed-value semantics |
| `validation` | object | validation behavior (`strict` required, `permissive` optional) |
| `links` | object | link parsing/resolution behavior |
| `title` | object | title source and filename behavior policy |
| `templating` | object | optional create-time templating behavior policy |
| `dependencies` | object | dependency behavior policy |
| `reminders` | object | reminder behavior policy |
| `time_tracking` | object | time-tracking management behavior policy |
| `compatibility` | object | legacy alias/behavior switches |

## 9.5 spec_version behavior

`spec_version` MUST be a semantic version string.

Implementations in strict mode MUST reject unsupported major versions.

If permissive mode is implemented, permissive mode MAY proceed with warning when major version differs.

If a provider does not supply `spec_version` (for example TaskNotes `data.json`), implementations MUST synthesize an effective `spec_version` matching their target `tasknotes-spec` version and SHOULD disclose that it was synthesized.

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

If multiple methods are configured, `task_detection.combine` MUST define combinator semantics:

- `or` (default): file is a task if any enabled method matches.
- `and`: file is a task only if all enabled methods match.

If `task_detection.combine` is absent, implementations MUST default to `or`.

Example:

```yaml
task_detection:
  combine: or
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

- `mode` MUST be `strict` or `permissive` when present.
- If `mode` is absent, effective mode MUST default to `strict`.
- Conforming implementations MUST support `strict`.
- Implementations MAY support `permissive`.
- If `mode=permissive` is configured but not implemented, configuration MUST fail in strict mode and SHOULD emit warning/fallback in permissive mode.
- `reject_unknown_fields=true` enforces closed-schema behavior for mapped roles.

## 9.11 dependencies schema

Example:

```yaml
dependencies:
  default_reltype: FINISHTOSTART
  treat_missing_target_as_blocked: true
  enforce_unique_uid: true
  unresolved_target_severity: warning
  require_resolved_uid_on_write: false
```

Rules:

- `default_reltype` MUST be one of the allowed reltype values in §10.2.
- `treat_missing_target_as_blocked` controls runtime blocked evaluation for unresolved targets.
- `enforce_unique_uid=true` enforces uniqueness at validation/write time.
- `unresolved_target_severity` MUST be `warning` or `error`.
- `require_resolved_uid_on_write=true` requires dependency UID resolution success for add/update operations.

## 9.12 links schema

Example:

```yaml
links:
  extensions: [".md"]
  unresolved_default_severity: warning
  update_references_on_rename: true
```

Rules:

- `extensions` defines extension trial order for extensionless targets.
- `unresolved_default_severity` MUST be `warning` or `error`.
- `update_references_on_rename=true` enables rename-time link rewrite behavior when supported.

## 9.13 title schema

Example (`storage=frontmatter`):

```yaml
title:
  storage: frontmatter
  filename_format: custom
  custom_filename_template: "{{date}} {{title}}"
```

Example (`storage=filename`):

```yaml
title:
  storage: filename
```

Rules:

- `storage` MUST be `frontmatter` or `filename`.
- `filename_format` MUST be `title`, `zettel`, `timestamp`, or `custom`.
- `custom_filename_template` MUST be provided and non-empty when `storage=frontmatter` and `filename_format=custom`.
- Read precedence MUST be frontmatter-first with filename fallback:
  1. mapped `title` key when present and non-empty;
  2. file basename fallback.
- If frontmatter and basename titles both exist and differ, frontmatter title MUST win.
- If `storage=filename`, canonical writes MUST treat filename as title source, MUST rename on title change, and MUST ignore `filename_format` and `custom_filename_template`.
- If `storage=frontmatter`, canonical writes SHOULD persist mapped title key; `filename_format` and `custom_filename_template` govern create-time filename generation.

Informative mapping to TaskNotes settings:

- `title.storage=filename` corresponds to `storeTitleInFilename=true`.
- `title.filename_format` corresponds to `taskFilenameFormat`.
- `title.custom_filename_template` corresponds to `customFilenameTemplate`.

## 9.14 templating schema

`templating` defines optional create-time template behavior.
This schema is required only for implementations claiming profile `templating` (§7.3.3).

Example:

```yaml
templating:
  enabled: true
  template_path: Templates/Task.md
  failure_mode: warning_fallback
  unknown_variable_policy: preserve
```

Rules:

- `enabled` MUST be boolean.
- If `enabled=true`, `template_path` MUST be provided and non-empty.
- `failure_mode` MUST be `error` or `warning_fallback` when present.
- `unknown_variable_policy` MUST be `preserve` or `empty` when present.
- If `failure_mode` is absent, effective value MUST default to `warning_fallback`.
- If `unknown_variable_policy` is absent, effective value MUST default to `preserve`.
- Implementations claiming `templating` MUST support portable double-brace variables from §5.3.5.
- Implementations not claiming `templating` MAY ignore `templating` settings.

## 9.15 reminders schema

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

## 9.16 time_tracking schema

Example:

```yaml
time_tracking:
  auto_stop_on_complete: true
  auto_stop_notification: false
```

Rules:

- `auto_stop_on_complete` MUST be boolean when present.
- `auto_stop_notification` MUST be boolean when present.
- if `auto_stop_on_complete=true`, completion-triggered stop behavior MUST follow §5.19.5.
- if `auto_stop_notification` is absent, effective value MUST default to `false`.

## 9.17 compatibility schema

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

## 9.18 Complete configuration example (`yaml_file` provider)

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
  combine: or
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
  unresolved_target_severity: warning
  require_resolved_uid_on_write: false

links:
  extensions: [".md"]
  unresolved_default_severity: warning
  update_references_on_rename: true

title:
  storage: filename

templating:
  enabled: false
  failure_mode: warning_fallback
  unknown_variable_policy: preserve

reminders:
  date_only_anchor_time: "00:00"
  apply_defaults_when_explicit: false

time_tracking:
  auto_stop_on_complete: true
  auto_stop_notification: false

compatibility:
  read_aliases: true
  legacy_duration_field: true
```

## 9.19 Configuration errors

Configuration validation MUST report structured errors with key path context.

Examples:

- no readable configuration provider available in strict mode
- required effective key unresolved after provider resolution (`spec_version` or `mapping`)
- missing `mapping.title`
- `status.default` not present in `status.values`
- unsupported `validation.mode`
- `validation.mode=permissive` but permissive mode is not implemented
- invalid `task_detection.combine`
- invalid `dependencies.default_reltype`
- invalid `dependencies.unresolved_target_severity`
- invalid `links.unresolved_default_severity`
- invalid `title.storage`
- invalid `title.filename_format`
- missing `title.custom_filename_template` when `title.storage=frontmatter` and `title.filename_format=custom`
- missing `templating.template_path` when `templating.enabled=true`
- invalid `templating.failure_mode`
- invalid `templating.unknown_variable_policy`
- invalid `reminders.date_only_anchor_time`
- invalid `time_tracking.auto_stop_on_complete`
- invalid `time_tracking.auto_stop_notification`
