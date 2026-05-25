// Meta Marketing API integration
// Requires: META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_PAGE_ID

const META_API_BASE = 'https://graph.facebook.com/v19.0';

export interface MetaCampaignInput {
  name: string;
  objective?: 'OUTCOME_TRAFFIC' | 'OUTCOME_AWARENESS' | 'OUTCOME_LEADS';
  dailyBudgetPaise: number;
  headline: string;
  primaryText: string;
  description?: string;
  websiteUrl: string;
  imageUrl?: string;
}

export interface MetaCampaignResult {
  campaignId: string;
  adSetId: string;
  adCreativeId: string;
  adId: string;
}

async function metaPost(path: string, body: Record<string, unknown>): Promise<any> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error('META_ACCESS_TOKEN not set');

  const res = await fetch(`${META_API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Meta API error: ${data.error?.message ?? JSON.stringify(data)}`);
  }
  return data;
}

export async function createMetaCampaign(input: MetaCampaignInput): Promise<MetaCampaignResult> {
  const adAccountId = process.env.META_AD_ACCOUNT_ID;
  const pageId = process.env.META_PAGE_ID;

  if (!adAccountId) throw new Error('META_AD_ACCOUNT_ID not set');
  if (!pageId) throw new Error('META_PAGE_ID not set');

  // 1. Create campaign
  // Use OUTCOME_TRAFFIC so the ad links to our landing page URL — OUTCOME_LEADS requires
  // a Meta Instant Form which we don't have. Leads are captured on our own landing page.
  const campaign = await metaPost(`/act_${adAccountId}/campaigns`, {
    name: input.name,
    objective: input.objective ?? 'OUTCOME_TRAFFIC',
    status: 'PAUSED', // Always create paused — operator reviews before going live
    special_ad_categories: [],
  });

  // 2. Create ad set
  const adSet = await metaPost(`/act_${adAccountId}/adsets`, {
    name: `${input.name} — Ad Set`,
    campaign_id: campaign.id,
    optimization_goal: 'LINK_CLICKS',
    billing_event: 'IMPRESSIONS',
    daily_budget: Math.round(input.dailyBudgetPaise / 100), // paise → rupees
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    targeting: {
      geo_locations: { countries: ['IN'] },
      age_min: 25,
      age_max: 65,
    },
    status: 'PAUSED',
  });

  // 3. Create ad creative
  const creative = await metaPost(`/act_${adAccountId}/adcreatives`, {
    name: `${input.name} — Creative`,
    object_story_spec: {
      page_id: pageId,
      link_data: {
        link: input.websiteUrl,
        message: input.primaryText,
        name: input.headline,
        description: input.description ?? '',
        ...(input.imageUrl ? { picture: input.imageUrl } : {}),
        call_to_action: { type: 'LEARN_MORE' },
      },
    },
  });

  // 4. Create ad
  const ad = await metaPost(`/act_${adAccountId}/ads`, {
    name: input.name,
    adset_id: adSet.id,
    creative: { creative_id: creative.id },
    status: 'PAUSED',
  });

  return {
    campaignId: campaign.id,
    adSetId: adSet.id,
    adCreativeId: creative.id,
    adId: ad.id,
  };
}
