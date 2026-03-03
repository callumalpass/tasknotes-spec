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
- winning object values replace lower-precedence object values as whole objects (no implicit deep merge),
- after top-level selection, implementations MUST apply documented schema defaults for missing nested keys before exposing effective configuration.

If an implementation supports deep-merge behavior, it MUST be explicitly documented and deterministic.

### 9.2.3 Strict vs permissive provider behavior

In strict mode:

- failure to resolve required effective keys (`spec_version`, `mapping`) MUST be a configuration error.

If permissive mode is implemented, then in permissive mode:

- implementations MAY continue with defaults when providers are missing/unreadable,
- implementations MUST emit configuration warnings,
- implementations MUST disclose that effective configuration is partial/default-derived.

### 9.2.4 TaskNotes plugin provider (`data.json`)

The TaskNotes plugin stores settings in `.obsidian/plugins/tasknotes/data.json` within the vault root. When using this file as a configuration provider, normalization MUST apply the field mapping in the table below.

**Key mapping table** (`data.json` key → spec effective config):

| `data.json` key | Spec key | Notes |
|---|---|---|
| `fieldMapping` | `mapping` | Normalize role names: `dateCreated`→`date_created`, `completedDate`→`completed_date`, `recurrenceAnchor`→`recurrence_anchor`, `completeInstances`→`complete_instances`, `skippedInstances`→`skipped_instances`, `blockedBy`→`blocked_by`, `timeEntries`→`time_entries`, `timeEstimate`→`time_estimate` |
| `storeTitleInFilename` | `title.storage` | `true` → `"filename"`, `false` → `"frontmatter"` |
| `taskFilenameFormat` | `title.filename_format` | Values: `"title"`, `"zettel"`, `"timestamp"`, `"custom"`; used only when `title.storage=frontmatter` |
| `customFilenameTemplate` | `title.custom_filename_template` | Template string, e.g. `"{title}"`; used only when `title.storage=frontmatter` and `filename_format=custom` |
| `taskCreationDefaults.useBodyTemplate` | `templating.enabled` | boolean |
| `taskCreationDefaults.bodyTemplate` | `templating.template_path` | Path to template file |
| `customStatuses[*].value` | `status.values` | Ordered array of status value strings |
| `defaultTaskStatus` | `status.default` | Default status string |
| `customStatuses[isCompleted=true][*].value` | `status.completed_values` | Statuses where `isCompleted: true` |
| `defaultTaskPriority` | `defaults.priority` | Default priority string |
| `autoStopTimeTrackingOnComplete` | `time_tracking.auto_stop_on_complete` | boolean |
| `autoStopTimeTrackingNotification` | `time_tracking.auto_stop_notification` | boolean |
| `taskIdentificationMethod` | `task_detection.method` | `"tag"` or `"property"` |
| `taskTag` | `task_detection.tag` | Tag string used when `method="tag"` |
| `taskPropertyName` | `task_detection.property_name` | Frontmatter key used when `method="property"` |
| `taskPropertyValue` | `task_detection.property_value` | Expected value; empty means key must exist |
| `tasksFolder` | `task_detection.default_folder` | Default folder for new tasks |
| `excludedFolders` | `task_detection.excluded_folders` | Comma-separated folder paths to exclude |
| `moveArchivedTasks` | `archive.move_on_archive` | boolean |
| `archiveFolder` | `archive.folder` | Archive destination folder |
| `useFrontmatterMarkdownLinks` | `links.use_markdown_format` | boolean; see §11 |

**Key `data.json` fields with defaults** (for cold-start reading of a vault with no `tasknotes.yaml`):

