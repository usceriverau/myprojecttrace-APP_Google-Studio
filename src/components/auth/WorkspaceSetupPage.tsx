import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../common/BrandLogo';
import { Building, ArrowRight, ShieldCheck, AlertCircle, LogOut } from 'lucide-react';

export const WorkspaceSetupPage: React.FC = () => {
  const { createWorkspaceAfterAuth, logOut, authError, firebaseAuthUser } = useAuth();

  const [companyName, setCompanyName] = useState('');
  const [tradeType, setTradeType] = useState('GENERAL_CONTRACTOR');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    setSubmitting(true);
    try {
      await createWorkspaceAfterAuth(companyName.trim(), tradeType);
    } catch {
      // Handled in context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col justify-between font-sans">
      <header className="bg-[#03225F] border-b border-[#054AC6] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <BrandLogo size="md" variant="light" showSubtitle={false} />
          
          <button
            onClick={logOut}
            className="text-xs text-[#7FA0D4] hover:text-white flex items-center gap-1 font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-[#03225F] p-6 text-white text-center border-b border-[#054AC6]">
            <h2 className="text-xl font-bold tracking-tight">Complete Company Setup</h2>
            <p className="text-xs text-[#7FA0D4] mt-1">
              Signed in as <span className="font-semibold text-white">{firebaseAuthUser?.email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {authError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company / Business Name
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Remodeling & Trades LLC"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#054AC6]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Trade / Contracting Type
              </label>
              <select
                value={tradeType}
                onChange={(e) => setTradeType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#054AC6] bg-white text-slate-700"
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

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-[#054AC6] hover:bg-[#03225F] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Creating Workspace...' : 'Launch Company Workspace'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dedicated Firestore multi-tenant isolation initialized</span>
            </div>
          </form>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <span>MyProjectTrace — Project Financial Capture & Early Warning System</span>
        </div>
      </footer>
    </div>
  );
};
