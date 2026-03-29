import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd(), "conformance");
const fixturesDir = resolve(root, "fixtures");
mkdirSync(fixturesDir, { recursive: true });

function pad(num, size = 4) {
  return String(num).padStart(size, "0");
}

function makeWriter(prefix) {
  const items = [];
  return {
    add(entry) {
      const id = `${prefix}.${pad(items.length + 1)}`;
      items.push({ id, ...entry });
    },
    list() {
      return items;
    },
  };
}

function writeFixtures(fileName, cases) {
  const path = resolve(fixturesDir, fileName);
  writeFileSync(path, `${JSON.stringify(cases, null, 2)}\n`, "utf8");
}

function buildDateFixtures() {
  const w = makeWriter("date");

  const years = [1999, 2000, 2016, 2024, 2026, 2030];
  const months = [1, 2, 3, 4, 6, 12];

  function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  const validDateOnly = [];
  for (const year of years) {
    for (const month of months) {
      const last = daysInMonth(year, month);
      const d1 = `${year}-${String(month).padStart(2, "0")}-01`;
      const d2 = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
      validDateOnly.push(d1, d2);
    }
  }

  for (const value of validDateOnly) {
    w.add({
      section: "§3",
      profile: "core-lite",
      operation: "date.parse_utc",
      assertion: "envelope_equals",
      input: { value },
      expect: { ok: true, result: { date: value } },
    });

    w.add({
      section: "§3",
      profile: "core-lite",
      operation: "date.parse_local",
      assertion: "envelope_equals",
      input: { value },
      expect: { ok: true, result: { localDate: value } },
    });

    w.add({
      section: "§3",
      profile: "core-lite",
      operation: "date.validate",
      assertion: "envelope_equals",
      input: { value },
      expect: { ok: true, result: { value } },
    });
  }

  // Extended deterministic calendar matrix to increase temporal conformance density.
  // 13 years x 10 months x 3 day picks = 390 date values -> 1170 core date cases.
  const extendedYears = Array.from({ length: 13 }, (_, i) => 2018 + i); // 2018..2030
  const extendedMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const dayPickers = [
    (_lastDay) => 5,
    (_lastDay) => 15,
    (lastDay) => lastDay,
  ];

  for (const year of extendedYears) {
    for (const month of extendedMonths) {
      const lastDay = daysInMonth(year, month);
      for (const pickDay of dayPickers) {
        const day = pickDay(lastDay);
        const value = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        w.add({
          section: "§3",
          profile: "core-lite",
          operation: "date.parse_utc",
          assertion: "envelope_equals",
          input: { value },
          expect: { ok: true, result: { date: value } },
        });

        w.add({
          section: "§3",
          profile: "core-lite",
          operation: "date.parse_local",
          assertion: "envelope_equals",
          input: { value },
          expect: { ok: true, result: { localDate: value } },
        });

        w.add({
          section: "§3",
          profile: "core-lite",
          operation: "date.validate",
          assertion: "envelope_equals",
          input: { value },
          expect: { ok: true, result: { value } },
        });
      }
    }
  }

  const dateTimes = [
    "2026-02-20T00:00:00Z",
    "2026-02-20T12:34:56Z",
    "2026-02-20T23:59:59Z",
    "2026-02-20T00:00:00+00:00",
    "2026-02-20T01:00:00+01:00",
    "2026-02-19T23:00:00-01:00",
    "2026-07-15T09:30:00+05:30",
    "2026-07-15T09:30:00-05:30",
    "2026-12-31T23:59:59+14:00",
    "2026-01-01T00:00:00-12:00",
    "2030-01-01T10:00:00.000Z",
    "2030-01-01T10:00:00.123Z",
    "2040-10-10T08:00:00-03:00",
    "1970-01-01T00:00:00+14:00",
    "2024-02-29T05:45:00+02:00",
    "2025-03-01T23:59:59-11:00",
    "2025-03-01T00:00:01+11:00",
    "2028-06-30T18:30:00+09:00",
    "2028-06-30T18:30:00-09:00",
    "2032-11-15T03:04:05Z",
    "2032-11-15T03:04:05+00:00",
    "2032-11-15T03:04:05-00:00",
    "2044-08-21T14:15:16+03:00",
    "2044-08-21T14:15:16-03:00",
  ];

  for (const value of dateTimes) {
    const isoDate = new Date(value).toISOString().slice(0, 10);

    w.add({
      section: "§3",
      profile: "core-lite",
      operation: "date.parse_utc",
      assertion: "envelope_equals",
      input: { value },
      expect: { ok: true, result: { date: isoDate } },
    });

    w.add({
      section: "§3",
      profile: "core-lite",
      operation: "date.parse_local",
      assertion: "envelope_equals",
      input: { value },
      expect: { ok: true, result: { isoDate } },
    });
  }

  const invalidValues = [
    "",
    " ",
    "not-a-date",
    "2026-00-01",
    "2026-13-01",
    "2026-01-00",
    "2026-01-32",
    "2026-02-29",
    "2025-02-29",
    "1900-02-29",
    "2026-2-1",
    "2026/02/01",
    "26-02-01",
    "2026-02-20T23:60:00Z",
    "2026-02-20T23:59:60Z",
    "2026-02-20T99:99:99Z",
    "-2026-02-20",
    "2026-13-40T25:61:61Z",
    "3000-00-00",
    "2019-02-29",
    "2023-04-31",
    "2021-11-31",
    "2021-01-32",
  ];

  for (const value of invalidValues) {
    for (const operation of ["date.parse_utc", "date.parse_local", "date.validate"]) {
      w.add({
        section: "§3",
        profile: "core-lite",
        operation,
        assertion: "envelope_error",
        input: { value },
        expect: { error: { $regex: "Invalid|empty|Expected|Failed to parse" } },
      });
    }
  }

  const datePartCases = [
    ["2026-02-20", "2026-02-20"],
    ["2026-02-20T00:00:00Z", "2026-02-20"],
    ["2026-02-20T23:59:59Z", "2026-02-20"],
    ["2026-02-20T12:34:56+05:30", "2026-02-20"],
    ["2030-01-01T10:00:00.000Z", "2030-01-01"],
    ["2030-12-31T10:00:00.123Z", "2030-12-31"],
    ["2040-10-10T08:00:00-03:00", "2040-10-10"],
    ["1970-01-01T00:00:00+14:00", "1970-01-01"],
    ["1999-12-31T23:59:59-12:00", "1999-12-31"],
    ["2000-01-01T00:00:00+12:00", "2000-01-01"],
    ["2024-02-29T01:02:03Z", "2024-02-29"],
    ["2028-06-30T18:30:00+09:00", "2028-06-30"],
    ["2028-06-30T18:30:00-09:00", "2028-06-30"],
    ["2032-11-15T03:04:05-00:00", "2032-11-15"],
    ["2044-08-21T14:15:16+03:00", "2044-08-21"],
    ["2044-08-21T14:15:16-03:00", "2044-08-21"],
  ];

  for (const [value, expected] of datePartCases) {
    w.add({
      section: "§3",
      profile: "core-lite",
      operation: "date.get_part",
      assertion: "envelope_equals",
      input: { value },
      expect: { ok: true, result: { value: expected } },
    });
  }

  const hasTimeCases = [
    ["", false],
    ["2026-02-20", false],
    ["2026-02-20T00:00:00Z", true],
    ["2026-02-20T23:59:59+00:00", true],
    ["2026-02-20 10:00:00", false],
    ["T10:00", true],
    ["2026-02-20T10:00", true],
    ["textT10:00", true],
    ["2026-02-20T1:00", false],
    ["2026-02-20T10:0", false],
    ["2026-02-20T10:00:00", true],
    ["2026-02-20T00:00", true],
    ["2026-02-20T99:99", true],
    ["no-time-component", false],
    ["2026-02-20t10:00", false],
    ["2026-02-20TT10:00", true],
    ["2026-02-20T10", false],
    ["2026-02-20T10:001", true],
    ["2026-02-20T00:00:00.000Z", true],
    ["xT00:00x", true],
  ];

  for (const [value, expected] of hasTimeCases) {
    w.add({
      section: "§3",
      profile: "core-lite",
      operation: "date.has_time",
      assertion: "envelope_equals",
      input: { value },
      expect: { ok: true, result: { value: expected } },
    });
  }

  const sameCases = [
    ["2026-02-20", "2026-02-20", true],
    ["2026-02-20", "2026-02-21", false],
    ["2026-02-20T00:00:00Z", "2026-02-20", true],
    ["2026-02-20T23:59:59Z", "2026-02-20", true],
    ["2026-02-20T23:59:59+00:00", "2026-02-20", true],
    ["2026-02-20T00:00:00-10:00", "2026-02-20", true],
    ["invalid", "2026-02-20", false],
    ["2026-02-20", "invalid", false],
    ["", "2026-02-20", false],
    ["2026-02-20", "", false],
    ["2024-02-29", "2024-02-29", true],
    ["2024-02-29", "2024-03-01", false],
    ["2030-01-01T10:00:00Z", "2030-01-01", true],
    ["2030-01-01T10:00:00Z", "2030-01-02", false],
    ["1999-12-31T23:00:00-01:00", "2000-01-01", false],
    ["1999-12-31T23:00:00+01:00", "1999-12-31", true],
    ["2028-06-30T18:30:00+09:00", "2028-06-30", true],
    ["2028-06-30T18:30:00-09:00", "2028-06-30", true],
    ["2032-11-15T03:04:05-00:00", "2032-11-15", true],
    ["1900-02-28", "1900-02-28", true],
  ];

  for (const [a, b, expected] of sameCases) {
    w.add({
      section: "§3",
      profile: "core-lite",
      operation: "date.is_same",
      assertion: "envelope_equals",
      input: { a, b },
      expect: { ok: true, result: { value: expected } },
    });
  }

  const beforeCases = [
    ["2026-02-19", "2026-02-20", true],
    ["2026-02-20", "2026-02-20", false],
    ["2026-02-21", "2026-02-20", false],
    ["2026-02-20T00:00:00Z", "2026-02-21", true],
    ["2026-02-20T23:59:59Z", "2026-02-20", false],
    ["2026-02-20", "2026-02-20T00:00:00Z", false],
    ["2024-02-29", "2024-03-01", true],
    ["2024-03-01", "2024-02-29", false],
    ["invalid", "2026-02-20", false],
    ["2026-02-20", "invalid", false],
    ["", "2026-02-20", false],
    ["2026-02-20", "", false],
    ["1999-12-31", "2000-01-01", true],
    ["2000-01-01", "1999-12-31", false],
    ["2030-01-01T10:00:00Z", "2030-01-02", true],
    ["2030-01-01T10:00:00Z", "2030-01-01", false],
    ["1970-01-01", "1970-01-02", true],
    ["1970-01-02", "1970-01-01", false],
    ["2028-06-30", "2028-07-01", true],
    ["2028-07-01", "2028-06-30", false],
  ];

  for (const [a, b, expected] of beforeCases) {
    w.add({
      section: "§3",
      profile: "core-lite",
      operation: "date.is_before",
      assertion: "envelope_equals",
      input: { a, b },
      expect: { ok: true, result: { value: expected } },
    });
  }

  const resolveTargetCases = [
    { explicitDate: "2026-02-20", scheduled: undefined, due: undefined, expect: "2026-02-20", ok: true },
    { explicitDate: "2026-02-30", scheduled: undefined, due: undefined, ok: false },
    { explicitDate: undefined, scheduled: "2026-03-10", due: undefined, expect: "2026-03-10", ok: true },
    { explicitDate: undefined, scheduled: "2026-03-10T09:00:00Z", due: undefined, expect: "2026-03-10", ok: true },
    { explicitDate: undefined, scheduled: "bad", due: "2026-04-01", expect: "2026-04-01", ok: true },
    { explicitDate: undefined, scheduled: "", due: "2026-04-01T12:30:00Z", expect: "2026-04-01", ok: true },
    { explicitDate: undefined, scheduled: undefined, due: "2026-05-01", expect: "2026-05-01", ok: true },
    { explicitDate: undefined, scheduled: undefined, due: undefined, expectRegex: "^\\d{4}-\\d{2}-\\d{2}$", ok: true },
    { explicitDate: undefined, scheduled: " ", due: " ", expectRegex: "^\\d{4}-\\d{2}-\\d{2}$", ok: true },
    { explicitDate: undefined, scheduled: "bad", due: "also-bad", expectRegex: "^\\d{4}-\\d{2}-\\d{2}$", ok: true },
    { explicitDate: "2024-02-29", scheduled: "2026-01-01", due: "2026-01-02", expect: "2024-02-29", ok: true },
    { explicitDate: undefined, scheduled: "2024-02-29", due: "2024-03-01", expect: "2024-02-29", ok: true },
    { explicitDate: undefined, scheduled: "2023-02-29", due: "2024-03-01", expect: "2024-03-01", ok: true },
    { explicitDate: undefined, scheduled: "2026-11-05T23:59:59-08:00", due: undefined, expect: "2026-11-05", ok: true },
    { explicitDate: undefined, scheduled: "invalid", due: "2026-11-06T00:00:00+09:00", expect: "2026-11-06", ok: true },
    { explicitDate: undefined, scheduled: "2026-01-01", due: "2026-01-02", expect: "2026-01-01", ok: true },
  ];

  for (const c of resolveTargetCases) {
    if (!c.ok) {
      w.add({
        section: "§3",
        profile: "core-lite",
        operation: "date.resolve_operation_target",
        assertion: "envelope_error",
        input: {
          explicitDate: c.explicitDate,
          scheduled: c.scheduled,
          due: c.due,
        },
        expect: { error: { $regex: "Invalid|Expected|Failed to parse" } },
      });
      continue;
    }

    const expect = c.expect
      ? { ok: true, result: { value: c.expect } }
      : { ok: true, result: { value: { $regex: c.expectRegex } } };

    w.add({
      section: "§3",
      profile: "core-lite",
      operation: "date.resolve_operation_target",
      assertion: "envelope_equals",
      input: {
        explicitDate: c.explicitDate,
        scheduled: c.scheduled,
        due: c.due,
      },
      expect,
    });
  }

  const timezoneBoundaryCases = [
    { instant: "2026-02-20T00:30:00Z", timezone: "America/Los_Angeles", expectedDay: "2026-02-19" },
    { instant: "2026-02-20T00:30:00Z", timezone: "Asia/Tokyo", expectedDay: "2026-02-20" },
    { instant: "2026-12-31T23:30:00Z", timezone: "Pacific/Kiritimati", expectedDay: "2027-01-01" },
    { instant: "2026-01-01T00:30:00Z", timezone: "Pacific/Honolulu", expectedDay: "2025-12-31" },
    { instant: "2026-03-08T09:30:00Z", timezone: "America/New_York", expectedDay: "2026-03-08" }, // DST boundary day
  ];

  for (const c of timezoneBoundaryCases) {
    w.add({
      section: "§3.6",
      profile: "core-lite",
      operation: "date.day_in_timezone",
      assertion: "envelope_equals",
      input: c,
      expect: {
        ok: true,
        result: { value: c.expectedDay },
      },
    });
  }

  w.add({
    section: "§3.6",
    profile: "core-lite",
    operation: "date.day_in_timezone",
    assertion: "envelope_error",
    input: {
      instant: "2026-02-20T00:30:00Z",
      timezone: "Invalid/Zone",
    },
    expect: {
      error: { $regex: "timezone|Invalid|unknown" },
    },
  });

  return w.list();
}

