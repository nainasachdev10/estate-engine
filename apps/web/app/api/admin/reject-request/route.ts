import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { sendEmail } from '@realty-engine/messaging';

const Schema = z.object({ eventId: z.string().uuid() });

export async function POST(request: NextRequest) {
  try {
    const { eventId } = Schema.parse(await request.json());
    const db = getSupabaseServer();

    // Fetch existing payload so we can merge rather than overwrite
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
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
        },
      })
      .eq('id', eventId)
      .select('id')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update event', detail: updateErr.message }, { status: 500 });
    }

    // Notify the requestor
    const payload = event.payload as Record<string, string> | null;
    const requestorEmail = payload?.email;
    const requestorName = payload?.fullName ?? payload?.name ?? 'there';
    if (process.env.BREVO_API_KEY && requestorEmail) {
      sendEmail({
        to: requestorEmail,
        subject: 'Update on your Realty Engine request',
        htmlBody: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
            <h2 style="color:#333;margin-bottom:8px;">Hi ${requestorName},</h2>
            <p style="color:#444;font-size:15px;line-height:1.6;">
              Thank you for your interest in Realty Engine. After reviewing your request, we are
              unable to proceed with an account at this time.
            </p>
            <p style="color:#444;font-size:15px;line-height:1.6;">
              If you believe this is a mistake or would like to discuss further, please reply to
              this email and we'll be happy to help.
            </p>
            <hr style="border:none;border-top:1px solid #eee;margin-top:32px;"/>
            <p style="color:#aaa;font-size:11px;">Sent by Realty Engine.</p>
          </div>`,
        fromName: 'Realty Engine',
      }).catch((err: Error) => {
        logEvent('rejection_email_failed', { error: err.message });
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to reject' }, { status: 500 });
  }
}
