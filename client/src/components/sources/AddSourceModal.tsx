import React, { useState } from 'react';
import { X, Globe, Rss, Plus, Sparkles } from 'lucide-react';
import type { AddSourceRequest, SourceType } from '../../../../shared/types.js';

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: AddSourceRequest) => Promise<void>;
}

export const AddSourceModal: React.FC<AddSourceModalProps> = ({ isOpen, onClose, onAdd }) => {
  if (!isOpen) return null;

  const [type, setType] = useState<SourceType>('url');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [syncInterval, setSyncInterval] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = [
    {
      label: 'Hacker News Frontpage (RSS)',
      type: 'rss' as SourceType,
      url: 'https://news.ycombinator.com/rss',
      title: 'Hacker News Frontpage',
    },
    {
      label: 'Simon Willison Blog (RSS)',
      type: 'rss' as SourceType,
      url: 'https://simonwillison.net/atom/entries/',
      title: 'Simon Willison AI & Tech Blog',
    },
    {
      label: 'DuckDB News Blog (RSS)',
      type: 'rss' as SourceType,
      url: 'https://duckdb.org/feed.xml',
      title: 'DuckDB Official Blog',
    },
    {
      label: 'Anthropic Research Overview (URL)',
      type: 'url' as SourceType,
      url: 'https://www.anthropic.com/research',
      title: 'Anthropic AI Research',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onAdd({
        type,
        url: url.trim(),
        title: title.trim() || undefined,
        syncIntervalMins: type === 'rss' ? syncInterval : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add source');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyPreset = (p: typeof presets[0]) => {
    setType(p.type);
    setUrl(p.url);
    setTitle(p.title);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-semibold text-white">Add Knowledge Source</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl">
              {error}
            </div>
          )}

          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('url')}
              className={`flex items-center justify-center space-x-2 py-3 rounded-xl border text-xs font-medium transition-all ${
                type === 'url'
                  ? 'bg-sky-500/15 border-sky-500 text-sky-400 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Web Article / URL</span>
            </button>

            <button
              type="button"
              onClick={() => setType('rss')}
              className={`flex items-center justify-center space-x-2 py-3 rounded-xl border text-xs font-medium transition-all ${
                type === 'rss'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Rss className="w-4 h-4" />
              <span>RSS / Atom Feed</span>
            </button>
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {type === 'url' ? 'Webpage URL' : 'RSS / Atom Feed URL'}
            </label>
            <input
              type="url"
              required
              placeholder={type === 'url' ? 'https://example.com/article' : 'https://example.com/feed.xml'}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Custom Title <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="Leave empty to auto-extract from page or feed"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Sync Interval (for RSS) */}
          {type === 'rss' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Auto-Sync Frequency
              </label>
              <select
                value={syncInterval}
                onChange={(e) => setSyncInterval(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every 1 hour (Default)</option>
                <option value={360}>Every 6 hours</option>
                <option value={1440}>Every 24 hours</option>
              </select>
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Presets for Testing</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="text-left p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs transition-colors"
                >
                  <div className="font-medium text-slate-200 truncate">{p.label}</div>
                  <div className="text-[10px] text-slate-500 truncate">{p.url}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-medium bg-sky-500 hover:bg-sky-400 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Adding & Indexing...</span>
                </>
              ) : (
                <span>Add & Start Indexing</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
