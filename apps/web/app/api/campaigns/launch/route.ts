import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { createMetaCampaign } from '@realty-engine/content';

// Four sequential Meta API calls, each with retry/backoff — can exceed 60s.
export const maxDuration = 300;

const Schema = z.object({
  campaignId: z.string().uuid(),
  dailyBudgetPaise: z.number().int().min(10000).optional(), // min ₹100
  // One of the four precisely-chosen audiences; persisted on the campaign row.
  audiencePreset: z.enum(['upgraders', 'nri', 'gift_city_professionals', 'google_high_intent']).optional(),
  // CPL guardrail: nightly watchdog alerts when spend/lead crosses this.
  cplAlertPaise: z.number().int().min(1000).optional(),
});

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { campaignId, dailyBudgetPaise, audiencePreset, cplAlertPaise } = Schema.parse(await request.json());
    const supabase = getSupabaseServer();

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*, projects(name, public_slug, brochure_url)')
      .eq('id', campaignId)
      .single();

    if (error || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.platform !== 'meta') {
      return NextResponse.json({ error: 'Only Meta campaigns can be launched via this endpoint' }, { status: 400 });
    }

    const appUrl = process.env.APP_URL ?? 'https://estate-engine.vercel.app';
    const landingUrl = campaign.projects?.public_slug
      ? `${appUrl}/p/${campaign.projects.public_slug}`
      : appUrl;

    // Prefer Higgsfield-generated image if available, fall back to campaign.creative_url
    const { data: media } = await supabase
      .from('ad_creative_media')
      .select('url, type')
      .eq('creative_id', campaignId)
      .eq('status', 'ready');
    const imageMedia = media?.find((m: { url: string; type: string }) => m.type === 'image');
    const resolvedImageUrl = imageMedia?.url ?? campaign.creative_url ?? undefined;

    const result = await createMetaCampaign({
      name: campaign.name,
      dailyBudgetPaise: dailyBudgetPaise ?? campaign.budget_paise_daily ?? 50_000, // ₹500 default
      headline: campaign.headline ?? campaign.name,
      primaryText: campaign.primary_text ?? '',
      description: '',
      websiteUrl: landingUrl,
      imageUrl: resolvedImageUrl,
      audiencePreset: audiencePreset ?? campaign.audience_preset ?? null,
    });

    const { error: updateError } = await supabase.from('campaigns').update({
      external_campaign_id: result.campaignId,
      status: 'active',
      started_at: new Date().toISOString(),
      ...(audiencePreset ? { audience_preset: audiencePreset } : {}),
      ...(cplAlertPaise ? { cpl_alert_paise: cplAlertPaise } : {}),
    }).eq('id', campaignId);

    if (updateError) {
      // Meta campaign WAS created — surface this so the operator can reconcile the
      // external ID manually instead of silently losing it and re-launching (double spend).
      await logEvent('meta_campaign_launch_db_update_failed', {
        campaignId,
        metaCampaignId: result.campaignId,
        error: updateError.message,
      });
      return NextResponse.json(
        {
          error: `Campaign created on Meta (${result.campaignId}) but failed to save locally: ${updateError.message}. Record this Meta campaign ID before retrying to avoid a duplicate.`,
          metaCampaignId: result.campaignId,
        },
        { status: 500 }
      );
    }

    await logEvent('meta_campaign_launched', {
      campaignId,
      metaCampaignId: result.campaignId,
      adSetId: result.adSetId,
      imageSource: imageMedia ? 'higgsfield' : (campaign.creative_url ? 'creative_url' : 'none'),
    });

    return NextResponse.json({
      success: true,
      metaCampaignId: result.campaignId,
      adSetId: result.adSetId,
      note: 'Campaign created as PAUSED on Meta. Review in Meta Ads Manager before setting live.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await logEvent('meta_campaign_launch_failed', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
