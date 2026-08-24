import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../common/BrandLogo';
import { 
  Building, Mail, Lock, User, ArrowRight, 
  ShieldCheck, AlertCircle, Eye, EyeOff, Sparkles, CheckCircle2 
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const {
    signInWithEmail,
    signUpWithEmail,
    enterDemoMode,
    authError,
    clearAuthError,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tradeType, setTradeType] = useState('REMODELER');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, fullName, companyName, tradeType);
      }
    } catch {
      // Handled in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="bg-[#03225F] border-b border-[#054AC6] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <BrandLogo size="md" variant="light" showSubtitle={false} />
          
          <button
            onClick={enterDemoMode}
            className="text-xs bg-white/10 hover:bg-white/20 text-[#7FA0D4] hover:text-white px-3.5 py-1.5 rounded-lg border border-white/15 transition-colors font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#7FA0D4]" />
            Explore Interactive Demo
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Card Header with Navy Gradient */}
          <div className="bg-[#03225F] p-6 sm:p-7 text-white text-center border-b border-[#054AC6]">
            <div className="flex justify-center mb-3">
              <BrandLogo size="lg" variant="light" showSubtitle />
            </div>
            <p className="text-xs text-[#7FA0D4] max-w-xs mx-auto mt-1 font-medium">
              Contractor Project Financial Capture & Early Warning System
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                clearAuthError();
              }}
              className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
                mode === 'signin'
                  ? 'border-[#054AC6] text-[#03225F] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In to Workspace
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                clearAuthError();
              }}
              className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
                mode === 'signup'
                  ? 'border-[#054AC6] text-[#03225F] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Company Account
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {authError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{authError}</span>
              </div>
            )}

            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mike Rodriguez"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company / Contracting Business Name
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Remodeling & Trades LLC"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Trade / Specialty
                  </label>
                  <select
                    value={tradeType}
                    onChange={(e) => setTradeType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] focus:border-transparent bg-white text-slate-700"
                  >
                    <option value="GENERAL_CONTRACTOR">General Contractor</option>
                    <option value="REMODELER">Kitchen & Bath Remodeler</option>
                    <option value="PAINTER">Painting Contractor</option>
                    <option value="ELECTRICIAN">Electrical Contractor</option>
                    <option value="PLUMBER">Plumbing Contractor</option>
                    <option value="HVAC">HVAC Contractor</option>
                    <option value="FLOORING">Flooring & Tile</option>
                    <option value="OTHER">Other Specialty Trade</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="contractor@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'signup' && (
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Must be at least 6 characters.
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-[#054AC6] hover:bg-[#03225F] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <span>Please wait...</span>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In' : 'Create Company Workspace'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Quick Demo Option */}
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={enterDemoMode}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#054AC6]" />
                Explore Demo Mode (5 Realistic Trade Scenarios)
              </button>
            </div>

            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Multi-Tenant Firestore Isolation & Role-Based Access Control</span>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#03225F]">MyProjectTrace</span>
            <span className="text-slate-300">•</span>
            <span>Project Financial Capture & Early Warning System</span>
          </div>
          <a
            href="https://myprojecttrace.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#054AC6] hover:underline font-medium"
          >
            myprojecttrace.com
          </a>
        </div>
      </footer>
    </div>
  );
};
