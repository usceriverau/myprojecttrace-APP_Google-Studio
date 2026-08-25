import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../context/ProjectContext';
import { formatCurrency } from '../../lib/utils';
import { 
  Building, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Receipt, 
  CreditCard, 
  Smile, 
  Meh, 
  Frown, 
  PieChart, 
  Activity, 
  BarChart3, 
  FileSpreadsheet, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Camera,
  Film,
  Plus
} from 'lucide-react';

interface FinancialsReportsViewProps {
  onCaptureReceipt: () => void;
  onCapturePayment: () => void;
  onSelectProject: (projectId: string) => void;
}

export const FinancialsReportsView: React.FC<FinancialsReportsViewProps> = ({
  onCaptureReceipt,
  onCapturePayment,
  onSelectProject,
}) => {
  const { projects, allProjectMetrics, exportCompanyCpaExcel } = useProjects();
  const [isExportingCpa, setIsExportingCpa] = useState(false);

  const handleExportCpa = async () => {
    try {
      setIsExportingCpa(true);
      await exportCompanyCpaExcel();
    } catch (err) {
      console.error('Failed exporting CPA excel:', err);
    } finally {
      setIsExportingCpa(false);
    }
  };

  // Company summary calculations
  const companySummary = React.useMemo(() => {
    let totalContractVal = 0;
    let totalCollectedVal = 0;
    let totalPurchasesVal = 0;
    let activeCount = 0;

    projects.forEach((p) => {
      const m = allProjectMetrics[p.projectId];
      if (m) {
        totalContractVal += m.totalContractValue || 0;
        totalCollectedVal += m.totalCollected || 0;
        totalPurchasesVal += m.totalPurchases || 0;
      }
      if (p.status === 'ACTIVE') activeCount++;
    });

    const netCashPosition = totalCollectedVal - totalPurchasesVal;
    return { totalContractVal, totalCollectedVal, totalPurchasesVal, netCashPosition, activeCount };
  }, [projects, allProjectMetrics]);

  const totalContract = companySummary.totalContractVal;
  const totalCollected = companySummary.totalCollectedVal;
  const totalPurchases = companySummary.totalPurchasesVal;
  const netCash = companySummary.netCashPosition;
  const isPositive = netCash >= 0;

  const collectedPct = totalContract > 0 ? Math.min(100, Math.round((totalCollected / totalContract) * 100)) : 0;
  const purchasesPct = totalContract > 0 ? Math.min(100, Math.round((totalPurchases / totalContract) * 100)) : 0;
  const arPct = Math.max(0, 100 - collectedPct);

  // Risk metrics
  const totalProjectsCount = projects.length || 1;
  const healthyCount = projects.filter(p => !allProjectMetrics[p.projectId]?.highestAlertSeverity).length;
  const warningCount = projects.filter(p => allProjectMetrics[p.projectId]?.highestAlertSeverity === 'WARNING').length;
  const criticalCount = projects.filter(p => allProjectMetrics[p.projectId]?.highestAlertSeverity === 'CRITICAL').length;

  const healthyPct = ((healthyCount / totalProjectsCount) * 100).toFixed(1);
  const warningPct = ((warningCount / totalProjectsCount) * 100).toFixed(1);
  const criticalPct = ((criticalCount / totalProjectsCount) * 100).toFixed(1);

  // Speedometer Needle Angles (-90 to +90 deg)
  const cashBufferRatio = totalCollected > 0 ? Math.min(100, Math.max(0, Math.round(((totalCollected - totalPurchases) / totalCollected) * 100))) : 0;
  const gaugeAngle1 = (collectedPct / 100) * 180 - 90;
  const gaugeAngle2 = (cashBufferRatio / 100) * 180 - 90;

  const rad1 = (gaugeAngle1 * Math.PI) / 180;
  const needleX1 = 50 + 32 * Math.sin(rad1);
  const needleY1 = 50 - 32 * Math.cos(rad1);

  const rad2 = (gaugeAngle2 * Math.PI) / 180;
  const needleX2 = 50 + 32 * Math.sin(rad2);
  const needleY2 = 50 - 32 * Math.cos(rad2);

  const donutCircumference = 226;
  const strokeDashoffset = donutCircumference - (donutCircumference * collectedPct) / 100;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#054AC6] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200/60">
                Financial Slide Dashboard
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Portfolio Sync
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2 mt-1">
              <Building className="w-5 h-5 text-[#054AC6]" />
              Executive Financials & Health Sentinel
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Real-time cash positions, active collection pace, and project risk indicators across {companySummary.activeCount} active jobs.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="export-cpa-excel-main-btn"
              onClick={handleExportCpa}
              disabled={isExportingCpa}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isExportingCpa ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              )}
              <span>Accountant Excel Export</span>
            </button>
          </div>
        </div>

        {/* ROW 1: Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
          {/* 1.1 Scope */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider">
                Portfolio Scope
              </span>
              <span className="text-[10px] bg-blue-50 text-[#054AC6] font-bold px-2 py-0.5 rounded-md border border-blue-200/60">
                Active
              </span>
            </div>
            <div className="my-2">
              <span className="text-xs font-semibold text-slate-500 block truncate">
                Contractor Pipeline
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(totalContract)}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
              <span>Active Contracts</span>
              <span className="font-bold text-slate-800">{companySummary.activeCount} Projects</span>
            </div>
          </div>

          {/* 1.2 Total Collected */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider block truncate">
                Total Collected
              </span>
              <div className="text-xs text-slate-500 mt-1 font-medium">
                <span>Contract: </span>
                <span className="text-slate-800 font-bold">{formatCurrency(totalContract)}</span>
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-600 mt-0.5">
                {formatCurrency(totalCollected)}
              </div>
              <span className="text-[10px] text-slate-400">Total payments cleared</span>
            </div>

            <div className="border-2 border-emerald-500/40 bg-emerald-50 rounded-xl p-2.5 flex flex-col items-center justify-center min-w-[76px] shrink-0 shadow-xs">
              <ArrowUpRight className="w-4 h-4 text-emerald-600 mb-0.5" />
              <span className="text-base font-black text-emerald-700 tracking-tight">
                {collectedPct}%
              </span>
              <span className="text-[9px] uppercase font-bold text-emerald-700/80 text-center leading-none mt-0.5">
                Collected
              </span>
            </div>
          </div>

          {/* 1.3 Total Purchases */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider block truncate">
                Purchases Recorded
              </span>
              <div className="text-xs text-slate-500 mt-1 font-medium">
                <span>Cash buffer: </span>
                <span className={`font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(netCash)}
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                {formatCurrency(totalPurchases)}
              </div>
              <span className="text-[10px] text-slate-400">Materials, subs, receipts</span>
            </div>

            <div className={`border-2 rounded-xl p-2.5 flex flex-col items-center justify-center min-w-[76px] shrink-0 shadow-xs ${
              purchasesPct > 80 
                ? 'border-rose-300 bg-rose-50' 
                : 'border-blue-200 bg-blue-50'
            }`}>
              {purchasesPct > 80 ? (
                <ArrowDownRight className="w-4 h-4 text-rose-600 mb-0.5" />
              ) : (
                <Receipt className="w-4 h-4 text-[#054AC6] mb-0.5" />
              )}
              <span className={`text-base font-black tracking-tight ${purchasesPct > 80 ? 'text-rose-700' : 'text-[#054AC6]'}`}>
                {purchasesPct}%
              </span>
              <span className="text-[9px] uppercase font-bold text-slate-500 text-center leading-none mt-0.5">
                Spent Ratio
              </span>
            </div>
          </div>

          {/* 1.4 Project Health Sentinel */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider">
                Risk Sentinel
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">
                {projects.length} Total
              </span>
            </div>

            <div className="space-y-1.5">
              {/* Healthy */}
              <div className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-emerald-200/60 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Smile className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700">On Track / Healthy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-emerald-600">{healthyPct}%</span>
                  <span className="text-[10px] text-slate-400">({healthyCount})</span>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-amber-200/60 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Meh className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700">Near Margin / Watch</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-amber-600">{warningPct}%</span>
                  <span className="text-[10px] text-slate-400">({warningCount})</span>
                </div>
              </div>

              {/* Critical */}
              <div className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-rose-200/60 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Frown className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700">Critical / Deficit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-rose-600">{criticalPct}%</span>
                  <span className="text-[10px] text-slate-400">({criticalCount})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Gauges & Visuals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          {/* Donut */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider">
                Overall Collection Status
              </span>
              <PieChart className="w-3.5 h-3.5 text-[#054AC6]" />
            </div>

            <div className="flex items-center justify-center gap-4 my-2">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="transparent" stroke="#e2e8f0" strokeWidth="8" />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="transparent"
                    stroke="#10B981"
                    strokeWidth="8"
                    strokeDasharray={donutCircumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-black text-slate-900 leading-none">{collectedPct}%</span>
                  <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Paid</span>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-600 font-medium">Collected:</span>
                  <strong className="text-slate-800">{formatCurrency(totalCollected)}</strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="text-slate-600 font-medium">Remaining AR:</span>
                  <strong className="text-slate-800">{formatCurrency(Math.max(0, totalContract - totalCollected))}</strong>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 text-center pt-1.5 border-t border-slate-200/60">
              Contract completion cash collection velocity
            </div>
          </div>

          {/* Speedometer 1 */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider">
                Active Collection Pace Gauge
              </span>
              <Activity className="w-3.5 h-3.5 text-[#054AC6]" />
            </div>

            <div className="flex flex-col items-center justify-center my-1">
              <div className="relative w-36 h-20">
                <svg className="w-36 h-20 overflow-visible" viewBox="0 0 100 55">
                  <path d="M 12 50 A 38 38 0 0 1 88 50" fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
                  <path
                    d="M 12 50 A 38 38 0 0 1 88 50"
                    fill="none"
                    stroke="#054AC6"
                    strokeWidth="10"
                    strokeDasharray="120"
                    strokeDashoffset={120 - (120 * collectedPct) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                  <line x1="50" y1="50" x2={needleX1} y2={needleY1} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" className="transition-all duration-700" />
                  <circle cx="50" cy="50" r="4" fill="#054AC6" stroke="#ffffff" strokeWidth="2" />
                  <text x="8" y="54" fill="#94a3b8" fontSize="7" fontWeight="bold">0%</text>
                  <text x="86" y="54" fill="#94a3b8" fontSize="7" fontWeight="bold">100%</text>
                </svg>
              </div>

              <div className="text-center mt-1">
                <span className="text-xl font-black text-slate-900 tracking-tight">{collectedPct}%</span>
                <span className="text-[10px] text-slate-500 font-bold block">Portfolio Cash Conversion</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 text-center pt-1.5 border-t border-slate-200/60">
              Percentage of contract amounts converted to cash
            </div>
          </div>

          {/* Speedometer 2 */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider">
                Cash Buffer Margin Index
              </span>
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
            </div>

            <div className="flex flex-col items-center justify-center my-1">
              <div className="relative w-36 h-20">
                <svg className="w-36 h-20 overflow-visible" viewBox="0 0 100 55">
                  <path d="M 12 50 A 38 38 0 0 1 88 50" fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
                  <path
                    d="M 12 50 A 38 38 0 0 1 88 50"
                    fill="none"
                    stroke={isPositive ? '#10B981' : '#EF4444'}
                    strokeWidth="10"
                    strokeDasharray="120"
                    strokeDashoffset={120 - (120 * cashBufferRatio) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                  <line x1="50" y1="50" x2={needleX2} y2={needleY2} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" className="transition-all duration-700" />
                  <circle cx="50" cy="50" r="4" fill={isPositive ? '#10B981' : '#EF4444'} stroke="#ffffff" strokeWidth="2" />
                  <text x="8" y="54" fill="#94a3b8" fontSize="7" fontWeight="bold">0%</text>
                  <text x="86" y="54" fill="#94a3b8" fontSize="7" fontWeight="bold">100%</text>
                </svg>
              </div>

              <div className="text-center mt-1">
                <span className={`text-xl font-black tracking-tight ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {cashBufferRatio}%
                </span>
                <span className="text-[10px] text-slate-500 font-bold block">
                  {isPositive ? 'Healthy Cash Retention' : 'Deficit Risk Alert'}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 text-center pt-1.5 border-t border-slate-200/60">
              Net cash liquidity retained after recorded material expenses
            </div>
          </div>
        </div>

        {/* ROW 3: Stacked Bar Capital Distribution */}
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 mt-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[11px] font-bold text-[#363e69] font-['Verdana'] uppercase tracking-wider block">
                Project Capital Distribution
              </span>
              <p className="text-[11px] text-slate-500">
                Proportion of collections, expenses, and pending accounts receivable by job
              </p>
            </div>
            <BarChart3 className="w-4 h-4 text-[#054AC6]" />
          </div>

          <div className="space-y-3">
            {projects.map((p) => {
              const m = allProjectMetrics[p.projectId] || { totalContractValue: 1, totalCollected: 0, totalPurchases: 0 };
              const colH = m.totalContractValue > 0 ? Math.min(100, Math.round((m.totalCollected / m.totalContractValue) * 100)) : 0;
              const purH = m.totalContractValue > 0 ? Math.min(100, Math.round((m.totalPurchases / m.totalContractValue) * 100)) : 0;
              const isNeg = (m.totalCollected - m.totalPurchases) < 0;

              return (
                <div 
                  key={p.projectId} 
                  onClick={() => onSelectProject(p.projectId)}
                  className="bg-white p-3 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 group-hover:text-[#054AC6] transition-colors">
                        {p.projectName}
                      </span>
                      {isNeg && (
                        <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-black">
                          DEFICIT
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-slate-700">
                      {formatCurrency(m.totalContractValue)}
                    </span>
                  </div>

                  {/* Multi-segment progress bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div style={{ width: `${colH}%` }} className="bg-emerald-500 h-full" title={`Collected: ${colH}%`} />
                    <div style={{ width: `${purH}%` }} className="bg-amber-400 h-full" title={`Spent: ${purH}%`} />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-medium">
                    <span>Collected: <strong className="text-emerald-700">{formatCurrency(m.totalCollected)} ({colH}%)</strong></span>
                    <span>Spent: <strong className="text-amber-700">{formatCurrency(m.totalPurchases)} ({purH}%)</strong></span>
                    <span>Cash Flow: <strong className={isNeg ? 'text-rose-600 font-black' : 'text-slate-800'}>{formatCurrency(m.totalCollected - m.totalPurchases)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
