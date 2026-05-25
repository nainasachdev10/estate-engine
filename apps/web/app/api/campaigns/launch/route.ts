import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { createMetaCampaign } from '@realty-engine/content';

const Schema = z.object({
  campaignId: z.string().uuid(),
  dailyBudgetPaise: z.number().int().min(10000).optional(), // min ₹100
});

export async function POST(request: NextRequest) {
  try {
    const { campaignId, dailyBudgetPaise } = Schema.parse(await request.json());
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

    const result = await createMetaCampaign({
      name: campaign.name,
      dailyBudgetPaise: dailyBudgetPaise ?? campaign.budget_paise_daily ?? 50_000, // ₹500 default
      headline: campaign.headline ?? campaign.name,
      primaryText: campaign.primary_text ?? '',
      description: '',
      websiteUrl: landingUrl,
      imageUrl: campaign.creative_url ?? undefined,
    });

    await supabase.from('campaigns').update({
      external_campaign_id: result.campaignId,
      status: 'active',
      started_at: new Date().toISOString(),
    }).eq('id', campaignId);

    await logEvent('meta_campaign_launched', {
      campaignId,
      metaCampaignId: result.campaignId,
      adSetId: result.adSetId,
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
