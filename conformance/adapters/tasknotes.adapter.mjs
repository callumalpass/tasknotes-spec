import { createRequire } from "node:module";
import {
  conformanceMetadata as baseMetadata,
  executeConformanceOperation as baseExecute,
} from "../../../mdbase-tasknotes/dist/conformance.js";
import * as dateBridge from "./.generated/tasknotes-date-bridge.mjs";

const require = createRequire(import.meta.url);
const { version } = require("../../../tasknotes/package.json");
const templatingBridge = require("./.generated/tasknotes-templating-bridge.cjs");

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.length > 0))];
}

export const metadata = {
  ...baseMetadata,
  implementation: "tasknotes",
  version,
  profiles: uniqueStrings([...(baseMetadata.profiles || []), "templating"]),
  capabilities: uniqueStrings([...(baseMetadata.capabilities || []), "templating"]),
};

function envelopeOk(result) {
  return { ok: true, result };
}

function envelopeErr(error) {
  return { ok: false, error: String(error?.message || error || "unknown_error") };
}

function validateDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date "${value}". Expected YYYY-MM-DD.`);
  }
  dateBridge.parseDateToUTC(value);
  return value;
}

function resolveOperationTargetDate(explicitDate, scheduled, due) {
  const extractValidDatePart = (input) => {
    if (typeof input !== "string" || input.trim().length === 0) return undefined;
    try {
      const part = dateBridge.getDatePart(input.trim());
      return validateDateString(part);
    } catch {
      return undefined;
    }
  };

  if (typeof explicitDate === "string" && explicitDate.trim().length > 0) {
    return validateDateString(explicitDate.trim());
  }

  const scheduledPart = extractValidDatePart(scheduled);
  if (scheduledPart) return scheduledPart;

  const duePart = extractValidDatePart(due);
  if (duePart) return duePart;

  return dateBridge.getCurrentDateString();
}

function dayInTimezone(instant, timezone) {
  const date = dateBridge.parseDateToUTC(String(instant || ""));
  const zone = typeof timezone === "string" ? timezone.trim() : "";
  if (!zone) {
    throw new Error("timezone missing");
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("timezone conversion failed");
  }
  return `${year}-${month}-${day}`;
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function toTaskTemplateData(rawValues) {
  const values = isPlainObject(rawValues) ? rawValues : {};
  const toStr = (value) => (value == null ? "" : String(value));
  const timeEstimateRaw = toStr(values.timeEstimate).trim();
  const parsedEstimate = Number.parseFloat(timeEstimateRaw);

  return {
    title: toStr(values.title),
    priority: toStr(values.priority),
    status: toStr(values.status),
    contexts: toStringArray(values.contexts),
    tags: toStringArray(values.tags),
    timeEstimate: Number.isFinite(parsedEstimate) ? parsedEstimate : 0,
    dueDate: toStr(values.dueDate),
    scheduledDate: toStr(values.scheduledDate),
    details: toStr(values.details),
    parentNote: toStr(values.parentNote),
  };
}

function deriveTemplateNow(rawValues) {
  const values = isPlainObject(rawValues) ? rawValues : {};
  const date =
    typeof values.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(values.date)
      ? values.date
      : undefined;
  if (!date) return undefined;
  const time =
    typeof values.time === "string" && /^\d{2}:\d{2}$/.test(values.time)
      ? values.time
      : "00:00";
  const candidate = new Date(`${date}T${time}:00`);
  if (Number.isNaN(candidate.getTime())) return undefined;
  return candidate;
}

function withFrozenNow(nowDate, fn) {
  if (!(nowDate instanceof Date) || Number.isNaN(nowDate.getTime())) {
    return fn();
  }

  const RealDate = Date;
  function MockDate(...args) {
    if (args.length === 0) {
      return new RealDate(nowDate.getTime());
    }
    return new RealDate(...args);
  }

  MockDate.UTC = RealDate.UTC;
  MockDate.parse = RealDate.parse;
  MockDate.now = () => nowDate.getTime();
  MockDate.prototype = RealDate.prototype;

  globalThis.Date = MockDate;
  try {
    return fn();
  } finally {
    globalThis.Date = RealDate;
  }
}

async function executeDateOperation(operation, input) {
  const payload = input && typeof input === "object" ? input : {};

  if (operation === "date.parse_utc") {
    const parsed = dateBridge.parseDateToUTC(String(payload.value || ""));
    return envelopeOk({ date: parsed.toISOString().slice(0, 10), isoDate: parsed.toISOString().slice(0, 10) });
  }

  if (operation === "date.parse_local") {
    const parsed = dateBridge.parseDateToLocal(String(payload.value || ""));
    const localDate = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    return envelopeOk({ localDate, isoDate: parsed.toISOString().slice(0, 10) });
  }

  if (operation === "date.validate") {
    return envelopeOk({ value: validateDateString(String(payload.value || "")) });
  }

  if (operation === "date.get_part") {
    return envelopeOk({ value: dateBridge.getDatePart(String(payload.value || "")) });
  }

  if (operation === "date.has_time") {
    return envelopeOk({ value: dateBridge.hasTimeComponent(String(payload.value || "")) });
  }

  if (operation === "date.is_same") {
    return envelopeOk({
      value: dateBridge.isSameDateSafe(String(payload.a || ""), String(payload.b || "")),
    });
  }

  if (operation === "date.is_before") {
    return envelopeOk({
      value: dateBridge.isBeforeDateSafe(String(payload.a || ""), String(payload.b || "")),
    });
  }

  if (operation === "date.resolve_operation_target") {
    return envelopeOk({
      value: resolveOperationTargetDate(payload.explicitDate, payload.scheduled, payload.due),
    });
  }

  if (operation === "date.day_in_timezone") {
    return envelopeOk({ value: dayInTimezone(payload.instant, payload.timezone) });
  }

  throw new Error(`unsupported_operation:${operation}`);
}

async function executeTemplatingOperation(operation, input) {
  const payload = isPlainObject(input) ? input : {};

  if (operation === "templating.parse_sections") {
    const sections = templatingBridge.parseTemplateSections(String(payload.templateText || ""));
    return envelopeOk({
      frontmatterRaw: sections.frontmatter || "",
      body: sections.body,
    });
  }

  if (operation === "templating.expand_variables") {
    const unknownVariablePolicy =
      typeof payload.unknownVariablePolicy === "string" && payload.unknownVariablePolicy.length > 0
        ? payload.unknownVariablePolicy
        : "preserve";
    if (unknownVariablePolicy !== "preserve" && unknownVariablePolicy !== "empty") {
      throw new Error("templating.unknown_variable_policy invalid");
    }

    const taskData = toTaskTemplateData(payload.values);
    const nowDate = deriveTemplateNow(payload.values);
    let value = withFrozenNow(nowDate, () =>
      templatingBridge.processTemplateVariables(String(payload.template || ""), taskData),
    );

    if (unknownVariablePolicy === "empty") {
      value = value.replace(/\{\{[^{}]+\}\}/g, "");
    }
    return envelopeOk({ value });
  }

  if (operation === "templating.tokenize") {
    const template = String(payload.template || "");
    const tokenRegex = /\{\{([^{}]+)\}\}/g;
    const tokens = [];
    let match;
    while ((match = tokenRegex.exec(template)) != null) {
      const token = String(match[1] || "").trim();
      if (token.length > 0) {
        tokens.push(token);
      }
    }
    return envelopeOk({ tokens });
  }

  if (operation === "templating.merge_frontmatter") {
    const baseFrontmatter = isPlainObject(payload.baseFrontmatter) ? payload.baseFrontmatter : {};
    const templateFrontmatter = isPlainObject(payload.templateFrontmatter) ? payload.templateFrontmatter : {};
    return envelopeOk({
      value: templatingBridge.mergeTemplateFrontmatter(baseFrontmatter, templateFrontmatter),
    });
  }

  if (operation === "templating.create_pipeline") {
    const baseFrontmatter = isPlainObject(payload.baseFrontmatter) ? payload.baseFrontmatter : {};
    const templateFrontmatter = isPlainObject(payload.templateFrontmatter) ? payload.templateFrontmatter : {};
    const callerBody = String(payload.callerBody || "");
    const templateBody = String(payload.templateBody || "");

    return envelopeOk({
      frontmatter: templatingBridge.mergeTemplateFrontmatter(baseFrontmatter, templateFrontmatter),
      body: templateBody.trim().length > 0 ? templateBody : callerBody,
    });
  }

  if (operation === "templating.handle_failure") {
    const failureMode = String(payload.failureMode || "warning_fallback");
    const errorCode = String(payload.errorCode || "template_error");
    if (failureMode === "error") {
      throw new Error(errorCode);
    }
    if (failureMode === "warning_fallback") {
      return envelopeOk({ mode: "fallback" });
    }
    throw new Error("templating.failure_mode invalid");
  }

  if (operation === "templating.config_defaults") {
    return envelopeOk({
      failure_mode: "warning_fallback",
      unknown_variable_policy: "preserve",
    });
  }

  if (operation === "templating.profile_claim_requirements") {
    const supportsCreateTimeTemplating = payload.supports_create_time_templating === true;
    const supportsFailureMode = payload.supports_failure_mode === true;
    const supportsVariableSet = payload.supports_variable_set === true;
    if (supportsCreateTimeTemplating && supportsFailureMode && supportsVariableSet) {
      return envelopeOk({ value: "claim_valid" });
    }
    throw new Error("templating.claim_requirements_failed");
  }

  throw new Error(`unsupported_operation:${operation}`);
}

export async function execute(operation, input) {
  try {
    if (operation === "meta.claim") {
      return envelopeOk({
        implementation: metadata.implementation,
        version: metadata.version,
        spec_version: "0.1.0-draft",
        profiles: [...metadata.profiles],
        validation_modes: ["strict"],
        known_deviations: ["tasknotes-bridge-date-semantics"],
        compatibility_mode: "bridge",
        configuration_providers: [
          "tasknotes_plugin_settings",
          "bridge_defaults",
        ],
        configuration_fallback: "bridge_defaults",
      });
    }

    if (operation === "meta.has_capability") {
      const capability =
        input && typeof input === "object" && typeof input.capability === "string"
          ? input.capability
          : "";
      return envelopeOk({ value: metadata.capabilities.includes(capability) });
    }

    if (operation === "meta.has_profile") {
      const profile =
        input && typeof input === "object" && typeof input.profile === "string"
          ? input.profile
          : "";
      return envelopeOk({ value: metadata.profiles.includes(profile) });
    }

    if (operation.startsWith("date.")) {
      return await executeDateOperation(operation, input);
    }
    if (operation.startsWith("templating.")) {
      return await executeTemplatingOperation(operation, input);
    }
    return await baseExecute(operation, input);
  } catch (error) {
    return envelopeErr(error);
  }
}
