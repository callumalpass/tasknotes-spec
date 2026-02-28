// ../tasknotes/node_modules/date-fns/constants.js
var daysInYear = 365.2425;
var maxTime = Math.pow(10, 8) * 24 * 60 * 60 * 1e3;
var minTime = -maxTime;
var millisecondsInMinute = 6e4;
var millisecondsInHour = 36e5;
var secondsInHour = 3600;
var secondsInDay = secondsInHour * 24;
var secondsInWeek = secondsInDay * 7;
var secondsInYear = secondsInDay * daysInYear;
var secondsInMonth = secondsInYear / 12;
var secondsInQuarter = secondsInMonth * 3;
var constructFromSymbol = Symbol.for("constructDateFrom");

// ../tasknotes/node_modules/date-fns/constructFrom.js
function constructFrom(date, value) {
  if (typeof date === "function") return date(value);
  if (date && typeof date === "object" && constructFromSymbol in date)
    return date[constructFromSymbol](value);
  if (date instanceof Date) return new date.constructor(value);
  return new Date(value);
}

// ../tasknotes/node_modules/date-fns/toDate.js
function toDate(argument, context) {
  return constructFrom(context || argument, argument);
}

// ../tasknotes/node_modules/date-fns/isDate.js
function isDate(value) {
  return value instanceof Date || typeof value === "object" && Object.prototype.toString.call(value) === "[object Date]";
}

// ../tasknotes/node_modules/date-fns/isValid.js
function isValid(date) {
  return !(!isDate(date) && typeof date !== "number" || isNaN(+toDate(date)));
}