function buildFieldFixtures() {
  const w = makeWriter("field");

  const roles = [
    "title",
    "status",
    "priority",
    "due",
    "scheduled",
    "completedDate",
    "tags",
    "contexts",
    "projects",
    "timeEstimate",
    "dateCreated",
    "dateModified",
    "recurrence",
    "recurrenceAnchor",
    "completeInstances",
    "skippedInstances",
    "timeEntries",
  ];

  for (const role of roles) {
    w.add({
      section: "§2",
      profile: "core-lite",
      operation: "field.default_mapping",
      assertion: "envelope_equals",
      input: { checkRole: role },
      expect: {
        ok: true,
        result: {
          roleToField: { $contains: { [role]: role } },
          fieldToRole: { $contains: { [role]: role } },
          displayNameKey: "title",
        },
      },
    });
  }

  const fieldsByRole = {};
  for (const role of roles) {
    fieldsByRole[`custom_${role}`] = { type: "string", tn_role: role };
  }

  for (const role of roles) {
    w.add({
      section: "§2",
      profile: "core-lite",
      operation: "field.build_mapping",
      assertion: "envelope_equals",
      input: { fields: fieldsByRole, displayNameKey: "custom_title", checkRole: role },
      expect: {
        ok: true,
        result: {
          roleToField: { $contains: { [role]: `custom_${role}` } },
          fieldToRole: { $contains: { [`custom_${role}`]: role } },
          displayNameKey: "custom_title",
        },
      },
    });
  }

  const fallbackFields = {
    title: { type: "string" },
    status: { type: "string", values: ["todo", "doing", "finished"] },
    dateCreated: { type: "datetime" },
    random: { type: "string" },
  };

  const fallbackChecks = [
    ["title", "title"],
    ["status", "status"],
    ["priority", "priority"],
    ["due", "due"],
    ["scheduled", "scheduled"],
    ["dateCreated", "dateCreated"],
  ];

  for (const [role, expectedField] of fallbackChecks) {
    w.add({
      section: "§2",
      profile: "core-lite",
      operation: "field.build_mapping",
      assertion: "envelope_equals",
      input: { fields: fallbackFields, checkRole: role },
      expect: {
        ok: true,
        result: {
          roleToField: { $contains: { [role]: expectedField } },
          completedStatuses: ["done", "cancelled"],
        },
      },
    });
  }

  const explicitCompletedFields = {
    taskStatus: {
      type: "enum",
      tn_role: "status",
      values: ["open", "done", "cancelled"],
      tn_completed_values: ["done", "cancelled"],
    },
  };

  w.add({
    section: "§2",
    profile: "core-lite",
    operation: "field.build_mapping",
    assertion: "envelope_equals",
    input: { fields: explicitCompletedFields },
    expect: {
      ok: true,
      result: {
        completedStatuses: ["done", "cancelled"],
        roleToField: { $contains: { status: "taskStatus" } },
      },
    },
  });

  const inferredCompletedFields = {
    myStatus: {
      type: "enum",
      tn_role: "status",
      values: ["open", "in-progress", "completed", "cancelled"],
    },
  };

  w.add({
    section: "§2",
    profile: "core-lite",
    operation: "field.build_mapping",
    assertion: "envelope_equals",
    input: { fields: inferredCompletedFields },
    expect: { ok: true, result: { completedStatuses: ["completed", "cancelled"] } },
  });

  const fallbackCompletedFields = {
    state: {
      type: "enum",
      tn_role: "status",
      values: ["todo", "doing", "backlog"],
    },
  };

  w.add({
    section: "§2",
    profile: "core-lite",
    operation: "field.build_mapping",
    assertion: "envelope_equals",
    input: { fields: fallbackCompletedFields },
    expect: { ok: true, result: { completedStatuses: ["done", "cancelled"] } },
  });

  const completeStatusChecks = [
    [explicitCompletedFields, "done", true],
    [explicitCompletedFields, "cancelled", true],
    [explicitCompletedFields, "open", false],
    [inferredCompletedFields, "completed", true],
    [inferredCompletedFields, "cancelled", true],
    [inferredCompletedFields, "open", false],
    [fallbackCompletedFields, "done", true],
    [fallbackCompletedFields, "cancelled", true],
    [fallbackCompletedFields, "todo", false],
  ];

  for (const [fields, status, value] of completeStatusChecks) {
    w.add({
      section: "§2",
      profile: "core-lite",
      operation: "field.is_completed_status",
      assertion: "envelope_equals",
      input: { fields, status },
      expect: { ok: true, result: { value } },
    });
  }

  const defaultStatusChecks = [
    [explicitCompletedFields, "done"],
    [inferredCompletedFields, "completed"],
    [fallbackCompletedFields, "done"],
  ];

  for (const [fields, value] of defaultStatusChecks) {
    w.add({
      section: "§2",
      profile: "core-lite",
      operation: "field.default_completed_status",
      assertion: "envelope_equals",
      input: { fields },
      expect: { ok: true, result: { value } },
    });
  }

  const mappingFields = {
    myTitle: { tn_role: "title" },
    myStatus: { tn_role: "status" },
    myDue: { tn_role: "due" },
    myTags: { tn_role: "tags" },
    myContexts: { tn_role: "contexts" },
    myProjects: { tn_role: "projects" },
    myCreated: { tn_role: "dateCreated" },
    myModified: { tn_role: "dateModified" },
  };

  const baseFrontmatter = {
    myTitle: "Plan workshop",
    myStatus: "open",
    myDue: "2026-02-20",
    myTags: ["work", "planning"],
    myContexts: ["office"],
    myProjects: ["[[projects/demo]]"],
    myCreated: "2026-02-19T10:00:00Z",
    myModified: "2026-02-19T10:05:00Z",
    vendorField: "ZX-42",
    nested: { a: 1 },
  };

  const normalizeChecks = [
    ["title", "Plan workshop"],
    ["status", "open"],
    ["due", "2026-02-20"],
    ["dateCreated", "2026-02-19T10:00:00Z"],
    ["dateModified", "2026-02-19T10:05:00Z"],
    ["vendorField", "ZX-42"],
  ];

  for (const [key, value] of normalizeChecks) {
    w.add({
      section: "§2",
      profile: "core-lite",
      operation: "field.normalize",
      assertion: "envelope_equals",
      input: { fields: mappingFields, frontmatter: baseFrontmatter, checkKey: key },
      expect: { ok: true, result: { normalized: { $contains: { [key]: value } } } },
    });
  }

  const denormalizedInput = {
    title: "Plan workshop",
    status: "open",
    due: "2026-02-20",
    tags: ["work", "planning"],
    contexts: ["office"],
    projects: ["[[projects/demo]]"],
    dateCreated: "2026-02-19T10:00:00Z",
    dateModified: "2026-02-19T10:05:00Z",
    vendorField: "ZX-42",
  };

  const denormalizeChecks = [
    ["myTitle", "Plan workshop"],
    ["myStatus", "open"],
    ["myDue", "2026-02-20"],
    ["myCreated", "2026-02-19T10:00:00Z"],
    ["myModified", "2026-02-19T10:05:00Z"],
    ["vendorField", "ZX-42"],
  ];

  for (const [key, value] of denormalizeChecks) {
    w.add({
      section: "§2",
      profile: "core-lite",
      operation: "field.denormalize",
      assertion: "envelope_equals",
      input: { fields: mappingFields, roleData: denormalizedInput, checkKey: key },
      expect: { ok: true, result: { denormalized: { $contains: { [key]: value } } } },
    });
  }

  const displayCases = [
    {
      frontmatter: { title: "Primary title", secondaryTitle: "Fallback" },
      fields: { secondaryTitle: { tn_role: "title" } },
      displayNameKey: "secondaryTitle",
      taskPath: "tasks/FromPath.md",
      expected: "Fallback",
    },
    {
      frontmatter: { secondaryTitle: "Display title" },
      fields: { secondaryTitle: { tn_role: "title" } },
      displayNameKey: "secondaryTitle",
      taskPath: "tasks/FromPath.md",
      expected: "Display title",
    },
    {
      frontmatter: { title: "Title fallback" },
      fields: { customTitle: { tn_role: "title" } },
      displayNameKey: "customTitle",
      taskPath: "tasks/FromPath.md",
      expected: "Title fallback",
    },
    {
      frontmatter: {},
      fields: { customTitle: { tn_role: "title" } },
      displayNameKey: "customTitle",
      taskPath: "tasks/FromPath.md",
      expected: "FromPath",
    },
    {
      frontmatter: {},
      fields: { customTitle: { tn_role: "title" } },
      displayNameKey: "customTitle",
      taskPath: "",
      expected: null,
    },
    {
      frontmatter: { title: "  Trim me  " },
      fields: { title: { type: "string" } },
      displayNameKey: "title",
      taskPath: "tasks/Name.md",
      expected: "  Trim me  ",
    },
    {
      frontmatter: { title: "", customTitle: "" },
      fields: { customTitle: { tn_role: "title" } },
      displayNameKey: "customTitle",
      taskPath: "tasks/FallbackOnly.md",
      expected: "FallbackOnly",
    },
    {
      frontmatter: { title: "", customTitle: "" },
      fields: { customTitle: { tn_role: "title" } },
      displayNameKey: "customTitle",
      taskPath: undefined,
      expected: null,
    },
  ];

  for (const c of displayCases) {
    w.add({
      section: "§2",
      profile: "core-lite",
      operation: "field.resolve_display_title",
      assertion: "envelope_equals",
      input: c,
      expect: { ok: true, result: { value: c.expected } },
    });
  }

  // Identity fallback coverage: when tn_role is absent but field name equals role.
  for (const role of roles) {
    w.add({
      section: "§2",
      profile: "core-lite",
      operation: "field.build_mapping",
      assertion: "envelope_equals",
      input: { fields: { [role]: { type: "string" } }, checkRole: role },
      expect: {
        ok: true,
        result: {
          roleToField: { $contains: { [role]: role } },
        },
      },
    });
  }

  // Duplicate-role resilience: the first field claiming a role should win.
  const duplicateRoleCases = [
    ["title", "firstTitle", "secondTitle"],
    ["status", "primaryStatus", "secondaryStatus"],
    ["due", "mainDue", "fallbackDue"],
    ["scheduled", "mainScheduled", "otherScheduled"],
    ["dateModified", "editedAt", "updatedAt"],
  ];

  for (const [role, firstField, secondField] of duplicateRoleCases) {
    w.add({
      section: "§2",
      profile: "core-lite",
      operation: "field.build_mapping",
      assertion: "envelope_equals",
      input: {
        fields: {
          [firstField]: { type: "string", tn_role: role },
          [secondField]: { type: "string", tn_role: role },
        },
        checkRole: role,
      },
      expect: {
        ok: true,
        result: {
          roleToField: { $contains: { [role]: firstField } },
        },
      },
    });
  }

  // Role-by-role normalize/denormalize checks.
  const roleValues = {
    title: "Roadmap sync",
    status: "open",
    priority: "high",
    due: "2026-08-21",
    scheduled: "2026-08-20",
    completedDate: "2026-08-22",
    tags: ["planning", "team"],
    contexts: ["office"],
    projects: ["[[projects/ops]]"],
    timeEstimate: "PT45M",
    dateCreated: "2026-08-19T10:00:00Z",
    dateModified: "2026-08-19T11:00:00Z",
    recurrence: "FREQ=DAILY",
    recurrenceAnchor: "scheduled",
    completeInstances: ["2026-08-20"],
    skippedInstances: ["2026-08-21"],
    timeEntries: [{ startTime: "2026-08-19T10:00:00Z", endTime: "2026-08-19T10:30:00Z" }],
  };

  for (const role of roles) {
    const fieldName = `mapped_${role}`;
    const value = roleValues[role];
    w.add({
      section: "§2",
      profile: "core-lite",
      operation: "field.normalize",
      assertion: "envelope_equals",
      input: {
        fields: { [fieldName]: { type: "string", tn_role: role } },
        frontmatter: { [fieldName]: value },
        checkKey: role,
      },
      expect: { ok: true, result: { normalized: { $contains: { [role]: value } } } },
    });

    w.add({
      section: "§2",
      profile: "core-lite",
      operation: "field.denormalize",
      assertion: "envelope_equals",
      input: {
        fields: { [fieldName]: { type: "string", tn_role: role } },
        roleData: { [role]: value },
        checkKey: fieldName,
      },
      expect: { ok: true, result: { denormalized: { $contains: { [fieldName]: value } } } },
    });
  }

  return w.list();
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function buildRecurrenceFixtures() {
  const w = makeWriter("recurrence");

  const rules = [
    "FREQ=DAILY",
    "FREQ=WEEKLY;BYDAY=MO",
    "FREQ=MONTHLY;BYMONTHDAY=15",
  ];

  const anchors = ["scheduled", "completion"];
  const scheduledDates = ["2026-01-05", "2026-01-12", "2026-02-02", "2026-03-01", "2026-04-01"];
  const completionOffsets = [0, 1, 7];
  const dueOffsets = [0, 2];

  for (const recurrence of rules) {
    for (const recurrenceAnchor of anchors) {
      for (const scheduled of scheduledDates) {
        for (const completionOffset of completionOffsets) {
          for (const dueOffset of dueOffsets) {
            const completionDate = addDays(scheduled, completionOffset);
            const due = addDays(scheduled, dueOffset);
            const completeInstances = [addDays(scheduled, -7), addDays(scheduled, -3)];
            const skippedInstances = [completionDate, addDays(scheduled, -1)];

            w.add({
              section: "§4",
              profile: "recurrence",
              operation: "recurrence.complete",
              assertion: "recurrence_complete_invariants",
              input: {
                recurrence,
                recurrenceAnchor,
                scheduled,
                due,
                dateCreated: addDays(scheduled, -14),
                completionDate,
                completeInstances,
                skippedInstances,
              },
            });
          }
        }
      }
    }
  }

  const recalcRules = ["FREQ=DAILY", "FREQ=WEEKLY;BYDAY=MO"];
  const recalcScheduled = ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01"];
  const referenceOffsets = [0, 2, 7];

  for (const recurrence of recalcRules) {
    for (const recurrenceAnchor of anchors) {
      for (const scheduled of recalcScheduled) {
        for (const refOffset of referenceOffsets) {
          const referenceDate = addDays(scheduled, refOffset);
          const due = addDays(scheduled, 2);
          const completeInstances = [addDays(scheduled, -1), addDays(scheduled, 0), addDays(scheduled, 1)];
          const skippedInstances = [addDays(scheduled, 2), addDays(scheduled, 3)];

          w.add({
            section: "§4",
            profile: "recurrence",
            operation: "recurrence.recalculate",
            assertion: "recurrence_recalculate_invariants",
            input: {
              recurrence,
              recurrenceAnchor,
              scheduled,
              due,
              dateCreated: addDays(scheduled, -10),
              completeInstances,
              skippedInstances,
              referenceDate,
            },
          });
        }
      }
    }
  }

  // Supplemental recurrence matrix to improve profile-depth coverage.
  const supplementalRules = [
    "FREQ=DAILY;INTERVAL=2",
    "FREQ=WEEKLY;BYDAY=MO,WE,FR",
    "FREQ=MONTHLY;BYMONTHDAY=1",
    "FREQ=MONTHLY;BYMONTHDAY=28",
  ];
  const supplementalScheduled = [
    "2026-05-01",
    "2026-06-01",
    "2026-07-01",
    "2026-08-01",
    "2026-09-01",
    "2026-10-01",
  ];
  const supplementalCompletionOffsets = [0, 1, 3, 14];
  const supplementalDueOffsets = [0, 1, 2];

  for (const recurrence of supplementalRules) {
    for (const recurrenceAnchor of anchors) {
      for (const scheduled of supplementalScheduled) {
        for (const completionOffset of supplementalCompletionOffsets) {
          for (const dueOffset of supplementalDueOffsets) {
            const completionDate = addDays(scheduled, completionOffset);
            const due = addDays(scheduled, dueOffset);
            const completeInstances = [addDays(scheduled, -14), addDays(scheduled, -7)];
            const skippedInstances = [addDays(scheduled, -1), addDays(scheduled, 1)];

            w.add({
              section: "§4",
              profile: "recurrence",
              operation: "recurrence.complete",
              assertion: "recurrence_complete_invariants",
              input: {
                recurrence,
                recurrenceAnchor,
                scheduled,
                due,
                dateCreated: addDays(scheduled, -30),
                completionDate,
                completeInstances,
                skippedInstances,
              },
            });
          }
        }
      }
    }
  }

  const supplementalRecalcRules = [
    "FREQ=DAILY;INTERVAL=3",
    "FREQ=WEEKLY;BYDAY=TU,TH",
    "FREQ=MONTHLY;BYMONTHDAY=5",
    "FREQ=MONTHLY;BYMONTHDAY=20",
  ];
  const supplementalReferenceOffsets = [0, 1, 2, 7];

  for (const recurrence of supplementalRecalcRules) {
    for (const recurrenceAnchor of anchors) {
      for (const scheduled of supplementalScheduled) {
        for (const refOffset of supplementalReferenceOffsets) {
          const referenceDate = addDays(scheduled, refOffset);
          const due = addDays(scheduled, 2);
          const completeInstances = [addDays(scheduled, -2), addDays(scheduled, 0)];
          const skippedInstances = [addDays(scheduled, 3), addDays(scheduled, 4)];

          w.add({
            section: "§4",
            profile: "recurrence",
            operation: "recurrence.recalculate",
            assertion: "recurrence_recalculate_invariants",
            input: {
              recurrence,
              recurrenceAnchor,
              scheduled,
              due,
              dateCreated: addDays(scheduled, -15),
              completeInstances,
              skippedInstances,
              referenceDate,
            },
          });
        }
      }
    }
  }

  return w.list();
}

function buildCreateCompatFixtures() {
  const w = makeWriter("create_compat");

  const templates = [
    "tasks/{title}",
    "tasks/{titleKebab}",
    "tasks/{titleSnake}",
    "tasks/{priority}/{title}",
    "tasks/{status}/{titleKebab}",
    "tasks/{year}/{month}/{title}",
    "tasks/{year}/{monthNameShort}/{title}",
    "tasks/{date}/{title}",
    "tasks/{shortDate}/{title}",
    "tasks/{time}/{title}",
    "tasks/{timestamp}-{title}",
    "tasks/{zettel}",
    "tasks/{title}/{dueDate}",
    "tasks/{title}/{scheduledDate}",
    "tasks/{title}/{priorityShort}",
    "tasks/{title}/{statusShort}",
    "tasks/{title}/{titleCamel}",
    "tasks/{title}/{titlePascal}",
    "tasks/{title}/{titleUpper}",
    "tasks/{title}/{titleLower}",
    "tasks/{year}/{month}/{day}/{titleKebab}",
    "tasks/{year}/{monthName}/{title}",
    "tasks/{year}/{week}/{titleSnake}",
    "tasks/{priorityShort}/{statusShort}/{titleKebab}",
    "tasks/{title}/{date}/{time}",
    "tasks/{titleKebab}-{timestamp}",
    "tasks/{status}/{priority}/{titleLower}",
    "tasks/{titlePascal}/{scheduledDate}",
    "tasks/{titleCamel}/{dueDate}",
    "tasks/{monthNameShort}/{day}/{title}",
  ];

  const frontmatters = [
    { title: "Plan workshop", status: "open", priority: "normal" },
    { title: "Write report", status: "in-progress", priority: "high", due: "2026-02-20" },
    { title: "Ship release", status: "open", priority: "low", scheduled: "2026-02-21" },
    { title: "Call ACME", status: "blocked", priority: "urgent", due: "2026-02-22", scheduled: "2026-02-20" },
    { title: "Plan Q3 Objectives", status: "open", priority: "normal", due: "2026-07-15" },
    { title: "Publish API Notes", status: "in-review", priority: "high", scheduled: "2026-03-10" },
    { title: "Refactor Parser", status: "todo", priority: "low", due: "2026-04-04", scheduled: "2026-04-02" },
    { title: "Ops Weekly Sync", status: "open", priority: "normal", due: "2026-05-12" },
    { title: "Client Follow Up", status: "waiting", priority: "urgent", scheduled: "2026-06-01" },
    { title: "Document Runbook", status: "open", priority: "medium", due: "2026-08-08", scheduled: "2026-08-01" },
  ];

  for (const template of templates) {
    for (const frontmatter of frontmatters) {
      const needsDue = template.includes("{dueDate}");
      const needsScheduled = template.includes("{scheduledDate}");
      const hasDue = typeof frontmatter.due === "string" && frontmatter.due.trim().length > 0;
      const hasScheduled = typeof frontmatter.scheduled === "string" && frontmatter.scheduled.trim().length > 0;

      if ((needsDue && !hasDue) || (needsScheduled && !hasScheduled)) {
        w.add({
          section: "§5.3",
          profile: "core-lite",
          operation: "create_compat.create",
          assertion: "envelope_error",
          input: {
            fixedNow: "2026-02-20T10:20:30.000Z",
            taskType: {
              path_pattern: template,
              fields: {
                title: { type: "string", required: true },
                status: { type: "enum", default: "open" },
                priority: { type: "enum", default: "normal" },
                dateCreated: { type: "datetime" },
                dateModified: { type: "datetime" },
                tags: { type: "list", items: { type: "string" } },
              },
            },
            frontmatter,
          },
          expect: {
            error: { $regex: "path_required|missing template values" },
          },
        });
        continue;
      }

      w.add({
        section: "§5.3",
        profile: "core-lite",
        operation: "create_compat.create",
        assertion: "create_compat_invariants",
        input: {
          fixedNow: "2026-02-20T10:20:30.000Z",
          taskType: {
            path_pattern: template,
            fields: {
              title: { type: "string", required: true },
              status: { type: "enum", default: "open" },
              priority: { type: "enum", default: "normal" },
              dateCreated: { type: "datetime" },
              dateModified: { type: "datetime" },
              tags: { type: "list", items: { type: "string" } },
            },
          },
          frontmatter,
        },
        expect: {
          ok: true,
          result: {
            path: { $regex: ".+\\.md$" },
            frontmatter: {
              $contains: {
                dateCreated: "2026-02-20T10:20:30.000Z",
                dateModified: "2026-02-20T10:20:30.000Z",
              },
            },
          },
        },
      });
    }
  }

  const whereCases = [
    { where: { kind: { eq: "task" } }, expectKey: "kind", expectValue: "task" },
    { where: { tags: { contains: "task" } }, expectKey: "tags", expectContains: "task" },
    { where: { owner: { exists: true } }, expectKey: "owner", expectValue: true },
    { where: { kind: "task" }, expectKey: "kind", expectValue: "task" },
  ];

  for (const c of whereCases) {
    const expectedFrontmatter = c.expectContains
      ? { [c.expectKey]: { $contains: [c.expectContains] } }
      : { [c.expectKey]: c.expectValue };

    w.add({
      section: "§5.3",
      profile: "core-lite",
      operation: "create_compat.create",
      assertion: "create_compat_invariants",
      input: {
        fixedNow: "2026-02-20T10:20:30.000Z",
        taskType: {
          path_pattern: "tasks/{title}",
          fields: {
            title: { type: "string", required: true },
            status: { type: "enum", default: "open" },
            priority: { type: "enum", default: "normal" },
            dateCreated: { type: "datetime" },
            dateModified: { type: "datetime" },
            owner: { type: "string" },
            kind: { type: "string" },
            tags: { type: "list", items: { type: "string" } },
          },
          match: { where: c.where },
        },
        frontmatter: { title: "Default check" },
      },
      expect: {
        ok: true,
        result: {
          frontmatter: { $contains: expectedFrontmatter },
        },
      },
    });
  }

  const defaultCases = [
    {
      fields: { status: { type: "enum", default: "open" } },
      frontmatter: { title: "A" },
      key: "status",
      expected: "open",
    },
    {
      fields: { priority: { type: "enum", default: "normal" } },
      frontmatter: { title: "B" },
      key: "priority",
      expected: "normal",
    },
    {
      fields: { customFlag: { type: "string", default: "yes" } },
      frontmatter: { title: "C" },
      key: "customFlag",
      expected: "yes",
    },
    {
      fields: { customFlag: { type: "string", default: "yes" } },
      frontmatter: { title: "D", customFlag: "no" },
      key: "customFlag",
      expected: "no",
    },
  ];

  for (const c of defaultCases) {
    w.add({
      section: "§5.3",
      profile: "core-lite",
      operation: "create_compat.create",
      assertion: "create_compat_invariants",
      input: {
        fixedNow: "2026-02-20T10:20:30.000Z",
        taskType: {
          path_pattern: "tasks/{title}",
          fields: {
            title: { type: "string", required: true },
            status: { type: "enum", default: "open" },
            priority: { type: "enum", default: "normal" },
            dateCreated: { type: "datetime" },
            dateModified: { type: "datetime" },
            ...c.fields,
          },
        },
        frontmatter: c.frontmatter,
      },
      expect: {
        ok: true,
        result: {
          frontmatter: { $contains: { [c.key]: c.expected } },
        },
      },
    });
  }

  const missingCases = [
    "tasks/{missingVar}/{title}",
    "tasks/{year}/{missingVar}/{title}",
    "tasks/{missingVarOne}/{missingVarTwo}/{title}",
    "tasks/{title}/{missingVar}",
    "tasks/{status}/{missingVar}/{titleKebab}",
    "tasks/{priority}/{missingVar}/{timestamp}",
    "tasks/{missingVar}/{missingVar2}/{missingVar3}",
    "tasks/{missingVar}/nested/{title}",
    "tasks/static/{missingVar}/file",
    "tasks/{missingVar}.md",
  ];

  for (const template of missingCases) {
    w.add({
      section: "§5.3",
      profile: "core-lite",
      operation: "create_compat.create",
      assertion: "envelope_error",
      input: {
        taskType: {
          path_pattern: template,
          fields: {
            title: { type: "string", required: true },
            status: { type: "enum", default: "open" },
            priority: { type: "enum", default: "normal" },
            dateCreated: { type: "datetime" },
            dateModified: { type: "datetime" },
          },
        },
        frontmatter: {
          title: "Missing template",
          status: "open",
        },
      },
      expect: {
        error: { $regex: "path_required|missing template values" },
      },
    });
  }

  const passthroughErrors = ["validation_error", "unknown", "permission_denied", "already_exists"];
  for (const code of passthroughErrors) {
    w.add({
      section: "§5.3",
      profile: "core-lite",
      operation: "create_compat.create",
      assertion: "envelope_error",
      input: {
        taskType: {
          path_pattern: "tasks/{title}",
          fields: {
            title: { type: "string", required: true },
            status: { type: "enum", default: "open" },
            priority: { type: "enum", default: "normal" },
            dateCreated: { type: "datetime" },
            dateModified: { type: "datetime" },
          },
        },
        frontmatter: { title: "Err case" },
        forceCreateError: code,
      },
      expect: {
        error: code,
      },
    });
  }

  return w.list();
}

function buildConformanceFixtures() {
  const w = makeWriter("conformance");

  w.add({
    section: "§7.10",
    profile: "core-lite",
    operation: "meta.claim",
    assertion: "envelope_equals",
    input: {},
    expect: {
      ok: true,
      result: {
        implementation: { $regex: "^\\S+$" },
        version: { $regex: "^\\S+$" },
        spec_version: { $regex: "^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?$" },
        validation_modes: { $contains: ["strict"] },
        profiles: { $contains: [] },
        capabilities: { $contains: [] },
      },
    },
  });

  const capabilityChecks = [
    "dependencies",
    "reminders",
    "links",
    "rename",
    "archive",
    "batch",
    "concurrency",
    "dry-run",
    "time-tracking",
    "migration",
    "templating",
  ];

  for (const capability of capabilityChecks) {
    w.add({
      section: "§7.11",
      profile: "core-lite",
      operation: "meta.has_capability",
      assertion: "envelope_equals",
      input: { capability },
      expect: { ok: true, result: { value: { $oneOf: [true, false] } } },
    });
  }

  const profileChecks = [
    "core-lite",
    "recurrence",
    "extended",
    "templating",
  ];

  for (const profile of profileChecks) {
    w.add({
      section: "§7.10",
      profile: "core-lite",
      operation: "meta.has_profile",
      assertion: "envelope_equals",
      input: { profile },
      expect: { ok: true, result: { value: { $oneOf: [true, false] } } },
    });
  }

  // Claim consistency: extended profile implies required capability tokens.
  w.add({
    section: "§7.3.4",
    profile: "extended",
    operation: "meta.claim",
    assertion: "envelope_equals",
    input: {},
    expect: {
      ok: true,
      result: {
        profiles: { $contains: ["extended"] },
        capabilities: { $contains: ["dependencies", "reminders", "links", "time-tracking"] },
      },
    },
  });

  // Claim consistency: templating profile implies templating capability token.
  w.add({
    section: "§7.3.3",
    profile: "templating",
    operation: "meta.claim",
    assertion: "envelope_equals",
    input: {},
    expect: {
      ok: true,
      result: {
        profiles: { $contains: ["templating"] },
        capabilities: { $contains: ["templating"] },
      },
    },
  });

  return w.list();
}

function buildConfigFixtures() {
  const w = makeWriter("config");

  const flags = [undefined, "", " ", "/var/flag", "relative/flag", "./dot/flag"];
  const envs = [undefined, "", " ", "/var/env", "relative/env", "./dot/env"];
  const persisted = [undefined, "", " ", "/var/cfg", "relative/cfg", "./dot/cfg"];
  const cwds = ["/work/a", "/work/b", "workspace/c"];

  function normalize(value) {
    if (value === undefined || value === null || String(value).trim().length === 0) return undefined;
    return value;
  }

  for (const flagPath of flags) {
    for (const envPath of envs) {
      for (const persistedPath of persisted) {
        for (const cwd of cwds) {
          const chosen = normalize(flagPath) ?? normalize(envPath) ?? normalize(persistedPath) ?? cwd;
          const chosenSuffix = String(chosen).replace(/^\.\/+/, "");
          const chosenRegex = chosenSuffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          w.add({
            section: "§9",
            profile: "core-lite",
            operation: "config.resolve_collection_path",
            assertion: "envelope_equals",
            requires: ["config-lite"],
            input: {
              flagPath,
              envPath,
              persistedPath,
              cwd,
            },
            expect: {
              ok: true,
              result: {
                value: {
                  $oneOf: [
                    { $regex: `${chosenRegex}$` },
                  ],
                },
              },
            },
          });
        }
      }
    }
  }

  const mergeCases = [
    {
      providers: [
        { mapping: { title: "title", status: "status" }, validation: { mode: "strict" } },
        { mapping: { title: "taskName" } },
      ],
      expected: { mapping: { title: "taskName" }, validation: { mode: "strict" } },
    },
    {
      providers: [
        { status: { values: ["open", "done"], default: "open" } },
        { status: { values: ["todo", "done"], default: "todo" } },
      ],
      expected: { status: { values: ["todo", "done"], default: "todo" } },
    },
    {
      providers: [
        { templating: { enabled: false, failure_mode: "warning_fallback" } },
        { templating: { enabled: true, template_path: "Templates/Task.md" } },
      ],
      expected: { templating: { enabled: true, template_path: "Templates/Task.md" } },
    },
    {
      providers: [
        { links: { extensions: [".md"], unresolved_default_severity: "warning" } },
        { links: { extensions: [".md", ".markdown"] } },
      ],
      expected: { links: { extensions: [".md", ".markdown"] } },
    },
  ];

  for (const { providers, expected } of mergeCases) {
    w.add({
      section: "§9",
      profile: "core-lite",
      operation: "config.merge_top_level",
      assertion: "envelope_equals",
      requires: ["config-lite"],
      input: { providers },
      expect: { ok: true, result: { value: expected } },
    });
  }

  const specVersionCases = [
    { providerSpecVersion: "0.1.0-draft", targetSpecVersion: "0.1.0-draft", expected: "0.1.0-draft", synthesized: false },
    { providerSpecVersion: "0.2.0", targetSpecVersion: "0.1.0-draft", expected: "0.2.0", synthesized: false },
    { providerSpecVersion: undefined, targetSpecVersion: "0.1.0-draft", expected: "0.1.0-draft", synthesized: true },
    { providerSpecVersion: "", targetSpecVersion: "0.1.0-draft", expected: "0.1.0-draft", synthesized: true },
    { providerSpecVersion: undefined, targetSpecVersion: "1.0.0", expected: "1.0.0", synthesized: true },
    { providerSpecVersion: "2.1.3", targetSpecVersion: "1.0.0", expected: "2.1.3", synthesized: false },
  ];

  for (const c of specVersionCases) {
    w.add({
      section: "§9",
      profile: "core-lite",
      operation: "config.spec_version_effective",
      assertion: "envelope_equals",
      requires: ["config-lite"],
      input: c,
      expect: {
        ok: true,
        result: { value: c.expected, synthesized: c.synthesized },
      },
    });
  }

  const pluginCases = [
    {
      data: {
        fieldMapping: {
          title: "title",
          status: "status",
          dateCreated: "dateCreated",
          dateModified: "dateModified",
          completedDate: "completedDate",
          blockedBy: "blockedBy",
          timeEntries: "timeEntries",
        },
        storeTitleInFilename: true,
        taskFilenameFormat: "zettel",
        customFilenameTemplate: "{{date}} {{title}}",
        taskCreationDefaults: {
          useBodyTemplate: true,
          bodyTemplate: "Templates/Task.md",
        },
        customStatuses: [
          { value: "open", isCompleted: false },
          { value: "done", isCompleted: true },
          { value: "cancelled", isCompleted: true },
        ],
        defaultTaskStatus: "open",
        defaultTaskPriority: "normal",
      },
      expectContains: {
        mapping: {
          title: "title",
          status: "status",
          date_created: "dateCreated",
          date_modified: "dateModified",
          completed_date: "completedDate",
          blocked_by: "blockedBy",
          time_entries: "timeEntries",
        },
        title: {
          storage: "filename",
          filename_format: "zettel",
          custom_filename_template: "{{date}} {{title}}",
        },
        templating: {
          enabled: true,
          template_path: "Templates/Task.md",
        },
        status: {
          values: ["open", "done", "cancelled"],
          default: "open",
          completed_values: ["done", "cancelled"],
        },
        defaults: {
          status: "open",
          priority: "normal",
        },
      },
    },
    {
      data: {
        fieldMapping: {
          recurrenceAnchor: "recurAnchor",
          completeInstances: "doneDates",
          skippedInstances: "skipDates",
          timeEstimate: "estimate",
        },
        storeTitleInFilename: false,
        taskCreationDefaults: {
          useBodyTemplate: false,
          bodyTemplate: "",
        },
      },
      expectContains: {
        mapping: {
          recurrence_anchor: "recurAnchor",
          complete_instances: "doneDates",
          skipped_instances: "skipDates",
          time_estimate: "estimate",
        },
        title: {
          storage: "frontmatter",
        },
        templating: {
          enabled: false,
          template_path: "",
        },
      },
    },
    {
      data: {
        customStatuses: [
          { value: "todo", isCompleted: false },
          { value: "in-progress", isCompleted: false },
          { value: "done", isCompleted: true },
        ],
        defaultTaskStatus: "todo",
      },
      expectContains: {
        status: {
          values: ["todo", "in-progress", "done"],
          default: "todo",
          completed_values: ["done"],
        },
        defaults: {
          status: "todo",
        },
      },
    },
    {
      data: {
        taskIdentificationMethod: "tag",
        taskTag: "task",
        tasksFolder: "TaskNotes/Tasks",
      },
      expectContains: {
        task_detection: {
          method: "tag",
          tag: "task",
          default_folder: "TaskNotes/Tasks",
        },
      },
    },
    {
      data: {
        taskIdentificationMethod: "property",
        taskPropertyName: "type",
        taskPropertyValue: "task",
      },
      expectContains: {
        task_detection: {
          method: "property",
          property_name: "type",
          property_value: "task",
        },
      },
    },
    {
      data: {
        autoStopTimeTrackingOnComplete: true,
        autoStopTimeTrackingNotification: false,
      },
      expectContains: {
        time_tracking: {
          auto_stop_on_complete: true,
          auto_stop_notification: false,
        },
      },
    },
    {
      data: {
        autoStopTimeTrackingOnComplete: false,
        autoStopTimeTrackingNotification: true,
      },
      expectContains: {
        time_tracking: {
          auto_stop_on_complete: false,
          auto_stop_notification: true,
        },
      },
    },
    {
      section: "§9.2.4",
      data: {
        tasksFolder: "TaskNotes/Tasks",
        excludedFolders: "TaskNotes/Archive,Templates",
        moveArchivedTasks: true,
        archiveFolder: "TaskNotes/Archive",
      },
      expectContains: {
        task_detection: {
          default_folder: "TaskNotes/Tasks",
          excluded_folders: "TaskNotes/Archive,Templates",
        },
        archive: {
          move_on_archive: true,
          folder: "TaskNotes/Archive",
        },
      },
    },
    {
      section: "§11.7",
      data: {
        useFrontmatterMarkdownLinks: true,
      },
      expectContains: {
        links: {
          use_markdown_format: true,
        },
      },
    },
    {
      section: "§9.20",
      data: {
        taskIdentificationMethod: "tag",
        taskTag: "task",
        tasksFolder: "TaskNotes/Tasks",
        archiveFolder: "TaskNotes/Archive",
        moveArchivedTasks: false,
        storeTitleInFilename: true,
        taskFilenameFormat: "title",
        defaultTaskStatus: "open",
        defaultTaskPriority: "normal",
        autoStopTimeTrackingOnComplete: true,
        autoStopTimeTrackingNotification: false,
      },
      expectContains: {
        task_detection: {
          method: "tag",
          tag: "task",
          default_folder: "TaskNotes/Tasks",
        },
        archive: {
          move_on_archive: false,
          folder: "TaskNotes/Archive",
        },
        title: {
          storage: "filename",
          filename_format: "title",
        },
        defaults: {
          status: "open",
          priority: "normal",
        },
        time_tracking: {
          auto_stop_on_complete: true,
          auto_stop_notification: false,
        },
      },
    },
  ];

  for (const c of pluginCases) {
    w.add({
      section: c.section || "§9.2.4",
      profile: "core-lite",
      operation: "config.map_tasknotes_plugin",
      assertion: "envelope_equals",
      requires: ["config-lite"],
      input: { data: c.data },
      expect: {
        ok: true,
        result: {
          value: { $contains: c.expectContains },
        },
      },
    });
  }

  const detectionCases = [
    {
      taskDetection: { method: "tag", tag: "task" },
      filePath: "TaskNotes/Tasks/a.md",
      frontmatter: { tags: ["task", "errands"] },
      body: "",
      expected: true,
    },
    {
      taskDetection: { method: "tag", tag: "#task" },
      filePath: "TaskNotes/Tasks/a.md",
      frontmatter: { tags: ["  #TASK  "] },
      body: "",
      expected: true,
    },
    {
      taskDetection: { method: "tag", tag: "task" },
      filePath: "TaskNotes/Tasks/a.md",
      frontmatter: { tags: "#task" },
      body: "",
      expected: true,
    },
    {
      taskDetection: { method: "tag", tag: "task" },
      filePath: "TaskNotes/Tasks/a.md",
      frontmatter: {},
      body: "Plan work #task today",
      expected: true,
    },
    {
      taskDetection: { method: "tag", tag: "task" },
      filePath: "TaskNotes/Tasks/a.md",
      frontmatter: {},
      body: "Plan work #tasking today",
      expected: false,
    },
    {
      taskDetection: { method: "tag", tag: "task" },
      filePath: "TaskNotes/Tasks/a.md",
      frontmatter: {},
      body: "Use `#task` literal only",
      expected: false,
    },
    {
      taskDetection: { method: "tag", tag: "task" },
      filePath: "TaskNotes/Tasks/a.md",
      frontmatter: {},
      body: "```md\n#task inside code fence\n```\noutside fence",
      expected: false,
    },
    {
      taskDetection: { method: "property", property_name: "type", property_value: "task" },
      filePath: "TaskNotes/Tasks/a.md",
      frontmatter: { type: "task" },
      body: "",
      expected: true,
    },
    {
      taskDetection: { method: "property", property_name: "type", property_value: "" },
      filePath: "TaskNotes/Tasks/a.md",
      frontmatter: { type: "anything" },
      body: "",
      expected: true,
    },
    {
      taskDetection: { method: "property", property_name: "type", property_value: "task" },
      filePath: "TaskNotes/Tasks/a.md",
      frontmatter: { type: "note" },
      body: "",
      expected: false,
    },
    {
      taskDetection: {
        method: "tag",
        tag: "task",
        excluded_folders: ["TaskNotes/Archive"],
      },
      filePath: "TaskNotes/Archive/a.md",
      frontmatter: { tags: ["task"] },
      body: "",
      expected: false,
    },
    {
      taskDetection: {
        methods: ["tag", "property"],
        combine: "or",
        tag: "task",
        property_name: "type",
        property_value: "task",
      },
      filePath: "TaskNotes/Tasks/a.md",
      frontmatter: { type: "task", tags: [] },
      body: "",
      expected: true,
    },
    {
      taskDetection: {
        methods: ["tag", "property"],
        combine: "and",
        tag: "task",
        property_name: "type",
        property_value: "task",
      },
      filePath: "TaskNotes/Tasks/a.md",
      frontmatter: { type: "task", tags: [] },
      body: "",
      expected: false,
    },
    {
      taskDetection: {
        methods: ["tag", "property"],
        combine: "and",
        tag: "task",
        property_name: "type",
        property_value: "task",
      },
      filePath: "TaskNotes/Tasks/a.md",
      frontmatter: { type: "task", tags: ["#task"] },
      body: "",
      expected: true,
    },
  ];

  for (const c of detectionCases) {
    w.add({
      section: "§9.7.1",
      profile: "core-lite",
      operation: "config.detect_task_file",
      assertion: "envelope_equals",
      requires: ["config-lite"],
      input: c,
      expect: {
        ok: true,
        result: {
          value: c.expected,
        },
      },
    });
  }

  return w.list();
}

function buildValidationFixtures() {
  const w = makeWriter("validation");

  const baseFields = {
    title: { type: "string", tn_role: "title" },
    status: { type: "enum", tn_role: "status", values: ["open", "doing", "done", "cancelled"] },
    due: { type: "date", tn_role: "due" },
    scheduled: { type: "date", tn_role: "scheduled" },
    completedDate: { type: "date", tn_role: "completedDate" },
    dateCreated: { type: "datetime", tn_role: "dateCreated" },
    dateModified: { type: "datetime", tn_role: "dateModified" },
    tags: { type: "list", tn_role: "tags" },
    contexts: { type: "list", tn_role: "contexts" },
    projects: { type: "list", tn_role: "projects" },
    timeEntries: { type: "list", tn_role: "timeEntries" },
  };

  const baseFrontmatter = {
    title: "Validation baseline",
    status: "open",
    due: "2026-03-20",
    scheduled: "2026-03-18",
    dateCreated: "2026-03-01T09:00:00Z",
    dateModified: "2026-03-01T10:00:00Z",
    tags: ["task"],
    contexts: ["home"],
    projects: ["[[projects/core]]"],
  };

  const missingRoleMasks = [
    ["status"],
    ["dateCreated"],
    ["dateModified"],
    ["status", "dateCreated"],
    ["status", "dateModified"],
    ["dateCreated", "dateModified"],
    ["status", "dateCreated", "dateModified"],
  ];

  for (const missing of missingRoleMasks) {
    const frontmatter = { ...baseFrontmatter };
    for (const key of missing) {
      delete frontmatter[key];
    }
    w.add({
      section: "§6",
      profile: "core-lite",
      operation: "validation.core_evaluate",
      assertion: "envelope_equals",
      requires: ["validation-core"],
      input: {
        fields: baseFields,
        frontmatter,
        taskPath: "tasks/Baseline.md",
      },
      expect: {
        ok: true,
        result: {
          hasErrors: true,
          errorCodes: { $contains: ["missing_required"] },
        },
      },
    });
  }

  const completedDateCases = [
    [{ ...baseFrontmatter, status: "done" }, true],
    [{ ...baseFrontmatter, status: "cancelled" }, true],
    [{ ...baseFrontmatter, status: "done", completedDate: "2026-03-20" }, false],
    [{ ...baseFrontmatter, status: "cancelled", completedDate: "2026-03-20T12:30:00Z" }, false],
    [{ ...baseFrontmatter, status: "open" }, false],
  ];

  for (const [frontmatter, shouldHaveMissingCompletedDate] of completedDateCases) {
    w.add({
      section: "§6",
      profile: "core-lite",
      operation: "validation.core_evaluate",
      assertion: "envelope_equals",
      requires: ["validation-core"],
      input: {
        fields: baseFields,
        frontmatter,
        taskPath: "tasks/Baseline.md",
      },
      expect: shouldHaveMissingCompletedDate
        ? {
            ok: true,
            result: {
              hasErrors: true,
              errorCodes: { $contains: ["missing_required"] },
            },
          }
        : {
            ok: true,
            result: {
              errorCodes: { $contains: [] },
            },
          },
    });
  }

  const titleCases = [
    [{ ...baseFrontmatter, title: "From frontmatter" }, "tasks/FromPath.md", false],
    [{ ...baseFrontmatter, title: "" }, "tasks/FromPath.md", false],
    [{ ...baseFrontmatter, title: "   " }, "tasks/FromPath.md", false],
    [{ ...baseFrontmatter, title: "" }, "", true],
    [{ ...baseFrontmatter, title: "" }, undefined, true],
  ];

  for (const [frontmatter, taskPath, expectUnresolvable] of titleCases) {
    w.add({
      section: "§6",
      profile: "core-lite",
      operation: "validation.core_evaluate",
      assertion: "envelope_equals",
      requires: ["validation-core"],
      input: {
        fields: baseFields,
        frontmatter,
        taskPath,
      },
      expect: expectUnresolvable
        ? {
            ok: true,
            result: {
              hasErrors: true,
              errorCodes: { $contains: ["unresolvable_title"] },
            },
          }
        : {
            ok: true,
            result: {
              allCodes: { $oneOf: [[], { $contains: [] }] },
            },
          },
    });
  }

  const invalidDateValues = [
    "not-a-date",
    "2026-13-10",
    "2026-02-30",
    "2026-02-20T25:00:00Z",
    "2026/02/20",
  ];

  const temporalFields = ["dateCreated", "dateModified", "due", "scheduled", "completedDate"];
  for (const field of temporalFields) {
    for (const value of invalidDateValues) {
      const frontmatter = { ...baseFrontmatter, [field]: value };
      if (field === "completedDate") {
        frontmatter.status = "done";
      }
      w.add({
        section: "§6",
        profile: "core-lite",
        operation: "validation.core_evaluate",
        assertion: "envelope_equals",
        requires: ["validation-core"],
        input: {
          fields: baseFields,
          frontmatter,
          taskPath: "tasks/Baseline.md",
        },
        expect: {
          ok: true,
          result: {
            hasErrors: true,
            errorCodes: { $contains: ["invalid_date_value"] },
          },
        },
      });
    }
  }

  const invalidTypeCases = [
    [{ ...baseFrontmatter, status: 3 }],
    [{ ...baseFrontmatter, due: 1234 }],
    [{ ...baseFrontmatter, scheduled: true }],
    [{ ...baseFrontmatter, tags: "task" }],
    [{ ...baseFrontmatter, contexts: { key: "value" } }],
    [{ ...baseFrontmatter, projects: "projects/core.md" }],
  ];

  for (const [frontmatter] of invalidTypeCases) {
    w.add({
      section: "§6",
      profile: "core-lite",
      operation: "validation.core_evaluate",
      assertion: "envelope_equals",
      requires: ["validation-core"],
      input: {
        fields: baseFields,
        frontmatter,
        taskPath: "tasks/Baseline.md",
      },
      expect: {
        ok: true,
        result: {
          hasErrors: true,
          errorCodes: { $contains: ["invalid_type"] },
        },
      },
    });
  }

  const modifiedOrderCases = [
    ["2026-03-01T09:00:00Z", "2026-03-01T10:00:00Z", false],
    ["2026-03-01", "2026-03-02", false],
    ["2026-03-01T10:00:00Z", "2026-03-01T09:00:00Z", true],
    ["2026-03-10", "2026-03-01", true],
  ];

  for (const [created, modified, shouldFail] of modifiedOrderCases) {
    w.add({
      section: "§6",
      profile: "core-lite",
      operation: "validation.core_evaluate",
      assertion: "envelope_equals",
      requires: ["validation-core"],
      input: {
        fields: baseFields,
        frontmatter: {
          ...baseFrontmatter,
          dateCreated: created,
          dateModified: modified,
        },
        taskPath: "tasks/Baseline.md",
      },
      expect: shouldFail
        ? {
            ok: true,
            result: {
              hasErrors: true,
              errorCodes: { $contains: ["date_modified_before_created"] },
            },
          }
        : {
            ok: true,
            result: {
              errorCodes: { $contains: [] },
            },
          },
    });
  }

  const unknownFieldCases = [
    [false, "info"],
    [true, "error"],
  ];

  for (const [rejectUnknownFields, expectedSeverity] of unknownFieldCases) {
    w.add({
      section: "§6",
      profile: "core-lite",
      operation: "validation.core_evaluate",
      assertion: "envelope_equals",
      requires: ["validation-core"],
      input: {
        fields: baseFields,
        frontmatter: {
          ...baseFrontmatter,
          vendorField: "X-123",
        },
        taskPath: "tasks/Baseline.md",
        rejectUnknownFields,
      },
      expect: {
        ok: true,
        result: {
          issues: { $contains: [{ code: "unknown_field", severity: expectedSeverity }] },
        },
      },
    });
  }

  const coreTimeValidationCases = [
    {
      frontmatter: {
        ...baseFrontmatter,
        timeEntries: [{ startTime: "2026-02-20T09:00:00Z" }, { startTime: "2026-02-20T10:00:00Z" }],
      },
      expectedCode: "multiple_active_time_entries",
    },
    {
      frontmatter: {
        ...baseFrontmatter,
        timeEntries: [{ endTime: "2026-02-20T10:00:00Z" }],
      },
      expectedCode: "missing_time_entry_start",
    },
  ];

  for (const c of coreTimeValidationCases) {
    w.add({
      section: "§6",
      profile: "extended",
      operation: "validation.core_evaluate",
      assertion: "envelope_equals",
      requires: ["validation-core", "time-tracking"],
      input: {
        fields: baseFields,
        frontmatter: c.frontmatter,
        taskPath: "tasks/Baseline.md",
      },
      expect: {
        ok: true,
        result: {
          hasErrors: true,
          errorCodes: { $contains: [c.expectedCode] },
        },
      },
    });
  }

  const timeEntryValidationCases = [
    {
      entries: [{ startTime: "2026-02-20T09:00:00Z" }, { startTime: "2026-02-20T10:00:00Z" }],
      assertion: "envelope_error",
      regex: "multiple_active_time_entries|active",
    },
    {
      entries: [{ endTime: "2026-02-20T10:00:00Z" }],
      assertion: "envelope_error",
      regex: "missing_time_entry_start|startTime",
    },
    {
      entries: [{ startTime: "2026-02-20T10:00:00Z", endTime: "2026-02-20T09:00:00Z" }],
      assertion: "envelope_error",
      regex: "invalid_time_range|endTime",
    },
    {
      entries: [{ startTime: "2026-02-20T09:00:00Z", endTime: "2026-02-20T10:00:00Z" }],
      assertion: "envelope_equals",
      expect: { ok: true, result: { value: "valid" } },
    },
  ];

  for (const c of timeEntryValidationCases) {
    w.add({
      section: "§6",
      profile: "extended",
      operation: "validation.time_entries",
      assertion: c.assertion,
      requires: ["time-tracking"],
      input: { entries: c.entries },
      expect: c.assertion === "envelope_error"
        ? { error: { $regex: c.regex } }
        : c.expect,
    });
  }

  return w.list();
}

function buildDependencyFixtures() {
  const w = makeWriter("dependency");
  const uids = [
    "[[task-a]]",
    "task-a",
    "./task-a.md",
    "../tasks/task-a.md",
    "/tasks/task-a.md",
    "[Task A](tasks/task-a.md)",
    "",
    " ",
    "[bad](",
  ];
  const reltypes = [
    "FINISHTOSTART",
    "STARTTOSTART",
    "FINISHTOFINISH",
    "STARTTOFINISH",
    "BLOCKS",
    "",
  ];
  const gaps = [undefined, "PT1H", "-PT15M", "PT0M", "P1D", "P2W", "bad-gap"];

  for (const uid of uids) {
    for (const reltype of reltypes) {
      for (const gap of gaps) {
        const validReltype = ["FINISHTOSTART", "STARTTOSTART", "FINISHTOFINISH", "STARTTOFINISH"].includes(reltype);
        const validGap = gap === undefined || /^-?P(T.*|[0-9].*)$/.test(gap);
        const shouldPass = uid.trim().length > 0 && validReltype && validGap && uid !== "[bad](";

        w.add({
          section: "§10",
          profile: "extended",
          operation: "dependency.validate_entry",
          assertion: shouldPass ? "envelope_equals" : "envelope_error",
          requires: ["dependencies"],
          input: { entry: { uid, reltype, ...(gap ? { gap } : {}) } },
          expect: shouldPass
            ? { ok: true, result: { value: "valid" } }
            : { error: { $regex: "invalid|duplicate|self|dependency" } },
        });
      }
    }
  }

  const setCases = [
    {
      taskUid: "task-a",
      entries: [
        { uid: "[[task-b]]", reltype: "FINISHTOSTART" },
        { uid: "[[task-c]]", reltype: "STARTTOSTART" },
      ],
      ok: true,
    },
    {
      taskUid: "task-a",
      entries: [
        { uid: "[[task-b]]", reltype: "FINISHTOSTART" },
        { uid: "task-b", reltype: "FINISHTOSTART" },
      ],
      ok: false,
      errorRegex: "duplicate|dependency_uid",
    },
    {
      taskUid: "task-a",
      entries: [
        { uid: "task-a", reltype: "FINISHTOSTART" },
      ],
      ok: false,
      errorRegex: "self|dependency",
    },
    {
      taskUid: "task-a",
      entries: [
        { uid: "[[task-b]]", reltype: "BLOCKS" },
      ],
      ok: false,
      errorRegex: "invalid|reltype",
    },
  ];

  for (const c of setCases) {
    w.add({
      section: "§10",
      profile: "extended",
      operation: "dependency.validate_set",
      assertion: c.ok ? "envelope_equals" : "envelope_error",
      requires: ["dependencies"],
      input: {
        taskUid: c.taskUid,
        entries: c.entries,
      },
      expect: c.ok
        ? { ok: true, result: { value: "valid_set" } }
        : { error: { $regex: c.errorRegex } },
    });
  }

  const missingTargetCases = [
    {
      entry: { uid: "[[missing-task]]", reltype: "FINISHTOSTART" },
      unresolvedTargetSeverity: "warning",
      treatMissingTargetAsBlocked: true,
      requireResolvedUidOnWrite: false,
      onWrite: false,
      expect: { ok: true, result: { blocked: true, issue: "unresolved_dependency_target", severity: "warning" } },
    },
    {
      entry: { uid: "[[missing-task]]", reltype: "FINISHTOSTART" },
      unresolvedTargetSeverity: "error",
      treatMissingTargetAsBlocked: true,
      requireResolvedUidOnWrite: false,
      onWrite: false,
      expect: { ok: true, result: { blocked: true, issue: "unresolved_dependency_target", severity: "error" } },
    },
    {
      entry: { uid: "[[missing-task]]", reltype: "FINISHTOSTART" },
      unresolvedTargetSeverity: "warning",
      treatMissingTargetAsBlocked: false,
      requireResolvedUidOnWrite: false,
      onWrite: false,
      expect: { ok: true, result: { blocked: false, issue: "unresolved_dependency_target", severity: "warning" } },
    },
    {
      entry: { uid: "[[missing-task]]", reltype: "FINISHTOSTART" },
      unresolvedTargetSeverity: "warning",
      treatMissingTargetAsBlocked: true,
      requireResolvedUidOnWrite: true,
      onWrite: true,
      expectError: "unresolved_dependency_target|require_resolved_uid_on_write",
    },
  ];

  for (const c of missingTargetCases) {
    w.add({
      section: "§10.2.6",
      profile: "extended",
      operation: "dependency.missing_target_behavior",
      assertion: c.expectError ? "envelope_error" : "envelope_equals",
      requires: ["dependencies"],
      input: c,
      expect: c.expectError ? { error: { $regex: c.expectError } } : c.expect,
    });
  }

  return w.list();
}

function buildReminderFixtures() {
  const w = makeWriter("reminder");
  const types = ["absolute", "relative", "unknown", ""];
  const relatedTo = ["due", "scheduled", "start", "dateCreated", ""];
  const offsets = [undefined, "-PT15M", "PT0M", "P1D", "PT2H", "+PT15M", "bad-offset"];
  const absoluteTimes = [undefined, "2026-02-20T09:00:00Z", "2026-02-20T09:00:00+02:00", "bad-time"];

  for (const type of types) {
    for (const base of relatedTo) {
      for (const offset of offsets) {
        for (const absoluteTime of absoluteTimes) {
          const isAbsolute = type === "absolute";
          const isRelative = type === "relative";
          const validAbsolute = absoluteTime && /(Z|[+-]\d{2}:\d{2})$/.test(absoluteTime);
          const validOffset = offset && /^-?P(T.*|[0-9].*)$/.test(offset);
          const validBase = base === "due" || base === "scheduled";

          const shouldPass = (isAbsolute && validAbsolute) || (isRelative && validOffset && validBase);

          w.add({
            section: "§10",
            profile: "extended",
            operation: "reminder.validate_entry",
            assertion: shouldPass ? "envelope_equals" : "envelope_error",
            requires: ["reminders"],
            input: {
              entry: {
                id: "r1",
                type,
                ...(absoluteTime ? { absoluteTime } : {}),
                ...(offset ? { offset } : {}),
                ...(base ? { relatedTo: base } : {}),
              },
            },
            expect: shouldPass
              ? { ok: true, result: { value: "valid" } }
              : { error: { $regex: "invalid|reminder|offset|absolute|related" } },
          });
        }
      }
    }
  }

  const setCases = [
    {
      frontmatter: { due: "2026-02-20T10:00:00Z" },
      entries: [
        { id: "r1", type: "relative", relatedTo: "due", offset: "-PT15M" },
        { id: "r2", type: "absolute", absoluteTime: "2026-02-20T09:00:00Z" },
      ],
      ok: true,
    },
    {
      frontmatter: { due: "2026-02-20T10:00:00Z" },
      entries: [
        { id: "r1", type: "relative", relatedTo: "due", offset: "-PT15M" },
        { id: "r1", type: "absolute", absoluteTime: "2026-02-20T09:00:00Z" },
      ],
      ok: false,
      errorRegex: "duplicate|reminder_id",
    },
    {
      frontmatter: {},
      entries: [
        { id: "r1", type: "relative", relatedTo: "due", offset: "-PT15M" },
      ],
      ok: false,
      errorRegex: "unresolvable|related|base",
    },
    {
      frontmatter: { scheduled: "2026-02-20" },
      entries: [
        { id: "r1", type: "relative", relatedTo: "scheduled", offset: "bad-offset" },
      ],
      ok: false,
      errorRegex: "invalid|offset",
    },
  ];

  for (const c of setCases) {
    w.add({
      section: "§10",
      profile: "extended",
      operation: "reminder.validate_set",
      assertion: c.ok ? "envelope_equals" : "envelope_error",
      requires: ["reminders"],
      input: {
        frontmatter: c.frontmatter,
        entries: c.entries,
      },
      expect: c.ok
        ? { ok: true, result: { value: "valid_set" } }
        : { error: { $regex: c.errorRegex } },
    });
  }

  return w.list();
}

function buildLinkFixtures() {
  const w = makeWriter("link");
  const values = [
    "[[task-001]]",
    "[[task-001|My Task]]",
    "[[task-001#anchor]]",
    "[[task-001#anchor|Alias]]",
    "[[docs/api#auth]]",
    "[[./relative/path]]",
    "[[../parent/path]]",
    "[[folder/target]]",
    "[[folder/target|Alias]]",
    "[Label](file.md)",
    "[Label](./relative.md)",
    "[Label](../relative.md#heading)",
    "[Another](folder/child.md)",
    "./other.md",
    "../parent/task.md",
    "/root/task.md",
    "folder/task.md",
    "nested/folder/task.md",
    "task-plain",
    "[broken](missing",
    "[[broken",
    "http://example.com",
    "",
    "not a link",
  ];

  for (const raw of values) {
    const isLink = /^\[\[[^\]]+\]\]$/.test(raw)
      || /^\[[^\]]*\]\([^)]+\)$/.test(raw)
      || raw.startsWith("./")
      || raw.startsWith("../")
      || raw.startsWith("/")
      || /^[A-Za-z0-9_-]+\/.+/.test(raw);
    w.add({
      section: "§11.3",
      profile: "extended",
      operation: "link.parse",
      assertion: isLink ? "envelope_equals" : "envelope_error",
      requires: ["links"],
      input: { raw },
      expect: isLink
        ? {
            ok: true,
            result: {
              raw,
              format: { $oneOf: ["wikilink", "markdown", "path"] },
              target: { $regex: ".+" },
            },
          }
        : { error: { $regex: "invalid_link_format|link" } },
    });
  }

  const resolveCases = [
    {
      raw: "[[task-001]]",
      sourcePath: "tasks/sub/task-002.md",
      collectionRoot: "/vault",
      candidates: ["tasks/task-001.md"],
      expectedPath: "tasks/task-001.md",
    },
    {
      raw: "[[../task-001]]",
      sourcePath: "tasks/sub/task-002.md",
      collectionRoot: "/vault",
      candidates: [],
      expectedPath: "tasks/task-001.md",
    },
    {
      raw: "[Doc](../../notes/doc.md)",
      sourcePath: "tasks/sub/task-002.md",
      collectionRoot: "/vault",
      candidates: [],
      expectedPath: "notes/doc.md",
    },
    {
      raw: "[[ambiguous]]",
      sourcePath: "tasks/sub/task-002.md",
      collectionRoot: "/vault",
      candidates: ["tasks/ambiguous.md", "notes/ambiguous.md"],
      expectedPath: "notes/ambiguous.md",
    },
    {
      raw: "[[../../escape]]",
      sourcePath: "tasks/sub/task-002.md",
      collectionRoot: "/vault",
      candidates: [],
      errorRegex: "path_traversal|escape",
    },
    {
      raw: "[Doc](../../../escape.md)",
      sourcePath: "tasks/sub/task-002.md",
      collectionRoot: "/vault",
      candidates: [],
      errorRegex: "path_traversal|escape",
    },
    {
      raw: "../../../escape.md",
      sourcePath: "tasks/sub/task-002.md",
      collectionRoot: "/vault",
      candidates: [],
      errorRegex: "path_traversal|escape",
    },
    {
      raw: "[[../../../outside/secret]]",
      sourcePath: "deep/nested/path/task.md",
      collectionRoot: "/vault",
      candidates: [],
      errorRegex: "path_traversal|escape",
    },
    {
      raw: "[[meeting-notes]]",
      sourcePath: "tasks/sub/task-002.md",
      collectionRoot: "/vault",
      candidates: ["notes/meeting-notes.markdown", "notes/meeting-notes.md"],
      extensions: [".md", ".markdown"],
      expectedPath: "notes/meeting-notes.md",
    },
    {
      raw: "[[meeting-notes]]",
      sourcePath: "tasks/sub/task-002.md",
      collectionRoot: "/vault",
      candidates: [],
      extensions: [".md", ".markdown"],
      errorRegex: "unresolved|link",
    },
    // ID match pass: resolves to file whose frontmatter id field matches the link target
    {
      raw: "[[my-task-id]]",
      sourcePath: "tasks/task-001.md",
      collectionRoot: "/vault",
      candidates: ["tasks/task-002.md"],
      idIndex: { "tasks/task-002.md": "my-task-id" },
      expectedPath: "tasks/task-002.md",
    },
    // Ambiguous basename: callers must disambiguate with a path-qualified or relative link
    {
      raw: "[[shared]]",
      sourcePath: "tasks/sub/task-001.md",
      collectionRoot: "/vault",
      candidates: ["notes/shared.md", "tasks/sub/shared.md"],
      errorRegex: "ambiguous_link",
    },
    // Ambiguous basename remains ambiguous even when one candidate has a shorter path
    {
      raw: "[[util]]",
      sourcePath: "archive/old/task.md",
      collectionRoot: "/vault",
      candidates: ["lib/util.md", "lib/nested/extra/util.md"],
      errorRegex: "ambiguous_link",
    },
    // Absolute wikilink (contains slash, not relative) resolves from collection root
    {
      raw: "[[notes/meeting]]",
      sourcePath: "tasks/sub/task-002.md",
      collectionRoot: "/vault",
      candidates: ["notes/meeting.md"],
      expectedPath: "notes/meeting.md",
    },
  ];

  for (const c of resolveCases) {
    const isTraversalCase = typeof c.errorRegex === "string" && /path_traversal|escape/.test(c.errorRegex);
    w.add({
      section: isTraversalCase ? "§11.5" : "§11",
      profile: "extended",
      operation: "link.resolve",
      assertion: c.expectedPath ? "envelope_equals" : "envelope_error",
      requires: ["links"],
      input: c,
      expect: c.expectedPath
        ? { ok: true, result: { path: c.expectedPath } }
        : { error: { $regex: c.errorRegex } },
    });
  }

  w.add({
    section: "§11.6",
    profile: "extended",
    operation: "link.update_references_on_rename",
    assertion: "envelope_equals",
    requires: ["links", "rename"],
    input: {
      oldPath: "tasks/task-001.md",
      newPath: "tasks/task-001-renamed.md",
      references: [
        "[[task-001]]",
        "[[task-001|Alias]]",
        "[Label](../tasks/task-001.md#anchor)",
      ],
    },
    expect: {
      ok: true,
      result: {
        updated: {
          $contains: [
            "[[task-001-renamed]]",
            "[[task-001-renamed|Alias]]",
          ],
        },
      },
    },
  });

  // link.update_references_on_rename preserves unrelated references unchanged
  w.add({
    section: "§11.6",
    profile: "extended",
    operation: "link.update_references_on_rename",
    assertion: "envelope_equals",
    requires: ["links", "rename"],
    input: {
      oldPath: "tasks/task-001.md",
      newPath: "tasks/task-001-renamed.md",
      references: [
        "[[task-001]]",
        "[[task-999]]",
        "[[other-note]]",
      ],
    },
    expect: {
      ok: true,
      result: {
        updated: {
          $contains: ["[[task-001-renamed]]", "[[task-999]]", "[[other-note]]"],
        },
      },
    },
  });

  // link.update_references_on_rename updates markdown-link targets and preserves anchors
  w.add({
    section: "§11.6",
    profile: "extended",
    operation: "link.update_references_on_rename",
    assertion: "envelope_equals",
    requires: ["links", "rename"],
    input: {
      oldPath: "tasks/task-001.md",
      newPath: "tasks/task-001-v2.md",
      references: [
        "[Task](tasks/task-001.md)",
        "[Task](tasks/task-001.md#details)",
        "[Task](tasks/task-777.md#other)",
      ],
    },
    expect: {
      ok: true,
      result: {
        updated: {
          $contains: [
            "[Task](tasks/task-001-v2.md)",
            "[Task](tasks/task-001-v2.md#details)",
            "[Task](tasks/task-777.md#other)",
          ],
        },
      },
    },
  });

  // link.update_references_on_rename updates wikilinks while preserving aliases
  w.add({
    section: "§11.6",
    profile: "extended",
    operation: "link.update_references_on_rename",
    assertion: "envelope_equals",
    requires: ["links", "rename"],
    input: {
      oldPath: "tasks/task-001.md",
      newPath: "tasks/task-001-v3.md",
      references: [
        "[[task-001#anchor|Alias]]",
        "[[task-001]]",
        "[[task-abc]]",
      ],
    },
    expect: {
      ok: true,
      result: {
        updated: {
          $contains: [
            "[[task-001-v3#anchor|Alias]]",
            "[[task-001-v3]]",
            "[[task-abc]]",
          ],
        },
      },
    },
  });

  // link.parse with anchor and alias correctly identifies all components
  w.add({
    section: "§11.3",
    profile: "extended",
    operation: "link.parse",
    assertion: "envelope_equals",
    requires: ["links"],
    input: { raw: "[[docs/api#auth|API Reference]]" },
    expect: {
      ok: true,
      result: {
        raw: "[[docs/api#auth|API Reference]]",
        target: "docs/api",
        alias: "API Reference",
        anchor: "auth",
        format: "wikilink",
        is_relative: false,
      },
    },
  });

  return w.list();
}

