import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

export async function loadAdapter() {
  const adapterPath = process.env.TASKNOTES_ADAPTER;
  if (!adapterPath) {
    throw new Error("TASKNOTES_ADAPTER is required (path to adapter module)");
  }

  const absPath = resolve(adapterPath);
  const mod = await import(pathToFileURL(absPath).href);
  const metadata = mod.metadata;
  const execute = mod.execute;

  if (!metadata || typeof metadata !== "object") {
    throw new Error(`Adapter at ${absPath} must export 'metadata' object`);
  }
  if (typeof execute !== "function") {
    throw new Error(`Adapter at ${absPath} must export 'execute(operation, input)' function`);
  }

  return { metadata, execute, absPath };
}
