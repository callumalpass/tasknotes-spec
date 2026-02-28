# Conformance Suite

This directory contains the reusable `tasknotes-spec` conformance suite.

## Design

- Fixtures are language-neutral JSON in `conformance/fixtures`.
- Assertions are shared in `conformance/lib/matchers.mjs`.
- Implementations provide adapters per `conformance/docs/ADAPTER_CONTRACT.md`.
- `conformance/manifest.json` tracks total case count and section/profile coverage.
- `conformance/tests/coverage.test.mjs` enforces that all normative spec sections have fixture representation.

## Run

Generate fixtures:

```bash
npm run conformance:generate
```

Run against a specific adapter:

```bash
TASKNOTES_ADAPTER=./conformance/adapters/mdbase-tasknotes.adapter.mjs npm run conformance:test
```

Convenience command for `../mdbase-tasknotes`:

```bash
npm run conformance:test:mdbase-tasknotes
```
