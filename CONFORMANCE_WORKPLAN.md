# Tasknotes-Spec Conformance Program (mdbase-tasknotes)

This document tracks the long-running effort to build and enforce a high-coverage conformance suite against `tasknotes-spec`, now targeting 4500+ tests with current corpus at 4753 and growing.

## Goal

- Build a conformance suite of approximately **4500+ tests**.
- Run the suite against `../mdbase-tasknotes`.
- Bring `mdbase-tasknotes` to strong pass status.
- Record spec ambiguities/issues as ops tasks unless a clear resolution exists and is applied.

## Working Rules

- [x] Keep this file updated every major batch.
- [x] Record unresolved spec ambiguities as ops tasks.
- [x] Prefer deterministic fixture-based tests over ad-hoc assertions.
- [x] Keep test names traceable to spec sections.
- [x] Re-run full suite after each major implementation batch.

## Phase 0: Baseline + Tooling

- [x] Confirm current `mdbase-tasknotes` baseline test status.
- [x] Add conformance test scaffolding (helpers, fixture creators, assertion utilities).
- [x] Add section-to-test traceability index.
- [x] Add test-count tracking script/report.

## Phase 1: Core-Lite Conformance (~260 tests target)

### Model + Mapping (§2)

- [x] Required roles / conditional requiredness tests.
- [x] Canonical vs alias key precedence tests.
- [x] Unknown field preservation tests.
- [x] Title resolution policy tests (frontmatter-first + basename fallback).

### Temporal (§3)

- [x] Date/datetime parse validation tests.
- [x] Date canonicalization and comparison tests.
- [ ] Timezone-sensitive day-boundary tests.

### Operations (§5 core)

- [x] Create defaults and metadata timestamp tests.
- [ ] Update patch semantics and preservation tests.
- [ ] Non-recurring complete/uncomplete semantics tests.
- [ ] Rename semantics (title-storage interactions) tests.

### Validation + Conformance (§6/§7 core)

- [x] Strict mode blocking tests.
- [x] Validation code coverage tests.
- [x] Conformance claim metadata tests (provider + mode disclosure).

## Phase 2: Recurrence Conformance (~220 tests target)

### Recurrence semantics (§4)

- [x] RRULE parse and DTSTART handling tests.
- [x] Anchor semantics (`scheduled` vs `completion`) tests.
- [x] Instance state precedence tests.

### Recurrence operations (§5.7-§5.9)

- [x] Complete instance behavior matrix tests.
- [ ] Uncomplete instance behavior matrix tests.
- [ ] Skip/unskip behavior matrix tests.
- [ ] Target day/date resolution matrix tests.

## Phase 3: Templating Conformance (~80 tests target)

### Create-time templating (§5.3.5 / §7.3.3 / §9.14)

- [ ] Template section parsing tests (`--- ... ---` frontmatter split + body remainder).
- [ ] Deterministic create pipeline ordering tests (base payload, expansion, merge precedence).
- [ ] Portable variable expansion tests (`{{title}}`, `{{status}}`, `{{priority}}`, `{{dueDate}}`, etc.).
- [ ] Template syntax and variable tokenization tests.
- [ ] Failure mode tests (`error` vs `warning_fallback`).
- [ ] Fallback behavior tests (non-templated frontmatter/body when template load/parse fails).

### TaskNotes `data.json` template mapping

- [ ] `taskCreationDefaults.useBodyTemplate` -> `templating.enabled` mapping tests.
- [ ] `taskCreationDefaults.bodyTemplate` -> `templating.template_path` mapping tests.

## Phase 4: Extended Conformance (~220 tests target)

### Dependencies + reminders (§10)

- [x] Dependency schema/reltype/gap validation tests.
- [ ] Dependency resolution severity and missing-target behavior tests.
- [x] Reminder schema and type-specific field tests.
- [x] Relative reminder base-resolution tests.

### Links (§11)

- [ ] Wikilink/markdown parsing tests.
- [ ] Resolution order and extension-trial tests.
- [ ] Ambiguity and unresolved behavior tests.
- [ ] Rename/update-reference behavior tests.

## Phase 5: Provider/Configuration Conformance (~70 tests target)

### Provider model (§9)

