import assert from "node:assert/strict"

import test from "node:test"

import {
  createProjectIdAllocator,
  projectIdPrefix,
  resolveNewProjectId,
} from "./project-id.js"

test("formats project IDs using PS, month, two-digit year and a three-digit sequence", () => {
  const allocator = createProjectIdAllocator()

  assert.equal(
    allocator.next({ date: "2026-12-01", year: 2026 }),

    "PSDEC26001",
  )

  assert.equal(
    allocator.next({ date: "2026-12-15", year: 2026 }),

    "PSDEC26002",
  )

  assert.equal(
    allocator.next({ month: "Feb", year: 2027 }),

    "PSFEB27001",
  )

  assert.equal(projectIdPrefix({ month: 3, year: 2025 }), "PSMAR25")
})

test("continues the sequence per month and year while reserving existing IDs", () => {
  const allocator = createProjectIdAllocator([
    "PSDEC26001",

    "psdec26004",

    "PSNOV26009",

    "CLT-056",
  ])

  assert.equal(
    allocator.next({ month: "Dec", year: 2026 }),

    "PSDEC26005",
  )

  assert.equal(
    allocator.next({ month: "Nov", year: 2026 }),

    "PSNOV26010",
  )
})

test("rejects IDs when project month or year is missing or invalid", () => {
  const allocator = createProjectIdAllocator()

  assert.throws(() => allocator.next({ year: 2026 }), /month and year/)

  assert.throws(
    () => allocator.next({ month: "NotAMonth", year: 2026 }),
    /month and year/,
  )
})

test("reallocates a preferred project ID when it already exists", () => {
  assert.equal(
    resolveNewProjectId("PSOCT26001", ["PSOCT26001"], {
      month: 10,
      year: 2026,
    }),
    "PSOCT26002",
  )
})

test("keeps an unused preferred project ID", () => {
  assert.equal(
    resolveNewProjectId("PSOCT26003", ["PSOCT26001"], {
      month: 10,
      year: 2026,
    }),
    "PSOCT26003",
  )
})