function buildOperationFixtures() {
  const w = makeWriter("ops");

  const generalRuleCases = [
    {
      section: "§5.2",
      operation: "op.mutate_with_validation",
      input: {
        strict: true,
        frontmatter: { title: "X", status: 3 },
      },
      assertion: "envelope_error",
      expect: { error: { $regex: "validation|invalid_type" } },
    },
    {
      section: "§5.2",
      operation: "op.mutate_with_validation",
      input: {
        strict: false,
        frontmatter: { title: "X", status: 3 },
      },
      assertion: "envelope_error",
      expect: { error: { $regex: "validation|missing_required|invalid_type" } },
    },
    {
      section: "§5.2",
      operation: "op.mutate_with_validation",
      input: {
        strict: true,
        frontmatter: {
          title: "Valid task",
          status: "open",
          dateCreated: "2026-02-20T10:00:00Z",
          dateModified: "2026-02-20T10:00:00Z",
        },
      },
      assertion: "envelope_equals",
      expect: { ok: true, result: { value: "accepted" } },
    },
    {
      section: "§5.2",
      operation: "op.atomic_write",
      input: {
        original: { title: "X", status: "open", vendor: "ZX-42" },
        patch: { status: "done" },
        simulateFailureAfterWrite: true,
      },
      assertion: "envelope_equals",
      expect: {
        ok: true,
        result: {
          committed: false,
          persisted: { $contains: { title: "X", status: "open", vendor: "ZX-42" } },
        },
      },
    },
    // op.atomic_write succeeds when no failure is simulated
    {
      section: "§5.2",
      operation: "op.atomic_write",
      input: {
        original: { title: "X", status: "open", vendor: "ZX-42" },
        patch: { status: "done" },
        simulateFailureAfterWrite: false,
      },
      assertion: "envelope_equals",
      expect: {
        ok: true,
        result: {
          committed: true,
          persisted: { $contains: { title: "X", status: "done", vendor: "ZX-42" } },
        },
      },
    },
    {
      section: "§5.2",
      operation: "op.idempotency_check",
      input: {
        operation: "complete_nonrecurring",
        first: { status: "open", completedDate: null },
        second: { status: "done", completedDate: "2026-02-20" },
      },
      assertion: "envelope_equals",
      expect: {
        ok: true,
        result: {
          idempotent: true,
        },
      },
    },
    {
      section: "§5.21",
      operation: "op.mutate_with_validation",
      input: {
        strict: true,
        frontmatter: {
          title: "Valid via interface",
          status: "open",
          dateCreated: "2026-02-20T10:00:00Z",
          dateModified: "2026-02-20T10:00:00Z",
        },
      },
      assertion: "envelope_equals",
      expect: {
        ok: true,
        result: {
          value: "accepted",
        },
      },
    },
    // create idempotency is adapter-defined; current adapters report idempotent=true.
    {
      section: "§5.2",
      operation: "op.idempotency_check",
      input: {
        operation: "create",
        first: null,
        second: { title: "New task", status: "open" },
      },
      assertion: "envelope_equals",
      expect: {
        ok: true,
        result: {
          idempotent: true,
        },
      },
    },
  ];

  for (const c of generalRuleCases) {
    w.add({
      section: c.section,
      profile: "core-lite",
      operation: c.operation,
      assertion: c.assertion,
      input: c.input,
      expect: c.expect,
    });
  }

  const targetResolutionCases = [
    {
      explicitDate: "2026-02-20",
      scheduled: "2026-02-19",
      due: "2026-02-18",
      expected: "2026-02-20",
    },
    {
      explicitDate: undefined,
      scheduled: "2026-02-19T09:00:00Z",
      due: "2026-02-18",
      expected: "2026-02-19",
    },
    {
      explicitDate: undefined,
      scheduled: undefined,
      due: "2026-02-18T10:00:00Z",
      expected: "2026-02-18",
    },
  ];

  for (const c of targetResolutionCases) {
    w.add({
      section: "§5.2.1",
      profile: "core-lite",
      operation: "date.resolve_operation_target",
      assertion: "envelope_equals",
      input: {
        explicitDate: c.explicitDate,
        scheduled: c.scheduled,
        due: c.due,
      },
      expect: {
        ok: true,
        result: {
          value: c.expected,
        },
      },
    });
  }

  const updateCases = [
    {
      original: {
        title: "Weekly review",
        status: "open",
        priority: "normal",
        scheduled: "2026-02-20",
        vendorTicket: "ZX-42",
      },
      patch: { priority: "high" },
      expectContains: { title: "Weekly review", priority: "high", vendorTicket: "ZX-42" },
      changed: true,
    },
    {
      original: {
        title: "Weekly review",
        status: "open",
        scheduled: "2026-02-20",
        due: "2026-02-22",
        vendorTicket: "ZX-42",
      },
      patch: { status: "in-progress" },
      expectContains: { status: "in-progress", scheduled: "2026-02-20", due: "2026-02-22", vendorTicket: "ZX-42" },
      changed: true,
    },
    {
      original: {
        title: "Weekly review",
        status: "open",
        priority: "normal",
        vendorTicket: "ZX-42",
      },
      patch: { status: "open" },
      expectContains: { status: "open", vendorTicket: "ZX-42" },
      changed: false,
    },
    {
      original: {
        title: "Weekly review",
        status: "open",
        due: "2026-02-20",
        customClient: "ACME",
      },
      patch: { due: "2026-02-20T09:00:00Z" },
      expectContains: { due: "2026-02-20T09:00:00Z", customClient: "ACME" },
      changed: true,
    },
  ];

  for (const c of updateCases) {
    w.add({
      section: "§5.4",
      profile: "core-lite",
      operation: "op.update_patch",
      assertion: "envelope_equals",
      input: c,
      expect: {
        ok: true,
        result: {
          changed: c.changed,
          frontmatter: { $contains: c.expectContains },
        },
      },
    });
  }

  const completionCases = [
    {
      frontmatter: { title: "Buy groceries", status: "open" },
      completedValues: ["done", "cancelled"],
      explicitDate: "2026-02-20",
      expectedStatus: "done",
      expectedCompletedDate: "2026-02-20",
    },
    {
      frontmatter: { title: "Buy groceries", status: "open" },
      completedValues: ["cancelled", "done"],
      explicitDate: "2026-02-20",
      expectedStatus: "cancelled",
      expectedCompletedDate: "2026-02-20",
    },
    {
      frontmatter: { title: "Buy groceries", status: "done", completedDate: "2026-02-19" },
      completedValues: ["done", "cancelled"],
      explicitDate: undefined,
      expectedStatus: "done",
      expectedCompletedDateRegex: "^\\d{4}-\\d{2}-\\d{2}$",
    },
    {
      frontmatter: { title: "Buy groceries", status: "open", completedDate: "2026-02-19" },
      completedValues: ["done", "cancelled"],
      explicitDate: undefined,
      expectedStatus: "done",
      expectedCompletedDateRegex: "^\\d{4}-\\d{2}-\\d{2}$",
    },
  ];

  for (const c of completionCases) {
    w.add({
      section: "§5.5",
      profile: "core-lite",
      operation: "op.complete_nonrecurring",
      assertion: "envelope_equals",
      input: c,
      expect: {
        ok: true,
        result: {
          status: c.expectedStatus,
          completedDate: c.expectedCompletedDate || { $regex: c.expectedCompletedDateRegex },
        },
      },
    });
  }

  const uncompleteCases = [
    {
      frontmatter: { title: "Buy groceries", status: "done", completedDate: "2026-02-20" },
      defaultStatus: "open",
      clearCompletedDate: true,
      expectedStatus: "open",
      expectedCompletedDate: null,
    },
    {
      frontmatter: { title: "Buy groceries", status: "cancelled", completedDate: "2026-02-20" },
      defaultStatus: "open",
      clearCompletedDate: false,
      expectedStatus: "open",
      expectedCompletedDate: "2026-02-20",
    },
    {
      frontmatter: { title: "Buy groceries", status: "open" },
      defaultStatus: "open",
      clearCompletedDate: true,
      expectedStatus: "open",
      expectedCompletedDate: null,
    },
  ];

  for (const c of uncompleteCases) {
    w.add({
      section: "§5.6",
      profile: "core-lite",
      operation: "op.uncomplete_nonrecurring",
      assertion: "envelope_equals",
      input: c,
      expect: {
        ok: true,
        result: {
          status: c.expectedStatus,
          completedDate: c.expectedCompletedDate,
        },
      },
    });
  }

  const days = ["2026-02-20", "2026-02-21", "2026-02-22", "2026-02-23"];
  for (const day of days) {
    w.add({
      section: "§5.7",
      profile: "recurrence",
      operation: "recurrence.complete",
      assertion: "recurrence_complete_invariants",
      input: {
        recurrence: "FREQ=DAILY",
        recurrenceAnchor: "scheduled",
        scheduled: "2026-02-20",
        due: "2026-02-21",
        dateCreated: "2026-02-01",
        completionDate: day,
        completeInstances: ["2026-02-19"],
        skippedInstances: ["2026-02-22"],
      },
    });

    w.add({
      section: "§5.8",
      profile: "recurrence",
      operation: "recurrence.uncomplete_instance",
      assertion: "envelope_equals",
      input: {
        targetDate: day,
        completeInstances: ["2026-02-20", "2026-02-21"],
        skippedInstances: ["2026-02-23"],
      },
      expect: {
        ok: true,
        result: {
          completeInstances: day === "2026-02-20"
            ? ["2026-02-21"]
            : day === "2026-02-21"
              ? ["2026-02-20"]
              : ["2026-02-20", "2026-02-21"],
        },
      },
    });

    if (day === "2026-02-21") {
      w.add({
        section: "§5.8",
        profile: "recurrence",
        operation: "recurrence.uncomplete_instance",
        assertion: "envelope_equals",
        input: {
          targetDate: day,
          recurrenceAnchor: "completion",
          recurrence: "DTSTART:20260221;FREQ=DAILY",
          completeInstances: ["2026-02-20", "2026-02-21"],
          skippedInstances: [],
        },
        expect: {
          ok: true,
          result: {
            completeInstances: ["2026-02-20"],
            updatedRecurrence: "DTSTART:20260221;FREQ=DAILY",
          },
        },
      });
    }

    w.add({
      section: "§5.9",
      profile: "recurrence",
      operation: "recurrence.skip_instance",
      assertion: "envelope_equals",
      input: {
        targetDate: day,
        completeInstances: ["2026-02-20"],
        skippedInstances: ["2026-02-22"],
      },
      expect: {
        ok: true,
        result: {
          skippedInstances: {
            $contains: [day],
          },
        },
      },
    });

    w.add({
      section: "§5.9",
      profile: "recurrence",
      operation: "recurrence.unskip_instance",
      assertion: "envelope_equals",
      input: {
        targetDate: day,
        completeInstances: ["2026-02-20"],
        skippedInstances: ["2026-02-21", "2026-02-22"],
      },
      expect: {
        ok: true,
        result: {
          skippedInstances: day === "2026-02-21"
            ? ["2026-02-22"]
            : day === "2026-02-22"
              ? ["2026-02-21"]
              : ["2026-02-21", "2026-02-22"],
        },
      },
    });

    w.add({
      section: "§4.11",
      profile: "recurrence",
      operation: "recurrence.effective_state",
      assertion: "envelope_equals",
      input: {
        targetDate: day,
        completeInstances: ["2026-02-20"],
        skippedInstances: ["2026-02-21"],
      },
      expect: {
        ok: true,
        result: {
          value: day === "2026-02-20" ? "completed" : day === "2026-02-21" ? "skipped" : "open",
        },
      },
    });
  }

  const dependencyMutationCases = [
    {
      section: "§5.10.1",
      operation: "dependency.add",
      input: {
        current: [{ uid: "[[a]]", reltype: "FINISHTOSTART" }],
        entry: { uid: "[[b]]", reltype: "STARTTOSTART" },
      },
      expect: { value: [{ uid: "[[a]]", reltype: "FINISHTOSTART" }, { uid: "[[b]]", reltype: "STARTTOSTART" }] },
    },
    {
      section: "§5.10.2",
      operation: "dependency.remove",
      input: {
        current: [{ uid: "[[a]]", reltype: "FINISHTOSTART" }, { uid: "[[b]]", reltype: "STARTTOSTART" }],
        uid: "[[a]]",
      },
      expect: { value: [{ uid: "[[b]]", reltype: "STARTTOSTART" }] },
    },
    {
      section: "§5.10.3",
      operation: "dependency.replace",
      input: {
        current: [{ uid: "[[a]]", reltype: "FINISHTOSTART" }],
        entries: [{ uid: "[[z]]", reltype: "FINISHTOFINISH" }],
      },
      expect: { value: [{ uid: "[[z]]", reltype: "FINISHTOFINISH" }] },
    },
    // dependency.add to an initially empty list
    {
      section: "§5.10.1",
      operation: "dependency.add",
      input: {
        current: [],
        entry: { uid: "[[a]]", reltype: "FINISHTOSTART" },
      },
      expect: { value: [{ uid: "[[a]]", reltype: "FINISHTOSTART" }] },
    },
    // dependency.remove last entry results in empty list
    {
      section: "§5.10.2",
      operation: "dependency.remove",
      input: {
        current: [{ uid: "[[a]]", reltype: "FINISHTOSTART" }],
        uid: "[[a]]",
      },
      expect: { value: [] },
    },
    // dependency.replace with empty entries clears all dependencies
    {
      section: "§5.10.3",
      operation: "dependency.replace",
      input: {
        current: [{ uid: "[[a]]", reltype: "FINISHTOSTART" }, { uid: "[[b]]", reltype: "STARTTOSTART" }],
        entries: [],
      },
      expect: { value: [] },
    },
    // dependency.replace with multiple new entries preserves order
    {
      section: "§5.10.3",
      operation: "dependency.replace",
      input: {
        current: [{ uid: "[[a]]", reltype: "FINISHTOSTART" }],
        entries: [
          { uid: "[[x]]", reltype: "FINISHTOSTART" },
          { uid: "[[y]]", reltype: "STARTTOSTART" },
          { uid: "[[z]]", reltype: "FINISHTOFINISH" },
        ],
      },
      expect: {
        value: [
          { uid: "[[x]]", reltype: "FINISHTOSTART" },
          { uid: "[[y]]", reltype: "STARTTOSTART" },
          { uid: "[[z]]", reltype: "FINISHTOFINISH" },
        ],
      },
    },
  ];

  for (const c of dependencyMutationCases) {
    w.add({
      section: c.section,
      profile: "extended",
      operation: c.operation,
      assertion: "envelope_equals",
      requires: ["dependencies"],
      input: c.input,
      expect: { ok: true, result: c.expect },
    });
  }

  const reminderMutationCases = [
    {
      section: "§5.11.1",
      operation: "reminder.add",
      input: {
        current: [{ id: "r1", type: "absolute", absoluteTime: "2026-02-20T09:00:00Z" }],
        entry: { id: "r2", type: "relative", relatedTo: "due", offset: "-PT1H" },
      },
      expect: {
        value: {
          $contains: [
            { id: "r1" },
            { id: "r2", type: "relative", relatedTo: "due", offset: "-PT1H" },
          ],
        },
      },
    },
    {
      section: "§5.11.2",
      operation: "reminder.update",
      input: {
        current: [{ id: "r1", type: "relative", relatedTo: "due", offset: "-PT1H" }],
        id: "r1",
        patch: { offset: "-PT30M" },
      },
      expect: {
        value: [{ id: "r1", type: "relative", relatedTo: "due", offset: "-PT30M" }],
      },
    },
    {
      section: "§5.11.3",
      operation: "reminder.remove",
      input: {
        current: [{ id: "r1", type: "relative", relatedTo: "due", offset: "-PT1H" }, { id: "r2", type: "absolute", absoluteTime: "2026-02-20T09:00:00Z" }],
        id: "r1",
      },
      expect: {
        value: [{ id: "r2", type: "absolute", absoluteTime: "2026-02-20T09:00:00Z" }],
      },
    },
    // reminder.add to an initially empty list
    {
      section: "§5.11.1",
      operation: "reminder.add",
      input: {
        current: [],
        entry: { id: "r1", type: "absolute", absoluteTime: "2026-02-20T09:00:00Z" },
      },
      expect: {
        value: [{ id: "r1", type: "absolute", absoluteTime: "2026-02-20T09:00:00Z" }],
      },
    },
    // reminder.update patches absolute time field
    {
      section: "§5.11.2",
      operation: "reminder.update",
      input: {
        current: [{ id: "r1", type: "absolute", absoluteTime: "2026-02-20T09:00:00Z" }],
        id: "r1",
        patch: { absoluteTime: "2026-02-21T10:00:00Z" },
      },
      expect: {
        value: [{ id: "r1", type: "absolute", absoluteTime: "2026-02-21T10:00:00Z" }],
      },
    },
    // reminder.remove last entry results in empty list
    {
      section: "§5.11.3",
      operation: "reminder.remove",
      input: {
        current: [{ id: "r1", type: "relative", relatedTo: "due", offset: "-PT1H" }],
        id: "r1",
      },
      expect: {
        value: [],
      },
    },
  ];

  for (const c of reminderMutationCases) {
    w.add({
      section: c.section,
      profile: "extended",
      operation: c.operation,
      assertion: "envelope_equals",
      requires: ["reminders"],
      input: c.input,
      expect: { ok: true, result: c.expect },
    });
  }

  // dependency.add with a duplicate uid is policy-defined; this adapter preserves both entries.
  w.add({
    section: "§5.10.1",
    profile: "extended",
    operation: "dependency.add",
    assertion: "envelope_equals",
    requires: ["dependencies"],
    input: {
      current: [{ uid: "[[a]]", reltype: "FINISHTOSTART" }],
      entry: { uid: "[[a]]", reltype: "STARTTOSTART" },
    },
    expect: {
      ok: true,
      result: {
        value: [
          { uid: "[[a]]", reltype: "FINISHTOSTART" },
          { uid: "[[a]]", reltype: "STARTTOSTART" },
        ],
      },
    },
  });

  // reminder.update with a non-existent id must error
  w.add({
    section: "§5.11.2",
    profile: "extended",
    operation: "reminder.update",
    assertion: "envelope_error",
    requires: ["reminders"],
    input: {
      current: [{ id: "r1", type: "relative", relatedTo: "due", offset: "-PT1H" }],
      id: "r99",
      patch: { offset: "-PT30M" },
    },
    expect: {
      error: { $regex: "not_found|reminder|unknown" },
    },
  });

  w.add({
    section: "§5.12",
    profile: "extended",
    operation: "archive.apply",
    assertion: "envelope_equals",
    requires: ["archive"],
    input: {
      frontmatter: { title: "Archive me", status: "open", tags: ["task"] },
      mode: "tag",
    },
    expect: {
      ok: true,
      result: {
        deleted: false,
      },
    },
  });

  w.add({
    section: "§5.13",
    profile: "core-lite",
    operation: "delete.remove",
    assertion: "envelope_equals",
    input: {
      path: "tasks/demo.md",
      checkBacklinks: true,
      force: true,
    },
    expect: {
      ok: true,
      result: { deleted: true },
    },
  });

  w.add({
    section: "§5.13",
    profile: "core-lite",
    operation: "delete.remove",
    assertion: "envelope_error",
    input: {
      path: "tasks/demo.md",
      checkBacklinks: true,
      force: false,
      brokenLinks: ["tasks/other.md"],
    },
    expect: {
      error: { $regex: "backlink|dependency|force" },
    },
  });

  w.add({
    section: "§5.14",
    profile: "extended",
    operation: "rename.apply",
    assertion: "envelope_equals",
    requires: ["rename"],
    input: {
      fromPath: "tasks/Old.md",
      toPath: "tasks/New.md",
      titleStorage: "filename",
      updateReferences: true,
    },
    expect: {
      ok: true,
      result: {
        path: "tasks/New.md",
        referencesUpdated: true,
      },
    },
  });

  // rename.apply with reference updates disabled
  w.add({
    section: "§5.14",
    profile: "extended",
    operation: "rename.apply",
    assertion: "envelope_equals",
    requires: ["rename"],
    input: {
      fromPath: "tasks/OldNoRef.md",
      toPath: "tasks/NewNoRef.md",
      titleStorage: "filename",
      updateReferences: false,
    },
    expect: {
      ok: true,
      result: {
        path: "tasks/NewNoRef.md",
        referencesUpdated: false,
      },
    },
  });

  // rename.apply with nested folders and reference updates enabled
  w.add({
    section: "§5.14",
    profile: "extended",
    operation: "rename.apply",
    assertion: "envelope_equals",
    requires: ["rename"],
    input: {
      fromPath: "tasks/sub/OldNested.md",
      toPath: "tasks/sub/NewNested.md",
      titleStorage: "filename",
      updateReferences: true,
    },
    expect: {
      ok: true,
      result: {
        path: "tasks/sub/NewNested.md",
        referencesUpdated: true,
      },
    },
  });

  // rename.apply keeps explicit destination regardless of title-storage mode
  w.add({
    section: "§5.14",
    profile: "extended",
    operation: "rename.apply",
    assertion: "envelope_equals",
    requires: ["rename"],
    input: {
      fromPath: "tasks/FrontmatterMode.md",
      toPath: "archive/FrontmatterModeRenamed.md",
      titleStorage: "frontmatter",
      updateReferences: false,
    },
    expect: {
      ok: true,
      result: {
        path: "archive/FrontmatterModeRenamed.md",
        referencesUpdated: false,
      },
    },
  });

  const renameTitleStorageCases = [
    {
      titleStorage: "filename",
      oldPath: "tasks/Old.md",
      newTitle: "New Title",
      expectedPathRegex: "^tasks/New(?:-| )Title\\.md$",
      expectedFrontmatterTitle: "New Title",
      expectedRenamed: true,
    },
    {
      titleStorage: "frontmatter",
      oldPath: "tasks/Old.md",
      newTitle: "New Title",
      expectedPath: "tasks/Old.md",
      expectedFrontmatterTitle: "New Title",
      expectedRenamed: false,
    },
  ];

  for (const c of renameTitleStorageCases) {
    w.add({
      section: "§5.4.4",
      profile: "extended",
      operation: "rename.title_storage_interaction",
      assertion: "envelope_equals",
      requires: ["rename"],
      input: c,
      expect: {
        ok: true,
        result: {
          path: c.expectedPathRegex ? { $regex: c.expectedPathRegex } : c.expectedPath,
          renamed: c.expectedRenamed,
          frontmatter: { $contains: { title: c.expectedFrontmatterTitle } },
        },
      },
    });
  }

  w.add({
    section: "§5.15",
    profile: "extended",
    operation: "batch.apply",
    assertion: "envelope_equals",
    requires: ["batch"],
    input: {
      items: [{ id: "a" }, { id: "b" }, { id: "c" }],
      outcomes: [{ id: "a", ok: true }, { id: "b", ok: false }, { id: "c", ok: true }],
    },
    expect: {
      ok: true,
      result: {
        total: 3,
        succeeded: 2,
        failed: 1,
      },
    },
  });

  // batch.apply all items succeeded
  w.add({
    section: "§5.15",
    profile: "extended",
    operation: "batch.apply",
    assertion: "envelope_equals",
    requires: ["batch"],
    input: {
      items: [{ id: "a" }, { id: "b" }],
      outcomes: [{ id: "a", ok: true }, { id: "b", ok: true }],
    },
    expect: {
      ok: true,
      result: {
        total: 2,
        succeeded: 2,
        failed: 0,
      },
    },
  });

  // batch.apply all items failed
  w.add({
    section: "§5.15",
    profile: "extended",
    operation: "batch.apply",
    assertion: "envelope_equals",
    requires: ["batch"],
    input: {
      items: [{ id: "a" }, { id: "b" }],
      outcomes: [{ id: "a", ok: false }, { id: "b", ok: false }],
    },
    expect: {
      ok: true,
      result: {
        total: 2,
        succeeded: 0,
        failed: 2,
      },
    },
  });

  // batch.apply with empty item list
  w.add({
    section: "§5.15",
    profile: "extended",
    operation: "batch.apply",
    assertion: "envelope_equals",
    requires: ["batch"],
    input: {
      items: [],
      outcomes: [],
    },
    expect: {
      ok: true,
      result: {
        total: 0,
        succeeded: 0,
        failed: 0,
      },
    },
  });

  w.add({
    section: "§5.16",
    profile: "extended",
    operation: "op.detect_conflict",
    assertion: "envelope_error",
    requires: ["concurrency"],
    input: {
      expectedVersion: "a",
      actualVersion: "b",
      overwrite: false,
    },
    expect: {
      error: { $regex: "conflict|write_conflict" },
    },
  });

  // op.detect_conflict: matching versions means no conflict
  w.add({
    section: "§5.16",
    profile: "extended",
    operation: "op.detect_conflict",
    assertion: "envelope_equals",
    requires: ["concurrency"],
    input: {
      expectedVersion: "abc",
      actualVersion: "abc",
      overwrite: false,
    },
    expect: {
      ok: true,
      result: {
        conflict: false,
      },
    },
  });

  // op.detect_conflict: overwrite=true bypasses version mismatch
  w.add({
    section: "§5.16",
    profile: "extended",
    operation: "op.detect_conflict",
    assertion: "envelope_equals",
    requires: ["concurrency"],
    input: {
      expectedVersion: "a",
      actualVersion: "b",
      overwrite: true,
    },
    expect: {
      ok: true,
      result: {
        conflict: false,
      },
    },
  });

  w.add({
    section: "§5.17",
    profile: "extended",
    operation: "op.dry_run",
    assertion: "envelope_equals",
    requires: ["dry-run"],
    input: {
      operation: "update",
      patch: { status: "done" },
    },
    expect: {
      ok: true,
      result: {
        wrote: false,
        plannedChanges: { $contains: ["status"] },
      },
    },
  });

  // op.dry_run for create operation lists all planned fields
  w.add({
    section: "§5.17",
    profile: "extended",
    operation: "op.dry_run",
    assertion: "envelope_equals",
    requires: ["dry-run"],
    input: {
      operation: "create",
      patch: { title: "New task", status: "open" },
    },
    expect: {
      ok: true,
      result: {
        wrote: false,
        plannedChanges: { $contains: ["title", "status"] },
      },
    },
  });

  w.add({
    section: "§5.18",
    profile: "core-lite",
    operation: "op.error_shape",
    assertion: "envelope_equals",
    input: {
      operation: "update",
      code: "invalid_type",
      message: "bad value",
      field: "status",
    },
    expect: {
      ok: true,
      result: {
        operation: "update",
        code: "invalid_type",
        message: { $regex: ".+" },
      },
    },
  });

  // op.error_shape for a missing-required-field error during create
  w.add({
    section: "§5.18",
    profile: "core-lite",
    operation: "op.error_shape",
    assertion: "envelope_equals",
    input: {
      operation: "create",
      code: "missing_required_field",
      message: "title is required",
      field: "title",
    },
    expect: {
      ok: true,
      result: {
        code: "missing_required_field",
        message: { $regex: ".+" },
      },
    },
  });

  // op.error_shape for file_not_found during delete
  w.add({
    section: "§5.18",
    profile: "core-lite",
    operation: "op.error_shape",
    assertion: "envelope_equals",
    input: {
      operation: "delete",
      code: "file_not_found",
      message: "file does not exist",
    },
    expect: {
      ok: true,
      result: {
        code: "file_not_found",
        message: { $regex: ".+" },
      },
    },
  });

  const timeEntryCases = [
    {
      section: "§5.19.1",
      operation: "time.start",
      input: {
        entries: [],
        now: "2026-02-20T09:00:00Z",
        dateModified: "2026-02-20T08:00:00Z",
      },
      expect: {
        value: [{ startTime: "2026-02-20T09:00:00Z" }],
        dateModified: { $regex: "^2026-02-20T09:00:00Z$|^\\d{4}-\\d{2}-\\d{2}T" },
      },
    },
    {
      section: "§5.19.1",
      operation: "time.start",
      assertion: "envelope_error",
      input: {
        entries: [{ startTime: "2026-02-20T09:00:00Z" }],
        now: "2026-02-20T09:30:00Z",
      },
      expectError: "time_tracking_already_active|active",
    },
    {
      section: "§5.19.2",
      operation: "time.stop",
      input: {
        entries: [{ startTime: "2026-02-20T09:00:00Z" }],
        now: "2026-02-20T10:00:00Z",
        dateModified: "2026-02-20T09:00:00Z",
      },
      expect: {
        value: [{ startTime: "2026-02-20T09:00:00Z", endTime: "2026-02-20T10:00:00Z" }],
        dateModified: { $regex: "^2026-02-20T10:00:00Z$|^\\d{4}-\\d{2}-\\d{2}T" },
      },
    },
    {
      section: "§5.19.2",
      operation: "time.stop",
      assertion: "envelope_error",
      input: {
        entries: [],
        now: "2026-02-20T10:00:00Z",
      },
      expectError: "no_active_time_entry|active",
    },
    {
      section: "§5.19.3",
      operation: "time.replace_entries",
      input: {
        entries: [{ startTime: "2026-02-20T09:00:00Z", endTime: "2026-02-20T10:00:00Z", duration: 60 }],
        dateModified: "2026-02-20T10:00:00Z",
      },
      expect: {
        value: [{ startTime: "2026-02-20T09:00:00Z", endTime: "2026-02-20T10:00:00Z" }],
        dateModified: { $regex: "^\\d{4}-\\d{2}-\\d{2}T" },
      },
    },
    {
      section: "§5.19.4",
      operation: "time.remove_entry",
      input: {
        entries: [{ startTime: "2026-02-20T09:00:00Z", endTime: "2026-02-20T10:00:00Z" }, { startTime: "2026-02-21T09:00:00Z" }],
        selector: { index: 0 },
        dateModified: "2026-02-21T09:00:00Z",
      },
      expect: {
        value: [{ startTime: "2026-02-21T09:00:00Z" }],
        dateModified: { $regex: "^\\d{4}-\\d{2}-\\d{2}T" },
      },
    },
    {
      section: "§5.19.5",
      operation: "time.auto_stop_on_complete",
      input: {
        autoStopOnComplete: true,
        isCompletionTransition: true,
        taskEntries: [{ startTime: "2026-02-20T09:00:00Z" }],
        now: "2026-02-20T09:30:00Z",
      },
      expect: {
        stopped: true,
      },
    },
    {
      section: "§5.19.6",
      operation: "time.report_totals",
      input: {
        entries: [
          { startTime: "2026-02-20T09:00:00Z", endTime: "2026-02-20T10:00:00Z" },
          { startTime: "2026-02-20T10:30:00Z", endTime: "2026-02-20T11:00:00Z" },
        ],
      },
      expect: {
        closed_minutes: 90,
      },
    },
    {
      section: "§5.19.6",
      operation: "time.report_totals",
      input: {
        entries: [
          { startTime: "2026-02-20T09:00:00Z", endTime: "2026-02-20T10:00:00Z" },
          { startTime: "2026-02-20T11:00:00Z" },
        ],
        now: "2026-02-20T11:30:00Z",
      },
      expect: {
        closed_minutes: 60,
        live_minutes: 90,
      },
    },
    // time.start appends to pre-existing closed entries
    {
      section: "§5.19.1",
      operation: "time.start",
      input: {
        entries: [
          { startTime: "2026-02-20T08:00:00Z", endTime: "2026-02-20T09:00:00Z" },
          { startTime: "2026-02-20T10:00:00Z", endTime: "2026-02-20T11:00:00Z" },
        ],
        now: "2026-02-20T14:00:00Z",
        dateModified: "2026-02-20T11:00:00Z",
      },
      expect: {
        value: [
          { startTime: "2026-02-20T08:00:00Z", endTime: "2026-02-20T09:00:00Z" },
          { startTime: "2026-02-20T10:00:00Z", endTime: "2026-02-20T11:00:00Z" },
          { startTime: "2026-02-20T14:00:00Z" },
        ],
        dateModified: { $regex: "^\\d{4}-\\d{2}-\\d{2}T" },
      },
    },
    // time.stop with pre-existing closed entry + one active entry
    {
      section: "§5.19.2",
      operation: "time.stop",
      input: {
        entries: [
          { startTime: "2026-02-20T08:00:00Z", endTime: "2026-02-20T09:00:00Z" },
          { startTime: "2026-02-20T10:00:00Z" },
        ],
        now: "2026-02-20T11:00:00Z",
        dateModified: "2026-02-20T10:00:00Z",
      },
      expect: {
        value: [
          { startTime: "2026-02-20T08:00:00Z", endTime: "2026-02-20T09:00:00Z" },
          { startTime: "2026-02-20T10:00:00Z", endTime: "2026-02-20T11:00:00Z" },
        ],
        dateModified: { $regex: "^\\d{4}-\\d{2}-\\d{2}T" },
      },
    },
    // time.replace_entries clears all entries when given empty list
    {
      section: "§5.19.3",
      operation: "time.replace_entries",
      input: {
        entries: [],
        dateModified: "2026-02-20T10:00:00Z",
      },
      expect: {
        value: [],
        dateModified: { $regex: "^\\d{4}-\\d{2}-\\d{2}T" },
      },
    },
    // time.replace_entries preserves active entry
    {
      section: "§5.19.3",
      operation: "time.replace_entries",
      input: {
        entries: [
          { startTime: "2026-02-20T09:00:00Z", endTime: "2026-02-20T10:00:00Z" },
          { startTime: "2026-02-20T11:00:00Z" },
        ],
        dateModified: "2026-02-20T11:00:00Z",
      },
      expect: {
        value: [
          { startTime: "2026-02-20T09:00:00Z", endTime: "2026-02-20T10:00:00Z" },
          { startTime: "2026-02-20T11:00:00Z" },
        ],
        dateModified: { $regex: "^\\d{4}-\\d{2}-\\d{2}T" },
      },
    },
    // time.remove_entry removes the only entry resulting in empty list
    {
      section: "§5.19.4",
      operation: "time.remove_entry",
      input: {
        entries: [{ startTime: "2026-02-20T09:00:00Z", endTime: "2026-02-20T10:00:00Z" }],
        selector: { index: 0 },
        dateModified: "2026-02-20T10:00:00Z",
      },
      expect: {
        value: [],
        dateModified: { $regex: "^\\d{4}-\\d{2}-\\d{2}T" },
      },
    },
    // time.remove_entry with out-of-range index returns error
    {
      section: "§5.19.4",
      operation: "time.remove_entry",
      assertion: "envelope_error",
      input: {
        entries: [{ startTime: "2026-02-20T09:00:00Z", endTime: "2026-02-20T10:00:00Z" }],
        selector: { index: 5 },
        dateModified: "2026-02-20T10:00:00Z",
      },
      expectError: "index_out_of_range|out_of_range|[Ii]nvalid|not_found",
    },
    // time.auto_stop_on_complete does nothing when feature is disabled
    {
      section: "§5.19.5",
      operation: "time.auto_stop_on_complete",
      input: {
        autoStopOnComplete: false,
        isCompletionTransition: true,
        taskEntries: [{ startTime: "2026-02-20T09:00:00Z" }],
        now: "2026-02-20T09:30:00Z",
      },
      expect: {
        stopped: false,
      },
    },
    // time.auto_stop_on_complete does nothing when not a completion transition
    {
      section: "§5.19.5",
      operation: "time.auto_stop_on_complete",
      input: {
        autoStopOnComplete: true,
        isCompletionTransition: false,
        taskEntries: [{ startTime: "2026-02-20T09:00:00Z" }],
        now: "2026-02-20T09:30:00Z",
      },
      expect: {
        stopped: false,
      },
    },
    // time.auto_stop_on_complete does nothing when no active entry
    {
      section: "§5.19.5",
      operation: "time.auto_stop_on_complete",
      input: {
        autoStopOnComplete: true,
        isCompletionTransition: true,
        taskEntries: [{ startTime: "2026-02-20T08:00:00Z", endTime: "2026-02-20T09:00:00Z" }],
        now: "2026-02-20T09:30:00Z",
      },
      expect: {
        stopped: false,
      },
    },
    // time.report_totals with no entries returns zero
    {
      section: "§5.19.6",
      operation: "time.report_totals",
      input: {
        entries: [],
      },
      expect: {
        closed_minutes: 0,
      },
    },
    // time.report_totals with only an active entry (no closed entries)
    {
      section: "§5.19.6",
      operation: "time.report_totals",
      input: {
        entries: [{ startTime: "2026-02-20T09:00:00Z" }],
        now: "2026-02-20T10:00:00Z",
      },
      expect: {
        closed_minutes: 0,
        live_minutes: 60,
      },
    },
    // time.report_totals with multiple closed entries sums correctly
    {
      section: "§5.19.6",
      operation: "time.report_totals",
      input: {
        entries: [
          { startTime: "2026-02-20T09:00:00Z", endTime: "2026-02-20T09:30:00Z" },
          { startTime: "2026-02-20T10:00:00Z", endTime: "2026-02-20T10:15:00Z" },
          { startTime: "2026-02-20T11:00:00Z", endTime: "2026-02-20T11:45:00Z" },
        ],
      },
      expect: {
        closed_minutes: 90,
      },
    },
  ];

  for (const c of timeEntryCases) {
    w.add({
      section: c.section,
      profile: "extended",
      operation: c.operation,
      assertion: c.assertion || "envelope_equals",
      requires: ["time-tracking"],
      input: c.input,
      expect: c.assertion === "envelope_error"
        ? { error: { $regex: c.expectError } }
        : {
            ok: true,
            result: c.expect,
          },
    });
  }

  return w.list();
}

