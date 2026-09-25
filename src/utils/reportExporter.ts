import type { WorkSession, AppSettings } from '../types';
import { calculateDurationWithBreak, calculateNightHours } from './timeRounding';
import { getLocalISODate } from './dateUtils';

export interface MonthlyReportDay {
  date: string;          // YYYY-MM-DD
  dayNumber: number;     // 1 - 31
  dayName: string;       // Luni, Marți, etc.
  formattedDate: string; // 01.09.2026
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  timeRangeStr: string;  // ex: "07:00 - 17:30" sau "-"
  normalHours: number;   // max 8h
  overtimeHours: number; // cu pauza de 0.5h scăzută
  nightHours: number;    // 22:00 - 06:00
  totalHours: number;    // normal + overtime
  hasMealTicket: boolean;
  statusLabel: string;   // "Lucrat", "Weekend", "Sărbătoare Legală", "Liber"
}

export interface MonthlyReportData {
  year: number;
  month: number; // 0-indexed
  monthName: string;
  employeeName: string;
  employeeId: string;
  companyName: string;
  department: string;
  jobTitle: string;
  standardWorkingDays: number;
  standardHours: number;
  days: MonthlyReportDay[];
  totals: {
    totalNormal: number;
    totalOvertime: number;
    totalNight: number;
    totalHours: number;
    daysWorked: number;
    mealTickets: number;
    totalCODays: number;
    totalCMDays: number;
    totalRecuperareDays: number;
  };
}

const HOLIDAY_NAMES: Record<string, string> = {
  "01-01": "Anul Nou",
  "01-02": "Anul Nou",
  "01-06": "Boboteaza",
  "01-07": "Sf. Ioan Botezătorul",
  "01-24": "Ziua Unirii Principatelor",
  "05-01": "Ziua Muncii",
  "06-01": "Ziua Copilului",
  "08-15": "Adormirea Maicii Domnului",
  "11-30": "Sfântul Andrei",
  "12-01": "Ziua Națională",
  "12-25": "Crăciunul",
  "12-26": "A doua zi de Crăciun",
};

const DAY_NAMES = [
  "Duminică",
  "Luni",
  "Marți",
  "Miercuri",
  "Joi",
  "Vineri",
  "Sâmbătă",
];

const MONTH_NAMES_RO = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
];

