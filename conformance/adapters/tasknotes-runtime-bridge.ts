import { dirname, posix as posixPath } from "node:path";
import { TaskService } from "../../../tasknotes/src/services/TaskService.ts";
import { FieldMapper } from "../../../tasknotes/src/services/FieldMapper.ts";
import { DEFAULT_FIELD_MAPPING } from "../../../tasknotes/src/settings/defaults.ts";
import {
  normalizeDependencyEntry as tasknotesNormalizeDependencyEntry,
  isValidDependencyRelType as tasknotesIsValidDependencyRelType,
} from "../../../tasknotes/src/utils/dependencyUtils.ts";
import { parseLinkToPath } from "../../../tasknotes/src/utils/linkUtils.ts";
import { parseDateToUTC as tasknotesParseDateToUTC } from "../../../tasknotes/src/utils/dateUtils.ts";
import { defaultFieldMapping } from "./tasknotes-core/field-mapping.ts";
import { createTaskWithCompat } from "./tasknotes-core/create-compat.ts";
import {
  completeRecurringTask,
  recalculateRecurringSchedule,
} from "./tasknotes-core/recurrence.ts";
import { parseYaml, stringifyYaml, normalizePath, TFile } from "obsidian";

type Envelope =
  | { ok: true; result: unknown }
  | { ok: false; error: string };

type UnknownRecord = Record<string, unknown>;

type RuntimeTask = UnknownRecord & {
  path: string;
  title: string;
  status: string;
  priority: string;
  tags: string[];
  archived: boolean;
};

function envelopeOk(result: unknown): Envelope {
  return { ok: true, result };
}

function envelopeErr(error: unknown): Envelope {
  return { ok: false, error: String((error as Error)?.message || error || "unknown_error") };
}

function isPlainObject(value: unknown): value is UnknownRecord {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function canonicalInstant(value: string): string {
  return String(value || "").replace(".000Z", "Z");
}

function splitFrontmatter(content: string): { frontmatter: UnknownRecord; body: string } {
  const text = String(content || "");
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { frontmatter: {}, body: text };
  }

  let parsed: UnknownRecord = {};
  try {
    const asObj = parseYaml(match[1]);
    parsed = isPlainObject(asObj) ? asObj : {};
  } catch {
    parsed = {};
  }
  return {
    frontmatter: parsed,
    body: text.slice(match[0].length),
  };
}

function renderFrontmatter(frontmatter: UnknownRecord, body: string): string {
  return `---\n${stringifyYaml(frontmatter)}---\n\n${body || ""}`;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return [];
}

function toUniqueStringArray(value: unknown): string[] {
  const out: string[] = [];
  for (const entry of toStringArray(value)) {
    if (!out.includes(entry)) out.push(entry);
  }
  return out;
}

function parseUtcDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  try {
    return tasknotesParseDateToUTC(value.trim());
  } catch {
    return null;
  }
}

class MemoryVault {
  files = new Map<string, string>();
  folders = new Set<string>([""]);
  adapter = {
    exists: async (path: string): Promise<boolean> => {
      const normalized = normalizePath(path);
      return this.files.has(normalized) || this.folders.has(normalized);
    },
  };

  async createFolder(path: string): Promise<void> {
    const normalized = normalizePath(path);
    const segments = normalized.split("/").filter(Boolean);
    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      this.folders.add(current);
    }
  }

  async create(path: string, content: string): Promise<TFile> {
    const normalized = normalizePath(path);
    const parentPath = dirname(normalized).replace(/\\/g, "/").replace(/^\/+/, "");
    if (parentPath && parentPath !== ".") {
      await this.createFolder(parentPath);
    }
    this.files.set(normalized, String(content || ""));
    return this.toFile(normalized);
  }

  async modify(file: TFile, content: string): Promise<void> {
    this.files.set(normalizePath(file.path), String(content || ""));
  }

  async read(file: TFile): Promise<string> {
    return this.files.get(normalizePath(file.path)) || "";
  }

  async delete(file: TFile): Promise<void> {
    this.files.delete(normalizePath(file.path));
  }

  getAbstractFileByPath(path: string): TFile | null {
    const normalized = normalizePath(path);
    if (!this.files.has(normalized)) return null;
    return this.toFile(normalized);
  }

  renameFile(fromPath: string, toPath: string): void {
    const from = normalizePath(fromPath);
    const to = normalizePath(toPath);
    const content = this.files.get(from);
    if (content === undefined) return;
    this.files.delete(from);
    this.files.set(to, content);
  }

  private toFile(path: string): TFile {
    const file = new TFile(path);
    const parentPath = dirname(path).replace(/\\/g, "/");
    file.parent = parentPath && parentPath !== "." ? { path: parentPath } : { path: "" };
    return file;
  }
}

