'use client';

import { useState, useRef } from 'react';
import { Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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
      <div className="rounded-lg border border-dark-tertiary bg-dark-secondary p-5">
        <h3 className="font-medium text-white mb-3">CSV format</h3>
        <div className="text-sm text-gray-400 space-y-1">
          <p><span className="text-gold">Required:</span> full_name, phone</p>
          <p><span className="text-gray-300">Optional:</span> email, source (meta/google/99acres/organic/walkin/manual), language_pref (en/hi/hinglish)</p>
          <p>Phone numbers: 10-digit Indian numbers, with or without +91</p>
          <p className="text-xs text-gray-500 mt-2">Max 500 rows per upload. Duplicate phone numbers are skipped.</p>
        </div>
        <button onClick={downloadTemplate} className="mt-3 text-xs text-gold hover:underline">
          Download template CSV →
        </button>
      </div>

      {/* Project selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Target Project</label>
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          className="w-full rounded-lg border border-dark-tertiary bg-dark-secondary px-4 py-3 text-white focus:border-gold focus:outline-none"
        >
          <option value="">— Select project —</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} {p.clients ? `(${p.clients.name})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* File upload */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">CSV File</label>
        <div
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-lg border-2 border-dashed border-dark-tertiary hover:border-gold/50 p-8 text-center transition-colors"
        >
          <Upload className="mx-auto h-8 w-8 text-gray-500 mb-2" />
          {fileName ? (
            <div>
              <p className="text-white font-medium">{fileName}</p>
              <p className="text-sm text-gray-400 mt-1">{rows.length} rows parsed</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-400">Click to upload CSV</p>
              <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
      </div>

      {parseError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 flex-none" />
          {parseError}
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && !result && (
        <div>
          <p className="text-sm text-gray-400 mb-2">Preview (first 3 rows):</p>
          <div className="overflow-x-auto rounded-lg border border-dark-tertiary text-xs">
            <table className="w-full">
              <thead className="bg-dark-secondary text-gray-400">
                <tr>{Object.keys(rows[0]).map(k => <th key={k} className="px-3 py-2 text-left">{k}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-dark-tertiary">
                {rows.slice(0, 3).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v, j) => <td key={j} className="px-3 py-2 text-gray-300">{String(v)}</td>)}
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
        className="w-full rounded-lg bg-gold px-4 py-3 font-semibold text-dark-bg hover:bg-[#c9a137] disabled:opacity-40 transition-colors"
      >
        {uploading ? `Uploading ${rows.length} leads...` : `Upload ${rows.length || 0} leads & trigger calls`}
      </button>

      {/* Results */}
      {result && (
        <div className="rounded-lg border border-dark-tertiary bg-dark-secondary p-5 space-y-4">
          <div className="flex gap-6">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">{result.ok} imported</span>
            </div>
            {result.failed > 0 && (
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="h-5 w-5" />
                <span className="font-semibold">{result.failed} failed</span>
              </div>
            )}
          </div>

          {result.failed > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Failed rows:</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {result.results
                  .filter(r => r.status === 'error')
                  .map(r => (
                    <div key={r.row} className="text-xs text-red-400">
                      Row {r.row}: {r.error}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {result.ok > 0 && (
            <p className="text-sm text-gray-300">
              {result.ok} leads added. Voice calls will trigger within 2 minutes during business hours (9am–9pm IST).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
