/**
 * Deterministic Financial Risk Engine for MyProjectTrace
 * 
 * Rules:
 * Rule 1: Purchases Rising Faster than Collections (totalPurchases > totalCollected) -> WARNING
 * Rule 2: Negative Cash Position (cashPosition < 0) -> CRITICAL
 * Rule 3: Low Gross Margin Estimate (grossMarginEstimate < minimumGrossMarginThreshold) -> WARNING
 * Rule 4: High Accounts Receivable (accountsReceivable > arWarningThreshold) -> INFO / WARNING
 * Rule 5: Large Purchase (single purchase > largePurchaseThreshold) -> INFO / WARNING
 * Rule 6: Unusual Spending Pattern (multiple purchases within short window or outlier spike) -> INFO / WARNING
 */

import { Project, Purchase, Payment, FinancialAlert, CompanySettings } from '../types';
import { calculateProjectMetrics } from './financialFormulas';
import { generateId, formatCurrency, formatPercentage } from '../lib/utils';

export function evaluateProjectFinancialRisk(
  project: Project,
  purchases: Purchase[],
  payments: Payment[],
  settings: CompanySettings
): FinancialAlert[] {
  const metrics = calculateProjectMetrics(project, purchases, payments);
  const alerts: FinancialAlert[] = [];
  const now = new Date().toISOString();

  // RULE 2 (CRITICAL): Negative Cash Position
  if (metrics.cashPosition < 0) {
    alerts.push({
      alertId: generateId('alert_neg_cash'),
      companyId: project.companyId,
      projectId: project.projectId,
      projectName: project.projectName,
      alertType: 'NEGATIVE_CASH_POSITION',
      severity: 'CRITICAL',
      title: 'Negative Cash Position',
      message: `Project cash position is ${formatCurrency(metrics.cashPosition)}. Recorded purchases (${formatCurrency(metrics.totalPurchases)}) exceed collected payments (${formatCurrency(metrics.totalCollected)}).`,
      whyItMatters: 'You are currently funding materials and expenses for this job out of company reserves or other projects.',
      recommendedAction: 'Collect an immediate progress payment before confirming additional material purchases.',
      detectedValue: metrics.cashPosition,
      threshold: 0,
      status: 'OPEN',
      createdAt: now,
    });
  } 
  // RULE 1 (WARNING): Purchases Rising Faster than Collections (and cash cushion thin)
  else if (metrics.totalPurchases > metrics.totalCollected * 0.9 && metrics.totalCollected > 0) {
    alerts.push({
      alertId: generateId('alert_spend_col'),
      companyId: project.companyId,
      projectId: project.projectId,
      projectName: project.projectName,
      alertType: 'SPENDING_EXCEEDS_COLLECTIONS',
      severity: 'WARNING',
      title: 'Thin Cash Cushion',
      message: `Purchases (${formatCurrency(metrics.totalPurchases)}) have reached ${formatPercentage(metrics.totalPurchases / metrics.totalCollected)} of collections (${formatCurrency(metrics.totalCollected)}). Cash cushion is only ${formatCurrency(metrics.cashPosition)}.`,
      whyItMatters: 'Upcoming supply orders could quickly flip this job into a negative cash position.',
      recommendedAction: 'Review remaining phase milestones and prepare next customer invoice.',
      detectedValue: metrics.totalPurchases,
      threshold: metrics.totalCollected,
      status: 'OPEN',
      createdAt: now,
    });
  }

  // RULE 3 (WARNING): Low Gross Margin Estimate
  const minMargin = settings.minimumGrossMarginThreshold ?? 0.20;
  if (metrics.totalPurchases > 0 && metrics.grossMarginEstimate < minMargin) {
    alerts.push({
      alertId: generateId('alert_low_margin'),
      companyId: project.companyId,
      projectId: project.projectId,
      projectName: project.projectName,
      alertType: 'LOW_GROSS_MARGIN',
      severity: 'WARNING',
      title: 'Low Gross Margin Estimate',
      message: `Estimated gross project position margin is ${formatPercentage(metrics.grossMarginEstimate)}, below your target of ${formatPercentage(minMargin)}. Gross project position is ${formatCurrency(metrics.grossProjectPosition)}.`,
      whyItMatters: 'Material cost overruns may be eroding the financial margin on this project before labor and overhead are factored in.',
      recommendedAction: 'Check for unbilled change orders or scope creep on material specifications.',
      detectedValue: metrics.grossMarginEstimate,
      threshold: minMargin,
      status: 'OPEN',
      createdAt: now,
    });
  }

  // RULE 4 (INFO/WARNING): High Accounts Receivable
  const arThreshold = settings.arWarningThreshold ?? 15000;
  if (metrics.accountsReceivable > arThreshold && metrics.totalPurchases > 5000) {
    alerts.push({
      alertId: generateId('alert_high_ar'),
      companyId: project.companyId,
      projectId: project.projectId,
      projectName: project.projectName,
      alertType: 'HIGH_ACCOUNTS_RECEIVABLE',
      severity: 'INFO',
      title: 'High Outstanding Balance',
      message: `Uncollected customer balance is ${formatCurrency(metrics.accountsReceivable)} on a total contract of ${formatCurrency(metrics.totalContractValue)}.`,
      whyItMatters: 'Substantial capital remains tied up in completed or in-progress work phases.',
      recommendedAction: 'Verify client billing schedule and follow up on pending disbursements.',
      detectedValue: metrics.accountsReceivable,
      threshold: arThreshold,
      status: 'OPEN',
      createdAt: now,
    });
  }

  // RULE 5: Large Purchase Check (evaluate confirmed project purchases)
  const largeThreshold = settings.largePurchaseThreshold ?? 1500;
  const projectPurchases = purchases.filter(p => p.projectId === project.projectId && p.captureStatus === 'CONFIRMED');
  const largePurchases = projectPurchases.filter(p => (p.totalAmount || 0) >= largeThreshold);
  if (largePurchases.length > 0) {
    const latestLarge = largePurchases[largePurchases.length - 1];
    alerts.push({
      alertId: generateId('alert_large_pur'),
      companyId: project.companyId,
      projectId: project.projectId,
      projectName: project.projectName,
      alertType: 'LARGE_PURCHASE',
      severity: 'INFO',
      title: 'Major Purchase Recorded',
      message: `Major purchase of ${formatCurrency(latestLarge.totalAmount)} recorded at ${latestLarge.providerName || 'Provider'} on ${latestLarge.purchaseDate}.`,
      whyItMatters: 'Single purchases exceeding your threshold significantly impact weekly cash flow.',
      recommendedAction: 'Ensure this purchase matches budgeted contract allowances or client selections.',
      detectedValue: latestLarge.totalAmount,
      threshold: largeThreshold,
      status: 'OPEN',
      createdAt: latestLarge.createdAt || now,
    });
  }

  return alerts;
}
