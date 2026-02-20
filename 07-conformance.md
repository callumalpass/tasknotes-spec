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
- validation core checks (§6.4 items 1,2,3,6)

### 7.3.2 Profile: `recurrence`

Additional required capabilities:

- RRULE-compatible recurrence parsing/validation
- recurrence anchor semantics, including seed precedence and completion-anchor progression
- complete/uncomplete instance
- skip/unskip instance
- instance-list invariants and effective state resolution
- validation checks for recurrence and instance overlap

### 7.3.3 Profile: `extended`

Additional required capabilities:

- dependency schema support (`blocked_by`)
- reminder schema support (`reminders`)
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
- known deviations,
- compatibility mode status (if any).

Example:

```text
Implementation: example-task-cli v1.4.0
Spec: tasknotes-spec 0.1.0-draft
Profiles: core-lite, recurrence
Known deviations: none
Compatibility mode: disabled
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
- enabled compatibility modes
- configurable status sets
- supported mapping aliases
- dependency and reminder support flags

## 7.7 Strictness disclosure

Conformance claims MUST indicate validation mode support (`strict`, `permissive`, or both).

If only permissive mode exists, documentation MUST state that strict write-time error blocking is unavailable.

## 7.8 Example profile matrix

| Capability | core-lite | recurrence | extended |
|---|---:|---:|---:|
| create/update/delete | required | required | required |
| non-recurring complete | required | required | required |
| recurring instance complete/skip | - | required | required |
| RRULE validation | - | required | required |
| link parsing/resolution (§11) | - | - | required |
| dependency schema and ops | - | - | required |
| reminder schema and ops | - | - | required |
| rename updates dependency/project links | - | - | required |

## 7.9 Future test suite

This specification is written so conformance can be verified via executable fixtures.

A formal fixture format is intentionally deferred to a later version.
Until then, conformance claims SHOULD provide reproducible sample cases for each claimed profile.
