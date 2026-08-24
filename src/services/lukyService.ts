/**
 * Luky Client Service - Connects frontend to the Luky Assistant API
 * and provides smart local fallback when offline.
 */

import { 
  Project, 
  Purchase, 
  Payment, 
  FinancialAlert, 
  Company, 
  LukyMessage, 
  LukyExportOption,
  LukyProposedAction,
  LukyDataHighlight
} from '../types';
import { 
  calculateAnnualFinancialSummary, 
  calculateCompanyFinancialOverview, 
  detectCompanyRisks,
  searchPurchases 
} from './lukyAnalyticsEngine';
import { 
  calculateProjectMetrics,
  calculateTotalContractValue,
  calculateTotalPurchases,
  calculateTotalCollected,
  calculateAccountsReceivable,
  calculateGrossProjectPosition,
  calculateGrossMarginEstimate
} from './financialFormulas';

export interface LukyQueryContext {
  company: Company;
  projects: Project[];
  purchases: Purchase[];
  payments: Payment[];
  alerts: FinancialAlert[];
  activeProjectId?: string | null;
}

export interface LukyApiResponse {
  reply: string;
  dataHighlights?: LukyDataHighlight[];
  suggestedActions?: string[];
  exportOptions?: LukyExportOption[];
  proposedAction?: LukyProposedAction;
}

/**
 * Builds compact, authoritative financial context for the Luky API.
 */
export function buildLukyCompanyContext(context: LukyQueryContext) {
  const { company, projects, purchases, payments, alerts, activeProjectId } = context;

  const overview = calculateCompanyFinancialOverview(company, projects, purchases, payments, alerts);
  const currentYear = new Date().getFullYear();

  const annual2026 = calculateAnnualFinancialSummary(2026, projects, purchases, payments);
  const annual2025 = calculateAnnualFinancialSummary(2025, projects, purchases, payments);
  const annual2027 = calculateAnnualFinancialSummary(2027, projects, purchases, payments);

  const detectedRisks = detectCompanyRisks(projects, purchases, payments, alerts);

  const projectSummaries = projects.map((p) => {
    const metrics = calculateProjectMetrics(p, purchases, payments, alerts);
    return {
      projectId: p.projectId,
      projectName: p.projectName,
      clientName: p.clientName,
      status: p.status,
      startDate: p.startDate,
      originalContractValue: p.contractValue,
      approvedAdditions: p.approvedChangeOrders,
      totalContractValue: metrics.totalContractValue,
      totalSpend: metrics.totalPurchases,
      totalCollected: metrics.totalCollected,
      accountsReceivable: metrics.accountsReceivable,
      cashGrossProfit: metrics.cashPosition,
      grossProfit: metrics.grossProjectPosition,
      grossMarginEstimatePct: Math.round(metrics.grossMarginEstimate * 1000) / 10,
      confirmedPurchasesCount: metrics.confirmedPurchasesCount,
      paymentsCount: metrics.paymentsCount,
      openAlertsCount: metrics.openAlertsCount,
    };
  });

  const confirmedPurchases = purchases
    .filter((p) => p.captureStatus === 'CONFIRMED')
    .map((p) => ({
      purchaseId: p.purchaseId,
      projectId: p.projectId,
      providerName: p.providerName,
      purchaseDate: p.purchaseDate,
      totalAmount: p.totalAmount,
      subtotal: p.subtotal,
      tax: p.tax,
      receiptNumber: p.receiptNumber,
      paymentMethod: p.paymentMethod,
    }));

  const validPayments = payments
    .filter((p) => p.status === 'RECEIVED' || p.status === 'CLEARED')
    .map((p) => ({
      paymentId: p.paymentId,
      projectId: p.projectId,
      amount: p.amount,
      paymentDate: p.paymentDate,
      paymentType: p.paymentType,
      paymentMethod: p.paymentMethod,
      referenceNumber: p.referenceNumber,
      status: p.status,
    }));

  return {
    company: {
      companyName: company.companyName,
      tradeType: company.tradeType,
    },
    activeProjectId: activeProjectId || null,
    overview,
    annualSummaries: {
      '2025': annual2025,
      '2026': annual2026,
      '2027': annual2027,
    },
    detectedRisks: detectedRisks.slice(0, 10),
    projects: projectSummaries,
    purchases: confirmedPurchases.slice(0, 80),
    payments: validPayments.slice(0, 50),
    alerts: alerts.filter((a) => a.status === 'OPEN').slice(0, 10),
  };
}

/**
 * Executes a question or command with Luky.
 */
