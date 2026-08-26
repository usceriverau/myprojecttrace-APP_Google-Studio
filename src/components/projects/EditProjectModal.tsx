import React, { useState } from 'react';
import { Project } from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { X, Building, DollarSign, Calendar, MapPin, User, AlertCircle, CheckCircle2, Trash2, Loader2, Phone, Mail, ChevronDown, ChevronUp } from 'lucide-react';

interface EditProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  project,
  isOpen,
  onClose,
  onDeleted,
}) => {
  const { updateProject, deleteProject, clients } = useProjects();

  const initialClient = clients.find(c => c.clientId === project.clientId || c.clientName.toLowerCase() === project.clientName.toLowerCase());

  const [projectName, setProjectName] = useState(project.projectName);
  const [clientName, setClientName] = useState(project.clientName);
  const [clientId, setClientId] = useState<string | undefined>(project.clientId);
  const [clientPhone, setClientPhone] = useState(initialClient?.phone || '');
  const [clientEmail, setClientEmail] = useState(initialClient?.email || '');
  const [clientNotes, setClientNotes] = useState(initialClient?.notes || '');
  const [isContactExpanded, setIsContactExpanded] = useState(Boolean(initialClient?.phone || initialClient?.email || initialClient?.notes));
  const [projectAddress, setProjectAddress] = useState(project.projectAddress);
  const [contractValue, setContractValue] = useState(String(project.contractValue));
  const [approvedChangeOrders, setApprovedChangeOrders] = useState(String(project.approvedChangeOrders || 0));
  const [startDate, setStartDate] = useState(project.startDate);
  const [status, setStatus] = useState<'ACTIVE' | 'ON_HOLD' | 'COMPLETED'>(project.status);
  const [notes, setNotes] = useState(project.notes || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Save / Delete State Management
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'DELETING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

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
    if (saveStatus === 'SAVING' || saveStatus === 'DELETING') return;
    setSaveStatus('IDLE');
    setErrorMessage(null);
    setIsConfirmingDelete(false);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || saveStatus === 'SAVING' || saveStatus === 'DELETING') return;

    setSaveStatus('SAVING');
    setErrorMessage(null);

    try {
      await updateProject(
        project.projectId,
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
        handleClose();
      }, 400);
    } catch (err: any) {
      console.error('[MyProjectTrace] Failed to update project:', err);
      setSaveStatus('ERROR');
      setErrorMessage(err.message || "We couldn't save this project. Please check your connection and try again.");
    }
  };

  const handleDelete = async () => {
    if (saveStatus === 'SAVING' || saveStatus === 'DELETING') return;

    setSaveStatus('DELETING');
    setErrorMessage(null);

    try {
      await deleteProject(project.projectId);
      setSaveStatus('SUCCESS');
      setTimeout(() => {
        handleClose();
        if (onDeleted) onDeleted();
      }, 300);
    } catch (err: any) {
      console.error('[MyProjectTrace] Failed to delete project:', err);
      setSaveStatus('ERROR');
      setErrorMessage(err.message || "We couldn't delete this project. Please check your connection and try again.");
      setIsConfirmingDelete(false);
    }
  };

  const isBusy = saveStatus === 'SAVING' || saveStatus === 'DELETING';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-[#03225F] text-white flex items-center justify-between border-b border-[#054AC6]">
          <div className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-[#7FA0D4]" />
            <h2 className="font-bold text-lg">Edit Project Details</h2>
          </div>
          <button
            id="close-edit-modal"
            type="button"
            onClick={handleClose}
            disabled={isBusy}
            className="text-slate-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banners */}
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

        {/* Delete Confirmation Alert */}
        {isConfirmingDelete ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
                <Trash2 className="w-4 h-4" />
                <span>Confirm Project Deletion</span>
              </div>
              <p>
                Are you sure you want to delete <strong>{project.projectName}</strong>? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isBusy}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isBusy}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saveStatus === 'DELETING' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Project</span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Edit Form */
          <form onSubmit={handleSave} className="p-6 space-y-4 text-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Project Name *
              </label>
              <input
                id="edit-input-project-name"
                type="text"
                disabled={isBusy}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#054AC6] disabled:bg-slate-50"
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
                    id="edit-input-client-name"
                    type="text"
                    list="edit-clients-datalist"
                    disabled={isBusy}
                    value={clientName}
                    onChange={(e) => handleClientNameChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#054AC6] disabled:bg-slate-50"
                  />
                  <datalist id="edit-clients-datalist">
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
                    id="edit-toggle-client-contact-fields"
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
                        <span>+ Edit Contact Info (Phone, Email, Notes)</span>
                      </>
                    )}
                  </button>
                  {(clientPhone || clientEmail || clientNotes) && !isContactExpanded && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Contact info active
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Project Status
                </label>
                <select
                  value={status}
                  disabled={isBusy}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#054AC6] bg-white disabled:bg-slate-50"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
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
                        id="edit-input-client-phone"
                        type="tel"
                        disabled={isBusy}
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
                        id="edit-input-client-email"
                        type="email"
                        disabled={isBusy}
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
                    id="edit-input-client-notes"
                    type="text"
                    disabled={isBusy}
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
                  id="edit-input-address"
                  type="text"
                  disabled={isBusy}
                  value={projectAddress}
                  onChange={(e) => setProjectAddress(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#054AC6] disabled:bg-slate-50"
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
                    id="edit-input-contract-value"
                    type="number"
                    disabled={isBusy}
                    step="0.01"
                    min="0"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#054AC6] disabled:bg-slate-50"
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
                    id="edit-input-change-orders"
                    type="number"
                    disabled={isBusy}
                    step="0.01"
                    min="0"
                    value={approvedChangeOrders}
                    onChange={(e) => setApprovedChangeOrders(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#054AC6] disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Project Scope & Notes
              </label>
              <textarea
                id="edit-input-notes"
                rows={2}
                disabled={isBusy}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#054AC6] disabled:bg-slate-50"
              />
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isBusy}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  id="cancel-edit-btn"
                  type="button"
                  onClick={handleClose}
                  disabled={isBusy}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  id="submit-edit-btn"
                  type="submit"
                  disabled={isBusy}
                  className="px-5 py-2 text-xs font-bold bg-[#054AC6] hover:bg-[#03225F] text-white rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {saveStatus === 'SAVING' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
