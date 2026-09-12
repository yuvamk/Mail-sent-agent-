'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Link2,
  Table as TableIcon,
  SlidersHorizontal,
  Sparkles,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

interface ColumnMapping {
  companyCol?: string;
  emailCol?: string;
  skillsCol?: string;
  locationCol?: string;
  experienceCol?: string;
  salaryCol?: string;
  phoneCol?: string;
}

interface ExcelPreviewResult {
  filename: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
  autoMapping: ColumnMapping;
}

interface ImportSummary {
  totalRowsProcessed: number;
  insertedCount: number;
  deduplicatedSkipped: number;
  validEmailCount: number;
  urlOnlyCount: number;
}

export default function ImportPage() {
  const router = useRouter();

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      }
    });
  }, [router]);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);

  const [preview, setPreview] = useState<ExcelPreviewResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});

  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setPreview(null);
      setStep('upload');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile);
        setError(null);
        setPreview(null);
        setStep('upload');
      } else {
        setError('Please drop a valid Excel file (.xlsx or .xls)');
      }
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('action', 'preview');

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const url = session?.user?.id ? `/api/import?userId=${session.user.id}` : '/api/import';

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze Excel structure');
      }

      setPreview(data.preview);
      setMapping(data.preview.autoMapping || {});
      setStep('preview');
    } catch (err: any) {
      setError(err?.message || 'Error analyzing Excel sheet');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFinalImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        router.push('/login');
        throw new Error('Unauthorized. Please sign in first.');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'import');
      formData.append('mapping', JSON.stringify(mapping));
      formData.append('userId', session.user.id);

      const res = await fetch(`/api/import?userId=${session.user.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import Excel leads');
      }

      setSummary(data.summary);
      setStep('result');
    } catch (err: any) {
      setError(err?.message || 'Error importing Excel leads');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <FileSpreadsheet className="w-7 h-7 text-blue-400" /> Dynamic Excel Upload & Mapper
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload <strong>ANY Excel format or table structure</strong>. All columns are extracted dynamically — map key target fields, and all custom extra data is preserved automatically for AI context!
        </p>
      </div>

      {/* Step Progress Tracker */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-3 ${
            step === 'upload'
              ? 'bg-blue-950/60 border-blue-500 text-blue-300'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <div>
            <p className="text-xs font-bold text-white">Upload File</p>
            <p className="text-[10px] text-slate-400">Select any .xlsx sheet</p>
          </div>
        </div>

        <div
          className={`p-3.5 rounded-xl border flex items-center gap-3 ${
            step === 'preview'
              ? 'bg-blue-950/60 border-blue-500 text-blue-300'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
            2
          </div>
          <div>
            <p className="text-xs font-bold text-white">Dynamic Mapper</p>
            <p className="text-[10px] text-slate-400">Inspect & map headers</p>
          </div>
        </div>

        <div
          className={`p-3.5 rounded-xl border flex items-center gap-3 ${
            step === 'result'
              ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
            3
          </div>
          <div>
            <p className="text-xs font-bold text-white">Complete</p>
            <p className="text-[10px] text-slate-400">Leads & raw data ready</p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Operation Error</p>
            <p className="text-xs text-red-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* STEP 1: Upload Box */}
      {step === 'upload' && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="p-10 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 hover:border-blue-500/60 transition-all flex flex-col items-center justify-center text-center space-y-4 shadow-xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Upload className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-200">
              {file ? file.name : 'Drag and drop any Excel file here, or click to browse'}
            </p>
            <p className="text-xs text-slate-400">Works with any header names, table structure, or custom columns</p>
          </div>

          <input
            type="file"
            id="excel-file-input"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex gap-4 pt-2">
            <label
              htmlFor="excel-file-input"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium cursor-pointer transition-colors border border-slate-700"
            >
              {file ? 'Choose Different File' : 'Browse Files'}
            </label>

            {file && (
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                id="btn-analyze-excel"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Extracting Headers...
                  </>
                ) : (
                  <>
                    Analyze Excel Structure <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Dynamic Header Inspector & Field Mapper */}
      {step === 'preview' && preview && (
        <div className="space-y-6">
          {/* Detected Headers Banner */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" /> Extracted Dynamic Headers ({preview.headers.length})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Found <strong className="text-white">{preview.totalRows} rows</strong> in <strong className="text-white">{preview.filename}</strong>.
                </p>
              </div>

              <button
                onClick={() => setStep('upload')}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Upload Different File
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {preview.headers.map((h) => (
                <span
                  key={h}
                  className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>

          {/* Dynamic Column Mapping Controls */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-400" /> Column Mapping Configuration
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirm which column corresponds to key outreach targets.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Auto-Detected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Company / Organization Column:</label>
                <select
                  value={mapping.companyCol || ''}
                  onChange={(e) => setMapping({ ...mapping, companyCol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- None / Auto --</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Recipient Email / Contact Column:</label>
                <select
                  value={mapping.emailCol || ''}
                  onChange={(e) => setMapping({ ...mapping, emailCol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- None / Auto Scan --</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Required Skills / Tech Stack Column:</label>
                <select
                  value={mapping.skillsCol || ''}
                  onChange={(e) => setMapping({ ...mapping, skillsCol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- None / Skip --</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Location Column:</label>
                <select
                  value={mapping.locationCol || ''}
                  onChange={(e) => setMapping({ ...mapping, locationCol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- None / Skip --</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Experience Level Column:</label>
                <select
                  value={mapping.experienceCol || ''}
                  onChange={(e) => setMapping({ ...mapping, experienceCol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- None / Skip --</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-200">Salary / CTC Column:</label>
                <select
                  value={mapping.salaryCol || ''}
                  onChange={(e) => setMapping({ ...mapping, salaryCol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- None / Skip --</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs text-blue-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong>Dynamic Guarantee:</strong> All unmapped extra columns in your file are automatically preserved in full as dynamic raw data for AI email drafting context!
              </span>
            </div>
          </div>

          {/* Sample Data Table Preview */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl overflow-hidden">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-blue-400" /> File Sample Data Preview (First 5 Rows)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono">
                  <tr>
                    {preview.headers.map((h) => (
                      <th key={h} className="p-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {preview.sampleRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      {preview.headers.map((h) => (
                        <td key={h} className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-300">
                          {row[h] || '–'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Confirm Import Button */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setStep('upload')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium"
            >
              Back
            </button>

            <button
              onClick={handleFinalImport}
              disabled={importing}
              id="btn-confirm-import"
              className="px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing & Saving Leads...
                </>
              ) : (
                <>
                  Confirm & Import Leads <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Summary Card */}
      {step === 'result' && summary && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl animate-fade-in">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Dynamic Import Completed Successfully!</h2>
              <p className="text-xs text-slate-400">All columns & custom details stored in database</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-xs text-slate-400 font-medium">Rows Processed</p>
              <p className="text-2xl font-bold text-white mt-1">{summary.totalRowsProcessed}</p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40">
              <p className="text-xs text-emerald-400 font-medium">Leads Added</p>
              <p className="text-2xl font-bold text-emerald-300 mt-1">{summary.insertedCount}</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/40">
              <p className="text-xs text-amber-400 font-medium">Duplicates Skipped</p>
              <p className="text-2xl font-bold text-amber-300 mt-1">{summary.deduplicatedSkipped}</p>
            </div>

            <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/40">
              <p className="text-xs text-cyan-400 font-medium flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Job Links Only
              </p>
              <p className="text-2xl font-bold text-cyan-300 mt-1">{summary.urlOnlyCount}</p>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
                setSummary(null);
                setStep('upload');
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
            >
              Upload Another Excel Sheet
            </button>
            <Link
              href="/review"
              id="btn-go-to-review"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all"
            >
              Go to Draft Review <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