| Field | Type | Default | Meaning |
|---|---|---|---|
| `tasksFolder` | string | `"TaskNotes/Tasks"` | Default folder for new task files |
| `taskIdentificationMethod` | `"tag" \| "property"` | `"tag"` | How task files are identified |
| `taskTag` | string | `"task"` | Tag that identifies task files (when `method="tag"`) |
| `taskPropertyName` | string | `""` | Frontmatter key for property-based identification |
| `taskPropertyValue` | string | `""` | Expected value for property-based identification (empty = key presence) |
| `storeTitleInFilename` | boolean | `true` | Title storage mode |
| `taskFilenameFormat` | `"title" \| "zettel" \| "timestamp" \| "custom"` | `"zettel"` | Filename generation format |
| `customFilenameTemplate` | string | `"{title}"` | Template for `"custom"` filename format |
| `defaultTaskStatus` | string | `"open"` | Default status on create |
| `defaultTaskPriority` | string | `"normal"` | Default priority on create |
| `customStatuses` | StatusConfig[] | see §9.20 | Ordered status definitions |
| `autoStopTimeTrackingOnComplete` | boolean | `true` | Auto-stop active session on completion |
| `autoStopTimeTrackingNotification` | boolean | `false` | Show notification when auto-stopping |
| `useFrontmatterMarkdownLinks` | boolean | `false` | Use markdown links in frontmatter (requires obsidian-frontmatter-markdown-links plugin) |
| `moveArchivedTasks` | boolean | `false` | Move task file to archive folder on archive |
| `archiveFolder` | string | `"TaskNotes/Archive"` | Archive destination folder |
| `excludedFolders` | string | `""` | Comma-separated folders to exclude from task indexing |

**StatusConfig object shape:**

```json
{
  "id": "done",
  "value": "done",
  "label": "Done",
  "color": "#00aa00",
  "isCompleted": true,
  "order": 3,
  "autoArchive": false,
  "autoArchiveDelay": 5
}
```

`spec_version` is not present in `data.json`. Implementations MUST synthesize an effective `spec_version` as described in §9.5.

Provider keys not listed above MAY be ignored by `tasknotes-spec` consumers.

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
Pre-release identifiers are valid (for example `0.1.0-draft`).

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

If semantic role `id` is supported (§2.6.5), mapping SHOULD include `id`.

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

`task_detection` controls how task files are identified within the vault.

### Detection methods

The tasknotes plugin natively supports two identification methods, controlled by `taskIdentificationMethod` in `data.json` (mapped to `task_detection.method`):

**`tag` (default)** — A markdown file is a task if it contains the configured tag (default `#task`) in its frontmatter `tags` array or inline in the body. Configured by `task_detection.tag`.

**`property`** — A markdown file is a task if a specified frontmatter property has a specified value (or exists, if value is empty). Configured by `task_detection.property_name` and `task_detection.property_value`.

Schema and selection rules:

1. `task_detection` MAY specify either:
   - `method` (single-method form), or
   - `methods` (multi-method form; non-empty list).
2. If both are present, `methods` MUST take precedence and implementations SHOULD emit a configuration warning.
3. If neither is present, effective detection method MUST default to `tag`.
4. `method` MUST be `tag` or `property`.
5. `methods` entries MUST be unique and MUST be from:
   - `tag`
   - `property`
   - `path_glob`
   - `field_presence`
   - `field_match`
6. Method-specific required keys:
   - when `tag` is enabled, effective `task_detection.tag` MUST be non-empty (default `task` when absent);
   - when `property` is enabled, `task_detection.property_name` MUST be provided and non-empty; `task_detection.property_value` MAY be empty (empty means key-exists semantics).
7. If `methods` has more than one entry, `task_detection.combine` controls combination semantics (§9.7.3). If omitted, it MUST default to `or`.

### 9.7.1 Tag matching semantics

When `task_detection.method=tag`, matching MUST follow these rules:

1. Normalize configured `task_detection.tag` by stripping one leading `#` when present.
2. Compare tag names case-insensitively after normalization.
3. Frontmatter matching:
   - `tags` MAY be a list of strings or a single string.
   - each tag value is normalized by trimming surrounding whitespace and stripping one leading `#`.
   - match requires exact normalized equality (for example `task` matches `#task`; `task` does not match `tasking`).
4. Body matching:
   - only markdown text outside fenced code blocks and inline code spans is considered,
   - a match requires a hashtag token with exact normalized name (for example `#task`),
   - partial-word matches MUST NOT count (for example `#tasking` does not match configured `task`).

If either frontmatter or body matches, the file is identified as a task.

### 9.7.2 Property matching semantics

When property detection is enabled (`method=property` or `methods` includes `property`):

