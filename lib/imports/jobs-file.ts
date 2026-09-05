import * as XLSX from "xlsx";

export const EXPECTED_IMPORT_COLUMNS = [
  "source",
  "title",
  "company",
  "location",
  "remote",
  "salary",
  "posted_at",
  "url",
  "description",
] as const;

export type ExpectedImportColumn = (typeof EXPECTED_IMPORT_COLUMNS)[number];

export interface ParsedImportRow {
  rowNumber: number;
  source: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  contract_type?: string | null;
  salary: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  experience_min_years?: number | null;
  remote_mode?: string | null;
  posted_at: string;
  url: string;
  description: string | null;
  raw_data?: Record<string, unknown>;
}

export interface InvalidImportRow {
  rowNumber: number;
  errors: string[];
}

export interface ParsedImportFile {
  totalRows: number;
  rows: ParsedImportRow[];
  invalidRows: InvalidImportRow[];
}

const TRUE_VALUES = new Set(["true", "1", "yes", "y", "remote", "on"]);
const FALSE_VALUES = new Set(["false", "0", "no", "n", "onsite", "on-site", "off"]);

function parseRemote(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return null;
}

function parsePostedAt(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase();
}

function asCellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function parseJobsImportFile(
  fileBuffer: Buffer
): ParsedImportFile {
  const workbook = XLSX.read(fileBuffer, { type: "buffer", raw: false, dense: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("The uploaded file is empty");
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    blankrows: false,
    raw: false,
    defval: "",
  });

  if (matrix.length < 1) {
    throw new Error("The uploaded file does not contain headers");
  }

  const headerRow = matrix[0] ?? [];
  const normalizedHeaders = headerRow.map((header) => normalizeHeader(header));
  const seenColumns = new Set(normalizedHeaders);
  const missingColumns = EXPECTED_IMPORT_COLUMNS.filter((column) => !seenColumns.has(column));

  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(", ")}. Expected columns: ${EXPECTED_IMPORT_COLUMNS.join(", ")}`
    );
  }

  const columnIndexByName = new Map<ExpectedImportColumn, number>();
  for (const column of EXPECTED_IMPORT_COLUMNS) {
    const index = normalizedHeaders.findIndex((header) => header === column);
    if (index < 0) {
      throw new Error(`Missing required column: ${column}`);
    }
    columnIndexByName.set(column, index);
  }

  const parsedRows: ParsedImportRow[] = [];
  const invalidRows: InvalidImportRow[] = [];
  const fileUrls = new Set<string>();
  let duplicatesWithinFile = 0;

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const rawRow = matrix[rowIndex] ?? [];
    const rowNumber = rowIndex + 1;

    const rowValues = Object.fromEntries(
      EXPECTED_IMPORT_COLUMNS.map((column) => [
        column,
        asCellText(rawRow[columnIndexByName.get(column) ?? -1]),
      ])
    ) as Record<ExpectedImportColumn, string>;

    const isEmptyRow = EXPECTED_IMPORT_COLUMNS.every((column) => rowValues[column] === "");
    if (isEmptyRow) continue;

    const rowErrors: string[] = [];
    if (!rowValues.title) rowErrors.push("title is required");
    if (!rowValues.url) rowErrors.push("url is required");

    let remote = parseRemote(rowValues.remote);
    if (remote === null) {
      rowErrors.push(
        "remote must be one of true/false/yes/no/1/0/remote/onsite (empty allowed)"
      );
      remote = false;
    }

    const postedAt = parsePostedAt(rowValues.posted_at);
    if (!postedAt) rowErrors.push("posted_at must be a valid date");

    const normalizedUrl = rowValues.url.trim();
    if (normalizedUrl && fileUrls.has(normalizedUrl)) {
      duplicatesWithinFile += 1;
      continue;
    }

    if (rowErrors.length > 0 || !postedAt) {
      invalidRows.push({ rowNumber, errors: rowErrors });
      continue;
    }

    fileUrls.add(normalizedUrl);
    parsedRows.push({
      rowNumber,
      source: rowValues.source || "CSV Import",
      title: rowValues.title,
      company: rowValues.company || "Unknown company",
      location: rowValues.location || null,
      remote,
      salary: rowValues.salary || null,
      posted_at: postedAt,
      url: normalizedUrl,
      description: rowValues.description || null,
    });
  }

  if (duplicatesWithinFile > 0) {
    invalidRows.push({
      rowNumber: 0,
      errors: [`${duplicatesWithinFile} duplicate URL(s) were skipped inside the uploaded file`],
    });
  }

  const totalRows = matrix.length > 0 ? matrix.length - 1 : 0;
  return {
    totalRows,
    rows: parsedRows,
    invalidRows,
  };
}

export const WEBSITE_PASTE_SOURCE = "website_paste";

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Build one import row from a pasted job-page URL and/or page text. */
export function buildWebsitePasteRow(
  urlInput: string,
  content: string,
  rowNumber = 1
): ParsedImportRow | null {
  const contentTrimmed = content.trim();
  if (!contentTrimmed) return null;

  const urlTrimmed = urlInput.trim();
  const lines = contentTrimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const title = (lines[0] ?? "Offre collée").slice(0, 160);

  let company = "Site web";
  let url = urlTrimmed;
  if (urlTrimmed) {
    try {
      const hostname = new URL(urlTrimmed).hostname.replace(/^www\./, "");
      if (hostname) company = hostname;
    } catch {
      // Keep the raw URL string even if it is not a valid absolute URL.
    }
  }
  if (!url) {
    url = `https://paste.local/job-${rowNumber}`;
  }

  return {
    rowNumber,
    source: WEBSITE_PASTE_SOURCE,
    title,
    company,
    location: null,
    remote: false,
    salary: null,
    posted_at: new Date().toISOString(),
    url,
    description: contentTrimmed,
    raw_data: {
      pasted_url: urlTrimmed || null,
      pasted_text: contentTrimmed,
    },
  };
}

/** Serialize preview rows to a CSV File for the existing import-jobs upload API. */
export function rowsToCsvFile(
  rows: ParsedImportRow[],
  fileName = "website-paste-import.csv"
): File {
  const header = EXPECTED_IMPORT_COLUMNS.join(",");
  const lines = rows.map((row) =>
    EXPECTED_IMPORT_COLUMNS.map((column) => {
      if (column === "remote") return row.remote ? "true" : "false";
      const value = row[column];
      return escapeCsvCell(value == null ? "" : String(value));
    }).join(",")
  );

  return new File([`${header}\n${lines.join("\n")}`], fileName, {
    type: "text/csv;charset=utf-8",
  });
}

export function mergeWebsitePasteRow(
  rows: ParsedImportRow[],
  pasteRow: ParsedImportRow | null
): ParsedImportRow[] {
  const withoutPaste = rows.filter((row) => row.source !== WEBSITE_PASTE_SOURCE);
  if (!pasteRow) return withoutPaste;
  return [
    ...withoutPaste,
    { ...pasteRow, rowNumber: withoutPaste.length + 1 },
  ];
}