- [x] Effective config precedence/merge tests.
- [ ] Strict vs permissive provider behavior tests.
- [x] `spec_version` synthesized vs explicit behavior tests.

### TaskNotes `data.json` provider mapping

- [x] Mapping normalization tests.
- [x] Title/filename setting normalization tests.
- [x] Status/completed-values normalization tests.

## Phase 6: Stabilization + Pass Ramp

- [x] Run full suite and collect failing buckets.
- [x] Fix `mdbase-tasknotes` implementation gaps by priority.
- [x] Re-run full suite until stable.
- [x] Produce final pass summary by section/profile.

## Phase 7: Time Tracking Conformance (new spec coverage)

### Time entries model + temporal semantics (§2.6.1 / §3.11)

- [ ] Validate single-active-session invariant per task (`multiple_active_time_entries`).
- [ ] Validate required `startTime` handling (`missing_time_entry_start`).
- [ ] Validate active-session temporal semantics (`startTime` without `endTime`).
- [ ] Validate canonical write normalization behavior for legacy `duration`.

### Time tracking operations (§5.19)

- [ ] Add operation fixtures for `time.start`, `time.stop`, `time.edit_entries`, `time.remove_entry`.
- [ ] Add invariants for `date_modified` updates on start/stop/edit/remove.
- [ ] Add negative-path fixtures for already-active start and stop-without-active.
- [ ] Add reporting semantics fixtures for documented `closed_minutes` vs `live_minutes`.

### Validation / conformance / configuration integration (§6 / §7 / §9.16)

- [ ] Add `validation.core_evaluate` fixtures for new time-tracking validation codes.
- [ ] Add conformance capability checks for time-tracking support flags.
- [ ] Add provider mapping fixtures:
  - `autoStopTimeTrackingOnComplete` -> `time_tracking.auto_stop_on_complete`
  - `autoStopTimeTrackingNotification` -> `time_tracking.auto_stop_notification`
- [ ] Add config-schema fixtures for `time_tracking` key validation.

## Deliverables

- [x] 4500+ conformance tests in `tasknotes-spec/conformance/fixtures`.
- [x] Section-traceability map from tests to spec requirements.
- [x] Ops task records for non-obvious spec ambiguities.
- [x] Final pass report with counts per profile.

## Progress Log

- [x] Initial workplan created.
- [x] Baseline captured.
- [x] Conformance scaffolding landed.
- [x] Core-lite batch complete.
- [x] Recurrence batch complete.
- [ ] Templating batch complete.
- [x] Extended batch complete (schema-level operations).
- [x] Provider batch complete (core provider + TaskNotes mapping).
- [x] Full pass complete.
- [x] 2026-02-20: Portable fixture suite generated in `conformance/fixtures` with 830 cases.
- [x] 2026-02-20: `../mdbase-tasknotes` passes all fixture cases via adapter (`833` tests including harness checks; `0` failed).
- [x] 2026-02-20: Increase fixture corpus from 830 to 2000 cases and re-validate adapter pass (`2003` tests incl. harness, `0` failed).
- [x] 2026-02-20: Ops tasks recorded for spec ambiguities:
  - `.ops/tasks/Clarify temporal parsing acceptance in strict mode.md`
  - `.ops/tasks/Clarify recurrence recalculation semantics for completion anchor.md`
- [x] 2026-02-21: Expanded fixture corpus to 4753 cases, including explicit `§6` validation operations and TaskNotes plugin provider mapping in `§9`.
- [x] 2026-02-21: `../mdbase-tasknotes` passes suite at scale (`4756` tests including harness checks, `0` failed, `1` skipped due missing optional capability claim).
- [x] 2026-02-21: Moved conformance execution logic into `../mdbase-tasknotes/src/conformance.ts` and converted adapter to thin pass-through.
- [x] 2026-02-21: Elevated claim to include `extended` (`dependencies`, `reminders`, `links`) and reached full suite pass with no skips (`4756` tests, `0` failed, `0` skipped).
- [x] 2026-02-21: Spec updated with explicit time-tracking management semantics across §2/§3/§5/§6/§7/§9.
- [ ] 2026-02-21: Begin Phase 7 fixture expansion for time-tracking operations and config mapping coverage.
