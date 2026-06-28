import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import { getSupabaseServer } from '@realty-engine/core';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = request.nextUrl;
  const projectId = searchParams.get('project');
  const status = searchParams.get('status');

  const supabase = getSupabaseServer();
  let q = supabase
    .from('leads')
    .select('full_name, phone_e164, email, source, status, score, location_city, last_contacted_at, created_at, projects(name)')
    .order('score', { ascending: false })
    .limit(500);

  if (projectId) q = q.eq('project_id', projectId);
  if (status && status !== 'all') q = q.eq('status', status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as any[];
  const header = ['Name', 'Phone', 'Email', 'Source', 'Status', 'Score', 'City', 'Last Contacted', 'Created At', 'Project'];
  const lines = rows.map((r) => {
    const project = Array.isArray(r.projects) ? r.projects[0] : r.projects;
    const fmtDate = (iso: string | null) =>
      iso ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' }) : '';
    return [
      r.full_name,
      r.phone_e164,
      r.email ?? '',
      r.source ?? '',
      r.status,
      r.score,
      r.location_city ?? '',
      fmtDate(r.last_contacted_at),
      fmtDate(r.created_at),
      project?.name ?? '',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',');
  });

  const csv = [header.join(','), ...lines].join('\n');
  const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
