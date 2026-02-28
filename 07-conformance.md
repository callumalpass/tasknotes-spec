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

- RRULE-compatible recurrence parsing/validation
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
- time-tracking management semantics for `time_entries` (§5.19), including per-task active-session constraints
- link parsing/resolution semantics for link-bearing fields (§11)
- dependency operations and validation per §10.2
- reminder operations and validation per §10.3
- batch operations with structured per-item outcomes
- reference-aware rename behavior (including dependency UID references)

If `extended` is claimed, all of the above MUST conform to documented semantics.

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
| RRULE validation | - | required | optional | required |
| link parsing/resolution (§11) | - | - | optional | required |
| dependency schema and ops | - | - | optional | required |
| reminder schema and ops | - | - | optional | required |
| time tracking start/stop/edit semantics (§5.19) | - | - | optional | required |
| rename updates dependency/project links | - | - | optional | required |

## 7.9 Executable fixture suite

This specification includes an executable fixture suite in `conformance/`.

- language-neutral fixtures are stored in `conformance/fixtures/*.json`
- section/profile/operation coverage is tracked in `conformance/manifest.json`
- adapters execute fixture operations per `conformance/docs/ADAPTER_CONTRACT.md`
- runners MUST execute fixtures only when both conditions hold:
  - fixture `profile` is satisfied by claimed adapter profiles under cumulative profile rules (§7.3),
  - all fixture `requires` capability tokens are present.

Conformance claims SHOULD report fixture pass/fail results against the claimed profiles.

## 7.10 Meta operations

The following operations are part of the conformance interface and MUST be supported by any adapter that participates in the conformance suite, regardless of claimed profile.

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
| `profiles` | string[] | yes | Claimed conformance profiles; valid values: `core-lite`, `recurrence`, `extended`, `templating` |
| `capabilities` | string[] | yes | Optional capability tokens; known tokens listed in §7.11 |

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
| `rename` | `extended` | Supports file rename with reference updates |
| `archive` | `extended` | Supports archive semantics (§5.12) |
| `batch` | `extended` | Supports batch operations with per-item outcomes (§5.15) |
| `concurrency` | `extended` | Supports write-conflict detection (§5.16) |
| `dry-run` | `extended` | Supports dry-run mode (§5.17) |
| `time-tracking` | `extended` | Supports time-tracking management operations (§5.19) |
| `migration` | — | Supports migration operations (§8) |
| `templating` | `templating` | Supports create-time templating (§5.3.5) |
