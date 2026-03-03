import {
  parseDateToUTC as tasknotesParseDateToUTC,
  parseDateToLocal as tasknotesParseDateToLocal,
  getDatePart as tasknotesGetDatePart,
  hasTimeComponent as tasknotesHasTimeComponent,
  isSameDateSafe as tasknotesIsSameDateSafe,
  isBeforeDateSafe as tasknotesIsBeforeDateSafe,
  getCurrentDateString as tasknotesGetCurrentDateString,
} from "../../../../tasknotes/src/utils/dateUtils.ts";

export function parseDateToUTC(dateString: string): Date {
  return tasknotesParseDateToUTC(dateString);
}

export function parseDateToLocal(dateString: string): Date {
  return tasknotesParseDateToLocal(dateString);
}

export function formatDateForStorage(date: Date): string {
  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getCurrentDateString(): string {
  return tasknotesGetCurrentDateString();
}

/**
 * Resolve operation target date for recurring instance actions.
 * Priority:
 * 1) explicit input date
 * 2) scheduled date part
 * 3) due date part
 * 4) current local day
 */
export function resolveOperationTargetDate(
  explicitDate: string | undefined,
  scheduled: string | undefined,
  due: string | undefined,
): string {
  if (explicitDate) {
    return validateDateString(explicitDate);
  }

  const scheduledDatePart = extractValidDatePartOrUndefined(scheduled);
  if (scheduledDatePart) {
    return scheduledDatePart;
  }

  const dueDatePart = extractValidDatePartOrUndefined(due);
  if (dueDatePart) {
    return dueDatePart;
  }

  return getCurrentDateString();
}

export function validateDateString(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date "${date}". Expected YYYY-MM-DD.`);
  }

  parseDateToUTC(date);
  return date;
}

export function hasTimeComponent(dateString: string | undefined): boolean {
  if (!dateString) return false;
  return tasknotesHasTimeComponent(dateString);
}

export function getDatePart(dateString: string): string {
  if (!dateString) return "";
  return tasknotesGetDatePart(dateString);
}

function extractValidDatePartOrUndefined(dateString: string | undefined): string | undefined {
  if (!dateString || dateString.trim().length === 0) {
    return undefined;
  }

  try {
    const datePart = getDatePart(dateString.trim());
    return validateDateString(datePart);
  } catch {
    return undefined;
  }
}

export function isSameDateSafe(date1: string, date2: string): boolean {
  return tasknotesIsSameDateSafe(date1, date2);
}

export function isBeforeDateSafe(date1: string, date2: string): boolean {
  return tasknotesIsBeforeDateSafe(date1, date2);
}