// ../tasknotes/node_modules/date-fns/parseISO.js
function parseISO(argument, options) {
  const invalidDate = () => constructFrom(options?.in, NaN);
  const additionalDigits = options?.additionalDigits ?? 2;
  const dateStrings = splitDateString(argument);
  let date;
  if (dateStrings.date) {
    const parseYearResult = parseYear(dateStrings.date, additionalDigits);
    date = parseDate(parseYearResult.restDateString, parseYearResult.year);
  }
  if (!date || isNaN(+date)) return invalidDate();
  const timestamp = +date;
  let time = 0;
  let offset;
  if (dateStrings.time) {
    time = parseTime(dateStrings.time);
    if (isNaN(time)) return invalidDate();
  }
  if (dateStrings.timezone) {
    offset = parseTimezone(dateStrings.timezone);
    if (isNaN(offset)) return invalidDate();
  } else {
    const tmpDate = new Date(timestamp + time);
    const result = toDate(0, options?.in);
    result.setFullYear(
      tmpDate.getUTCFullYear(),
      tmpDate.getUTCMonth(),
      tmpDate.getUTCDate()
    );
    result.setHours(
      tmpDate.getUTCHours(),
      tmpDate.getUTCMinutes(),
      tmpDate.getUTCSeconds(),
      tmpDate.getUTCMilliseconds()
    );
    return result;
  }
  return toDate(timestamp + time + offset, options?.in);
}
var patterns = {
  dateTimeDelimiter: /[T ]/,
  timeZoneDelimiter: /[Z ]/i,
  timezone: /([Z+-].*)$/
};
var dateRegex = /^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/;
var timeRegex = /^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/;
var timezoneRegex = /^([+-])(\d{2})(?::?(\d{2}))?$/;
function splitDateString(dateString) {
  const dateStrings = {};
  const array = dateString.split(patterns.dateTimeDelimiter);
  let timeString;
  if (array.length > 2) {
    return dateStrings;
  }
  if (/:/.test(array[0])) {
    timeString = array[0];
  } else {
    dateStrings.date = array[0];
    timeString = array[1];
    if (patterns.timeZoneDelimiter.test(dateStrings.date)) {
      dateStrings.date = dateString.split(patterns.timeZoneDelimiter)[0];
      timeString = dateString.substr(
        dateStrings.date.length,
        dateString.length
      );
    }
  }
  if (timeString) {
    const token = patterns.timezone.exec(timeString);
    if (token) {
      dateStrings.time = timeString.replace(token[1], "");
      dateStrings.timezone = token[1];
    } else {
      dateStrings.time = timeString;
    }
  }
  return dateStrings;
}
function parseYear(dateString, additionalDigits) {
  const regex = new RegExp(
    "^(?:(\\d{4}|[+-]\\d{" + (4 + additionalDigits) + "})|(\\d{2}|[+-]\\d{" + (2 + additionalDigits) + "})$)"
  );
  const captures = dateString.match(regex);
  if (!captures) return { year: NaN, restDateString: "" };
  const year = captures[1] ? parseInt(captures[1]) : null;
  const century = captures[2] ? parseInt(captures[2]) : null;
  return {
    year: century === null ? year : century * 100,
    restDateString: dateString.slice((captures[1] || captures[2]).length)
  };
}
function parseDate(dateString, year) {
  if (year === null) return /* @__PURE__ */ new Date(NaN);
  const captures = dateString.match(dateRegex);
  if (!captures) return /* @__PURE__ */ new Date(NaN);
  const isWeekDate = !!captures[4];
  const dayOfYear = parseDateUnit(captures[1]);
  const month = parseDateUnit(captures[2]) - 1;
  const day = parseDateUnit(captures[3]);
  const week = parseDateUnit(captures[4]);
  const dayOfWeek = parseDateUnit(captures[5]) - 1;
  if (isWeekDate) {
    if (!validateWeekDate(year, week, dayOfWeek)) {
      return /* @__PURE__ */ new Date(NaN);
    }
    return dayOfISOWeekYear(year, week, dayOfWeek);
  } else {
    const date = /* @__PURE__ */ new Date(0);
    if (!validateDate(year, month, day) || !validateDayOfYearDate(year, dayOfYear)) {
      return /* @__PURE__ */ new Date(NaN);
    }
    date.setUTCFullYear(year, month, Math.max(dayOfYear, day));
    return date;
  }
}
function parseDateUnit(value) {
  return value ? parseInt(value) : 1;
}
function parseTime(timeString) {
  const captures = timeString.match(timeRegex);
  if (!captures) return NaN;
  const hours = parseTimeUnit(captures[1]);
  const minutes = parseTimeUnit(captures[2]);
  const seconds = parseTimeUnit(captures[3]);
  if (!validateTime(hours, minutes, seconds)) {
    return NaN;
  }
  return hours * millisecondsInHour + minutes * millisecondsInMinute + seconds * 1e3;
}
function parseTimeUnit(value) {
  return value && parseFloat(value.replace(",", ".")) || 0;
}
function parseTimezone(timezoneString) {
  if (timezoneString === "Z") return 0;
  const captures = timezoneString.match(timezoneRegex);
  if (!captures) return 0;
  const sign = captures[1] === "+" ? -1 : 1;
  const hours = parseInt(captures[2]);
  const minutes = captures[3] && parseInt(captures[3]) || 0;
  if (!validateTimezone(hours, minutes)) {
    return NaN;
  }
  return sign * (hours * millisecondsInHour + minutes * millisecondsInMinute);
}
function dayOfISOWeekYear(isoWeekYear, week, day) {
  const date = /* @__PURE__ */ new Date(0);
  date.setUTCFullYear(isoWeekYear, 0, 4);
  const fourthOfJanuaryDay = date.getUTCDay() || 7;
  const diff = (week - 1) * 7 + day + 1 - fourthOfJanuaryDay;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}
