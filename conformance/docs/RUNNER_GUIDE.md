# Runner Guide

This guide explains how to implement a conformance runner for the tasknotes-spec suite in any programming language. After reading this document you should be able to write a runner in Python, Rust, Go, or any other language that can parse JSON and call your implementation's API.

---

## Overview

A conformance run has three phases:

1. **Load** — read the fixture JSON files and parse each fixture object
2. **Execute** — for each fixture, call your implementation with `(operation, input)` and collect the envelope response
3. **Assert** — apply the fixture's assertion kind to the envelope; report pass, fail, or skip

```
for each fixture in all_fixtures:
  if fixture.requires any capability not in claimed_capabilities:
    report SKIP
    continue
  envelope = implementation.execute(fixture.operation, fixture.input)
  result = apply_assertion(fixture, envelope)
  report PASS or FAIL
```

### Envelope shape

Every call to `execute` must return an envelope:

```json
{ "ok": true,  "result": { ... } }   // success
{ "ok": false, "error": "message" }  // failure
```

Your implementation must never throw or panic for invalid inputs — all errors go in the envelope.

---

## Step 1: Load fixtures

The distributable tarball contains:

```
fixtures/date.json
fixtures/field-mapping.json
fixtures/recurrence.json
fixtures/create-compat.json
fixtures/conformance.json
fixtures/config.json
fixtures/config-schema.json
fixtures/validation.json
fixtures/operations.json
fixtures/templating.json
fixtures/migrations.json
fixtures/dependencies.json
fixtures/reminders.json
fixtures/links.json
manifest.json
```

`manifest.json` lists all fixture files and their case counts — use it to discover which JSON files to load:

```json
{
  "files": [
    { "file": "date.json", "cases": "<number>" },
    ...
  ],
  "totalCases": "<number>"
}
```

Counts above are illustrative. Always use the current `manifest.json` values.

Each fixture file is a JSON array. Each element is a fixture object (see `FIXTURE_FORMAT.md` for full field reference).

**Pseudocode**:
```
manifest = parse_json(read_file("manifest.json"))
fixtures = []
for each entry in manifest.files:
  fixtures += parse_json(read_file("fixtures/" + entry.file))
```

---

## Step 2: Obtain profile and capability claims

Before running fixtures, call the `meta.claim` operation with an empty input to get your implementation's metadata:

```
envelope = implementation.execute("meta.claim", {})
claimed = envelope.result
# claimed.implementation : string
# claimed.version        : string
# claimed.profiles       : string[]
# claimed.capabilities   : string[]
```

This result drives profile/capability-based skipping in Step 3.

---

## Step 3: Filtering by profile and capability

Each fixture has:

- `profile` (required): conformance profile for the case
- optional `requires`: capability token list

A fixture must be **skipped** if:

1. its profile is not satisfied by claimed profiles (with cumulative profile expansion), or
2. any required capability is missing.

Profile expansion rules:

- `recurrence` implies `core-lite`
- `extended` implies `recurrence` and `core-lite`
- `templating` is non-cumulative (it implies only itself)

**Pseudocode**:
```
function expand_profiles(claimed_profiles):
  expanded = set(claimed_profiles)
  if "extended" in expanded:
    expanded.add("recurrence")
    expanded.add("core-lite")
  if "recurrence" in expanded:
    expanded.add("core-lite")
  return expanded

function should_skip(fixture, claimed_profiles, claimed_capabilities):
  effective_profiles = expand_profiles(claimed_profiles)
  if fixture.profile not in effective_profiles:
    return true
  if fixture.requires is absent or empty:
    return false
  for each cap in fixture.requires:
    if cap not in claimed_capabilities:
      return true
  return false
```

Skipped fixtures count toward the skip total but not toward pass or fail.

---

## Step 4: Execute the operation

Call your implementation's `execute` function:

```
envelope = implementation.execute(fixture.operation, fixture.input)
```

The envelope must be a plain object with at minimum an `ok` field (boolean).

---

## Step 5: Apply assertions

Apply the assertion kind named in `fixture.assertion`. The context object (used by `$ref`) is `{ input: fixture.input }`.

### 5.1 `envelope_equals`

Deep-match the entire envelope against `fixture.expect` using the matcher directives:

```
deep_match(envelope, fixture.expect, context={ input: fixture.input })
```

Pass if no mismatch is found; fail otherwise.

### 5.2 `envelope_error`

```
if envelope.ok != false:
  fail("Expected ok=false, got ok=true")
if fixture.expect.error is present:
  deep_match(envelope.error, fixture.expect.error, context)
```

### 5.3 `recurrence_complete_invariants`

```
assert envelope.ok == true
result = envelope.result
completionDate = fixture.input.completionDate

assert is_array(result.completeInstances)
assert is_array(result.skippedInstances)
assert result.completeInstances contains completionDate
assert result.skippedInstances does NOT contain completionDate
assert result.updatedRecurrence matches /FREQ=/
assert result.updatedRecurrence matches /DTSTART:/

if fixture.input.recurrenceAnchor == "completion":
  dtstartDay = completionDate.replace("-", "")  # e.g. "20260301"
  assert result.updatedRecurrence matches /DTSTART:{dtstartDay}(?:;|$)/

if fixture.input.recurrenceAnchor == "scheduled" and fixture.input.scheduled is string:
  dtstartDay = fixture.input.scheduled[0:10].replace("-", "")
  assert result.updatedRecurrence matches /DTSTART:{dtstartDay}(?:;|$)/

if result.nextScheduled is present:
  assert result.nextScheduled matches /^\d{4}-\d{2}-\d{2}/
  assert result.nextScheduled[0:10] >= completionDate  # lexicographic

if result.nextScheduled and result.nextDue and fixture.input.scheduled and fixture.input.due are all strings:
  originalOffset = date_diff_days(fixture.input.due[0:10], fixture.input.scheduled[0:10])
  actualOffset   = date_diff_days(result.nextDue[0:10], result.nextScheduled[0:10])
  assert actualOffset == originalOffset
```

