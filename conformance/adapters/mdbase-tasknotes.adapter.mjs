import {
  conformanceMetadata,
  executeConformanceOperation,
} from "../../../mdbase-tasknotes/dist/conformance.js";
export const metadata = conformanceMetadata;

export async function execute(operation, input) {
  return executeConformanceOperation(operation, input);
}
