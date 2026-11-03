export type CsvValue = string | number | boolean | null;
export type CsvRow = Record<string, CsvValue>;

const NUMERIC_TYPES = new Set(['double', 'long', 'unsignedLong']);

/** Split one CSV line, with RFC 4180 quoting. */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted && char === '"' && line[i + 1] === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

function typedValue(text: string, datatype: string | undefined): CsvValue {
  if (text === '') return null;
  if (datatype !== undefined && NUMERIC_TYPES.has(datatype)) {
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
  }
  if (datatype === 'boolean') return text === 'true';
  return text;
}

type TableState = { datatypes?: string[]; header?: string[] };

function rowOf(cells: string[], state: TableState): CsvRow {
  const row: CsvRow = {};
  state.header?.forEach((name, index) => {
    if (name !== '')
      row[name] = typedValue(cells[index] ?? '', state.datatypes?.[index]);
  });
  return row;
}

function startTable(cells: string[], state: TableState): void {
  // InfluxDB answers a failed query with a table of 'error' and 'reference'.
  if (cells.includes('error') && cells.includes('reference')) {
    throw new Error('InfluxDB reported an error in the query');
  }
  state.header = cells;
}

/**
 * Rows of InfluxDB's annotated CSV. Each table carries its own annotations
 * and header and ends with a blank line. Values take the type the
 * '#datatype' annotation names.
 */
export function parseAnnotatedCsv(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  let state: TableState = {};
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') {
      state = {};
      continue;
    }
    const cells = splitCsvLine(line);
    if (cells[0] === '#datatype') state.datatypes = cells;
    else if (cells[0].startsWith('#')) continue;
    else if (state.header === undefined) startTable(cells, state);
    else rows.push(rowOf(cells, state));
  }
  return rows;
}
