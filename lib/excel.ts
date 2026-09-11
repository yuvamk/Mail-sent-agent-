import * as XLSX from 'xlsx';

export interface ColumnMapping {
  companyCol?: string;
  emailCol?: string;
  skillsCol?: string;
  locationCol?: string;
  experienceCol?: string;
  salaryCol?: string;
  phoneCol?: string;
}

export interface ExcelPreviewResult {
  filename: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
  autoMapping: ColumnMapping;
}

export interface RawExcelLead {
  company: string;
  location: string;
  salary: string;
  experience: string;
  key_skills: string;
  email: string | null;
  contact_number: string;
  apply_url: string | null;
  has_valid_email: boolean;
  source_file: string;
  raw_data: Record<string, string>;
}

export interface ParseResult {
  leads: RawExcelLead[];
  totalRowsProcessed: number;
  validEmailCount: number;
  urlOnlyCount: number;
  skippedCount: number;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function cleanString(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function isUrl(str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('www.');
}

/**
 * Intelligently auto-detect which header corresponds to key target fields
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  for (const h of headers) {
    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!mapping.companyCol && (clean.includes('company') || clean.includes('organization') || clean.includes('employer') || clean.includes('firm'))) {
      mapping.companyCol = h;
    } else if (!mapping.emailCol && (clean.includes('email') || clean.includes('mail') || clean.includes('contactemail'))) {
      mapping.emailCol = h;
    } else if (!mapping.skillsCol && (clean.includes('skill') || clean.includes('technology') || clean.includes('stack') || clean.includes('requirement'))) {
      mapping.skillsCol = h;
    } else if (!mapping.locationCol && (clean.includes('location') || clean.includes('city') || clean.includes('country') || clean.includes('place'))) {
      mapping.locationCol = h;
    } else if (!mapping.experienceCol && (clean.includes('exp') || clean.includes('year') || clean.includes('seniority'))) {
      mapping.experienceCol = h;
    } else if (!mapping.salaryCol && (clean.includes('salary') || clean.includes('ctc') || clean.includes('pay') || clean.includes('budget') || clean.includes('compensation'))) {
      mapping.salaryCol = h;
    } else if (!mapping.phoneCol && (clean.includes('phone') || clean.includes('mobile') || clean.includes('contact') || clean.includes('number'))) {
      mapping.phoneCol = h;
    }
  }

  // Fallback: If no explicit email column found, search headers for generic "contact"
  if (!mapping.emailCol) {
    const genericContact = headers.find(h => h.toLowerCase().includes('contact'));
    if (genericContact) mapping.emailCol = genericContact;
  }

  // Fallback: First column is usually company / organization if unmatched
  if (!mapping.companyCol && headers.length > 0) {
    mapping.companyCol = headers[0];
  }

  return mapping;
}

/**
 * Step 1: Preview any arbitrary Excel file dynamically
 */
export function previewExcelFile(buffer: Buffer, filename: string): ExcelPreviewResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { filename, headers: [], sampleRows: [], totalRows: 0, autoMapping: {} };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rawRows.length === 0) {
    return { filename, headers: [], sampleRows: [], totalRows: 0, autoMapping: {} };
  }

  // Extract all unique headers across rows
  const headersSet = new Set<string>();
  rawRows.forEach(row => {
    Object.keys(row).forEach(k => headersSet.add(k));
  });
  const headers = Array.from(headersSet);

  // Clean sample rows (first 5)
  const sampleRows = rawRows.slice(0, 5).map(row => {
    const cleanedRow: Record<string, string> = {};
    headers.forEach(h => {
      cleanedRow[h] = cleanString(row[h]);
    });
    return cleanedRow;
  });

  const autoMapping = autoDetectMapping(headers);

  return {
    filename,
    headers,
    sampleRows,
    totalRows: rawRows.length,
    autoMapping,
  };
}

/**
 * Step 2: Process dynamic Excel file with selected column mappings
 */
