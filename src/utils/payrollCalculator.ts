export interface PayrollInputs {
  grossBaseSalary: number;     // Salariu brut de încadrare (default 7.180 RON)
  workingDaysInMonth: number;  // Zile lucrătoare în lună (default 21)
  normalHours: number;         // Ore regie / normale (default 152)
  nightHours: number;          // Ore noapte (22:00 - 06:00, spor 25%)
  overtimeHours: number;       // Ore suplimentare (plătite 200%)
  vacationDays: number;        // Concediu de odihnă (zile CO)
  weekendBonusPercent: number; // Spor weekend (default 1%)
  primaOS: number;             // Prima OS (default 0)
  mealTicketsCount: number;    // Număr tichete de masă (default 19)
  mealTicketValue: number;     // Valoare per tichet (default 22 RON)
  advancePayment: number;      // Avans salariu (default 1.500 RON)
}

export interface PayrollBreakdown {
  hourlyRate: number;
  normalIncome: number;
  nightBonus: number;
  overtimeIncome: number;
  vacationIncome: number;
  weekendBonus: number;
  primaOS: number;
  mealTicketsTotal: number;
  grossTotal: number;
  cass: number;          // 10%
  cas: number;           // 25% (fără tichete)
  taxableIncome: number;
  incomeTax: number;     // 10%
  netSalary: number;     // Banii net pe card (fără tichete)
  advancePayment: number;
  restDePlata: number;   // Lichidare pe card (Salariu Net - Avans)
}

export function calculatePayroll(inputs: PayrollInputs): PayrollBreakdown {
  const {
    grossBaseSalary,
    workingDaysInMonth,
    normalHours,
    nightHours,
    overtimeHours,
    vacationDays,
    weekendBonusPercent,
    primaOS,
    mealTicketsCount,
    mealTicketValue,
    advancePayment,
  } = inputs;

  const totalStandardHours = Math.max(1, workingDaysInMonth * 8);
  const hourlyRate = grossBaseSalary / totalStandardHours; // ~42.74 RON/h

  // 1. Drepturi Salariale (Brut)
  const normalIncome = Math.round(normalHours * hourlyRate);
  const nightBonus = Math.round(nightHours * hourlyRate * 0.25);
  const overtimeIncome = Math.round(overtimeHours * hourlyRate * 2.0);
  const vacationIncome = Math.round(vacationDays * (hourlyRate * 8));
  const weekendBonus = Math.round(grossBaseSalary * (weekendBonusPercent / 100));
  const mealTicketsTotal = Math.round(mealTicketsCount * mealTicketValue);

  const grossTotal =
    normalIncome +
    nightBonus +
    overtimeIncome +
    vacationIncome +
    weekendBonus +
    primaOS +
    mealTicketsTotal;

  // 2. Taxe & Impozite (Conform legislației RO & Fluturaș Avicarvil)
  const cass = Math.round(grossTotal * 0.10); // 10% Sănătate
  const casBase = Math.max(0, grossTotal - mealTicketsTotal); // Tichetele nu intră în baza CAS
  const cas = Math.round(casBase * 0.25); // 25% Pensii
  const taxableIncome = Math.max(0, grossTotal - cass - cas);
  const incomeTax = Math.round(taxableIncome * 0.10); // 10% Impozit pe Venit

  // 3. Salariu Net (Banii în mână / pe card)
  // Tichetele se scad din transferul bancar deoarece au fost virate pe cardul de tichete
  const netSalary = Math.max(0, grossTotal - cass - cas - incomeTax - mealTicketsTotal);

  // 4. Rest de Plată (Lichidare)
  const restDePlata = Math.max(0, netSalary - advancePayment);

  return {
    hourlyRate: Number(hourlyRate.toFixed(2)),
    normalIncome,
    nightBonus,
    overtimeIncome,
    vacationIncome,
    weekendBonus,
    primaOS,
    mealTicketsTotal,
    grossTotal,
    cass,
    cas,
    taxableIncome,
    incomeTax,
    netSalary,
    advancePayment,
    restDePlata,
  };
}
