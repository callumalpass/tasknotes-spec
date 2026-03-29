# 7. Conformance

## 7.1 Purpose

This section defines conformance profiles and claim requirements for implementations.

## 7.2 Conformance principles

An implementation MUST NOT claim conformance to a profile unless all required capabilities of that profile are implemented.

Implementations MAY implement additional behavior beyond a profile, but extra behavior MUST NOT violate profile requirements.

## 7.3 Profile model

Profiles are cumulative unless explicitly marked otherwise.

### 7.3.1 Profile: `core-lite`

Required capabilities:

- task identification and loading
- semantic-role mapping and canonical writes (§2)
- required role support (`title`, `status`, `completed_date`, `date_created`, `date_modified`)
- create, update, delete operations (§5)
- non-recurring complete/uncomplete (§5)
- temporal parsing/canonical serialization basics (§3)
- strict validation mode support (§6.3)
- validation core checks (§6.4 items 1,1a,1b,2,3,6)

### 7.3.2 Profile: `recurrence`

Additional required capabilities:

- tasknotes recurrence-string parsing/validation, including RRULE parameter syntax and inline `DTSTART` handling
- recurrence anchor semantics, including seed precedence and completion-anchor progression
- complete/uncomplete instance
- skip/unskip instance
- instance-list invariants and effective state resolution
- validation checks for recurrence and instance overlap

### 7.3.3 Profile: `templating` (non-cumulative extension)

This profile is not cumulative; it MAY be claimed alongside `core-lite`, `recurrence`, and/or `extended`.
`templating` MUST NOT be claimed alone.

Required capabilities:

- create-time template processing semantics per §5.3.5
- `templating` configuration support per §9.14
- deterministic template/frontmatter/body merge behavior
- deterministic failure-mode behavior for template read/parse failures
- support for portable double-brace template variables defined in §5.3.5

### 7.3.4 Profile: `extended`

Additional required capabilities:

- dependency schema support (`blocked_by`)
- reminder schema support (`reminders`)
- link parsing/resolution semantics for link-bearing fields (§11)
- time-tracking management semantics for `time_entries` (§5.19), including per-task active-session constraints
- dependency operations and validation per §10.2
- reminder operations and validation per §10.3

If `extended` is claimed, all of the above baseline capabilities MUST conform to documented semantics.

Claiming `extended` also has required capability-token implications:

- `meta.claim.capabilities` MUST include `dependencies`, `reminders`, `links`, and `time-tracking`.
- Omitting any of these tokens while claiming `extended` is a non-conformant claim (even if capability-gated fixtures are skipped by a runner).

Optional capability extensions within `extended`:

- `rename` capability: reference-aware rename behavior (including dependency UID references)
- `archive` capability: archive semantics (§5.12)
- `batch` capability: batch operations with per-item outcomes (§5.15)
- `concurrency` capability: write-conflict detection semantics (§5.16)
- `dry-run` capability: dry-run semantics (§5.17)

When an optional capability token is claimed, corresponding behavior MUST conform to documented semantics.

## 7.4 Conformance claim format

A conformance claim MUST include:

- implementation name and version,
- `tasknotes-spec` version,
- claimed profile list,
- validation mode support (`strict` required; `permissive` optional),
- known deviations,
- compatibility mode status (if any),
- configuration provider status (active provider chain, precedence policy, and fallback state).

Example:

```text
Implementation: example-task-cli v1.4.0
Spec: tasknotes-spec 0.1.0-draft
Profiles: core-lite, recurrence, templating
Validation modes: strict, permissive
Known deviations: none
Compatibility mode: disabled
Configuration providers: tasknotes_plugin_data_json > built_in_defaults
Configuration fallback: none
```

## 7.5 Deviation disclosure

Any known deviation from normative text MUST be explicitly disclosed in conformance output/documentation.

A deviation entry SHOULD include:

- affected section,
- deviation summary,
- impact,
- planned resolution version.

## 7.6 Feature detection

Implementations SHOULD expose machine-readable capability metadata, including:

- profiles
- effective runtime timezone
- active configuration providers and precedence chain
- enabled compatibility modes
- configurable status sets
- supported mapping aliases
- templating support flags and effective templating failure mode
- dependency and reminder support flags
- time-tracking support flags, including active-session policy and auto-stop-on-complete behavior

## 7.7 Strictness disclosure

Conformance requires `strict` validation mode support (§6.3).

Conformance claims MUST indicate whether `permissive` mode is also supported.

## 7.8 Example profile matrix