1. `task_detection.property_name` MUST name the frontmatter key to inspect.
2. If `task_detection.property_value` is non-empty, match requires semantic equality with the configured value.
3. If `task_detection.property_value` is empty or absent, match requires key presence only.

### 9.7.3 Multi-method extension semantics

`tasknotes.yaml`-level providers MAY additionally support:

- `path_glob` (example: `tasks/**/*.md`)
- `field_presence` (example: required key `status`)
- `field_match` (example: `type == "task"`)

Extension-key shape:

- `path_glob`: string or list<string> of collection-relative glob patterns.
- `field_presence`: string or list<string> of required frontmatter keys.
- `field_match`: object map of `key -> expected scalar value` for exact semantic equality checks.

If multiple methods are configured in `tasknotes.yaml`, `task_detection.combine` MUST define combinator semantics:

- `or` (default): file is a task if any enabled method matches.
- `and`: file is a task only if all enabled methods match.

If `task_detection.combine` is absent, implementations MUST default to `or`.

Implementations MUST exclude folders listed in `task_detection.excluded_folders` from task indexing.

Executable conformance: adapters participating in the fixture suite SHOULD expose `config.detect_task_file` to evaluate these detection semantics against fixture inputs.

Example (`tasknotes.yaml`, equivalent to tag-based default):

```yaml
task_detection:
  method: tag
  tag: task
  default_folder: TaskNotes/Tasks
```

Example (property-based):

```yaml
task_detection:
  method: property
  property_name: type
  property_value: task
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
- `treat_missing_target_as_blocked` controls whether missing/unresolvable dependency targets contribute to blocked-state evaluation (§10.2.5).
- If `treat_missing_target_as_blocked` is absent, effective value MUST default to `true`.
- `enforce_unique_uid=true` enforces uniqueness at validation/write time.
- If `enforce_unique_uid` is absent, effective value MUST default to `true`.
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
- when `storage=frontmatter`, `filename_format` MUST be `title`, `zettel`, `timestamp`, or `custom`.
- when `storage=frontmatter` and `filename_format=custom`, `custom_filename_template` MUST be provided and non-empty.
- when `storage=filename`, `filename_format` and `custom_filename_template` MAY be present for compatibility input but MUST be ignored for canonical write behavior.
- Read precedence MUST be storage-mode-aware:
  1. when `storage=frontmatter`, use mapped `title` key when present and non-empty, then file basename fallback;
  2. when `storage=filename`, use file basename first, then mapped `title` fallback when basename is unavailable.
- If frontmatter and basename titles both exist and differ, the source authoritative for active `storage` MUST win.
- If `storage=filename`, canonical writes MUST treat filename as title source, MUST rename on title change, and MUST ignore `filename_format` and `custom_filename_template`.
- If `storage=frontmatter`, canonical writes MUST persist mapped title key; `filename_format` and `custom_filename_template` govern create-time filename generation.

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
- `apply_defaults_when_explicit` MUST be boolean when present.
- if `apply_defaults_when_explicit` is absent, effective value MUST default to `false`.
- `apply_defaults_when_explicit=false` means explicit input reminders replace default-reminder application at create time.
- `apply_defaults_when_explicit=true` means explicit create-time reminders are merged with defaults using §10.3.9 deterministic merge rules.

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
- `legacy_local_datetime_input=true` MAY relax strict parsing for offset-less datetimes only in permissive mode; strict mode parsing rules in §3.4.2 still apply.
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
- invalid `task_detection.method`
- invalid `task_detection.methods` entry
- empty `task_detection.tag` when `tag` method is enabled
- missing `task_detection.property_name` when `property` method is enabled
- invalid `task_detection.combine`
- invalid `dependencies.default_reltype`
- invalid `dependencies.unresolved_target_severity`
- invalid `links.unresolved_default_severity`
- invalid `title.storage`
- invalid `title.filename_format`
- missing `title.filename_format` when `title.storage=frontmatter`
- missing `title.custom_filename_template` when `title.storage=frontmatter` and `title.filename_format=custom`
- missing `templating.template_path` when `templating.enabled=true`
- invalid `templating.failure_mode`
- invalid `templating.unknown_variable_policy`
- invalid `reminders.date_only_anchor_time`
- invalid `reminders.apply_defaults_when_explicit`
- invalid `time_tracking.auto_stop_on_complete`
- invalid `time_tracking.auto_stop_notification`

## 9.20 Default collection state

This section describes what a fresh tasknotes vault looks like before any user customization. Implementations that read an existing tasknotes vault without a `tasknotes.yaml` SHOULD apply these defaults when `data.json` is absent or fields are missing.

### Folder layout

```text
MyVault/
├── TaskNotes/
│   ├── Tasks/          ← new tasks created here by default
│   └── Archive/        ← archived tasks moved here (if moveArchivedTasks=true)
└── .obsidian/
    └── plugins/
        └── tasknotes/
            └── data.json
