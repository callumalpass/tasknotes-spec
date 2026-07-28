---
kind: mdbase.contract
contract_type: event
id: tasknotes.task.completed
version: 1.0.0
name: TaskNotes task completed
description: A TaskNotes task moved from a non-completed status to a completed status.
data_schema:
  dialect: json-schema-2020-12
  ref: ../schemas/tasknotes-task-completed.schema.json
---

# TaskNotes task-completed event

TaskNotes implementations emit this event once for each observed transition
from a non-completed status to a completed status. The event is a signal, not
a task snapshot: consumers that need current task state should retrieve the
record through an authorized TaskNotes or mdbase API.
