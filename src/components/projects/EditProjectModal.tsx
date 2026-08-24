import React, { useState } from 'react';
import { Project } from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { X, Building, DollarSign, Calendar, MapPin, User, AlertCircle, CheckCircle2, Trash2, Loader2 } from 'lucide-react';

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
  const { updateProject, deleteProject } = useProjects();

  const [projectName, setProjectName] = useState(project.projectName);
  const [clientName, setClientName] = useState(project.clientName);
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

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!projectName.trim()) errs.projectName = 'Project name is required';
    if (!clientName.trim()) errs.clientName = 'Client name is required';
    if (!projectAddress.trim()) errs.projectAddress = 'Project address is required';
    const cVal = parseFloat(contractValue);
    if (isNaN(cVal) || cVal <= 0) errs.contractValue = 'Please enter a valid contract value greater than 0';
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || saveStatus === 'SAVING' || saveStatus === 'DELETING') return;

    setSaveStatus('SAVING');
    setErrorMessage(null);

    try {
      await updateProject(project.projectId, {
        projectName: projectName.trim(),
        clientName: clientName.trim(),
        projectAddress: projectAddress.trim(),
        contractValue: parseFloat(contractValue),
        approvedChangeOrders: parseFloat(approvedChangeOrders) || 0,
        startDate,
        status,
        notes: notes.trim() || undefined,
      });

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
                    disabled={isBusy}
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#054AC6] disabled:bg-slate-50"
                  />
                </div>
                {errors.clientName && <p className="text-xs text-rose-600 mt-1">{errors.clientName}</p>}
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
