#!/usr/bin/env node
/**
 * package-fixtures.mjs
 *
 * Generates fixtures then produces a distributable tarball:
 *   tasknotes-conformance-{version}.tar.gz
 *
 * Contents:
 *   fixtures/*.json
 *   docs/FIXTURE_FORMAT.md
 *   docs/ADAPTER_CONTRACT.md
 *   docs/RUNNER_GUIDE.md
 *   lib/matchers.mjs
 *   tests/runner.test.mjs
 *   manifest.json
 *   README.md
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const conformanceDir = join(root, "conformance");

// Read version from package.json
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;
if (!version) {
  console.error("Error: package.json must have a 'version' field");
  process.exit(1);
}

const tarballName = `tasknotes-conformance-${version}.tar.gz`;
const tarballPath = join(root, tarballName);

console.log(`Building conformance package v${version}...`);

// Step 1: Generate fixtures
console.log("Generating fixtures...");
execSync("node conformance/scripts/generate-fixtures.mjs", {
  cwd: root,
  stdio: "inherit",
});

// Step 2: Verify expected files exist
const required = [
  "conformance/fixtures",
  "conformance/docs/FIXTURE_FORMAT.md",
  "conformance/docs/ADAPTER_CONTRACT.md",
  "conformance/docs/RUNNER_GUIDE.md",
  "conformance/lib/matchers.mjs",
  "conformance/tests/runner.test.mjs",
  "conformance/manifest.json",
  "conformance/README.md",
];

for (const rel of required) {
  if (!existsSync(join(root, rel))) {
    console.error(`Error: required file/directory not found: ${rel}`);
    process.exit(1);
  }
}

// Step 3: Build the tarball
// We tar from the conformance/ directory so paths inside are relative to it
// (fixtures/date.json, docs/FIXTURE_FORMAT.md, etc.)
console.log(`Creating ${tarballName}...`);

// Read manifest to get the list of fixture files
const manifest = JSON.parse(
  readFileSync(join(conformanceDir, "manifest.json"), "utf8")
);
const fixtureFiles = manifest.files.map((f) => `fixtures/${f.file}`);

const filesToInclude = [
  ...fixtureFiles,
  "docs/FIXTURE_FORMAT.md",
  "docs/ADAPTER_CONTRACT.md",
  "docs/RUNNER_GUIDE.md",
  "lib/matchers.mjs",
  "tests/runner.test.mjs",
  "manifest.json",
  "README.md",
];

const tarArgs = [
  "tar",
  "-czf",
  tarballPath,
  "-C",
  conformanceDir,
  ...filesToInclude,
].join(" ");

execSync(tarArgs, { cwd: root, stdio: "inherit" });

console.log(`\nPackage created: ${tarballName}`);
console.log(`  Version: ${version}`);
console.log(`  Fixtures: ${manifest.totalCases} cases across ${manifest.files.length} files`);
console.log(`  Path: ${tarballPath}`);
