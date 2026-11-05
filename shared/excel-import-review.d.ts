export type ExcelImportReviewRow = {
  rowNumber: number
  rowState?: string
  duplicateInFile?: boolean
  validationErrors?: unknown[]
  [key: string]: unknown
}

export function getConfirmableImportRowNumbers(
  rows: ExcelImportReviewRow[],
  options?: {
    selectedRowNumbers?: Set<number>
    duplicateDecisions?: Map<number, "accept" | "reject">
  },
): number[]

export function getSuccessfullyImportedRowNumbers(payload: {
  importedRowNumbers?: unknown
  records?: unknown
}): number[]

export function reconcileImportRows<T extends ExcelImportReviewRow>(
  rows: T[],
  options?: {
    importedRowNumbers?: number[]
    rejectedRowNumbers?: number[]
    failedRecords?: T[]
  },
): T[]
