import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../common/BrandLogo';
import { 
  Lock, Mail, Building, User, Sparkles, 
  ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff, CheckCircle2 
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    signInWithEmail,
    signUpWithEmail,
    enterDemoMode,
    authError,
    clearAuthError,
    isFirebaseAvailable,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tradeType, setTradeType] = useState('REMODELER');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, fullName, companyName, tradeType);
      }
      onClose();
    } catch {
      // Error handled in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLaunch = () => {
    enterDemoMode();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Navy Brand Banner */}
        <div className="bg-[#03225F] p-6 text-white text-center relative border-b border-[#054AC6]">
          <div className="flex justify-center mb-2">
            <BrandLogo size="lg" variant="light" showSubtitle />
          </div>
          <p className="text-xs text-[#7FA0D4] max-w-xs mx-auto mt-1">
            Contractor project financial capture & early warning system
          </p>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#7FA0D4] hover:text-white text-xs font-semibold p-1 rounded"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-5 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                clearAuthError();
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-[#054AC6] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                clearAuthError();
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-[#054AC6] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Firebase Configuration Notice if not set */}
          {!isFirebaseAvailable && (
            <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Live Firebase is in setup mode</span>
                <span>Configure <code>VITE_FIREBASE_*</code> environment variables for production cloud persistence. You can explore all features right now with Demo Mode!</span>
              </div>
            </div>
          )}

          {/* Auth Error Banner */}
          {authError && (
            <div className="mb-4 p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{authError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Your Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mike Rodriguez"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Business Name</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Remodeling LLC"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Trade</label>
                  <select
                    value={tradeType}
                    onChange={(e) => setTradeType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
                  >
                    <option value="GENERAL_CONTRACTOR">General Contractor</option>
                    <option value="REMODELER">Kitchen & Bath Remodeler</option>
                    <option value="PAINTER">Painting & Finishing</option>
                    <option value="ELECTRICIAN">Electrical</option>
                    <option value="PLUMBER">Plumbing</option>
                    <option value="HVAC">HVAC & Mechanical</option>
                    <option value="FLOORING">Flooring & Tile</option>
                    <option value="OTHER">Specialty Trade</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="contractor@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#054AC6]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full mt-2 bg-[#054AC6] hover:bg-[#03225F] text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <span>Connecting to Firestore...</span>
              ) : mode === 'signin' ? (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Create Contractor Workspace</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Mode Launcher */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 mb-2 font-medium">
              Want to test the early warning system immediately?
            </p>
            <button
              type="button"
              onClick={handleDemoLaunch}
              className="w-full py-2 px-3 rounded-xl border border-[#7FA0D4]/40 bg-[#F4F7FB] hover:bg-slate-100 text-[#03225F] text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#054AC6]" />
              Launch Interactive Demo (5 Trade Jobs)
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted Multi-Tenant Firestore Isolation</span>
          </div>
        </div>
      </div>
    </div>
  );
};
