import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, normalizePhoneNumber, logEvent } from '@realty-engine/core';
import { inngest } from '@/inngest-client';

const RowSchema = z.object({
  full_name: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal('')),
  project_id: z.string().uuid(),
  source: z.enum(['meta', 'google', '99acres', 'organic', 'walkin', 'manual']).default('manual'),
  language_pref: z.enum(['en', 'hi', 'hinglish']).default('hinglish'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rows: unknown[] = body.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
    }
    if (rows.length > 500) {
      return NextResponse.json({ error: 'Max 500 rows per upload' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const results: { row: number; status: 'ok' | 'error'; leadId?: string; error?: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      try {
        const validated = RowSchema.parse(raw);

        let phone_e164: string;
        try {
          phone_e164 = normalizePhoneNumber(validated.phone);
        } catch {
          results.push({ row: i + 1, status: 'error', error: 'Invalid phone number' });
          continue;
        }

        const { data: newLead, error: insertErr } = await supabase
          .from('leads')
          .insert([{
            project_id: validated.project_id,
            full_name: validated.full_name,
            phone_e164,
            email: validated.email || null,
            source: validated.source,
            language_pref: validated.language_pref,
            status: 'new',
            score: 0,
            location_country: 'India',
          }])
          .select('id')
          .single();

        if (insertErr) {
          const isDuplicate = insertErr.message.includes('unique') || insertErr.code === '23505';
          results.push({ row: i + 1, status: 'error', error: isDuplicate ? 'Duplicate phone number' : insertErr.message });
          continue;
        }

        // Fire Inngest auto-call (non-blocking)
        inngest.send({ name: 'lead/created', data: { leadId: newLead.id } }).catch(() => {});

        results.push({ row: i + 1, status: 'ok', leadId: newLead.id });
      } catch (err) {
        if (err instanceof z.ZodError) {
          results.push({ row: i + 1, status: 'error', error: err.errors.map(e => e.message).join(', ') });
        } else {
          results.push({ row: i + 1, status: 'error', error: 'Unknown error' });
        }
      }
    }

    const ok = results.filter(r => r.status === 'ok').length;
    const failed = results.filter(r => r.status === 'error').length;

    await logEvent('bulk_upload', { total: rows.length, ok, failed });

    return NextResponse.json({ ok, failed, total: rows.length, results });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
