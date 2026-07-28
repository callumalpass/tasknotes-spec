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

test("publishes valid JSON Schemas for the portable task view and binding", async () => {
	const ajv = new Ajv2020({ allErrors: true, strict: true });
	addFormats(ajv);
	const taskSchema = await schema("tasknotes-task.schema.json");
	const bindingSchema = await schema("tasknotes-task-binding.schema.json");
	const validateTask = ajv.compile(taskSchema);
	const validateBinding = ajv.compile(bindingSchema);

	assert.equal(
		validateTask({
			title: "Ship contracts",
			status: "open",
			dateCreated: "2026-07-28T09:00:00+10:00",
		}),
		true,
		validateTask.errors
	);
	assert.equal(validateTask({ status: "open" }), false);

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
});

test("the published contract uses one exact identity and the canonical schemas", async () => {
	const contract = await readFile(
		new URL("../../mdbase/tasknotes.task.md", import.meta.url),
		"utf8"
	);
	assert.match(contract, /^kind: mdbase\.contract$/m);
	assert.match(contract, /^id: tasknotes\.task$/m);
	assert.match(contract, /^version: 0\.2\.0$/m);
	assert.match(contract, /ref: \.\.\/schemas\/tasknotes-task\.schema\.json/);
	assert.match(
		contract,
		/ref: \.\.\/schemas\/tasknotes-task-binding\.schema\.json/
	);
});
