# Fixture Format

Each fixture is a JSON object:

```json
{
  "id": "date.parse_utc.valid.0001",
  "section": "§3",
  "profile": "core-lite",
  "operation": "date.parse_utc",
  "assertion": "envelope_equals",
  "requires": [],
  "input": { "value": "2026-02-20" },
  "expect": {
    "ok": true,
    "result": { "date": "2026-02-20" }
  }
}
```

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique fixture identifier, e.g. `date.parse_utc.valid.0001` |
| `section` | string | yes | Spec section this fixture exercises, e.g. `§3` |
| `profile` | string | yes | Conformance profile: `core-lite`, `recurrence`, `extended`, or `templating`; runner skips when adapter claim does not satisfy profile (including cumulative expansion rules) |
| `operation` | string | yes | Operation name passed to the adapter, e.g. `date.parse_utc` |
| `assertion` | string | yes | Assertion kind; see below |
| `requires` | string[] | no | Capability tokens required; after profile check, runner skips if the adapter does not claim all listed capabilities |
| `input` | object | yes | Arguments passed to the operation |
| `expect` | object | conditional | Expected outcome; required for `envelope_equals` and `envelope_error` |

---

## Assertion kinds

### `envelope_equals`

Recursively deep-matches the adapter's response envelope against `expect` using the matcher directives described below. Every key in `expect` must be present and matching in the actual envelope; extra keys in the actual envelope are allowed.

**Inputs**: `input` (passed to operation), `expect` (partial envelope to match)

**Passes when**: `deepMatch(actualEnvelope, expect)` succeeds without error.

**Example**:
```json
{
  "assertion": "envelope_equals",
  "input": { "value": "2026-02-20" },
  "expect": { "ok": true, "result": { "date": "2026-02-20" } }
}
```

---

### `envelope_error`

Asserts that the operation returns a failure envelope, and optionally matches the error message.

**Passes when**:
1. `envelope.ok === false`
2. If `expect.error` is present: `deepMatch(envelope.error, expect.error)` succeeds

**Example**:
```json
{
  "assertion": "envelope_error",
  "input": { "value": "not-a-date" },
  "expect": { "error": { "$regex": "invalid" } }
}
```

If `expect` is absent or `expect.error` is absent, only `ok === false` is checked.

---

### `recurrence_complete_invariants`

Asserts structural and semantic invariants on the result of a `recurrence.complete` operation. Does **not** use `expect`; instead applies fixed logical checks derived from `input`.

**Passes when ALL of the following hold**:

1. `envelope.ok === true`
2. `result.completeInstances` is an array
3. `result.skippedInstances` is an array
4. `result.completeInstances` **includes** `input.completionDate`
5. `result.skippedInstances` does **not** include `input.completionDate`
6. `result.updatedRecurrence` matches `/FREQ=/`
7. `result.updatedRecurrence` matches `/DTSTART:/`
8. **Anchor-conditional DTSTART day** (if `input.recurrenceAnchor === "completion"`):
   - Extract `dtstartDay` = `input.completionDate` with hyphens removed (e.g. `"2026-03-01"` → `"20260301"`)
   - `result.updatedRecurrence` matches `/DTSTART:20260301(?:;|$)/`
9. **Scheduled anchor** (if `input.recurrenceAnchor === "scheduled"` and `input.scheduled` is a string):
   - Extract `dtstartDay` = first 10 chars of `input.scheduled` with hyphens removed
   - `result.updatedRecurrence` matches `/DTSTART:{dtstartDay}(?:;|$)/`
10. If `result.nextScheduled` is present:
    - It matches `/^\d{4}-\d{2}-\d{2}/`
    - `result.nextScheduled.slice(0, 10) >= input.completionDate` (string comparison)
11. If `result.nextScheduled`, `result.nextDue`, `input.scheduled`, and `input.due` are all present strings:
    - `originalOffset` = `(Date(input.due[0:10]) - Date(input.scheduled[0:10]))` in whole days
    - `(Date(result.nextDue[0:10]) - Date(result.nextScheduled[0:10]))` in whole days === `originalOffset`

---

### `recurrence_recalculate_invariants`

Asserts structural and semantic invariants on the result of a `recurrence.recalculate` operation. Does **not** use `expect`.

**Passes when ALL of the following hold**:

1. `envelope.ok === true`
2. `result.updatedRecurrence` matches `/FREQ=/`
3. If `input.recurrenceAnchor === "scheduled"`:
   - `result.updatedRecurrence` matches `/DTSTART:/`
4. If `result.nextScheduled` is present:
   - `result.nextScheduled.slice(0, 10) >= input.referenceDate` (string comparison)
   - Let `complete = input.completeInstances ?? []` and `skipped = input.skippedInstances ?? []`
   - If `input.recurrenceAnchor !== "completion"`: `complete` does **not** include `result.nextScheduled.slice(0, 10)`
   - `skipped` does **not** include `result.nextScheduled.slice(0, 10)`
5. If `result.nextScheduled`, `result.nextDue`, `input.scheduled`, and `input.due` are all present strings:
   - `originalOffset` = `(Date(input.due[0:10]) - Date(input.scheduled[0:10]))` in whole days
   - `(Date(result.nextDue[0:10]) - Date(result.nextScheduled[0:10]))` in whole days === `originalOffset`

---

### `create_compat_invariants`

Asserts the result of a `create_compat.create` operation. Combines `envelope_equals` matching with additional path invariants.

**Passes when ALL of the following hold**:

1. `deepMatch(actualEnvelope, expect)` succeeds (same as `envelope_equals`)
2. If `envelope.ok === true` and `envelope.result.path` is present:
   - `envelope.result.path` ends with `.md`
   - `envelope.result.path` does **not** contain `{`
   - `envelope.result.path` does **not** contain `}`

The path checks ensure template variables were fully expanded and no literal brace characters remain.

---

## Matcher directives in `expect`

Matcher directives are special single-key objects that appear within `expect` values. When the deep-matcher encounters an object with exactly one of these keys, it applies the corresponding matching logic instead of a structural equality check.

Directives may appear at any level of nesting. The matching context (the full `input` object) is threaded through all recursive calls to support `$ref`.

### `$regex`

```json
{ "$regex": "^\\d{4}-\\d{2}-\\d{2}$" }
```

Asserts the actual value is a **string** matching the given regular expression. The pattern is interpreted as a standard ECMAScript regex (compatible with most language regex engines).

**Algorithm**:
```
if actual is not a string → fail
compile $regex as a regex pattern
if actual does not match pattern → fail
```

---

### `$contains`

```json
{ "$contains": ["item1", "item2"] }
```

or for objects:

```json
{ "$contains": { "key": "value" } }
```

**For arrays**: asserts the actual array contains at least one element matching each item in the `$contains` array (order-independent). Each element is matched with full `deepMatch`.

**For objects**: asserts the actual object contains all key-value pairs in the `$contains` object. Values are matched with full `deepMatch`.

**Algorithm (array)**:
```
if actual is not an array → fail
for each expectedItem in $contains:
  if no element in actual deepMatches expectedItem → fail
```

**Algorithm (object)**:
```
if actual is not an object → fail
for each (key, value) in $contains:
  deepMatch(actual[key], value)
```

---

### `$oneOf`

```json
{ "$oneOf": ["OPEN", "IN_PROGRESS", null] }
```

Asserts the actual value matches **at least one** of the listed alternatives. Each alternative is matched with full `deepMatch` (so alternatives may themselves contain directives).

**Algorithm**:
```
for each option in $oneOf:
  try deepMatch(actual, option)
  if it succeeds → pass
fail (no option matched)
```

---

### `$ref`

```json
{ "$ref": "input.completionDate" }
```

Resolves a dotted path into the fixture's `input` object and uses the resolved value as the expected value. The path must start with `"input."`.

**Algorithm**:
```
if ref does not start with "input." → treat as literal value (no resolution)
segments = ref["input.".length:].split(".")
current = context.input
for each segment in segments:
  if current is null or not an object → resolved = undefined; break
  current = current[segment]
resolved = current
deepMatch(actual, resolved)
```

**Example**: if `input = { "completionDate": "2026-03-01" }` and the expect field is `{ "$ref": "input.completionDate" }`, the matcher checks `actual === "2026-03-01"`.

---

## Reference implementation

The canonical implementation of all matchers and assertion kinds is:

- **Matchers**: `conformance/lib/matchers.mjs` — `applyAssertion(caseDef, envelope)` and internal `deepMatch`
- **Runner**: `conformance/tests/runner.test.mjs` — loads fixtures, calls adapter, applies assertions

When this documentation and the reference implementation disagree, file an issue; the intent is for them to be identical.