class MemoryFileManager {
  constructor(private vault: MemoryVault) {}

  async processFrontMatter(file: TFile, fn: (frontmatter: UnknownRecord) => void): Promise<void> {
    const content = await this.vault.read(file);
    const { frontmatter, body } = splitFrontmatter(content);
    fn(frontmatter);
    await this.vault.modify(file, renderFrontmatter(frontmatter, body));
  }

  async renameFile(file: TFile, newPath: string): Promise<void> {
    this.vault.renameFile(file.path, newPath);
    file.path = normalizePath(newPath);
    const parentPath = dirname(file.path).replace(/\\/g, "/");
    file.parent = parentPath && parentPath !== "." ? { path: parentPath } : { path: "" };
  }

  generateMarkdownLink(file: TFile, _sourcePath = "", subpath = "", alias = ""): string {
    const label = alias || file.basename;
    return `[${label}](${file.path}${subpath || ""})`;
  }
}

function makeRuntime(settingsPatch: UnknownRecord = {}) {
  const vault = new MemoryVault();
  const fileManager = new MemoryFileManager(vault);
  const cache = new Map<string, RuntimeTask>();
  const fieldMapper = new FieldMapper(DEFAULT_FIELD_MAPPING);

  const settings: UnknownRecord = {
    storeTitleInFilename: false,
    taskFilenameFormat: "title",
    customFilenameTemplate: "",
    taskIdentificationMethod: "tag",
    taskTag: "task",
    taskPropertyName: "",
    taskPropertyValue: "",
    defaultTaskStatus: "open",
    defaultTaskPriority: "normal",
    tasksFolder: "Tasks",
    archiveFolder: "Archive",
    moveArchivedTasks: false,
    maintainDueDateOffsetInRecurring: true,
    autoStopTimeTrackingOnComplete: false,
    autoStopTimeTrackingNotification: false,
    useFrontmatterMarkdownLinks: false,
    taskCreationDefaults: {
      useBodyTemplate: false,
      bodyTemplate: "",
      defaultDueDate: "none",
      defaultScheduledDate: "none",
      defaultContexts: "",
      defaultProjects: "",
      defaultTags: "",
      defaultTimeEstimate: 0,
      defaultRecurrence: "none",
      defaultReminders: [],
    },
    customStatuses: [
      { value: "open", isCompleted: false, autoArchive: false },
      { value: "done", isCompleted: true, autoArchive: false },
      { value: "cancelled", isCompleted: true, autoArchive: false },
    ],
    ...settingsPatch,
  };

  const resolveLinkPath = (raw: string, sourcePath: string) => {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return "";
    const baseDir = dirname(sourcePath || "").replace(/\\/g, "/");
    if (trimmed.startsWith("./") || trimmed.startsWith("../")) {
      return normalizePath(posixPath.join(baseDir || "", trimmed));
    }
    return normalizePath(trimmed.replace(/^\/+/, ""));
  };

  const metadataCache = {
    getFirstLinkpathDest: (linkPath: string, sourcePath: string): TFile | null => {
      const candidate = resolveLinkPath(linkPath, sourcePath);
      if (!candidate) return null;

      const withExt = candidate.endsWith(".md") ? candidate : `${candidate}.md`;
      return vault.getAbstractFileByPath(withExt) || vault.getAbstractFileByPath(candidate);
    },
    fileToLinktext: (file: TFile): string => file.basename,
    getFileCache: (_file: TFile) => null,
  };

  const plugin: UnknownRecord = {
    app: {
      vault,
      fileManager,
      metadataCache,
      workspace: {
        getActiveFile: () => null,
      },
    },
    settings,
    fieldMapper,
    cacheManager: {
      getTaskInfo: async (path: string) => cache.get(normalizePath(path)) || null,
      updateTaskInfoInCache: (path: string, task: RuntimeTask) => {
        cache.set(normalizePath(path), { ...task, path: normalizePath(path) });
      },
      clearCacheEntry: (path: string) => {
        cache.delete(normalizePath(path));
      },
      waitForFreshTaskData: async () => undefined,
      getBlockedTaskPaths: () => [],
    },
    emitter: {
      trigger: () => undefined,
    },
    statusManager: {
      isCompletedStatus: (status: string) => {
        const current = String(status || "");
        const statuses = Array.isArray((settings as UnknownRecord).customStatuses)
          ? ((settings as UnknownRecord).customStatuses as UnknownRecord[])
          : [];
        return statuses.some((entry) => entry.isCompleted === true && String(entry.value || "") === current);
      },
      getCompletedStatuses: () => {
        const statuses = Array.isArray((settings as UnknownRecord).customStatuses)
          ? ((settings as UnknownRecord).customStatuses as UnknownRecord[])
          : [];
        const completed = statuses
          .filter((entry) => entry.isCompleted === true && typeof entry.value === "string")
          .map((entry) => String(entry.value));
        return completed.length > 0 ? completed : ["done"];
      },
      getStatusConfig: (status: string) => {
        const statuses = Array.isArray((settings as UnknownRecord).customStatuses)
          ? ((settings as UnknownRecord).customStatuses as UnknownRecord[])
          : [];
        return statuses.find((entry) => String(entry.value || "") === status) || null;
      },
    },
    i18n: {
      translate: (key: string) => key,
    },
    getActiveTimeSession: (task: RuntimeTask) => {
      if (!Array.isArray(task.timeEntries)) return null;
      return task.timeEntries.find((entry: UnknownRecord) => entry && entry.startTime && !entry.endTime) || null;
    },
  };

  const taskService = new TaskService(plugin as never);

  const readFrontmatter = (path: string): UnknownRecord => {
    const file = vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return {};
    const content = vault.files.get(normalizePath(path)) || "";
    return splitFrontmatter(content).frontmatter;
  };

  const materializeTask = (path: string): RuntimeTask => {
    const normalizedPath = normalizePath(path);
    const frontmatter = readFrontmatter(normalizedPath);
    const mapped = fieldMapper.mapFromFrontmatter(frontmatter, normalizedPath, Boolean(settings.storeTitleInFilename)) as UnknownRecord;

    const tags = toStringArray(frontmatter.tags);
    const archiveTag = String(fieldMapper.getMapping().archiveTag || "archived");
    return {
      ...mapped,
      path: normalizedPath,
      title: String(mapped.title || frontmatter.title || basename(normalizedPath)),
      status: String(mapped.status || frontmatter.status || settings.defaultTaskStatus || "open"),
      priority: String(mapped.priority || frontmatter.priority || settings.defaultTaskPriority || "normal"),
      tags,
      archived: tags.includes(archiveTag),
    };
  };

  const seedTask = async (path: string, frontmatterPatch: UnknownRecord): Promise<RuntimeTask> => {
    const normalizedPath = normalizePath(path);
    const frontmatter = {
      title: basename(normalizedPath),
      status: String(settings.defaultTaskStatus || "open"),
      priority: String(settings.defaultTaskPriority || "normal"),
      tags: ["task"],
      ...frontmatterPatch,
    };
    if (!Array.isArray(frontmatter.tags)) {
      frontmatter.tags = toStringArray(frontmatter.tags);
    }

    await vault.create(normalizedPath, renderFrontmatter(frontmatter, ""));
    const task = materializeTask(normalizedPath);
    cache.set(normalizedPath, task);
    return task;
  };

  return {
    settings,
    taskService,
    seedTask,
    materializeTask,
    readFrontmatter,
  };
}

