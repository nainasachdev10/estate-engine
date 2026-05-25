import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { sendEmail } from '@realty-engine/messaging';

const PatchSchema = z.object({
  status: z.enum(['active', 'draft', 'paused']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { status } = PatchSchema.parse(body);
    const db = getSupabaseServer();

    const { data: project, error } = await db
      .from('projects')
      .update({ status })
      .eq('id', params.id)
      .select('id, name, public_slug, clients(contact_email, name, brand_name, slug)')
      .single();

    if (error || !project) {
      return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 500 });
    }

    // Notify the client when their project goes live
    if (status === 'active' && process.env.BREVO_API_KEY) {
      const client = Array.isArray(project.clients) ? project.clients[0] : project.clients as any;
      const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://estate-engine.vercel.app';
      const landingUrl = project.public_slug ? `${appUrl}/p/${project.public_slug}` : null;
      const portalUrl = client?.slug ? `${appUrl}/portal/${client.slug}` : null;

      if (client?.contact_email) {
        sendEmail({
          to: client.contact_email,
          subject: `${project.name} is now live`,
          htmlBody: `
            <div style="font-family:Georgia,serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
              <h2 style="color:#c9a137;margin-bottom:8px;">Your project is live</h2>
              <p style="color:#444;font-size:15px;line-height:1.6;">
                <strong>${project.name}</strong> has been activated by your account manager.
                The lead pipeline is now running — leads who inquire will be called within 2 minutes
                and entered into your automated follow-up sequence.
              </p>
              ${landingUrl ? `
              <div style="margin:24px 0;">
                <a href="${landingUrl}"
                   style="background:#c9a137;color:#000;font-weight:bold;padding:12px 24px;
                          border-radius:6px;text-decoration:none;font-size:14px;display:inline-block;">
                  View Landing Page →
                </a>
              </div>` : ''}
              ${portalUrl ? `<p style="color:#888;font-size:12px;">Track leads and campaigns in your <a href="${portalUrl}" style="color:#c9a137;">dashboard</a>.</p>` : ''}
              <hr style="border:none;border-top:1px solid #eee;margin-top:32px;"/>
              <p style="color:#aaa;font-size:11px;">Sent by Realty Engine.</p>
            </div>`,
          fromName: 'Realty Engine',
        }).catch((err: Error) => {
          logEvent('project_activation_email_failed', { projectId: params.id, error: err.message });
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
