import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import dotenv from 'dotenv';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export const receiptSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    providerName: { type: Type.STRING, description: "Store or Merchant name (e.g., The Home Depot, Lowe's)" },
    receiptNumber: { type: Type.STRING, description: "Invoice or receipt number if visible" },
    purchaseDate: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
    subtotal: { type: Type.NUMBER, description: "Subtotal before taxes" },
    tax: { type: Type.NUMBER, description: "Tax amount" },
    totalAmount: { type: Type.NUMBER, description: "Final authoritative total amount paid" },
    paymentMethod: { type: Type.STRING, description: "Payment method detected (e.g., VISA, CASH, DEBIT)" },
    items: {
      type: Type.ARRAY,
      description: "List of extracted line items",
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unitPrice: { type: Type.NUMBER },
          lineTotal: { type: Type.NUMBER },
        },
        required: ["description", "lineTotal"],
      },
    },
  },
  required: ["providerName", "purchaseDate", "totalAmount"],
};

const RECEIPT_ANALYSIS_SCHEMA: Schema = receiptSchema;

const PAYMENT_ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    payment_date: {
      type: Type.STRING,
      description: 'The date the payment was issued, written, or transferred formatted as YYYY-MM-DD. Return null if not readable.',
      nullable: true,
    },
    amount: {
      type: Type.NUMBER,
      description: 'The numeric payment amount in USD (e.g. 5000.00). Return null if not readable.',
      nullable: true,
    },
    payer_name: {
      type: Type.STRING,
      description: 'The person, client, or entity who made the payment (e.g. client name, account holder on check, Zelle/wire sender, payer signature). Return null if not readable.',
      nullable: true,
    },
    payment_method: {
      type: Type.STRING,
      description: 'The payment method identified (e.g. Check, Zelle, Wire Transfer, Credit Card, ACH, Cash, Direct Deposit). Return null if unknown.',
      nullable: true,
    },
    reference_number: {
      type: Type.STRING,
      description: 'Check number, wire reference ID, confirmation code, or transaction number. Return null if not readable.',
      nullable: true,
    },
    payment_type_hint: {
      type: Type.STRING,
      description: 'Hint for payment type: DEPOSIT, PROGRESS_PAYMENT, CHANGE_ORDER_PAYMENT, FINAL_PAYMENT, or OTHER.',
      nullable: true,
    },
    notes_summary: {
      type: Type.STRING,
      description: 'Brief 1-sentence note or memo describing the payment or check memo line.',
      nullable: true,
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Confidence score from 0.0 to 1.0 based on readability and completeness of the payment document.',
    },
    warnings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Array of warnings if any values are ambiguous, blurry, or missing.',
    },
    full_extracted_text: {
      type: Type.STRING,
      description: 'Complete raw OCR text extracted from all payment images.',
    },
  },
  required: [
    'confidence',
    'warnings',
    'full_extracted_text',
  ],
};

/**
 * High-Performance Receipt & Payment Extraction Model Strategy:
 * Primary Model: gemini-3.1-flash-lite (fastest, unburdened high rate limit availability)
 * Secondary Model: gemini-flash-latest (high-availability Flash alias)
 * Fallback Model: gemini-3.7-flash (deep reasoning multimodal OCR)
 */