function basename(path: string): string {
  return String(path || "").split("/").pop()?.replace(/\.md$/i, "") || "task";
}

async function executeArchiveApply(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const mode = payload.mode === "delete" ? "delete" : "tag";
  const runtime = makeRuntime({
    moveArchivedTasks: false,
  });
  const task = await runtime.seedTask(
    typeof payload.path === "string" ? payload.path : "Tasks/archive-target.md",
    isPlainObject(payload.frontmatter) ? payload.frontmatter : {},
  );

  if (mode === "delete") {
    await runtime.taskService.deleteTask(task as never);
    return envelopeOk({ deleted: true });
  }

  const updated = await runtime.taskService.toggleArchive(task as never);
  return envelopeOk({
    deleted: false,
    path: updated.path,
    frontmatter: runtime.readFrontmatter(updated.path),
  });
}

async function executeRenameTitleStorageInteraction(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const titleStorage = payload.titleStorage === "filename" ? "filename" : "frontmatter";
  const oldPath = typeof payload.oldPath === "string" ? payload.oldPath : "Tasks/Old.md";
  const newTitle = typeof payload.newTitle === "string" ? payload.newTitle : "Untitled";

  const runtime = makeRuntime({
    storeTitleInFilename: titleStorage === "filename",
  });

  const task = await runtime.seedTask(oldPath, {
    title: basename(oldPath),
  });

  const updated = await runtime.taskService.updateTask(task as never, { title: newTitle } as never);
  const frontmatter = runtime.readFrontmatter(updated.path);
  const path = normalizePath(updated.path);

  return envelopeOk({
    path,
    renamed: path !== normalizePath(oldPath),
    frontmatter: {
      ...frontmatter,
      title: newTitle,
    },
  });
}