export async function askLuky(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  context: LukyQueryContext
): Promise<LukyApiResponse> {
  const companyContext = buildLukyCompanyContext(context);

  try {
    const res = await fetch('/api/luky', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: history.slice(-6),
        companyContext,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.data) {
        return data.data;
      }
    }
  } catch (err) {
    console.warn('[Luky Client] Server request failed, activating local analytics fallback:', err);
  }

  // Fallback: Local Deterministic Analytics Engine
  return generateLocalLukyResponse(message, context);
}

/**
 * Intelligent client-side fallback engine for Luky when offline.
 */
export function generateLocalLukyResponse(
  query: string,
  context: LukyQueryContext
): LukyApiResponse {
  const q = query.toLowerCase();
  const { projects, purchases, payments, alerts, company, activeProjectId } = context;

  // 1. Check if user is asking for Annual Financial Report (e.g. "2026 annual report" or "2026")
  const yearMatch = q.match(/\b(202\d)\b/);
  if (q.includes('annual') || q.includes('year') || (yearMatch && (q.includes('report') || q.includes('summary') || q.includes('spend') || q.includes('collect')))) {
    const targetYear = yearMatch ? parseInt(yearMatch[1], 10) : 2026;
    const annual = calculateAnnualFinancialSummary(targetYear, projects, purchases, payments);

    const reply = `### ${targetYear} Recorded Financial Summary

**Payments Received:** $${annual.totalValidPaymentsReceived.toLocaleString()}  
**Recorded Purchases:** $${annual.totalRecordedPurchases.toLocaleString()}  
**Net Recorded Cash Movement:** $${annual.netRecordedCashMovement.toLocaleString()}  
**Projects with Activity:** ${annual.projectsWithActivityCount}  
**Purchases Count:** ${annual.purchasesCount}  
**Payments Count:** ${annual.paymentsCount}  
**Current Accounts Receivable:** $${annual.currentAccountsReceivable.toLocaleString()}  

**Top Financial Indicators:**
- **Highest-Spending Project:** ${annual.highestSpendingProject ? `${annual.highestSpendingProject.projectName} ($${annual.highestSpendingProject.amount.toLocaleString()})` : 'N/A'}
- **Lowest Margin Project:** ${annual.lowestMarginProject ? `${annual.lowestMarginProject.projectName} (${annual.lowestMarginProject.marginPct}%)` : 'N/A'}
- **Top Provider by Spending:** ${annual.topProvider ? `${annual.topProvider.name} ($${annual.topProvider.amount.toLocaleString()} — ${annual.topProvider.percentage}% of annual spend)` : 'N/A'}

*Transaction Dating Rule:* Purchases belong to ${targetYear} by Purchase Date; Payments belong to ${targetYear} by Payment Date.`;

    return {
      reply,
      dataHighlights: [
        { label: 'Payments Received', value: `$${annual.totalValidPaymentsReceived.toLocaleString()}`, variant: 'success' },
        { label: 'Recorded Purchases', value: `$${annual.totalRecordedPurchases.toLocaleString()}`, variant: 'warning' },
        { label: 'Net Cash Movement', value: `$${annual.netRecordedCashMovement.toLocaleString()}`, variant: annual.netRecordedCashMovement >= 0 ? 'info' : 'danger' },
        { label: 'Current A/R', value: `$${annual.currentAccountsReceivable.toLocaleString()}`, variant: 'neutral' },
      ],
      suggestedActions: [
        `Show ${targetYear} supplier breakdown`,
        `Which projects had the lowest margins in ${targetYear}?`,
        'Which projects need attention right now?',
      ],
      exportOptions: [
        { type: 'ANNUAL_EXCEL', year: targetYear, label: `📥 Download ${targetYear} Annual Excel` },
        { type: 'ANNUAL_PDF', year: targetYear, label: `📄 Download ${targetYear} Annual PDF` },
      ],
    };
  }

  // 2. Check if user is asking about Risks / Problems / Attention ("Which projects need attention?", "Is anything wrong?")
  if (q.includes('attention') || q.includes('risk') || q.includes('problem') || q.includes('wrong') || q.includes('worried')) {
    const risks = detectCompanyRisks(projects, purchases, payments, alerts);

    if (risks.length === 0) {
      return {
        reply: `### Project Risk Review\n\nAll active projects are currently operating within standard financial safety margins. No severe cash exposures, overrun margins, or critical financial alerts detected.`,
        dataHighlights: [{ label: 'Open Risks', value: '0', variant: 'success' }],
        suggestedActions: ['Show company cash position', 'Show accounts receivable', 'Give me 2026 financial report'],
      };
    }

    const rows = risks.slice(0, 5).map(r => 
      `**[${r.severity}] ${r.projectName}**  \n*Issue:* ${r.title} — ${r.reason}  \n*Contract:* $${r.metrics.contractValue.toLocaleString()} | *Spend:* $${r.metrics.purchases.toLocaleString()} | *Margin:* ${r.metrics.grossMarginPct}%`
    ).join('\n\n');

    return {
      reply: `### Projects Requiring Attention\n\nFound **${risks.length} project exception(s)** based on spending, collection, and margin thresholds:\n\n${rows}`,
      dataHighlights: [
        { label: 'Critical / Watch', value: `${risks.length} Jobs`, variant: 'danger' },
        { label: 'Top Concern', value: risks[0].projectName, subtext: risks[0].title, variant: 'warning' }
      ],
      suggestedActions: [
        `How is ${risks[0].projectName} doing?`,
        'How much are customers currently owing us?',
        'Show 2026 financial summary',
      ],
    };
  }

  // 3. Check if user is asking about Accounts Receivable ("Who owes money?", "How much uncollected?")
  if (q.includes('receivable') || q.includes('owe') || q.includes('uncollected') || q.includes('collect')) {
    const arProjects = projects.map(proj => {
      const projPayments = payments.filter(p => p.projectId === proj.projectId && (p.status === 'RECEIVED' || p.status === 'CLEARED'));
      const contract = calculateTotalContractValue(proj.contractValue, proj.approvedChangeOrders);
      const collected = calculateTotalCollected(projPayments);
      const ar = calculateAccountsReceivable(contract, collected);
      const collectPct = contract > 0 ? Math.round((collected / contract) * 100) : 0;
      return { proj, contract, collected, ar, collectPct };
    }).filter(p => p.ar > 0).sort((a, b) => b.ar - a.ar);

    const totalAR = arProjects.reduce((sum, p) => sum + p.ar, 0);

    const tableRows = arProjects.map(p => 
      `| ${p.proj.projectName} | ${p.proj.clientName} | $${p.contract.toLocaleString()} | $${p.collected.toLocaleString()} | **$${p.ar.toLocaleString()}** | ${p.collectPct}% |`
    ).join('\n');

    return {
      reply: `### Accounts Receivable Analysis\n\n**Total Outstanding Contract Balance:** $${totalAR.toLocaleString()}\n\n| Project | Client | Total Contract | Collected | Outstanding A/R | Collected % |\n|---|---|---|---|---|---|\n${tableRows}\n\n*Note:* Accounts Receivable represents contracted billing scope minus cleared cash payments.`,
      dataHighlights: [
        { label: 'Total A/R Outstanding', value: `$${totalAR.toLocaleString()}`, variant: 'warning' },
        { label: 'Projects with A/R', value: `${arProjects.length}`, variant: 'neutral' },
        { label: 'Largest Balance', value: arProjects[0] ? `$${arProjects[0].ar.toLocaleString()}` : '$0', subtext: arProjects[0]?.proj.projectName, variant: 'danger' }
      ],
      suggestedActions: [
        'Which projects have the lowest margins?',
        'How much have we spent this year?',
        'Show 2026 financial summary',
      ],
    };
  }

  // 4. Check for Specific Project Queries (e.g. "How is Smith doing?" or activeProjectId)
  const matchedProject = projects.find(p => q.includes(p.projectName.toLowerCase()) || q.includes(p.clientName.toLowerCase())) ||
    (activeProjectId ? projects.find(p => p.projectId === activeProjectId) : null);

  if (matchedProject && (q.includes('how') || q.includes('margin') || q.includes('spend') || q.includes('project') || q.includes('doing') || q.includes('status'))) {
    const metrics = calculateProjectMetrics(matchedProject, purchases, payments, alerts);
    const marginPct = Math.round(metrics.grossMarginEstimate * 1000) / 10;
    const spendRatio = metrics.totalContractValue > 0 ? Math.round((metrics.totalPurchases / metrics.totalContractValue) * 1000) / 10 : 0;
    const collectRatio = metrics.totalContractValue > 0 ? Math.round((metrics.totalCollected / metrics.totalContractValue) * 1000) / 10 : 0;

    let statusWarning = '';
    if (metrics.cashPosition < 0) {
      statusWarning = `\n**Attention [CRITICAL]:** Purchases exceed collected funds by $${Math.abs(metrics.cashPosition).toLocaleString()}. Cash position is negative.`;
    } else if (metrics.accountsReceivable > metrics.totalContractValue * 0.35) {
      statusWarning = `\n**Attention [WATCH]:** $${metrics.accountsReceivable.toLocaleString()} (${100 - collectRatio}%) remains uncollected.`;
    }

    return {
      reply: `### ${matchedProject.projectName} (${matchedProject.clientName})
**Status:** ${matchedProject.status}  
**Contract Value:** $${matchedProject.contractValue.toLocaleString()} ${matchedProject.approvedChangeOrders > 0 ? `(+ $${matchedProject.approvedChangeOrders.toLocaleString()} Change Orders = $${metrics.totalContractValue.toLocaleString()})` : ''}  
**Total Spend (Purchases):** $${metrics.totalPurchases.toLocaleString()} (${spendRatio}% of contract)  
**Total Collected:** $${metrics.totalCollected.toLocaleString()} (${collectRatio}% collected)  
**Accounts Receivable:** $${metrics.accountsReceivable.toLocaleString()}  
**Gross Profit Estimate:** $${metrics.grossProjectPosition.toLocaleString()}  
**Gross Margin Estimate:** ${marginPct}%  
**Cash Gross Profit:** $${metrics.cashPosition.toLocaleString()}  ${statusWarning}`,
      dataHighlights: [
        { label: 'Contract Scope', value: `$${metrics.totalContractValue.toLocaleString()}`, variant: 'neutral' },
        { label: 'Total Spend', value: `$${metrics.totalPurchases.toLocaleString()}`, variant: 'warning' },
        { label: 'Collected', value: `$${metrics.totalCollected.toLocaleString()}`, variant: 'success' },
        { label: 'Gross Margin', value: `${marginPct}%`, variant: marginPct >= 20 ? 'success' : 'danger' }
      ],
      suggestedActions: [
        `Show recent purchases for ${matchedProject.projectName}`,
        'Record a payment for this project',
        'Which projects have low margins?',
      ],
      exportOptions: [
        { type: 'PROJECT_PDF', projectId: matchedProject.projectId, projectName: matchedProject.projectName, label: `📄 Download ${matchedProject.projectName} PDF` },
      ]
    };
  }

  // 5. Purchase / Provider Search
  if (q.includes('purchase') || q.includes('spent') || q.includes('home depot') || q.includes('lowe') || q.includes('floor') || q.includes('ferguson') || q.includes('buy') || q.includes('bought') || q.includes('supplier') || q.includes('provider')) {
    const searchResult = searchPurchases(query, purchases, projects);
    const items = searchResult.matches.map(p => 
      `- **${p.purchaseDate || 'No date'}** | **$${p.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}** | ${p.providerName || 'Vendor'} | Receipt #${p.receiptNumber || 'N/A'}`
    ).join('\n');

    return {
      reply: `### Purchase Search Results\n\n${searchResult.summaryText}\n\n${items || 'No individual transactions matched the query criteria.'}`,
      dataHighlights: [
        { label: 'Total Matching Spend', value: `$${searchResult.totalAmount.toLocaleString()}`, variant: 'warning' },
        { label: 'Receipts Found', value: `${searchResult.matches.length}`, variant: 'info' }
      ],
      suggestedActions: [
        'Which supplier received the most money this year?',
        'How much did we spend at Home Depot in 2026?',
        'Show 2026 annual financial report',
      ],
    };
  }

  // 6. Default Company Overview
  const overview = calculateCompanyFinancialOverview(company, projects, purchases, payments, alerts);
  return {
    reply: `### MyProjectTrace Financial Overview — ${company.companyName}

**Total Gross Contract Scope:** $${overview.totalContractScope.toLocaleString()}  
**Total Payments Collected:** $${overview.totalPaymentsCollected.toLocaleString()}  
**Total Material Purchases:** $${overview.totalMaterialPurchases.toLocaleString()}  
**Accounts Receivable Outstanding:** $${overview.totalAccountsReceivable.toLocaleString()}  
**Net Recorded Cash Movement:** $${overview.netCashPosition.toLocaleString()}  
**Estimated Company Gross Margin:** ${overview.overallGrossMarginPct}%  

**Active Jobs:** ${overview.activeProjectsCount} active | ${overview.completedProjectsCount} completed  
**Open Alerts:** ${overview.openAlertsCount} (${overview.criticalAlertsCount} critical)`,
    dataHighlights: [
      { label: 'Total Contract Scope', value: `$${overview.totalContractScope.toLocaleString()}`, variant: 'neutral' },
      { label: 'Total Collected', value: `$${overview.totalPaymentsCollected.toLocaleString()}`, variant: 'success' },
      { label: 'Total Purchases', value: `$${overview.totalMaterialPurchases.toLocaleString()}`, variant: 'warning' },
      { label: 'Net Cash Delta', value: `$${overview.netCashPosition.toLocaleString()}`, variant: overview.netCashPosition >= 0 ? 'info' : 'danger' },
    ],
    suggestedActions: [
      'Which projects need attention?',
      'How much are customers currently owing us?',
      'Show 2026 annual financial report',
      'Which supplier received the most money?',
    ],
    exportOptions: [
      { type: 'ANNUAL_EXCEL', year: 2026, label: '📥 Download 2026 Annual Excel' },
      { type: 'CPA_EXCEL', label: '📊 Download Accountant Excel Export' },
    ]
  };
}
