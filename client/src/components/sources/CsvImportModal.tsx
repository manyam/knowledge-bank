import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Globe,
  Rss,
  Download,
  FileText,
  Loader2,
  Trash2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { parseCsvSources, SAMPLE_CSV_TEMPLATE, type ParsedCsvSource } from '../../../../shared/csv.js';
import { importCsvSources, decipherUrlsBatch } from '../../api/client.js';
import type { SourceType, CsvImportResponse, CsvImportItem } from '../../../../shared/types.js';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('paste');
  const [csvText, setCsvText] = useState(SAMPLE_CSV_TEMPLATE);
  const [parsedRows, setParsedRows] = useState<ParsedCsvSource[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [rowTypes, setRowTypes] = useState<Record<string, SourceType | 'auto'>>({});
  const [rowTitles, setRowTitles] = useState<Record<string, string>>({});
  const [deciphering, setDeciphering] = useState<Record<string, boolean>>({});

  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<CsvImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Parse CSV text whenever it changes
  useEffect(() => {
    if (!csvText.trim()) {
      setParsedRows([]);
      setSelectedUrls(new Set());
      return;
    }

    try {
      const rows = parseCsvSources(csvText);
      setParsedRows(rows);

      // Pre-select all valid rows
      const urls = new Set(rows.map((r) => r.url));
      setSelectedUrls(urls);

      // Initialize row titles and types
      const initialTypes: Record<string, SourceType | 'auto'> = {};
      const initialTitles: Record<string, string> = {};
      rows.forEach((r) => {
        initialTypes[r.url] = r.type || 'auto';
        if (r.title) initialTitles[r.url] = r.title;
      });

      setRowTypes(initialTypes);
      setRowTitles(initialTitles);

      // Kick off background deciphering for rows that are 'auto'
      if (rows.length > 0) {
        decipherRows(rows.map((r) => r.url));
      }
    } catch (err: any) {
      console.warn('CSV parse warning:', err);
    }
  }, [csvText]);

  const decipherRows = async (urls: string[]) => {
    const toDecipher = urls.filter((u) => !rowTypes[u] || rowTypes[u] === 'auto');
    if (toDecipher.length === 0) return;

    // Mark as deciphering
    setDeciphering((prev) => {
      const next = { ...prev };
      toDecipher.forEach((u) => (next[u] = true));
      return next;
    });

    try {
      const results = await decipherUrlsBatch(toDecipher);
      setRowTypes((prev) => {
        const next = { ...prev };
        results.forEach((res) => {
          if (res.type) next[res.url] = res.type;
        });
        return next;
      });

      setRowTitles((prev) => {
        const next = { ...prev };
        results.forEach((res) => {
          if (!next[res.url] && res.title) {
            next[res.url] = res.title;
          }
        });
        return next;
      });
    } catch (err) {
      console.warn('Auto-decipher batch warning:', err);
    } finally {
      setDeciphering((prev) => {
        const next = { ...prev };
        toDecipher.forEach((u) => (next[u] = false));
        return next;
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
        setError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'knowledge_bank_sample_sources.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSelectAll = () => {
    if (selectedUrls.size === parsedRows.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(parsedRows.map((r) => r.url)));
    }
  };

  const toggleUrl = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleImport = async () => {
    const itemsToImport: CsvImportItem[] = parsedRows
      .filter((r) => selectedUrls.has(r.url))
      .map((r) => ({
        url: r.url,
        title: rowTitles[r.url] || r.title,
        type: rowTypes[r.url] || 'auto',
      }));

    if (itemsToImport.length === 0) {
      setError('Please select at least one source to import.');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const response = await importCsvSources({ items: itemsToImport });
      setImportResult(response);
      await onSuccess();
    } catch (err: any) {
      console.error('Import failed:', err);
      setError(err.message || 'Failed to import CSV sources');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setCsvText('');
    setParsedRows([]);
    setSelectedUrls(new Set());
    setImportResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Import Sources from CSV</h2>
              <p className="text-xs text-slate-400">
                Batch import URLs. Feeds and web articles are automatically deciphered and indexed into DuckDB.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* If import has finished: show results summary */}
          {importResult ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>CSV Batch Import Complete</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Processed {importResult.total} sources
                  </span>
                </div>

                {/* Stat Badges */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-lg font-bold text-emerald-400">
                      {importResult.imported}
                    </span>
                    <span className="block text-[11px] text-emerald-300/80 font-medium">
                      Imported & Indexed
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-center">
                    <span className="text-lg font-bold text-slate-300">
                      {importResult.skipped}
                    </span>
                    <span className="block text-[11px] text-slate-400 font-medium">
                      Already in Bank
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
                    <span className="text-lg font-bold text-rose-400">
                      {importResult.failed}
                    </span>
                    <span className="block text-[11px] text-rose-300/80 font-medium">
                      Failed
                    </span>
                  </div>
                </div>
              </div>

              {/* Breakdown List */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Itemized Report
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {importResult.results.map((res, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start justify-between text-xs gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          {res.type === 'rss' ? (
                            <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <Rss className="w-3 h-3" />
                              <span>RSS</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                              <Globe className="w-3 h-3" />
                              <span>URL</span>
                            </span>
                          )}
                          <span className="font-medium text-slate-200 truncate max-w-sm">
                            {res.title || res.url}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate font-mono">
                          {res.url}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            res.status === 'imported'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : res.status === 'skipped'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {res.status === 'imported'
                            ? 'Indexed'
                            : res.status === 'skipped'
                            ? 'Skipped'
                            : res.status === 'imported_with_error'
                            ? 'Needs Manual Text'
                            : 'Failed'}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] truncate">
                          {res.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Input Tabs: Upload vs Paste */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('paste')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeTab === 'paste'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Paste CSV / Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeTab === 'upload'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Upload .csv File
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleDownloadSample}
                    className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-slate-200 font-medium px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition-colors"
                  >
                    <Download className="w-3 h-3 text-slate-400" />
                    <span>Download Template</span>
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              {activeTab === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-950/50 hover:bg-slate-950"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <UploadCloud className="w-8 h-8 text-emerald-400 mx-auto mb-2 animate-bounce" />
                  <p className="text-xs font-semibold text-slate-200">
                    Click to browse or drag and drop your CSV file
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Accepts comma, tab, or semicolon separated columns (e.g. <code className="text-emerald-400">url,title</code>)
                  </p>
                </div>
              )}

              {/* Paste Area */}
              {activeTab === 'paste' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Paste raw URLs or CSV data:</span>
                    <button
                      type="button"
                      onClick={() => setCsvText(SAMPLE_CSV_TEMPLATE)}
                      className="text-emerald-400 hover:text-emerald-300 text-[11px] underline"
                    >
                      Load Sample Data
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="url,title&#10;https://news.ycombinator.com/rss,Hacker News&#10;https://duckdb.org/feed.xml,DuckDB Blog&#10;https://en.wikipedia.org/wiki/DuckDB,DuckDB Wikipedia"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-emerald-500 resize-y"
                  />
                </div>
              )}

              {/* Parsed Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-slate-200">
                        Detected Sources ({selectedUrls.size} of {parsedRows.length} selected)
                      </span>
                      <span className="text-[11px] text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                        Auto-deciphering enabled
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-[11px] text-sky-400 hover:text-sky-300 underline font-medium"
                      >
                        {selectedUrls.size === parsedRows.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-slate-400 font-medium">
                        <tr>
                          <th className="py-2 px-3 w-8">
                            <input
                              type="checkbox"
                              checked={
                                parsedRows.length > 0 && selectedUrls.size === parsedRows.length
                              }
                              onChange={toggleSelectAll}
                              className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                            />
                          </th>
                          <th className="py-2 px-3">Source URL</th>
                          <th className="py-2 px-3">Title</th>
                          <th className="py-2 px-3 w-36">Deciphered Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                        {parsedRows.map((row) => {
                          const isSelected = selectedUrls.has(row.url);
                          const isRowDeciphering = deciphering[row.url];
                          const detectedType = rowTypes[row.url] || 'auto';
                          const displayTitle = rowTitles[row.url] || row.title || '';

                          return (
                            <tr
                              key={row.url}
                              className={`transition-colors ${
                                isSelected ? 'bg-slate-850/60' : 'opacity-60 hover:opacity-100'
                              }`}
                            >
                              <td className="py-2 px-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleUrl(row.url)}
                                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="py-2 px-3 max-w-xs truncate font-mono text-[11px] text-slate-300">
                                <span title={row.url}>{row.url}</span>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  placeholder="Auto-detected title"
                                  value={displayTitle}
                                  onChange={(e) =>
                                    setRowTitles((prev) => ({
                                      ...prev,
                                      [row.url]: e.target.value,
                                    }))
                                  }
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center space-x-1.5">
                                  {isRowDeciphering ? (
                                    <span className="flex items-center space-x-1 text-[11px] text-slate-400 animate-pulse">
                                      <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                                      <span>Deciphering...</span>
                                    </span>
                                  ) : detectedType === 'rss' ? (
                                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                      <Rss className="w-3 h-3" />
                                      <span>RSS Feed</span>
                                    </span>
                                  ) : detectedType === 'url' ? (
                                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                                      <Globe className="w-3 h-3" />
                                      <span>Web Article</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                      <Sparkles className="w-3 h-3 text-emerald-400" />
                                      <span>Auto</span>
                                    </span>
                                  )}

                                  {/* Quick manual override dropdown */}
                                  <select
                                    value={detectedType}
                                    onChange={(e) =>
                                      setRowTypes((prev) => ({
                                        ...prev,
                                        [row.url]: e.target.value as SourceType | 'auto',
                                      }))
                                    }
                                    className="bg-slate-950 border border-slate-800 text-[10px] text-slate-400 rounded px-1 py-0.5 focus:outline-none"
                                    title="Manually override type"
                                  >
                                    <option value="auto">Auto</option>
                                    <option value="rss">Feed</option>
                                    <option value="url">URL</option>
                                  </select>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/40">
          {importResult ? (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Import More
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
              >
                Done & View Bank
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isImporting}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting || selectedUrls.size === 0}
                className="flex items-center space-x-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-semibold rounded-xl shadow-lg shadow-emerald-500/20 disabled:shadow-none transition-all"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Indexing into DuckDB...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Import {selectedUrls.size} Sources</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
