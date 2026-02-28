import assert from "node:assert/strict";

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function resolveInputRef(context, ref) {
  if (typeof ref !== "string" || !ref.startsWith("input.")) {
    return ref;
  }
  const path = ref.slice("input.".length).split(".").filter(Boolean);
  let current = context.input;
  for (const part of path) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}

function deepMatch(actual, expected, context) {
  if (isPlainObject(expected)) {
    if (Object.prototype.hasOwnProperty.call(expected, "$regex")) {
      assert.equal(typeof actual, "string", `Expected string for regex match, got ${typeof actual}`);
      const pattern = new RegExp(String(expected.$regex));
      assert.match(actual, pattern);
      return;
    }

    if (Object.prototype.hasOwnProperty.call(expected, "$oneOf")) {
      const options = expected.$oneOf;
      assert.equal(Array.isArray(options), true, "$oneOf must be an array");
      let matched = false;
      for (const option of options) {
        try {
          deepMatch(actual, option, context);
          matched = true;
          break;
        } catch {
          // try next
        }
      }
      assert.equal(matched, true, `Expected value to match oneOf options`);
      return;
    }

    if (Object.prototype.hasOwnProperty.call(expected, "$contains")) {
      const subset = expected.$contains;
      if (Array.isArray(actual)) {
        assert.equal(Array.isArray(subset), true, "$contains subset for arrays must be array");
        for (const expectedItem of subset) {
          const found = actual.some((item) => {
            try {
              deepMatch(item, expectedItem, context);
              return true;
            } catch {
              return false;
            }
          });
          assert.equal(found, true, `Expected array to contain item ${JSON.stringify(expectedItem)}`);
        }
        return;
      }

      assert.equal(isPlainObject(actual), true, "$contains for objects requires object actual");
      assert.equal(isPlainObject(subset), true, "$contains for objects requires object subset");
      for (const [key, value] of Object.entries(subset)) {
        deepMatch(actual[key], value, context);
      }
      return;
    }

    if (Object.prototype.hasOwnProperty.call(expected, "$ref")) {
      const resolved = resolveInputRef(context, expected.$ref);
      deepMatch(actual, resolved, context);
      return;
    }

    assert.equal(isPlainObject(actual), true, `Expected object, got ${typeof actual}`);
    for (const [key, value] of Object.entries(expected)) {
      deepMatch(actual[key], value, context);
    }
    return;
  }

  if (Array.isArray(expected)) {
    assert.equal(Array.isArray(actual), true, `Expected array, got ${typeof actual}`);
    assert.equal(actual.length, expected.length, "Array length mismatch");
    for (let i = 0; i < expected.length; i += 1) {
      deepMatch(actual[i], expected[i], context);
    }
    return;
  }

  assert.deepEqual(actual, expected);
}

function assertDateOffset(scheduled, due, expectedOffsetDays) {
  const start = Date.parse(`${scheduled}T00:00:00Z`);
  const end = Date.parse(`${due}T00:00:00Z`);
  const diff = Math.round((end - start) / (24 * 60 * 60 * 1000));
  assert.equal(diff, expectedOffsetDays);
}

export function applyAssertion(caseDef, envelope) {
  const context = { input: caseDef.input };

  if (caseDef.assertion === "envelope_equals") {
    deepMatch(envelope, caseDef.expect, context);
    return;
  }

  if (caseDef.assertion === "envelope_error") {
    assert.equal(envelope.ok, false, "Expected operation to fail");
    if (caseDef.expect?.error) {
      deepMatch(envelope.error, caseDef.expect.error, context);
    }
    return;
  }

  if (caseDef.assertion === "recurrence_complete_invariants") {
    assert.equal(envelope.ok, true, envelope.error || "Expected success");
    const result = envelope.result;
    const completionDate = caseDef.input.completionDate;
    assert.equal(Array.isArray(result.completeInstances), true);
    assert.equal(Array.isArray(result.skippedInstances), true);
    assert.equal(result.completeInstances.includes(completionDate), true);
    assert.equal(result.skippedInstances.includes(completionDate), false);
    assert.match(result.updatedRecurrence, /FREQ=/);
    assert.match(result.updatedRecurrence, /DTSTART:/);

    if (caseDef.input.recurrenceAnchor === "completion") {
      const dtstartDay = completionDate.replace(/-/g, "");
      assert.match(result.updatedRecurrence, new RegExp(`DTSTART:${dtstartDay}(?:;|$)`));
    }

    if (caseDef.input.recurrenceAnchor === "scheduled") {
      const scheduled = caseDef.input.scheduled;
      if (typeof scheduled === "string") {
        const dtstartDay = scheduled.slice(0, 10).replace(/-/g, "");
        assert.match(result.updatedRecurrence, new RegExp(`DTSTART:${dtstartDay}(?:;|$)`));
      }
    }

    if (result.nextScheduled) {
      assert.match(result.nextScheduled, /^\d{4}-\d{2}-\d{2}/);
      assert.equal(result.nextScheduled.slice(0, 10) >= completionDate, true);
    }

    const scheduled = caseDef.input.scheduled;
    const due = caseDef.input.due;
    if (result.nextScheduled && result.nextDue && typeof scheduled === "string" && typeof due === "string") {
      const originalOffset = Math.round((Date.parse(`${due.slice(0, 10)}T00:00:00Z`) - Date.parse(`${scheduled.slice(0, 10)}T00:00:00Z`)) / (24 * 60 * 60 * 1000));
      assertDateOffset(result.nextScheduled.slice(0, 10), result.nextDue.slice(0, 10), originalOffset);
    }
    return;
  }

  if (caseDef.assertion === "recurrence_recalculate_invariants") {
    assert.equal(envelope.ok, true, envelope.error || "Expected success");
    const result = envelope.result;
    const referenceDate = caseDef.input.referenceDate;

    assert.match(result.updatedRecurrence, /FREQ=/);
    if (caseDef.input.recurrenceAnchor === "scheduled") {
      assert.match(result.updatedRecurrence, /DTSTART:/);
    }

    if (result.nextScheduled) {
      const nextDay = result.nextScheduled.slice(0, 10);
      assert.equal(nextDay >= referenceDate, true);

      const complete = Array.isArray(caseDef.input.completeInstances) ? caseDef.input.completeInstances : [];
      const skipped = Array.isArray(caseDef.input.skippedInstances) ? caseDef.input.skippedInstances : [];
      if (caseDef.input.recurrenceAnchor !== "completion") {
        assert.equal(complete.includes(nextDay), false);
      }
      assert.equal(skipped.includes(nextDay), false);
    }

    const scheduled = caseDef.input.scheduled;
    const due = caseDef.input.due;
    if (result.nextScheduled && result.nextDue && typeof scheduled === "string" && typeof due === "string") {
      const originalOffset = Math.round((Date.parse(`${due.slice(0, 10)}T00:00:00Z`) - Date.parse(`${scheduled.slice(0, 10)}T00:00:00Z`)) / (24 * 60 * 60 * 1000));
      assertDateOffset(result.nextScheduled.slice(0, 10), result.nextDue.slice(0, 10), originalOffset);
    }
    return;
  }

  if (caseDef.assertion === "create_compat_invariants") {
    deepMatch(envelope, caseDef.expect, context);
    if (envelope.ok && envelope.result?.path) {
      assert.match(envelope.result.path, /\.md$/);
      assert.equal(envelope.result.path.includes("{"), false);
      assert.equal(envelope.result.path.includes("}"), false);
    }
    return;
  }

  throw new Error(`Unknown assertion kind: ${caseDef.assertion}`);
}