| Capability | core-lite | recurrence | templating | extended |
|---|---:|---:|---:|---:|
| create/update/delete | required | required | companion-profile required | required |
| non-recurring complete | required | required | companion-profile required | required |
| recurring instance complete/skip | - | required | optional | required |
| template expansion/merge (§5.3.5) | - | - | required | optional |
| double-brace portable variable support | - | - | required | optional |
| recurrence-string validation | - | required | optional | required |
| link parsing/resolution (§11) | - | - | optional | required |
| dependency schema and ops | - | - | optional | required |
| reminder schema and ops | - | - | optional | required |
| time tracking start/stop/edit semantics (§5.19) | - | - | optional | required |
| rename updates dependency/project links | - | - | optional | optional via `rename` capability |
| archive semantics (§5.12) | - | - | optional | optional via `archive` capability |
| batch per-item outcomes (§5.15) | - | - | optional | optional via `batch` capability |
| write-conflict detection (§5.16) | - | - | optional | optional via `concurrency` capability |
| dry-run reporting (§5.17) | - | - | optional | optional via `dry-run` capability |

## 7.9 Executable fixture suite

This specification includes an executable fixture suite in `conformance/`.

- language-neutral fixtures are stored in `conformance/fixtures/*.json`
- section/profile/operation coverage is tracked in `conformance/manifest.json`
- coverage guard tests MUST enforce both section representation and minimum-depth thresholds for key sections/operations.
- adapters execute fixture operations per `conformance/docs/ADAPTER_CONTRACT.md`
- runners MUST execute fixtures only when both conditions hold:
  - fixture `profile` is satisfied by claimed adapter profiles under cumulative profile rules (§7.3),
  - all fixture `requires` capability tokens are present.

Fixture expectations MUST be profile-modular: they MUST NOT assume capability values or profile memberships beyond what the fixture's own `profile`/`requires` gating guarantees.
Fixtures for optional extension capabilities (`rename`, `archive`, `batch`, `concurrency`, `dry-run`) MUST be capability-gated via `requires` and MUST NOT rely on `extended` profile membership alone.

Conformance claims SHOULD report fixture pass/fail results against the claimed profiles.

## 7.10 Meta operations

The following operations are part of the conformance interface and MUST be supported by any adapter that participates in the conformance suite, regardless of claimed profile. These meta operations MUST be callable without requiring any capability token.

### `meta.claim`

Returns the adapter's self-reported metadata.

Input: `{}` (empty object)

Output:
```json
{
  "ok": true,
  "result": {
    "implementation": "my-tool",
    "version": "1.0.0",
    "spec_version": "0.1.0-draft",
    "validation_modes": ["strict"],
    "profiles": ["core-lite", "recurrence"],
    "capabilities": ["dependencies", "links"]
  }
}
```

Fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `implementation` | string | yes | Human-readable implementation name |
| `version` | string | yes | Implementation version string |
| `spec_version` | string | yes | `tasknotes-spec` version targeted by this adapter |
| `validation_modes` | string[] | yes | Supported validation modes; MUST include `strict` |
| `profiles` | string[] | yes | Claimed conformance profiles; valid values: `core-lite`, `recurrence`, `extended`, `templating` |
| `capabilities` | string[] | yes | Optional capability tokens; known tokens listed in §7.11 |

`profiles` lists explicitly claimed profiles. Cumulative profile expansion is applied by runners for fixture selection (§7.3, §7.9), but does not change literal membership semantics of `meta.has_profile`.

Profile-token consistency rules:

- If `profiles` contains `extended`, `capabilities` MUST include `dependencies`, `reminders`, `links`, and `time-tracking`.
- If `profiles` contains `templating`, `capabilities` MUST include `templating`.
- Runners and fixture suites SHOULD validate these claim-consistency rules directly from `meta.claim`, not only by capability-gating feature fixtures.

### `meta.has_capability`

Tests whether the adapter claims a specific capability.

Input:
```json
{ "capability": "dependencies" }
```

Output:
```json
{ "ok": true, "result": { "value": true } }
```

`result.value` MUST be `true` if the capability is in the `capabilities` array returned by `meta.claim`, and `false` otherwise.

### `meta.has_profile`

Tests whether the adapter claims a specific conformance profile.

Input:
```json
{ "profile": "recurrence" }
```

Output:
```json
{ "ok": true, "result": { "value": true } }
```

`result.value` MUST be `true` if the profile is in the `profiles` array returned by `meta.claim`, and `false` otherwise.

## 7.11 Known capability tokens

The following capability tokens are defined by this specification. Implementations MAY define additional tokens.

| Token | Required by profile | Meaning |
|---|---|---|
| `dependencies` | `extended` | Supports `blocked_by`, dependency operations, and dependency validation |
| `reminders` | `extended` | Supports `reminders`, reminder operations, and reminder validation |
| `links` | `extended` | Supports link parsing and resolution (§11) |
| `time-tracking` | `extended` | Supports time-tracking management operations (§5.19) |
| `rename` | optional extension under `extended` | Supports file rename with reference updates |
| `archive` | optional extension under `extended` | Supports archive semantics (§5.12) |
| `batch` | optional extension under `extended` | Supports batch operations with per-item outcomes (§5.15) |
| `concurrency` | optional extension under `extended` | Supports write-conflict detection (§5.16) |
| `dry-run` | optional extension under `extended` | Supports dry-run mode (§5.17) |
| `migration` | — | Supports migration operations (§8) |
| `templating` | `templating` | Supports create-time templating (§5.3.5) |
