import React, { useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Share2,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import type { WorkSession, AppSettings } from '../types';
import {
  generateMonthlyReport,
  exportReportToCSV,
  MonthlyReportData
} from '../utils/reportExporter';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: WorkSession[];
  year: number;
  month: number;
  settings: AppSettings;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  sessions,
  year,
  month,
  settings,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const report: MonthlyReportData = generateMonthlyReport(sessions, year, month, settings);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    exportReportToCSV(report);
  };

  const handleShare = async () => {
    const summaryText = `📄 Foaie de Pontaj - ${report.monthName}
👤 Salariat: ${report.employeeName} (Marca ${report.employeeId})
🏢 Companie: ${report.companyName}
⏰ Total Ore: ${report.totals.totalHours}h (Normale: ${report.totals.totalNormal}h | Suplimentare: ${report.totals.totalOvertime}h | Noapte: ${report.totals.totalNight}h)
🎟️ Tichete de masă: ${report.totals.mealTickets}
📅 Zile lucrate: ${report.totals.daysWorked} din ${report.standardWorkingDays} zile lucrătoare.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pontaj ${report.monthName} - ${report.employeeName}`,
          text: summaryText,
        });
      } catch (err) {
        console.warn('Share cancelled or not supported:', err);
      }
    } else {
      navigator.clipboard?.writeText(summaryText);
      alert('Sumarul pontajului a fost copiat în clipboard! Îl poți lipi pe WhatsApp.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 overflow-y-auto modal-safe-inset">
      {/* CONTAINER MODAL */}
      <div className="nm-card !rounded-[32px] w-full max-w-4xl overflow-hidden my-auto max-h-[95vh] flex flex-col animate-fade-in text-[var(--nm-text)] border border-[var(--nm-border)] shadow-2xl">
        
        {/* HEADER MODAL (Hidden at print) */}
        <div className="px-6 py-4 border-b border-[var(--nm-border)] flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl nm-inset text-blue-500 flex items-center justify-center font-black shadow-inner">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-[var(--nm-text)]">
                Foaie Oficială de Pontaj Lunar
              </h3>
              <p className="text-xs text-[var(--nm-text-muted)] font-bold">
                {report.monthName} • {report.companyName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Buton CSV / Excel */}
            <button
              onClick={handleDownloadCSV}
              className="nm-btn !p-2 sm:!px-3 sm:!py-2 !rounded-xl text-emerald-500 text-xs font-black flex items-center gap-1.5 active:scale-95"
              title="Descarcă fișier CSV compatibil Excel"
            >
              <FileSpreadsheet size={16} />
              <span className="hidden sm:inline">Excel (CSV)</span>
            </button>

            {/* Buton Print / PDF */}
            <button
              onClick={handlePrint}
              className="nm-power-btn-start !p-2 sm:!px-3 sm:!py-2 !rounded-xl text-white text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95"
              title="Tipărește sau Salvează ca PDF"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">Tipărește / PDF</span>
            </button>

            {/* Buton Share */}
            <button
              onClick={handleShare}
              className="nm-btn-round !w-9 !h-9 text-[var(--nm-text)]"
              title="Distribuie sumarul"
            >
              <Share2 size={16} />
            </button>

            {/* Închide */}
            <button
              onClick={onClose}
              className="nm-btn-round !w-9 !h-9 text-[var(--nm-text-muted)] hover:text-[var(--nm-text)]"
              title="Închide"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* CORP DOCUMENT PREVIZUALIZABIL & PRINTABIL */}
        <div className="p-4 sm:p-8 overflow-y-auto print-report-content" id="printable-report" ref={printRef}>
          
          {/* ANTET OFICIAL FOAIE DE PREZENȚĂ */}
          <div className="border-b-2 border-gray-900 dark:border-white pb-4 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-blue-500 block">
                  {report.companyName}
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">
                  Foaie Colectivă de Prezență și Pontaj
                </h1>
                <p className="text-xs text-[var(--nm-text-muted)] font-bold mt-0.5">
                  Evidență lunară a timpului de lucru conform Legii nr. 53/2003 (Codul Muncii)
                </p>
              </div>

              <div className="text-left sm:text-right nm-inset-sm p-3 rounded-2xl shrink-0">
                <span className="text-[10px] text-[var(--nm-text-muted)] font-black uppercase block">
                  Luna de raportare
                </span>
                <span className="text-base font-black uppercase text-[var(--nm-text)]">
                  {report.monthName}
                </span>
              </div>
            </div>

            {/* DATE SALARIAT (GRID) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-[var(--nm-border)] text-xs">
              <div className="nm-inset-sm p-2.5">
                <span className="text-[10px] text-[var(--nm-text-muted)] uppercase font-bold block">Nume & Prenume:</span>
                <span className="font-black text-[var(--nm-text)]">{report.employeeName}</span>
              </div>
              <div className="nm-inset-sm p-2.5">
                <span className="text-[10px] text-[var(--nm-text-muted)] uppercase font-bold block">Marca Salariat:</span>
                <span className="font-mono font-black text-[var(--nm-text)]">{report.employeeId}</span>
              </div>
              <div className="nm-inset-sm p-2.5">
                <span className="text-[10px] text-[var(--nm-text-muted)] uppercase font-bold block">Departament:</span>
                <span className="font-black text-[var(--nm-text)]">{report.department}</span>
              </div>
              <div className="nm-inset-sm p-2.5">
                <span className="text-[10px] text-[var(--nm-text-muted)] uppercase font-bold block">Funcție:</span>
                <span className="font-black text-[var(--nm-text)]">{report.jobTitle}</span>
              </div>
            </div>
          </div>

          {/* CARDURI STATISTICI SUMAR LUNAR */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 mb-6 no-print">
            <div className="nm-inset-sm p-3">
              <span className="text-[10px] font-black uppercase text-blue-500 block">Ore Normale</span>
              <span className="text-xl font-black text-[var(--nm-text)]">{report.totals.totalNormal}h</span>
              <span className="text-[10px] text-[var(--nm-text-muted)] block">din {report.standardHours}h normă</span>
            </div>

            <div className="nm-inset-sm p-3">
              <span className="text-[10px] font-black uppercase text-purple-500 block">Ore Suplimentare</span>
              <span className="text-xl font-black text-purple-600 dark:text-purple-400">{report.totals.totalOvertime}h</span>
              <span className="text-[10px] text-[var(--nm-text-muted)] block">-30m pauză</span>
            </div>

            <div className="nm-inset-sm p-3">
              <span className="text-[10px] font-black uppercase text-indigo-500 block">Ore de Noapte</span>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{report.totals.totalNight}h</span>
              <span className="text-[10px] text-[var(--nm-text-muted)] block">spor 25%</span>
            </div>

            <div className="nm-inset-sm p-3">
              <span className="text-[10px] font-black uppercase text-teal-500 block">Tichete Masă</span>
              <span className="text-xl font-black text-teal-600 dark:text-teal-400">{report.totals.mealTickets}</span>
              <span className="text-[10px] text-[var(--nm-text-muted)] block">× {settings.mealTicketValue || 22} lei/zi</span>
            </div>

            <div className="nm-inset-sm p-3">
              <span className="text-[10px] font-black uppercase text-emerald-500 block">Zile Lucrate</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{report.totals.daysWorked} zile</span>
              <span className="text-[10px] text-[var(--nm-text-muted)] block">Total: {report.totals.totalHours}h</span>
            </div>

            {report.totals.totalCODays > 0 && (
              <div className="nm-inset-sm p-3">
                <span className="text-[10px] font-black uppercase text-green-500 block">Concediu Odihnă</span>
                <span className="text-xl font-black text-green-600 dark:text-green-400">{report.totals.totalCODays} zile</span>
                <span className="text-[10px] text-[var(--nm-text-muted)] block">🏖️ {report.totals.totalCODays * 8}h normate</span>
              </div>
            )}

            {report.totals.totalCMDays > 0 && (
              <div className="nm-inset-sm p-3">
                <span className="text-[10px] font-black uppercase text-amber-500 block">Concediu Medical</span>
                <span className="text-xl font-black text-amber-600 dark:text-amber-400">{report.totals.totalCMDays} zile</span>
                <span className="text-[10px] text-[var(--nm-text-muted)] block">🏥 indemnizație CM</span>
              </div>
            )}
          </div>

          {/* TABEL DETALIAT ZI DE ZI */}
          <div className="overflow-x-auto rounded-2xl border border-[var(--nm-border)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--nm-surface)] text-[var(--nm-text-muted)] font-black border-b border-[var(--nm-border)]">
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-2">Ziua</th>
                  <th className="py-2.5 px-3">Interval Pontaj</th>
                  <th className="py-2.5 px-2 text-center">Normale</th>
                  <th className="py-2.5 px-2 text-center">Suplim.</th>
                  <th className="py-2.5 px-2 text-center">Noapte</th>
                  <th className="py-2.5 px-2 text-center font-black">Total</th>
                  <th className="py-2.5 px-2 text-center">Bon</th>
                  <th className="py-2.5 px-3 text-right">Observații</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--nm-border)] font-mono">
                {report.days.map(d => {
                  const isRowWeekend = d.isWeekend;
                  const isRowHoliday = d.isHoliday;
                  const hasWork = d.totalHours > 0;

                  return (
                    <tr
                      key={d.date}
                      className={`transition-colors ${
                        isRowHoliday
                          ? 'bg-amber-500/10'
                          : isRowWeekend
                          ? 'opacity-80'
                          : hasWork
                          ? 'hover:bg-blue-500/5'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-[var(--nm-text)] whitespace-nowrap">
                        {d.formattedDate}
                      </td>
                      <td className="py-2.5 px-2 font-sans font-medium text-[var(--nm-text-muted)]">
                        {d.dayName.substring(0, 3)}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--nm-text)] font-medium whitespace-nowrap">
                        {d.timeRangeStr}
                      </td>
                      <td className="py-2.5 px-2 text-center font-black text-blue-500">
                        {d.normalHours > 0 ? `${d.normalHours}h` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-black text-purple-500">
                        {d.overtimeHours > 0 ? `${d.overtimeHours}h` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-black text-indigo-500">
                        {d.nightHours > 0 ? `${d.nightHours}h` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-black text-[var(--nm-text)]">
                        {d.totalHours > 0 ? `${d.totalHours}h` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center text-teal-500 font-black">
                        {d.hasMealTicket ? '✓' : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans text-[11px] text-[var(--nm-text-muted)] whitespace-nowrap">
                        {d.statusLabel}
                      </td>
                    </tr>
                  );
                })}

                {/* RÂND TOTALURI DE JOS */}
                <tr className="bg-[var(--nm-surface)] font-bold border-t-2 border-[var(--nm-border)] text-[var(--nm-text)]">
                  <td className="py-3 px-3 font-black uppercase" colSpan={3}>
                    TOTAL LUNAR EFECTIV
                  </td>
                  <td className="py-3 px-2 text-center font-black text-blue-500">
                    {report.totals.totalNormal}h
                  </td>
                  <td className="py-3 px-2 text-center font-black text-purple-500">
                    {report.totals.totalOvertime}h
                  </td>
                  <td className="py-3 px-2 text-center font-black text-indigo-500">
                    {report.totals.totalNight}h
                  </td>
                  <td className="py-3 px-2 text-center font-black text-[var(--nm-text)]">
                    {report.totals.totalHours}h
                  </td>
                  <td className="py-3 px-2 text-center font-black text-teal-500">
                    {report.totals.mealTickets}
                  </td>
                  <td className="py-3 px-3 text-right font-sans text-xs text-[var(--nm-text-muted)]">
                    {report.totals.daysWorked} zile lucrate
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECȚIUNE DE SEMNĂTURI (Vizibilă la print și pe ecran) */}
          <div className="mt-8 pt-6 border-t-2 border-dashed border-[var(--nm-border)] grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-12">
              <span className="text-[var(--nm-text-muted)] font-black uppercase block">
                Întocmit / Semnătură Salariat:
              </span>
              <div className="border-t border-[var(--nm-border)] pt-1 font-black text-[var(--nm-text)]">
                {report.employeeName}
              </div>
            </div>

            <div className="space-y-12 text-right">
              <span className="text-[var(--nm-text-muted)] font-black uppercase block">
                Aprobat Șef Departament / Mentenanță:
              </span>
              <div className="border-t border-[var(--nm-border)] pt-1 font-black text-[var(--nm-text)]">
                Semnătură & Ștampilă
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-[10px] text-[var(--nm-text-muted)] font-sans">
            Generat din aplicația TikTok Work • Valabil ca dovadă a timpului lucrat conform pontajului GPS și manual
          </div>
        </div>

        {/* FOOTER MODAL (Hidden at print) */}
        <div className="px-6 py-4 border-t border-[var(--nm-border)] flex flex-col sm:flex-row justify-between items-center gap-3 no-print shrink-0">
          <div className="text-xs text-[var(--nm-text-muted)] font-bold">
            * Se aplică deducerea automată de 30 min pauză de masă exclusiv din orele suplimentare.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownloadCSV}
              className="flex-1 sm:flex-initial nm-btn !px-4 !py-2.5 !rounded-xl text-xs font-black flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Download size={14} />
              <span>Descarcă Excel (CSV)</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial nm-power-btn-start !px-5 !py-2.5 !rounded-xl text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Printer size={14} />
              <span>Tipărește / PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