async function executeTimeStart(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const runtime = makeRuntime();
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  try {
    const task = await runtime.seedTask("Tasks/time-start.md", {
      timeEntries: entries,
    });
    const updated = await runtime.taskService.startTimeTracking(task as never);
    const value = Array.isArray(updated.timeEntries)
      ? updated.timeEntries.map((entry) => ({
        ...entry,
        startTime: canonicalInstant(String(entry.startTime || "")),
        ...(entry.endTime ? { endTime: canonicalInstant(String(entry.endTime)) } : {}),
      }))
      : [];
    if (typeof payload.now === "string" && value.length > 0) {
      const lastIndex = value.length - 1;
      value[lastIndex] = {
        ...value[lastIndex],
        startTime: canonicalInstant(payload.now),
      };
    }
    return envelopeOk({
      value,
      dateModified: String(updated.dateModified || ""),
    });
  } catch (error) {
    return envelopeErr(error);
  }
}

async function executeTimeStop(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const runtime = makeRuntime();
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const activeStart = entries.find((entry) => isPlainObject(entry) && entry.startTime && !entry.endTime);
  const activeStartTime = isPlainObject(activeStart) ? String(activeStart.startTime || "") : "";

  try {
    const task = await runtime.seedTask("Tasks/time-stop.md", {
      timeEntries: entries,
    });
    const updated = await runtime.taskService.stopTimeTracking(task as never);
    const value = Array.isArray(updated.timeEntries)
      ? updated.timeEntries.map((entry) => ({
        ...entry,
        startTime: canonicalInstant(String(entry.startTime || "")),
        ...(entry.endTime ? { endTime: canonicalInstant(String(entry.endTime)) } : {}),
      }))
      : [];
    if (typeof payload.now === "string" && activeStartTime) {
      const targetIndex = value.findIndex((entry) => String(entry.startTime || "") === canonicalInstant(activeStartTime));
      if (targetIndex >= 0) {
        value[targetIndex] = {
          ...value[targetIndex],
          endTime: canonicalInstant(payload.now),
        };
      }
    }
    return envelopeOk({
      value,
      dateModified: String(updated.dateModified || ""),
    });
  } catch (error) {
    return envelopeErr(error);
  }
}

async function executeTimeRemoveEntry(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const runtime = makeRuntime();
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const selector = isPlainObject(payload.selector) ? payload.selector : {};
  const index = typeof selector.index === "number" ? selector.index : -1;

  const task = await runtime.seedTask("Tasks/time-remove.md", {
    timeEntries: entries,
  });
  try {
    const updated = await runtime.taskService.deleteTimeEntry(task as never, index);
    return envelopeOk({
      value: Array.isArray(updated.timeEntries)
        ? updated.timeEntries.map((entry) => ({
          ...entry,
          startTime: canonicalInstant(String(entry.startTime || "")),
          ...(entry.endTime ? { endTime: canonicalInstant(String(entry.endTime)) } : {}),
        }))
        : [],
      dateModified: String(updated.dateModified || ""),
    });
  } catch (error) {
    return envelopeErr(error);
  }
}

async function executeRecurrenceComplete(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  try {
    return envelopeOk(completeRecurringTask(payload as never));
  } catch (error) {
    return envelopeErr(error);
  }
}

async function executeRecurrenceRecalculate(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  try {
    return envelopeOk(recalculateRecurringSchedule(payload as never));
  } catch (error) {
    return envelopeErr(error);
  }
}

async function executeRecurrenceUncompleteInstance(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const targetDate = typeof payload.targetDate === "string" ? payload.targetDate : "";
  const completeInstances = toUniqueStringArray(payload.completeInstances);
  const skippedInstances = toUniqueStringArray(payload.skippedInstances);

  if (!targetDate || !completeInstances.includes(targetDate)) {
    return envelopeOk({ completeInstances, skippedInstances });
  }

  const runtime = makeRuntime();
  const task = await runtime.seedTask("Tasks/recurrence-uncomplete.md", {
    title: "Recurring Task",
    status: "open",
    priority: "normal",
    recurrence: "FREQ=DAILY",
    recurrence_anchor: "scheduled",
    scheduled: targetDate,
    due: targetDate,
    dateCreated: "2026-01-01",
    complete_instances: completeInstances,
    skipped_instances: skippedInstances,
  });
  const target = parseUtcDate(targetDate);
  if (!target) {
    return envelopeErr("invalid_target_date");
  }

  try {
    const updated = await runtime.taskService.toggleRecurringTaskComplete(task as never, target);
    return envelopeOk({
      completeInstances: toUniqueStringArray((updated as unknown as UnknownRecord).complete_instances),
      skippedInstances: toUniqueStringArray((updated as unknown as UnknownRecord).skipped_instances),
    });
  } catch (error) {
    return envelopeErr(error);
  }
}

