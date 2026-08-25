import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import dotenv from 'dotenv';

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

const RECEIPT_ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    merchant_name: {
      type: Type.STRING,
      description: 'The store or merchant name (e.g. Home Depot, Lowes, Ferguson). Return null if not readable.',
      nullable: true,
    },
    transaction_date: {
      type: Type.STRING,
      description: 'Transaction date formatted as YYYY-MM-DD. Return null if not readable.',
      nullable: true,
    },
    receipt_number: {
      type: Type.STRING,
      description: 'Receipt, invoice, or transaction ID. Return null if not readable.',
      nullable: true,
    },
    subtotal: {
      type: Type.NUMBER,
      description: 'Subtotal before tax in USD. Return null if not readable.',
      nullable: true,
    },
    tax: {
      type: Type.NUMBER,
      description: 'Sales tax amount in USD. Return null if not readable.',
      nullable: true,
    },
    total: {
      type: Type.NUMBER,
      description: 'The grand total amount charged in USD. This is the single authority financial total. Return null if not readable.',
      nullable: true,
    },
    payment_method_last4: {
      type: Type.STRING,
      description: 'Payment method or last 4 digits of card if present (e.g. Visa 4242). Return null if not readable.',
      nullable: true,
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Confidence score from 0.0 to 1.0 based on readability and completeness.',
    },
    warnings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Array of warnings (e.g. "Low resolution", "Overlapping lines detected and deduplicated", "Total missing", "Blurry text").',
    },
    full_extracted_text: {
      type: Type.STRING,
      description: 'Concise summary of OCR text extracted from the receipt.',
      nullable: true,
    },
    raw_text_summary: {
      type: Type.STRING,
      description: 'Brief 1-sentence summary of the receipt purchase.',
      nullable: true,
    },
    items: {
      type: Type.ARRAY,
      description: 'List of purchased line items. Deduplicate any overlapping items across consecutive photos.',
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: 'Clean product description or item name.', nullable: true },
          sku: { type: Type.STRING, description: 'Store SKU or item barcode number.', nullable: true },
          product_code: { type: Type.STRING, description: 'Product or UPC code.', nullable: true },
          model_number: { type: Type.STRING, description: 'Manufacturer model number.', nullable: true },
          brand: { type: Type.STRING, description: 'Brand name (e.g. DeWalt, Kohler, Milwaukee).', nullable: true },
          manufacturer: { type: Type.STRING, description: 'Manufacturer name.', nullable: true },
          category: { type: Type.STRING, description: 'Trade material category (e.g. Lumber, Plumbing, Electrical, Fasteners).', nullable: true },
          color_name: { type: Type.STRING, description: 'Color name (e.g. Matte Black, Pure White).', nullable: true },
          color_code: { type: Type.STRING, description: 'Paint or material color code.', nullable: true },
          finish: { type: Type.STRING, description: 'Finish (e.g. Brushed Nickel, Satin).', nullable: true },
          size: { type: Type.STRING, description: 'Dimension or size (e.g. 2x4x8, 1/2 in x 10 ft).', nullable: true },
          dimensions: { type: Type.STRING, description: 'Full dimensions.', nullable: true },
          quantity: { type: Type.NUMBER, description: 'Quantity purchased.', nullable: true },
          unit: { type: Type.STRING, description: 'Unit of measure (e.g. EA, FT, BOX, LF, SQ FT).', nullable: true },
          unit_price: { type: Type.NUMBER, description: 'Price per unit in USD.', nullable: true },
          line_total: { type: Type.NUMBER, description: 'Total line item cost in USD.', nullable: true },
          raw_item_text: { type: Type.STRING, description: 'Short raw OCR line text.' },
          additional_specifications: {
            type: Type.ARRAY,
            description: 'Any additional key-value specifications extracted.',
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                value: { type: Type.STRING },
              },
              required: ['name', 'value'],
            },
          },
          source_page_numbers: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: '1-indexed page numbers where this item appeared.',
          },
          confidence: { type: Type.NUMBER, description: 'Confidence score for this line item (0.0 to 1.0).' },
        },
        required: ['source_page_numbers', 'confidence'],
      },
    },
  },
  required: [
    'confidence',
    'warnings',
    'items',
  ],
};

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
 * High-Performance Receipt Extraction Model Strategy:
 * Primary Model: gemini-3.7-flash (fast, highly accurate multimodal OCR)
 * Fallback Model: gemini-3.1-flash-lite (fast lightweight OCR)
 * Fallback 2: gemini-flash-latest
 */