function buildTemplatingFixtures() {
  const w = makeWriter("templating");

  const parseCases = [
    {
      templateText: "---\ntitle: {{title}}\nstatus: {{status}}\n---\nBody {{details}}",
      expected: {
        frontmatterRaw: "title: {{title}}\nstatus: {{status}}",
        body: "Body {{details}}",
      },
    },
    {
      templateText: "No frontmatter here",
      expected: {
        frontmatterRaw: "",
        body: "No frontmatter here",
      },
    },
  ];

  for (const c of parseCases) {
    w.add({
      section: "§5.3.5",
      profile: "templating",
      operation: "templating.parse_sections",
      assertion: "envelope_equals",
      requires: ["templating"],
      input: c,
      expect: {
        ok: true,
        result: { $contains: c.expected },
      },
    });
  }

  const expandCases = [
    {
      template: "{{title}} - {{status}}",
      values: { title: "Pay bill", status: "open" },
      expected: "Pay bill - open",
    },
    {
      template: "{{title}} {{unknown}}",
      values: { title: "Pay bill" },
      unknownVariablePolicy: "preserve",
      expected: "Pay bill {{unknown}}",
    },
    {
      template: "{{title}} {{unknown}}",
      values: { title: "Pay bill" },
      unknownVariablePolicy: "empty",
      expected: "Pay bill ",
    },
    {
      template: "{{title}} {{priority}} {{dueDate}} {{scheduledDate}} {{details}} {{contexts}} {{tags}} {{timeEstimate}} {{date}} {{time}}",
      values: {
        title: "Pay bill",
        priority: "high",
        dueDate: "2026-02-20",
        scheduledDate: "2026-02-19",
        details: "foo",
        contexts: "@home",
        tags: "#task",
        timeEstimate: "60",
        date: "2026-02-20",
        time: "10:00",
      },
      expected: "Pay bill high 2026-02-20 2026-02-19 foo @home #task 60 2026-02-20 10:00",
    },
    {
      template: "{{title}} {{status}} {{priority}} {{dueDate}} {{scheduledDate}} {{details}} {{contexts}} {{tags}} {{hashtags}} {{timeEstimate}} {{parentNote}} {{date}} {{time}} {{year}} {{month}} {{day}}",
      values: {
        title: "Write report",
        status: "open",
        priority: "normal",
        dueDate: "2026-02-20",
        scheduledDate: "2026-02-19",
        details: "ship weekly update",
        contexts: "work, home",
        tags: "task, writing",
        hashtags: "#task #writing",
        timeEstimate: "45",
        parentNote: "Projects/Alpha",
        date: "2026-02-20",
        time: "10:00",
        year: "2026",
        month: "02",
        day: "20",
      },
      expected: "Write report open normal 2026-02-20 2026-02-19 ship weekly update work, home task, writing #task #writing 45 Projects/Alpha 2026-02-20 10:00 2026 02 20",
    },
  ];

  for (const c of expandCases) {
    w.add({
      section: "§5.3.5",
      profile: "templating",
      operation: "templating.expand_variables",
      assertion: "envelope_equals",
      requires: ["templating"],
      input: c,
      expect: {
        ok: true,
        result: { value: c.expected },
      },
    });
  }

  const tokenizeCases = [
    {
      template: "{{title}} {{status}} {{priority}}",
      expectedTokens: ["title", "status", "priority"],
    },
    {
      template: "prefix {{title}} mid {{unknown}} suffix",
      expectedTokens: ["title", "unknown"],
    },
  ];

  for (const c of tokenizeCases) {
    w.add({
      section: "§5.3.5",
      profile: "templating",
      operation: "templating.tokenize",
      assertion: "envelope_equals",
      requires: ["templating"],
      input: c,
      expect: {
        ok: true,
        result: {
          tokens: c.expectedTokens,
        },
      },
    });
  }

  const mergeCases = [
    {
      baseFrontmatter: { title: "A", status: "open", priority: "normal" },
      templateFrontmatter: { title: "B", status: "done", project: "X" },
      expected: { title: "A", status: "open", priority: "normal", project: "X" },
    },
    {
      baseFrontmatter: { title: "A", tags: ["one"] },
      templateFrontmatter: { tags: ["two"], extra: true },
      expected: { title: "A", tags: ["one"], extra: true },
    },
  ];

  for (const c of mergeCases) {
    w.add({
      section: "§5.3.5",
      profile: "templating",
      operation: "templating.merge_frontmatter",
      assertion: "envelope_equals",
      requires: ["templating"],
      input: c,
      expect: {
        ok: true,
        result: { value: c.expected },
      },
    });
  }

  const pipelineCases = [
    {
      baseFrontmatter: { title: "Base title", status: "open", priority: "normal" },
      templateFrontmatter: { title: "Template title", status: "done", project: "A" },
      callerBody: "Caller body",
      templateBody: "Template body",
      expectedFrontmatter: { title: "Base title", status: "open", priority: "normal", project: "A" },
      expectedBody: "Template body",
    },
    {
      baseFrontmatter: { title: "Base title", status: "open" },
      templateFrontmatter: { status: "done", project: "A" },
      callerBody: "Caller body",
      templateBody: "",
      expectedFrontmatter: { title: "Base title", status: "open", project: "A" },
      expectedBody: "Caller body",
    },
  ];

  for (const c of pipelineCases) {
    w.add({
      section: "§5.3.5",
      profile: "templating",
      operation: "templating.create_pipeline",
      assertion: "envelope_equals",
      requires: ["templating"],
      input: c,
      expect: {
        ok: true,
        result: {
          frontmatter: c.expectedFrontmatter,
          body: c.expectedBody,
        },
      },
    });
  }

  const failureCases = [
    {
      failureMode: "error",
      errorCode: "template_missing",
      shouldError: true,
    },
    {
      failureMode: "warning_fallback",
      errorCode: "template_parse_failed",
      shouldError: false,
    },
  ];

  for (const c of failureCases) {
    w.add({
      section: "§5.3.5",
      profile: "templating",
      operation: "templating.handle_failure",
      assertion: c.shouldError ? "envelope_error" : "envelope_equals",
      requires: ["templating"],
      input: c,
      expect: c.shouldError
        ? { error: { $regex: "template_missing|template_parse_failed|template" } }
        : { ok: true, result: { mode: "fallback" } },
    });
  }

  w.add({
    section: "§9.14",
    profile: "templating",
    operation: "templating.config_defaults",
    assertion: "envelope_equals",
    requires: ["templating"],
    input: {
      enabled: true,
      template_path: "Templates/Task.md",
    },
    expect: {
      ok: true,
      result: {
        failure_mode: "warning_fallback",
        unknown_variable_policy: "preserve",
      },
    },
  });

  w.add({
    section: "§7.3.3",
    profile: "templating",
    operation: "templating.profile_claim_requirements",
    assertion: "envelope_equals",
    requires: ["templating"],
    input: {
      supports_create_time_templating: true,
      supports_failure_mode: true,
      supports_variable_set: true,
    },
    expect: {
      ok: true,
      result: { value: "claim_valid" },
    },
  });

  return w.list();
}

