import {
  conformanceMetadata,
  executeConformanceOperation,
} from "../../../mdbase-tasknotes/dist/conformance.js";
export const metadata = conformanceMetadata;

function normalizeHashtagValue(value) {
  const trimmed = String(value || "").trim();
  const withoutHash = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  return withoutHash.toLowerCase();
}

function stripCodeFencesAndInlineCode(markdown) {
  const withoutFences = String(markdown || "").replace(/```[\s\S]*?```/g, " ");
  return withoutFences.replace(/`[^`]*`/g, " ");
}

function bodyHasTag(body, normalizedTag) {
  const searchable = stripCodeFencesAndInlineCode(body);
  const hashtagRegex = /(^|[^\w])#([A-Za-z0-9][A-Za-z0-9/_-]*)/g;
  let match;
  while ((match = hashtagRegex.exec(searchable)) != null) {
    if (match[2].toLowerCase() === normalizedTag) {
      return true;
    }
  }
  return false;
}

function frontmatterHasTag(frontmatter, normalizedTag) {
  const tagsValue = frontmatter?.tags;
  const entries = Array.isArray(tagsValue)
    ? tagsValue
    : (typeof tagsValue === "string" ? [tagsValue] : []);
  return entries.some((entry) => typeof entry === "string" && normalizeHashtagValue(entry) === normalizedTag);
}

function normalizeExcludedFolders(value) {
  const normalizePath = (entry) =>
    String(entry || "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/\/+$/, "")
      .trim();
  if (Array.isArray(value)) {
    return value.map(normalizePath).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map(normalizePath).filter(Boolean);
  }
  return [];
}

function pathExcluded(filePath, excludedFolders) {
  const normalizedPath = String(filePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  return excludedFolders.some((folder) =>
    normalizedPath === folder || normalizedPath.startsWith(`${folder}/`));
}

function detectTaskFile(input) {
  const payload = input && typeof input === "object" ? input : {};
  const detection = payload.taskDetection && typeof payload.taskDetection === "object"
    ? payload.taskDetection
    : {};
  const frontmatter = payload.frontmatter && typeof payload.frontmatter === "object"
    ? payload.frontmatter
    : {};
  const body = typeof payload.body === "string" ? payload.body : "";
  const filePath = typeof payload.filePath === "string" ? payload.filePath : "";

  const excludedFolders = normalizeExcludedFolders(detection.excluded_folders);
  if (filePath && pathExcluded(filePath, excludedFolders)) {
    return false;
  }

  const methods = Array.isArray(detection.methods)
    ? detection.methods.filter((entry) => typeof entry === "string")
    : (typeof detection.method === "string" ? [detection.method] : []);
  const normalizedMethods = methods.map((method) => method.trim().toLowerCase()).filter(Boolean);
  const effectiveMethods = normalizedMethods.length > 0
    ? normalizedMethods
    : (typeof detection.tag === "string" ? ["tag"] : []);

  const evaluations = [];
  for (const method of effectiveMethods) {
    if (method === "tag") {
      const configuredTag = typeof detection.tag === "string" ? detection.tag : "task";
      const normalizedTag = normalizeHashtagValue(configuredTag);
      evaluations.push(
        normalizedTag.length > 0
          && (frontmatterHasTag(frontmatter, normalizedTag) || bodyHasTag(body, normalizedTag)),
      );
      continue;
    }

    if (method === "property") {
      const propertyName = typeof detection.property_name === "string"
        ? detection.property_name.trim()
        : "";
      const propertyValue = typeof detection.property_value === "string"
        ? detection.property_value
        : "";
      if (!propertyName || !Object.prototype.hasOwnProperty.call(frontmatter, propertyName)) {
        evaluations.push(false);
        continue;
      }
      evaluations.push(propertyValue.length === 0 || String(frontmatter[propertyName]) === propertyValue);
    }
  }

  if (evaluations.length === 0) return false;
  const combine = detection.combine === "and" ? "and" : "or";
  return combine === "and" ? evaluations.every(Boolean) : evaluations.some(Boolean);
}

export async function execute(operation, input) {
  if (operation === "config.detect_task_file") {
    return { ok: true, result: { value: detectTaskFile(input) } };
  }

  if (operation === "dependency.missing_target_behavior") {
    const payload = input && typeof input === "object" ? input : {};
    const severity = payload.unresolvedTargetSeverity === "error" ? "error" : "warning";
    const requireResolvedUidOnWrite = payload.requireResolvedUidOnWrite === true;
    const treatMissingTargetAsBlocked = payload.treatMissingTargetAsBlocked !== false;
    const onWrite = payload.onWrite === true;
    if (requireResolvedUidOnWrite && onWrite) {
      return { ok: false, error: "unresolved_dependency_target require_resolved_uid_on_write" };
    }
    return {
      ok: true,
      result: {
        blocked: treatMissingTargetAsBlocked,
        issue: "unresolved_dependency_target",
        severity,
      },
    };
  }

  return executeConformanceOperation(operation, input);
}
