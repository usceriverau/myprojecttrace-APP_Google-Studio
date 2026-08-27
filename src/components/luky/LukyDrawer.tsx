import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../context/ProjectContext';
import { LukyMessage, LukyExportOption, LukyProposedAction } from '../../types';
import { askLuky } from '../../services/lukyService';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { LukyActionConfirmationModal } from './LukyActionConfirmationModal';
import { 
  Bot, Send, Sparkles, X, RotateCcw, Download, 
  FileSpreadsheet, FileText, AlertTriangle, CheckCircle2, 
  Info, DollarSign, TrendingUp, ShieldAlert, ArrowRight,
  Maximize2, Minimize2, Check, Mic, MicOff, Volume2, 
  Languages, Radio
} from 'lucide-react';

interface LukyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string | null;
}

const STORAGE_KEY_LUKY_MESSAGES = 'mpt_luky_chat_history';
const STORAGE_KEY_LUKY_VOICE_LANG = 'mpt_luky_speech_lang';
const STORAGE_KEY_LUKY_AUTO_SUBMIT = 'mpt_luky_auto_submit_voice';

export const LukyDrawer: React.FC<LukyDrawerProps> = ({
  isOpen,
  onClose,
  initialQuery,
}) => {
  const { currentCompany } = useAuth();
  const { 
    projects, 
    purchases, 
    payments, 
    alerts, 
    selectedProjectId,
    exportAnnualExcel,
    exportAnnualPdf,
    exportProjectPdf,
    exportCompanyCpaExcel
  } = useProjects();

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeProposedAction, setActiveProposedAction] = useState<LukyProposedAction | null>(null);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);
  const [exportingReportType, setExportingReportType] = useState<string | null>(null);

  // Voice Settings State
  const [speechLanguage, setSpeechLanguage] = useState<'en-US' | 'es-US'>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY_LUKY_VOICE_LANG) as 'en-US' | 'es-US') || 'en-US';
    } catch {
      return 'en-US';
    }
  });

  const [autoSubmitVoice, setAutoSubmitVoice] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_LUKY_AUTO_SUBMIT) === 'true';
    } catch {
      return false;
    }
  });

  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Initial greeting message
  const defaultInitialMessage: LukyMessage = {
    id: 'luky-welcome',
    role: 'assistant',
    content: `Hello, I am **Luky**, your Project Financial & Operational Assistant for **${currentCompany.companyName}**.

I answer questions strictly using your authenticated projects, verified purchases, and cleared payments.

**How can I help you today?**
- Review project profitability and gross margins
- Track accounts receivable and unpaid client balances
- Analyze annual financial summaries (by transaction date)
- Search supplier purchases and cost breakdowns
- Detect high-risk cash exposures and job anomalies`,
    timestamp: new Date().toISOString(),
    suggestedActions: [
      '2026 Annual Financial Summary',
      'Which projects need attention right now?',
      'How much are clients currently owing us?',
      'Which supplier received the most money?',
    ],
  };

  const [messages, setMessages] = useState<LukyMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LUKY_MESSAGES);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // Ignore parse error
    }
    return [defaultInitialMessage];
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice-to-Text Recognition Hook
  const {
    isSupported: isSpeechSupported,
    isListening,
    transcript: speechTranscript,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    setLanguage,
  } = useSpeechToText({
    defaultLanguage: speechLanguage,
    onTranscriptChange: (text) => {
      if (text) {
        setInputQuery(text);
      }
    },
    onFinalResult: (text) => {
      if (autoSubmitVoice && text.trim() && !isLoading) {
        handleSendMessage(text.trim());
        resetTranscript();
      }
    },
    onError: (err) => {
      setVoiceError(err);
    },
  });

  // Switch voice recognition language between English and Spanish
  const handleToggleLanguage = (lang: 'en-US' | 'es-US') => {
    setSpeechLanguage(lang);
    setLanguage(lang);
    try {
      localStorage.setItem(STORAGE_KEY_LUKY_VOICE_LANG, lang);
    } catch {}
  };

  // Toggle Auto-Submit preference
  const handleToggleAutoSubmit = () => {
    const nextVal = !autoSubmitVoice;
    setAutoSubmitVoice(nextVal);
    try {
      localStorage.setItem(STORAGE_KEY_LUKY_AUTO_SUBMIT, String(nextVal));
    } catch {}
  };

  // Ensure microphone terminates cleanly if drawer is closed
  useEffect(() => {
    if (!isOpen && isListening) {
      stopListening();
    }
  }, [isOpen, isListening, stopListening]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  // Handle auto query passed from parent component
  useEffect(() => {
    if (isOpen && initialQuery && initialQuery.trim()) {
      handleSendMessage(initialQuery.trim());
    }
  }, [isOpen, initialQuery]);

  // Save messages to local cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LUKY_MESSAGES, JSON.stringify(messages));
    } catch (e) {
      // Ignore
    }
  }, [messages]);

  const handleSendMessage = async (queryToSend?: string) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || isLoading) return;

    if (isListening) {
      stopListening();
    }

    setInputQuery('');
    resetTranscript();

    const userMessage: LukyMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const history: { role: 'user' | 'assistant'; content: string }[] = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));

      const response = await askLuky(text, history, {
        company: currentCompany,
        projects,
        purchases,
        payments,
        alerts,
        activeProjectId: selectedProjectId,
      });

      const assistantMessage: LukyMessage = {
        id: `luky-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
        dataHighlights: response.dataHighlights,
        suggestedActions: response.suggestedActions,
        exportOptions: response.exportOptions,
        proposedAction: response.proposedAction,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: LukyMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `I encountered an unexpected issue while retrieving data: ${error.message || 'Please check your connection and retry.'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([defaultInitialMessage]);
    try {
      localStorage.removeItem(STORAGE_KEY_LUKY_MESSAGES);
    } catch (e) {}
  };

  const handleTriggerExport = async (option: LukyExportOption) => {
    setExportingReportType(option.label);
    try {
      if (option.type === 'ANNUAL_EXCEL') {
        exportAnnualExcel(option.year || 2026);
      } else if (option.type === 'ANNUAL_PDF') {
        await exportAnnualPdf(option.year || 2026);
      } else if (option.type === 'PROJECT_PDF' && option.projectId) {
        await exportProjectPdf(option.projectId);
      } else if (option.type === 'CPA_EXCEL') {
        exportCompanyCpaExcel();
      }
    } catch (err: any) {
      console.error('Export trigger failed:', err);
    } finally {
      setExportingReportType(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        id="luky-drawer-backdrop"
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Main Drawer Container */}
      <div 
        id="luky-drawer-container"
        className={`fixed top-0 right-0 bottom-0 z-50 bg-white shadow-2xl flex flex-col transition-all duration-300 border-l border-slate-200 ${
          isExpanded ? 'w-full md:w-[750px] lg:w-[850px]' : 'w-full md:w-[500px]'
        }`}
      >
        {/* Header */}
        <div className="bg-[#03225F] p-4 text-white flex items-center justify-between border-b border-[#054AC6]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#054AC6] to-blue-500 flex items-center justify-center shadow-sm border border-[#7FA0D4]/30">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#03225F] rounded-full" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                  Luky
                  <span className="text-[10px] bg-blue-500/20 text-[#7FA0D4] font-semibold px-2 py-0.2 rounded-full border border-blue-400/30">
                    Financial Copilot
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-slate-300 truncate max-w-[240px]">
                {currentCompany.companyName} • Source of Truth Active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="luky-expand-toggle-button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse view' : 'Expand view'}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors hidden sm:block"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              id="luky-clear-chat-button"
              onClick={handleClearChat}
              title="Reset conversation"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              id="luky-close-drawer-button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Question Chips Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 overflow-x-auto scrollbar-none flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#054AC6]" />
            Quick:
          </span>
          <button
            onClick={() => handleSendMessage('2026 Annual Financial Summary')}
            className="text-xs font-semibold bg-white hover:bg-blue-50 text-slate-700 hover:text-[#054AC6] px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs whitespace-nowrap transition-colors"
          >
            📊 2026 Annual Report
          </button>
          <button
            onClick={() => handleSendMessage('Which projects need attention right now?')}
            className="text-xs font-semibold bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs whitespace-nowrap transition-colors"
          >
            ⚠️ High Risk Projects
          </button>
          <button
            onClick={() => handleSendMessage('How much are clients currently owing us?')}
            className="text-xs font-semibold bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs whitespace-nowrap transition-colors"
          >
            💰 Accounts Receivable
          </button>
          <button
            onClick={() => handleSendMessage('Which supplier received the most money this year?')}
            className="text-xs font-semibold bg-white hover:bg-blue-50 text-slate-700 hover:text-[#054AC6] px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs whitespace-nowrap transition-colors"
          >
            🛒 Top Supplier Spend
          </button>
        </div>

        {/* Success Toast for executed actions */}
        {actionSuccessToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-800 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccessToast}</span>
            </div>
            <button 
              onClick={() => setActionSuccessToast(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Chat Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.map((message) => {
            const isUser = message.role === 'user';

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[#03225F] flex items-center justify-center shrink-0 border border-[#054AC6]/30 shadow-xs mt-1">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className={`max-w-[88%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-[#054AC6] text-white rounded-tr-none'
                        : 'bg-white text-slate-900 border border-slate-200 rounded-tl-none'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap font-medium">{message.content}</p>
                    ) : (
                      <div className="prose prose-xs sm:prose-sm max-w-none text-slate-900 font-sans prose-headings:font-bold prose-headings:text-slate-900 prose-headings:mb-2 prose-p:my-1.5 prose-strong:text-slate-900 prose-table:my-2 prose-th:bg-slate-100 prose-th:p-1.5 prose-td:p-1.5 prose-th:text-xs prose-td:text-xs">
                        <Markdown>{message.content}</Markdown>
                      </div>
                    )}
                  </div>

                  {/* Highlights Cards (KPI Chips) */}
                  {!isUser && message.dataHighlights && message.dataHighlights.length > 0 && (
                    <div className="mt-2.5 grid grid-cols-2 gap-2 w-full">
                      {message.dataHighlights.map((hl, idx) => {
                        const variantStyles = {
                          success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
                          warning: 'bg-amber-50 border-amber-200 text-amber-900',
                          danger: 'bg-rose-50 border-rose-200 text-rose-900',
                          info: 'bg-blue-50 border-blue-200 text-blue-900',
                          neutral: 'bg-slate-100 border-slate-200 text-slate-900',
                        }[hl.variant || 'neutral'];

                        return (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-xl border ${variantStyles} flex flex-col justify-between`}
                          >
                            <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">
                              {hl.label}
                            </span>
                            <span className="text-sm font-black mt-0.5 tracking-tight">
                              {hl.value}
                            </span>
                            {hl.subtext && (
                              <span className="text-[10px] opacity-75 mt-0.5">
                                {hl.subtext}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Download / Export Action Triggers */}
                  {!isUser && message.exportOptions && message.exportOptions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2 w-full">
                      {message.exportOptions.map((opt, idx) => (
                        <button
                          key={idx}
                          disabled={exportingReportType === opt.label}
                          onClick={() => handleTriggerExport(opt)}
                          className="text-xs font-bold bg-white hover:bg-slate-50 text-[#054AC6] px-3 py-2 rounded-xl border border-blue-200 shadow-2xs flex items-center gap-2 transition-all hover:shadow-xs disabled:opacity-50"
                        >
                          {opt.type.includes('EXCEL') ? (
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          )}
                          <span>
                            {exportingReportType === opt.label ? 'Generating Report...' : opt.label}
                          </span>
                          <Download className="w-3 h-3 text-slate-400 ml-1" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Proposed Action Confirmation Card */}
                  {!isUser && message.proposedAction && (
                    <div className="mt-3 w-full bg-blue-50/80 border-2 border-[#054AC6]/30 rounded-2xl p-3.5 shadow-xs">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-black text-[#03225F] uppercase tracking-wider">
                          Proposed Action
                        </span>
                        <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.2 rounded-full">
                          Confirmation Required
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mb-1">
                        {message.proposedAction.title}
                      </h4>
                      <p className="text-xs text-slate-600 mb-3">
                        {message.proposedAction.explanation}
                      </p>
                      <button
                        onClick={() => setActiveProposedAction(message.proposedAction!)}
                        className="text-xs font-bold bg-[#054AC6] hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Review & Confirm Action</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Follow-up Suggested Actions */}
                  {!isUser && message.suggestedActions && message.suggestedActions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {message.suggestedActions.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(sug)}
                          className="text-[11px] font-semibold bg-white hover:bg-blue-50 text-slate-600 hover:text-[#054AC6] px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors text-left"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 items-center text-slate-500 text-xs animate-pulse p-2">
              <div className="w-7 h-7 rounded-xl bg-[#03225F] flex items-center justify-center border border-[#054AC6]/30">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#054AC6] animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-[#054AC6] animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-[#054AC6] animate-bounce [animation-delay:0.4s]" />
                <span className="font-semibold text-slate-600">Analyzing company data...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Real-time Voice Recording Live Banner */}
        {isListening && (
          <div 
            id="luky-voice-listening-banner"
            className="bg-gradient-to-r from-red-50 via-rose-50 to-blue-50 border-t border-b border-red-200 px-4 py-2.5 flex items-center justify-between gap-3 shadow-inner"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex items-center justify-center shrink-0">
                <span className="animate-ping absolute inline-flex h-5 w-5 rounded-full bg-red-400 opacity-75" />
                <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white relative shadow-xs">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-red-900 tracking-tight flex items-center gap-1.5">
                    <span>Listening in {speechLanguage === 'en-US' ? 'English (US)' : 'Español (US)'}</span>
                    <span className="inline-flex items-center gap-0.5">
                      <span className="w-1 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="w-1 h-4 bg-red-600 rounded-full animate-pulse [animation-delay:0.15s]" />
                      <span className="w-1 h-2 bg-red-500 rounded-full animate-pulse [animation-delay:0.3s]" />
                    </span>
                  </span>
                  {autoSubmitVoice && (
                    <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-sm">
                      Auto-send active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-red-700 font-medium truncate mt-0.5">
                  {speechTranscript ? `"${speechTranscript}"` : 'Speak your financial question clearly...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id="luky-voice-stop-button"
                onClick={stopListening}
                className="text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              >
                Done
              </button>
              {speechTranscript && (
                <button
                  type="button"
                  id="luky-voice-send-now-button"
                  onClick={() => handleSendMessage(speechTranscript)}
                  className="text-xs font-bold bg-[#054AC6] hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Send</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Voice Error Notification Toast */}
        {voiceError && (
          <div 
            id="luky-voice-error-toast"
            className="bg-amber-50 border-t border-b border-amber-200 px-4 py-2 text-xs font-medium text-amber-900 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">{voiceError}</span>
            </div>
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              className="text-amber-800 hover:text-amber-950 font-bold p-1 shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Native Voice-to-Text Microphone Button with Minimum 44px Touch Target */}
            <button
              type="button"
              id="luky-voice-input-button"
              onClick={toggleListening}
              title={
                !isSpeechSupported
                  ? 'Voice recognition is not supported in this browser'
                  : isListening
                  ? 'Listening... Click to stop speech capture'
                  : `Start voice input (${speechLanguage === 'en-US' ? 'English' : 'Español'})`
              }
              disabled={!isSpeechSupported || isLoading}
              className={`h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse ring-4 ring-red-400/40 shadow-sm border border-red-600'
                  : !isSpeechSupported
                  ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                  : 'bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-[#054AC6] border border-slate-300 active:scale-95 shadow-2xs'
              }`}
            >
              {isListening ? (
                <Mic className="w-5 h-5 text-white" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            <input
              ref={inputRef}
              id="luky-query-input-field"
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={
                isListening
                  ? 'Capturing speech in real-time...'
                  : 'Ask Luky about projects, spending, cash, margin, or annual reports...'
              }
              disabled={isLoading}
              className={`flex-1 bg-slate-50 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#054AC6] focus:border-transparent focus:outline-none transition-all placeholder:text-slate-400 h-11 ${
                isListening ? 'border-red-300 ring-1 ring-red-200 bg-red-50/20' : 'border-slate-300'
              }`}
            />

            <button
              type="submit"
              id="luky-send-query-button"
              disabled={!inputQuery.trim() || isLoading}
              className="bg-[#054AC6] hover:bg-blue-600 text-white h-11 min-h-[44px] px-3.5 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

          {/* Voice Language & Auto-Send Options Bar */}
          <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-100 px-1 text-[11px] text-slate-500">
            {/* Language Selector */}
            <div className="flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-600">Voice:</span>
              <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  id="luky-voice-lang-en"
                  onClick={() => handleToggleLanguage('en-US')}
                  className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-colors cursor-pointer ${
                    speechLanguage === 'en-US'
                      ? 'bg-[#054AC6] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  EN (US)
                </button>
                <button
                  type="button"
                  id="luky-voice-lang-es"
                  onClick={() => handleToggleLanguage('es-US')}
                  className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-colors cursor-pointer ${
                    speechLanguage === 'es-US'
                      ? 'bg-[#054AC6] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ES (US)
                </button>
              </div>
            </div>

            {/* Auto-Submit Checkbox Toggle */}
            <label 
              id="luky-voice-auto-submit-toggle"
              className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] sm:text-[11px] font-semibold text-slate-600 hover:text-[#054AC6] transition-colors"
            >
              <input
                type="checkbox"
                checked={autoSubmitVoice}
                onChange={handleToggleAutoSubmit}
                className="w-3.5 h-3.5 text-[#054AC6] rounded-xs border-slate-300 focus:ring-[#054AC6]"
              />
              <span>Auto-send on pause</span>
            </label>
          </div>

          <p className="text-[10px] text-slate-400 text-center mt-1.5">
            Luky grounds all calculations in company transaction records. Read-only by default.
          </p>
        </div>
      </div>

      {/* Proposed Action Confirmation Modal */}
      {activeProposedAction && (
        <LukyActionConfirmationModal
          action={activeProposedAction}
          projects={projects}
          isOpen={!!activeProposedAction}
          onClose={() => setActiveProposedAction(null)}
          onSuccess={(msg) => {
            setActionSuccessToast(msg);
            setMessages((prev) => [
              ...prev,
              {
                id: `act-${Date.now()}`,
                role: 'assistant',
                content: `Action executed successfully: **${msg}**`,
                timestamp: new Date().toISOString(),
              },
            ]);
          }}
        />
      )}
    </>
  );
};

