const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",

  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
]

const normalizeMonth = (value) => {
  const text = String(value ?? "").trim()

  if (!text) return null

  const number = Number(text)

  if (Number.isInteger(number) && number >= 1 && number <= 12) {
    return MONTHS[number - 1]
  }

  const abbreviation = text.slice(0, 3).toUpperCase()

  return MONTHS.includes(abbreviation) ? abbreviation : null
}

export function projectIdPrefix({ date, year, month } = {}) {
  const parsedDate = date instanceof Date ? date : date ? new Date(date) : null

  const validDate =
    parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null

  const monthCode =
    normalizeMonth(month) ||
    (validDate ? MONTHS[validDate.getUTCMonth()] : null)

  const resolvedYear =
    Number(year) || (validDate ? validDate.getUTCFullYear() : 0)

  if (!monthCode || !Number.isInteger(resolvedYear) || resolvedYear < 2000) {
    throw new RangeError(
      "A valid project month and year are required to create a project ID.",
    )
  }

  return `PS${monthCode}${String(resolvedYear).slice(-2)}`
}

export function createProjectIdAllocator(existingProjectIds = []) {
  const allocatedIds = new Set()

  const highestSequences = new Map()

  const reserve = (projectId) => {
    const normalizedId = String(projectId ?? "")
      .trim()
      .toUpperCase()

    if (!normalizedId) return

    allocatedIds.add(normalizedId)

    const match = normalizedId.match(/^PS([A-Z]{3})(\d{2})(\d{3})$/)

    if (!match) return

    const prefix = `PS${match[1]}${match[2]}`

    highestSequences.set(
      prefix,

      Math.max(highestSequences.get(prefix) || 0, Number(match[3])),
    )
  }

  existingProjectIds.forEach(reserve)

  return {
    reserve,

    next(period = {}) {
      const prefix = projectIdPrefix(period)

      let sequence = highestSequences.get(prefix) || 0

      let candidate

      do {
        sequence += 1

        candidate = `${prefix}${String(sequence).padStart(3, "0")}`
      } while (allocatedIds.has(candidate))

      highestSequences.set(prefix, sequence)

      allocatedIds.add(candidate)

      return candidate
    },
  }
}

export function resolveNewProjectId(preferredId, existingProjectIds, period) {
  const normalizedPreferredId = String(preferredId ?? "").trim()
  const existingIds = new Set(
    existingProjectIds.map((projectId) => String(projectId ?? "").trim().toUpperCase()),
  )

  if (normalizedPreferredId && !existingIds.has(normalizedPreferredId.toUpperCase())) {
    return normalizedPreferredId
  }

  return createProjectIdAllocator(existingProjectIds).next(period)
}
