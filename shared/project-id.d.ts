export interface ProjectIdPeriod {
  date?: Date | string | number

  year?: number | string

  month?: number | string
}

export function projectIdPrefix(period?: ProjectIdPeriod): string

export function createProjectIdAllocator(
  existingProjectIds?: Array<string | null | undefined>,
): {
  reserve(projectId: string | null | undefined): void

  next(period?: ProjectIdPeriod): string
}

export function resolveNewProjectId(
  preferredId: string | null | undefined,
  existingProjectIds: Array<string | null | undefined>,
  period: ProjectIdPeriod,
): string