function buildConfigSchemaFixtures() {
  const w = makeWriter("config_schema");

  const providerBehaviorCases = [
    {
      mode: "strict",
      providersReadable: false,
      hasRequiredKeys: false,
      shouldFail: true,
    },
    {
      mode: "permissive",
      providersReadable: false,
      hasRequiredKeys: false,
      shouldFail: false,
    },
    {
      mode: "strict",
      providersReadable: true,
      hasRequiredKeys: true,
      shouldFail: false,
    },
  ];

  for (const c of providerBehaviorCases) {
    w.add({
      section: "§9.2.3",
      profile: "core-lite",
      operation: "config.provider_behavior",
      assertion: c.shouldFail ? "envelope_error" : "envelope_equals",
      requires: ["config-lite"],
      input: c,
      expect: c.shouldFail
        ? { error: { $regex: "configuration|required effective keys|strict" } }
        : { ok: true, result: { value: "accepted" } },
    });
  }

  const validCases = [
    {
      value: { mode: "strict", reject_unknown_fields: false },
      kind: "validation",
    },
    {
      value: { storage: "frontmatter", filename_format: "custom", custom_filename_template: "{{title}}" },
      kind: "title",
    },
    {
      value: { enabled: true, template_path: "Templates/Task.md", failure_mode: "warning_fallback", unknown_variable_policy: "preserve" },
      kind: "templating",
    },
    {
      value: { date_only_anchor_time: "09:30", apply_defaults_when_explicit: false },
      kind: "reminders",
    },
    {
      value: { auto_stop_on_complete: true, auto_stop_notification: false },
      kind: "time_tracking",
    },
    {
      value: { values: ["open", "done"], default: "open", completed_values: ["done"] },
      kind: "status",
    },
    {
      value: { method: "tag", tag: "task", combine: "or" },
      kind: "task_detection",
    },
    {
      value: { default_reltype: "FINISHTOSTART", unresolved_target_severity: "warning" },
      kind: "dependencies",
    },
    {
      value: { extensions: [".md"], unresolved_default_severity: "warning" },
      kind: "links",
    },
  ];

  for (const c of validCases) {
    w.add({
      section: "§9",
      profile: "core-lite",
      operation: "config.validate_schema",
      assertion: "envelope_equals",
      requires: ["config-lite"],
      input: c,
      expect: {
        ok: true,
        result: { value: "valid" },
      },
    });
  }

  const invalidCases = [
    { kind: "validation", value: { mode: "invalid" }, regex: "validation.mode|unsupported" },
    { kind: "title", value: { storage: "invalid" }, regex: "title.storage|invalid" },
    { kind: "title", value: { storage: "frontmatter", filename_format: "custom" }, regex: "custom_filename_template" },
    { kind: "templating", value: { enabled: true, template_path: "" }, regex: "templating.template_path|missing" },
    { kind: "templating", value: { enabled: true, template_path: "x", failure_mode: "bad" }, regex: "templating.failure_mode|invalid" },
    { kind: "templating", value: { enabled: true, template_path: "x", unknown_variable_policy: "bad" }, regex: "templating.unknown_variable_policy|invalid" },
    { kind: "reminders", value: { date_only_anchor_time: "24:10" }, regex: "reminders.date_only_anchor_time|invalid" },
    { kind: "time_tracking", value: { auto_stop_on_complete: "yes" }, regex: "time_tracking.auto_stop_on_complete|invalid" },
    { kind: "time_tracking", value: { auto_stop_notification: "no" }, regex: "time_tracking.auto_stop_notification|invalid" },
    { kind: "status", value: { values: ["open", "done"], default: "todo", completed_values: ["done"] }, regex: "status.default|values" },
    { kind: "status", value: { values: ["open", "done"], default: "open", completed_values: [] }, regex: "status.completed_values|non-empty" },
    { kind: "task_detection", value: { combine: "xor" }, regex: "task_detection.combine|invalid" },
    { kind: "dependencies", value: { default_reltype: "BLOCKS" }, regex: "dependencies.default_reltype|invalid" },
    { kind: "dependencies", value: { unresolved_target_severity: "fatal" }, regex: "dependencies.unresolved_target_severity|invalid" },
    { kind: "links", value: { unresolved_default_severity: "fatal" }, regex: "links.unresolved_default_severity|invalid" },
  ];

  for (const c of invalidCases) {
    w.add({
      section: "§9.19",
      profile: "core-lite",
      operation: "config.validate_schema",
      assertion: "envelope_error",
      requires: ["config-lite"],
      input: c,
      expect: {
        error: { $regex: c.regex },
      },
    });
  }

  return w.list();
}

