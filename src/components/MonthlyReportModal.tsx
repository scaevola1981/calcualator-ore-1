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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      {/* CONTAINER MODAL */}
      <div className="bg-white dark:bg-[#0F1E2E] w-full max-w-4xl rounded-[32px] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden my-auto max-h-[95vh] flex flex-col animate-fade-in text-gray-900 dark:text-white">
        
        {/* HEADER MODAL (Hidden at print) */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between no-print shrink-0 bg-gray-50/50 dark:bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                Foaie Oficială de Pontaj Lunar
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {report.monthName} • {report.companyName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Buton CSV / Excel */}
            <button
              onClick={handleDownloadCSV}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 flex items-center gap-1.5 transition-all active:scale-95"
              title="Descarcă fișier CSV compatibil Excel"
            >
              <FileSpreadsheet size={16} />
              <span className="hidden sm:inline">Excel (CSV)</span>
            </button>

            {/* Buton Print / PDF */}
            <button
              onClick={handlePrint}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 active:scale-95"
              title="Tipărește sau Salvează ca PDF"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">Tipărește / Salvează PDF</span>
            </button>

            {/* Buton Share */}
            <button
              onClick={handleShare}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300"
              title="Distribuie sumarul"
            >
              <Share2 size={18} />
            </button>

            {/* Închide */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CORP DOCUMENT PREVIZUALIZABIL & PRINTABIL */}
        <div className="p-4 sm:p-8 overflow-y-auto print-report-content" id="printable-report" ref={printRef}>
          
          {/* ANTET OFICIAL FOAIE DE PREZENȚĂ */}
          <div className="border-b-2 border-gray-900 dark:border-white pb-4 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 block">
                  {report.companyName}
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">
                  Foaie Colectivă de Prezență și Pontaj
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                  Evidență lunară a timpului de lucru conform Legii nr. 53/2003 (Codul Muncii)
                </p>
              </div>

              <div className="text-left sm:text-right bg-gray-100 dark:bg-white/10 p-2.5 rounded-xl border border-gray-200 dark:border-white/10 shrink-0">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase block">
                  Luna de raportare
                </span>
                <span className="text-base font-black text-gray-900 dark:text-white uppercase">
                  {report.monthName}
                </span>
              </div>
            </div>

            {/* DATE SALARIAT (GRID) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-gray-200 dark:border-white/10 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Nume & Prenume:</span>
                <span className="font-bold text-gray-900 dark:text-white">{report.employeeName}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Marca Salariat:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{report.employeeId}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Departament:</span>
                <span className="font-bold text-gray-900 dark:text-white">{report.department}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Funcție:</span>
                <span className="font-bold text-gray-900 dark:text-white">{report.jobTitle}</span>
              </div>
            </div>
          </div>

          {/* CARDURI STATISTICI SUMAR LUNAR */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-6 no-print">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/50">
              <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 block">Ore Normale</span>
              <span className="text-xl font-black text-gray-900 dark:text-white">{report.totals.totalNormal}h</span>
              <span className="text-[10px] text-gray-500 block">din {report.standardHours}h normă</span>
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-900/50">
              <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 block">Ore Suplimentare</span>
              <span className="text-xl font-black text-gray-900 dark:text-white">{report.totals.totalOvertime}h</span>
              <span className="text-[10px] text-purple-500 font-medium block">pauză 30m scăzută</span>
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900/50">
              <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 block">Ore de Noapte</span>
              <span className="text-xl font-black text-gray-900 dark:text-white">{report.totals.totalNight}h</span>
              <span className="text-[10px] text-gray-500 block">spor 25%</span>
            </div>

            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-900/50">
              <span className="text-[10px] font-bold uppercase text-teal-600 dark:text-teal-400 block">Tichete Masă</span>
              <span className="text-xl font-black text-gray-900 dark:text-white">{report.totals.mealTickets}</span>
              <span className="text-[10px] text-gray-500 block">× 22 lei/zi</span>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900/50">
              <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">Zile Lucrate</span>
              <span className="text-xl font-black text-gray-900 dark:text-white">{report.totals.daysWorked} zile</span>
              <span className="text-[10px] text-gray-500 block">Total: {report.totals.totalHours}h</span>
            </div>

            {report.totals.totalCODays > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-950/40 rounded-2xl border border-green-200 dark:border-green-900/50">
                <span className="text-[10px] font-bold uppercase text-green-700 dark:text-green-300 block">Concediu Odihnă</span>
                <span className="text-xl font-black text-green-800 dark:text-green-200">{report.totals.totalCODays} zile</span>
                <span className="text-[10px] text-green-600 block">🏖️ {report.totals.totalCODays * 8}h normate</span>
              </div>
            )}

            {report.totals.totalCMDays > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/50">
                <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300 block">Concediu Medical</span>
                <span className="text-xl font-black text-amber-800 dark:text-amber-200">{report.totals.totalCMDays} zile</span>
                <span className="text-[10px] text-amber-600 block">🏥 indemnizație CM</span>
              </div>
            )}
          </div>

          {/* TABEL DETALIAT ZI DE ZI */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-white/10">
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
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-mono">
                {report.days.map(d => {
                  const isRowWeekend = d.isWeekend;
                  const isRowHoliday = d.isHoliday;
                  const hasWork = d.totalHours > 0;

                  return (
                    <tr
                      key={d.date}
                      className={`transition-colors ${
                        isRowHoliday
                          ? 'bg-amber-50/60 dark:bg-amber-950/20'
                          : isRowWeekend
                          ? 'bg-gray-50/50 dark:bg-white/[0.02]'
                          : hasWork
                          ? 'hover:bg-blue-50/30 dark:hover:bg-white/[0.04]'
                          : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {d.formattedDate}
                      </td>
                      <td className="py-2 px-2 font-sans font-medium text-gray-600 dark:text-gray-400">
                        {d.dayName.substring(0, 3)}
                      </td>
                      <td className="py-2 px-3 text-gray-800 dark:text-gray-200 font-medium whitespace-nowrap">
                        {d.timeRangeStr}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-blue-600 dark:text-blue-400">
                        {d.normalHours > 0 ? `${d.normalHours}h` : '-'}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-purple-600 dark:text-purple-400">
                        {d.overtimeHours > 0 ? `${d.overtimeHours}h` : '-'}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-indigo-600 dark:text-indigo-400">
                        {d.nightHours > 0 ? `${d.nightHours}h` : '-'}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-gray-900 dark:text-white">
                        {d.totalHours > 0 ? `${d.totalHours}h` : '-'}
                      </td>
                      <td className="py-2 px-2 text-center text-teal-600 dark:text-teal-400 font-bold">
                        {d.hasMealTicket ? '✓' : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-sans text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {d.statusLabel}
                      </td>
                    </tr>
                  );
                })}

                {/* RÂND TOTALURI DE JOS */}
                <tr className="bg-gray-100/90 dark:bg-white/10 font-bold border-t-2 border-gray-300 dark:border-white/20 text-gray-900 dark:text-white">
                  <td className="py-3 px-3 font-black uppercase" colSpan={3}>
                    TOTAL LUNAR EFECTIV
                  </td>
                  <td className="py-3 px-2 text-center font-black text-blue-600 dark:text-blue-400">
                    {report.totals.totalNormal}h
                  </td>
                  <td className="py-3 px-2 text-center font-black text-purple-600 dark:text-purple-400">
                    {report.totals.totalOvertime}h
                  </td>
                  <td className="py-3 px-2 text-center font-black text-indigo-600 dark:text-indigo-400">
                    {report.totals.totalNight}h
                  </td>
                  <td className="py-3 px-2 text-center font-black text-gray-900 dark:text-white">
                    {report.totals.totalHours}h
                  </td>
                  <td className="py-3 px-2 text-center font-black text-teal-600 dark:text-teal-400">
                    {report.totals.mealTickets}
                  </td>
                  <td className="py-3 px-3 text-right font-sans text-xs">
                    {report.totals.daysWorked} zile lucrate
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECȚIUNE DE SEMNĂTURI (Vizibilă la print și pe ecran) */}
          <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-200 dark:border-white/10 grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-12">
              <span className="text-gray-500 dark:text-gray-400 font-bold uppercase block">
                Întocmit / Semnătură Salariat:
              </span>
              <div className="border-t border-gray-400 dark:border-white/30 pt-1 font-bold">
                {report.employeeName}
              </div>
            </div>

            <div className="space-y-12 text-right">
              <span className="text-gray-500 dark:text-gray-400 font-bold uppercase block">
                Aprobat Șef Departament / Mentenanță:
              </span>
              <div className="border-t border-gray-400 dark:border-white/30 pt-1 font-bold">
                Semnătură & Ștampilă
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-[10px] text-gray-400 dark:text-gray-500 font-sans">
            Generat din aplicația TikTok Work • Valabil ca dovadă a timpului lucrat conform pontajului GPS și manual
          </div>
        </div>

        {/* FOOTER MODAL (Hidden at print) */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 no-print shrink-0">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            * Se aplică deducerea automată de 30 min pauză de masă exclusiv din orele suplimentare.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownloadCSV}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Download size={14} />
              <span>Descarcă Excel (CSV)</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Printer size={14} />
              <span>Tipărește / Salvează PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