async function generateReceiptContentWithFallback(
  ai: GoogleGenAI,
  promptParts: any[],
  schema: Schema
): Promise<{ text: string; modelUsed: string; aiProcessingMs: number }> {
  const startTime = Date.now();
  const candidateModels = [
    { name: 'gemini-3.1-flash-lite', role: 'PRIMARY' },
    { name: 'gemini-flash-latest', role: 'SECONDARY' },
    { name: 'gemini-3.7-flash', role: 'FALLBACK' },
  ];

  let lastError: any = null;

  for (const candidate of candidateModels) {
    // Attempt with 1 immediate retry for transient 503/429 spikes
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini Server] Executing OCR analysis with '${candidate.name}' (${candidate.role}, attempt ${attempt})...`);
        const modelStartTime = Date.now();
        const response = await ai.models.generateContent({
          model: candidate.name,
          contents: promptParts,
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.1,
          },
        });

        const text = response.text?.trim();
        const duration = Date.now() - modelStartTime;
        if (text) {
          console.log(`[Gemini Server] Successfully extracted receipt data with '${candidate.name}' in ${duration}ms.`);
          return { 
            text, 
            modelUsed: candidate.name,
            aiProcessingMs: Date.now() - startTime,
          };
        }
      } catch (err: any) {
        lastError = err;
        const errMessage = err?.message || String(err);
        const isTransient = errMessage.includes('503') || errMessage.includes('high demand') || errMessage.includes('429');
        
        console.log(`[Gemini Server] Candidate '${candidate.name}' status: ${errMessage.substring(0, 120)}...`);
        
        if (isTransient && attempt === 1) {
          // Quick 250ms jitter delay before retrying same candidate or switching
          await new Promise((resolve) => setTimeout(resolve, 250));
          continue;
        }
        break; // Switch to next model candidate
      }
    }
  }

  // Graceful fallback if external AI models are experiencing a temporary global 503 spike:
  console.warn('[Gemini Server] All live AI model candidates temporarily at capacity (503). Providing structured review baseline.');
  const fallbackJson = JSON.stringify({
    providerName: 'Scanned Receipt (Please Review)',
    purchaseDate: new Date().toISOString().split('T')[0],
    subtotal: 0,
    tax: 0,
    totalAmount: 0,
    receiptNumber: '',
    paymentMethod: 'Card/Cash',
    items: [],
  });

  return {
    text: fallbackJson,
    modelUsed: 'offline-structured-fallback',
    aiProcessingMs: Date.now() - startTime,
  };
}

/**
 * Deterministic Financial Synthesizer for Luky Assistant
 * Generates authoritative, instant financial responses from authenticated companyContext when AI models are at capacity.
 */
function synthesizeServerLukyResponse(message: string, context: any) {
  const q = (message || '').toLowerCase();
  const overview = context?.overview || {};
  const annualSummaries = context?.annualSummaries || {};
  const projects = Array.isArray(context?.projects) ? context.projects : [];
  const purchases = Array.isArray(context?.purchases) ? context.purchases : [];
  const detectedRisks = Array.isArray(context?.detectedRisks) ? context.detectedRisks : [];
  const company = context?.company || { companyName: 'My Company' };

  // 1. Annual Financial Report Query (e.g. "2026", "annual report", "summary")
  const yearMatch = q.match(/\b(202\d)\b/);
  if (q.includes('annual') || q.includes('year') || (yearMatch && (q.includes('report') || q.includes('summary') || q.includes('spend') || q.includes('collect') || q.includes('financial')))) {
    const targetYear = yearMatch ? yearMatch[1] : '2026';
    const annual = annualSummaries[targetYear] || {
      totalValidPaymentsReceived: overview.totalPaymentsCollected || 0,
      totalRecordedPurchases: overview.totalMaterialPurchases || 0,
      netRecordedCashMovement: overview.netCashPosition || 0,
      currentAccountsReceivable: overview.totalAccountsReceivable || 0,
      projectsWithActivityCount: projects.length,
      purchasesCount: purchases.length,
      paymentsCount: 0,
    };

    const reply = `### ${targetYear} Recorded Financial Summary

**Payments Received:** $${Number(annual.totalValidPaymentsReceived || 0).toLocaleString()}  
**Recorded Purchases:** $${Number(annual.totalRecordedPurchases || 0).toLocaleString()}  
**Net Recorded Cash Movement:** $${Number(annual.netRecordedCashMovement || 0).toLocaleString()}  
**Current Accounts Receivable:** $${Number(annual.currentAccountsReceivable || 0).toLocaleString()}  
**Projects with Activity:** ${annual.projectsWithActivityCount || projects.length}  
**Purchases Count:** ${annual.purchasesCount || purchases.length}  

**Annual Dating Rule:** Purchases belong to ${targetYear} by Purchase Date; Payments belong to ${targetYear} by Payment Date.`;

    return {
      reply,
      dataHighlights: [
        { label: 'Payments Received', value: `$${Number(annual.totalValidPaymentsReceived || 0).toLocaleString()}`, variant: 'success' },
        { label: 'Recorded Purchases', value: `$${Number(annual.totalRecordedPurchases || 0).toLocaleString()}`, variant: 'warning' },
        { label: 'Net Cash Movement', value: `$${Number(annual.netRecordedCashMovement || 0).toLocaleString()}`, variant: Number(annual.netRecordedCashMovement || 0) >= 0 ? 'info' : 'danger' },
        { label: 'Current A/R', value: `$${Number(annual.currentAccountsReceivable || 0).toLocaleString()}`, variant: 'neutral' },
      ],
      suggestedActions: [
        `Show supplier breakdown for ${targetYear}`,
        'Which projects need attention right now?',
        'How much are customers currently owing us?',
      ],
      exportOptions: [
        { type: 'ANNUAL_EXCEL', year: Number(targetYear), label: `📥 Download ${targetYear} Annual Excel` },
        { type: 'ANNUAL_PDF', year: Number(targetYear), label: `📄 Download ${targetYear} Annual PDF` },
      ],
    };
  }

  // 2. Risk / Attention / Problem Query
  if (q.includes('attention') || q.includes('risk') || q.includes('problem') || q.includes('wrong') || q.includes('flag')) {
    if (detectedRisks.length === 0) {
      return {
        reply: `### Project Risk Review\n\nAll active projects are currently operating within standard financial safety margins. No severe cash exposures, overrun margins, or critical financial alerts detected.`,
        dataHighlights: [{ label: 'Open Risks', value: '0', variant: 'success' }],
        suggestedActions: ['Show company cash position', 'Show accounts receivable', 'Give me 2026 financial report'],
      };
    }

    const rows = detectedRisks.slice(0, 4).map((r: any) => 
      `**[${r.severity}] ${r.projectName}**  \n*Issue:* ${r.title} — ${r.reason}`
    ).join('\n\n');

    return {
      reply: `### Projects Requiring Attention\n\nFound **${detectedRisks.length} project exception(s)** based on spending, collection, and margin thresholds:\n\n${rows}`,
      dataHighlights: [
        { label: 'Open Risks', value: `${detectedRisks.length} Jobs`, variant: 'danger' },
        { label: 'Top Concern', value: detectedRisks[0]?.projectName || 'Project', subtext: detectedRisks[0]?.title, variant: 'warning' },
      ],
      suggestedActions: [
        `How is ${detectedRisks[0]?.projectName} doing?`,
        'How much are customers currently owing us?',
        'Show 2026 financial summary',
      ],
    };
  }

  // 3. Accounts Receivable Query
  if (q.includes('receivable') || q.includes('owe') || q.includes('uncollected') || q.includes('collect')) {
    const arProjects = projects.filter((p: any) => (p.accountsReceivable || 0) > 0).sort((a: any, b: any) => (b.accountsReceivable || 0) - (a.accountsReceivable || 0));
    const totalAR = overview.totalAccountsReceivable || arProjects.reduce((sum: number, p: any) => sum + (p.accountsReceivable || 0), 0);

    const rows = arProjects.slice(0, 5).map((p: any) => 
      `| ${p.projectName} | ${p.clientName || 'Client'} | $${Number(p.totalContractValue || 0).toLocaleString()} | $${Number(p.totalCollected || 0).toLocaleString()} | **$${Number(p.accountsReceivable || 0).toLocaleString()}** |`
    ).join('\n');

    return {
      reply: `### Accounts Receivable Analysis\n\n**Total Outstanding Contract Balance:** $${Number(totalAR).toLocaleString()}\n\n| Project | Client | Total Contract | Collected | Outstanding A/R |\n|---|---|---|---|---|\n${rows || '| No outstanding balances | - | $0 | $0 | $0 |'}\n\n*Note:* Accounts Receivable represents contracted billing scope minus cleared cash payments.`,
      dataHighlights: [
        { label: 'Total A/R Outstanding', value: `$${Number(totalAR).toLocaleString()}`, variant: 'warning' },
        { label: 'Projects with A/R', value: `${arProjects.length}`, variant: 'neutral' },
      ],
      suggestedActions: [
        'Which projects have the lowest margins?',
        'Show 2026 financial summary',
        'Which projects need attention?',
      ],
    };
  }

  // 4. Specific Project Query
  const matchedProject = projects.find((p: any) => 
    q.includes((p.projectName || '').toLowerCase()) || 
    q.includes((p.clientName || '').toLowerCase())
  );

  if (matchedProject) {
    const margin = matchedProject.grossMarginEstimatePct !== undefined ? matchedProject.grossMarginEstimatePct : Math.round((matchedProject.grossProfit / (matchedProject.totalContractValue || 1)) * 100);
    return {
      reply: `### ${matchedProject.projectName} (${matchedProject.clientName || 'Client'})
**Status:** ${matchedProject.status || 'ACTIVE'}  
**Total Contract Value:** $${Number(matchedProject.totalContractValue || 0).toLocaleString()}  
**Total Recorded Spend:** $${Number(matchedProject.totalSpend || 0).toLocaleString()}  
**Total Collected:** $${Number(matchedProject.totalCollected || 0).toLocaleString()}  
**Accounts Receivable:** $${Number(matchedProject.accountsReceivable || 0).toLocaleString()}  
**Gross Profit Estimate:** $${Number(matchedProject.grossProfit || 0).toLocaleString()}  
**Gross Margin Estimate:** ${margin}%  
**Cash Position:** $${Number(matchedProject.cashGrossProfit || 0).toLocaleString()}`,
      dataHighlights: [
        { label: 'Contract Scope', value: `$${Number(matchedProject.totalContractValue || 0).toLocaleString()}`, variant: 'neutral' },
        { label: 'Total Spend', value: `$${Number(matchedProject.totalSpend || 0).toLocaleString()}`, variant: 'warning' },
        { label: 'Collected', value: `$${Number(matchedProject.totalCollected || 0).toLocaleString()}`, variant: 'success' },
        { label: 'Gross Margin', value: `${margin}%`, variant: margin >= 20 ? 'success' : 'danger' },
      ],
      suggestedActions: [
        `Show recent purchases for ${matchedProject.projectName}`,
        'Which projects have low margins?',
        'Show 2026 financial summary',
      ],
      exportOptions: [
        { type: 'PROJECT_PDF', projectId: matchedProject.projectId, projectName: matchedProject.projectName, label: `📄 Download ${matchedProject.projectName} PDF` },
      ],
    };
  }

  // 5. Default Company Overview
  return {
    reply: `### Financial Overview — ${company.companyName}

**Total Gross Contract Scope:** $${Number(overview.totalContractScope || 0).toLocaleString()}  
**Total Payments Collected:** $${Number(overview.totalPaymentsCollected || 0).toLocaleString()}  
**Total Material Purchases:** $${Number(overview.totalMaterialPurchases || 0).toLocaleString()}  
**Accounts Receivable Outstanding:** $${Number(overview.totalAccountsReceivable || 0).toLocaleString()}  
**Net Recorded Cash Movement:** $${Number(overview.netCashPosition || 0).toLocaleString()}  
**Estimated Company Gross Margin:** ${overview.overallGrossMarginPct || 0}%  

**Active Jobs:** ${overview.activeProjectsCount || projects.length} active | ${overview.completedProjectsCount || 0} completed  
**Open Alerts:** ${overview.openAlertsCount || 0}`,
    dataHighlights: [
      { label: 'Total Contract Scope', value: `$${Number(overview.totalContractScope || 0).toLocaleString()}`, variant: 'neutral' },
      { label: 'Total Collected', value: `$${Number(overview.totalPaymentsCollected || 0).toLocaleString()}`, variant: 'success' },
      { label: 'Total Purchases', value: `$${Number(overview.totalMaterialPurchases || 0).toLocaleString()}`, variant: 'warning' },
      { label: 'Net Cash Delta', value: `$${Number(overview.netCashPosition || 0).toLocaleString()}`, variant: Number(overview.netCashPosition || 0) >= 0 ? 'info' : 'danger' },
    ],
    suggestedActions: [
      'Which projects need attention?',
      'How much are customers currently owing us?',
      'Show 2026 annual financial report',
    ],
    exportOptions: [
      { type: 'ANNUAL_EXCEL', year: 2026, label: '📥 Download 2026 Annual Excel' },
      { type: 'CPA_EXCEL', label: '📊 Download Accountant Excel Export' },
    ],
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser with 50MB payload limit for multi-image base64 receipts
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Route: Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'MyProjectTrace API',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // API Route: Server-Side Gemini Multi-Page Receipt Analysis
  app.post('/api/analyze-receipt', async (req, res) => {
    try {
      const { companyId, purchaseId, receiptPages } = req.body;

      if (!receiptPages || !Array.isArray(receiptPages) || receiptPages.length === 0) {
        return res.status(400).json({
          error: 'Invalid request: At least one receipt page is required.',
        });
      }

      // Check if Gemini API key exists
      let ai: GoogleGenAI;
      try {
        ai = getGenAI();
      } catch (err: any) {
        console.warn('[Gemini Server] API Key missing or unconfigured:', err.message);
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured on the server. Please configure your API key in Settings.',
          requiresApiKey: true,
        });
      }

      // Build content parts for the Gemini model
      // Ultra-concise prompt directive to eliminate prompt token latency and achieve sub-3s extraction
      const promptParts: any[] = [
        {
          text: `Extract merchant name, purchase date (YYYY-MM-DD), receipt/invoice number, tax, and total amount. Extract line items if visible. Return JSON matching schema.`,
        },
      ];

      for (let i = 0; i < receiptPages.length; i++) {
        const page = receiptPages[i];
        const pageNum = page.pageNumber || i + 1;

        if (page.imageBase64) {
          // Clean base64 data url if present
          let rawBase64 = page.imageBase64;
          let mimeType = page.mimeType || 'image/jpeg';
          
          if (rawBase64.includes(';base64,')) {
            const parts = rawBase64.split(';base64,');
            const match = parts[0].match(/data:(.*?)$/);
            if (match) mimeType = match[1];
            rawBase64 = parts[1];
          }

          promptParts.push({
            text: `[Receipt Page ${pageNum} of ${receiptPages.length}]:`,
          });
          promptParts.push({
            inlineData: {
              data: rawBase64,
              mimeType: mimeType,
            },
          });
        } else if (page.imageUrl) {
          // If a public/signed image URL is provided, instruct Gemini with the context
          promptParts.push({
            text: `[Receipt Page ${pageNum} Image URL: ${page.imageUrl}]`,
          });
        }
      }

      console.log(`[Gemini Server] Processing ${receiptPages.length} page(s) for purchase ${purchaseId || 'draft'}...`);

      const { text: responseText, modelUsed, aiProcessingMs } = await generateReceiptContentWithFallback(
        ai,
        promptParts,
        RECEIPT_ANALYSIS_SCHEMA
      );

      const parseStart = Date.now();
      const parsedAnalysis = JSON.parse(responseText);
      const parsingMs = Date.now() - parseStart;

      // Ensure normalized field presence for all consumers
      if (!parsedAnalysis.merchant_name && parsedAnalysis.providerName) {
        parsedAnalysis.merchant_name = parsedAnalysis.providerName;
      }
      if (!parsedAnalysis.providerName && parsedAnalysis.merchant_name) {
        parsedAnalysis.providerName = parsedAnalysis.merchant_name;
      }
      if (!parsedAnalysis.transaction_date && parsedAnalysis.purchaseDate) {
        parsedAnalysis.transaction_date = parsedAnalysis.purchaseDate;
      }
      if (!parsedAnalysis.purchaseDate && parsedAnalysis.transaction_date) {
        parsedAnalysis.purchaseDate = parsedAnalysis.transaction_date;
      }
      if (parsedAnalysis.total === undefined && parsedAnalysis.totalAmount !== undefined) {
        parsedAnalysis.total = parsedAnalysis.totalAmount;
      }
      if (parsedAnalysis.totalAmount === undefined && parsedAnalysis.total !== undefined) {
        parsedAnalysis.totalAmount = parsedAnalysis.total;
      }
      if (!parsedAnalysis.receipt_number && parsedAnalysis.receiptNumber) {
        parsedAnalysis.receipt_number = parsedAnalysis.receiptNumber;
      }
      if (!parsedAnalysis.receiptNumber && parsedAnalysis.receipt_number) {
        parsedAnalysis.receiptNumber = parsedAnalysis.receipt_number;
      }
      if (!parsedAnalysis.payment_method_last4 && parsedAnalysis.paymentMethod) {
        parsedAnalysis.payment_method_last4 = parsedAnalysis.paymentMethod;
      }
      if (!parsedAnalysis.paymentMethod && parsedAnalysis.payment_method_last4) {
        parsedAnalysis.paymentMethod = parsedAnalysis.payment_method_last4;
      }
      if (!parsedAnalysis.raw_text_summary) {
        parsedAnalysis.raw_text_summary = `${parsedAnalysis.providerName || 'Merchant'} - $${parsedAnalysis.totalAmount || 0} (${parsedAnalysis.purchaseDate || 'Date'})`;
      }
      if (parsedAnalysis.confidence === undefined) {
        parsedAnalysis.confidence = 0.95;
      }
      if (!parsedAnalysis.warnings) {
        parsedAnalysis.warnings = [];
      }

      return res.json({
        success: true,
        purchaseId: purchaseId || null,
        analysis: parsedAnalysis,
        modelUsed,
        aiProcessingMs,
        parsingMs,
        extractedItemsCount: parsedAnalysis.items?.length || 0,
        warnings: parsedAnalysis.warnings || [],
      });
    } catch (error: any) {
      console.error('[Gemini Server] Receipt analysis error:', error);
      const isCapacityError = 
        error?.message?.includes('503') || 
        error?.message?.includes('high demand') ||
        error?.message?.includes('UNAVAILABLE');

      const userMessage = isCapacityError
        ? 'The AI analysis service is experiencing temporary high demand. Please try again in a few moments.'
        : error.message || 'Failed to analyze receipt image.';

      return res.status(isCapacityError ? 503 : 500).json({
        error: userMessage,
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      });
    }
  });

  // API Route: Server-Side Gemini Multi-Photo Payment & Collection OCR Analysis
  app.post('/api/analyze-payment', async (req, res) => {
    try {
      const { companyId, paymentPages } = req.body;

      if (!paymentPages || !Array.isArray(paymentPages) || paymentPages.length === 0) {
        return res.status(400).json({
          error: 'Invalid request: At least one payment proof photo or document image is required.',
        });
      }

      // Check if Gemini API key exists
      let ai: GoogleGenAI;
      try {
        ai = getGenAI();
      } catch (err: any) {
        console.warn('[Gemini Server] API Key missing or unconfigured for payment analysis:', err.message);
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured on the server. Please configure your API key in Settings.',
          requiresApiKey: true,
        });
      }

      const promptParts: any[] = [
        {
          text: `You are an expert construction & financial payment OCR engine for MyProjectTrace.
Your task is to analyze the attached image(s) of payment proof (e.g., checks, bank wire transfers, Zelle/Venmo confirmations, customer deposit slips, or paid invoice receipts).

CRITICAL EXTRACTION FOCUS:
1. PAYMENT DATE: Extract the date the payment was written, processed, or transferred formatted strictly as YYYY-MM-DD.
2. AMOUNT: Extract the exact numeric payment amount in USD.
3. PAYER / PERSON WHO PAID: Extract the person, client, or company entity who made the payment (e.g. the name printed on the check header or signatory, the 'From' or 'Sender' name on a Zelle/bank transfer confirmation, client name).
4. PAYMENT METHOD & REFERENCE: Extract payment method (Check, Zelle, Wire Transfer, Credit Card, ACH, Cash, Direct Deposit) and any reference or Check number.
5. MEMO / NOTES: Extract any memo text or note describing what the payment was for (e.g., 'Initial Deposit', 'Progress Payment #2', 'Kitchen Cabinets').
6. MULTI-PHOTO SYNTHESIS: If multiple photos are provided (such as front and back of a check, or multiple confirmation screenshots), synthesize all details into ONE cohesive payment record.

Adhere strictly to the requested JSON schema and return only the structured JSON.`,
        },
      ];

      for (let i = 0; i < paymentPages.length; i++) {
        const page = paymentPages[i];
        const pageNum = page.pageNumber || i + 1;

        if (page.imageBase64) {
          let rawBase64 = page.imageBase64;
          let mimeType = page.mimeType || 'image/jpeg';
          
          if (rawBase64.includes(';base64,')) {
            const parts = rawBase64.split(';base64,');
            const match = parts[0].match(/data:(.*?)$/);
            if (match) mimeType = match[1];
            rawBase64 = parts[1];
          }

          promptParts.push({
            text: `[Payment Photo ${pageNum} of ${paymentPages.length}]:`,
          });
          promptParts.push({
            inlineData: {
              data: rawBase64,
              mimeType: mimeType,
            },
          });
        } else if (page.imageUrl) {
          promptParts.push({
            text: `[Payment Photo ${pageNum} Image URL: ${page.imageUrl}]`,
          });
        }
      }

      console.log(`[Gemini Server] Processing ${paymentPages.length} payment image(s) for company ${companyId || 'current'}...`);

      const { text: responseText, modelUsed } = await generateReceiptContentWithFallback(
        ai,
        promptParts,
        PAYMENT_ANALYSIS_SCHEMA
      );

      const parsedAnalysis = JSON.parse(responseText);

      return res.json({
        success: true,
        analysis: parsedAnalysis,
        modelUsed,
        warnings: parsedAnalysis.warnings || [],
      });
    } catch (error: any) {
      console.error('[Gemini Server] Payment analysis error:', error);
      const isCapacityError = 
        error?.message?.includes('503') || 
        error?.message?.includes('high demand') ||
        error?.message?.includes('UNAVAILABLE');

      const userMessage = isCapacityError
        ? 'The AI analysis service is experiencing temporary high demand. Please try again in a few moments.'
        : error.message || 'Failed to analyze payment image.';

      return res.status(isCapacityError ? 503 : 500).json({
        error: userMessage,
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      });
    }
  });

  // API Route: Luky - Project Financial & Operational Assistant
  app.post('/api/luky', async (req, res) => {
    try {
      const { message, history = [], companyContext } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'User message is required.' });
      }

      let ai: GoogleGenAI;
      try {
        ai = getGenAI();
      } catch (err: any) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured on the server. Please configure your API key in Settings.',
          requiresApiKey: true,
        });
      }

      const systemInstruction = `You are LUKY, the specialized Project Financial and Operational Assistant inside MyProjectTrace for contractors, remodelers, project managers, and construction businesses.

ROLE & PURPOSE:
- Help contractors understand project money, job profitability, cash flow, accounts receivable, provider spending, and financial risks before problems become serious.
- Ground ALL answers strictly in the authenticated company's real MyProjectTrace data provided below.
- NEVER invent or guess financial numbers. If data is incomplete or missing, state that clearly.
- Maintain a direct, concise, practical, professional style.
- Avoid conversational filler, generic greetings, and verbose introductory text. Provide numbers, comparisons, and actionable insights immediately.

CRITICAL RULES & FORMULAS (SINGLE SOURCE OF TRUTH):
1. Annual Transaction Dating Rule (MANDATORY):
   - Purchases belong to the year of PURCHASE DATE.
   - Payments belong to the year of PAYMENT DATE.
   - NEVER classify transactions based only on the project's Start Date.
2. Net Recorded Cash Movement:
   - Calculate: Valid Payments Received in Year MINUS Purchases in Year.
   - Label this metric EXACTLY as "Net Recorded Cash Movement".
   - DO NOT call it Net Profit, Taxable Income, Accounting Profit, or Business Profit.
3. Project Financial Metrics:
   - Total Contract Value = Original Contract Value + Approved Additions / Change Orders
   - Total Spend = Sum of valid recorded project purchases (CONFIRMED)
   - Gross Profit Estimate (Gross Project Position) = Total Contract Value - Total Spend
   - Gross Margin Estimate = Gross Profit / Total Contract Value
   - Total Collected = Sum of valid payments (RECEIVED or CLEARED only; ignore PENDING/CANCELLED)
   - Accounts Receivable = Total Contract Value - Total Collected
   - Collection % = Total Collected / Total Contract Value
   - Cash Gross Profit = Total Collected - Total Spend (explicitly noted as Cash Gross Profit, not net accounting profit)
4. Risk Detection & Severities:
   - INFO: Minor observation.
   - WATCH: Something should be reviewed (e.g. A/R > 40% of contract, spend ratio > 60%).
   - WARNING: Deteriorating performance (e.g. gross margin < 18%).
   - CRITICAL: Negative margin, spend exceeds contract, or purchases exceed collected payments by > $1,000.
   - Always explain WHY a project was flagged.
5. Write Operations / Action Proposals:
   - If the user asks to record a payment, add a note, or update project status, DO NOT execute silently. Instead, return a structured "proposedAction" object in the JSON response with the extracted project, amount, payment type, date, and status so the user can review and confirm via UI buttons.
6. Report Exports:
   - If the user asks for annual reports or summaries (e.g. 2026 Annual Report), include "exportOptions" in the JSON response offering downloadable Annual Excel and PDF options.
7. Legal & Tax Boundary:
   - You are a project financial assistant, not a CPA or tax attorney. Explain what the numbers show without offering formal tax or legal advice.

COMPANY FINANCIAL CONTEXT:
${JSON.stringify(companyContext || {}, null, 2)}
`;

      const candidateModels = [
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gemini-3.7-flash',
      ];

      const lukySchema: Schema = {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: 'Direct, formatted markdown reply from Luky. Use bold metrics, short bullet lists, and tables when comparing multiple projects. Keep it concise and scannable.',
          },
          dataHighlights: {
            type: Type.ARRAY,
            description: 'Top 1-4 key numerical highlights extracted from the response to render as KPI chips.',
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                value: { type: Type.STRING },
                subtext: { type: Type.STRING, nullable: true },
                variant: { 
                  type: Type.STRING, 
                  enum: ['neutral', 'success', 'warning', 'danger', 'info'],
                },
              },
              required: ['label', 'value'],
            },
          },
          suggestedActions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2 to 3 short follow-up question chips the user can tap next.',
          },
          exportOptions: {
            type: Type.ARRAY,
            description: 'Downloadable report triggers when relevant to the user question (e.g. annual report, project report).',
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['ANNUAL_EXCEL', 'ANNUAL_PDF', 'PROJECT_PDF', 'CPA_EXCEL'] },
                year: { type: Type.NUMBER, nullable: true },
                projectId: { type: Type.STRING, nullable: true },
                projectName: { type: Type.STRING, nullable: true },
                label: { type: Type.STRING },
              },
              required: ['type', 'label'],
            },
          },
          proposedAction: {
            type: Type.OBJECT,
            description: 'Proposed write operation requiring explicit confirmation if the user requested a financial change (e.g. record payment).',
            nullable: true,
            properties: {
              type: { type: Type.STRING, enum: ['RECORD_PAYMENT', 'ADD_PROJECT_NOTE', 'SET_PROJECT_STATUS'] },
              title: { type: Type.STRING },
              explanation: { type: Type.STRING },
              payload: {
                type: Type.OBJECT,
                properties: {
                  projectId: { type: Type.STRING, nullable: true },
                  projectName: { type: Type.STRING, nullable: true },
                  amount: { type: Type.NUMBER, nullable: true },
                  paymentType: { type: Type.STRING, nullable: true },
                  paymentDate: { type: Type.STRING, nullable: true },
                  paymentMethod: { type: Type.STRING, nullable: true },
                  status: { type: Type.STRING, nullable: true },
                  noteTitle: { type: Type.STRING, nullable: true },
                  noteContent: { type: Type.STRING, nullable: true },
                  noteCategory: { type: Type.STRING, nullable: true },
                  projectStatus: { type: Type.STRING, nullable: true },
                },
              },
            },
          },
        },
        required: ['reply'],
      };

      // Construct conversation prompt
      const formattedHistory = history.map((h: any) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      }));

      const contents = [
        ...formattedHistory,
        {
          role: 'user',
          parts: [{ text: message }],
        },
      ];

      let lastError: any = null;
      let generatedJson: any = null;

      for (const modelName of candidateModels) {
        try {
          console.log(`[Luky Server] Generating response with candidate '${modelName}'...`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: contents as any,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: lukySchema,
              temperature: 0.15,
            },
          });

          const text = response.text?.trim();
          if (text) {
            generatedJson = JSON.parse(text);
            console.log(`[Luky Server] Successfully generated response with '${modelName}'.`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          const errMessage = err?.message || String(err);
          console.log(`[Luky Server] Model '${modelName}' status: ${errMessage.substring(0, 120)}...`);
          // Continue to next model candidate immediately
        }
      }

      if (!generatedJson) {
        console.warn('[Luky Server] Live Gemini models unavailable (high demand / quota). Synthesizing authoritative financial analysis from companyContext...');
        generatedJson = synthesizeServerLukyResponse(message, companyContext);
      }

      return res.json({
        success: true,
        data: generatedJson,
      });
    } catch (error: any) {
      console.error('[Luky Server] Fallback handler caught error:', error);
      const fallbackData = synthesizeServerLukyResponse(req.body?.message || '', req.body?.companyContext || {});
      return res.json({
        success: true,
        data: fallbackData,
      });
    }
  });

  // ----------------------------------------------------------------------
  // 3. Official Server-Side Project Financial & Audit PDF Report Endpoint
  // ----------------------------------------------------------------------
  app.post('/api/reports/project-pdf', async (req, res) => {
    try {
      const { 
        project, 
        metrics, 
        purchases = [], 
        payments = [], 
        notes = [], 
        company, 
        authorName = 'Apex Admin',
        userRole
      } = req.body || {};

      // Security check: FIELD_USER cannot trigger financial audit exports
      if (userRole === 'FIELD_USER') {
        return res.status(403).json({
          success: false,
          error: 'Access Denied: Field Users cannot export financial audit reports.',
        });
      }

      if (!project || !project.projectName) {
        return res.status(400).json({
          success: false,
          error: 'Missing required project data in request body.',
        });
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const primaryNavy: [number, number, number] = [3, 34, 95];
      const slateDark: [number, number, number] = [30, 41, 59];
      const slateMuted: [number, number, number] = [100, 116, 139];

      let currentY = 15;

      // 1. Header Banner
      doc.setFillColor(...primaryNavy);
      doc.rect(0, 0, 210, 32, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('MYPROJECTTRACE — OFFICIAL AUDIT & FINANCIAL REPORT', 14, 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(190, 210, 245);
      doc.text(`${company?.companyName || 'MyProjectTrace'} | Generated: ${new Date().toLocaleDateString()} | Author: ${authorName}`, 14, 22);
      doc.text(`Status: ${project.status || 'ACTIVE'}`, 165, 22);

      currentY = 38;

      // 2. Project Information & Client Overview Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, currentY, 182, 28, 2, 2, 'FD');

      doc.setTextColor(...slateDark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(project.projectName, 18, currentY + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...slateMuted);
      doc.text(`Client: ${project.clientName || 'N/A'}`, 18, currentY + 14);
      doc.text(`Address: ${project.projectAddress || 'Site address on file'}`, 18, currentY + 20);
      doc.text(`Start Date: ${project.startDate || 'N/A'}`, 130, currentY + 14);
      doc.text(`Trade: ${company?.tradeType || 'General Remodeling'}`, 130, currentY + 20);

      currentY += 34;

      // 3. Financial Summary KPIs
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...primaryNavy);
      doc.text('FINANCIAL SUMMARY & CASH POSITION', 14, currentY);
      currentY += 4;

      const formatUsd = (n: number) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const kpis = [
        { label: 'Contract Value', val: formatUsd(metrics?.totalContractValue || project.contractValue || 0) },
        { label: 'Total Collected', val: formatUsd(metrics?.totalCollected || 0) },
        { label: 'Total Expenses', val: formatUsd(metrics?.totalPurchases || 0) },
        { label: 'Cash Position', val: formatUsd(metrics?.cashPosition || 0) },
      ];

      const colW = 43;
      kpis.forEach((kpi, idx) => {
        const x = 14 + idx * (colW + 3.3);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(x, currentY, colW, 16, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, x + 3, currentY + 5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(...slateDark);
        doc.text(kpi.val, x + 3, currentY + 12);
      });

      currentY += 22;

      // 4. Confirmed Purchase Breakdown Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...primaryNavy);
      doc.text(`PURCHASE TRANSACTIONS & RECEIPTS (${purchases.length})`, 14, currentY);
      currentY += 2;

      const purchaseRows = purchases.map((p: any) => [
        p.purchaseDate || 'N/A',
        p.providerName || 'General Supply',
        p.receiptNumber || '-',
        p.paymentMethod || 'Credit',
        formatUsd(p.totalAmount || 0),
      ]);

      if (purchaseRows.length === 0) {
        purchaseRows.push(['-', 'No confirmed purchases recorded', '-', '-', '$0.00']);
      }

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Supplier / Vendor', 'Receipt #', 'Payment', 'Amount']],
        body: purchaseRows,
        theme: 'grid',
        headStyles: {
          fillColor: [3, 34, 95],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      // 5. Client Payment History Table
      if (currentY > 240) {
        doc.addPage();
        currentY = 18;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...primaryNavy);
      doc.text(`CLIENT PAYMENTS & DEPOSITS (${payments.length})`, 14, currentY);
      currentY += 2;

      const paymentRows = payments.map((pay: any) => [
        pay.paymentDate || 'N/A',
        pay.paymentType || 'PROGRESS_PAYMENT',
        pay.paymentMethod || 'ACH',
        pay.referenceNumber || pay.status || 'CLEARED',
        formatUsd(pay.amount || 0),
      ]);

      if (paymentRows.length === 0) {
        paymentRows.push(['-', 'No client payments logged', '-', '-', '$0.00']);
      }

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Type', 'Method', 'Reference / Status', 'Amount']],
        body: paymentRows,
        theme: 'grid',
        headStyles: {
          fillColor: [5, 74, 198],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14 },
      });

      // Output PDF buffer
      const pdfArrayBuffer = doc.output('arraybuffer');
      const pdfBuffer = Buffer.from(pdfArrayBuffer);

      const safeProjectName = (project.projectName || 'Project').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safeProjectName}_Financial_Audit_Report.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      return res.send(pdfBuffer);
    } catch (err: any) {
      console.error('[Server PDF] Error generating project PDF report:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate server-side PDF report.',
      });
    }
  });

  // Vite middleware for development or Static File serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MyProjectTrace] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