function buildMigrationFixtures() {
  const w = makeWriter("migration");

  w.add({
    section: "§8.2",
    profile: "core-lite",
    operation: "migration.compat_mode",
    assertion: "envelope_equals",
    requires: ["migration"],
    input: {
      mode: "legacy-aliases",
      enabled: false,
      defaultsToEnabled: false,
    },
    expect: {
      ok: true,
      result: {
        discoverable: true,
        defaultsToEnabled: false,
      },
    },
  });

  // migration.compat_mode with enabled=true
  w.add({
    section: "§8.2",
    profile: "core-lite",
    operation: "migration.compat_mode",
    assertion: "envelope_equals",
    requires: ["migration"],
    input: {
      mode: "legacy-aliases",
      enabled: true,
      defaultsToEnabled: false,
    },
    expect: {
      ok: true,
      result: {
        discoverable: true,
      },
    },
  });

  w.add({
    section: "§8.3",
    profile: "core-lite",
    operation: "migration.plan",
    assertion: "envelope_equals",
    requires: ["migration"],
    input: {
      dryRun: true,
      rollbackGuidance: true,
      deterministic: true,
    },
    expect: {
      ok: true,
      result: {
        deterministic: true,
        dryRunSupported: true,
        rollbackSafeGuidance: true,
      },
    },
  });

  w.add({
    section: "§8.4",
    profile: "core-lite",
    operation: "migration.normalize_aliases",
    assertion: "envelope_equals",
    requires: ["migration"],
    input: {
      frontmatter: {
        recurrenceAnchor: "scheduled",
        recurrence_anchor: "completion",
      },
    },
    expect: {
      ok: true,
      result: {
        frontmatter: { $contains: { recurrenceAnchor: "scheduled" } },
        issues: { $contains: [{ code: "alias_conflict_ignored" }] },
      },
    },
  });

  // migration.normalize_aliases with no conflicts: snake_case key normalized to camelCase
  w.add({
    section: "§8.4",
    profile: "core-lite",
    operation: "migration.normalize_aliases",
    assertion: "envelope_equals",
    requires: ["migration"],
    input: {
      frontmatter: {
        recurrence_anchor: "scheduled",
      },
    },
    expect: {
      ok: true,
      result: {
        frontmatter: { $contains: { recurrenceAnchor: "scheduled" } },
      },
    },
  });

  w.add({
    section: "§8.5",
    profile: "core-lite",
    operation: "migration.normalize_temporal",
    assertion: "envelope_equals",
    requires: ["migration"],
    input: {
      frontmatter: {
        dateCreated: "2026-02-20 10:00:00+00:00",
      },
    },
    expect: {
      ok: true,
      result: {
        frontmatter: { $contains: { dateCreated: "2026-02-20T10:00:00Z" } },
      },
    },
  });

  // migration.normalize_temporal with already-canonical fields leaves them unchanged
  w.add({
    section: "§8.5",
    profile: "core-lite",
    operation: "migration.normalize_temporal",
    assertion: "envelope_equals",
    requires: ["migration"],
    input: {
      frontmatter: {
        dateCreated: "2026-02-20T10:00:00Z",
        dateModified: "2026-02-20T11:00:00Z",
      },
    },
    expect: {
      ok: true,
      result: {
        frontmatter: { $contains: { dateCreated: "2026-02-20T10:00:00Z", dateModified: "2026-02-20T11:00:00Z" } },
      },
    },
  });

  // migration.normalize_temporal normalizes multiple non-canonical fields
  w.add({
    section: "§8.5",
    profile: "core-lite",
    operation: "migration.normalize_temporal",
    assertion: "envelope_equals",
    requires: ["migration"],
    input: {
      frontmatter: {
        dateCreated: "2026-02-20 10:00:00+00:00",
        dateModified: "2026-02-20 11:00:00+00:00",
      },
    },
    expect: {
      ok: true,
      result: {
        frontmatter: { $contains: { dateCreated: "2026-02-20T10:00:00Z", dateModified: "2026-02-20T11:00:00Z" } },
      },
    },
  });

  w.add({
    section: "§8.6",
    profile: "recurrence",
    operation: "migration.resolve_instance_overlap",
    assertion: "envelope_equals",
    requires: ["migration"],
    input: {
      completeInstances: ["2026-02-20", "2026-02-21"],
      skippedInstances: ["2026-02-20"],
      policy: "prefer_complete",
    },
    expect: {
      ok: true,
      result: {
        completeInstances: { $contains: ["2026-02-20", "2026-02-21"] },
        skippedInstances: [],
      },
    },
  });

  // migration.resolve_instance_overlap with prefer_skip policy
  w.add({
    section: "§8.6",
    profile: "recurrence",
    operation: "migration.resolve_instance_overlap",
    assertion: "envelope_equals",
    requires: ["migration"],
    input: {
      completeInstances: ["2026-02-20", "2026-02-21"],
      skippedInstances: ["2026-02-20"],
      policy: "prefer_skip",
    },
    expect: {
      ok: true,
      result: {
        completeInstances: { $contains: ["2026-02-21"] },
        skippedInstances: { $contains: ["2026-02-20"] },
      },
    },
  });

  // migration.resolve_instance_overlap with no overlap is a no-op
  w.add({
    section: "§8.6",
    profile: "recurrence",
    operation: "migration.resolve_instance_overlap",
    assertion: "envelope_equals",
    requires: ["migration"],
    input: {
      completeInstances: ["2026-02-20"],
      skippedInstances: ["2026-02-21"],
      policy: "prefer_complete",
    },
    expect: {
      ok: true,
      result: {
        completeInstances: { $contains: ["2026-02-20"] },
        skippedInstances: { $contains: ["2026-02-21"] },
      },
    },
  });

  w.add({
    section: "§8.7",
    profile: "extended",
    operation: "migration.normalize_dependencies",
    assertion: "envelope_equals",
    requires: ["migration", "dependencies"],
    input: {
      blockedBy: [{ uid: "[[a]]" }, { uid: "[[a]]", reltype: "FINISHTOSTART" }, { uid: "[[b]]", reltype: "STARTTOSTART" }],
      defaultReltype: "FINISHTOSTART",
    },
    expect: {
      ok: true,
      result: {
        blockedBy: { $contains: [{ uid: "[[a]]", reltype: "FINISHTOSTART" }, { uid: "[[b]]", reltype: "STARTTOSTART" }] },
      },
    },
  });

  // migration.normalize_dependencies with empty blockedBy list
  w.add({
    section: "§8.7",
    profile: "extended",
    operation: "migration.normalize_dependencies",
    assertion: "envelope_equals",
    requires: ["migration", "dependencies"],
    input: {
      blockedBy: [],
      defaultReltype: "FINISHTOSTART",
    },
    expect: {
      ok: true,
      result: {
        blockedBy: [],
      },
    },
  });

  // migration.normalize_dependencies with no duplicates: adds default reltype only
  w.add({
    section: "§8.7",
    profile: "extended",
    operation: "migration.normalize_dependencies",
    assertion: "envelope_equals",
    requires: ["migration", "dependencies"],
    input: {
      blockedBy: [{ uid: "[[a]]" }, { uid: "[[b]]", reltype: "STARTTOSTART" }],
      defaultReltype: "FINISHTOSTART",
    },
    expect: {
      ok: true,
      result: {
        blockedBy: { $contains: [{ uid: "[[a]]", reltype: "FINISHTOSTART" }, { uid: "[[b]]", reltype: "STARTTOSTART" }] },
      },
    },
  });

  w.add({
    section: "§8.8",
    profile: "extended",
    operation: "migration.normalize_reminders",
    assertion: "envelope_equals",
    requires: ["migration", "reminders"],
    input: {
      reminders: [{ type: "relative", relatedTo: "due", offset: "-P1D" }, { id: "x", type: "absolute", absoluteTime: "2026-02-20 09:00:00+00:00" }],
      generateIds: true,
    },
    expect: {
      ok: true,
      result: {
        generated_ids: { $regex: "^[0-9]+$" },
      },
    },
  });

  // migration.normalize_reminders with generateIds=false preserves existing ids and normalizes temporal fields
  w.add({
    section: "§8.8",
    profile: "extended",
    operation: "migration.normalize_reminders",
    assertion: "envelope_equals",
    requires: ["migration", "reminders"],
    input: {
      reminders: [{ id: "r1", type: "relative", relatedTo: "due", offset: "-P1D" }, { id: "r2", type: "absolute", absoluteTime: "2026-02-20 09:00:00+00:00" }],
      generateIds: false,
    },
    expect: {
      ok: true,
      result: {
        reminders: { $contains: [{ id: "r1" }, { id: "r2", absoluteTime: "2026-02-20T09:00:00Z" }] },
      },
    },
  });

  w.add({
    section: "§8.9",
    profile: "extended",
    operation: "migration.normalize_links",
    assertion: "envelope_equals",
    requires: ["migration", "links"],
    input: {
      links: ["[[task-001|Task]]", "[Doc](docs/doc.md)", "docs/doc.md"],
    },
    expect: {
      ok: true,
      result: {
        normalized: { $contains: ["[[task-001|Task]]"] },
      },
    },
  });

  // migration.normalize_links with already-canonical wikilinks is a no-op
  w.add({
    section: "§8.9",
    profile: "extended",
    operation: "migration.normalize_links",
    assertion: "envelope_equals",
    requires: ["migration", "links"],
    input: {
      links: ["[[task-001]]", "[[task-002|Alias]]"],
    },
    expect: {
      ok: true,
      result: {
        normalized: { $contains: ["[[task-001]]", "[[task-002|Alias]]"] },
      },
    },
  });

  w.add({
    section: "§8.13",
    profile: "core-lite",
    operation: "migration.report_summary",
    assertion: "envelope_equals",
    requires: ["migration"],
    input: {
      files_scanned: 214,
      files_changed: 67,
      warnings: {
        alias_conflict_ignored: 3,
      },
      changes: {
        normalized_datetime_fields: 41,
      },
    },
    expect: {
      ok: true,
      result: {
        spec_version_from: { $regex: ".+" },
        spec_version_to: { $regex: ".+" },
        files_scanned: 214,
        files_changed: 67,
      },
    },
  });

  w.add({
    section: "§8.10",
    profile: "core-lite",
    operation: "migration.divergence_register",
    assertion: "envelope_equals",
    requires: ["migration"],
    input: {},
    expect: {
      ok: true,
      result: {
        columns: { $contains: ["section", "current_behavior", "target_behavior", "migration_strategy", "deprecation_timeline"] },
      },
    },
  });

  w.add({
    section: "§8.11",
    profile: "core-lite",
    operation: "migration.deprecation_policy",
    assertion: "envelope_equals",
    requires: ["migration"],
    input: {},
    expect: {
      ok: true,
      result: {
        includes: { $contains: ["release_notes", "warning_period", "migration_tooling", "versioned_removal"] },
      },
    },
  });

  w.add({
    section: "§8.12",
    profile: "core-lite",
    operation: "migration.safety_guards",
    assertion: "envelope_equals",
    requires: ["migration"],
    input: {},
    expect: {
      ok: true,
      result: {
        prevents: {
          $contains: [
            "drop_unknown_fields",
            "date_to_datetime_silent_conversion",
            "silent_link_retarget",
          ],
        },
      },
    },
  });

  w.add({
    section: "§8.14",
    profile: "core-lite",
    operation: "migration.compat_statement",
    assertion: "envelope_equals",
    requires: ["migration"],
    input: {},
    expect: {
      ok: true,
      result: {
        value: { $regex: "Compatibility mode|legacy|Migration command" },
      },
    },
  });

  return w.list();
}

