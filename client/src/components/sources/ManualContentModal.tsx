import React, { useState, useEffect } from 'react';
import { X, FileText, AlertTriangle, Sparkles, Check } from 'lucide-react';
import type { Source } from '../../../../shared/types.js';

interface ManualContentModalProps {
  source: Source | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sourceId: string, rawContent: string, title?: string) => Promise<void>;
}

export const ManualContentModal: React.FC<ManualContentModalProps> = ({
  source,
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen || !source) return null;

  const [title, setTitle] = useState(source.title || '');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (source) {
      setTitle(source.title || '');
      setContent('');
      setError(null);
    }
  }, [source]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Please paste the article text or HTML content.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(source.id, content.trim(), title.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to index manual content');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Input Source Content Manually</h2>
              <p className="text-xs text-slate-400 truncate max-w-md">{source.url}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {source.errorMessage && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold block">Automatic fetch failed:</span>
                <span className="text-slate-300">{source.errorMessage}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Article Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article Title..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Content Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Article Text or HTML Content
              </label>
              <span className="text-[11px] text-slate-500">
                {content.length > 0 ? `${content.length.toLocaleString()} characters` : 'Required'}
              </span>
            </div>

            <textarea
              required
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the full article text, markdown, or webpage HTML here..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono leading-relaxed resize-y"
            />

            <p className="text-[11px] text-slate-500 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
              <span>
                HTML will be automatically cleaned using Readability. Plain text and Markdown will be indexed directly.
              </span>
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="px-5 py-2 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white rounded-xl shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50 flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Indexing Chunks & Vectors...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Index into DuckDB</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
