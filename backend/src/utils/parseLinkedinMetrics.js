export function parseLinkedinMetric(value) {
  if (!value) return 0;

  const cleaned = value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/,/g, "");

  if (cleaned.endsWith("k")) {
    return Math.round(parseFloat(cleaned) * 1000);
  }

  if (cleaned.endsWith("m")) {
    return Math.round(parseFloat(cleaned) * 1000000);
  }

  const number = parseInt(cleaned, 10);

  return Number.isNaN(number) ? 0 : number;
}