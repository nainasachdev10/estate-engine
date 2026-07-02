import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { generateMessage } from '@realty-engine/content';
import { wrapEmailTemplate } from '@realty-engine/content';
import { sendEmail } from '@realty-engine/messaging';

function paiseToPriceRange(min: number | null, max: number | null): string {
  const fmt = (p: number) => {
    const cr = p / 10_000_000;
    const lac = p / 100_000;
    if (cr >= 1) return `₹${cr.toFixed(1)} Cr`;
    return `₹${lac.toFixed(0)} Lac`;
  };
  if (min && max) return `${fmt(min)} to ${fmt(max)}`;
  if (min) return `starting ${fmt(min)}`;
  if (max) return `up to ${fmt(max)}`;
  return 'price on request';
}

/**
 * Sends a personalised follow-up email to a lead immediately (synchronously),
 * bypassing the delayed Inngest drip. Used for the demo so the email lands the
 * moment the call is processed. Marked transactional to skip quiet-hours/rate
 * limits. Best-effort: callers should not let a failure break the main flow.
 */
export async function sendInstantFollowupEmail(leadId: string): Promise<void> {
  const supabase = getSupabaseServer();

  const { data: lead } = await supabase
    .from('leads')
    .select('*, projects(*, clients(*))')
    .eq('id', leadId)
    .single();

  if (!lead?.email) {
    await logEvent('instant_email_skipped', { leadId, reason: 'no_email' }, { leadId });
    return;
  }

  const project = Array.isArray(lead.projects) ? lead.projects[0] : lead.projects;
  const client = project?.clients
    ? Array.isArray(project.clients)
      ? project.clients[0]
      : project.clients
    : null;

  // Pull the most recent call summary so the email can reference the call.
  const { data: lastCall } = await supabase
    .from('call_logs')
    .select('summary')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const generated = await generateMessage(
    'developer_credibility',
    {
      lead: {
        fullName: lead.full_name,
        languagePref: (lead.language_pref === 'en' || lead.language_pref === 'hi' ? lead.language_pref : 'hinglish') as 'en' | 'hi' | 'hinglish',
        locationCity: lead.location_city ?? undefined,
        callSummary: lastCall?.summary ?? undefined,
      },
      project: {
        name: project?.name ?? '',
        location: project?.location ?? project?.site_address ?? '',
        unitType: project?.unit_type ?? '',
        priceRange: paiseToPriceRange(project?.price_min_paise ?? null, project?.price_max_paise ?? null),
        keyAmenities: project?.key_amenities
          ? Object.values(project.key_amenities).flat().slice(0, 5).join(', ')
          : '',
        brochureUrl: project?.brochure_url ?? undefined,
        segment: project?.segment ?? '',
        siteAddress: project?.site_address ?? undefined,
        possessionDate: project?.possession_date ?? undefined,
      },
      client: { brandName: client?.brand_name ?? client?.name ?? '' },
      sequenceStep: 0,
    },
    'email',
  );

  const html = wrapEmailTemplate({
    bodyHtml: `<p>${generated.body.replace(/\n/g, '</p><p>')}</p>`,
    brandName: client?.brand_name ?? client?.name ?? '',
    logoUrl: client?.logo_url ?? undefined,
    projectName: project?.name ?? '',
    ctaText: 'Schedule a Site Visit',
    ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://estate-engine.vercel.app'}/visit/${leadId}`,
  });

  // Send without leadId so sendEmail skips its own (subject-only) message insert
  // and rate-limit; we insert a richer message row below for the timeline.
  await sendEmail({
    to: lead.email,
    subject: generated.subject ?? `About ${project?.name}`,
    htmlBody: html,
    fromName: client?.brevo_sender_name || client?.brand_name || undefined,
    fromEmail: client?.brevo_sender_email || undefined,
    transactional: true,
  });

  await supabase.from('messages').insert([{
    lead_id: leadId,
    channel: 'email',
    direction: 'out',
    template_name: 'post_call_followup',
    body: generated.body,
    status: 'sent',
    sent_at: new Date().toISOString(),
  }]);

  await logEvent('instant_email_sent', { leadId, subject: generated.subject }, { leadId });
}
