import React, { useState } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { X, Building, DollarSign, Calendar, MapPin, User, AlertCircle, CheckCircle2, Loader2, Phone, Mail, ChevronDown, ChevronUp } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose }) => {
  const { createProject, setSelectedProjectId, clients } = useProjects();

  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [isContactExpanded, setIsContactExpanded] = useState(false);
  const [projectAddress, setProjectAddress] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [approvedChangeOrders, setApprovedChangeOrders] = useState('0');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'ACTIVE' | 'ON_HOLD'>('ACTIVE');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Save State Management
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const parseNumeric = (val: string | number): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = val.replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!projectName.trim()) errs.projectName = 'Project name is required';
    if (!clientName.trim()) errs.clientName = 'Client name is required';
    if (!projectAddress.trim()) errs.projectAddress = 'Project address is required';
    const cVal = parseNumeric(contractValue);
    if (cVal <= 0) errs.contractValue = 'Please enter a valid contract value greater than 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleClose = () => {
    if (saveStatus === 'SAVING') return; // Prevent closing while save is in flight
    setSaveStatus('IDLE');
    setErrorMessage(null);
    onClose();
  };

  const handleClientNameChange = (val: string) => {
    setClientName(val);
    const matched = clients.find(c => c.clientName.toLowerCase() === val.trim().toLowerCase());
    if (matched) {
      setClientId(matched.clientId);
      if (matched.address && !projectAddress) {
        setProjectAddress(matched.address);
      }
      if (matched.phone) setClientPhone(matched.phone);
      if (matched.email) setClientEmail(matched.email);
      if (matched.notes) setClientNotes(matched.notes);
      if (matched.phone || matched.email || matched.notes) {
        setIsContactExpanded(true);
      }
    } else {
      setClientId(undefined);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || saveStatus === 'SAVING') return;

    setSaveStatus('SAVING');
    setErrorMessage(null);

    try {
      const created = await createProject(
        {
          projectName: projectName.trim(),
          clientName: clientName.trim(),
          clientId,
          projectAddress: projectAddress.trim(),
          contractValue: parseNumeric(contractValue),
          approvedChangeOrders: parseNumeric(approvedChangeOrders),
          startDate,
          status,
          notes: notes.trim() || undefined,
        },
        {
          address: projectAddress.trim() || undefined,
          phone: clientPhone.trim() || undefined,
          email: clientEmail.trim() || undefined,
          notes: clientNotes.trim() || undefined,
        }
      );

      setSaveStatus('SUCCESS');
      setTimeout(() => {
        setSelectedProjectId(created.projectId);
        handleClose();
      }, 400);
    } catch (err: any) {
      console.error('[MyProjectTrace] Failed to create project:', err);
      setSaveStatus('ERROR');
      setErrorMessage(err.message || "We couldn't save this project. Please check your connection and try again.");
    }
  };

  const isSaving = saveStatus === 'SAVING';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-[#03225F] text-white flex items-center justify-between border-b border-[#054AC6]">
          <div className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-[#7FA0D4]" />
            <h2 className="font-bold text-lg">New Contractor Project</h2>
          </div>
          <button
            id="close-create-modal"
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="text-slate-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Save Status Banners */}
        {saveStatus === 'ERROR' && errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Unable to save.</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {saveStatus === 'SUCCESS' && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">Saved successfully.</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Project Name *
            </label>
            <input
              id="input-project-name"
              type="text"
              disabled={isSaving}
              placeholder="e.g. Miller Master Bath Remodel"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#054AC6] focus:border-[#054AC6] disabled:bg-slate-50 disabled:text-slate-500"
            />
            {errors.projectName && <p className="text-xs text-rose-600 mt-1">{errors.projectName}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Client Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="input-client-name"
                  type="text"
                  list="clients-datalist"
                  disabled={isSaving}
                  placeholder="e.g. John Miller"
                  value={clientName}
                  onChange={(e) => handleClientNameChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#054AC6] disabled:bg-slate-50"
                />
                <datalist id="clients-datalist">
                  {clients.map(c => (
                    <option key={c.clientId} value={c.clientName}>
                      {c.address ? `${c.clientName} (${c.address})` : c.clientName}
                    </option>
                  ))}
                </datalist>
              </div>
              {errors.clientName && <p className="text-xs text-rose-600 mt-1">{errors.clientName}</p>}

              {/* Client Contact Info Collapsible Toggle */}
              <div className="mt-1.5 flex items-center justify-between">
                <button
                  id="toggle-client-contact-fields"
                  type="button"
                  onClick={() => setIsContactExpanded(!isContactExpanded)}
                  className="text-xs font-semibold text-[#054AC6] hover:text-[#03225F] flex items-center gap-1 transition-colors cursor-pointer py-0.5"
                >
                  {isContactExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Hide Contact Details</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>+ Add Contact Info (Phone, Email, Notes)</span>
                    </>
                  )}
                </button>
                {(clientPhone || clientEmail || clientNotes) && !isContactExpanded && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Contact info added
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="input-start-date"
                  type="date"
                  disabled={isSaving}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#054AC6] disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* Collapsible Client Contact Information Drawer */}
          {isContactExpanded && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Client Contact & Communication
                </span>
                <span className="text-[11px] text-slate-500">Optional</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Client Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="input-client-phone"
                      type="tel"
                      disabled={isSaving}
                      placeholder="(555) 123-4567"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#054AC6] disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Client Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="input-client-email"
                      type="email"
                      disabled={isSaving}
                      placeholder="client@example.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#054AC6] disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Client Notes / Preferences
                </label>
                <input
                  id="input-client-notes"
                  type="text"
                  disabled={isSaving}
                  placeholder="e.g. Primary homeowner, prefers text updates, gate code #1234"
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#054AC6] disabled:bg-slate-100"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Job Address *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="input-address"
                type="text"
                disabled={isSaving}
                placeholder="e.g. 520 NW Oak St, Portland, OR"
                value={projectAddress}
                onChange={(e) => setProjectAddress(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#054AC6] disabled:bg-slate-50"
              />
            </div>
            {errors.projectAddress && <p className="text-xs text-rose-600 mt-1">{errors.projectAddress}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Contract Value ($) *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="input-contract-value"
                  type="number"
                  disabled={isSaving}
                  step="0.01"
                  min="0"
                  placeholder="25000"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#054AC6] disabled:bg-slate-50"
                />
              </div>
              {errors.contractValue && <p className="text-xs text-rose-600 mt-1">{errors.contractValue}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Approved Changes ($)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="input-change-orders"
                  type="number"
                  disabled={isSaving}
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={approvedChangeOrders}
                  onChange={(e) => setApprovedChangeOrders(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#054AC6] disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Project Scope & Notes
            </label>
            <textarea
              id="input-notes"
              rows={2}
              disabled={isSaving}
              placeholder="Scope of work, trade specifications, special allowances..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#054AC6] disabled:bg-slate-50"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              id="cancel-create-btn"
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              id="submit-create-btn"
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 text-sm font-bold bg-[#054AC6] hover:bg-[#03225F] text-white rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Create Project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
