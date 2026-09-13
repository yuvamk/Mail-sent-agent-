'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Loader2,
  Trash2,
  Eye,
  FileUp,
  Sparkles,
  Star,
} from 'lucide-react';

interface ResumeRecord {
  id: string;
  file_name: string;
  storage_path: string;
  extracted_text: string | null;
  is_active: boolean;
  uploaded_at: string;
}

export default function ResumePage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTextPreview, setActiveTextPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchResumes = async () => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const res = await fetch(`/api/resume?userId=${session.user.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
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
      const { data: { session } } = await supabaseBrowser.auth.getSession();

      const res = await fetch(`/api/resume?userId=${session?.user?.id || ''}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
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
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const res = await fetch(`/api/resume?userId=${session?.user?.id || ''}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
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
    <div className="max-w-5xl mx-auto space-y-8 font-sans pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-950 flex items-center gap-3">
          <FileText className="w-7 h-7 text-indigo-600" /> Resume Knowledge Base
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Upload your resume PDF. The raw text is extracted to provide context for AI cold email drafting, and the original PDF is automatically attached to outgoing SMTP emails.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Upload Box */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" /> Upload New Resume
            </h2>

            <div className="p-6 rounded-2xl bg-slate-50 border-2 border-dashed border-indigo-200 text-center space-y-3">
              <input
                type="file"
                id="resume-pdf-input"
                accept=".pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
              />

              <label
                htmlFor="resume-pdf-input"
                className="cursor-pointer block text-xs text-slate-600 hover:text-slate-900"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Click to select PDF file'}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">Maximum 5 MB (.pdf only)</p>
              </label>

              {selectedFile && (
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  id="btn-upload-resume"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                {successMsg}
              </div>
            )}
          </div>

          {/* Uploaded Resumes List */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Version History</h3>

            {loading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Loading resume list...
              </div>
            ) : resumes.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No resumes uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {resumes.map((r) => (
                  <div
                    key={r.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                      r.is_active
                        ? 'bg-indigo-50/70 border-indigo-200 text-slate-900 font-medium'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="font-bold text-slate-900 truncate" title={r.file_name}>
                        {r.file_name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(r.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {r.is_active ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                          Active
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetActive(r.id)}
                          className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-[10px] font-semibold"
                        >
                          Make Active
                        </button>
                      )}

                      {r.extracted_text && (
                        <button
                          onClick={() => setActiveTextPreview(r.extracted_text)}
                          className="p-1 rounded-lg hover:bg-white text-slate-500 hover:text-indigo-600 transition-colors"
                          title="Preview Extracted Text"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Resume & Extracted Skills */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-950">Active Resume Knowledge Context</h2>
              </div>
              {activeResume && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Ready for AI Prompts
                </span>
              )}
            </div>

            {activeResume ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-indigo-600 uppercase font-bold">Active Resume File</span>
                    <p className="font-bold text-slate-900 text-sm">{activeResume.file_name}</p>
                  </div>
                  <button
                    onClick={() => setActiveTextPreview(activeResume.extracted_text)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold shadow-xs transition-colors"
                  >
                    View Parsed Text
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Extracted Text Preview:
                  </label>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-line max-h-96 overflow-y-auto">
                    {activeResume.extracted_text || 'No text extracted.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <FileUp className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs">No active resume selected.</p>
                <p className="text-[11px] text-slate-400">
                  Upload a PDF resume on the left to inject your real skills into personalized cold pitches.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
