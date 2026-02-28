# 11. Links

## 11.1 Purpose

This section defines link syntax, parsing, resolution, and write-format semantics for link-bearing task fields — primarily `projects` and `blocked_by.uid`. The resolution algorithm aligns with `mdbase-spec §8` and Obsidian's own wikilink semantics.

---

## 11.2 Link formats

Implementations MUST support three link formats.

### 11.2.1 Wikilinks

```
[[target]]
[[target|alias]]
[[target#anchor]]
[[target#anchor|alias]]
[[folder/target]]
[[./relative]]
[[../parent/target]]
```

**Components:**
- **target**: The file being linked to (without extension by default)
- **alias**: Display text; does not affect resolution
- **anchor**: A heading or block reference within the target
- **path**: May be absolute (from collection root) or relative (from current file)

Examples in frontmatter:

```yaml
projects:
  - "[[home-project]]"
  - "[[projects/alpha|Alpha Project]]"
blockedBy:
  - uid: "[[prepare-metrics]]"
    reltype: FINISHTOSTART
```

### 11.2.2 Markdown links

```
[text](path.md)
[text](./relative.md)
[text](../other/file.md)
[text](path.md#anchor)
```

The text portion is treated as an alias and does not affect resolution.

Markdown links in frontmatter require the `obsidian-frontmatter-markdown-links` Obsidian plugin. Implementations MUST NOT write markdown-format links by default unless `links.use_markdown_format=true` is configured (§11.7).

### 11.2.3 Bare paths

```
./sibling.md
../other/file.md
folder/file.md
```

