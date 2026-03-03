import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), "conformance", "manifest.json"), "utf8"),
);
const templatingFixtures = JSON.parse(
  readFileSync(resolve(process.cwd(), "conformance", "fixtures", "templating.json"), "utf8"),
);

const requiredSections = [
  "§2",
  "§3",
  "§4",
  "§5.2",
  "§5.2.1",
  "§5.3",
  "§5.3.5",
  "§5.4",
  "§5.5",
  "§5.6",
  "§5.7",
  "§5.8",
  "§5.9",
  "§5.10.1",
  "§5.10.2",
  "§5.10.3",
  "§5.11.1",
  "§5.11.2",
  "§5.11.3",
  "§5.12",
  "§5.13",
  "§5.14",
  "§5.15",
  "§5.16",
  "§5.17",
  "§5.18",
  "§5.19.1",
  "§5.19.2",
  "§5.19.3",
  "§5.19.4",
  "§5.19.5",
  "§5.19.6",
  "§5.21",
  "§6",
  "§7.10",
  "§7.11",
  "§8.2",
  "§8.3",
  "§8.4",
  "§8.5",
  "§8.6",
  "§8.7",
  "§8.8",
  "§8.9",
  "§8.10",
  "§8.11",
  "§8.12",
  "§8.13",
  "§8.14",
  "§9",
  "§9.7.1",
  "§9.2.3",
  "§9.2.4",
  "§9.19",
  "§9.20",
  "§10",
  "§11",
  "§11.5",
  "§11.7",
];

const sectionMinimums = {
  "§2": 100,
  "§3": 1200,
  "§4": 800,
  "§5.3": 250,
  "§6": 50,
  "§9": 500,
  "§9.7.1": 10,
  "§10": 800,
  "§11": 10,
  "§11.3": 20,
  "§11.6": 2,
};

const operationMinimums = {
  "date.parse_utc": 300,
  "date.parse_local": 300,
  "date.validate": 300,
  "recurrence.complete": 500,
  "recurrence.recalculate": 150,
  "config.resolve_collection_path": 500,
  "config.detect_task_file": 10,
  "validation.core_evaluate": 40,
  "dependency.validate_entry": 300,
  "reminder.validate_entry": 500,
  "link.parse": 20,
  "link.resolve": 10,
  "link.update_references_on_rename": 2,
  "templating.expand_variables": 5,
};

const fixtureFileMinimums = {
  "date.json": 1000,
  "recurrence.json": 500,
  "config.json": 300,
  "operations.json": 80,
  "dependencies.json": 200,
  "reminders.json": 300,
  "links.json": 30,
};

test("conformance coverage: required sections represented", () => {
  for (const section of requiredSections) {
    const count = manifest.bySection?.[section] || 0;
    assert.ok(count > 0, `Expected at least one fixture for ${section}`);
  }
});

test("conformance coverage: key section depth thresholds", () => {
  for (const [section, minimum] of Object.entries(sectionMinimums)) {
    const count = manifest.bySection?.[section] || 0;
    assert.ok(
      count >= minimum,
      `Expected at least ${minimum} fixtures for ${section}, got ${count}`,
    );
  }
});

test("conformance coverage: operation surface is broad", () => {
  const operations = Object.keys(manifest.byOperation || {});
  assert.ok(operations.length >= 70, `Expected at least 70 operations, got ${operations.length}`);
});

test("conformance coverage: key operation depth thresholds", () => {
  for (const [operation, minimum] of Object.entries(operationMinimums)) {
    const count = manifest.byOperation?.[operation] || 0;
    assert.ok(
      count >= minimum,
      `Expected at least ${minimum} fixtures for operation ${operation}, got ${count}`,
    );
  }
});

test("conformance coverage: key fixture file depth thresholds", () => {
  const fileCounts = new Map((manifest.files || []).map((entry) => [entry.file, entry.cases]));
  for (const [file, minimum] of Object.entries(fixtureFileMinimums)) {
    const count = fileCounts.get(file) || 0;
    assert.ok(
      count >= minimum,
      `Expected at least ${minimum} fixtures in ${file}, got ${count}`,
    );
  }
});

test("conformance coverage: meta and operation-interface ops represented", () => {
  const requiredOperations = [
    "meta.claim",
    "meta.has_capability",
    "meta.has_profile",
    "op.mutate_with_validation",
    "op.atomic_write",
    "op.idempotency_check",
    "op.update_patch",
    "op.complete_nonrecurring",
    "op.uncomplete_nonrecurring",
    "op.error_shape",
  ];

  for (const operation of requiredOperations) {
    const count = manifest.byOperation?.[operation] || 0;
    assert.ok(count > 0, `Expected at least one fixture for operation ${operation}`);
  }
});

test("conformance coverage: required templating variables represented", () => {
  const requiredVariables = [
    "title",
    "status",
    "priority",
    "dueDate",
    "scheduledDate",
    "details",
    "contexts",
    "tags",
    "hashtags",
    "timeEstimate",
    "parentNote",
    "date",
    "time",
    "year",
    "month",
    "day",
  ];
  const covered = new Set();

  for (const fixture of templatingFixtures) {
    if (fixture.operation !== "templating.expand_variables") continue;
    const template = String(fixture.input?.template || "");
    for (const variable of requiredVariables) {
      if (template.includes(`{{${variable}}}`)) {
        covered.add(variable);
      }
    }
  }

  for (const variable of requiredVariables) {
    assert.ok(covered.has(variable), `Expected templating coverage for variable {{${variable}}}`);
  }
});
