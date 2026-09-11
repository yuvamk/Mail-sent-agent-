'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Upload, CheckCircle2, AlertCircle, Loader2, Sparkles, Star } from 'lucide-react';

interface Resume {
  id: string;
  file_name: string;
  storage_path: string;
  extracted_text: string | null;
  uploaded_at: string;
  is_active: boolean;
}

export default function ResumePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchResumes = async () => {
    try {
      const res = await fetch('/api/resume');
      const data = await res.json();
      if (res.ok) {
        setResumes(data.resumes || []);
      }
    } catch (e) {
      console.error('Failed to fetch resumes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/resume', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process resume');
      }

      setSuccessMsg(`Resume "${selectedFile.name}" uploaded, parsed, and set as active.`);
      setSelectedFile(null);
      fetchResumes();
    } catch (err: any) {
      setError(err?.message || 'Failed to upload resume PDF');
    } finally {
      setUploading(false);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      const res = await fetch('/api/resume', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId: id }),
      });
      if (res.ok) {
        fetchResumes();
      }
    } catch (e) {
      console.error('Error toggling active resume:', e);
    }
  };

  const activeResume = resumes.find((r) => r.is_active);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <FileText className="w-7 h-7 text-indigo-400" /> Resume Manager
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload your resume PDF. The raw text is extracted and cached to provide context for AI cold email drafting, and the original PDF is automatically attached to outgoing SMTP emails.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Upload Box */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-400" /> Upload New Resume
            </h2>

            <div className="p-6 rounded-xl bg-slate-950 border border-dashed border-slate-700 text-center space-y-3">
              <input
                type="file"
                id="resume-pdf-input"
                accept=".pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
              />

              <label
                htmlFor="resume-pdf-input"
                className="cursor-pointer block text-xs text-slate-300 hover:text-white"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-2">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="font-medium text-slate-200">
                  {selectedFile ? selectedFile.name : 'Click to select PDF file'}
                </span>
              </label>

              {selectedFile && (
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  id="btn-upload-resume"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Extracting Text...
                    </>
                  ) : (
                    'Upload & Activate'
                  )}
                </button>
              )}
            </div>

            {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
            {successMsg && <p className="text-xs text-emerald-400 font-medium">{successMsg}</p>}
          </div>

          {/* Uploaded Resumes List */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-300">Resume Version History</h3>

            {loading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> Loading resume list...
              </div>
            ) : resumes.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">No resumes uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {resumes.map((r) => (
                  <div
                    key={r.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      r.is_active
                        ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="overflow-hidden pr-2">
                      <p className="text-xs font-medium truncate text-slate-200">{r.file_name}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(r.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>

                    {r.is_active ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1 shrink-0">
                        <Star className="w-3 h-3 fill-emerald-400" /> Active
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetActive(r.id)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium shrink-0 transition-colors"
                      >
                        Set Active
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Resume Text Extracted Preview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" /> Extracted Text Context (Used by Claude/Gemini)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  This text is parsed from your active resume PDF and passed into the AI prompt for matching skills.
                </p>
              </div>
              {activeResume && (
                <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                  {activeResume.file_name}
                </span>
              )}
            </div>

            {activeResume ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-300 max-h-[500px] overflow-y-auto leading-relaxed whitespace-pre-wrap">
                {activeResume.extracted_text || 'No text extracted from PDF.'}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs">No active resume available. Upload a PDF on the left panel.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
