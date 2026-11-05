const monthNumbers = new Map([
  ["jan", 1],
  ["january", 1],
  ["feb", 2],
  ["february", 2],
  ["mar", 3],
  ["march", 3],
  ["apr", 4],
  ["april", 4],
  ["may", 5],
  ["jun", 6],
  ["june", 6],
  ["jul", 7],
  ["july", 7],
  ["aug", 8],
  ["august", 8],
  ["sep", 9],
  ["sept", 9],
  ["september", 9],
  ["oct", 10],
  ["october", 10],
  ["nov", 11],
  ["november", 11],
  ["dec", 12],
  ["december", 12],
]);

const datePrefixPattern =
  /^(\d{4}[./-]\d{1,2}[./-]\d{1,2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?|\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?|\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{2,4})?(?:\s+\d{1,2}:\d{2})?|[A-Za-z]{3,9}\s+\d{1,2}(?:,?\s+\d{2,4})?(?:\s+\d{1,2}:\d{2})?)(?:\s*[:|]\s*|\s*[-–—]\s+|\s+)(.*)$/i;

function toIsoDate(year, month, day, hour = 0, minute = 0, second = 0) {
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }
  return date.toISOString();
}

function normalizeYear(year, fallbackYear) {
  if (year === undefined || year === "") return fallbackYear;
  const numericYear = Number(year);
  if (!Number.isInteger(numericYear)) return null;
  if (numericYear < 100) return numericYear < 50 ? 2000 + numericYear : 1900 + numericYear;
  return numericYear;
}

export function parseProjectUpdateDate(value, yearForUndated = new Date().getFullYear()) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const input = String(value ?? "").trim();
  if (!input) return null;

  const iso = input.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|([+-]\d{2}:\d{2}))?)?$/i,
  );
  if (iso) {
    if (/[zZ]|[+-]\d{2}:\d{2}$/.test(input)) {
      const date = new Date(input);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
    return toIsoDate(
      Number(iso[1]),
      Number(iso[2]),
      Number(iso[3]),
      Number(iso[4] || 0),
      Number(iso[5] || 0),
      Number(iso[6] || 0),
    );
  }

  const numeric = input.match(
    /^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (numeric) {
    const year = normalizeYear(numeric[3], yearForUndated);
    if (!year) return null;
    return toIsoDate(
      year,
      Number(numeric[2]),
      Number(numeric[1]),
      Number(numeric[4] || 0),
      Number(numeric[5] || 0),
      Number(numeric[6] || 0),
    );
  }

  const dayFirst = input.match(
    /^(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{2,4}))?(?:\s+(\d{1,2}):(\d{2}))?$/,
  );
  const monthFirst = input.match(
    /^([A-Za-z]{3,9})\s+(\d{1,2})(?:,?\s+(\d{2,4}))?(?:\s+(\d{1,2}):(\d{2}))?$/,
  );
  const named = dayFirst || monthFirst;
  if (named) {
    const isDayFirst = Boolean(dayFirst);
    const day = Number(named[isDayFirst ? 1 : 2]);
    const month = monthNumbers.get(named[isDayFirst ? 2 : 1].toLowerCase());
    const year = normalizeYear(named[3], yearForUndated);
    if (!month || !year) return null;
    return toIsoDate(
      year,
      month,
      day,
      Number(named[4] || 0),
      Number(named[5] || 0),
    );
  }

  return null;
}

export function parseProjectUpdatesText(text, yearForUndated = new Date().getFullYear()) {
  const updates = [];
  let current = null;

  for (const line of String(text ?? "").split(/\r?\n/)) {
    const match = line.trim().match(datePrefixPattern);
    const createdAt = match
      ? parseProjectUpdateDate(match[1], yearForUndated)
      : null;
    if (match && createdAt) {
      if (current) updates.push(current);
      current = {
        updateText: match[2].trim(),
        createdAt,
      };
    } else if (current && line.trim()) {
      current.updateText = `${current.updateText}\n${line.trim()}`.trim();
    } else if (line.trim()) {
      throw new Error(
        `Could not recognize a date at the start of this line: "${line.trim()}"`,
      );
    }
  }

  if (current) updates.push(current);
  const emptyUpdate = updates.findIndex((update) => !update.updateText);
  if (emptyUpdate !== -1) {
    throw new Error(`Update ${emptyUpdate + 1} is missing its text.`);
  }
  if (!updates.length) {
    throw new Error("No dated updates found. Start each update with a date.");
  }
  return updates;
}