function buildManifest(allCasesByFile) {
  const files = Object.entries(allCasesByFile).map(([file, cases]) => ({ file, cases: cases.length }));
  const all = Object.values(allCasesByFile).flat();

  const byProfile = {};
  const bySection = {};
  const byOperation = {};

  for (const c of all) {
    byProfile[c.profile] = (byProfile[c.profile] || 0) + 1;
    bySection[c.section] = (bySection[c.section] || 0) + 1;
    byOperation[c.operation] = (byOperation[c.operation] || 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    totalCases: all.length,
    files,
    byProfile,
    bySection,
    byOperation,
  };
}

const dateFixtures = buildDateFixtures();
const fieldFixtures = buildFieldFixtures();
const recurrenceFixtures = buildRecurrenceFixtures();
const createCompatFixtures = buildCreateCompatFixtures();
const conformanceFixtures = buildConformanceFixtures();
const configFixtures = buildConfigFixtures();
const configSchemaFixtures = buildConfigSchemaFixtures();
const validationFixtures = buildValidationFixtures();
const operationFixtures = buildOperationFixtures();
const templatingFixtures = buildTemplatingFixtures();
const migrationFixtures = buildMigrationFixtures();
const dependencyFixtures = buildDependencyFixtures();
const reminderFixtures = buildReminderFixtures();
const linkFixtures = buildLinkFixtures();

writeFixtures("date.json", dateFixtures);
writeFixtures("field-mapping.json", fieldFixtures);
writeFixtures("recurrence.json", recurrenceFixtures);
writeFixtures("create-compat.json", createCompatFixtures);
writeFixtures("conformance.json", conformanceFixtures);
writeFixtures("config.json", configFixtures);
writeFixtures("config-schema.json", configSchemaFixtures);
writeFixtures("validation.json", validationFixtures);
writeFixtures("operations.json", operationFixtures);
writeFixtures("templating.json", templatingFixtures);
writeFixtures("migrations.json", migrationFixtures);
writeFixtures("dependencies.json", dependencyFixtures);
writeFixtures("reminders.json", reminderFixtures);
writeFixtures("links.json", linkFixtures);

const manifest = buildManifest({
  "date.json": dateFixtures,
  "field-mapping.json": fieldFixtures,
  "recurrence.json": recurrenceFixtures,
  "create-compat.json": createCompatFixtures,
  "conformance.json": conformanceFixtures,
  "config.json": configFixtures,
  "config-schema.json": configSchemaFixtures,
  "validation.json": validationFixtures,
  "operations.json": operationFixtures,
  "templating.json": templatingFixtures,
  "migrations.json": migrationFixtures,
  "dependencies.json": dependencyFixtures,
  "reminders.json": reminderFixtures,
  "links.json": linkFixtures,
});

writeFileSync(resolve(root, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Generated ${manifest.totalCases} conformance fixtures.`);
