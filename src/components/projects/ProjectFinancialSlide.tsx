import React from 'react';
import { Project, ProjectFinancialMetrics } from '../../types';
import { formatCurrency, formatPercentage } from '../../lib/utils';
import { 
  Briefcase, 
  ArrowDownToLine, 
  ShoppingCart, 
  Hourglass, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  CreditCard, 
  Camera, 
  Sparkles,
  Info,
  ChevronRight,
  Receipt
} from 'lucide-react';

interface ProjectFinancialSlideProps {
  project: Project;
  metrics: ProjectFinancialMetrics;
  onRecordPayment?: () => void;
  onCaptureReceipt?: () => void;
  isDrawer?: boolean;
  onClose?: () => void;
}

export const ProjectFinancialSlide: React.FC<ProjectFinancialSlideProps> = ({
  project,
  metrics,
  onRecordPayment,
  onCaptureReceipt,
  isDrawer = false,
  onClose,
}) => {
  const isCashPositive = metrics.cashPosition >= 0;
  const grossMargin = metrics.grossMarginEstimate;
  const grossMarginPercent = Math.max(0, Math.min(100, Math.round(grossMargin * 1000) / 10));

  // Margin color rating: > 30% Green, 15-30% Amber, < 15% Red
  const marginColor = grossMargin >= 0.30
    ? '#10B981' // emerald-500
    : grossMargin >= 0.15
    ? '#F59E0B' // amber-500
    : '#EF4444'; // rose-500

  const marginTextColor = grossMargin >= 0.30
    ? 'text-emerald-600'
    : grossMargin >= 0.15
    ? 'text-amber-600'
    : 'text-rose-600';

  const marginBadgeBg = grossMargin >= 0.30
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : grossMargin >= 0.15
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-rose-50 text-rose-700 border-rose-200';

  const marginLabel = grossMargin >= 0.30
    ? 'Healthy Profit Margin'
    : grossMargin >= 0.15
    ? 'Moderate Margin (Watch Costs)'
    : 'Low Margin (Action Needed)';

  // Proportions for segmented bar based on Total Contract Value
  const contractVal = metrics.totalContractValue || 1;
  const collectedPct = Math.min(100, Math.max(0, (metrics.totalCollected / contractVal) * 100));
  const purchasesPct = Math.min(100, Math.max(0, (metrics.totalPurchases / contractVal) * 100));
  const arPct = Math.min(100, Math.max(0, (metrics.accountsReceivable / contractVal) * 100));

  // Circular Gauge Calculations (SVG stroke-dasharray)
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  // Map 0 - 100% to circumference
  const strokeDashoffset = circumference - (Math.min(100, grossMarginPercent) / 100) * circumference;

  return (
    <div className={`space-y-4 ${isDrawer ? 'p-5 sm:p-6' : ''}`}>
      
      {/* 1. The "Cash Cushion" Badge (Top Hero Metric) */}
      <div 
        id="project-cash-cushion-hero"
        className={`p-4 sm:p-5 rounded-3xl border transition-all duration-300 ${
          isCashPositive
            ? 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border-emerald-200 shadow-xs'
            : 'bg-gradient-to-br from-rose-50 via-red-50/60 to-white border-rose-300 shadow-md ring-2 ring-rose-500/20'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase text-slate-500 flex items-center gap-1.5">
                {isCashPositive ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                Cash Flow Status (Live)
              </span>
            </div>

            {/* Dynamic Pill Requirement */}
            <div className="pt-0.5">
              {isCashPositive ? (
                <div 
                  id="cash-cushion-positive-pill"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 font-extrabold text-sm sm:text-base shadow-2xs"
                >
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    +{formatCurrency(metrics.cashPosition)} Cash Cushion (Safe - Client Funded)
                  </span>
                </div>
              ) : (
                <div 
                  id="cash-cushion-negative-pill"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-950 font-extrabold text-sm sm:text-base shadow-sm ring-1 ring-rose-500/30"
                >
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  <span>
                    -{formatCurrency(Math.abs(metrics.cashPosition))} Out of Pocket (Action Needed: Collect Advance)
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-600 font-medium pt-1">
              {isCashPositive ? (
                <span>Client advances exceed all confirmed job purchases by <strong>{formatCurrency(metrics.cashPosition)}</strong>. Your personal cash is protected.</span>
              ) : (
                <span className="text-rose-900 font-semibold">You have spent <strong>{formatCurrency(metrics.totalPurchases)}</strong> but only collected <strong>{formatCurrency(metrics.totalCollected)}</strong>. Request an advance to avoid funding this job out of pocket.</span>
              )}
            </p>
          </div>

          {/* Quick Action Button for fast contractor response */}
          <div className="shrink-0 flex items-center gap-2 pt-1 sm:pt-0">
            {onRecordPayment && (
              <button
                id="slide-collect-advance-btn"
                onClick={onRecordPayment}
                className={`text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer min-h-[42px] ${
                  isCashPositive
                    ? 'bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-300'
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>{isCashPositive ? 'Log Payment' : '⚡ Collect Advance Now'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Visual Panel: Circular Margin Speedometer + Segmented Contract Flow */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Radial Margin Speedometer Gauge (Left 5 Cols) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background track circle */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-slate-200"
                  strokeWidth="9"
                  fill="transparent"
                />
                {/* Value Progress Arc */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke={marginColor}
                  strokeWidth="9"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Gauge Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                <span className={`text-2xl sm:text-3xl font-black tracking-tight ${marginTextColor}`}>
                  {grossMarginPercent}%
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                  Gross Margin
                </span>
              </div>
            </div>

            {/* Margin Micro-Label & Tag */}
            <div className="mt-3 text-center space-y-1">
              <span className="text-xs font-bold text-slate-700 block">
                Est. Project Gross Margin
              </span>
              <span className={`inline-block text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${marginBadgeBg}`}>
                {marginLabel}
              </span>
              <p className="text-[11px] text-slate-500 pt-0.5">
                Gross Position: <strong>{formatCurrency(metrics.grossProjectPosition)}</strong>
              </p>
            </div>
          </div>

          {/* Segmented Contract Flow Progress Bar (Right 7 Cols) */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#054AC6]" />
                  <span>Contract Financial Flow</span>
                </h4>
                <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  Total: {formatCurrency(metrics.totalContractValue)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-segmented real-time breakdown of contract revenue vs expenses.
              </p>
            </div>

            {/* The Multi-Segmented Bar */}
            <div className="space-y-2">
              <div 
                id="segmented-contract-flow-bar"
                className="w-full h-6 bg-slate-100 rounded-xl overflow-hidden flex shadow-inner border border-slate-200/80 p-0.5"
              >
                {/* Segment 1: Collected Revenue (Solid Emerald Green) */}
                <div
                  style={{ width: `${collectedPct}%` }}
                  title={`Collected Revenue: ${formatCurrency(metrics.totalCollected)} (${Math.round(collectedPct)}%)`}
                  className="h-full bg-emerald-500 rounded-l-lg transition-all duration-500 relative group cursor-pointer"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Segment 2: Material Purchases (Electric Blue) */}
                <div
                  style={{ width: `${purchasesPct}%` }}
                  title={`Material Purchases: ${formatCurrency(metrics.totalPurchases)} (${Math.round(purchasesPct)}%)`}
                  className="h-full bg-[#054AC6] transition-all duration-500 relative group cursor-pointer"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Segment 3: Remaining to Collect / Accounts Receivable (Subtle Striped Slate) */}
                <div
                  style={{ width: `${arPct}%` }}
                  title={`Remaining to Collect (A/R): ${formatCurrency(metrics.accountsReceivable)} (${Math.round(arPct)}%)`}
                  className="h-full bg-slate-300 rounded-r-lg transition-all duration-500 relative group cursor-pointer overflow-hidden"
                >
                  {/* Subtle stripe texture */}
                  <div 
                    className="absolute inset-0 opacity-40" 
                    style={{
                      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.15) 6px, rgba(0,0,0,0.15) 12px)'
                    }}
                  />
                </div>
              </div>

              {/* Segmented Bar Legend with exact numbers & percentages */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                {/* Legend 1: Collected Revenue */}
                <div className="flex items-start gap-2 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/60">
                  <div className="w-3.5 h-3.5 rounded-md bg-emerald-500 shrink-0 mt-0.5 shadow-2xs" />
                  <div className="min-w-0">
                    <span className="text-[11px] font-extrabold text-emerald-900 block truncate">
                      Collected ({Math.round(collectedPct)}%)
                    </span>
                    <span className="font-black text-emerald-950 text-xs">
                      {formatCurrency(metrics.totalCollected)}
                    </span>
                  </div>
                </div>

                {/* Legend 2: Material Purchases */}
                <div className="flex items-start gap-2 bg-blue-50/70 p-2.5 rounded-xl border border-blue-200/60">
                  <div className="w-3.5 h-3.5 rounded-md bg-[#054AC6] shrink-0 mt-0.5 shadow-2xs" />
                  <div className="min-w-0">
                    <span className="text-[11px] font-extrabold text-blue-900 block truncate">
                      Purchases ({Math.round(purchasesPct)}%)
                    </span>
                    <span className="font-black text-blue-950 text-xs">
                      {formatCurrency(metrics.totalPurchases)}
                    </span>
                  </div>
                </div>

                {/* Legend 3: Remaining A/R */}
                <div className="flex items-start gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                  <div className="w-3.5 h-3.5 rounded-md bg-slate-400 shrink-0 mt-0.5 shadow-2xs" />
                  <div className="min-w-0">
                    <span className="text-[11px] font-extrabold text-slate-700 block truncate">
                      Remaining ({Math.round(arPct)}%)
                    </span>
                    <span className="font-black text-slate-900 text-xs">
                      {formatCurrency(metrics.accountsReceivable)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 3. Compact 2x2 Metric Tiles with Icons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Tile 1: 💼 Total Contract */}
        <div 
          id="metric-tile-contract"
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-[#054AC6]/40 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Contract
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#054AC6] flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalContractValue)}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              {metrics.approvedChangeOrders > 0 ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                  +{formatCurrency(metrics.approvedChangeOrders)} COs
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">
                  Base contract
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tile 2: 📥 Collected */}
        <div 
          id="metric-tile-collected"
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Collected
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
              {formatCurrency(metrics.totalCollected)}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                {Math.round(collectedPct)}% of contract
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                ({metrics.paymentsCount} payments)
              </span>
            </div>
          </div>
        </div>

        {/* Tile 3: 🛒 Purchases */}
        <div 
          id="metric-tile-purchases"
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Purchases
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalPurchases)}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                <Receipt className="w-3 h-3" />
                {metrics.confirmedPurchasesCount} receipts
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {Math.round(purchasesPct)}% spent
              </span>
            </div>
          </div>
        </div>

        {/* Tile 4: ⏳ Uncollected (A/R) */}
        <div 
          id="metric-tile-uncollected"
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Uncollected (A/R)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Hourglass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">
              {formatCurrency(metrics.accountsReceivable)}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                {Math.round(arPct)}% balance left
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Quick Field Remediation Controls (Scan Receipt + Log Payment) */}
      <div className="flex items-center gap-3 pt-1">
        {onCaptureReceipt && (
          <button
            id="slide-scan-receipt-btn"
            onClick={onCaptureReceipt}
            className="flex-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 p-3 rounded-2xl font-extrabold text-xs sm:text-sm text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs min-h-[44px]"
          >
            <Camera className="w-4 h-4 text-[#054AC6]" />
            <span>Scan Material Receipt</span>
          </button>
        )}

        {onRecordPayment && (
          <button
            id="slide-record-payment-btn"
            onClick={onRecordPayment}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs min-h-[44px]"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Client Payment</span>
          </button>
        )}
      </div>

    </div>
  );
};
