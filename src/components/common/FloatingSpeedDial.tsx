import React, { useState } from 'react';
import { 
  Plus, 
  Camera, 
  CreditCard, 
  Film, 
  X, 
  Sparkles,
  Receipt,
  ArrowUpRight
} from 'lucide-react';

interface FloatingSpeedDialProps {
  onCaptureReceipt: () => void;
  onCapturePayment: () => void;
  onCaptureProgressMedia: () => void;
}

export const FloatingSpeedDial: React.FC<FloatingSpeedDialProps> = ({
  onCaptureReceipt,
  onCapturePayment,
  onCaptureProgressMedia,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <>
      {/* Backdrop overlay when open */}
      {isOpen && (
        <div
          id="speed-dial-backdrop"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        />
      )}

      {/* Speed Dial Container */}
      <div 
        id="floating-speed-dial-container"
        className="fixed bottom-20 right-4 sm:bottom-22 sm:right-8 z-40 flex flex-col items-end gap-2.5 select-none"
      >
        {/* Speed Dial Menu Items */}
        {isOpen && (
          <div className="flex flex-col items-end gap-2.5 mb-1 animate-in slide-in-from-bottom-3 duration-200">
            
            {/* Action 1: Jobsite Progress Media */}
            <div className="flex items-center gap-2.5">
              <span className="bg-slate-900/90 text-white text-sm font-bold px-3.5 py-1.5 rounded-xl shadow-md border border-slate-700 whitespace-nowrap">
                Jobsite Media & Progress
              </span>
              <button
                id="speed-dial-progress-media-btn"
                type="button"
                onClick={() => handleAction(onCaptureProgressMedia)}
                className="w-12 h-12 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                title="Capture jobsite progress photo or walkthrough video"
              >
                <Film className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Action 2: Collections & Payments */}
            <div className="flex items-center gap-2.5">
              <span className="bg-slate-900/90 text-white text-sm font-bold px-3.5 py-1.5 rounded-xl shadow-md border border-slate-700 whitespace-nowrap">
                Collections & Payments
              </span>
              <button
                id="speed-dial-capture-payment-btn"
                type="button"
                onClick={() => handleAction(onCapturePayment)}
                className="w-12 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                title="Capture customer check, bank transfer, or payment deposit proof"
              >
                <CreditCard className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Action 3: AI OCR Receipt Capture */}
            <div className="flex items-center gap-2.5">
              <span className="bg-slate-900/90 text-white text-sm font-bold px-3.5 py-1.5 rounded-xl shadow-md border border-slate-700 whitespace-nowrap">
                AI OCR Receipt Capture
              </span>
              <button
                id="speed-dial-capture-receipt-btn"
                type="button"
                onClick={() => handleAction(onCaptureReceipt)}
                className="w-12 h-12 rounded-2xl bg-[#054AC6] hover:bg-[#03225F] text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                title="AI OCR Receipt scanning & itemized expense logging"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
            </div>

          </div>
        )}

        {/* Main Floating Trigger Button */}
        <button
          id="main-floating-action-btn"
          type="button"
          aria-label={isOpen ? "Close Quick Capture Menu" : "Open Quick Capture Menu"}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center text-white transition-all cursor-pointer border-2 border-white/20 active:scale-95 ${
            isOpen
              ? 'bg-slate-800 rotate-45 shadow-slate-900/40'
              : 'bg-[#054AC6] hover:bg-[#03225F] shadow-blue-900/40 hover:scale-105'
          }`}
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      </div>
    </>
  );
};
