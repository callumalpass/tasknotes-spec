---
kind: mdbase.contract
contract_type: record
id: tasknotes.task
version: 0.3.0-rc.5
name: TaskNotes task
description: Portable task data and behavior defined by tasknotes-spec 0.3.0-rc.5.
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

`assignees` is an optional unique list of links to records implementing
`mdbase.person`, for example `"[[Alex Rivera]]"` or `"[[people/alex-rivera]]"`.
Missing or empty means unassigned. An implementing type MUST declare its
assignees field as a link list in `collection.links` (for example
`assignees[]: {}`) so every reader resolves it with the collection's own link
rules. Resolve assignees with mdbase link resolution, never by comparing link
text, names, email addresses, account subjects, or membership IDs. A link that
does not resolve to a Person record remains stored and visible as an unresolved
assignment. Renaming a person record updates references through ordinary
rename reference updates. Assignments do not grant collection access or imply
write permission. Materialized occurrences inherit the parent's assignments.
Clearing an assignment writes an empty list.

Applications resolve "Assigned to me" by matching the authenticated caller's
issuer/subject against Person contract records, then selecting tasks whose
assignee links resolve to that record. Multiple matching Person records are
ambiguous, never a reason to choose the first result. Unavailable identity or
person queries must not masquerade as unassigned work.
