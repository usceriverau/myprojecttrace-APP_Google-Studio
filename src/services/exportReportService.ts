/**
 * MyProjectTrace - Project PDF & Excel Tax Report Generator
 * 
 * Provides:
 * 1. Professional executive & contractor PDF reports (jsPDF + autoTable)
 * 2. Multi-tab Accountant / Tax-Ready Excel workbooks (xlsx)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
  Project, 
  ProjectFinancialMetrics, 
  Purchase, 
  Payment, 
  PurchaseItem, 
  ProjectNote, 
  ProjectPhoto, 
  Company,
  FinancialAlert
} from '../types';
import { formatCurrency, formatDate } from '../lib/utils';

interface GenerateReportOptions {
  project: Project;
  metrics: ProjectFinancialMetrics;
  purchases: Purchase[];
  payments: Payment[];
  purchaseItems?: PurchaseItem[];
  notes?: ProjectNote[];
  photos?: ProjectPhoto[];
  company: Company;
  authorName?: string;
}

/**
 * Generates and triggers instant browser download of a professional Project Summary & Financial PDF Report
 */
export async function generateProjectPdfReport({
  project,
  metrics,
  purchases,
  payments,
  notes = [],
  photos = [],
  company,
  authorName = 'Apex Admin',
}: GenerateReportOptions): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryNavy: [number, number, number] = [3, 34, 95];    // #03225F
  const accentBlue: [number, number, number] = [5, 74, 198];    // #054AC6
  const slateDark: [number, number, number] = [30, 41, 59];     // #1E293B
  const slateMuted: [number, number, number] = [100, 116, 139]; // #64748B
  const emeraldGreen: [number, number, number] = [16, 149, 106]; // #10B981

  let currentY = 15;

  // 1. Header Banner
  doc.setFillColor(...primaryNavy);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('MYPROJECTTRACE — PROJECT AUDIT & FINANCIAL REPORT', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(190, 210, 245);
  doc.text(`${company.companyName} | Generated: ${new Date().toLocaleDateString()} | Author: ${authorName}`, 14, 22);
  doc.text(`Status: ${project.status}`, 165, 22);

  currentY = 40;

  // 2. Project Information & Client Overview Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 182, 30, 2, 2, 'FD');

  doc.setTextColor(...slateDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(project.projectName, 18, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...slateMuted);
  doc.text(`Client: ${project.clientName}`, 18, currentY + 16);
  doc.text(`Address: ${project.projectAddress || 'Site address on file'}`, 18, currentY + 22);
  doc.text(`Start Date: ${formatDate(project.startDate)}`, 130, currentY + 16);
  doc.text(`Trade: ${company.tradeType || 'General Remodeling'}`, 130, currentY + 22);

  currentY += 36;

  // 3. Financial Metrics KPI Grid
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryNavy);
  doc.text('FINANCIAL SUMMARY & CASH POSITION', 14, currentY);
  currentY += 4;

  const kpis = [
    { label: 'Total Contract Value', val: formatCurrency(metrics.totalContractValue), bg: [238, 242, 255] as [number, number, number] },
    { label: 'Total Collected', val: formatCurrency(metrics.totalCollected), bg: [236, 253, 245] as [number, number, number] },
    { label: 'Confirmed Purchases', val: formatCurrency(metrics.totalPurchases), bg: [254, 242, 242] as [number, number, number] },
    { label: 'Net Cash Position', val: formatCurrency(metrics.cashPosition), bg: metrics.cashPosition >= 0 ? [236, 253, 245] as [number, number, number] : [254, 226, 226] as [number, number, number] },
  ];

  const colW = 43;
  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (colW + 3.3);
    doc.setFillColor(...kpi.bg);
    doc.roundedRect(x, currentY, colW, 18, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...slateMuted);
    doc.text(kpi.label, x + 3, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...slateDark);
    doc.text(kpi.val, x + 3, currentY + 13);
  });

  currentY += 24;

  // Secondary metrics line
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateMuted);
  doc.text(`Estimated Gross Profit Margin: ${Math.round(metrics.grossMarginEstimate * 100)}% | Accounts Receivable: ${formatCurrency(metrics.accountsReceivable)} | Receipt Count: ${purchases.length}`, 14, currentY);

  currentY += 6;

  // 4. Confirmed Purchases & Receipts Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryNavy);
  doc.text(`CONFIRMED PURCHASES & MATERIAL EXPENSES (${purchases.length})`, 14, currentY + 4);

  const purchaseRows = purchases.map((p, idx) => [
    (idx + 1).toString(),
    formatDate(p.purchaseDate),
    p.providerName || 'General Supplier',
    p.receiptNumber || '—',
    p.paymentMethod || 'Credit/Direct',
    formatCurrency(p.subtotal || 0),
    formatCurrency(p.tax || 0),
    formatCurrency(p.totalAmount),
  ]);

  autoTable(doc, {
    startY: currentY + 6,
    head: [['#', 'Date', 'Vendor / Merchant', 'Receipt #', 'Payment', 'Subtotal', 'Tax', 'Total']],
    body: purchaseRows.length > 0 ? purchaseRows : [['—', '—', 'No confirmed purchases recorded', '—', '—', '$0.00', '$0.00', '$0.00']],
    theme: 'striped',
    headStyles: {
      fillColor: primaryNavy,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: slateDark,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 22 },
      2: { cellWidth: 42 },
      3: { cellWidth: 24 },
      4: { cellWidth: 26 },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 16, halign: 'right' },
      7: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // Calculate final Y after table
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Check if we need page break
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // 5. Payments Received Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryNavy);
  doc.text(`CLIENT PAYMENTS COLLECTED (${payments.length})`, 14, currentY);

  const paymentRows = payments.map((pay, idx) => [
    (idx + 1).toString(),
    formatDate(pay.paymentDate),
    pay.paymentType.replace('_', ' '),
    pay.paymentMethod,
    pay.referenceNumber || '—',
    pay.status,
    formatCurrency(pay.amount),
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['#', 'Date', 'Payment Type', 'Method', 'Reference #', 'Status', 'Amount']],
    body: paymentRows.length > 0 ? paymentRows : [['—', '—', 'No payments recorded', '—', '—', '—', '$0.00']],
    theme: 'striped',
    headStyles: {
      fillColor: accentBlue,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: slateDark,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 45 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
      5: { cellWidth: 20 },
      6: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 6. Color Specifications & Important Project Notes
  if (notes.length > 0) {
    if (currentY > 210) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...primaryNavy);
    doc.text(`PROJECT NOTES & COLOR SPECIFICATIONS (${notes.length})`, 14, currentY);
    currentY += 4;

    const noteRows: string[][] = [];
    notes.forEach((n) => {
      let detail = n.content;
      if (n.colorCodes && n.colorCodes.length > 0) {
        const colorList = n.colorCodes.map(c => `${c.label}: ${c.code} (${c.brand || ''} ${c.finish || ''})`).join(' | ');
        detail = `${n.content}\n[Palette] ${colorList}`;
      }
      noteRows.push([n.category.replace('_', ' '), n.title, detail]);
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Category', 'Title', 'Details & Paint Specifications']],
      body: noteRows,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: slateDark,
      },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'bold' },
        1: { cellWidth: 45, fontStyle: 'bold' },
        2: { cellWidth: 107 },
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // 7. Progress Photos Log Summary
  if (photos.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...primaryNavy);
    doc.text(`PROGRESS PHOTOS AUDIT RECORD (${photos.length} Photos Captured)`, 14, currentY);
    currentY += 4;

    const photoRows = photos.map((ph, idx) => [
      (idx + 1).toString(),
      formatDate(ph.takenAt),
      ph.phase,
      ph.caption || 'Project visual record',
      ph.uploadedBy || 'Field Staff',
      ph.tags?.join(', ') || '—'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Date Taken', 'Phase', 'Caption / Description', 'Captured By', 'Tags']],
      body: photoRows,
      theme: 'striped',
      headStyles: {
        fillColor: primaryNavy,
        textColor: [255, 255, 255],
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: slateDark,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 22 },
        2: { cellWidth: 26, fontStyle: 'bold' },
        3: { cellWidth: 66 },
        4: { cellWidth: 30 },
        5: { cellWidth: 30 },
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...slateMuted);
    doc.text(`MyProjectTrace Financial System • ${company.companyName} • Confidential`, 14, 290);
    doc.text(`Page ${i} of ${pageCount}`, 185, 290);
  }

  // Sanitize filename
  const cleanName = project.projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${cleanName}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}

export interface GenerateCompanyCpaReportOptions {
  company: Company;
  projects: Project[];
  purchases: Purchase[];
  payments: Payment[];
  purchaseItems: PurchaseItem[];
  notes?: ProjectNote[];
  photos?: ProjectPhoto[];
  authorName?: string;
}

/**
 * Generates and triggers instant browser download of a Master CPA & Tax-Ready Multi-Sheet Excel Workbook (.xlsx)
 * Consolidates ALL company projects, purchases, receipts, line items, and client collections into one master accounting file.
 */
export function generateCompanyCpaExcelReport({
  company,
  projects,
  purchases,
  payments,
  purchaseItems = [],
  notes = [],
  authorName = 'Company Admin',
}: GenerateCompanyCpaReportOptions): void {
  const wb = XLSX.utils.book_new();

  // Calculate Company-wide Consolidated Metrics
  const totalContractRevenue = projects.reduce((acc, p) => acc + (p.contractValue + p.approvedChangeOrders), 0);
  const totalCollectedCash = payments.reduce((acc, p) => acc + ((p.status === 'RECEIVED' || p.status === 'CLEARED') ? p.amount : 0), 0);
  const totalMaterialPurchases = purchases.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalSalesTaxPaid = purchases.reduce((acc, p) => acc + (p.tax || 0), 0);
  const totalPreTaxExpenses = purchases.reduce((acc, p) => acc + (p.subtotal !== null ? p.subtotal : p.totalAmount), 0);
  const netCashFlow = totalCollectedCash - totalMaterialPurchases;
  const accountsReceivable = Math.max(0, totalContractRevenue - totalCollectedCash);
  const estimatedGrossMargin = totalContractRevenue > 0 
    ? Math.round(((totalContractRevenue - totalMaterialPurchases) / totalContractRevenue) * 100) 
    : 0;

  // ==========================================
  // SHEET 1: Master CPA & Company Tax Summary
  // ==========================================
  const summaryData: any[][] = [
    ['MYPROJECTTRACE — MASTER CPA & TAX AUDIT SUMMARY (ALL PROJECTS)'],
    ['Company Name', company.companyName],
    ['Trade / Industry', company.tradeType || 'General Remodeling & Construction'],
    ['Report Date', new Date().toISOString().split('T')[0]],
    ['Prepared By', authorName],
    ['Total Active & Completed Projects', projects.length],
    ['Total Auditable Receipts Logged', purchases.length],
    [''],
    ['CONSOLIDATED TAX & REVENUE TOTALS (USD)', 'AMOUNT ($)', 'ACCOUNTING & TAX CLASSIFICATION'],
    ['Total Gross Contract Scope (Billable)', totalContractRevenue, 'Gross contracted billing scope across all jobs'],
    ['Total Payments Collected (Gross Cash Income)', totalCollectedCash, 'Form 1040 Schedule C / Form 1120-S Gross Receipts'],
    ['Accounts Receivable Outstanding', accountsReceivable, 'Unpaid customer contract balances'],
    [''],
    ['TAX-DEDUCTIBLE EXPENSES & MATERIAL PURCHASES', 'AMOUNT ($)', 'TAX CLASSIFICATION'],
    ['Total Verified Material & Supply Purchases', totalMaterialPurchases, 'Cost of Goods Sold (COGS) / Direct Materials Deductible'],
    ['Pre-Tax Material Subtotal Basis', totalPreTaxExpenses, 'Direct materials excluding sales tax'],
    ['Total Sales Tax Paid to Vendors', totalSalesTaxPaid, 'State & local sales tax paid on materials'],
    [''],
    ['NET PROFITABILITY & CASH BALANCE', 'AMOUNT ($)', 'METRIC'],
    ['Consolidated Net Cash Position', netCashFlow, 'Total Collected minus Total Expenses'],
    ['Estimated Overall Gross Margin %', `${estimatedGrossMargin}%`, 'Gross profit margin ratio'],
    [''],
    ['PROJECTS BREAKDOWN AT A GLANCE', '', '', '', ''],
    ['Project Name', 'Client', 'Status', 'Total Contract ($)', 'Collected ($)', 'Expenses ($)', 'Net Cash ($)']
  ];

  projects.forEach((proj) => {
    const projPurchases = purchases.filter((p) => p.projectId === proj.projectId);
    const projPayments = payments.filter((p) => p.projectId === proj.projectId && (p.status === 'RECEIVED' || p.status === 'CLEARED'));
    const projContract = proj.contractValue + proj.approvedChangeOrders;
    const projCollected = projPayments.reduce((sum, pay) => sum + pay.amount, 0);
    const projExpenses = projPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const projNet = projCollected - projExpenses;

    summaryData.push([
      proj.projectName,
      proj.clientName,
      proj.status,
      projContract,
      projCollected,
      projExpenses,
      projNet,
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [
    { wch: 38 },
    { wch: 25 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'CPA_Company_Tax_Summary');

  // ==========================================
  // SHEET 2: All Projects Purchases Ledger (Tax Deductible)
  // ==========================================
  const purchasesHeader = [
    'Item #',
    'Transaction Date',
    'Project Name',
    'Client Name',
    'Vendor / Merchant',
    'Receipt Number',
    'Payment Method',
    'Subtotal ($)',
    'Sales Tax ($)',
    'Total Amount ($)',
    'Capture Status',
    'Receipt Photos Count',
    'Verified By',
    'Duplicate Warning Ack',
  ];

  const purchasesData = purchases.map((p, idx) => {
    const proj = projects.find((pr) => pr.projectId === p.projectId);
    return [
      idx + 1,
      p.purchaseDate,
      proj?.projectName || (p.projectId ? 'Assigned Project' : 'Unassigned / General'),
      proj?.clientName || 'N/A',
      p.providerName || 'General Supplier',
      p.receiptNumber || 'N/A',
      p.paymentMethod || 'Direct Payment',
      p.subtotal !== null ? p.subtotal : p.totalAmount,
      p.tax !== null ? p.tax : 0.00,
      p.totalAmount,
      p.captureStatus,
      p.receiptPageCount || 1,
      p.confirmedBy || 'Verified',
      p.duplicateWarningAcknowledged ? 'YES' : 'NO',
    ];
  });

  const wsPurchases = XLSX.utils.aoa_to_sheet([purchasesHeader, ...purchasesData]);
  wsPurchases['!cols'] = [
    { wch: 8 },  // #
    { wch: 15 }, // Date
    { wch: 26 }, // Project Name
    { wch: 22 }, // Client Name
    { wch: 28 }, // Vendor
    { wch: 18 }, // Receipt #
    { wch: 18 }, // Payment Method
    { wch: 14 }, // Subtotal
    { wch: 14 }, // Tax
    { wch: 16 }, // Total
    { wch: 15 }, // Status
    { wch: 12 }, // Photos
    { wch: 18 }, // Confirmed By
    { wch: 15 }, // Duplicate Ack
  ];
  XLSX.utils.book_append_sheet(wb, wsPurchases, 'All_Purchases_Ledger');

  // ==========================================
  // SHEET 3: Line Items Detail (SKUs, Quantities, Specs)
  // ==========================================
  if (purchaseItems.length > 0) {
    const itemsHeader = [
      'Line #',
      'Project Name',
      'Vendor / Merchant',
      'Description / Material',
      'Category',
      'Brand / Mfr',
      'SKU / Model #',
      'Color / Finish',
      'Quantity',
      'Unit',
      'Unit Price ($)',
      'Line Total ($)',
      'Specifications & Specs',
    ];

    const itemsData = purchaseItems.map((item, idx) => {
      const purchase = purchases.find((p) => p.purchaseId === item.purchaseId);
      const proj = projects.find((pr) => pr.projectId === purchase?.projectId);

      return [
        idx + 1,
        proj?.projectName || 'General / Unassigned',
        purchase?.providerName || '',
        item.description || 'Line Item',
        item.category || 'General Materials',
        item.brand || '',
        item.sku || item.modelNumber || '',
        item.colorName || item.finish || '',
        item.quantity || 1,
        item.unit || 'ea',
        item.unitPrice || 0,
        item.lineTotal || 0,
        item.additionalSpecifications?.map((s) => `${s.name}: ${s.value}`).join(' | ') || '',
      ];
    });

    const wsItems = XLSX.utils.aoa_to_sheet([itemsHeader, ...itemsData]);
    wsItems['!cols'] = [
      { wch: 8 },
      { wch: 25 },
      { wch: 25 },
      { wch: 35 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 10 },
      { wch: 8 },
      { wch: 14 },
      { wch: 14 },
      { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(wb, wsItems, 'All_Line_Items_SKUs');
  }

  // ==========================================
  // SHEET 4: Client Payments & Income Ledger
  // ==========================================
  const paymentsHeader = [
    'Payment #',
    'Payment Date',
    'Project Name',
    'Client Name',
    'Payment Type',
    'Payment Method',
    'Reference / Check #',
    'Status',
    'Amount Collected ($)',
    'Notes',
  ];

  const paymentsData = payments.map((pay, idx) => {
    const proj = projects.find((pr) => pr.projectId === pay.projectId);
    return [
      idx + 1,
      pay.paymentDate,
      proj?.projectName || 'Project',
      proj?.clientName || 'Client',
      pay.paymentType,
      pay.paymentMethod,
      pay.referenceNumber || 'N/A',
      pay.status,
      pay.amount,
      pay.notes || '',
    ];
  });

  const wsPayments = XLSX.utils.aoa_to_sheet([paymentsHeader, ...paymentsData]);
  wsPayments['!cols'] = [
    { wch: 10 },
    { wch: 15 },
    { wch: 25 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 20 },
    { wch: 14 },
    { wch: 20 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPayments, 'All_Income_Collections');

  // ==========================================
  // SHEET 5: Projects P&L Master Ledger
  // ==========================================
  const projectsHeader = [
    'Project ID',
    'Project Name',
    'Client Name',
    'Site Address',
    'Status',
    'Start Date',
    'Contract Base ($)',
    'Change Orders ($)',
    'Total Contract ($)',
    'Total Collected ($)',
    'Total Purchases ($)',
    'Unpaid Balance ($)',
    'Net Cash Position ($)',
    'Gross Margin %',
  ];

  const projectsData = projects.map((proj) => {
    const projPurchases = purchases.filter((p) => p.projectId === proj.projectId);
    const projPayments = payments.filter((p) => p.projectId === proj.projectId && (p.status === 'RECEIVED' || p.status === 'CLEARED'));
    const contractTotal = proj.contractValue + proj.approvedChangeOrders;
    const totalCollected = projPayments.reduce((s, p) => s + p.amount, 0);
    const totalPurchases = projPurchases.reduce((s, p) => s + p.totalAmount, 0);
    const unpaidBalance = Math.max(0, contractTotal - totalCollected);
    const cashPos = totalCollected - totalPurchases;
    const marginPct = contractTotal > 0 ? Math.round(((contractTotal - totalPurchases) / contractTotal) * 100) : 0;

    return [
      proj.projectId,
      proj.projectName,
      proj.clientName,
      proj.projectAddress || 'Site address on file',
      proj.status,
      proj.startDate,
      proj.contractValue,
      proj.approvedChangeOrders,
      contractTotal,
      totalCollected,
      totalPurchases,
      unpaidBalance,
      cashPos,
      `${marginPct}%`,
    ];
  });

  const wsProjects = XLSX.utils.aoa_to_sheet([projectsHeader, ...projectsData]);
  wsProjects['!cols'] = [
    { wch: 20 },
    { wch: 28 },
    { wch: 22 },
    { wch: 30 },
    { wch: 15 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, wsProjects, 'Projects_P&L_Master');

  // ==========================================
  // SHEET 6: Paint Codes, Formulas & Notes
  // ==========================================
  if (notes.length > 0) {
    const notesHeader = [
      'Note ID',
      'Project Name',
      'Category',
      'Title',
      'Content',
      'Color Codes & Formulas',
      'Created Date',
    ];

    const notesData = notes.map((n) => {
      const proj = projects.find((pr) => pr.projectId === n.projectId);
      return [
        n.noteId,
        proj?.projectName || 'Project',
        n.category,
        n.title,
        n.content,
        n.colorCodes?.map((c) => `${c.label}: ${c.code} (${c.brand || ''} ${c.finish || ''})`).join(' | ') || 'N/A',
        formatDate(n.createdAt),
      ];
    });

    const wsNotes = XLSX.utils.aoa_to_sheet([notesHeader, ...notesData]);
    wsNotes['!cols'] = [
      { wch: 18 },
      { wch: 25 },
      { wch: 18 },
      { wch: 30 },
      { wch: 45 },
      { wch: 45 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsNotes, 'Color_Codes_Notes');
  }

  // Trigger download with sanitized company file name
  const cleanCompanyName = company.companyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `${cleanCompanyName}_CPA_General_Tax_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Generates and triggers instant browser download of an Accountant / Tax-Ready Multi-Sheet Excel Workbook (.xlsx)
 */
export function generateProjectExcelTaxReport({
  project,
  metrics,
  purchases,
  payments,
  purchaseItems = [],
  notes = [],
  company,
}: GenerateReportOptions): void {
  const wb = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: Tax & Executive Summary
  // ==========================================
  const summaryData = [
    ['MYPROJECTTRACE - PROJECT TAX & FINANCIAL AUDIT SUMMARY'],
    ['Company Name', company.companyName],
    ['Project Name', project.projectName],
    ['Client Name', project.clientName],
    ['Project Address', project.projectAddress || ''],
    ['Start Date', project.startDate],
    ['Report Date', new Date().toISOString().split('T')[0]],
    ['Trade Type', company.tradeType || 'General Contractor'],
    [''],
    ['FINANCIAL & TAX SUMMARY', 'AMOUNT (USD)', 'NOTES / ACCOUNTING REF'],
    ['Contract Base Value', project.contractValue, 'Initial agreed scope'],
    ['Approved Change Orders', project.approvedChangeOrders, 'Addendums'],
    ['Total Contract Revenue', metrics.totalContractValue, 'Gross billable contract'],
    ['Total Payments Collected (Gross Income)', metrics.totalCollected, 'Cash basis collected revenue'],
    ['Accounts Receivable Outstanding', metrics.accountsReceivable, 'Unpaid customer balance'],
    [''],
    ['EXPENSES & TAX DEDUCTIONS', 'AMOUNT (USD)', 'NOTES'],
    ['Total Material / Trade Purchases (Deductible)', metrics.totalPurchases, 'Verified purchase receipts'],
    ['Total Sales Tax Paid on Materials', purchases.reduce((acc, p) => acc + (p.tax || 0), 0), 'Itemized sales tax'],
    ['Subtotal Expenses (Pre-Tax)', purchases.reduce((acc, p) => acc + (p.subtotal || p.totalAmount), 0), 'Direct material cost basis'],
    [''],
    ['PROFITABILITY & CASH FLOW', 'AMOUNT (USD)', 'METRIC'],
    ['Net Cash Flow on Project', metrics.cashPosition, 'Total Collected minus Total Purchases'],
    ['Estimated Project Margin', `${Math.round(metrics.grossMarginEstimate * 100)}%`, 'Gross margin ratio'],
    ['Total Confirmed Receipts Count', purchases.length, 'Auditable documents'],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 35 }, { wch: 22 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Tax_Summary');

  // ==========================================
  // SHEET 2: Purchases & Receipts Ledger (Tax Ready)
  // ==========================================
  const purchasesHeader = [
    'Item #',
    'Transaction Date',
    'Vendor / Merchant',
    'Receipt Number',
    'Payment Method',
    'Subtotal ($)',
    'Sales Tax ($)',
    'Total Amount ($)',
    'Project ID',
    'Project Name',
    'Capture Status',
    'Evidence Photos Count',
    'Verified By User',
    'Duplicate Warning Acknowledged',
  ];

  const purchasesData = purchases.map((p, idx) => [
    idx + 1,
    p.purchaseDate,
    p.providerName || 'General Supplier',
    p.receiptNumber || 'N/A',
    p.paymentMethod || 'Direct Payment',
    p.subtotal !== null ? p.subtotal : p.totalAmount,
    p.tax !== null ? p.tax : 0.00,
    p.totalAmount,
    project.projectId,
    project.projectName,
    p.captureStatus,
    p.receiptPageCount || 1,
    p.confirmedBy || 'Verified',
    p.duplicateWarningAcknowledged ? 'YES' : 'NO',
  ]);

  const wsPurchases = XLSX.utils.aoa_to_sheet([purchasesHeader, ...purchasesData]);
  wsPurchases['!cols'] = [
    { wch: 8 },  // #
    { wch: 15 }, // Date
    { wch: 30 }, // Vendor
    { wch: 18 }, // Receipt #
    { wch: 18 }, // Payment
    { wch: 14 }, // Subtotal
    { wch: 14 }, // Tax
    { wch: 16 }, // Total
    { wch: 20 }, // Project ID
    { wch: 25 }, // Project Name
    { wch: 15 }, // Status
    { wch: 12 }, // Photos
    { wch: 18 }, // Confirmed By
    { wch: 15 }, // Duplicate Ack
  ];
  XLSX.utils.book_append_sheet(wb, wsPurchases, 'Purchases_Ledger');

  // ==========================================
  // SHEET 3: Line Items Detail (SKUs, Quantities, Specs)
  // ==========================================
  if (purchaseItems.length > 0) {
    const itemsHeader = [
      'Purchase ID',
      'Description / Material',
      'Category',
      'Brand / Mfr',
      'SKU / Model #',
      'Color / Finish',
      'Quantity',
      'Unit',
      'Unit Price ($)',
      'Line Total ($)',
      'Specifications & Notes',
    ];

    const itemsData = purchaseItems.map(item => [
      item.purchaseId,
      item.description || 'Line Item',
      item.category || 'General',
      item.brand || '',
      item.sku || item.modelNumber || '',
      item.colorName || item.finish || '',
      item.quantity || 1,
      item.unit || 'ea',
      item.unitPrice || 0,
      item.lineTotal || 0,
      item.additionalSpecifications?.map(s => `${s.name}: ${s.value}`).join(' | ') || '',
    ]);

    const wsItems = XLSX.utils.aoa_to_sheet([itemsHeader, ...itemsData]);
    wsItems['!cols'] = [
      { wch: 18 },
      { wch: 35 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 10 },
      { wch: 8 },
      { wch: 14 },
      { wch: 14 },
      { wch: 45 },
    ];
    XLSX.utils.book_append_sheet(wb, wsItems, 'Line_Items_Detail');
  }

  // ==========================================
  // SHEET 4: Client Payments Received (Income)
  // ==========================================
  const paymentsHeader = [
    'Payment #',
    'Payment Date',
    'Payment Type',
    'Payment Method',
    'Reference / Check #',
    'Status',
    'Amount Collected ($)',
    'Notes',
  ];

  const paymentsData = payments.map((pay, idx) => [
    idx + 1,
    pay.paymentDate,
    pay.paymentType,
    pay.paymentMethod,
    pay.referenceNumber || 'N/A',
    pay.status,
    pay.amount,
    pay.notes || '',
  ]);

  const wsPayments = XLSX.utils.aoa_to_sheet([paymentsHeader, ...paymentsData]);
  wsPayments['!cols'] = [
    { wch: 10 },
    { wch: 15 },
    { wch: 25 },
    { wch: 18 },
    { wch: 20 },
    { wch: 14 },
    { wch: 20 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPayments, 'Payments_Income');

  // ==========================================
  // SHEET 5: Notes & Paint / Color Codes
  // ==========================================
  if (notes.length > 0) {
    const notesHeader = [
      'Note ID',
      'Category',
      'Title',
      'Content',
      'Color Codes & Formulas',
      'Pinned',
      'Created By',
      'Created Date',
    ];

    const notesData = notes.map(n => [
      n.noteId,
      n.category,
      n.title,
      n.content,
      n.colorCodes?.map(c => `${c.label}: ${c.code} (${c.brand || ''} ${c.finish || ''})`).join(' | ') || 'N/A',
      n.isPinned ? 'YES' : 'NO',
      n.createdBy || 'Staff',
      formatDate(n.createdAt),
    ]);

    const wsNotes = XLSX.utils.aoa_to_sheet([notesHeader, ...notesData]);
    wsNotes['!cols'] = [
      { wch: 18 },
      { wch: 18 },
      { wch: 30 },
      { wch: 45 },
      { wch: 45 },
      { wch: 10 },
      { wch: 16 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsNotes, 'Project_Notes_Specs');
  }

  // Trigger download
  const cleanName = project.projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `${cleanName}_Tax_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ==========================================
// ANNUAL FINANCIAL EXPORTS (FOR LUKY & CPA)
// ==========================================

export interface AnnualReportExportOptions {
  year: number;
  company: Company;
  projects: Project[];
  purchases: Purchase[];
  payments: Payment[];
  purchaseItems?: PurchaseItem[];
  alerts?: FinancialAlert[];
  authorName?: string;
}

/**
 * Generates an Annual Financial Excel workbook formatted with:
 * - ANNUAL_SUMMARY
 * - PROJECTS_ACTIVITY
 * - PURCHASES
 * - PURCHASE_ITEMS
 * - PAYMENTS
 * - PROVIDER_SUMMARY
 * - MONTHLY_CASH_FLOW
 */
export function generateAnnualExcelReport({
  year,
  company,
  projects,
  purchases,
  payments,
  purchaseItems = [],
  authorName = 'Apex Admin',
}: AnnualReportExportOptions): void {
  const yearStr = String(year);

  // 1. Transaction-date based annual filter (Strict Rule)
  const validPurchasesInYear = purchases.filter(p => p.captureStatus === 'CONFIRMED' && p.purchaseDate && p.purchaseDate.startsWith(yearStr));
  const validPaymentsInYear = payments.filter(p => (p.status === 'RECEIVED' || p.status === 'CLEARED') && p.paymentDate && p.paymentDate.startsWith(yearStr));

  const totalPaymentsReceived = validPaymentsInYear.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalRecordedPurchases = validPurchasesInYear.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const netRecordedCashMovement = totalPaymentsReceived - totalRecordedPurchases;
  const totalSalesTax = validPurchasesInYear.reduce((sum, p) => sum + (p.tax || 0), 0);
  const totalSubtotal = validPurchasesInYear.reduce((sum, p) => sum + (p.subtotal !== null ? p.subtotal : p.totalAmount), 0);

  const wb = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: ANNUAL SUMMARY
  // ==========================================
  const summaryData: any[][] = [
    [`MYPROJECTTRACE — ANNUAL FINANCIAL REPORT (${year})`],
    ['Company Name', company.companyName],
    ['Trade / Industry', company.tradeType || 'General Remodeling & Construction'],
    ['Report Calendar Year', year],
    ['Transaction Dating Rule', 'Purchases classified by Purchase Date; Payments classified by Payment Date.'],
    ['Prepared By', authorName],
    ['Report Date', new Date().toISOString().split('T')[0]],
    [''],
    ['ANNUAL FINANCIAL METRICS', 'AMOUNT ($)', 'FINANCIAL DEFINITION / NOTES'],
    ['Total Valid Payments Received', totalPaymentsReceived, 'Gross cash payments received and cleared during year'],
    ['Total Recorded Purchases', totalRecordedPurchases, 'Cost of Goods Sold (COGS) direct materials recorded during year'],
    ['Net Recorded Cash Movement', netRecordedCashMovement, 'Payments Received in Year MINUS Purchases in Year (Cash flow delta)'],
    ['Pre-Tax Material Subtotal Basis', totalSubtotal, 'Material expenses excluding sales tax'],
    ['Total Sales Tax Paid to Vendors', totalSalesTax, 'State & local sales tax paid on job materials'],
    [''],
    ['TRANSACTION VOLUME & COUNTS', 'COUNT', 'NOTES'],
    ['Valid Purchases Count', validPurchasesInYear.length, 'Total verified purchase receipts in year'],
    ['Valid Payments Count', validPaymentsInYear.length, 'Total customer payments collected in year'],
    ['Active Projects with Activity', projects.filter(p => validPurchasesInYear.some(pur => pur.projectId === p.projectId) || validPaymentsInYear.some(pay => pay.projectId === p.projectId)).length, 'Jobs with transactions in this calendar year'],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 38 }, { wch: 22 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'ANNUAL_SUMMARY');

  // ==========================================
  // SHEET 2: PROJECTS ACTIVITY
  // ==========================================
  const projHeaders = [
    'Project ID',
    'Project Name',
    'Client Name',
    'Status',
    'Total Contract ($)',
    'Payments in Year ($)',
    'Purchases in Year ($)',
    'Annual Cash Movement ($)',
    'Lifetime Collected ($)',
    'Lifetime Spend ($)',
    'Current Accounts Receivable ($)',
    'Current Gross Profit ($)',
    'Current Gross Margin %',
  ];

  const projData = projects.map(proj => {
    const projYearPurchases = validPurchasesInYear.filter(p => p.projectId === proj.projectId);
    const projYearPayments = validPaymentsInYear.filter(p => p.projectId === proj.projectId);

    const yearPurchases = projYearPurchases.reduce((s, p) => s + p.totalAmount, 0);
    const yearPayments = projYearPayments.reduce((s, p) => s + p.amount, 0);
    const yearCashDelta = yearPayments - yearPurchases;

    // Lifetime totals
    const lifetimePurchases = purchases.filter(p => p.projectId === proj.projectId && p.captureStatus === 'CONFIRMED');
    const lifetimePayments = payments.filter(p => p.projectId === proj.projectId && (p.status === 'RECEIVED' || p.status === 'CLEARED'));

    const contractTotal = proj.contractValue + proj.approvedChangeOrders;
    const totalCollected = lifetimePayments.reduce((s, p) => s + p.amount, 0);
    const totalSpend = lifetimePurchases.reduce((s, p) => s + p.totalAmount, 0);
    const currentAR = Math.max(0, contractTotal - totalCollected);
    const grossProfit = contractTotal - totalSpend;
    const grossMarginPct = contractTotal > 0 ? Math.round(((contractTotal - totalSpend) / contractTotal) * 100) : 0;

    return [
      proj.projectId,
      proj.projectName,
      proj.clientName,
      proj.status,
      contractTotal,
      yearPayments,
      yearPurchases,
      yearCashDelta,
      totalCollected,
      totalSpend,
      currentAR,
      grossProfit,
      `${grossMarginPct}%`,
    ];
  });

  const wsProjects = XLSX.utils.aoa_to_sheet([projHeaders, ...projData]);
  wsProjects['!cols'] = [
    { wch: 18 }, { wch: 28 }, { wch: 20 }, { wch: 12 }, { wch: 18 },
    { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 20 }, { wch: 18 },
    { wch: 24 }, { wch: 20 }, { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsProjects, 'PROJECTS_ACTIVITY');

  // ==========================================
  // SHEET 3: PURCHASES
  // ==========================================
  const projectMap = new Map(projects.map(p => [p.projectId, p.projectName]));
  const purchasesHeader = [
    'Purchase ID',
    'Purchase Date',
    'Project ID',
    'Project Name',
    'Provider / Supplier',
    'Receipt Number',
    'Payment Method',
    'Subtotal ($)',
    'Sales Tax ($)',
    'Total Amount ($)',
    'Status',
  ];

  const purchasesData = validPurchasesInYear.map(p => [
    p.purchaseId,
    p.purchaseDate,
    p.projectId || 'UNASSIGNED',
    p.projectId ? (projectMap.get(p.projectId) || 'Unknown') : 'Unassigned (Draft)',
    p.providerName || 'Unknown Vendor',
    p.receiptNumber || 'N/A',
    p.paymentMethod || 'N/A',
    p.subtotal ?? p.totalAmount,
    p.tax ?? 0,
    p.totalAmount,
    p.captureStatus,
  ]);

  const wsPurchases = XLSX.utils.aoa_to_sheet([purchasesHeader, ...purchasesData]);
  wsPurchases['!cols'] = [
    { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 26 }, { wch: 24 },
    { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, wsPurchases, 'PURCHASES');

  // ==========================================
  // SHEET 4: PAYMENTS
  // ==========================================
  const paymentsHeader = [
    'Payment ID',
    'Payment Date',
    'Project ID',
    'Project Name',
    'Payment Type',
    'Payment Method',
    'Reference / Check #',
    'Status',
    'Amount ($)',
    'Notes',
  ];

  const paymentsData = validPaymentsInYear.map(p => [
    p.paymentId,
    p.paymentDate,
    p.projectId,
    projectMap.get(p.projectId) || 'Unknown Project',
    p.paymentType,
    p.paymentMethod,
    p.referenceNumber || 'N/A',
    p.status,
    p.amount,
    p.notes || '',
  ]);

  const wsPayments = XLSX.utils.aoa_to_sheet([paymentsHeader, ...paymentsData]);
  wsPayments['!cols'] = [
    { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 26 }, { wch: 22 },
    { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, wsPayments, 'PAYMENTS');

  // ==========================================
  // SHEET 5: PROVIDER SUMMARY
  // ==========================================
  const provMap = new Map<string, { count: number; total: number; recentDate?: string }>();
  validPurchasesInYear.forEach(p => {
    const provName = p.providerName?.trim() || 'Unknown Provider';
    const curr = provMap.get(provName) || { count: 0, total: 0 };
    curr.count += 1;
    curr.total += p.totalAmount;
    if (!curr.recentDate || p.purchaseDate > curr.recentDate) {
      curr.recentDate = p.purchaseDate;
    }
    provMap.set(provName, curr);
  });

  const provHeaders = ['Provider Name', 'Number of Purchases', 'Total Spend ($)', '% of Annual Purchases', 'Average Purchase ($)', 'Most Recent Purchase'];
  const provData = Array.from(provMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, d]) => [
      name,
      d.count,
      d.total,
      totalRecordedPurchases > 0 ? `${Math.round((d.total / totalRecordedPurchases) * 1000) / 10}%` : '0%',
      d.count > 0 ? Math.round((d.total / d.count) * 100) / 100 : 0,
      d.recentDate || 'N/A',
    ]);

  const wsProviders = XLSX.utils.aoa_to_sheet([provHeaders, ...provData]);
  wsProviders['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsProviders, 'PROVIDER_SUMMARY');

  // ==========================================
  // SHEET 6: MONTHLY CASH FLOW BREAKDOWN
  // ==========================================
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthHeaders = ['Month', 'Payments Received ($)', 'Purchases ($)', 'Net Recorded Cash Movement ($)'];
  const monthData = monthNames.map((month, idx) => {
    const prefix = `${yearStr}-${String(idx + 1).padStart(2, '0')}`;
    const mPays = validPaymentsInYear.filter(p => p.paymentDate.startsWith(prefix)).reduce((s, p) => s + p.amount, 0);
    const mPurs = validPurchasesInYear.filter(p => p.purchaseDate.startsWith(prefix)).reduce((s, p) => s + p.totalAmount, 0);
    return [month, mPays, mPurs, mPays - mPurs];
  });

  const wsMonthly = XLSX.utils.aoa_to_sheet([monthHeaders, ...monthData]);
  wsMonthly['!cols'] = [{ wch: 18 }, { wch: 24 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsMonthly, 'MONTHLY_CASH_FLOW');

  // Trigger download
  const cleanCompanyName = company.companyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `${cleanCompanyName}_Annual_Financial_Report_${year}.xlsx`);
}

/**
 * Generates an Executive Annual Financial PDF Summary Report
 */
export async function generateAnnualPdfReport({
  year,
  company,
  projects,
  purchases,
  payments,
  authorName = 'Apex Admin',
}: AnnualReportExportOptions): Promise<void> {
  const yearStr = String(year);
  const validPurchases = purchases.filter(p => p.captureStatus === 'CONFIRMED' && p.purchaseDate && p.purchaseDate.startsWith(yearStr));
  const validPayments = payments.filter(p => (p.status === 'RECEIVED' || p.status === 'CLEARED') && p.paymentDate && p.paymentDate.startsWith(yearStr));

  const totalPaymentsReceived = validPayments.reduce((s, p) => s + p.amount, 0);
  const totalPurchases = validPurchases.reduce((s, p) => s + p.totalAmount, 0);
  const netCashMovement = totalPaymentsReceived - totalPurchases;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(3, 34, 95); // #03225F
  doc.rect(0, 0, pageWidth, 85, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MYPROJECTTRACE', 40, 36);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(127, 160, 212); // #7FA0D4
  doc.text(`ANNUAL FINANCIAL & CASH SUMMARY — ${year}`, 40, 54);
  doc.text(`Company: ${company.companyName}`, 40, 70);

  doc.setFontSize(9);
  doc.setTextColor(200, 220, 255);
  doc.text(`Generated: ${new Date().toISOString().split('T')[0]} | By: ${authorName}`, pageWidth - 40, 70, { align: 'right' });

  let y = 105;

  // Executive KPI Cards
  const kpiData: any[][] = [
    [
      { content: `VALID PAYMENTS COLLECTED (${year})\n$${totalPaymentsReceived.toLocaleString()}`, styles: { fillColor: [240, 253, 244], textColor: [22, 101, 52], fontStyle: 'bold', halign: 'center' } },
      { content: `RECORDED PURCHASES (${year})\n$${totalPurchases.toLocaleString()}`, styles: { fillColor: [254, 242, 242], textColor: [153, 27, 27], fontStyle: 'bold', halign: 'center' } },
      { content: `NET RECORDED CASH MOVEMENT\n$${netCashMovement.toLocaleString()}`, styles: { fillColor: netCashMovement >= 0 ? [239, 246, 255] : [255, 241, 242], textColor: netCashMovement >= 0 ? [30, 58, 138] : [159, 18, 57], fontStyle: 'bold', halign: 'center' } },
    ]
  ];

  autoTable(doc, {
    startY: y,
    body: kpiData as any,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 8, font: 'helvetica' },
    margin: { left: 40, right: 40 },
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // Monthly Breakdown Table
  doc.setTextColor(3, 34, 95);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Monthly Cash Flow Breakdown (${year})`, 40, y);
  y += 6;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthlyRows = monthNames.map((month, idx) => {
    const prefix = `${yearStr}-${String(idx + 1).padStart(2, '0')}`;
    const mPays = validPayments.filter(p => p.paymentDate.startsWith(prefix)).reduce((s, p) => s + p.amount, 0);
    const mPurs = validPurchases.filter(p => p.purchaseDate.startsWith(prefix)).reduce((s, p) => s + p.totalAmount, 0);
    const delta = mPays - mPurs;
    return [month, `$${mPays.toLocaleString()}`, `$${mPurs.toLocaleString()}`, `$${delta.toLocaleString()}`];
  });

  autoTable(doc, {
    startY: y,
    head: [['Month', 'Payments Received ($)', 'Purchases ($)', 'Net Cash Movement ($)']],
    body: monthlyRows,
    theme: 'striped',
    headStyles: { fillColor: [3, 34, 95], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, font: 'helvetica' },
    margin: { left: 40, right: 40 },
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // Project Activity in Year Table
  doc.setTextColor(3, 34, 95);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Project Financial Activity in ${year}`, 40, y);
  y += 6;

  const projectRows = projects.map(p => {
    const pPurchases = validPurchases.filter(pur => pur.projectId === p.projectId).reduce((s, pur) => s + pur.totalAmount, 0);
    const pPayments = validPayments.filter(pay => pay.projectId === p.projectId).reduce((s, pay) => s + pay.amount, 0);
    const pNet = pPayments - pPurchases;
    const contract = p.contractValue + p.approvedChangeOrders;
    return [p.projectName, p.clientName, p.status, `$${contract.toLocaleString()}`, `$${pPayments.toLocaleString()}`, `$${pPurchases.toLocaleString()}`, `$${pNet.toLocaleString()}`];
  });

  autoTable(doc, {
    startY: y,
    head: [['Project Name', 'Client', 'Status', 'Total Contract', `Payments (${year})`, `Purchases (${year})`, 'Net Cash Delta']],
    body: projectRows,
    theme: 'striped',
    headStyles: { fillColor: [5, 74, 198], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, font: 'helvetica' },
    margin: { left: 40, right: 40 },
  });

  // Footer Note
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `MyProjectTrace Financial Report — Annual Summary ${year} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'center' }
    );
  }

  const cleanCompanyName = company.companyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${cleanCompanyName}_Annual_Financial_Summary_${year}.pdf`);
}