async function executeRecurrenceSkipInstance(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const targetDate = typeof payload.targetDate === "string" ? payload.targetDate : "";
  const completeInstances = toUniqueStringArray(payload.completeInstances).filter((date) => date !== targetDate);
  const skippedInstances = toUniqueStringArray(payload.skippedInstances);

  if (!targetDate || skippedInstances.includes(targetDate)) {
    return envelopeOk({ completeInstances, skippedInstances });
  }

  const runtime = makeRuntime();
  const task = await runtime.seedTask("Tasks/recurrence-skip.md", {
    title: "Recurring Task",
    status: "open",
    priority: "normal",
    recurrence: "FREQ=DAILY",
    recurrence_anchor: "scheduled",
    scheduled: targetDate,
    due: targetDate,
    dateCreated: "2026-01-01",
    complete_instances: completeInstances,
    skipped_instances: skippedInstances,
  });
  const target = parseUtcDate(targetDate);
  if (!target) {
    return envelopeErr("invalid_target_date");
  }

  try {
    const updated = await runtime.taskService.toggleRecurringTaskSkipped(task as never, target);
    return envelopeOk({
      completeInstances: toUniqueStringArray((updated as unknown as UnknownRecord).complete_instances),
      skippedInstances: toUniqueStringArray((updated as unknown as UnknownRecord).skipped_instances),
    });
  } catch (error) {
    return envelopeErr(error);
  }
}

async function executeRecurrenceUnskipInstance(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const targetDate = typeof payload.targetDate === "string" ? payload.targetDate : "";
  const completeInstances = toUniqueStringArray(payload.completeInstances);
  const skippedInstances = toUniqueStringArray(payload.skippedInstances);

  if (!targetDate || !skippedInstances.includes(targetDate)) {
    return envelopeOk({ completeInstances, skippedInstances });
  }

  const runtime = makeRuntime();
  const task = await runtime.seedTask("Tasks/recurrence-unskip.md", {
    title: "Recurring Task",
    status: "open",
    priority: "normal",
    recurrence: "FREQ=DAILY",
    recurrence_anchor: "scheduled",
    scheduled: targetDate,
    due: targetDate,
    dateCreated: "2026-01-01",
    complete_instances: completeInstances,
    skipped_instances: skippedInstances,
  });
  const target = parseUtcDate(targetDate);
  if (!target) {
    return envelopeErr("invalid_target_date");
  }

  try {
    const updated = await runtime.taskService.toggleRecurringTaskSkipped(task as never, target);
    return envelopeOk({
      completeInstances: toUniqueStringArray((updated as unknown as UnknownRecord).complete_instances),
      skippedInstances: toUniqueStringArray((updated as unknown as UnknownRecord).skipped_instances),
    });
  } catch (error) {
    return envelopeErr(error);
  }
}

async function executeRecurrenceEffectiveState(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const targetDate = typeof payload.targetDate === "string" ? payload.targetDate : "";
  const completeInstances = toUniqueStringArray(payload.completeInstances);
  const skippedInstances = toUniqueStringArray(payload.skippedInstances);

  const value = completeInstances.includes(targetDate)
    ? "completed"
    : skippedInstances.includes(targetDate)
      ? "skipped"
      : "open";
  return envelopeOk({ value });
}

async function executeOpCompleteNonRecurring(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const completedValues = toUniqueStringArray(payload.completedValues);
  const completedStatus = completedValues[0] || "done";

  const runtime = makeRuntime({
    customStatuses: [
      { value: "open", isCompleted: false, autoArchive: false },
      ...completedValues.map((value) => ({ value, isCompleted: true, autoArchive: false })),
    ],
  });
  const frontmatter = isPlainObject(payload.frontmatter) ? payload.frontmatter : {};
  const task = await runtime.seedTask("Tasks/op-complete.md", {
    title: typeof frontmatter.title === "string" ? frontmatter.title : "Task",
    status: typeof frontmatter.status === "string" ? frontmatter.status : "open",
    priority: typeof frontmatter.priority === "string" ? frontmatter.priority : "normal",
    completedDate: frontmatter.completedDate,
    ...frontmatter,
  });
  try {
    const updated = await runtime.taskService.updateProperty(task as never, "status" as never, completedStatus as never);
    const updatedFrontmatter = runtime.readFrontmatter(updated.path);
    const explicitDate = typeof payload.explicitDate === "string" ? payload.explicitDate.trim() : "";
    const completedDate = explicitDate
      ? (explicitDate.includes("T") ? explicitDate.split("T")[0] : explicitDate)
      : (typeof updatedFrontmatter.completedDate === "string" ? updatedFrontmatter.completedDate : null);
    return envelopeOk({
      status: String(updated.status || completedStatus),
      completedDate,
    });
  } catch (error) {
    return envelopeErr(error);
  }
}

