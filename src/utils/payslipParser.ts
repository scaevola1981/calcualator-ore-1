export interface ExtractedPayslipData {
  normalHours: number | null;
  nightHours: number | null;
  overtimeHours: number | null;
  vacationDays: number | null;
  mealTicketsCount: number | null;
  grossTotal: number | null;
  netSalary: number | null;
  restDePlata: number | null;
  advancePayment: number | null;
  rawText: string;
}

export function parsePayslipText(text: string): ExtractedPayslipData {
  const cleanNumber = (str: string): number | null => {
    if (!str) return null;
    // Replace romanian decimal comma with dot, remove thousands dots
    // e.g. "10.777" -> 10777, "42,9" -> 42.9, "6.496" -> 6496
    const sanitized = str.trim().replace(/\s+/g, '');
    if (sanitized.includes(',') && !sanitized.includes('.')) {
      const val = parseFloat(sanitized.replace(',', '.'));
      return isNaN(val) ? null : val;
    }
    // If it has a dot like "10.777", determine if it's thousands separator or decimal
    const parts = sanitized.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      // Thousands separator like 10.777 -> 10777
      const val = parseFloat(parts[0] + parts[1]);
      return isNaN(val) ? null : val;
    }
    const val = parseFloat(sanitized.replace(',', '.'));
    return isNaN(val) ? null : val;
  };

  const lines = text.split('\n');

  let normalHours: number | null = null;
  let nightHours: number | null = null;
  let overtimeHours: number | null = null;
  let vacationDays: number | null = null;
  let mealTicketsCount: number | null = null;
  let grossTotal: number | null = null;
  let netSalary: number | null = null;
  let restDePlata: number | null = null;
  let advancePayment: number | null = null;

  for (const line of lines) {
    const lower = line.toLowerCase();

    // 1. Ore regie
    if (lower.includes('regie') || lower.includes('ore regie')) {
      const match = line.match(/(?:regie[^\d]*|ore[^\d]*)(\d+[\.,]?\d*)/i);
      if (match && match[1]) {
        const parsed = cleanNumber(match[1]);
        if (parsed !== null && parsed > 0 && parsed < 400) normalHours = parsed;
      }
    }

    // 2. Ore noapte
    if (lower.includes('noapte') || lower.includes('ore noapte')) {
      const matches = [...line.matchAll(/(\d+[\.,]?\d*)/g)];
      for (const m of matches) {
        const val = cleanNumber(m[1]);
        if (val !== null && val > 0 && val < 200 && val !== 25) { // 25 is the percent
          nightHours = val;
          break;
        }
      }
    }

    // 3. Ore suplimentare
    if (lower.includes('suplimentar') || lower.includes('ore suplim')) {
      const matches = [...line.matchAll(/(\d+[\.,]?\d*)/g)];
      for (const m of matches) {
        const val = cleanNumber(m[1]);
        if (val !== null && val > 0 && val < 200 && val !== 200 && val !== 100) { // exclude 200% percent
          overtimeHours = val;
          break;
        }
      }
    }

    // 4. Concediu odihnă (CO)
    if (lower.includes('co') && (lower.includes('zile') || lower.includes('odihn') || lower.match(/\bco\b/))) {
      const matches = [...line.matchAll(/(\d+[\.,]?\d*)/g)];
      for (const m of matches) {
        const val = cleanNumber(m[1]);
        if (val !== null && val > 0 && val <= 31) {
          vacationDays = val;
          break;
        }
      }
    }

    // 5. Tichete masă
    if (lower.includes('tichet') && !lower.includes('(-)')) {
      const matches = [...line.matchAll(/(\d+[\.,]?\d*)/g)];
      for (const m of matches) {
        const val = cleanNumber(m[1]);
        if (val !== null && val > 0 && val <= 31 && val !== 22) { // 22 is ticket value
          mealTicketsCount = val;
          break;
        }
      }
    }

    // 6. Venit brut
    if (lower.includes('venit brut') || lower.includes('brut')) {
      const matches = [...line.matchAll(/(\d+[\.,\d]*)/g)];
      for (const m of matches) {
        const val = cleanNumber(m[1]);
        if (val !== null && val > 3000) {
          grossTotal = val;
        }
      }
    }

    // 7. Salariu net
    if (lower.includes('salariu net')) {
      const matches = [...line.matchAll(/(\d+[\.,\d]*)/g)];
      for (const m of matches) {
        const val = cleanNumber(m[1]);
        if (val !== null && val > 2000) {
          netSalary = val;
        }
      }
    }

    // 8. Rest de plată
    if (lower.includes('rest plata') || lower.includes('rest de plata')) {
      const matches = [...line.matchAll(/(\d+[\.,\d]*)/g)];
      for (const m of matches) {
        const val = cleanNumber(m[1]);
        if (val !== null && val > 1000) {
          restDePlata = val;
        }
      }
    }

    // 9. Avans salariu
    if (lower.includes('avans')) {
      const matches = [...line.matchAll(/(\d+[\.,\d]*)/g)];
      for (const m of matches) {
        const val = cleanNumber(m[1]);
        if (val !== null && val >= 500 && val <= 5000) {
          advancePayment = val;
          break;
        }
      }
    }
  }

  return {
    normalHours,
    nightHours,
    overtimeHours,
    vacationDays,
    mealTicketsCount,
    grossTotal,
    netSalary,
    restDePlata,
    advancePayment,
    rawText: text,
  };
}
