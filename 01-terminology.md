# 1. Terminology

This section defines terms used normatively in this specification.

## 1.1 Collection

A **collection** is a filesystem scope within which task files are discovered and managed under a single TaskNotes configuration.

## 1.2 Task file

A **task file** is a markdown file identified as a task record by collection rules.

## 1.3 Frontmatter

**Frontmatter** is the YAML block at the start of a markdown file delimited by `---` markers.

## 1.4 Task record

A **task record** is the semantic task object obtained from parsing a task file frontmatter (plus optional derived metadata).

## 1.5 Semantic role

A **semantic role** is a canonical meaning defined by this specification, independent of storage key names.

Examples: `title`, `status`, `date_created`, `complete_instances`.

## 1.6 Storage key

A **storage key** is the YAML property name used in frontmatter.

Examples: `dateCreated`, `date_created`, `completedDate`.

## 1.7 Field mapping

**Field mapping** is the configuration that maps semantic roles to storage keys for reads and writes.

## 1.8 Alias

An **alias** is a non-canonical storage key accepted for compatibility during reads.

## 1.9 Canonical write key

The **canonical write key** is the configured storage key that conforming writers use for persisted output.

## 1.10 Date value

A **date value** represents a calendar day with no time-of-day and no timezone.

Canonical form: `YYYY-MM-DD`.

## 1.11 Datetime value

A **datetime value** represents an instant in time.

Canonical form: ISO 8601 UTC with trailing `Z`.

## 1.12 Target date

A **target date** is the calendar date to which a recurrence instance operation applies (for example complete instance on 2026-02-20).

## 1.13 Recurrence rule

A **recurrence rule** is an RFC 5545 RRULE-compatible string stored in the recurrence semantic role.
It MAY include an explicit `DTSTART` prefix.

## 1.14 Recurrence anchor

**Recurrence anchor** defines how next-instance progression is computed. Allowed values:

- `scheduled`
- `completion`

## 1.15 Complete instances

**Complete instances** is the set/list of target dates marked completed for a recurring task.

## 1.16 Skipped instances

**Skipped instances** is the set/list of target dates marked skipped for a recurring task.

## 1.17 Effective status

**Effective status** is the status presented for a given date context after applying recurrence instance state.

## 1.18 Completed-status list

The **completed-status list** is the configured ordered list of status values treated as completed for non-recurring completion semantics.
When a single value must be chosen deterministically, the first list entry is used unless explicit operation input overrides it.

## 1.19 Idempotent operation

An operation is **idempotent** if applying it multiple times with the same input produces the same persisted state as applying it once.

## 1.20 Unknown field

An **unknown field** is a frontmatter property not mapped to a semantic role in current configuration.

## 1.21 Validation issue

A **validation issue** is a structured report containing at least:

- machine-readable code,
- severity,
- optional path/field context,
- human-readable message.

## 1.22 Strict validation mode

**Strict validation mode** is a mode where invalid required semantics are treated as hard errors and write operations fail.

## 1.23 Legacy compatibility mode

**Legacy compatibility mode** is a mode where specific historical behaviors or aliases are accepted for migration but are not canonical for new writes.

## 1.24 Configuration provider

A **configuration provider** is an adapter that loads configuration from a source (for example `tasknotes.yaml` or `.obsidian/plugins/tasknotes/data.json`) and normalizes it to the schema in §9.

## 1.25 Effective configuration

The **effective configuration** is the final resolved configuration after applying provider precedence and fallback rules.

## 1.26 Template file

A **template file** is a markdown document used at create time to generate frontmatter and/or body content through variable expansion.
When templating is enabled, template behavior is defined by §5.3.5 and §9.14.

## 1.27 Template expansion

**Template expansion** is deterministic replacement of template variables with create-time task data and runtime date/time values, followed by template merge rules.

## 1.28 Time entry

A **time entry** is a structured record in `time_entries` containing `startTime`, optional `endTime`, and optional `description`.

## 1.29 Active time entry

An **active time entry** is a time entry with `startTime` present and `endTime` absent.

## 1.30 Time tracking management

**Time tracking management** is the set of operations that start, stop, edit, and remove `time_entries`, including completion-triggered auto-stop behavior when configured.