```

### Task detection

Default method: `tag`. A file is a task if it contains the tag `#task` in its frontmatter `tags` array or inline in the body.

### Default field mapping

| Semantic role | Default storage key |
|---|---|
| `title` | `title` |
| `status` | `status` |
| `priority` | `priority` |
| `due` | `due` |
| `scheduled` | `scheduled` |
| `contexts` | `contexts` |
| `projects` | `projects` |
| `time_estimate` | `timeEstimate` |
| `completed_date` | `completedDate` |
| `date_created` | `dateCreated` |
| `date_modified` | `dateModified` |
| `recurrence` | `recurrence` |
| `recurrence_anchor` | `recurrence_anchor` |
| `complete_instances` | `complete_instances` |
| `skipped_instances` | `skipped_instances` |
| `time_entries` | `timeEntries` |
| `blocked_by` | `blockedBy` |
| `reminders` | `reminders` |

Note: `recurrenceAnchor`, `completeInstances`, and `skippedInstances` are accepted as aliases on read (§2.5). The mixed camelCase/snake_case defaults are intentional for compatibility with historical TaskNotes frontmatter.

### Default statuses

| Value | Label | `isCompleted` | Order |
|---|---|---|---|
| `none` | None | false | 0 |
| `open` | Open | false | 1 |
| `in-progress` | In progress | false | 2 |
| `done` | Done | true | 3 |

Default status on create: `open`. Default completed status (first `isCompleted=true`): `done`.

### Default priorities

| Value | Label | Weight |
|---|---|---|
| `none` | None | 0 |
| `low` | Low | 1 |
| `normal` | Normal | 2 |
| `high` | High | 3 |

Default priority on create: `normal`.

### Title and filename defaults

- `title.storage`: `filename` (titles stored in filename, not frontmatter)
- TaskNotes `data.json` may contain `taskFilenameFormat` (default `zettel`), but this value is ignored by canonical writes while `title.storage=filename`
- Title is read from filename first; frontmatter `title` is compatibility fallback when filename-derived title is unavailable (§2.2.2)

### Time tracking defaults

- `auto_stop_on_complete`: `true`
- `auto_stop_notification`: `false`

### Link format defaults

- `useFrontmatterMarkdownLinks`: `false` — wikilinks used by default (e.g. `[[task-name]]`)
- To use markdown link format, the `obsidian-frontmatter-markdown-links` plugin must also be installed

### Effective configuration for a minimal fresh vault

When neither `data.json` nor `tasknotes.yaml` is present, implementations MUST use the following effective configuration:

```yaml
spec_version: 0.1.0-draft   # synthesized
mapping:
  title: title
  status: status
  priority: priority
  due: due
  scheduled: scheduled
  contexts: contexts
  projects: projects
  time_estimate: timeEstimate
  completed_date: completedDate
  date_created: dateCreated
  date_modified: dateModified
  recurrence: recurrence
  recurrence_anchor: recurrence_anchor
  complete_instances: complete_instances
  skipped_instances: skipped_instances
  time_entries: timeEntries
  blocked_by: blockedBy
  reminders: reminders
task_detection:
  method: tag
  tag: task
  default_folder: TaskNotes/Tasks
status:
  values: [none, open, in-progress, done]
  default: open
  completed_values: [done]
title:
  storage: filename
time_tracking:
  auto_stop_on_complete: true
  auto_stop_notification: false
links:
  use_markdown_format: false
  extensions: [".md"]
  unresolved_default_severity: warning
  update_references_on_rename: true
```
