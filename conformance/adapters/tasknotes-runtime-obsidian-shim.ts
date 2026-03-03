import { parse as parseYamlImpl, stringify as stringifyYamlImpl } from "../../../tasknotes/node_modules/yaml/dist/index.js";

export class App {}

export class Vault {}

export class TAbstractFile {
  path: string;

  constructor(path: string) {
    this.path = path;
  }

  get name(): string {
    return this.path.split("/").pop() || "";
  }
}

export class TFolder extends TAbstractFile {
  children: TAbstractFile[] = [];
}

export class TFile extends TAbstractFile {
  parent: { path: string } | null = null;
  vault: unknown = null;

  get basename(): string {
    const name = this.name;
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(0, dot) : name;
  }

  get extension(): string {
    const name = this.name;
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(dot + 1) : "";
  }

  get stat() {
    const now = Date.now();
    return { ctime: now, mtime: now, size: 0 };
  }
}

export class Notice {
  message: string;

  constructor(message: string) {
    this.message = String(message || "");
  }
}

export function normalizePath(input: string): string {
  return String(input || "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\//, "")
    .replace(/\/$/, "");
}

export function parseYaml(source: string): unknown {
  return parseYamlImpl(String(source || ""));
}

export function stringifyYaml(value: unknown): string {
  return stringifyYamlImpl(value as Record<string, unknown>);
}

export function parseLinktext(linktext: string): { path: string; subpath: string } {
  const raw = String(linktext || "").trim();
  if (!raw) {
    return { path: "", subpath: "" };
  }

  const noAlias = raw.split("|", 1)[0] || raw;
  const hashIndex = noAlias.indexOf("#");
  if (hashIndex >= 0) {
    return {
      path: noAlias.slice(0, hashIndex),
      subpath: noAlias.slice(hashIndex),
    };
  }
  return { path: noAlias, subpath: "" };
}
