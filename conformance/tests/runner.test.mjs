import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadFixtures } from "../lib/load-fixtures.mjs";
import { loadAdapter } from "../lib/adapter-loader.mjs";
import { applyAssertion } from "../lib/matchers.mjs";

const fixturesDir = resolve(process.cwd(), "conformance", "fixtures");
const fixtures = loadFixtures(fixturesDir);
const adapterPath = process.env.TASKNOTES_ADAPTER;
const requireFullCoverage = process.env.CONFORMANCE_REQUIRE_FULL_COVERAGE === "1";
let adapterPromise;

function expandProfiles(claimedProfiles) {
  const expanded = new Set(Array.isArray(claimedProfiles) ? claimedProfiles : []);
  if (expanded.has("extended")) {
    expanded.add("recurrence");
    expanded.add("core-lite");
  }
  if (expanded.has("recurrence")) {
    expanded.add("core-lite");
  }
  return expanded;
}

async function getAdapter(t) {
  if (!adapterPath) {
    t.skip("Set TASKNOTES_ADAPTER to run adapter-backed conformance fixtures.");
    return null;
  }
  if (!adapterPromise) {
    adapterPromise = loadAdapter();
  }
  return adapterPromise;
}

test("conformance: adapter metadata", async (t) => {
  const adapter = await getAdapter(t);
  if (!adapter) return;
  const { metadata } = adapter;
  assert.equal(typeof metadata.implementation, "string");
  assert.equal(typeof metadata.version, "string");
  assert.equal(Array.isArray(metadata.profiles), true);
  assert.equal(Array.isArray(metadata.capabilities), true);
});

test(`conformance: run ${fixtures.length} fixture cases`, async (t) => {
  const adapter = await getAdapter(t);
  if (!adapter) return;
  const { metadata, execute } = adapter;
  const effectiveProfiles = expandProfiles(metadata.profiles);
  let executedCount = 0;

  for (const fixture of fixtures) {
    await t.test(`${fixture.id} ${fixture.operation}`, async () => {
      if (!effectiveProfiles.has(fixture.profile)) {
        if (requireFullCoverage) {
          assert.fail(
            `adapter ${metadata.implementation} missing profile for fixture ${fixture.id}: ${fixture.profile}`,
          );
        }
        t.skip(
          `adapter ${metadata.implementation} missing profile for fixture: ${fixture.profile}`,
        );
        return;
      }

      const hasCapability = !fixture.requires
        || fixture.requires.every((cap) => metadata.capabilities.includes(cap));

      if (!hasCapability) {
        if (requireFullCoverage) {
          assert.fail(
            `adapter ${metadata.implementation} missing capability for fixture ${fixture.id}: ${fixture.requires.join(", ")}`,
          );
        }
        t.skip(`adapter ${metadata.implementation} missing capability: ${fixture.requires.join(", ")}`);
        return;
      }

      const envelope = await execute(fixture.operation, fixture.input);
      executedCount += 1;
      applyAssertion(fixture, envelope);
    });
  }

  if (requireFullCoverage) {
    assert.equal(
      executedCount,
      fixtures.length,
      `Expected all fixtures to execute when CONFORMANCE_REQUIRE_FULL_COVERAGE=1; executed ${executedCount}/${fixtures.length}`,
    );
  }
});

test("conformance: adapter path is resolvable", async (t) => {
  const adapter = await getAdapter(t);
  if (!adapter) return;
  const { absPath } = adapter;
  assert.equal(typeof absPath, "string");
  assert.equal(absPath.length > 0, true);
});
