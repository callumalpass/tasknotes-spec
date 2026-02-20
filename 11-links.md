# 11. Links

## 11.1 Purpose

This section defines link syntax, parsing, and resolution semantics for link-bearing task fields, especially `projects` and `blocked_by.uid`.
The model intentionally aligns with the links chapter used in `mdbase-spec`, adapted to TaskNotes field semantics.

## 11.2 Link formats

Implementations MUST support three link formats.

### 11.2.1 Wikilinks

Examples:

- `[[target]]`
- `[[target|alias]]`
- `[[target#anchor]]`
- `[[target#anchor|alias]]`
- `[[folder/target]]`
- `[[./relative]]`
- `[[../parent/target]]`

### 11.2.2 Markdown links

Examples:

- `[Label](path.md)`
- `[Label](./relative.md)`
- `[Label](../other/file.md)`
- `[Label](path.md#anchor)`

### 11.2.3 Bare paths

Examples:

- `./sibling.md`
- `../other/file.md`
- `folder/file.md`

## 11.3 Parsed link representation

When parsing a link value, implementations MUST produce a structured representation with:

- `raw`: original input string
- `target`: path/name target without alias
- `alias`: optional display text
- `anchor`: optional heading/block part
- `format`: `wikilink|markdown|path`
- `is_relative`: whether target begins with `./` or `../`

Parsing examples:

| Input | target | alias | anchor | format | is_relative |
|---|---|---|---|---|---|
| `[[task-001]]` | `task-001` | null | null | wikilink | false |
| `[[task-001\|My Task]]` | `task-001` | `My Task` | null | wikilink | false |
| `[[docs/api#auth]]` | `docs/api` | null | `auth` | wikilink | false |
| `[Doc](file.md)` | `file.md` | `Doc` | null | markdown | false |
| `./other.md` | `./other.md` | null | null | path | true |

## 11.4 Resolution algorithm

Given a parsed link and a source file path:

1. Parse link.
2. Resolve by format.

### 11.4.1 Markdown or bare path

- If target starts with `/`, resolve from collection root (strip `/`).
- Otherwise resolve relative to source file directory.

### 11.4.2 Wikilink

- If target starts with `./` or `../`, resolve relative to source file directory.
- If target starts with `/`, resolve from collection root.
- If target contains `/` and is not relative, resolve from collection root.
- If simple name (no slash): use simple-name resolution (§11.4.3).

### 11.4.3 Simple-name resolution

For simple wikilink names:

1. Determine scope.
   - for `blocked_by.uid`, scope MUST be task files identified by `task_detection`.
   - for `projects`, scope defaults to entire collection unless implementation-specific narrowing is configured.
2. Attempt ID match pass (if implementation exposes ID field semantics).
3. If no ID match, attempt filename match on markdown files.
4. If multiple candidates, apply deterministic tie-breakers:
   - same directory as source,
   - shortest path,
   - lexicographically smallest path.
5. If still ambiguous, return unresolved and emit `ambiguous_link`.

### 11.4.4 Extension handling

If target has no extension, implementations SHOULD try configured extensions in order.
Default extension order is `[".md"]`.

### 11.4.5 Traversal safety

After normalization, resolved paths MUST NOT escape collection root.
Escaping paths MUST raise `path_traversal`.

### 11.4.6 Resolution result

Resolution returns:

- normalized collection-relative path when found, or
- unresolved/null with diagnostic issue.

## 11.5 Role-specific link rules

### 11.5.1 projects

`projects` entries SHOULD be interpreted with this section's parsing/resolution rules.

If unresolved:

- strict mode MAY treat as validation error when configured,
- permissive mode SHOULD emit warning.

### 11.5.2 blocked_by.uid

`blocked_by.uid` values MUST use this section's parsing/resolution rules.

For dependency semantics, unresolved `uid` handling follows §10.2.6.

## 11.6 Rename and reference updates

If an implementation supports reference updates on rename:

1. It MUST update resolvable references in link-bearing fields.
2. It SHOULD preserve original link format when possible.
3. It MUST preserve alias and anchor components where valid.
4. It MUST report unresolved or ambiguous rewrite cases.

If reference updates are not supported, this limitation MUST be disclosed in conformance claims.

## 11.7 Link validation options

Implementations MAY expose configuration for:

- allowed link extensions,
- default strictness for unresolved links,
- whether references are updated on rename.

Configuration keys are defined in §9.

## 11.8 Examples

Given source file `tasks/subtasks/task-002.md` and collection containing:

```text
tasks/task-001.md
notes/meeting.md
projects/alpha.md
```

Resolution examples:

| Link value | Resolved path |
|---|---|
| `[[task-001]]` | `tasks/task-001.md` |
| `[[../task-001]]` | `tasks/task-001.md` |
| `[[projects/alpha]]` | `projects/alpha.md` |
| `[Meeting](../../notes/meeting.md)` | `notes/meeting.md` |
| `../task-001.md` | `tasks/task-001.md` |
