import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Palette, 
  FileText, 
  Key, 
  User, 
  CheckCircle2, 
  Pin, 
  Tag 
} from 'lucide-react';
import { NoteCategory, ColorCodeItem, ProjectNote } from '../../types';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  onSaveNote: (note: Omit<ProjectNote, 'noteId' | 'companyId' | 'createdAt' | 'projectId'>) => Promise<void>;
  editingNote?: ProjectNote | null;
}

export const AddNoteModal: React.FC<AddNoteModalProps> = ({
  isOpen,
  onClose,
  projectName,
  onSaveNote,
  editingNote,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<NoteCategory>('PAINT_COLOR');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [colorCodes, setColorCodes] = useState<ColorCodeItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill when editing
  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title);
      setCategory(editingNote.category);
      setContent(editingNote.content);
      setIsPinned(Boolean(editingNote.isPinned));
      setTagsInput(editingNote.tags?.join(', ') || '');
      setColorCodes(editingNote.colorCodes || []);
    } else {
      setTitle('');
      setCategory('PAINT_COLOR');
      setContent('');
      setIsPinned(false);
      setTagsInput('');
      setColorCodes([
        {
          name: 'Main Wall Paint',
          code: 'SW 7029',
          brand: 'Sherwin-Williams',
          finish: 'Eggshell',
          hexColor: '#E2DEC9',
        },
      ]);
    }
  }, [editingNote, isOpen]);

  if (!isOpen) return null;

  const handleAddColorItem = () => {
    setColorCodes((prev) => [
      ...prev,
      {
        name: '',
        code: '',
        brand: 'Sherwin-Williams',
        finish: 'Satin',
        hexColor: '#F4F4F5',
      },
    ]);
  };

  const handleUpdateColorItem = (index: number, field: keyof ColorCodeItem, value: string) => {
    setColorCodes((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const handleRemoveColorItem = (index: number) => {
    setColorCodes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a note title.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const cleanedColorCodes =
        category === 'PAINT_COLOR'
          ? colorCodes.filter((c) => c.name.trim() || c.code.trim())
          : undefined;

      await onSaveNote({
        title: title.trim(),
        category,
        content: content.trim(),
        isPinned,
        tags: tags.length > 0 ? tags : undefined,
        colorCodes: cleanedColorCodes && cleanedColorCodes.length > 0 ? cleanedColorCodes : undefined,
      });

      onClose();
    } catch (err: any) {
      console.error('Error saving project note:', err);
      setError(err?.message || 'Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 bg-[#03225F] text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-300" />
              <h2 className="text-base font-black tracking-tight">
                {editingNote ? 'Edit Project Note' : 'Add Note / Specifications'}
              </h2>
            </div>
            <p className="text-xs text-blue-100/80 mt-0.5">
              Project: <span className="font-semibold text-white">{projectName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
              {error}
            </div>
          )}

          {/* Title and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Note / Spec Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Living Room Paint Schedule, Gate Lock Code"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#054AC6] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NoteCategory)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-[#054AC6] outline-none"
              >
                <option value="PAINT_COLOR">Paint & Colors</option>
                <option value="SPECIFICATION">Material Specs</option>
                <option value="ACCESS_SITE">Gate / Lock Access</option>
                <option value="CLIENT">Client Request</option>
                <option value="GENERAL">General Note</option>
              </select>
            </div>
          </div>

          {/* Color Palette Builder when Category is PAINT_COLOR */}
          {category === 'PAINT_COLOR' && (
            <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#054AC6]" />
                  <span className="text-xs font-bold text-[#03225F]">Color Code Specs & Swatches</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddColorItem}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#054AC6] hover:text-[#03225F] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Color</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {colorCodes.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      {/* Color Preview & Picker */}
                      <input
                        type="color"
                        value={item.hexColor || '#E2DEC9'}
                        onChange={(e) => handleUpdateColorItem(idx, 'hexColor', e.target.value)}
                        className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0 shrink-0"
                        title="Pick Color Preview"
                      />
                      <input
                        type="text"
                        placeholder="Application (e.g. Master Bedroom Accent Wall)"
                        value={item.name}
                        onChange={(e) => handleUpdateColorItem(idx, 'name', e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveColorItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <input
                          type="text"
                          placeholder="Code (SW 7029)"
                          value={item.code}
                          onChange={(e) => handleUpdateColorItem(idx, 'code', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Brand (Sherwin-Williams)"
                          value={item.brand || ''}
                          onChange={(e) => handleUpdateColorItem(idx, 'brand', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] outline-none"
                        />
                      </div>
                      <div>
                        <select
                          value={item.finish || 'Eggshell'}
                          onChange={(e) => handleUpdateColorItem(idx, 'finish', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 text-[11px] outline-none"
                        >
                          <option value="Flat/Matte">Flat / Matte</option>
                          <option value="Eggshell">Eggshell</option>
                          <option value="Satin">Satin</option>
                          <option value="Semi-Gloss">Semi-Gloss</option>
                          <option value="High Gloss">High Gloss</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note Content / Text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Note Details / Description
            </label>
            <textarea
              rows={4}
              placeholder="Enter details, dimensions, brand references, client preferences, or instructions..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#054AC6] outline-none resize-none"
            />
          </div>

          {/* Tags and Pinned status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                placeholder="paint, interior, master"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
              />
            </div>

            <div className="pt-4 flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 text-[#054AC6] rounded border-slate-300 focus:ring-[#054AC6]"
                />
                <span className="flex items-center gap-1">
                  <Pin className={`w-3.5 h-3.5 ${isPinned ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                  Pin to top of project
                </span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-[#054AC6] hover:bg-[#03225F] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : editingNote ? 'Update Note' : 'Save Project Note'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
