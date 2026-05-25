import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { createSupabaseServerClient } from '@/utils/supabase/server';

const Schema = z.object({
  fullName: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  activeProjects: z.string().min(1),
  monthlyLeadVolume: z.string().min(1),
  message: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = Schema.parse(body);

    // Get the requesting user's email (they must be authenticated)
    const authSupabase = createSupabaseServerClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    const db = getSupabaseServer();
    await logEvent('access_requested', {
      company: data.company,
      activeProjects: data.activeProjects,
      monthlyLeadVolume: data.monthlyLeadVolume,
      hasEmail: !!user?.email,
    });

    // Store in events table as a structured record
    await db.from('events').insert({
      type: 'access_request',
      payload: {
        fullName: data.fullName,
        company: data.company,
        activeProjects: data.activeProjects,
        monthlyLeadVolume: data.monthlyLeadVolume,
        message: data.message ?? '',
        requestedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
