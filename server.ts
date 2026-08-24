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
    aiClient = new GoogleGenAI({ apiKey });
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
      description: 'Complete raw OCR text extracted across all receipt pages.',
    },
    raw_text_summary: {
      type: Type.STRING,
      description: 'Brief 1-2 sentence human summary of the receipt contents.',
    },
    items: {
      type: Type.ARRAY,
      description: 'List of individual line items purchased. Overlapping items across consecutive photos must be merged/deduplicated.',
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
          raw_item_text: { type: Type.STRING, description: 'Exact raw OCR text for this line.' },
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
        required: ['raw_item_text', 'source_page_numbers', 'confidence'],
      },
    },
  },
  required: [
    'confidence',
    'warnings',
    'full_extracted_text',
    'raw_text_summary',
    'items',
  ],
};

/**
 * Execute content generation with automated retry on 503 (high demand) and fallback cascade
 */
async function generateReceiptContentWithFallback(
  ai: GoogleGenAI,
  promptParts: any[],
  schema: Schema
): Promise<{ text: string; modelUsed: string }> {
  // Model priority list: try flagship flash first, followed by fast fallbacks
  const candidateModels = [
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];

  let lastError: any = null;

  for (const modelName of candidateModels) {
    // Try up to 2 attempts per model if transient 503 or 429 occurs
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini Server] Executing receipt analysis with '${modelName}' (attempt ${attempt})...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptParts,
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.1,
          },
        });

        const text = response.text?.trim();
        if (text) {
          console.log(`[Gemini Server] Successfully extracted receipt with model '${modelName}'.`);
          return { text, modelUsed: modelName };
        }
      } catch (err: any) {
        lastError = err;
        const errMessage = err?.message || String(err);
        console.warn(`[Gemini Server] Model '${modelName}' attempt ${attempt} notice: ${errMessage}`);

        const isTransient = 
          errMessage.includes('503') || 
          errMessage.includes('high demand') || 
          errMessage.includes('UNAVAILABLE') || 
          errMessage.includes('429') ||
          err?.status === 503 ||
          err?.status === 429;

        if (isTransient && attempt < 2) {
          // Wait briefly with jitter before retry
          const delayMs = attempt * 1200 + Math.floor(Math.random() * 400);
          console.log(`[Gemini Server] Transient spike detected; waiting ${delayMs}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          // Break to next candidate model in cascade
          break;
        }
      }
    }
  }

  throw lastError || new Error('All candidate Gemini models were unavailable due to high demand. Please try again.');
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
          text: `You are an expert construction & trade financial receipt OCR and analysis engine for MyProjectTrace.
Your task is to analyze the attached receipt image(s) for a single purchase transaction.

CRITICAL INSTRUCTIONS FOR MULTI-IMAGE & SINGLE-IMAGE RECEIPTS:
1. One Transaction Authority: All images provided belong to ONE single purchase transaction (e.g. a long physical receipt captured in multiple overlapping sequential photos, or multiple invoice pages).
2. Multi-Photo Overlap Detection & Deduplication:
   - When a receipt is photographed in sequential slices (Page 1, Page 2, Page 3), the bottom of Page 1 may overlap with the top of Page 2.
   - You MUST detect identical or overlapping line items across continuous pages and DEDUPLICATE them so each purchased item is listed ONLY ONCE.
   - Record all pages where an item appears in 'source_page_numbers' (e.g. [1, 2] if it overlaps across the boundary).
   - If overlap was detected and resolved, add an explanatory note in the 'warnings' array (e.g. "Overlapping items between Page 1 and Page 2 detected and deduplicated.").
3. Financial Total Extraction:
   - Extract the final grand total amount. This is the authoritative single amount counted in project expense totals.
   - Extract subtotal and tax if clearly visible.
   - If the total cannot be determined with certainty, set 'total' to null and add a warning.
4. Line Item Extraction:
   - Extract all purchased materials, tools, fasteners, plumbing/electrical fixtures, or supplies.
   - Separate SKU, product code, model, brand, dimensions/size, color, finish, quantity, unit, unit price, and line total.
   - NEVER invent or hallucinate data. If a specific attribute (e.g. color or SKU) is not present on the receipt, set it to null.
5. Accuracy & Confidence:
   - Set confidence (0.0 to 1.0) honestly based on image resolution, lighting, and legibility.
   - If text is blurry or partially cut off, add specific notes in 'warnings'.

Analyze all attached receipt pages sequentially and return the structured JSON output adhering strictly to the schema.`,
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

      const { text: responseText, modelUsed } = await generateReceiptContentWithFallback(
        ai,
        promptParts,
        RECEIPT_ANALYSIS_SCHEMA
      );

      const parsedAnalysis = JSON.parse(responseText);

      return res.json({
        success: true,
        purchaseId: purchaseId || null,
        analysis: parsedAnalysis,
        modelUsed,
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
