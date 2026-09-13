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
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Workflow steps: 'upload' -> 'preview' -> 'result'
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');

  const [preview, setPreview] = useState<ExcelPreviewResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (
        dropped.name.endsWith('.xlsx') ||
        dropped.name.endsWith('.xls') ||
        dropped.name.endsWith('.csv')
      ) {
        setFile(dropped);
        setError(null);
      } else {
        setError('Please upload a valid Excel (.xlsx, .xls) or CSV file.');
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
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to inspect Excel structure.');
      }

      setPreview(data.preview);
      setMapping(data.preview.autoMapping || {});
      setStep('preview');
    } catch (err: any) {
      setError(err?.message || 'Error parsing Excel headers.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFinalImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('action', 'import');
    formData.append('mapping', JSON.stringify(mapping));

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import mapped leads.');
      }

      setSummary(data.summary);
      setStep('result');
    } catch (err: any) {
      setError(err?.message || 'Error storing mapped leads in database.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-950 flex items-center gap-3">
          <FileSpreadsheet className="w-7 h-7 text-indigo-600" /> Dynamic Excel Ingestion Engine
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Upload any recruiter spreadsheet format. Extra columns are preserved into Postgres JSONB to contextualize AI draft personalization.
        </p>
      </div>

      {/* Stepper Wizard Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
            step === 'upload'
              ? 'bg-indigo-50/70 border-indigo-200 text-indigo-700 font-bold shadow-xs'
              : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Upload Spreadsheet</p>
            <p className="text-[10px] text-slate-500">.xlsx, .xls, .csv</p>
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
            step === 'preview'
              ? 'bg-indigo-50/70 border-indigo-200 text-indigo-700 font-bold shadow-xs'
              : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
            2
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Dynamic Mapper</p>
            <p className="text-[10px] text-slate-500">Inspect & map headers</p>
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
            step === 'result'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold shadow-xs'
              : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
            3
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Ingestion Complete</p>
            <p className="text-[10px] text-slate-500">Leads & raw data ready</p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Operation Error</p>
            <p className="text-rose-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* STEP 1: Upload Box */}
      {step === 'upload' && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="p-12 rounded-3xl bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-400 transition-all flex flex-col items-center justify-center text-center space-y-4 shadow-xs"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Upload className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <p className="text-base font-bold text-slate-900">
              {file ? file.name : 'Drag and drop any Excel file here, or click to browse'}
            </p>
            <p className="text-xs text-slate-500">
              Works with any header names, table structure, or custom columns
            </p>
          </div>

          <input
            type="file"
            id="excel-file-input"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex gap-3 pt-2">
            <label
              htmlFor="excel-file-input"
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors border border-slate-200"
            >
              {file ? 'Choose Different File' : 'Browse Files'}
            </label>

            {file && (
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                id="btn-analyze-excel"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
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
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" /> Extracted Dynamic Headers ({preview.headers.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Found <strong className="text-slate-900">{preview.totalRows} rows</strong> in{' '}
                  <strong className="text-slate-900">{preview.filename}</strong>.
                </p>
              </div>

              <button
                onClick={() => setStep('upload')}
                className="text-xs text-indigo-600 hover:underline font-bold"
              >
                Upload Different File
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {preview.headers.map((h) => (
                <span
                  key={h}
                  className="px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>

          {/* Dynamic Column Mapping Controls */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" /> Column Mapping Configuration
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm which column corresponds to key outreach targets.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Auto-Detected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Company / Organization Column:</label>
                <select
                  value={mapping.companyCol || ''}
                  onChange={(e) => setMapping({ ...mapping, companyCol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
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
                <label className="font-bold text-slate-700">Recipient Email / Contact Column:</label>
                <select
                  value={mapping.emailCol || ''}
                  onChange={(e) => setMapping({ ...mapping, emailCol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
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
                <label className="font-bold text-slate-700">Required Skills / Tech Stack Column:</label>
                <select
                  value={mapping.skillsCol || ''}
                  onChange={(e) => setMapping({ ...mapping, skillsCol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
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
                <label className="font-bold text-slate-700">Location Column:</label>
                <select
                  value={mapping.locationCol || ''}
                  onChange={(e) => setMapping({ ...mapping, locationCol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
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
                <label className="font-bold text-slate-700">Experience Level Column:</label>
                <select
                  value={mapping.experienceCol || ''}
                  onChange={(e) => setMapping({ ...mapping, experienceCol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
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
                <label className="font-bold text-slate-700">Salary / CTC Column:</label>
                <select
                  value={mapping.salaryCol || ''}
                  onChange={(e) => setMapping({ ...mapping, salaryCol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
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

            <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Dynamic Guarantee:</strong> All unmapped extra columns in your file are automatically preserved in full as dynamic JSONB data for AI email drafting context!
              </span>
            </div>
          </div>

          {/* Sample Data Table Preview */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-xs overflow-hidden">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-indigo-600" /> File Sample Data Preview (First 5 Rows)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[10px]">
                  <tr>
                    {preview.headers.map((h) => (
                      <th key={h} className="p-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {preview.sampleRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/20">
                      {preview.headers.map((h) => (
                        <td key={h} className="p-3 whitespace-nowrap text-slate-700">
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
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setStep('upload')}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Back
            </button>

            <button
              onClick={handleFinalImport}
              disabled={importing}
              id="btn-confirm-import"
              className="px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
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
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 space-y-6 shadow-xs animate-fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950">Dynamic Import Completed Successfully!</h2>
              <p className="text-xs text-slate-500">All columns & custom details stored securely in database</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[11px] text-slate-500 font-bold uppercase">Rows Processed</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{summary.totalRowsProcessed}</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <p className="text-[11px] text-emerald-700 font-bold uppercase">Leads Added</p>
              <p className="text-2xl font-black text-emerald-800 mt-1">{summary.insertedCount}</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <p className="text-[11px] text-amber-700 font-bold uppercase">Duplicates Skipped</p>
              <p className="text-2xl font-black text-amber-800 mt-1">{summary.deduplicatedSkipped}</p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
              <p className="text-[11px] text-blue-700 font-bold uppercase flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Job Links Only
              </p>
              <p className="text-2xl font-black text-blue-800 mt-1">{summary.urlOnlyCount}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
                setSummary(null);
                setStep('upload');
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Upload Another Excel Sheet
            </button>
            <Link
              href="/review"
              id="btn-go-to-review"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all"
            >
              Go to Draft Review <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
