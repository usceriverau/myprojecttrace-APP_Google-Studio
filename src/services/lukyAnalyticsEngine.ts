/**
 * Luky Analytics Engine - Pure Single-Source-of-Truth Financial Intelligence
 * 
 * Rules:
 * 1. Annual activity determined strictly by transaction date:
 *    - Purchases belong to the year of `purchaseDate`
 *    - Payments belong to the year of `paymentDate`
 *    - NEVER classify transactions based only on project `startDate`.
 * 2. Payments must be 'RECEIVED' or 'CLEARED' (never 'PENDING' or 'CANCELLED').
 * 3. Purchases must be 'CONFIRMED' and each transaction authority total counted ONCE.
 * 4. Metric 'Net Recorded Cash Movement' = Valid Payments Received in Year - Purchases in Year.
 * 5. Project metrics: Total Contract Value, Total Spend, Total Collected, Accounts Receivable,
 *    Gross Profit, Gross Profit %, Cash Gross Profit.
 */

import { 
  Project, 
  Purchase, 
  Payment, 
  FinancialAlert, 
  Company, 
  AnnualFinancialSummary, 
  AnnualMonthlyBreakdown, 
  AnnualProjectSummary, 
  AnnualProviderSummary,
  ProjectFinancialMetrics
} from '../types';
import { 
  calculateTotalContractValue, 
  calculateTotalPurchases, 
  calculateTotalCollected, 
  calculateAccountsReceivable, 
  calculateCashPosition, 
  calculateGrossProjectPosition, 
  calculateGrossMarginEstimate, 
  calculateProjectMetrics 
} from './financialFormulas';

