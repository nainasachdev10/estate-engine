// Meta Marketing API integration
// Requires: META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_PAGE_ID

import { fetchWithRetry } from '@realty-engine/core';

const META_API_BASE = 'https://graph.facebook.com/v19.0';

export type AudiencePreset = 'upgraders' | 'nri' | 'gift_city_professionals' | 'google_high_intent';

// The four precisely-chosen audiences from the workforce spec, expressed as
// Meta targeting. HOUSING special-ad-category rules apply: no age/gender/
// detailed-demographic targeting — geo (and geo radius) is what's allowed,
// so each preset is a geography, not a demographic.
// 'google_high_intent' is a Google Ads audience — on Meta it falls back to
// the default IN-wide targeting and exists as a campaign label only.
export const AUDIENCE_PRESETS: Record<AudiencePreset, { description: string; targeting: Record<string, unknown> }> = {
  upgraders: {
    description: 'Home upgraders in Ahmedabad + Gandhinagar',
    targeting: {
      geo_locations: {
        cities: [
          { key: '2213751', radius: 25, distance_unit: 'kilometer' }, // Ahmedabad
          { key: '2214094', radius: 15, distance_unit: 'kilometer' }, // Gandhinagar
        ],
      },
    },
  },
  nri: {
    description: 'NRI Gujaratis — UAE, US, UK, Canada, Australia, Singapore',
    targeting: {
      geo_locations: { countries: ['AE', 'US', 'GB', 'CA', 'AU', 'SG'] },
      locales: [46, 24], // Gujarati, English(UK) — language, not demographics
    },
  },
  gift_city_professionals: {
    description: 'Professionals around GIFT City / SG Highway corridor',
    targeting: {
      geo_locations: {
        custom_locations: [
          { latitude: 23.1645, longitude: 72.6841, radius: 12, distance_unit: 'kilometer' }, // GIFT City
          { latitude: 23.0300, longitude: 72.5070, radius: 8, distance_unit: 'kilometer' },  // SG Highway
        ],
      },
    },
  },
  google_high_intent: {
    description: 'High-intent Google searchers (Google Ads audience — Meta fallback is broad IN)',
    targeting: { geo_locations: { countries: ['IN'] } },
  },
};

export interface MetaCampaignInput {
  name: string;
  objective?: 'OUTCOME_TRAFFIC' | 'OUTCOME_AWARENESS' | 'OUTCOME_LEADS';
  dailyBudgetPaise: number;
  headline: string;
  primaryText: string;
  description?: string;
  websiteUrl: string;
  imageUrl?: string;
  audiencePreset?: AudiencePreset | null;
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

  const res = await fetchWithRetry(`${META_API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  }, { provider: 'meta-ads' });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Meta API error: ${data.error?.message ?? JSON.stringify(data)}`);
  }
  return data;
}

export async function createMetaCampaign(input: MetaCampaignInput): Promise<MetaCampaignResult> {
  const rawAdAccountId = process.env.META_AD_ACCOUNT_ID;
  const pageId = process.env.META_PAGE_ID;

  if (!rawAdAccountId) throw new Error('META_AD_ACCOUNT_ID not set');
  if (!pageId) throw new Error('META_PAGE_ID not set');

  // Accept the env var with or without the documented "act_" prefix — the path
  // below adds it, and "act_act_123" 400s on the Graph API.
  const adAccountId = rawAdAccountId.replace(/^act_/, '');

  // 1. Create campaign
  // Use OUTCOME_TRAFFIC so the ad links to our landing page URL — OUTCOME_LEADS requires
  // a Meta Instant Form which we don't have. Leads are captured on our own landing page.
  const campaign = await metaPost(`/act_${adAccountId}/campaigns`, {
    name: input.name,
    objective: input.objective ?? 'OUTCOME_TRAFFIC',
    status: 'PAUSED', // Always create paused — operator reviews before going live
    // Real estate ads MUST declare the HOUSING special ad category — Meta
    // rejects (and can flag the ad account of) housing ads that omit it.
    special_ad_categories: ['HOUSING'],
    special_ad_category_country: ['IN'],
  });

  // 2. Create ad set
  // HOUSING ads cannot use age or gender targeting (Meta forces 18-65+ broad
  // targeting for special ad categories) — sending age_min/age_max here is an
  // API error once the category is declared.
  const adSet = await metaPost(`/act_${adAccountId}/adsets`, {
    name: `${input.name} — Ad Set`,
    campaign_id: campaign.id,
    optimization_goal: 'LINK_CLICKS',
    billing_event: 'IMPRESSIONS',
    daily_budget: Math.round(input.dailyBudgetPaise), // Meta budgets are in the currency's minor unit (paise for INR)
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    targeting: input.audiencePreset
      ? AUDIENCE_PRESETS[input.audiencePreset].targeting
      : { geo_locations: { countries: ['IN'] } },
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
