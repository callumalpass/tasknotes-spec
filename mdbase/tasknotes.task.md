---
kind: mdbase.contract
id: tasknotes.task
version: 0.2.0
name: TaskNotes task
description: Portable task data and behavior defined by tasknotes-spec 0.2.0.
schema:
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
