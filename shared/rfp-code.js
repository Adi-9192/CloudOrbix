export function buildRfpCodeBase(projectName, requestedDate) {
  const words = String(projectName || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length || !/^\d{4}-\d{2}-\d{2}$/.test(String(requestedDate || ""))) {
    return "";
  }

  const [year, month, day] = String(requestedDate).split("-");
  const initials = words.length === 1
    ? words[0].slice(0, 2)
    : words.slice(0, 2).map((word) => word[0]).join("");

  return `RFP_${initials}_${day}${month}${year.slice(-2)}`;
}
