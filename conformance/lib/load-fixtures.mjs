import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function loadFixtures(fixturesDir) {
  const validProfiles = new Set(["core-lite", "recurrence", "extended", "templating"]);
  const files = readdirSync(fixturesDir)
    .filter((name) => name.endsWith(".json"))
    .sort();

  const all = [];
  for (const name of files) {
    const fullPath = join(fixturesDir, name);
    const parsed = JSON.parse(readFileSync(fullPath, "utf8"));
    if (!Array.isArray(parsed)) {
      throw new Error(`Fixture file must contain an array: ${fullPath}`);
    }
    for (const entry of parsed) {
      all.push(entry);
    }
  }

  const ids = new Set();
  for (const fixture of all) {
    if (!fixture.id || typeof fixture.id !== "string") {
      throw new Error(`Fixture missing string id: ${JSON.stringify(fixture)}`);
    }
    if (ids.has(fixture.id)) {
      throw new Error(`Duplicate fixture id: ${fixture.id}`);
    }
    if (!fixture.profile || typeof fixture.profile !== "string" || !validProfiles.has(fixture.profile)) {
      throw new Error(`Fixture ${fixture.id} has invalid profile: ${JSON.stringify(fixture.profile)}`);
    }
    ids.add(fixture.id);
  }

  return all;
}
