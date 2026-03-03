import { parseDateToUTC } from "./date.ts";
import { RRule } from "../../../../tasknotes/node_modules/rrule/dist/esm/index.js";

const DTSTART_RE = /DTSTART:(\d{8}(?:T\d{6}Z?)?);?/;

export interface RecurrenceCompletionInput {
  recurrence: string;
  recurrenceAnchor?: string;
  scheduled?: string;
  due?: string;
  dateCreated?: string;
  completionDate: string;
  completeInstances?: string[];
  skippedInstances?: string[];
}

export interface RecurrenceCompletionResult {
  updatedRecurrence: string;
  nextScheduled: string | null;
  nextDue: string | null;
  completeInstances: string[];
  skippedInstances: string[];
}

export interface RecurrenceScheduleInput {
  recurrence: string;
  recurrenceAnchor?: string;
  scheduled?: string;
  due?: string;
  dateCreated?: string;
  completeInstances?: string[];
  skippedInstances?: string[];
  referenceDate: string;
}

export interface RecurrenceScheduleResult {
  updatedRecurrence: string;
  nextScheduled: string | null;
  nextDue: string | null;
}

export function completeRecurringTask(
  input: RecurrenceCompletionInput,
): RecurrenceCompletionResult {
  const completionDate = input.completionDate;
  const completeInstances = Array.isArray(input.completeInstances)
    ? [...input.completeInstances]
    : [];
  const skippedInstances = Array.isArray(input.skippedInstances)
    ? [...input.skippedInstances]
    : [];

  if (!completeInstances.includes(completionDate)) {
    completeInstances.push(completionDate);
  }
  const nextSkippedInstances = skippedInstances.filter((d) => d !== completionDate);

  const schedule = recalculateRecurringScheduleInternal({
    recurrence: input.recurrence,
    recurrenceAnchor: input.recurrenceAnchor,
    scheduled: input.scheduled,
    due: input.due,
    dateCreated: input.dateCreated,
    completeInstances,
    skippedInstances: nextSkippedInstances,
    referenceDate: completionDate,
    completionDateForAnchor: completionDate,
  });

  return {
    updatedRecurrence: schedule.updatedRecurrence,
    nextScheduled: schedule.nextScheduled,
    nextDue: schedule.nextDue,
    completeInstances,
    skippedInstances: nextSkippedInstances,
  };
}

export function recalculateRecurringSchedule(
  input: RecurrenceScheduleInput,
): RecurrenceScheduleResult {
  return recalculateRecurringScheduleInternal({
    ...input,
  });
}

interface RecurrenceScheduleInternalInput extends RecurrenceScheduleInput {
  completionDateForAnchor?: string;
}

function recalculateRecurringScheduleInternal(
  input: RecurrenceScheduleInternalInput,
): RecurrenceScheduleResult {
  const anchor = input.recurrenceAnchor === "completion" ? "completion" : "scheduled";
  const sourceDate = input.scheduled || input.dateCreated || input.referenceDate;
  let updatedRecurrence = input.recurrence;

  if (anchor === "completion") {
    if (input.completionDateForAnchor) {
      updatedRecurrence =
        updateDTSTARTInRecurrenceRule(updatedRecurrence, input.completionDateForAnchor) || updatedRecurrence;
    }
  } else {
    updatedRecurrence =
      addDTSTARTToRecurrenceRule(updatedRecurrence, sourceDate) || updatedRecurrence;
  }

  const referenceDate =
    (anchor === "scheduled" ? parseDateString(input.scheduled) : null) ||
    parseDateString(input.referenceDate);
  if (!referenceDate) {
    return { updatedRecurrence, nextScheduled: null, nextDue: null };
  }

  const completionDay = parseDateString(input.referenceDate);
  const completeInstances = Array.isArray(input.completeInstances) ? input.completeInstances : [];
  const skippedInstances = Array.isArray(input.skippedInstances) ? input.skippedInstances : [];
  const processedDates = new Set<string>(
    anchor === "completion"
      ? skippedInstances
      : [...completeInstances, ...skippedInstances],
  );
  let nextOccurrence = getNextOccurrenceDate(updatedRecurrence, sourceDate, referenceDate, true);

  if (completionDay) {
    let guard = 0;
    while (nextOccurrence && nextOccurrence.getTime() < completionDay.getTime() && guard < 1000) {
      nextOccurrence = getNextOccurrenceDate(
        updatedRecurrence,
        sourceDate,
        nextOccurrence,
        false,
      );
      guard++;
    }
  }

  let processedGuard = 0;
  while (nextOccurrence && processedGuard < 1000) {
    const dateStr = formatDateUTC(nextOccurrence);
    if (!processedDates.has(dateStr)) break;
    nextOccurrence = getNextOccurrenceDate(updatedRecurrence, sourceDate, nextOccurrence, false);
    processedGuard++;
  }

  if (!nextOccurrence) {
    return { updatedRecurrence, nextScheduled: null, nextDue: null };
  }

  const nextScheduled = formatLikeExisting(input.scheduled, nextOccurrence);
  const nextDue = computeNextDue(input, nextOccurrence);

  return { updatedRecurrence, nextScheduled, nextDue };
}