export interface CompanyFinancialOverview {
  company: Company;
  totalContractScope: number;
  totalPaymentsCollected: number;
  totalMaterialPurchases: number;
  totalAccountsReceivable: number;
  netCashPosition: number;
  overallGrossMarginPct: number;
  activeProjectsCount: number;
  completedProjectsCount: number;
  openAlertsCount: number;
  criticalAlertsCount: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Calculates the exact Annual Financial Summary for any requested year strictly based on transaction dates.
 */
export function calculateAnnualFinancialSummary(
  year: number,
  projects: Project[],
  purchases: Purchase[],
  payments: Payment[]
): AnnualFinancialSummary {
  const yearStr = String(year);

  // 1. Filter valid purchases by purchaseDate year
  const validPurchasesInYear = purchases.filter((p) => {
    if (p.captureStatus !== 'CONFIRMED') return false;
    if (!p.purchaseDate) return false;
    return p.purchaseDate.startsWith(yearStr);
  });

  // 2. Filter valid payments by paymentDate year
  const validPaymentsInYear = payments.filter((p) => {
    if (p.status !== 'RECEIVED' && p.status !== 'CLEARED') return false;
    if (!p.paymentDate) return false;
    return p.paymentDate.startsWith(yearStr);
  });

  // 3. Totals for the selected year
  const totalValidPaymentsReceived = validPaymentsInYear.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalRecordedPurchases = validPurchasesInYear.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const netRecordedCashMovement = totalValidPaymentsReceived - totalRecordedPurchases;

  // 4. Monthly breakdown (Jan - Dec)
  const monthlyBreakdown: AnnualMonthlyBreakdown[] = MONTH_NAMES.map((month, idx) => {
    const monthPrefix = `${yearStr}-${String(idx + 1).padStart(2, '0')}`;
    const monthPayments = validPaymentsInYear
      .filter(p => p.paymentDate.startsWith(monthPrefix))
      .reduce((sum, p) => sum + p.amount, 0);
    const monthPurchases = validPurchasesInYear
      .filter(p => p.purchaseDate.startsWith(monthPrefix))
      .reduce((sum, p) => sum + p.totalAmount, 0);

    return {
      month,
      monthIndex: idx,
      payments: monthPayments,
      purchases: monthPurchases,
      netCashMovement: monthPayments - monthPurchases,
    };
  });

  // 5. Active project IDs with financial activity during this year
  const projectActivityIds = new Set<string>();
  validPurchasesInYear.forEach(p => { if (p.projectId) projectActivityIds.add(p.projectId); });
  validPaymentsInYear.forEach(p => { if (p.projectId) projectActivityIds.add(p.projectId); });

  // 6. Annual project summaries
  const projectSummaries: AnnualProjectSummary[] = projects
    .filter(proj => projectActivityIds.has(proj.projectId) || (proj.startDate && proj.startDate.startsWith(yearStr)))
    .map(proj => {
      const projYearPurchases = validPurchasesInYear.filter(p => p.projectId === proj.projectId);
      const projYearPayments = validPaymentsInYear.filter(p => p.projectId === proj.projectId);

      const annualPurchases = projYearPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
      const annualPayments = projYearPayments.reduce((sum, p) => sum + p.amount, 0);
      const annualNetCash = annualPayments - annualPurchases;

      // Current Lifetime Totals (Single Source of Truth)
      const lifetimePurchases = purchases.filter(p => p.projectId === proj.projectId && p.captureStatus === 'CONFIRMED');
      const lifetimePayments = payments.filter(p => p.projectId === proj.projectId && (p.status === 'RECEIVED' || p.status === 'CLEARED'));

      const contractTotal = calculateTotalContractValue(proj.contractValue, proj.approvedChangeOrders);
      const totalCollected = calculateTotalCollected(lifetimePayments);
      const totalSpend = calculateTotalPurchases(lifetimePurchases);
      const currentAR = calculateAccountsReceivable(contractTotal, totalCollected);
      const grossProfit = calculateGrossProjectPosition(contractTotal, totalSpend);
      const grossMarginPct = calculateGrossMarginEstimate(grossProfit, contractTotal) * 100;

      return {
        projectId: proj.projectId,
        projectName: proj.projectName,
        clientName: proj.clientName,
        status: proj.status,
        originalContractValue: proj.contractValue,
        approvedAdditions: proj.approvedChangeOrders,
        totalContractValue: contractTotal,
        paymentsReceivedInYear: annualPayments,
        purchasesInYear: annualPurchases,
        annualRecordedCashMovement: annualNetCash,
        currentTotalCollected: totalCollected,
        currentTotalSpend: totalSpend,
        currentAccountsReceivable: currentAR,
        currentGrossProfit: grossProfit,
        currentGrossMarginPct: Math.round(grossMarginPct * 10) / 10,
      };
    })
    .sort((a, b) => b.purchasesInYear - a.purchasesInYear);

  // 7. Provider summaries for this year
  const providerMap = new Map<string, { count: number; total: number; recentDate?: string }>();
  validPurchasesInYear.forEach(p => {
    const provName = p.providerName?.trim() || 'Unknown Provider';
    const curr = providerMap.get(provName) || { count: 0, total: 0 };
    curr.count += 1;
    curr.total += p.totalAmount;
    if (!curr.recentDate || p.purchaseDate > curr.recentDate) {
      curr.recentDate = p.purchaseDate;
    }
    providerMap.set(provName, curr);
  });

  const providerSummaries: AnnualProviderSummary[] = Array.from(providerMap.entries())
    .map(([name, data]) => ({
      providerName: name,
      purchasesCount: data.count,
      totalSpend: data.total,
      percentageOfAnnualSpend: totalRecordedPurchases > 0 ? Math.round((data.total / totalRecordedPurchases) * 1000) / 10 : 0,
      averagePurchase: data.count > 0 ? Math.round((data.total / data.count) * 100) / 100 : 0,
      mostRecentPurchaseDate: data.recentDate,
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend);

  // 8. Key Rankings & Insights
  const highestSpendingProject = projectSummaries.length > 0
    ? { projectId: projectSummaries[0].projectId, projectName: projectSummaries[0].projectName, amount: projectSummaries[0].purchasesInYear }
    : undefined;

  const validMarginProjects = projectSummaries.filter(p => p.totalContractValue > 0);
  const lowestMarginProject = validMarginProjects.length > 0
    ? [...validMarginProjects].sort((a, b) => a.currentGrossMarginPct - b.currentGrossMarginPct)[0]
    : undefined;

  const topProvider = providerSummaries.length > 0
    ? { name: providerSummaries[0].providerName, amount: providerSummaries[0].totalSpend, percentage: providerSummaries[0].percentageOfAnnualSpend }
    : undefined;

  // Current Total Accounts Receivable across all active projects
  const currentAccountsReceivable = projects.reduce((sum, proj) => {
    const projPayments = payments.filter(p => p.projectId === proj.projectId && (p.status === 'RECEIVED' || p.status === 'CLEARED'));
    const contractTotal = calculateTotalContractValue(proj.contractValue, proj.approvedChangeOrders);
    const collected = calculateTotalCollected(projPayments);
    return sum + calculateAccountsReceivable(contractTotal, collected);
  }, 0);

  const avgMargin = validMarginProjects.length > 0
    ? validMarginProjects.reduce((sum, p) => sum + p.currentGrossMarginPct, 0) / validMarginProjects.length
    : 0;

  return {
    year,
    totalValidPaymentsReceived,
    totalRecordedPurchases,
    netRecordedCashMovement,
    projectsWithActivityCount: projectSummaries.length,
    purchasesCount: validPurchasesInYear.length,
    paymentsCount: validPaymentsInYear.length,
    currentAccountsReceivable,
    averageProjectGrossMargin: Math.round(avgMargin * 10) / 10,
    highestSpendingProject,
    lowestMarginProject: lowestMarginProject ? { projectId: lowestMarginProject.projectId, projectName: lowestMarginProject.projectName, marginPct: lowestMarginProject.currentGrossMarginPct } : undefined,
    topProvider,
    monthlyBreakdown,
    projectSummaries,
    providerSummaries,
  };
}

/**
 * Calculates full company financial overview
 */
export function calculateCompanyFinancialOverview(
  company: Company,
  projects: Project[],
  purchases: Purchase[],
  payments: Payment[],
  alerts: FinancialAlert[]
): CompanyFinancialOverview {
  const confirmedPurchases = purchases.filter(p => p.captureStatus === 'CONFIRMED');
  const validPayments = payments.filter(p => p.status === 'RECEIVED' || p.status === 'CLEARED');

  const totalContractScope = projects.reduce((sum, p) => sum + calculateTotalContractValue(p.contractValue, p.approvedChangeOrders), 0);
  const totalPaymentsCollected = calculateTotalCollected(validPayments);
  const totalMaterialPurchases = calculateTotalPurchases(confirmedPurchases);
  const totalAccountsReceivable = Math.max(0, totalContractScope - totalPaymentsCollected);
  const netCashPosition = totalPaymentsCollected - totalMaterialPurchases;
  const overallGrossMarginPct = totalContractScope > 0 
    ? Math.round(((totalContractScope - totalMaterialPurchases) / totalContractScope) * 1000) / 10 
    : 0;

  const activeProjectsCount = projects.filter(p => p.status === 'ACTIVE').length;
  const completedProjectsCount = projects.filter(p => p.status === 'COMPLETED').length;
  const openAlerts = alerts.filter(a => a.status === 'OPEN');
  const criticalAlertsCount = openAlerts.filter(a => a.severity === 'CRITICAL').length;

  return {
    company,
    totalContractScope,
    totalPaymentsCollected,
    totalMaterialPurchases,
    totalAccountsReceivable,
    netCashPosition,
    overallGrossMarginPct,
    activeProjectsCount,
    completedProjectsCount,
    openAlertsCount: openAlerts.length,
    criticalAlertsCount,
  };
}

/**
 * Detects financial anomalies, exceptions, and risk items across all projects
 */
export interface DetectedRisk {
  projectId: string;
  projectName: string;
  severity: 'INFO' | 'WATCH' | 'WARNING' | 'CRITICAL';
  title: string;
  reason: string;
  metrics: {
    contractValue: number;
    purchases: number;
    collected: number;
    accountsReceivable: number;
    grossMarginPct: number;
  };
}

export function detectCompanyRisks(
  projects: Project[],
  purchases: Purchase[],
  payments: Payment[],
  alerts: FinancialAlert[]
): DetectedRisk[] {
  const risks: DetectedRisk[] = [];

  projects.forEach((proj) => {
    const projPurchases = purchases.filter(p => p.projectId === proj.projectId && p.captureStatus === 'CONFIRMED');
    const projPayments = payments.filter(p => p.projectId === proj.projectId && (p.status === 'RECEIVED' || p.status === 'CLEARED'));

    const contractTotal = calculateTotalContractValue(proj.contractValue, proj.approvedChangeOrders);
    const totalPurchases = calculateTotalPurchases(projPurchases);
    const totalCollected = calculateTotalCollected(projPayments);
    const ar = calculateAccountsReceivable(contractTotal, totalCollected);
    const cashPos = totalCollected - totalPurchases;
    const grossProfit = calculateGrossProjectPosition(contractTotal, totalPurchases);
    const grossMarginPct = calculateGrossMarginEstimate(grossProfit, contractTotal) * 100;
    const spendRatio = contractTotal > 0 ? (totalPurchases / contractTotal) * 100 : 0;
    const uncollectedRatio = contractTotal > 0 ? (ar / contractTotal) * 100 : 0;

    // 1. Critical: Purchases Exceed Contract or Negative Gross Margin
    if (contractTotal > 0 && totalPurchases > contractTotal) {
      risks.push({
        projectId: proj.projectId,
        projectName: proj.projectName,
        severity: 'CRITICAL',
        title: 'Spending Exceeds Total Contract',
        reason: `Recorded purchases ($${totalPurchases.toLocaleString()}) exceed contract value ($${contractTotal.toLocaleString()}) by $${(totalPurchases - contractTotal).toLocaleString()}. Margin is negative.`,
        metrics: { contractValue: contractTotal, purchases: totalPurchases, collected: totalCollected, accountsReceivable: ar, grossMarginPct: Math.round(grossMarginPct * 10) / 10 },
      });
      return;
    }

    // 2. Critical: Negative Cash Position (Out of Pocket)
    if (cashPos < -1000) {
      risks.push({
        projectId: proj.projectId,
        projectName: proj.projectName,
        severity: 'CRITICAL',
        title: 'Negative Project Cash Buffer',
        reason: `Purchases ($${totalPurchases.toLocaleString()}) exceed collections ($${totalCollected.toLocaleString()}) by $${Math.abs(cashPos).toLocaleString()}. Contractor is funding materials out of pocket.`,
        metrics: { contractValue: contractTotal, purchases: totalPurchases, collected: totalCollected, accountsReceivable: ar, grossMarginPct: Math.round(grossMarginPct * 10) / 10 },
      });
      return;
    }

    // 3. Warning: Low Gross Margin (< 18%)
    if (contractTotal > 0 && grossMarginPct < 18 && proj.status === 'ACTIVE') {
      risks.push({
        projectId: proj.projectId,
        projectName: proj.projectName,
        severity: 'WARNING',
        title: 'Low Estimated Gross Margin',
        reason: `Estimated gross margin is ${Math.round(grossMarginPct * 10) / 10}%. Recorded purchases represent ${Math.round(spendRatio * 10) / 10}% of the contract value.`,
        metrics: { contractValue: contractTotal, purchases: totalPurchases, collected: totalCollected, accountsReceivable: ar, grossMarginPct: Math.round(grossMarginPct * 10) / 10 },
      });
      return;
    }

    // 4. Watch: High Uncollected Accounts Receivable (> 40% uncollected with high spend)
    if (contractTotal > 10000 && uncollectedRatio >= 40 && spendRatio >= 50) {
      risks.push({
        projectId: proj.projectId,
        projectName: proj.projectName,
        severity: 'WATCH',
        title: 'High Outstanding Accounts Receivable',
        reason: `$${ar.toLocaleString()} (${Math.round(uncollectedRatio)}% of contract) remains uncollected while ${Math.round(spendRatio)}% of materials have been purchased.`,
        metrics: { contractValue: contractTotal, purchases: totalPurchases, collected: totalCollected, accountsReceivable: ar, grossMarginPct: Math.round(grossMarginPct * 10) / 10 },
      });
      return;
    }

    // 5. Watch: Open System Alerts
    const openProjAlerts = alerts.filter(a => a.projectId === proj.projectId && a.status === 'OPEN');
    if (openProjAlerts.length > 0) {
      const topAlert = openProjAlerts[0];
      risks.push({
        projectId: proj.projectId,
        projectName: proj.projectName,
        severity: topAlert.severity === 'CRITICAL' ? 'CRITICAL' : topAlert.severity === 'WARNING' ? 'WARNING' : 'WATCH',
        title: topAlert.title,
        reason: topAlert.message,
        metrics: { contractValue: contractTotal, purchases: totalPurchases, collected: totalCollected, accountsReceivable: ar, grossMarginPct: Math.round(grossMarginPct * 10) / 10 },
      });
    }
  });

  return risks.sort((a, b) => {
    const order = { CRITICAL: 4, WARNING: 3, WATCH: 2, INFO: 1 };
    return order[b.severity] - order[a.severity];
  });
}

/**
 * Searches purchases based on text filters (provider, amount, date, project)
 */
export function searchPurchases(
  query: string,
  purchases: Purchase[],
  projects: Project[]
): { matches: Purchase[]; summaryText: string; totalAmount: number } {
  const q = query.toLowerCase();
  const projectMap = new Map(projects.map(p => [p.projectId, p.projectName]));

  let filtered = purchases.filter(p => p.captureStatus === 'CONFIRMED');

  // Filter by provider if query mentions store names
  if (q.includes('home depot')) {
    filtered = filtered.filter(p => p.providerName?.toLowerCase().includes('home depot'));
  } else if (q.includes('lowes') || q.includes("lowe's")) {
    filtered = filtered.filter(p => p.providerName?.toLowerCase().includes('lowe'));
  } else if (q.includes('floor') || q.includes('decor')) {
    filtered = filtered.filter(p => p.providerName?.toLowerCase().includes('floor'));
  } else if (q.includes('ferguson')) {
    filtered = filtered.filter(p => p.providerName?.toLowerCase().includes('ferguson'));
  } else if (q.includes('sherwin')) {
    filtered = filtered.filter(p => p.providerName?.toLowerCase().includes('sherwin'));
  }

  // Filter by project name if query matches a project
  const matchedProject = projects.find(p => q.includes(p.projectName.toLowerCase()) || q.includes(p.clientName.toLowerCase()));
  if (matchedProject) {
    filtered = filtered.filter(p => p.projectId === matchedProject.projectId);
  }

  // Filter by amount if query specifies numbers (e.g. "$487" or "487")
  const amountMatch = q.match(/\$?\b(\d+(\.\d{1,2})?)\b/);
  if (amountMatch && !q.includes('202') && !q.includes('201')) {
    const targetAmt = parseFloat(amountMatch[1]);
    if (targetAmt > 10) {
      // Find approximate matches within +/- 15%
      const closeMatches = filtered.filter(p => Math.abs(p.totalAmount - targetAmt) <= targetAmt * 0.15 || Math.abs(p.totalAmount - targetAmt) <= 5);
      if (closeMatches.length > 0) {
        filtered = closeMatches;
      }
    }
  }

  const totalAmount = filtered.reduce((sum, p) => sum + p.totalAmount, 0);

  return {
    matches: filtered.slice(0, 15),
    summaryText: `Found ${filtered.length} matching purchase(s) totaling $${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
    totalAmount,
  };
}
