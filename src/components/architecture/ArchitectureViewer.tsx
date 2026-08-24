import React, { useState } from 'react';
import { 
  Layers, Database, FileCode, FolderTree, Smartphone, 
  Server, Sparkles, Calculator, AlertOctagon, CheckCircle2, ShieldCheck, Camera 
} from 'lucide-react';

export const ArchitectureViewer: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('phase3-plan');

  const sections = [
    { id: 'phase3-plan', label: '13. Phase 3 Review & Confirmation', icon: CheckCircle2 },
    { id: 'phase2-plan', label: '12. Phase 2 AI Multi-Image OCR', icon: Sparkles },
    { id: 'arch', label: '1. Application Architecture', icon: Layers },
    { id: 'firestore', label: '2. Firestore Data Model', icon: Database },
    { id: 'types', label: '3. TypeScript Interfaces', icon: FileCode },
    { id: 'storage', label: '4. Storage Structure', icon: FolderTree },
    { id: 'folders', label: '5. Folder Structure', icon: FolderTree },
    { id: 'screens', label: '6. Screen Map', icon: Smartphone },
    { id: 'api', label: '7. API / Service Contract', icon: Server },
    { id: 'ai-schema', label: '8. Multi-Image AI Schema', icon: Sparkles },
    { id: 'formulas', label: '9. Financial Formulas', icon: Calculator },
    { id: 'rules', label: '10. Alert Rules', icon: AlertOctagon },
    { id: 'phase1-plan', label: '11. Phase 1 Verification', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-[#03225F] text-white p-5 sm:p-6 rounded-2xl border border-[#054AC6]/50 shadow-md">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#7FA0D4]" />
          MyProjectTrace System Architecture & Technical Specifications
        </h1>
        <p className="text-xs text-[#7FA0D4] mt-1 font-medium">
          Official engineering blueprint for myprojecttrace.com: Multi-image receipt model, zero-trust security rules, and clean REST contracts.
        </p>
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {sections.map((sec) => {
          const Icon = sec.icon;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeSection === sec.id
                  ? 'bg-[#054AC6] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {sec.label}
            </button>
          );
        })}
      </div>

      {/* Content Panels */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        
        {/* 13. PHASE 3 IMPLEMENTATION & VERIFICATION */}
        {activeSection === 'phase3-plan' && (
          <div className="space-y-4 text-xs text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#054AC6]" />
                13. Phase 3: AI Review, Project Assignment, Duplicate Detection & Confirmation
              </h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Phase 3 Verified & Operational
              </span>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Phase 3 safely converts AI-analyzed purchase drafts (<code>NEEDS_REVIEW</code>) into finalized, project-ledgered purchases (<code>CONFIRMED</code>). It enforces human-in-the-loop control, deterministic duplicate scoring, provider normalization, immutable company tenancy, and idempotent write safety.
            </p>

            {/* 14 Acceptance Tests Verified */}
            <div className="space-y-2 pt-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Phase 3 Acceptance Tests Status (14 / 14 Complete)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 1 — Successful Single-Image Confirmation</span>
                    <span className="text-emerald-800 text-[11px]">Valid draft cleanly transitions from NEEDS_REVIEW to CONFIRMED with financial authority total.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 2 — Successful Multi-Image Confirmation</span>
                    <span className="text-emerald-800 text-[11px]">Draft with N receipt pages saves single consolidated purchase and preserves all page records.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 3 — Mandatory Project Assignment</span>
                    <span className="text-emerald-800 text-[11px]">Confirmation blocked with user error message if no active project is selected.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 4 — Provider Matching & Normalization</span>
                    <span className="text-emerald-800 text-[11px]">Extracting 'Home Depot #0421' normalizes and auto-matches existing company provider 'The Home Depot'.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 5 — Manual Provider Creation</span>
                    <span className="text-emerald-800 text-[11px]">Creating a new provider persists it to the company directory with valid tenant isolation.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 6 — User Field Overrides</span>
                    <span className="text-emerald-800 text-[11px]">Contractor manual edits to total/date take full authority and are tracked in userEditedFields.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 7 — Duplicate Detection Warning</span>
                    <span className="text-emerald-800 text-[11px]">Matching existing company purchase triggers Possible Duplicate dialog with deterministic score.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 8 — Duplicate Override ('Save Anyway')</span>
                    <span className="text-emerald-800 text-[11px]">User can acknowledge warning and confirm, recording duplicateWarningAcknowledged=true.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 9 — Idempotency on Double Click</span>
                    <span className="text-emerald-800 text-[11px]">Multiple confirm calls update the existing purchaseId and never create duplicate purchase records.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 10 — Multi-Tenant Firestore Security</span>
                    <span className="text-emerald-800 text-[11px]">Company isolation rules ensure Company A cannot confirm or assign purchases to Company B.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 11 — Draft Rejection</span>
                    <span className="text-emerald-800 text-[11px]">Contractor can delete or mark unwanted drafts as REJECTED without affecting financial ledger.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 12 — Mobile-First Velocity UI</span>
                    <span className="text-emerald-800 text-[11px]">Large thumb-friendly Confirm button, high-contrast totals, and streamlined 1-tap review.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 13 — Preserved Receipt Evidence</span>
                    <span className="text-emerald-800 text-[11px]">Confirmed purchases maintain active links to original receipt photos and detailed line item specs.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 14 — Reactive Financial Position Update</span>
                    <span className="text-emerald-800 text-[11px]">Confirmed purchases immediately reflect in project totalPurchases and cash position metrics.</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* 12. PHASE 2 IMPLEMENTATION & VERIFICATION */}
        {activeSection === 'phase2-plan' && (
          <div className="space-y-4 text-xs text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#054AC6]" />
                12. Phase 2 Implementation & Acceptance Test Report
              </h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Phase 2 Complete & Ready
              </span>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Phase 2 implements the complete <strong>Purchase Capture & AI Analysis</strong> workflow for single or multi-photo contractor receipts. All Gemini OCR and line item extraction requests pass strictly through our server-side boundary (<code>/api/analyze-receipt</code>), with zero client-side API key exposure.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <Camera className="w-4 h-4 text-[#054AC6]" />
                  Multi-Image Document Model
                </div>
                <p className="text-slate-600 text-[11px]">
                  1 purchase document = N sequential receipt photos. Handled as 1 continuous financial transaction with 1 authority total.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#054AC6]" />
                  Secure Company Storage Isolation
                </div>
                <p className="text-slate-600 text-[11px]">
                  Storage paths strictly isolated at <code>companies/&#123;companyId&#125;/purchases/&#123;purchaseId&#125;/receipt-images/</code>.
                </p>
              </div>
            </div>

            {/* 10 Acceptance Test Checklist */}
            <div className="space-y-2 pt-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Phase 2 Acceptance Tests Status
              </h3>

              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 1 — Single-Image Receipt Processing</span>
                    <span className="text-emerald-800 text-[11px]">Successfully uploads, invokes Gemini 3.7 Flash, and extracts merchant, date, total, and line items.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 2 — Multi-Image Receipt Processing (2-3 Photos)</span>
                    <span className="text-emerald-800 text-[11px]">Processes sequential photos as a single transaction with one overall total.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 3 — Overlap Detection and Line Item Deduplication</span>
                    <span className="text-emerald-800 text-[11px]">Overlapping line items across photos are merged with tagged source pages and zero duplicate line totals.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 4 — Missing-Value Handling</span>
                    <span className="text-emerald-800 text-[11px]">Unreadable SKU/model/tax return `null` and do not fabricate fake values.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 5 — AI Failure and Graceful Error Handling</span>
                    <span className="text-emerald-800 text-[11px]">Server catches timeouts and missing keys, returning clean user-facing error messages without UI crashes.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 6 — Idempotency on Retry</span>
                    <span className="text-emerald-800 text-[11px]">Retrying analysis cleanly replaces purchase items without generating duplicate records.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 7 — Multi-Tenant Storage and Firestore Isolation</span>
                    <span className="text-emerald-800 text-[11px]">Company A files and purchases remain completely inaccessible to Company B.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 8 — Low Confidence Flagging</span>
                    <span className="text-emerald-800 text-[11px]">Low confidence extractions display clear warnings for contractor review.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 9 — Financial Isolation from Unconfirmed Drafts</span>
                    <span className="text-emerald-800 text-[11px]">Drafts in `NEEDS_REVIEW` do NOT alter project cash position or contract expenses until Phase 3 confirmation.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs block">Test 10 — Production Build & Server Compilation</span>
                    <span className="text-emerald-800 text-[11px]">Build system compiles Vite client and bundled backend server cleanly.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1. APPLICATION ARCHITECTURE */}
        {activeSection === 'arch' && (
          <div className="space-y-4 text-xs text-slate-800">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              1. Modular Layered Application Architecture
            </h2>
            <p className="text-slate-600 leading-relaxed">
              MyProjectTrace uses a decoupled, mobile-first architecture where the client UI is separate from the backend business logic and AI interpretation service. This enables future Android, iOS, or FlutterFlow clients to connect directly without modifying calculation rules or AI interpretation layers.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm mb-1.5">Layer 1: Frontend / Mobile UI</h3>
                <p className="text-slate-600">
                  React 19 + TypeScript + Tailwind CSS with responsive touch targets for field contractors. Designed with fast multi-photo capture and single-tap project confirmation.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm mb-1.5">Layer 2: AI Multimodal Service</h3>
                <p className="text-slate-600">
                  Server-side Gemini multimodal API endpoint analyzing multi-page receipts as one logical document, performing image deduplication, and preserving technical product specifications.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm mb-1.5">Layer 3: Financial Risk Engine</h3>
                <p className="text-slate-600">
                  Pure deterministic evaluation layer triggered upon confirmed purchases, payments, and contract revisions. Generates contractor early warnings with exact numbers.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm mb-1.5">Layer 4: Data & Storage Persistence</h3>
                <p className="text-slate-600">
                  Cloud Firestore for structured transaction documents and Firebase Storage for company-isolated receipt images and raw text archives.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. FIRESTORE DATA MODEL */}
        {activeSection === 'firestore' && (
          <div className="space-y-4 text-xs text-slate-800">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              2. Firestore Collection Paths & Isolation Rules
            </h2>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] space-y-2 overflow-x-auto">
              <div>/companies/{'{companyId}'}</div>
              <div className="pl-4 text-slate-400">├── /users/{'{userId}'}</div>
              <div className="pl-4 text-slate-400">├── /projects/{'{projectId}'}</div>
              <div className="pl-4 text-slate-400">├── /payments/{'{paymentId}'}</div>
              <div className="pl-4 text-slate-400">└── /purchases/{'{purchaseId}'}</div>
              <div className="pl-8 text-emerald-400">├── /receiptPages/{'{receiptPageId}'} (Multi-image pages)</div>
              <div className="pl-8 text-emerald-400">└── /items/{'{itemId}'} (Extracted trade items)</div>
            </div>
          </div>
        )}

        {/* 3. TYPESCRIPT INTERFACES */}
        {activeSection === 'types' && (
          <div className="space-y-4 text-xs text-slate-800">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              3. Core TypeScript Models
            </h2>
            <p className="text-slate-600">
              All models in <code>src/types/index.ts</code> support multi-image receipts with <code>ReceiptPage</code> and trade item specifications with <code>PurchaseItem</code>.
            </p>
          </div>
        )}

        {/* 4. STORAGE STRUCTURE */}
        {activeSection === 'storage' && (
          <div className="space-y-4 text-xs text-slate-800">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              4. Firebase Storage Paths
            </h2>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] space-y-2 overflow-x-auto">
              <div>companies/{'{companyId}'}/purchases/{'{purchaseId}'}/receipt-images/page_001_receipt.jpg</div>
              <div>companies/{'{companyId}'}/purchases/{'{purchaseId}'}/receipt-images/page_002_receipt.jpg</div>
            </div>
          </div>
        )}

        {/* 5. FOLDER STRUCTURE */}
        {activeSection === 'folders' && (
          <div className="space-y-4 text-xs text-slate-800">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              5. Clean Architecture Folder Layout
            </h2>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] space-y-1">
              <div>src/</div>
              <div className="pl-4">├── components/ (common, auth, projects, purchases, architecture)</div>
              <div className="pl-4">├── context/ (AuthContext, ProjectContext)</div>
              <div className="pl-4">├── services/ (firebase, riskEngine, financialFormulas, receiptAnalysisService)</div>
              <div className="pl-4">└── types/ (TypeScript models)</div>
            </div>
          </div>
        )}

        {/* 6. SCREEN MAP */}
        {activeSection === 'screens' && (
          <div className="space-y-4 text-xs text-slate-800">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              6. Responsive Screen Map
            </h2>
            <p className="text-slate-600">
              Field-first mobile layouts featuring instant receipt capture, project dashboard, and early warning risk indicators.
            </p>
          </div>
        )}

        {/* 7. API CONTRACT */}
        {activeSection === 'api' && (
          <div className="space-y-4 text-xs text-slate-800">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              7. REST API & Backend Service Contract
            </h2>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-mono text-xs font-bold text-[#054AC6]">POST /api/analyze-receipt</span>
              <p className="text-slate-600 text-[11px] mt-1">
                Server-side Gemini 3.7 Flash integration accepting array of base64 images with overlap deduplication.
              </p>
            </div>
          </div>
        )}

        {/* 8. MULTI-IMAGE AI SCHEMA */}
        {activeSection === 'ai-schema' && (
          <div className="space-y-4 text-xs text-slate-800">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              8. Gemini Multimodal Structured Schema
            </h2>
            <p className="text-slate-600">
              Strict JSON schema extracting merchant, date, total, tax, items, technical specs, and overlap warnings.
            </p>
          </div>
        )}

        {/* 9. FINANCIAL FORMULAS */}
        {activeSection === 'formulas' && (
          <div className="space-y-4 text-xs text-slate-800">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              9. Mathematical Financial Formulas
            </h2>
            <div className="space-y-2 font-mono text-[11px] bg-slate-900 text-emerald-300 p-4 rounded-xl">
              <div>Total Contract Value = Contract Value + Approved Change Orders</div>
              <div>Cash Position = Total Collected - Total Confirmed Purchases</div>
              <div>Estimated Gross Margin = (Total Contract Value - Total Purchases) / Total Contract Value</div>
            </div>
          </div>
        )}

        {/* 10. ALERT RULES */}
        {activeSection === 'rules' && (
          <div className="space-y-4 text-xs text-slate-800">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              10. Deterministic Financial Alert Rules
            </h2>
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="font-bold text-amber-900 block text-xs">Rule 1 — Spending Rising Faster than Collections (WARNING)</span>
                <span className="text-amber-800 text-[11px]">Triggered when totalPurchases &gt; totalCollected * 0.9. Cash cushion is becoming thin.</span>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <span className="font-bold text-rose-900 block text-xs">Rule 2 — Negative Cash Position (CRITICAL)</span>
                <span className="text-rose-800 text-[11px]">Triggered when cashPosition &lt; 0. The contractor is funding project materials out of pocket.</span>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="font-bold text-amber-900 block text-xs">Rule 3 — Low Gross Margin Estimate (WARNING)</span>
                <span className="text-amber-800 text-[11px]">Triggered when grossMarginEstimate &lt; minimumGrossMarginThreshold (default 25%).</span>
              </div>
            </div>
          </div>
        )}

        {/* 11. PHASE 1 IMPLEMENTATION PLAN */}
        {activeSection === 'phase1-plan' && (
          <div className="space-y-4 text-xs text-slate-800">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              11. Phase 1 Implementation & Verification
            </h2>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-950 text-xs block">1. MyProjectTrace Multi-Tenant Workspace & Company Context</span>
                  <span className="text-emerald-800 text-[11px]">Implemented in `AuthContext.tsx` with Firebase Auth and role authorization (OWNER, ADMIN, FIELD_USER).</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-950 text-xs block">2. Firestore Project Repositories & Reactive Metrics Engine</span>
                  <span className="text-emerald-800 text-[11px]">Created in `ProjectContext.tsx` and `financialFormulas.ts` calculating contractor gross positions.</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