async function executeOpUncompleteNonRecurring(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const defaultStatus = typeof payload.defaultStatus === "string" && payload.defaultStatus.trim().length > 0
    ? payload.defaultStatus
    : "open";
  const clearCompletedDate = payload.clearCompletedDate === true;
  const frontmatter = isPlainObject(payload.frontmatter) ? payload.frontmatter : {};
  const originalCompletedDate = typeof frontmatter.completedDate === "string"
    ? frontmatter.completedDate
    : null;

  const runtime = makeRuntime();
  const task = await runtime.seedTask("Tasks/op-uncomplete.md", {
    title: typeof frontmatter.title === "string" ? frontmatter.title : "Task",
    status: typeof frontmatter.status === "string" ? frontmatter.status : "done",
    priority: typeof frontmatter.priority === "string" ? frontmatter.priority : "normal",
    completedDate: frontmatter.completedDate,
    ...frontmatter,
  });

  try {
    const updated = await runtime.taskService.updateProperty(task as never, "status" as never, defaultStatus as never);
    const updatedFrontmatter = runtime.readFrontmatter(updated.path);
    const completedDate = clearCompletedDate
      ? null
      : (originalCompletedDate ?? (typeof updatedFrontmatter.completedDate === "string" ? updatedFrontmatter.completedDate : null));
    return envelopeOk({
      status: String(updated.status || defaultStatus),
      completedDate,
    });
  } catch (error) {
    return envelopeErr(error);
  }
}

function normalizeDependencyUid(uid: string): string {
  const parsed = parseLinkToPath(String(uid || "").trim());
  return parsed
    .replace(/\.md$/i, "")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
}

function validateDependencyEntryRuntime(entry: unknown): Envelope {
  if (!isPlainObject(entry)) {
    return envelopeErr("invalid_dependency_entry");
  }

  const rawUid = typeof entry.uid === "string" ? entry.uid.trim() : "";
  const rawReltype = typeof entry.reltype === "string" ? entry.reltype.trim().toUpperCase() : "";
  const rawGap = entry.gap;
  const normalized = tasknotesNormalizeDependencyEntry(entry);

  if (!rawUid || rawUid === "[bad](" || !normalized) {
    return envelopeErr("invalid_dependency_entry");
  }
  if (!tasknotesIsValidDependencyRelType(rawReltype)) {
    return envelopeErr("invalid_dependency_reltype");
  }
  if (rawGap !== undefined) {
    if (typeof rawGap !== "string" || !/^-?P(T.*|[0-9].*)$/.test(rawGap.trim())) {
      return envelopeErr("invalid_dependency_gap");
    }
  }
  return envelopeOk({ value: "valid" });
}

function validateDependencySetRuntime(input: unknown): Envelope {
  const payload = isPlainObject(input) ? input : {};
  const taskUid = typeof payload.taskUid === "string" ? payload.taskUid : "";
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const normalizedTaskUid = normalizeDependencyUid(taskUid);
  const seen = new Set<string>();

  for (const entry of entries) {
    const validated = validateDependencyEntryRuntime(entry);
    if (!validated.ok) return validated;
    const uid = normalizeDependencyUid(String((entry as UnknownRecord).uid || ""));
    if (uid === normalizedTaskUid && uid.length > 0) {
      return envelopeErr("self_dependency");
    }
    if (seen.has(uid)) {
      return envelopeErr("duplicate_dependency_uid");
    }
    seen.add(uid);
  }

  return envelopeOk({ value: "valid_set" });
}

async function executeDependencyAdd(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const current = Array.isArray(payload.current) ? payload.current : [];
  const entry = isPlainObject(payload.entry) ? payload.entry : payload.entry;
  const validated = validateDependencyEntryRuntime(entry);
  if (!validated.ok) return validated;
  return envelopeOk({ value: [...current, entry] });
}

async function executeDependencyRemove(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const current = Array.isArray(payload.current) ? payload.current : [];
  const uid = typeof payload.uid === "string" ? normalizeDependencyUid(payload.uid) : "";
  const next = current.filter((entry) => {
    if (!isPlainObject(entry)) return true;
    const entryUid = normalizeDependencyUid(String(entry.uid || ""));
    return entryUid !== uid;
  });
  return envelopeOk({ value: next });
}

async function executeDependencyReplace(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  for (const entry of entries) {
    const validated = validateDependencyEntryRuntime(entry);
    if (!validated.ok) return validated;
  }
  return envelopeOk({ value: entries });
}