var daysInMonths = [31, null, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function isLeapYearIndex(year) {
  return year % 400 === 0 || year % 4 === 0 && year % 100 !== 0;
}
function validateDate(year, month, date) {
  return month >= 0 && month <= 11 && date >= 1 && date <= (daysInMonths[month] || (isLeapYearIndex(year) ? 29 : 28));
}
function validateDayOfYearDate(year, dayOfYear) {
  return dayOfYear >= 1 && dayOfYear <= (isLeapYearIndex(year) ? 366 : 365);
}
function validateWeekDate(_year, week, day) {
  return week >= 1 && week <= 53 && day >= 0 && day <= 6;
}
function validateTime(hours, minutes, seconds) {
  if (hours === 24) {
    return minutes === 0 && seconds === 0;
  }
  return seconds >= 0 && seconds < 60 && minutes >= 0 && minutes < 60 && hours >= 0 && hours < 25;
}
function validateTimezone(_hours, minutes) {
  return minutes >= 0 && minutes <= 59;
}

// ../tasknotes/src/utils/dateUtils.ts
function parseDate2(dateString) {
  if (!dateString) {
    const error = new Error("Date string cannot be empty");
    console.error("Date parsing error:", { dateString, error: error.message });
    throw error;
  }
  const trimmed = dateString.trim();
  try {
    const dateWithDayNameMatch = trimmed.match(
      /^(\d{4}-\d{2}-\d{2})\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i
    );
    if (dateWithDayNameMatch) {
      const dateOnly = dateWithDayNameMatch[1];
      return parseDate2(dateOnly);
    }
    if (trimmed.startsWith("T") && /^T\d{2}:\d{2}(:\d{2})?/.test(trimmed)) {
      const error = new Error(`Invalid date format - time without date: ${dateString}`);
      console.warn("Date parsing error - incomplete time format:", {
        original: dateString,
        trimmed,
        error: error.message
      });
      throw error;
    }
    if (/^\d{4}-W\d{2}$/.test(trimmed)) {
      const [year, week] = trimmed.split("-W");
      const yearNum = parseInt(year, 10);
      const weekNum = parseInt(week, 10);
      if (isNaN(yearNum) || isNaN(weekNum)) {
        const error = new Error(`Invalid numeric values in ISO week format: ${dateString}`);
        console.warn("Date parsing error - invalid ISO week numbers:", {
          original: dateString,
          year,
          week,
          yearNum,
          weekNum
        });
        throw error;
      }
      if (weekNum < 1 || weekNum > 53) {
        const error = new Error(
          `Invalid week number in ISO week format: ${dateString} (week must be 1-53)`
        );
        console.warn("Date parsing error - week number out of range:", {
          original: dateString,
          weekNum,
          error: error.message
        });
        throw error;
      }
      const jan4 = new Date(yearNum, 0, 4);
      const jan4Day = jan4.getDay();
      const mondayOfWeek1 = new Date(jan4);
      mondayOfWeek1.setDate(jan4.getDate() - (jan4Day === 0 ? 6 : jan4Day - 1));
      const targetWeekMonday = new Date(mondayOfWeek1);
      targetWeekMonday.setDate(mondayOfWeek1.getDate() + (weekNum - 1) * 7);
      if (!isValid(targetWeekMonday)) {
        const error = new Error(
          `Failed to calculate date from ISO week format: ${dateString}`
        );
        console.error("Date parsing error - ISO week calculation failed:", {
          original: dateString,
          yearNum,
          weekNum,
          jan4: jan4.toISOString(),
          targetWeekMonday: targetWeekMonday.toString()
        });
        throw error;
      }
      return targetWeekMonday;
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?/.test(trimmed)) {
      const isoFormat = trimmed.replace(" ", "T");
      const parsed = parseISO(isoFormat);
      if (!isValid(parsed)) {
        const error = new Error(`Invalid space-separated datetime: ${dateString}`);
        console.warn("Date parsing error - space-separated datetime invalid:", {
          original: dateString,
          converted: isoFormat,
          error: error.message
        });
        throw error;
      }
      return parsed;
    }
    if (trimmed.includes("T") || trimmed.includes("Z") || trimmed.match(/[+-]\d{2}:\d{2}$/)) {
      const parsed = parseISO(trimmed);
      if (!isValid(parsed)) {
        const error = new Error(`Invalid timezone-aware date: ${dateString}`);
        console.warn("Date parsing error - timezone-aware format invalid:", {
          original: dateString,
          trimmed,
          error: error.message
        });
        throw error;
      }
      return parsed;
    } else {
      const dateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!dateMatch) {
        const error = new Error(
          `Invalid date-only string: ${dateString} (expected format: yyyy-MM-dd)`
        );
        console.warn("Date parsing error - date-only format invalid:", {
          original: dateString,
          trimmed,
          expectedFormat: "yyyy-MM-dd",
          error: error.message
        });
        throw error;
      }
      const [, year, month, day] = dateMatch;
      const parsed = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      if (!isValid(parsed) || parsed.getFullYear() !== parseInt(year, 10) || parsed.getMonth() !== parseInt(month, 10) - 1 || parsed.getDate() !== parseInt(day, 10)) {
        const error = new Error(`Invalid date values: ${dateString}`);
        console.warn("Date parsing error - invalid date values:", {
          original: dateString,
          year,
          month,
          day,
          error: error.message
        });
        throw error;
      }
      return parsed;
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid date")) {
      throw error;
    }
    const wrappedError = new Error(
      `Unexpected error parsing date "${dateString}": ${error instanceof Error ? error.message : String(error)}`
    );
    console.error("Unexpected date parsing error:", {
      original: dateString,
      trimmed,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : void 0
    });
    throw wrappedError;
  }
}
function parseDateToUTC(dateString) {
  if (!dateString) {
    const error = new Error("Date string cannot be empty");
    console.error("Date parsing error:", { dateString, error: error.message });
    throw error;
  }
  const trimmed = dateString.trim();
  try {
    const dateWithDayNameMatch = trimmed.match(
      /^(\d{4}-\d{2}-\d{2})\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i
    );
    if (dateWithDayNameMatch) {
      const dateOnly = dateWithDayNameMatch[1];
      return parseDateToUTC(dateOnly);
    }
    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10);
      const dayNum = parseInt(day, 10);
      if (monthNum < 1 || monthNum > 12) {
        throw new Error(`Invalid month in date: ${dateString}`);
      }
      if (dayNum < 1 || dayNum > 31) {
        throw new Error(`Invalid day in date: ${dateString}`);
      }
      const parsed = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
      if (parsed.getUTCFullYear() !== yearNum || parsed.getUTCMonth() !== monthNum - 1 || parsed.getUTCDate() !== dayNum) {
        throw new Error(`Invalid date values: ${dateString}`);
      }
      return parsed;
    }
    return parseDateToLocal(trimmed);
  } catch (error) {
    const wrappedError = new Error(`Failed to parse date to UTC: ${trimmed}`);
    console.error("Date parsing error:", {
      dateString,
      trimmed,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : void 0
    });
    throw wrappedError;
  }
}
var parseDateToLocal = parseDate2;
function isSameDateSafe(date1, date2) {
  try {
    const date1Part = getDatePart(date1);
    const date2Part = getDatePart(date2);
    const d1 = parseDateToUTC(date1Part);
    const d2 = parseDateToUTC(date2Part);
    return d1.getTime() === d2.getTime();
  } catch (error) {
    console.error("Error comparing dates:", { date1, date2, error });
    return false;
  }
}
function isBeforeDateSafe(date1, date2) {
  try {
    const date1Part = getDatePart(date1);
    const date2Part = getDatePart(date2);
    const d1 = parseDateToUTC(date1Part);
    const d2 = parseDateToUTC(date2Part);
    return d1.getTime() < d2.getTime();
  } catch (error) {
    console.error("Error comparing dates for before:", { date1, date2, error });
    return false;
  }
}
function getCurrentDateString() {
  const now = /* @__PURE__ */ new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function hasTimeComponent(dateString) {
  if (!dateString) return false;
  return /T\d{2}:\d{2}/.test(dateString);
}
function getDatePart(dateString) {
  if (!dateString) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    const tIndex = dateString.indexOf("T");
    if (tIndex > -1) {
      return dateString.substring(0, tIndex);
    }
    const parsed = parseDateToUTC(dateString);
    return formatDateForStorage(parsed);
  } catch (error) {
    console.error("Error extracting date part:", { dateString, error });
    return dateString;
  }
}
function formatDateForStorage(date) {
  try {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn("formatDateForStorage received invalid date:", date);
      return "";
    }
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("Error formatting date for storage:", { date, error });
    return "";
  }
}
export {
  getCurrentDateString,
  getDatePart,
  hasTimeComponent,
  isBeforeDateSafe,
  isSameDateSafe,
  parseDateToLocal,
  parseDateToUTC
};
