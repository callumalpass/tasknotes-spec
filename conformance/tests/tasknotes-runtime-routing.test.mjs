import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadAdapter } from "../lib/adapter-loader.mjs";
import { loadFixtures } from "../lib/load-fixtures.mjs";

const runtimeOperations = [
  "archive.apply",
  "create_compat.create",
  "dependency.validate_entry",
  "dependency.validate_set",
  "dependency.add",
  "dependency.remove",
  "dependency.replace",
  "dependency.missing_target_behavior",
  "op.complete_nonrecurring",
  "op.uncomplete_nonrecurring",
  "recurrence.complete",
  "recurrence.recalculate",
  "recurrence.uncomplete_instance",
  "recurrence.skip_instance",
  "recurrence.unskip_instance",
  "recurrence.effective_state",
  "rename.title_storage_interaction",
  "reminder.validate_entry",
  "reminder.validate_set",
  "reminder.add",
  "reminder.update",
  "reminder.remove",
  "time.start",
  "time.stop",
  "time.remove_entry",
];

test("tasknotes: runtime-routed operation coverage", async (t) => {
  if (!process.env.TASKNOTES_ADAPTER) {
    t.skip("Set TASKNOTES_ADAPTER to validate adapter-specific runtime routing.");
    return;
  }

  const adapter = await loadAdapter();
  if (adapter.metadata?.implementation !== "tasknotes") {
    t.skip("Runtime routing guard is only enforced for the tasknotes adapter.");
    return;
  }

  for (const operation of runtimeOperations) {
    const envelope = await adapter.execute("meta.route_probe", { operation });
    assert.equal(envelope.ok, true, `route probe failed for operation: ${operation}`);
    assert.equal(
      envelope.result?.runtime,
      true,
      `operation is no longer runtime-routed: ${operation}`,
    );
  }

  const fixtures = loadFixtures(resolve(process.cwd(), "conformance", "fixtures"));
  const runtimeFixtureCount = fixtures.filter((fixture) => runtimeOperations.includes(fixture.operation)).length;
  assert.equal(
    runtimeFixtureCount >= 2300,
    true,
    `Expected at least 2300 runtime-routed fixtures, got ${runtimeFixtureCount}`,
  );
});
