export function toProjectTerminology(value) {
  if (typeof value !== 'string') return value;

  return value.replace(/\bclients?\b/gi, (match) => {
    const replacement = match.toLowerCase() === 'clients' ? 'projects' : 'project';
    if (match === match.toUpperCase()) return replacement.toUpperCase();
    if (match[0] === match[0].toUpperCase()) {
      return replacement[0].toUpperCase() + replacement.slice(1);
    }
    return replacement;
  });
}
