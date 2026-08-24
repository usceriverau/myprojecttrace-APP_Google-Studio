/**
 * Pure Financial Formulas Engine for MyProjectTrace
 * 
 * Rules:
 * 1. Each purchase totalAmount is counted exactly ONCE regardless of how many receipt pages or items.
 * 2. Only RECEIVED or CLEARED payments count towards totalCollected.
 * 3. Terminology: 'Gross Project Position' and 'Gross Margin Estimate' - never represented as net accounting profit.
 */

import { Project, Purchase, Payment, ProjectFinancialMetrics, FinancialAlert } from '../types';

export function calculateTotalContractValue(contractValue: number, approvedChangeOrders: number): number {
  return (contractValue || 0) + (approvedChangeOrders || 0);
}

export function calculateTotalPurchases(purchases: Purchase[]): number {
  return purchases
    .filter(p => p.captureStatus === 'CONFIRMED')
    .reduce((sum, p) => sum + (p.totalAmount || 0), 0);
}

export function calculateTotalCollected(payments: Payment[]): number {
  return payments
    .filter(p => p.status === 'RECEIVED' || p.status === 'CLEARED')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
}

export function calculateAccountsReceivable(totalContractValue: number, totalCollected: number): number {
  return Math.max(0, totalContractValue - totalCollected);
}

export function calculateCashPosition(totalCollected: number, totalPurchases: number): number {
  return totalCollected - totalPurchases;
}

export function calculateGrossProjectPosition(totalContractValue: number, totalPurchases: number): number {
  return totalContractValue - totalPurchases;
}

export function calculateGrossMarginEstimate(grossProjectPosition: number, totalContractValue: number): number {
  if (!totalContractValue || totalContractValue <= 0) return 0;
  return grossProjectPosition / totalContractValue;
}

export function calculateProjectMetrics(
  project: Project,
  purchases: Purchase[],
  payments: Payment[],
  alerts: FinancialAlert[] = []
): ProjectFinancialMetrics {
  const projectPurchases = purchases.filter(p => p.projectId === project.projectId);
  const projectPayments = payments.filter(p => p.projectId === project.projectId);
  const projectAlerts = alerts.filter(a => a.projectId === project.projectId && a.status === 'OPEN');

  const totalContractVal = calculateTotalContractValue(project.contractValue, project.approvedChangeOrders);
  const totalPurchasesVal = calculateTotalPurchases(projectPurchases);
  const totalCollectedVal = calculateTotalCollected(projectPayments);
  const arVal = calculateAccountsReceivable(totalContractVal, totalCollectedVal);
  const cashPosVal = calculateCashPosition(totalCollectedVal, totalPurchasesVal);
  const grossPosVal = calculateGrossProjectPosition(totalContractVal, totalPurchasesVal);
  const grossMarginEstVal = calculateGrossMarginEstimate(grossPosVal, totalContractVal);

  let highestSeverity = null;
  if (projectAlerts.some(a => a.severity === 'CRITICAL')) {
    highestSeverity = 'CRITICAL' as const;
  } else if (projectAlerts.some(a => a.severity === 'WARNING')) {
    highestSeverity = 'WARNING' as const;
  } else if (projectAlerts.some(a => a.severity === 'INFO')) {
    highestSeverity = 'INFO' as const;
  }

  return {
    projectId: project.projectId,
    contractValue: project.contractValue,
    approvedChangeOrders: project.approvedChangeOrders,
    totalContractValue: totalContractVal,
    totalPurchases: totalPurchasesVal,
    totalCollected: totalCollectedVal,
    accountsReceivable: arVal,
    cashPosition: cashPosVal,
    grossProjectPosition: grossPosVal,
    grossMarginEstimate: grossMarginEstVal,
    confirmedPurchasesCount: projectPurchases.filter(p => p.captureStatus === 'CONFIRMED').length,
    paymentsCount: projectPayments.filter(p => p.status === 'RECEIVED' || p.status === 'CLEARED').length,
    openAlertsCount: projectAlerts.length,
    highestAlertSeverity: highestSeverity,
  };
}
