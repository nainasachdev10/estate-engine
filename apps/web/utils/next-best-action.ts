import { getSupabaseServer, logEvent, formatPriceRange } from '@realty-engine/core';
import { generateNextBestAction, type NextBestAction } from '@realty-engine/content';

/**
 * Regenerates the lead's Next Best Action from everything currently known
 * (score, triggers, last call, recent messages) and persists it on the lead.
 * Best-effort: returns null on any failure rather than breaking the caller.
 */
export async function refreshNextBestAction(leadId: string): Promise<NextBestAction | null> {
  const supabase = getSupabaseServer();

  try {
    const [{ data: lead }, { data: lastCall }, { data: messages }, { data: triggers }] = await Promise.all([
      supabase.from('leads')
        .select('id, full_name, status, score, horizon, language_pref, do_not_contact, projects(name, location, segment, price_min_paise, price_max_paise, clients(brand_name, name))')
        .eq('id', leadId).single(),
      supabase.from('call_logs').select('summary').eq('lead_id', leadId)
        .not('summary', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('messages').select('direction, channel, body')
        .eq('lead_id', leadId).order('created_at', { ascending: false }).limit(5),
      supabase.from('lead_triggers').select('trigger, evidence, confidence')
        .eq('lead_id', leadId).order('created_at', { ascending: false }).limit(3),
    ]);

    if (!lead) return null;

    // Opted-out leads have exactly one correct action — no Claude call needed.
    if (lead.do_not_contact) {
      const nba: NextBestAction = {
        action: 'drop',
        channel: 'email',
        best_time_ist: '—',
        opening_line: '—',
        reason: 'Lead opted out of contact.',
      };
      await supabase.from('leads').update({ next_best_action: { ...nba, generated_at: new Date().toISOString() } }).eq('id', leadId);
      return nba;
    }

    const project: any = Array.isArray(lead.projects) ? lead.projects[0] : lead.projects;
    const client: any = project ? (Array.isArray(project.clients) ? project.clients[0] : project.clients) : null;

    const nba = await generateNextBestAction({
      fullName: lead.full_name,
      status: lead.status,
      score: lead.score ?? 0,
      horizon: lead.horizon ?? null,
      languagePref: lead.language_pref ?? null,
      callSummary: lastCall?.summary ?? null,
      triggers: (triggers ?? []) as any,
      recentMessages: (messages ?? []) as any,
      project: {
        name: project?.name ?? '',
        location: project?.location ?? null,
        segment: project?.segment ?? null,
        priceRange: formatPriceRange(project?.price_min_paise ?? null, project?.price_max_paise ?? null),
      },
      brandName: client?.brand_name ?? client?.name ?? '',
    });

    await supabase.from('leads')
      .update({ next_best_action: { ...nba, generated_at: new Date().toISOString() } })
      .eq('id', leadId);

    return nba;
  } catch (err) {
    await logEvent('nba_generation_failed', {
      leadId,
      error: err instanceof Error ? err.message : String(err),
    }, { leadId });
    return null;
  }
}