function computeNextDue(
  input: { due?: string; scheduled?: string },
  nextScheduledDate: Date,
): string | null {
  if (!input.due || !input.scheduled) {
    return null;
  }

  const originalDue = parseDateString(input.due);
  const originalScheduled = parseDateString(input.scheduled);
  if (!originalDue || !originalScheduled) {
    return null;
  }

  const offsetMs = originalDue.getTime() - originalScheduled.getTime();
  const nextDueDate = new Date(nextScheduledDate.getTime() + offsetMs);
  return formatLikeExisting(input.due, nextDueDate);
}

function getNextOccurrenceDate(
  recurrence: string,
  sourceDate: string,
  afterDate: Date,
  inclusive: boolean,
): Date | null {
  const rule = buildRRule(recurrence, sourceDate);
  if (!rule) return null;
  return rule.after(afterDate, inclusive);
}

function buildRRule(recurrence: string, sourceDate: string): InstanceType<typeof RRule> | null {
  try {
    const dtstartMatch = recurrence.match(DTSTART_RE);
    const rruleString = recurrence.replace(DTSTART_RE, "").replace(/^;/, "").trim();
    if (!rruleString.includes("FREQ=")) {
      return null;
    }

    const options = RRule.parseString(rruleString);
    const dtstart = parseDTSTARTValue(dtstartMatch?.[1]) || parseDateString(sourceDate);
    if (dtstart) {
      options.dtstart = dtstart;
    }

    return new RRule(options);
  } catch {
    return null;
  }
}

function addDTSTARTToRecurrenceRule(recurrence: string, sourceDate: string): string | null {
  if (!recurrence || recurrence.includes("DTSTART:")) {
    return recurrence;
  }

  const dtstart = formatDTSTARTValue(sourceDate);
  if (!dtstart) return null;
  return `DTSTART:${dtstart};${recurrence}`;
}

function updateDTSTARTInRecurrenceRule(recurrence: string, dateStr: string): string | null {
  if (!recurrence) return null;

  const dtstart = formatDTSTARTValue(dateStr);
  if (!dtstart) return null;

  if (recurrence.includes("DTSTART:")) {
    return recurrence.replace(DTSTART_RE, `DTSTART:${dtstart};`);
  }
  return `DTSTART:${dtstart};${recurrence}`;
}

function formatDTSTARTValue(dateStr: string): string | null {
  if (!dateStr) return null;

  if (dateStr.includes("T")) {
    const parsed = parseDateString(dateStr);
    if (!parsed) return null;
    const year = parsed.getUTCFullYear();
    const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const day = String(parsed.getUTCDate()).padStart(2, "0");
    const hours = String(parsed.getUTCHours()).padStart(2, "0");
    const minutes = String(parsed.getUTCMinutes()).padStart(2, "0");
    const seconds = String(parsed.getUTCSeconds()).padStart(2, "0");
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  const parsed = parseDateString(dateStr);
  if (!parsed) return null;
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function parseDTSTARTValue(value: string | undefined): Date | null {
  if (!value) return null;

  if (value.length === 8) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }

  const dtMatch = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/,
  );
  if (!dtMatch) return null;

  const [, y, m, d, hh, mm, ss] = dtMatch;
  return new Date(
    Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss), 0),
  );
}

function parseDateString(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  try {
    return parseDateToUTC(dateStr);
  } catch {
    return null;
  }
}

function formatLikeExisting(existingValue: string | undefined, date: Date): string {
  const datePart = formatDateUTC(date);
  if (existingValue && existingValue.includes("T")) {
    return `${datePart}T${existingValue.split("T")[1]}`;
  }
  return datePart;
}

function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
