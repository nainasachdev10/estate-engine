import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { sendEmail } from '@realty-engine/messaging';

const Schema = z.object({
  eventId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().min(1),
  company: z.string().min(1),
});

function makeSlug(company: string): string {
  return company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, email, fullName, company } = Schema.parse(body);

    const db = getSupabaseServer();

    // Check if client already exists for this email
    const { data: existing } = await db
      .from('clients')
      .select('id, slug')
      .or(`contact_email.eq.${email},portal_allowed_emails.cs.{${email}}`)
      .maybeSingle();

    let portalSlug: string;

    if (existing) {
      portalSlug = existing.slug ?? existing.id;
    } else {
      // Generate a unique slug
      const baseSlug = makeSlug(company) || makeSlug(fullName) || 'client';
      let slug = baseSlug;
      let attempt = 0;

      while (true) {
        const { data: conflict } = await db
          .from('clients')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();
        if (!conflict) break;
        attempt++;
        slug = `${baseSlug}-${attempt}`;
      }

      const { data: newClient, error: insertErr } = await db
        .from('clients')
        .insert({
          name: company,
          brand_name: company,
          slug,
          contact_email: email,
          status: 'active',
        })
        .select('id, slug')
        .single();

      if (insertErr || !newClient) {
        return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
      }

      portalSlug = newClient.slug ?? newClient.id;
    }

    // Mark the event as approved
    const { data: event, error: fetchErr } = await db
      .from('events')
      .select('payload')
      .eq('id', eventId)
      .single();

    if (fetchErr || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const { error: updateErr } = await db
      .from('events')
      .update({
        payload: {
          ...(event.payload ?? {}),
          status: 'approved',
          approvedAt: new Date().toISOString(),
          portalSlug,
        },
      })
      .eq('id', eventId)
      .select('id')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update event', detail: updateErr.message }, { status: 500 });
    }

    // Send welcome email — awaited so failures surface to the caller
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://estate-engine.vercel.app';
    const loginUrl = `${appUrl}/login?redirectTo=${encodeURIComponent('/portal/' + portalSlug)}`;
    const portalUrl = `${appUrl}/portal/${portalSlug}`;

    let emailSent = false;
    let emailError: string | undefined;

    if (!process.env.BREVO_API_KEY) {
      emailError = 'BREVO_API_KEY is not configured';
    } else {
      try {
        await sendEmail({
          to: email,
          subject: 'Your Realty Engine portal is ready',
          transactional: true,
          htmlBody: `
            <div style="font-family:Georgia,serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
              <h2 style="color:#c9a137;margin-bottom:8px;">Welcome, ${fullName}</h2>
              <p style="color:#444;font-size:15px;line-height:1.6;">
                Your account has been approved. You can now access your private dashboard to track
                leads, campaigns, and social posts for your projects.
              </p>
              <div style="margin:28px 0;text-align:center;">
                <a href="${loginUrl}"
                   style="background:#c9a137;color:#000;font-weight:bold;padding:14px 28px;
                          border-radius:6px;text-decoration:none;font-size:14px;display:inline-block;">
                  Access Your Portal →
                </a>
              </div>
              <p style="color:#666;font-size:13px;line-height:1.6;">
                <strong>How to get in:</strong> Click the button above. If this is your first time,
                choose <em>Create an account</em> using <strong>${email}</strong> and set a password.
                If you've signed in before, just sign in and you'll be taken straight to your portal.
              </p>
              <p style="color:#888;font-size:12px;margin-top:16px;">
                Your portal: <a href="${portalUrl}" style="color:#c9a137;">${portalUrl}</a>
              </p>
              <hr style="border:none;border-top:1px solid #eee;margin-top:32px;"/>
              <p style="color:#aaa;font-size:11px;">Sent by Realty Engine. Reply to this email if you have questions.</p>
            </div>`,
          fromName: 'Realty Engine',
        });
        emailSent = true;
      } catch (err) {
        emailError = err instanceof Error ? err.message : 'Unknown email error';
        logEvent('approval_welcome_email_failed', { email, error: emailError }).catch(() => null);
      }
    }

    return NextResponse.json({ success: true, portalSlug, emailSent, emailError });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Approval failed' }, { status: 500 });
  }
}