export function generateMonthlyReport(
  sessions: WorkSession[],
  year: number,
  month: number, // 0 - 11
  settings: AppSettings
): MonthlyReportData {
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  const totalDays = endOfMonth.getDate();

  // Grupăm sesiunile pe zile (YYYY-MM-DD)
  const sessionsByDay: Record<string, WorkSession[]> = {};
  sessions.forEach(s => {
    const sStart = new Date(s.startTime);
    if (sStart >= startOfMonth && sStart <= new Date(year, month + 1, 0, 23, 59, 59, 999)) {
      const dStr = getLocalISODate(sStart);
      if (!sessionsByDay[dStr]) sessionsByDay[dStr] = [];
      sessionsByDay[dStr].push(s);
    }
  });

  const days: MonthlyReportDay[] = [];
  let totalNormal = 0;
  let totalOvertime = 0;
  let totalNight = 0;
  let totalOverall = 0;
  let daysWorked = 0;
  let mealTickets = 0;
  let standardWorkingDaysCount = 0;
  let totalCODays = 0;
  let totalCMDays = 0;
  let totalRecuperareDays = 0;

  for (let d = 1; d <= totalDays; d++) {
    const curDate = new Date(year, month, d);
    const dateStr = getLocalISODate(curDate);
    const dayOfWeek = curDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = (settings.legalHolidays || []).includes(dateStr);
    const monthDayKey = `${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const holidayName = isHoliday ? (HOLIDAY_NAMES[monthDayKey] || "Sărbătoare Legală") : undefined;
    const specialDay = (settings.specialDays || []).find(sd => sd.date === dateStr);

    if (!isWeekend && !isHoliday) {
      standardWorkingDaysCount++;
    }

    const daySessions = sessionsByDay[dateStr] || [];
    let timeRangeStr = "-";
    let dayDuration = 0;
    let dayNightHours = 0;

    if (daySessions.length > 0) {
      // Sortăm crescător
      daySessions.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      const ranges = daySessions.map(s => {
        const sStart = new Date(s.startTime);
        const sEnd = new Date(s.endTime);
        const dur = calculateDurationWithBreak(sStart, sEnd);
        dayDuration += dur;
        dayNightHours += calculateNightHours(sStart, sEnd);

        const fTime = (dt: Date) => dt.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
        return `${fTime(sStart)}-${fTime(sEnd)}`;
      });
      timeRangeStr = ranges.join(', ');
    }

    let normH = 0;
    let ovtH = 0;
    let hasTicket = false;
    let status = "Liber";

    if (dayDuration > 0) {
      daysWorked++;
      if (isWeekend || isHoliday) {
        normH = 0;
        ovtH = dayDuration > 0.5 ? dayDuration - 0.5 : dayDuration;
      } else {
        const limit = settings.normalHoursLimit || 8;
        normH = Math.min(dayDuration, limit);
        const rawOvt = Math.max(0, dayDuration - limit);
        ovtH = rawOvt > 0 ? Math.max(0, rawOvt - 0.5) : 0;
      }
      hasTicket = !isWeekend && !isHoliday && dayDuration > 0;
      status = isWeekend ? "Lucrat Weekend" : isHoliday ? "Lucrat Sărbătoare" : "Lucrat";
    } else if (specialDay) {
      // Zile speciale marcate de salariat
      if (specialDay.type === 'CO') {
        status = "Concediu de Odihnă (CO)";
        timeRangeStr = "CONCEDIU ODIHNĂ (CO)";
        normH = 8;
        totalCODays++;
      } else if (specialDay.type === 'CM') {
        status = "Concediu Medical (CM)";
        timeRangeStr = "CONCEDIU MEDICAL (CM)";
        normH = 0;
        totalCMDays++;
      } else if (specialDay.type === 'RECUPERARE') {
        status = "Recuperare / Zi Liberă";
        timeRangeStr = "RECUPERARE";
        normH = 8;
        totalRecuperareDays++;
      } else if (specialDay.type === 'INVOIRE') {
        status = "Învoire";
        timeRangeStr = "ÎNVOIRE";
        normH = 0;
      }
      hasTicket = false; // Fără tichet de masă în concediu sau recuperare
    } else if (isHoliday) {
      status = holidayName || "Sărbătoare";
    } else if (isWeekend) {
      status = "Weekend";
    }

    const dayTotal = normH + ovtH;
    if (hasTicket) mealTickets++;

    totalNormal += normH;
    totalOvertime += ovtH;
    totalNight += dayNightHours;
    totalOverall += dayTotal;

    days.push({
      date: dateStr,
      dayNumber: d,
      dayName: DAY_NAMES[dayOfWeek],
      formattedDate: `${String(d).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`,
      isWeekend,
      isHoliday,
      holidayName,
      timeRangeStr,
      normalHours: Number(normH.toFixed(2)),
      overtimeHours: Number(ovtH.toFixed(2)),
      nightHours: Number(dayNightHours.toFixed(2)),
      totalHours: Number(dayTotal.toFixed(2)),
      hasMealTicket: hasTicket,
      statusLabel: status,
    });
  }

  return {
    year,
    month,
    monthName: `${MONTH_NAMES_RO[month]} ${year}`,
    employeeName: settings.userName || "Dorobanțu Nicolae-Florin",
    employeeId: settings.employeeId || "AFD1270",
    companyName: settings.companyName || "AVICARVIL FOOD & DISTRIBUTION",
    department: settings.department || "Întreținere și mentenanță",
    jobTitle: settings.jobTitle || "Lăcătuș mecanic",
    standardWorkingDays: standardWorkingDaysCount,
    standardHours: standardWorkingDaysCount * 8,
    days,
    totals: {
      totalNormal: Number(totalNormal.toFixed(2)),
      totalOvertime: Number(totalOvertime.toFixed(2)),
      totalNight: Number(totalNight.toFixed(2)),
      totalHours: Number(totalOverall.toFixed(2)),
      daysWorked,
      mealTickets,
      totalCODays,
      totalCMDays,
      totalRecuperareDays,
    }
  };
}

/**
 * Exportă raportul lunar ca fișier CSV cu suport nativ pentru Excel (UTF-8 BOM + delimitator ;)
 */
export function exportReportToCSV(report: MonthlyReportData): void {
  const lines: string[] = [];

  // Antet Companie & Salariat
  lines.push(`"FOAIE COLECTIVĂ DE PREZENȚĂ ȘI PONTAJ INDIVIDUAL"`);
  lines.push(`"Companie / Punct de lucru:";"${report.companyName}"`);
  lines.push(`"Perioadă:";"${report.monthName.toUpperCase()}"`);
  lines.push(`"Nume și Prenume:";"${report.employeeName}"`);
  lines.push(`"Marca Salariat:";"${report.employeeId}"`);
  lines.push(`"Departament:";"${report.department}"`);
  lines.push(`"Funcție:";"${report.jobTitle}"`);
  lines.push(`"Normă standard lună:";"${report.standardWorkingDays} zile lucrătoare (${report.standardHours} ore)"`);
  lines.push(`"Regulă pauză masă:";"30 minute deduse automat exclusiv din orele suplimentare"`);
  lines.push('');

  // Cap tabel
  lines.push([
    '"Data"',
    '"Ziua"',
    '"Interval Pontat"',
    '"Ore Normale (8h)"',
    '"Ore Suplimentare (cu pauza scazuta)"',
    '"Ore Noapte (25%)"',
    '"Total Ore Zi"',
    '"Tichet Masa"',
    '"Status / Observații"'
  ].join(';'));

  // Linii zile
  report.days.forEach(d => {
    lines.push([
      `"${d.formattedDate}"`,
      `"${d.dayName}"`,
      `"${d.timeRangeStr}"`,
      `"${d.normalHours > 0 ? d.normalHours.toFixed(2).replace('.', ',') : '-'}"`,
      `"${d.overtimeHours > 0 ? d.overtimeHours.toFixed(2).replace('.', ',') : '-'}"`,
      `"${d.nightHours > 0 ? d.nightHours.toFixed(2).replace('.', ',') : '-'}"`,
      `"${d.totalHours > 0 ? d.totalHours.toFixed(2).replace('.', ',') : '-'}"`,
      `"${d.hasMealTicket ? 'DA' : '-'}"`,
      `"${d.statusLabel}"`
    ].join(';'));
  });

  lines.push('');
  // Subtotaluri
  lines.push([
    '"TOTAL LUNAR"',
    '""',
    '""',
    `"${report.totals.totalNormal.toFixed(2).replace('.', ',')}"`,
    `"${report.totals.totalOvertime.toFixed(2).replace('.', ',')}"`,
    `"${report.totals.totalNight.toFixed(2).replace('.', ',')}"`,
    `"${report.totals.totalHours.toFixed(2).replace('.', ',')}"`,
    `"${report.totals.mealTickets} tichete"`,
    `"Zile lucrate: ${report.totals.daysWorked}"`
  ].join(';'));

  lines.push('');
  lines.push(`"Semnătură Salariat:";"________________________";"Aprobat Șef Departament:";"________________________"`);
  lines.push(`"Data Emiterii:";"${new Date().toLocaleDateString('ro-RO')}";"Generat automat din aplicatia:";"TikTok Work"`);

  // Creăm fișierul cu UTF-8 BOM (\uFEFF) pentru diacritice românești în Excel
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const cleanName = report.employeeName.replace(/\s+/g, '_');
  const monthNum = String(report.month + 1).padStart(2, '0');
  const filename = `Pontaj_${cleanName}_${report.year}_${monthNum}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
