export function validateProjectMetrics(body) {
  const resources = body.resources;
  if (resources !== null && resources !== undefined) {
    if (!Array.isArray(resources)) {
      return 'Resources must be a list of resource names and FTE values.';
    }

    for (const resource of resources) {
      if (
        !resource ||
        typeof resource !== 'object' ||
        Array.isArray(resource) ||
        typeof resource.resourceName !== 'string' ||
        !resource.resourceName.trim() ||
        resource.resourceName.trim().length > 255
      ) {
        return 'Each resource must have a name of 255 characters or fewer.';
      }

      const fte = resource.fte;
      if (fte !== null && fte !== undefined && fte !== '') {
        const value = Number(fte);
        if (
          !Number.isFinite(value) ||
          value < 0 ||
          value > 9999999.99 ||
          Number(value.toFixed(2)) !== value
        ) {
          return 'Each resource FTE must be a non-negative number with at most two decimal places.';
        }
      }
    }
  }

  const voumetric = body.voumetric;
  if (voumetric !== null && voumetric !== undefined && voumetric !== '') {
    const value = Number(voumetric);
    if (!Number.isInteger(value) || value < 0 || value > 2147483647) {
      return 'Voumetric must be a non-negative whole number.';
    }
  }

  return null;
}
