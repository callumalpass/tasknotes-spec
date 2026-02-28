# Adapter Contract

Conformance fixtures are implementation-agnostic and live in `tasknotes-spec`. Each implementation provides an **adapter** — a callable component that bridges the conformance runner to the implementation under test.

---

## Conceptual interface

An adapter is any callable that satisfies this interface:

```
execute(operation: string, input: object) → { ok: bool, result?: object, error?: string }
```

And a metadata query:

```
metadata() → {
  implementation: string,
  version: string,
  profiles: string[],
  capabilities: string[]
}
```

### `execute`

- Accepts `operation` (a string operation name, e.g. `"date.parse_utc"`) and `input` (a plain object of arguments).
- Returns an **envelope** object:
  - `ok` (boolean, required): `true` on success, `false` on failure
  - `result` (object, optional): the operation's output, present when `ok` is `true`
  - `error` (string, optional): a human-readable error message, present when `ok` is `false`
- Must never throw or panic for invalid inputs; all errors must be returned as `{ ok: false, error: "..." }`.

### `metadata` / `meta.claim`

The runner calls the `meta.claim` operation (with `input = {}`) to obtain adapter metadata. The result object must contain:

| Field | Type | Description |
|-------|------|-------------|
| `implementation` | string | Name of the implementation under test |
| `version` | string | Version of the implementation |
| `profiles` | string[] | Conformance profiles claimed (e.g. `["core-lite", "recurrence"]`) |
| `capabilities` | string[] | Optional capability tokens claimed (e.g. `["dependencies", "links"]`) |

---

## Language bindings

### JavaScript binding

For JavaScript implementations, an adapter is an **ESM module** that the runner imports directly. It must export:

- `metadata` — an object (not a function) with the fields above
- `execute(operation, input)` — an async function returning an envelope

The runner locates the adapter module via the `TASKNOTES_ADAPTER` environment variable (an absolute or relative path to the `.mjs` file).

**Minimal example**:

```js
// my-adapter.mjs
export const metadata = {
  implementation: "my-tasknotes",
  version: "1.2.3",
  profiles: ["core-lite"],
  capabilities: [],
};

export async function execute(operation, input) {
  try {
    const result = await myImplementation.run(operation, input);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
```

Run with:

```bash
TASKNOTES_ADAPTER=./my-adapter.mjs npm run conformance:test
```

### Other language bindings

Any language may implement its own runner that calls the implementation directly, without the JS adapter module mechanism. The fixtures and this documentation are the normative source; the JS runner is the reference implementation.

A non-JS runner should:

1. Load the fixture JSON files from `fixtures/` (see `manifest.json` for the file list)
2. For each fixture, call the implementation's equivalent of `execute(operation, input)`
3. Apply the assertions as specified in `FIXTURE_FORMAT.md`
4. Skip fixtures whose `profile` is not satisfied by claimed profiles (including cumulative expansion rules from §7.3)
5. Skip fixtures whose `requires[]` capabilities are not claimed by the implementation
6. Report results (TAP output recommended; see `RUNNER_GUIDE.md`)

See `RUNNER_GUIDE.md` for a complete step-by-step guide to implementing a runner in any language.

---

## Supported operations

All operation names that appear in the fixture files are listed here. Operations marked "(requires capability)" are only exercised when the adapter claims that capability via `meta.claim`.

### Core operations (no capability required)

- `date.parse_utc`
- `date.parse_local`
- `date.validate`
- `date.get_part`
- `date.has_time`
- `date.is_same`
- `date.is_before`
- `date.resolve_operation_target`
- `date.day_in_timezone`
- `field.default_mapping`
- `field.build_mapping`
- `field.normalize`
- `field.denormalize`
- `field.resolve_display_title`
- `field.is_completed_status`
- `field.default_completed_status`
- `recurrence.complete`
- `recurrence.recalculate`
- `recurrence.uncomplete_instance`
- `recurrence.skip_instance`
- `recurrence.unskip_instance`
- `recurrence.effective_state`
- `create_compat.create`
- `meta.claim`
- `meta.has_capability`
- `meta.has_profile`
- `config.resolve_collection_path`
- `config.merge_top_level`
- `config.spec_version_effective`
- `config.map_tasknotes_plugin`
- `config.provider_behavior`
- `config.validate_schema`
- `validation.core_evaluate`
- `validation.time_entries`
- `op.mutate_with_validation`
- `op.atomic_write`
- `op.idempotency_check`
- `op.update_patch`
- `op.complete_nonrecurring`
- `op.uncomplete_nonrecurring`
- `op.error_shape`
- `delete.remove`

### Capability-gated operations

| Operation | Required capability |
|-----------|-------------------|
| `dependency.validate_entry` | `dependencies` |
| `dependency.validate_set` | `dependencies` |
| `dependency.add` | `dependencies` |
| `dependency.remove` | `dependencies` |
| `dependency.replace` | `dependencies` |
| `dependency.missing_target_behavior` | `dependencies` |
| `reminder.validate_entry` | `reminders` |
| `reminder.validate_set` | `reminders` |
| `reminder.add` | `reminders` |
| `reminder.update` | `reminders` |
| `reminder.remove` | `reminders` |
| `link.parse` | `links` |
| `link.resolve` | `links` |
| `link.update_references_on_rename` | `links` + `rename` |
| `templating.expand_variables` | `templating` |
| `templating.merge_frontmatter` | `templating` |
| `templating.handle_failure` | `templating` |
| `templating.parse_sections` | `templating` |
| `templating.tokenize` | `templating` |
| `templating.create_pipeline` | `templating` |
| `templating.config_defaults` | `templating` |
| `templating.profile_claim_requirements` | `templating` |
| `migration.normalize_aliases` | `migration` |
| `migration.compat_mode` | `migration` |
| `migration.plan` | `migration` |
| `migration.normalize_temporal` | `migration` |
| `migration.resolve_instance_overlap` | `migration` |
| `migration.normalize_dependencies` | `migration` + `dependencies` |
| `migration.normalize_reminders` | `migration` + `reminders` |
| `migration.normalize_links` | `migration` + `links` |
| `migration.report_summary` | `migration` |
| `migration.divergence_register` | `migration` |
| `migration.deprecation_policy` | `migration` |
| `migration.safety_guards` | `migration` |
| `migration.compat_statement` | `migration` |
| `archive.apply` | `archive` |
| `rename.apply` | `rename` |
| `rename.title_storage_interaction` | `rename` |
| `batch.apply` | `batch` |
| `op.detect_conflict` | `concurrency` |
| `op.dry_run` | `dry-run` |
| `time.start` | `time-tracking` |
| `time.stop` | `time-tracking` |
| `time.replace_entries` | `time-tracking` |
| `time.remove_entry` | `time-tracking` |
| `time.auto_stop_on_complete` | `time-tracking` |
| `time.report_totals` | `time-tracking` |

---

## Fixture shape

Fixture files are JSON arrays. Each element is a fixture object with fields defined in `FIXTURE_FORMAT.md`.

Summary of fields:

- `id` (string, unique)
- `section` (string, spec reference)
- `profile` (string)
- `operation` (string)
- `assertion` (string)
- `requires` (string[], optional)
- `input` (object)
- `expect` (object, conditional)
