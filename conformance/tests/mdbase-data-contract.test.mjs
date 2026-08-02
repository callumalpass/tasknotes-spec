import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

async function schema(name) {
	return JSON.parse(
		await readFile(new URL(`../../schemas/${name}`, import.meta.url), "utf8")
	);
}

test("publishes valid JSON Schemas for the portable task view, binding, and completion event", async () => {
	const ajv = new Ajv2020({ allErrors: true, strict: true });
	addFormats(ajv);
	const taskSchema = await schema("tasknotes-task.schema.json");
	const bindingSchema = await schema("tasknotes-task-binding.schema.json");
	const completedSchema = await schema("tasknotes-task-completed.schema.json");
	const validateTask = ajv.compile(taskSchema);
	const validateBinding = ajv.compile(bindingSchema);
	const validateCompleted = ajv.compile(completedSchema);

	assert.equal(
		validateTask({
			title: "Ship contracts",
			status: "open",
			due: "2026-07-28",
			scheduled: "2026-07-28T09:00:00+10:00",
			dateCreated: "2026-07-28T09:00:00+10:00",
		}),
		true,
		validateTask.errors
	);
	assert.equal(
		validateTask({
			status: "open",
			due: "2026-07-28T17:00:00Z",
			scheduled: "2026-07-28",
			dateCreated: "2026-07-28T09:00:00Z",
		}),
		true,
		validateTask.errors
	);
	assert.equal(
		validateTask({
			status: "open",
			due: "2026-07-28 17:00",
			dateCreated: "2026-07-28T09:00:00Z",
		}),
		false,
		"due still rejects malformed datetimes"
	);
	assert.equal(validateTask({ status: "open" }), false);
	assert.equal(
		validateTask({
			title: "Ranked task",
			status: "open",
			dateCreated: "2026-08-02T09:00:00Z",
			sortOrder: "a0V",
		}),
		true,
		validateTask.errors
	);
	assert.equal(
		validateTask({
			title: "Legacy numeric rank",
			status: "open",
			dateCreated: "2026-08-02T09:00:00Z",
			sortOrder: 1,
		}),
		false,
		"manual order is an opaque string rank"
	);

	const binding = {
		profiles: ["core-lite"],
		capabilities: ["archive"],
		title: { storage: "frontmatter", filename_format: "title" },
		status: {
			values: ["open", "done"],
			default: "open",
			completed_values: ["done"],
			definitions: [],
		},
		priority: {
			values: ["normal"],
			default: "normal",
			definitions: [],
		},
		recurrence: {
			syntax: "tasknotes",
			maintain_due_date_offset: false,
			reset_body_checkboxes: false,
		},
		occurrences: {
			identity_roles: ["recurrenceParent", "occurrenceDate"],
			default_materialization: "manual",
			default_next_trigger: "completion",
		},
		links: {
			accepted_formats: ["wikilink", "markdown"],
			write_format: "wikilink",
		},
		archive: {
			archived_tag: "archived",
			move_on_archive: false,
		},
		time_tracking: { auto_stop_on_complete: true },
		templating: { enabled: false, occurrence_enabled: false },
	};
	assert.equal(validateBinding(binding), true, validateBinding.errors);
	assert.equal(
		validateBinding({ ...binding, contract: "tasknotes.task" }),
		false,
		"the old private discovery envelope is deliberately rejected"
	);
	assert.equal(
		validateCompleted({
			task_id: "Tasks/Ship contracts.md",
			task_path: "Tasks/Ship contracts.md",
			title: "Ship contracts",
			status: "done",
			completed_at: "2026-07-28T09:30:00+10:00",
		}),
		true,
		validateCompleted.errors
	);
	assert.equal(validateCompleted({ task_path: "Tasks/Ship contracts.md" }), false);
});

test("the published contract uses one exact identity and the canonical schemas", async () => {
	const contract = await readFile(
		new URL("../../mdbase/tasknotes.task.md", import.meta.url),
		"utf8"
	);
	assert.match(contract, /^kind: mdbase\.contract$/m);
	assert.match(contract, /^id: tasknotes\.task$/m);
	assert.match(contract, /^contract_type: record$/m);
	assert.match(contract, /^version: 0\.3\.0-rc\.3$/m);
	assert.match(contract, /^record_schema:$/m);
	assert.match(contract, /ref: \.\.\/schemas\/tasknotes-task\.schema\.json/);
	assert.match(
		contract,
		/ref: \.\.\/schemas\/tasknotes-task-binding\.schema\.json/
	);
});

test("publishes the completion event as a first-class event contract", async () => {
	const contract = await readFile(
		new URL("../../mdbase/tasknotes.task.completed.md", import.meta.url),
		"utf8"
	);
	assert.match(contract, /^kind: mdbase\.contract$/m);
	assert.match(contract, /^contract_type: event$/m);
	assert.match(contract, /^id: tasknotes\.task\.completed$/m);
	assert.match(contract, /^version: 1\.0\.0$/m);
	assert.match(contract, /^data_schema:$/m);
	assert.match(
		contract,
		/ref: \.\.\/schemas\/tasknotes-task-completed\.schema\.json/
	);
	assert.doesNotMatch(contract, /^binding_schema:/m);
});
