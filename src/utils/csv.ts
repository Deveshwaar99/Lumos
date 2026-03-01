/**
 * Escapes a field for CSV: wraps in quotes if it contains comma, quote, or newline;
 * doubles internal quotes.
 */
export function escapeCSVField(field: string): string {
  const needsQuotes =
    field.includes(',') || field.includes('"') || field.includes('\n');
  if (!needsQuotes) return field;
  return '"' + field.replace(/"/g, '""') + '"';
}

/**
 * Builds a CSV string from headers and rows with proper escaping.
 */
export function generateCSV(headers: string[], rows: string[][]): string {
  const escapeRow = (row: string[]) =>
    row.map(escapeCSVField).join(',');
  const headerLine = escapeRow(headers);
  const dataLines = rows.map(escapeRow);
  return [headerLine, ...dataLines].join('\n');
}
