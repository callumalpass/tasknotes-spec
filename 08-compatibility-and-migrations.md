# 8. Compatibility and Migrations

## 8.1 Purpose

This section defines how implementations transition from historical behavior to canonical specification behavior without silent data breakage.

## 8.2 Compatibility modes

Implementations MAY support compatibility modes for legacy behavior.

If supported, compatibility modes MUST:

- be explicitly enabled or disabled,
- be discoverable through configuration or capability metadata,
- not be silently enabled by default in new collections.

## 8.3 Migration expectations

When canonical behavior differs from historical behavior, implementations SHOULD provide:

1. deterministic migration rules,
2. dry-run preview support,
3. rollback-safe workflow guidance.

## 8.4 Alias normalization migration

For legacy key aliases, a migration SHOULD:

- read both canonical and alias keys,
- choose canonical value deterministically (recommended: canonical key precedence),
- rewrite persisted file using canonical keys,
- preserve unrelated unknown fields.

### 8.4.1 Example

Before:

```yaml
recurrenceAnchor: scheduled
recurrence_anchor: completion
```

After normalization:

```yaml
recurrenceAnchor: scheduled
```

With warning:

- `alias_conflict_ignored`: alias value ignored because canonical key present.

## 8.5 Temporal normalization migration

If historical writes include mixed datetime styles, migration SHOULD normalize to canonical UTC ISO `Z` for datetime roles while preserving date-only roles as dates.

Example:

Before:

```yaml
dateCreated: 2026-02-20 10:00:00+00:00
```

After:

```yaml
dateCreated: 2026-02-20T10:00:00Z
```

## 8.6 Recurrence state migration

If historical data allows overlapping complete/skip dates, migration MUST resolve overlap deterministically.

Recommended resolution policy:

- if overlap exists, prefer most recent user action where recoverable,
- otherwise prefer `complete_instances` and remove overlapping skip entries,
- emit migration report for affected dates.

Policy choice MUST be documented.

## 8.7 Divergence register

Implementations SHOULD maintain a divergence register with columns:

- section
- current behavior
- target canonical behavior
- migration strategy
- deprecation timeline

## 8.8 Deprecation policy

For any behavior deprecated by the specification:

1. announce deprecation in release notes,
2. provide warning period,
3. provide migration tooling where feasible,
4. remove deprecated behavior only in a version aligned with compatibility commitments.

## 8.9 Data safety requirements

Migrations MUST NOT:

- silently drop unknown fields,
- silently convert valid date-only fields to datetime,
- silently rewrite recurrence semantics without explicit policy.

## 8.10 Suggested migration report format

```yaml
spec_version_from: 0.1.0-draft
spec_version_to: 0.1.0
files_scanned: 214
files_changed: 67
warnings:
  alias_conflict_ignored: 3
  instance_state_overlap_resolved: 2
changes:
  normalized_datetime_fields: 41
  alias_keys_removed: 29
  instance_overlaps_fixed: 2
```

## 8.11 Compatibility statement example

```text
Compatibility mode: legacy-aliases=true, legacy-timeentry-duration=true
Planned removal: v2.0.0
Migration command: tasknotes migrate --normalize-frontmatter
```