async function generateReceiptContentWithFallback(
  ai: GoogleGenAI,
  promptParts: any[],
  schema: Schema
): Promise<{ text: string; modelUsed: string; aiProcessingMs: number }> {
  const startTime = Date.now();
  const candidateModels = [
    { name: 'gemini-3.7-flash', role: 'PRIMARY' },
    { name: 'gemini-3.1-flash-lite', role: 'FALLBACK' },
    { name: 'gemini-flash-latest', role: 'FALLBACK_2' },
  ];

  let lastError: any = null;

  for (const candidate of candidateModels) {
    // Try up to 2 attempts per candidate model to absorb momentary 503 demand spikes
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini Server] Executing analysis with '${candidate.name}' (${candidate.role}, attempt ${attempt})...`);
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
          console.log(`[Gemini Server] Successfully extracted data with '${candidate.name}' in ${duration}ms.`);
          return { 
            text, 
            modelUsed: candidate.name,
            aiProcessingMs: Date.now() - startTime,
          };
        }
      } catch (err: any) {
        lastError = err;
        const errMessage = err?.message || String(err);
        console.warn(`[Gemini Server] Model '${candidate.name}' (${candidate.role}, attempt ${attempt}) failed: ${errMessage}`);
        
        // If 404 (model deprecated/unavailable), don't retry same model
        if (errMessage.includes('404') || errMessage.includes('NOT_FOUND')) {
          break;
        }

        // If 503 / high demand spike on attempt 1, wait 600ms before attempt 2
        if (attempt === 1 && (errMessage.includes('503') || errMessage.includes('high demand') || errMessage.includes('UNAVAILABLE'))) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }
    }
  }

  throw lastError || new Error('Receipt analysis failed. We couldn\'t read this receipt. Please try again or enter the information manually.');
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
      // Each page can be passed as an image part (base64) or url
      const promptParts: any[] = [
        {
          text: `You are a high-speed financial receipt OCR engine for MyProjectTrace.
Analyze the attached receipt image(s) for a single purchase transaction.

CRITICAL INSTRUCTIONS:
1. One Transaction: All attached images belong to ONE purchase transaction (e.g. continuous slices of a receipt).
2. Deduplication: If photos overlap, deduplicate items so each item is listed only once.
3. Financial Totals: Extract merchant_name, transaction_date (YYYY-MM-DD), receipt_number, subtotal, tax, and final grand total amount.
4. Line Items: Extract each line item with description, SKU, quantity, unit, unit_price, line_total. Never invent data; use null if not visible.
5. Accuracy: Output valid JSON adhering strictly to the schema quickly and accurately.`,
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
        'gemini-3.7-flash',
        'gemini-3.6-flash',
        'gemini-flash-latest',
        'gemini-3.1-flash-lite',
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
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`[Luky Server] Generating response with '${modelName}' (attempt ${attempt})...`);
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
              break;
            }
          } catch (err: any) {
            lastError = err;
            const errMessage = err?.message || String(err);
            console.warn(`[Luky Server] Model '${modelName}' notice: ${errMessage}`);
            if ((errMessage.includes('503') || errMessage.includes('429')) && attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } else {
              break;
            }
          }
        }
        if (generatedJson) break;
      }

      if (!generatedJson) {
        throw lastError || new Error('Unable to process Luky request with available models.');
      }

      return res.json({
        success: true,
        data: generatedJson,
      });
    } catch (error: any) {
      console.error('[Luky Server] Error:', error);
      return res.status(500).json({
        error: error.message || 'Luky encountered an issue analyzing company data.',
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
