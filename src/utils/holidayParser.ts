// Lightweight holiday parsing utilities
// - parseDatesFromText: extract ISO date strings from OCR/text input
// - parseDatesFromImageFile: run Tesseract.js OCR on an image File and parse dates

import { parse, isValid, formatISO } from 'date-fns';

const numericDatePatterns = [
  // 2025-12-15 or 2025/12/15
  /\b(\d{4})[-\/]?(\d{1,2})[-\/]?(\d{1,2})\b/g,
  // 15.12.2025 or 15/12/2025 or 15-12-2025
  /\b(\d{1,2})[\.\-\/]?(\d{1,2})[\.\-\/]?(\d{4})\b/g,
];

const monthNamesRO: Record<string, number> = {
  ianuarie: 1, februarie: 2, martie: 3, aprilie: 4, mai: 5, iunie: 6,
  iulie: 7, august: 8, septembrie: 9, octombrie: 10, noiembrie: 11, decembrie: 12,
};

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function parseDatesFromText(text: string, defaultYear?: number): string[] {
  const results = new Set<string>();
  if (!text) return [];
  const lc = text.toLowerCase();

  // Numeric patterns
  for (const rx of numericDatePatterns) {
    let m: RegExpExecArray | null;
    rx.lastIndex = 0;
    while ((m = rx.exec(lc))) {
      try {
        if (m[1] && m[2] && m[3]) {
          let yyyy = parseInt(m[1], 10);
          let mm = parseInt(m[2], 10);
          let dd = parseInt(m[3], 10);
          // If format matched as dd mm yyyy (pattern 2), swap
          if (dd > 31) { // then first group was year
            // keep as yyyy mm dd
          } else if (yyyy < 100) {
            // unlikely
          }
          // Heuristic: if first group is year (>= 1900) keep; else if third group is year, rearrange
          if (yyyy < 1900 && parseInt(m[3], 10) >= 1900) {
            // pattern matched dd mm yyyy
            dd = parseInt(m[1], 10);
            mm = parseInt(m[2], 10);
            yyyy = parseInt(m[3], 10);
          }
          const dt = new Date(yyyy, mm - 1, dd);
          if (!Number.isNaN(dt.getTime())) {
            results.add(formatISO(dt, { representation: 'date' }));
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    }
  }

  // Month name patterns (Romanian and English)
  const monthRx = /(\d{1,2})\s+(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)\s*(\d{4})?/gi;
  for (const m2 of lc.matchAll(monthRx)) {
    const dd = parseInt(m2[1], 10);
    const monthName = m2[2];
    const yyyy = m2[3] ? parseInt(m2[3], 10) : (defaultYear || new Date().getFullYear());
    const mm = monthNamesRO[monthName] || 0;
    if (mm && dd >= 1 && dd <= 31) {
      const dt = new Date(yyyy, mm - 1, dd);
      if (!Number.isNaN(dt.getTime())) {
        results.add(formatISO(dt, { representation: 'date' }));
      }
    }
  }

  return Array.from(results).sort();
}

// OCR-based parsing using tesseract.js in browser
export async function parseDatesFromImageFile(file: File, defaultYear?: number): Promise<string[]> {
  // Dynamically import to keep bundle small when unused
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker({ logger: () => {} });
  try {
    await worker.load();
    await worker.loadLanguage('eng+rum');
    await worker.initialize('eng+rum');
    const { data } = await worker.recognize(file);
    const text = data?.text || '';
    return parseDatesFromText(text, defaultYear);
  } finally {
    try { await worker.terminate(); } catch (e) { /* ignore */ }
  }
}

export default { parseDatesFromText, parseDatesFromImageFile };
