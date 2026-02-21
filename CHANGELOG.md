# Changelog

## 0.1.0-draft - 2026-02-20

Initial standalone draft of `tasknotes-spec` including:

- motivation, scope, and normative conventions
- terminology
- task model and field mapping
- temporal semantics
- recurrence semantics
- operation semantics
- validation model
- conformance profiles
- compatibility and migration policy
- collection configuration schema and provider model (`tasknotes.yaml`, TaskNotes `data.json`)
- full dependency (`blocked_by`) semantics
- full reminder (`reminders`) semantics
- explicit time-tracking management semantics (`time_entries` lifecycle, start/stop/edit/remove, and completion-triggered auto-stop configuration)
- explicit links chapter and link-resolution rules for projects/dependencies
- optional `templating` conformance profile with create-time template expansion/merge semantics
