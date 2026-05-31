'use client';

import { useState, useRef } from 'react';
import { Upload, CheckCircle, XCircle, AlertCircle, FileText, Download } from 'lucide-react';

interface Project { id: string; name: string; clients: { name: string } | null; }

interface UploadResult {
  row: number;
  status: 'ok' | 'error';
  leadId?: string;
  error?: string;
}

interface UploadSummary {
  ok: number;
  failed: number;
  total: number;
  results: UploadResult[];
}

const REQUIRED_COLUMNS = ['full_name', 'phone'] as const;

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? '').trim(); });
    return row;
  });
}

export default function BulkUploadClient({ projects }: { projects: Project[] }) {
  const [projectId, setProjectId] = useState('');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadSummary | null>(null);
  const [parseError, setParseError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setParseError('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setParseError('Could not parse CSV — make sure it has a header row.');
        return;
      }
      const missing = REQUIRED_COLUMNS.filter(c => !Object.keys(parsed[0]).includes(c));
      if (missing.length) {
        setParseError(`Missing required columns: ${missing.join(', ')}`);
        return;
      }
      setRows(parsed);
    };
    reader.readAsText(file);
  }

  async function handleUpload() {
    if (!projectId || rows.length === 0) return;
    setUploading(true);
    setResult(null);

    const payload = rows.map(r => ({ ...r, project_id: projectId }));
    try {
      const res = await fetch('/api/leads/bulk-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payload }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setParseError('Upload failed — please try again.');
    }
    setUploading(false);
  }

  function downloadTemplate() {
    const csv = 'full_name,phone,email,source,language_pref\nRajesh Patel,9876543210,rajesh@example.com,manual,hinglish\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'leads-template.csv';
    a.click();
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div
        className="rounded-2xl border p-6"
        style={{ backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-[13px] font-bold text-white">CSV Format</h3>
            <div className="mt-3 space-y-1.5 text-[13px] text-gray-400 leading-relaxed">
              <p>
                <span
                  className="font-bold uppercase tracking-wider text-[10px]"
                  style={{ color: '#D4AF37' }}
                >
                  Required ·{' '}
                </span>
                <code className="font-mono text-gray-300">full_name, phone</code>
              </p>
              <p>
                <span className="font-bold uppercase tracking-wider text-[10px] text-gray-500">
                  Optional ·{' '}
                </span>
                <code className="font-mono text-gray-400">email, source, language_pref</code>
              </p>
              <p className="text-[12px] text-gray-500">
                Phone numbers: 10-digit Indian numbers, with or without +91
              </p>
              <p className="text-[12px] text-gray-600">
                Max 500 rows per upload. Duplicate phone numbers are skipped.
              </p>
            </div>
          </div>
          <button
            onClick={downloadTemplate}
            className="inline-flex flex-none items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-medium text-gray-400 transition-all hover:text-white"
            style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' }}
          >
            <Download className="h-3.5 w-3.5" />
            Template
          </button>
        </div>
      </div>

      {/* Project selector */}
      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
          Target Project
        </label>
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          className="w-full rounded-xl border px-4 py-3 text-[14px] text-white focus:outline-none focus:ring-1 transition-all"
          style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: '#090909' }}
        >
          <option value="">— Select project —</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} {p.clients ? `(${p.clients.name})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* File upload — hero dropzone */}
      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
          CSV File
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file && fileRef.current) {
              const dt = new DataTransfer();
              dt.items.add(file);
              fileRef.current.files = dt.files;
              fileRef.current.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }}
          className="cursor-pointer rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-all"
          style={{
            borderColor: dragOver ? 'rgba(212,175,55,0.30)' : 'rgba(255,255,255,0.12)',
            backgroundColor: dragOver ? 'rgba(212,175,55,0.04)' : 'rgba(255,255,255,0.02)',
          }}
        >
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: fileName ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.04)',
            }}
          >
            {fileName ? (
              <FileText className="h-7 w-7" style={{ color: '#D4AF37' }} />
            ) : (
              <Upload className="h-7 w-7 text-gray-500" />
            )}
          </div>
          {fileName ? (
            <div>
              <p className="text-[15px] font-semibold text-white">{fileName}</p>
              <p className="mt-1.5 text-[13px]" style={{ color: '#D4AF37' }}>
                {rows.length} rows parsed · ready to upload
              </p>
            </div>
          ) : (
            <div>
              <p className="text-[15px] font-semibold text-gray-300">Drop CSV here, or click to browse</p>
              <p className="mt-1.5 text-[12px] text-gray-500">Accepts .csv files up to 500 rows</p>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
      </div>

      {parseError && (
        <div
          className="flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px]"
          style={{ backgroundColor: 'rgba(248,113,113,0.06)', borderColor: 'rgba(248,113,113,0.18)' }}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" style={{ color: '#f87171' }} />
          <p style={{ color: '#f87171' }}>{parseError}</p>
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && !result && (
        <div>
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
            Preview · first 3 rows
          </p>
          <div
            className="overflow-x-auto rounded-2xl border"
            style={{ backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }}
          >
            <table className="w-full text-[12px]">
              <thead
                style={{
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <tr className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                  {Object.keys(rows[0]).map(k => (
                    <th key={k} className="px-4 py-3 text-left">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 3).map((row, i) => (
                  <tr
                    key={i}
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-4 py-3 font-mono text-gray-300">{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!projectId || rows.length === 0 || uploading}
        className="w-full rounded-xl px-5 py-3.5 text-[14px] font-bold transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ backgroundColor: '#D4AF37', color: '#000' }}
      >
        {uploading
          ? `Uploading ${rows.length} leads...`
          : `Upload ${rows.length || 0} leads & trigger calls`}
      </button>

      {/* Results */}
      {result && (
        <div
          className="rounded-2xl border p-6 space-y-5"
          style={{ backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <div className="flex flex-wrap gap-6">
            <div
              className="flex items-center gap-2.5 rounded-xl px-4 py-2.5"
              style={{ backgroundColor: 'rgba(52,211,153,0.10)' }}
            >
              <CheckCircle className="h-5 w-5" style={{ color: '#34d399' }} />
              <span className="text-[14px] font-bold" style={{ color: '#34d399' }}>
                {result.ok} imported
              </span>
            </div>
            {result.failed > 0 && (
              <div
                className="flex items-center gap-2.5 rounded-xl px-4 py-2.5"
                style={{ backgroundColor: 'rgba(248,113,113,0.10)' }}
              >
                <XCircle className="h-5 w-5" style={{ color: '#f87171' }} />
                <span className="text-[14px] font-bold" style={{ color: '#f87171' }}>
                  {result.failed} failed
                </span>
              </div>
            )}
          </div>

          {result.failed > 0 && (
            <div>
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                Failed rows
              </p>
              <div
                className="max-h-40 space-y-1 overflow-y-auto rounded-xl border p-3"
                style={{ borderColor: 'rgba(248,113,113,0.18)', backgroundColor: 'rgba(248,113,113,0.04)' }}
              >
                {result.results
                  .filter(r => r.status === 'error')
                  .map(r => (
                    <div key={r.row} className="font-mono text-[11px]" style={{ color: '#f87171' }}>
                      Row {r.row}: {r.error}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {result.ok > 0 && (
            <p className="text-[13px] leading-relaxed text-gray-400">
              {result.ok} leads added. Voice calls will trigger within 2 minutes during business hours (9am–9pm IST).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