`date_diff_days(a, b)` = number of whole days from b to a (parse as UTC midnight, divide ms by 86400000, round).

### 5.4 `recurrence_recalculate_invariants`

```
assert envelope.ok == true
result = envelope.result
referenceDate = fixture.input.referenceDate

assert result.updatedRecurrence matches /FREQ=/

if fixture.input.recurrenceAnchor == "scheduled":
  assert result.updatedRecurrence matches /DTSTART:/

if result.nextScheduled is present:
  nextDay = result.nextScheduled[0:10]
  assert nextDay >= referenceDate  # lexicographic

  complete = fixture.input.completeInstances ?? []
  skipped  = fixture.input.skippedInstances  ?? []
  if fixture.input.recurrenceAnchor != "completion":
    assert complete does NOT contain nextDay
  assert skipped does NOT contain nextDay

if result.nextScheduled and result.nextDue and fixture.input.scheduled and fixture.input.due are all strings:
  originalOffset = date_diff_days(fixture.input.due[0:10], fixture.input.scheduled[0:10])
  actualOffset   = date_diff_days(result.nextDue[0:10], result.nextScheduled[0:10])
  assert actualOffset == originalOffset
```

### 5.5 `create_compat_invariants`

```
deep_match(envelope, fixture.expect, context)   # same as envelope_equals

if envelope.ok == true and envelope.result.path is present:
  assert envelope.result.path ends with ".md"
  assert envelope.result.path does NOT contain "{"
  assert envelope.result.path does NOT contain "}"
```

---

## Step 6: Implementing the matcher directives

`deep_match(actual, expected, context)` is a recursive function. The `context` object is `{ input: fixture.input }` and is passed unchanged through all recursive calls.

```
function deep_match(actual, expected, context):
  if expected is a plain object (not array, not null):

    if expected has key "$regex":
      assert actual is a string
      assert actual matches regex(expected["$regex"])
      return

    if expected has key "$oneOf":
      for each option in expected["$oneOf"]:
        try:
          deep_match(actual, option, context)
          return  # matched
      fail("no option matched")

    if expected has key "$contains":
      subset = expected["$contains"]
      if actual is an array:
        assert subset is an array
        for each expectedItem in subset:
          assert any element of actual deep_matches expectedItem
        return
      else:
        assert actual is a plain object
        assert subset is a plain object
        for each (key, value) in subset:
          deep_match(actual[key], value, context)
        return

    if expected has key "$ref":
      resolved = resolve_ref(expected["$ref"], context)
      deep_match(actual, resolved, context)
      return

    # plain object comparison — expected is a subset
    assert actual is a plain object
    for each (key, value) in expected:
      deep_match(actual[key], value, context)
    return

  if expected is an array:
    assert actual is an array
    assert len(actual) == len(expected)
    for i in 0..len(expected):
      deep_match(actual[i], expected[i], context)
    return

  # scalar: exact equality
  assert actual == expected
```

### `resolve_ref(ref, context)`

```
function resolve_ref(ref, context):
  if ref is not a string or does not start with "input.":
    return ref  # not a ref, use as-is
  path = ref["input.".length:].split(".")
  current = context.input
  for each segment in path:
    if current is null or not an object:
      return undefined
    current = current[segment]
  return current
```

### Notes on "plain object"

A plain object is:
- Not null
- Not an array
- Has object/dict/map type (not a primitive)

In dynamic languages this is usually just `typeof x === "object" && !Array.isArray(x) && x !== null`.

### Scalar equality

For the scalar case (`assert actual == expected`), use strict/deep equality: `null != false`, `0 != ""`, etc. Do not coerce types.

---

## Step 7: Reporting

Output results in **TAP (Test Anything Protocol)** format for maximum interoperability with CI systems and aggregators.

```
TAP version 14
1..{total_cases}
ok 1 - date.parse_utc.valid.0001 date.parse_utc
not ok 2 - date.parse_local.invalid.0001 date.parse_local
  ---
  message: Expected ok=false, got ok=true
  ...
ok 3 - # SKIP recurrence.complete.anchor.0001 (missing capability: dependencies)
```

At the end, print a summary line:

```
# pass: 4850  fail: 10  skip: 39
```

Exit with code `0` if all non-skipped cases pass; exit with a non-zero code if any case fails.

---

## Reference implementation

The reference JS implementation is included in the distributable:

| File | Purpose |
|------|---------|
| `lib/matchers.mjs` | `applyAssertion(caseDef, envelope)` and `deepMatch` — canonical matcher logic |
| `tests/runner.test.mjs` | Full runner: loads fixtures, calls adapter, applies assertions, reports via node:test |

If this guide and the reference implementation disagree, the reference implementation is authoritative. Please file an issue.

---

## Quick-start checklist

- [ ] Parse `manifest.json` → load all fixture files
- [ ] Call `meta.claim` → store `claimed.capabilities`
- [ ] For each fixture: skip if missing capabilities
- [ ] Call `execute(fixture.operation, fixture.input)` → get envelope
- [ ] Dispatch on `fixture.assertion` → apply assertion
- [ ] Implement `deep_match` with `$regex`, `$contains`, `$oneOf`, `$ref` directives
- [ ] Output TAP; exit non-zero on any failure