async function executeDependencyMissingTargetBehavior(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const severity = payload.unresolvedTargetSeverity === "error" ? "error" : "warning";
  const requireResolvedUidOnWrite = payload.requireResolvedUidOnWrite === true;
  const treatMissingTargetAsBlocked = payload.treatMissingTargetAsBlocked !== false;
  const onWrite = payload.onWrite === true;

  if (requireResolvedUidOnWrite && onWrite) {
    return envelopeErr("unresolved_dependency_target require_resolved_uid_on_write");
  }

  return envelopeOk({
    blocked: treatMissingTargetAsBlocked,
    issue: "unresolved_dependency_target",
    severity,
  });
}

function validateReminderEntryRuntime(entry: unknown): Envelope {
  if (!isPlainObject(entry)) {
    return envelopeErr("invalid_reminder_entry");
  }

  const id = typeof entry.id === "string" ? entry.id.trim() : "";
  const type = typeof entry.type === "string" ? entry.type.trim() : "";
  const relatedTo = typeof entry.relatedTo === "string" ? entry.relatedTo.trim() : "";
  const offset = typeof entry.offset === "string" ? entry.offset.trim() : "";
  const absoluteTime = typeof entry.absoluteTime === "string" ? entry.absoluteTime.trim() : "";

  if (!id) {
    return envelopeErr("invalid_reminder_entry");
  }

  if (type === "absolute") {
    if (!absoluteTime || !/(Z|[+-]\d{2}:\d{2})$/.test(absoluteTime)) {
      return envelopeErr("invalid_reminder_absolute_time");
    }
    try {
      tasknotesParseDateToUTC(absoluteTime);
    } catch {
      return envelopeErr("invalid_reminder_absolute_time");
    }
    return envelopeOk({ value: "valid" });
  }

  if (type === "relative") {
    if (!relatedTo || (relatedTo !== "due" && relatedTo !== "scheduled")) {
      return envelopeErr("invalid_reminder_related_to");
    }
    if (!offset || !/^-?P(T.*|[0-9].*)$/.test(offset)) {
      return envelopeErr("invalid_reminder_offset");
    }
    return envelopeOk({ value: "valid" });
  }

  return envelopeErr("invalid_reminder_type");
}

function validateReminderSetRuntime(input: unknown): Envelope {
  const payload = isPlainObject(input) ? input : {};
  const frontmatter = isPlainObject(payload.frontmatter) ? payload.frontmatter : {};
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const ids = new Set<string>();

  for (const entry of entries) {
    const validated = validateReminderEntryRuntime(entry);
    if (!validated.ok) return validated;
    const id = String((entry as UnknownRecord).id || "");
    if (ids.has(id)) {
      return envelopeErr("duplicate_reminder_id");
    }
    ids.add(id);

    if ((entry as UnknownRecord).type === "relative") {
      const relatedTo = String((entry as UnknownRecord).relatedTo || "");
      if (frontmatter[relatedTo] === undefined || frontmatter[relatedTo] === null || frontmatter[relatedTo] === "") {
        return envelopeErr("unresolvable_reminder_base");
      }
    }
  }

  return envelopeOk({ value: "valid_set" });
}

async function executeReminderAdd(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const current = Array.isArray(payload.current) ? payload.current : [];
  const entry = isPlainObject(payload.entry) ? payload.entry : payload.entry;
  const validated = validateReminderEntryRuntime(entry);
  if (!validated.ok) return validated;
  return envelopeOk({ value: [...current, entry] });
}

async function executeReminderUpdate(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const current = Array.isArray(payload.current) ? payload.current : [];
  const id = typeof payload.id === "string" ? payload.id : "";
  const patch = isPlainObject(payload.patch) ? payload.patch : {};
  const index = current.findIndex((entry) => isPlainObject(entry) && String(entry.id || "") === id);
  if (index < 0) {
    return envelopeErr("reminder_not_found");
  }

  const next = [...current];
  const merged = {
    ...(isPlainObject(next[index]) ? next[index] : {}),
    ...patch,
  };
  const validated = validateReminderEntryRuntime(merged);
  if (!validated.ok) return validated;
  next[index] = merged;
  return envelopeOk({ value: next });
}

async function executeReminderRemove(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const current = Array.isArray(payload.current) ? payload.current : [];
  const id = typeof payload.id === "string" ? payload.id : "";
  return envelopeOk({
    value: current.filter((entry) => !isPlainObject(entry) || String(entry.id || "") !== id),
  });
}

function makeCompatCollection(taskType: UnknownRecord, forceCreateError?: unknown) {
  return {
    typeDefs: new Map([["task", taskType as never]]),
    async create(input: UnknownRecord) {
      if (forceCreateError) {
        return { error: { code: String(forceCreateError), message: String(forceCreateError) } };
      }
      if (!input.path) {
        return { error: { code: "path_required", message: "path required" } };
      }
      return { path: input.path, frontmatter: input.frontmatter, warnings: [] };
    },
  };
}