export function processExcelFileWithMapping(
  buffer: Buffer,
  filename: string,
  mapping: ColumnMapping
): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { leads: [], totalRowsProcessed: 0, validEmailCount: 0, urlOnlyCount: 0, skippedCount: 0 };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const parsedLeads: RawExcelLead[] = [];
  let totalRowsProcessed = 0;
  let validEmailCount = 0;
  let urlOnlyCount = 0;
  let skippedCount = 0;

  for (const rawRow of rawRows) {
    totalRowsProcessed++;

    // Pack ALL fields dynamically into raw_data dictionary
    const rawDataMap: Record<string, string> = {};
    for (const [key, val] of Object.entries(rawRow)) {
      const cleanVal = cleanString(val);
      if (cleanVal) {
        rawDataMap[key] = cleanVal;
      }
    }

    const company = (mapping.companyCol ? rawDataMap[mapping.companyCol] : '') || 'Unknown Company';
    const location = (mapping.locationCol ? rawDataMap[mapping.locationCol] : '') || '';
    const salary = (mapping.salaryCol ? rawDataMap[mapping.salaryCol] : '') || '';
    const experience = (mapping.experienceCol ? rawDataMap[mapping.experienceCol] : '') || '';
    const key_skills = (mapping.skillsCol ? rawDataMap[mapping.skillsCol] : '') || '';
    const contact_number = (mapping.phoneCol ? rawDataMap[mapping.phoneCol] : '') || '';

    // Determine email field
    let rawEmailField = mapping.emailCol ? rawDataMap[mapping.emailCol] || '' : '';

    // If mapped email field is empty, search all values in row for email or URL
    if (!rawEmailField) {
      for (const val of Object.values(rawDataMap)) {
        if (EMAIL_REGEX.test(val) || isUrl(val)) {
          rawEmailField = val;
          break;
        }
      }
    }

    // Check empty / NA
    if (!rawEmailField || rawEmailField.toUpperCase() === 'NA' || rawEmailField.toUpperCase() === 'N/A') {
      parsedLeads.push({
        company,
        location,
        salary,
        experience,
        key_skills,
        email: null,
        contact_number,
        apply_url: null,
        has_valid_email: false,
        source_file: filename,
        raw_data: rawDataMap,
      });
      urlOnlyCount++;
      continue;
    }

    // URL Check
    if (isUrl(rawEmailField)) {
      const formattedUrl = rawEmailField.startsWith('www.') ? `https://${rawEmailField}` : rawEmailField;
      parsedLeads.push({
        company,
        location,
        salary,
        experience,
        key_skills,
        email: null,
        contact_number,
        apply_url: formattedUrl,
        has_valid_email: false,
        source_file: filename,
        raw_data: rawDataMap,
      });
      urlOnlyCount++;
      continue;
    }

    // Multi-email split
    const emailCandidates = rawEmailField
      .split(/[\/\s,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    let addedForThisRow = 0;
    for (const emailCand of emailCandidates) {
      if (isUrl(emailCand)) {
        parsedLeads.push({
          company,
          location,
          salary,
          experience,
          key_skills,
          email: null,
          contact_number,
          apply_url: emailCand.startsWith('www.') ? `https://${emailCand}` : emailCand,
          has_valid_email: false,
          source_file: filename,
          raw_data: rawDataMap,
        });
        urlOnlyCount++;
      } else if (EMAIL_REGEX.test(emailCand)) {
        parsedLeads.push({
          company,
          location,
          salary,
          experience,
          key_skills,
          email: emailCand,
          contact_number,
          apply_url: null,
          has_valid_email: true,
          source_file: filename,
          raw_data: rawDataMap,
        });
        validEmailCount++;
        addedForThisRow++;
      } else {
        parsedLeads.push({
          company,
          location,
          salary,
          experience,
          key_skills,
          email: null,
          contact_number,
          apply_url: null,
          has_valid_email: false,
          source_file: filename,
          raw_data: rawDataMap,
        });
        skippedCount++;
      }
    }

    if (addedForThisRow === 0 && emailCandidates.length === 0) {
      skippedCount++;
    }
  }

  return {
    leads: parsedLeads,
    totalRowsProcessed,
    validEmailCount,
    urlOnlyCount,
    skippedCount,
  };
}
