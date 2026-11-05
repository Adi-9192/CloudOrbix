import test from "node:test";
import assert from "node:assert/strict";
import {
  parseProjectUpdateDate,
  parseProjectUpdatesText,
} from "./project-updates.js";

test("parses numeric day-first dates with optional year and time", () => {
  assert.equal(
    parseProjectUpdateDate("10/10", 2025),
    "2025-10-10T00:00:00.000Z",
  );
  assert.equal(
    parseProjectUpdateDate("07-09", 2025),
    "2025-09-07T00:00:00.000Z",
  );
  assert.equal(
    parseProjectUpdateDate("05/10/2025 14:30"),
    "2025-10-05T14:30:00.000Z",
  );
  assert.equal(
    parseProjectUpdateDate("2025-10-05T14:30:00Z"),
    "2025-10-05T14:30:00.000Z",
  );
});

test("parses named month date patterns and rejects invalid dates", () => {
  assert.equal(
    parseProjectUpdateDate("17 Sep 2025"),
    "2025-09-17T00:00:00.000Z",
  );
  assert.equal(
    parseProjectUpdateDate("Oct 10, 2025"),
    "2025-10-10T00:00:00.000Z",
  );
  assert.equal(parseProjectUpdateDate("31/02/2025"), null);
});

test("splits pasted dated updates and keeps continuation lines", () => {
  const updates = parseProjectUpdatesText(
    "10/10: Planned servers completed successfully.\n05/10: 6 of 11 servers completed.\n30/09: Non prod servers completed.\n07-09 : According to process,\nraise the change request.",
    2025,
  );

  assert.deepEqual(updates, [
    {
      updateText: "Planned servers completed successfully.",
      createdAt: "2025-10-10T00:00:00.000Z",
    },
    {
      updateText: "6 of 11 servers completed.",
      createdAt: "2025-10-05T00:00:00.000Z",
    },
    {
      updateText: "Non prod servers completed.",
      createdAt: "2025-09-30T00:00:00.000Z",
    },
    {
      updateText: "According to process,\nraise the change request.",
      createdAt: "2025-09-07T00:00:00.000Z",
    },
  ]);
});

test("reports lines that do not start with a recognized date", () => {
  assert.throws(
    () => parseProjectUpdatesText("An undated note"),
    /Could not recognize a date/,
  );
});
