import assert from "node:assert/strict"
import test from "node:test"

import {
  getConfirmableImportRowNumbers,
  getSuccessfullyImportedRowNumbers,
  reconcileImportRows,
} from "./excel-import-review.js"

const row = (rowNumber, properties = {}) => ({
  rowNumber,
  rowState: "Valid",
  duplicateInFile: false,
  validationErrors: [],
  ...properties,
})

test("removes rows only after the server reports successful import", () => {
  const rows = [row(2), row(3)]
  const response = {
    importedRowNumbers: [2],
    records: [{ rowNumber: 2, imported: true }],
  }

  assert.deepEqual(
    reconcileImportRows(rows, {
      importedRowNumbers: getSuccessfullyImportedRowNumbers(response),
    }),
    [rows[1]],
  )
  assert.deepEqual(reconcileImportRows(rows), rows)
})

test("reads explicit success row numbers and supports older server responses", () => {
  assert.deepEqual(
    getSuccessfullyImportedRowNumbers({
      importedRowNumbers: [3, 3, "4", 0],
      records: [{ rowNumber: 5, imported: true }],
    }),
    [3],
  )
  assert.deepEqual(
    getSuccessfullyImportedRowNumbers({
      records: [
        { rowNumber: 5, imported: true },
        { rowNumber: 6, imported: false },
      ],
    }),
    [5],
  )
  assert.deepEqual(getSuccessfullyImportedRowNumbers({ records: [] }), [])
})

test("corrected rows require a bulk confirmation and unresolved rows are skipped", () => {
  const rows = [
    row(2, { rowState: "Corrected" }),
    row(3, {
      rowState: "Validation Failed",
      validationErrors: [{ field: "estimatedStart", message: "Required" }],
    }),
  ]

  assert.deepEqual(getConfirmableImportRowNumbers(rows), [2])
  assert.deepEqual(
    getConfirmableImportRowNumbers(rows, { selectedRowNumbers: new Set([3]) }),
    [],
  )
  assert.deepEqual(
    getConfirmableImportRowNumbers(rows, { selectedRowNumbers: new Set([2]) }),
    [2],
  )
})

test("accepted repeated rows require selection and explicit confirmation", () => {
  const repeatedRow = row(4, { duplicateInFile: true })
  const rows = [repeatedRow]

  assert.deepEqual(getConfirmableImportRowNumbers(rows), [])
  assert.deepEqual(
    getConfirmableImportRowNumbers(rows, {
      duplicateDecisions: new Map([[4, "accept"]]),
    }),
    [4],
  )
  assert.deepEqual(
    getConfirmableImportRowNumbers(rows, {
      selectedRowNumbers: new Set([4]),
      duplicateDecisions: new Map([[4, "accept"]]),
    }),
    [4],
  )
  assert.deepEqual(
    getConfirmableImportRowNumbers(rows, {
      selectedRowNumbers: new Set(),
      duplicateDecisions: new Map([[4, "accept"]]),
    }),
    [],
  )
})

test("accepted repeated rows with validation errors wait for correction", () => {
  const repeatedRow = row(6, {
    duplicateInFile: true,
    rowState: "Validation Failed",
    validationErrors: [{ field: "estimatedStart", message: "Required" }],
  })
  const acceptedRows = [repeatedRow]
  const duplicateDecisions = new Map([[6, "accept"]])

  assert.deepEqual(
    getConfirmableImportRowNumbers(acceptedRows, { duplicateDecisions }),
    [],
  )

  const correctedRow = {
    ...repeatedRow,
    rowState: "Corrected",
    validationErrors: [],
  }
  assert.deepEqual(
    getConfirmableImportRowNumbers([correctedRow], { duplicateDecisions }),
    [6],
  )
})

test("keeps a failed server row in review with authoritative validation errors", () => {
  const rows = [row(5, { rowState: "Corrected" })]
  const failure = {
    ...row(5, {
      rowState: "Validation Failed",
      validationErrors: [{ field: "estimatedStart", message: "Invalid date" }],
    }),
    imported: false,
  }

  assert.deepEqual(
    reconcileImportRows(rows, { failedRecords: [failure] }),
    [{ ...rows[0], ...failure, rowState: "Validation Failed" }],
  )
})