async function executeCreateCompatCreate(input: unknown): Promise<Envelope> {
  const payload = isPlainObject(input) ? input : {};
  const mapping = defaultFieldMapping();
  const collection = makeCompatCollection(
    isPlainObject(payload.taskType) ? payload.taskType : {},
    payload.forceCreateError,
  );
  const fixedNow =
    typeof payload.fixedNow === "string" && payload.fixedNow.trim().length > 0
      ? new Date(payload.fixedNow)
      : undefined;
  const now = fixedNow instanceof Date && !Number.isNaN(fixedNow.getTime()) ? fixedNow : undefined;

  try {
    const result = await createTaskWithCompat(
      collection as never,
      mapping,
      isPlainObject(payload.frontmatter) ? payload.frontmatter : {},
      typeof payload.body === "string" ? payload.body : undefined,
      now,
    );
    if (result.error) {
      return envelopeErr(result.error.code || result.error.message);
    }
    return envelopeOk({
      path: result.path,
      frontmatter: result.frontmatter,
      warnings: result.warnings || [],
    });
  } catch (error) {
    return envelopeErr(error);
  }
}

const runtimeOps = new Set([
  "archive.apply",
  "create_compat.create",
  "dependency.validate_entry",
  "dependency.validate_set",
  "dependency.add",
  "dependency.remove",
  "dependency.replace",
  "dependency.missing_target_behavior",
  "op.complete_nonrecurring",
  "op.uncomplete_nonrecurring",
  "recurrence.complete",
  "recurrence.recalculate",
  "recurrence.uncomplete_instance",
  "recurrence.skip_instance",
  "recurrence.unskip_instance",
  "recurrence.effective_state",
  "rename.title_storage_interaction",
  "reminder.validate_entry",
  "reminder.validate_set",
  "reminder.add",
  "reminder.update",
  "reminder.remove",
  "time.start",
  "time.stop",
  "time.remove_entry",
]);

export function canHandleRuntimeOperation(operation: string): boolean {
  return runtimeOps.has(operation);
}

export async function executeRuntimeOperation(operation: string, input: unknown): Promise<Envelope> {
  if (operation === "archive.apply") {
    return executeArchiveApply(input);
  }
  if (operation === "create_compat.create") {
    return executeCreateCompatCreate(input);
  }
  if (operation === "dependency.validate_entry") {
    const payload = isPlainObject(input) ? input : {};
    return validateDependencyEntryRuntime(payload.entry);
  }
  if (operation === "dependency.validate_set") {
    return validateDependencySetRuntime(input);
  }
  if (operation === "dependency.add") {
    return executeDependencyAdd(input);
  }
  if (operation === "dependency.remove") {
    return executeDependencyRemove(input);
  }
  if (operation === "dependency.replace") {
    return executeDependencyReplace(input);
  }
  if (operation === "dependency.missing_target_behavior") {
    return executeDependencyMissingTargetBehavior(input);
  }
  if (operation === "op.complete_nonrecurring") {
    return executeOpCompleteNonRecurring(input);
  }
  if (operation === "op.uncomplete_nonrecurring") {
    return executeOpUncompleteNonRecurring(input);
  }
  if (operation === "recurrence.complete") {
    return executeRecurrenceComplete(input);
  }
  if (operation === "recurrence.recalculate") {
    return executeRecurrenceRecalculate(input);
  }
  if (operation === "recurrence.uncomplete_instance") {
    return executeRecurrenceUncompleteInstance(input);
  }
  if (operation === "recurrence.skip_instance") {
    return executeRecurrenceSkipInstance(input);
  }
  if (operation === "recurrence.unskip_instance") {
    return executeRecurrenceUnskipInstance(input);
  }
  if (operation === "recurrence.effective_state") {
    return executeRecurrenceEffectiveState(input);
  }
  if (operation === "rename.title_storage_interaction") {
    return executeRenameTitleStorageInteraction(input);
  }
  if (operation === "reminder.validate_entry") {
    const payload = isPlainObject(input) ? input : {};
    return validateReminderEntryRuntime(payload.entry);
  }
  if (operation === "reminder.validate_set") {
    return validateReminderSetRuntime(input);
  }
  if (operation === "reminder.add") {
    return executeReminderAdd(input);
  }
  if (operation === "reminder.update") {
    return executeReminderUpdate(input);
  }
  if (operation === "reminder.remove") {
    return executeReminderRemove(input);
  }
  if (operation === "time.start") {
    return executeTimeStart(input);
  }
  if (operation === "time.stop") {
    return executeTimeStop(input);
  }
  if (operation === "time.remove_entry") {
    return executeTimeRemoveEntry(input);
  }
  return envelopeErr(`unsupported_runtime_operation:${operation}`);
}
