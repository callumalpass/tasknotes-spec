# Changelog

## 0.3.0-rc.1 - 2026-07-28

- adopt the discriminated first-class mdbase contract shape for
  `tasknotes.task`, including explicit `contract_type: record`
- add the `tasknotes.task.completed 1.0.0` event contract and minimal
  privacy-preserving event-data schema for the mdbase interoperability profile
- separate type-file record implementation bindings from application-level
  event-source declarations

## 0.2.0-draft - 2026-05-31

- add optional `materialized-occurrences` profile for recurrence occurrence notes, on-completion materialization, and occurrence-state reconciliation
- add optional NLP trigger configuration so TaskNotes clients can share capture
  suggestion vocabulary
- replace the private `x-tasknotes` discovery envelope with the first-class
  `tasknotes.task 0.2.0` mdbase data contract, portable task-view schema, and
  implementation binding schema
- document the precedence and consistency rules between JSON Schema,
  `collection`, `lifecycle`, contract field mappings, and TaskNotes behavior

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
