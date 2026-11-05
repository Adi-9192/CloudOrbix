export const getConfirmableImportRowNumbers = (
  rows,
  { selectedRowNumbers, duplicateDecisions = new Map() } = {},
) =>
  rows
    .filter((row) => {
      if (selectedRowNumbers && !selectedRowNumbers.has(row.rowNumber)) {
        return false
      }

      if (
        row.rowState === "Confirmed" ||
        row.rowState === "Rejected" ||
        row.validationErrors?.length
      ) {
        return false
      }

      if (row.duplicateInFile) {
        return duplicateDecisions.get(row.rowNumber) === "accept"
      }

      return !row.rowState || row.rowState === "Valid" || row.rowState === "Corrected"
    })
    .map((row) => row.rowNumber)

export const getSuccessfullyImportedRowNumbers = (payload) => {
  if (Array.isArray(payload?.importedRowNumbers)) {
    return [...new Set(
      payload.importedRowNumbers.filter(
        (rowNumber) => Number.isInteger(rowNumber) && rowNumber > 0,
      ),
    )]
  }

  if (!Array.isArray(payload?.records)) return []

  return [
    ...new Set(
      payload.records
        .filter(
          (record) =>
            record?.imported === true &&
            Number.isInteger(record.rowNumber) &&
            record.rowNumber > 0,
        )
        .map((record) => record.rowNumber),
    ),
  ]
}

export const reconcileImportRows = (
  rows,
  { importedRowNumbers = [], rejectedRowNumbers = [], failedRecords = [] } = {},
) => {
  const imported = new Set(importedRowNumbers)
  const rejected = new Set(rejectedRowNumbers)
  const failures = new Map(
    failedRecords.map((record) => [record.rowNumber, record]),
  )

  return rows.flatMap((row) => {
    if (imported.has(row.rowNumber)) return []
    if (rejected.has(row.rowNumber)) {
      return [{ ...row, rowState: "Rejected" }]
    }

    const failedRecord = failures.get(row.rowNumber)
    if (failedRecord) {
      return [{ ...row, ...failedRecord, rowState: "Validation Failed" }]
    }

    return [row]
  })
}
