---
kind: mdbase.contract
contract_type: record
id: tasknotes.task
version: 0.3.0-rc.4
name: TaskNotes task
description: Portable task data and behavior defined by tasknotes-spec 0.3.0-rc.4.
record_schema:
  dialect: json-schema-2020-12
  ref: ../schemas/tasknotes-task.schema.json
binding_schema:
  dialect: json-schema-2020-12
  ref: ../schemas/tasknotes-task-binding.schema.json
---

# TaskNotes task contract

Types implement this contract with an `implements` entry in their mdbase type
file. The `fields` map adapts custom frontmatter names to this portable view;
the `binding` object supplies TaskNotes behavior.

`assignees` is an optional unique list of stable `mdbase.person` IDs. Missing or
empty means unassigned. Match IDs exactly; do not use names, email addresses,
file links, account subjects, or membership IDs. References to absent people
remain stored and visible as unresolved assignments. Assignments do not grant
collection access or imply write permission. Materialized occurrences inherit
the parent's assignments. Clearing an assignment writes an empty list.

Applications resolve "Assigned to me" by matching the authenticated caller's
issuer/subject against Person contract records. Multiple matching records or
duplicate person IDs are ambiguous, never a reason to choose the first result.
Unavailable identity or person queries must not masquerade as unassigned work.