Bare paths follow the same resolution rules as markdown links (relative to containing file's directory unless starting with `/`).

---

## 11.3 Link parsing

When a link value is read, implementations MUST parse it into a structured representation:

| Component | Type | Description |
|---|---|---|
| `raw` | string | Original string value exactly as written |
| `target` | string | File path or identifier (without anchor or alias) |
| `alias` | string? | Display text if provided, otherwise null |
| `anchor` | string? | Heading or block reference if provided, otherwise null |
| `format` | enum | One of: `wikilink`, `markdown`, `path` |
| `is_relative` | boolean | Whether target begins with `./` or `../` |

Parsing examples:

| Input | target | alias | anchor | format | is_relative |
|---|---|---|---|---|---|
| `[[task-001]]` | `task-001` | null | null | wikilink | false |
| `[[task-001\|My Task]]` | `task-001` | `My Task` | null | wikilink | false |
| `[[docs/api#auth]]` | `docs/api` | null | `auth` | wikilink | false |
| `[[./sibling]]` | `./sibling` | null | null | wikilink | true |
| `[Link](file.md)` | `file.md` | `Link` | null | markdown | false |
| `./other.md` | `./other.md` | null | null | path | true |

---

## 11.4 Resolution algorithm

Resolution transforms a parsed link into an absolute path (relative to collection root) pointing to the target file.

Given a parsed link and the path of the source file containing it:

### Step 1: Parse the link into components (target, format, is_relative)

### Step 2: Route by format

**If format is `markdown` or `path`:**
- If target starts with `/`, resolve from collection root (strip the leading `/`)
- Otherwise, resolve relative to the source file's directory (standard markdown behavior)
- Example: link `[Docs](docs/api.md)` in `notes/meeting.md` resolves to `notes/docs/api.md`

**If format is `wikilink`:**
- If target starts with `./` or `../`, resolve relative to the source file's directory
- If target starts with `/`, resolve from collection root (strip the leading `/`)
- If target contains `/` (and is not relative), resolve from collection root
  - Example: `[[docs/api]]` resolves to `docs/api`
- If simple name (no `/`, no `./` or `../`): proceed to Step 3

### Step 3: Simple-name resolution (wikilinks only)

For simple wikilink names (no path separator):

1. **Define the search scope:**
   - For `blocked_by.uid`: scope to files matching `task_detection` (task files only)
   - For `projects`: scope to all markdown files in the collection unless narrowed by explicit configuration

2. **ID match pass:** search scoped files for a frontmatter `id` field equal to the name.
   - If exactly one match: resolve to that file
   - If multiple matches: fail with `ambiguous_link`

3. **Filename match pass:** if no ID match, search scoped markdown files by filename (without extension).

4. **Tiebreakers** (when multiple filename candidates remain):
   a. Same directory as source file
   b. Shortest path (fewest path segments)
   c. Lexicographically smallest path

5. If still ambiguous after all tiebreakers: resolve to `null` and emit `ambiguous_link`

### Step 4: Extension handling

If the target has no extension, implementations SHOULD try configured extensions in order.

Default extension order: `[".md"]`.

Example: `[[readme]]` tries `readme.md`, `readme.mdx`, etc.

### Step 5: Path traversal check

After resolution and normalization, if the resolved path would escape the collection root, abort with `path_traversal`. See §11.5.

### Step 6: Return result

- The normalized collection-relative path if found
- `null` if no matching file exists

### Resolution examples

Given collection structure:
```
/
├── TaskNotes/
│   ├── Tasks/
│   │   ├── task-001.md
│   │   └── subtasks/
│   │       └── task-002.md
├── notes/
│   └── meeting.md
└── projects/
    └── alpha.md
```

Resolution from `TaskNotes/Tasks/subtasks/task-002.md`:

| Link value | Resolved path | Notes |
|---|---|---|
| `[[task-001]]` | `TaskNotes/Tasks/task-001.md` | Simple-name search |
| `[[../task-001]]` | `TaskNotes/Tasks/task-001.md` | Relative wikilink |
| `[[./task-003]]` | `TaskNotes/Tasks/subtasks/task-003.md` | Relative (may not exist) |
| `[[notes/meeting]]` | `notes/meeting.md` | Absolute from root |
| `[[alpha]]` | `projects/alpha.md` | Simple-name search (projects scope) |
| `[link](../task-001.md)` | `TaskNotes/Tasks/task-001.md` | Markdown, relative |
| `../task-001.md` | `TaskNotes/Tasks/task-001.md` | Bare path, relative |

---

## 11.5 Path sandboxing

Link resolution MUST NOT produce paths outside the collection root.

**Rules:**
- After resolving relative paths (applying `../` segments), the resulting path MUST be within the collection root directory
- If resolution would escape the collection root, the link MUST resolve to `null` and implementations MUST emit a `path_traversal` error
- This applies to all link formats: wikilinks, markdown links, and bare paths
- Implementations MUST normalize paths (resolve `.` and `..` segments) before checking containment

**Examples** (collection rooted at `/home/user/MyVault/`):

| Link | From file | Result |
|---|---|---|
| `[[../../../etc/passwd]]` | `TaskNotes/Tasks/task.md` | `null` + `path_traversal` |
| `[[../../secrets/key]]` | `deep/nested/file.md` | `null` + `path_traversal` |
| `[[../task-001]]` | `TaskNotes/Tasks/subtasks/t.md` | Resolves normally |

---

## 11.6 Canonical write format

When creating new link values or changing a link target, implementations MUST use a deterministic canonical form.

### Default (wikilink format)

By default (`links.use_markdown_format=false`), the canonical write format is a **simple wikilink**:

```yaml
blockedBy:
  - uid: "[[task-001]]"
    reltype: FINISHTOSTART
projects:
  - "[[projects/alpha]]"
```

Rules:
- Use the filename without extension as the target when the file can be identified by simple-name resolution within the appropriate scope.
- Use a path-qualified target (`folder/name`) when the simple name would be ambiguous.
- Do NOT include the alias component in dependency `uid` writes.
- Do NOT include the anchor component in dependency `uid` writes.
- Preserve the alias component in `projects` entries when the alias was provided by the user.

### Markdown link format (`links.use_markdown_format=true`)

When `links.use_markdown_format=true` is configured (requires the `obsidian-frontmatter-markdown-links` Obsidian plugin), the canonical write format for link-bearing fields is a **markdown link** using the collection-relative path:

```yaml
blockedBy:
  - uid: "[task-001](TaskNotes/Tasks/task-001.md)"
    reltype: FINISHTOSTART
```

### Round-trip preservation

When writing an existing link field and the resolved target is unchanged, implementations MUST preserve the original format when possible:
- If the user wrote `[[task-001|My Task]]`, preserve alias for `projects` entries.
- If the user wrote a relative path, preserve relativity when possible.
- For `blocked_by.uid`, alias and anchor components MUST still be removed on canonical writes.
- If preservation is not possible (for example unresolved/ambiguous reconstruction), implementations MUST fall back to canonical write rules in this section.

---

## 11.7 Configuration

`links` configuration keys (see §9.12):

```yaml
links:
  extensions: [".md"]                  # Extension trial order for extensionless targets
  use_markdown_format: false           # Write markdown links instead of wikilinks
  unresolved_default_severity: warning # "warning" or "error"
  update_references_on_rename: true    # Update link targets when files are renamed
```

Rules:
- `extensions` MUST be a non-empty list when present
- `unresolved_default_severity` MUST be `"warning"` or `"error"`
- `update_references_on_rename=true` enables rename-time link rewrite behavior (§11.9)
- `use_markdown_format=true` requires the `obsidian-frontmatter-markdown-links` plugin in Obsidian deployments

---

## 11.8 Role-specific rules

### 11.8.1 `projects`

`projects` entries SHOULD be interpreted with this section's parsing/resolution rules.

If a `projects` entry is a plain string (not a wikilink or markdown link), implementations SHOULD treat it as a bare filename or path and attempt resolution.

If unresolved:
- `links.unresolved_default_severity=error`: validation error
- otherwise: SHOULD emit `unresolved_link_target` warning

### 11.8.2 `blocked_by.uid`

`blocked_by.uid` values MUST use this section's parsing/resolution rules.

For dependency semantics, unresolved `uid` handling follows §10.2.6.

The canonical write form for `uid` values is specified in §11.6.

---

## 11.9 Rename and reference updates

If an implementation supports reference updates on rename (i.e. claims the `rename` capability):

1. It MUST update resolvable references in `blocked_by.uid` and `projects` link fields.
2. It SHOULD update links in body content.
3. It SHOULD preserve the original link format when possible.
4. It MUST preserve alias and anchor components where valid.
5. It MUST report unresolved or ambiguous rewrite cases.

If reference updates are not supported, this limitation MUST be disclosed in conformance claims.

---

## 11.10 Validation

Link validation issues:

| Code | Severity | Trigger |
|---|---|---|
| `invalid_link_format` | error | Link value cannot be parsed as any supported format |
| `ambiguous_link` | warning | Simple-name resolution found multiple candidates after all tiebreakers |
| `unresolved_link_target` | warning | Link target cannot be resolved to an existing file |
| `path_traversal` | error | Resolved path escapes collection root |

`unresolved_link_target` severity may be promoted to error via `links.unresolved_default_severity=error`.

---

## 11.11 Examples

### Dependency with wikilink (default)

```yaml
---
title: Implement API
status: open
tags: [task]
blockedBy:
  - uid: "[[design-api]]"
    reltype: FINISHTOSTART
  - uid: "[[projects/infra/setup-server]]"
    reltype: FINISHTOSTART
    gap: P1D
projects:
  - "[[projects/alpha]]"
dateCreated: 2026-02-20T10:00:00Z
dateModified: 2026-02-20T10:00:00Z
---
```

### Dependency with markdown links (`links.use_markdown_format=true`)

```yaml
---
title: Implement API
status: open
tags: [task]
blockedBy:
  - uid: "[design-api](TaskNotes/Tasks/design-api.md)"
    reltype: FINISHTOSTART
---
```

### Relative links from nested task

```yaml
# TaskNotes/Tasks/subtasks/task-002.md
---
title: Sub-task
status: open
tags: [task]
blockedBy:
  - uid: "[[../task-001]]"    # resolves to TaskNotes/Tasks/task-001.md
    reltype: FINISHTOSTART
projects:
  - "[[projects/alpha]]"      # resolves from collection root
---
```
