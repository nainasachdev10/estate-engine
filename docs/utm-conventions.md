# UTM Conventions — Realty Engine

Every link we hand to a developer (or click ourselves) must follow this UTM
convention so that:

1. Source data flows into `leads.source_meta` automatically (the landing form
   reads `?utm_*` from `window.location.search`).
2. We can attribute closed-won leads back to the campaign that produced them.
3. Multi-client reports stay clean.

## Required parameters

| Param            | Allowed values                                                | Notes                                                            |
|------------------|---------------------------------------------------------------|------------------------------------------------------------------|
| `utm_source`     | `meta` · `google` · `99acres` · `whatsapp_broadcast` · `organic` | Which acquisition channel the click came from.                   |
| `utm_medium`     | `cpc` · `cpm` · `organic` · `referral`                          | Pricing model / placement.                                       |
| `utm_campaign`   | `{project_slug}-{segment}-{launch\|evergreen}`                | E.g. `the-crest-worli-luxury-launch`.                            |
| `utm_content`    | Campaign UUID from the `campaigns` table.                     | This is how we tie a click back to a specific ad creative.       |
| `utm_term`       | (optional) keyword or audience id                              | For Google search ads, the matched keyword.                      |

## Example URLs

### Meta launch campaign for The Crest, Worli

```
https://realtyengine.app/p/the-crest-worli
  ?utm_source=meta
  &utm_medium=cpc
  &utm_campaign=the-crest-worli-luxury-launch
  &utm_content=<campaigns.id UUID>
```

### Google search ad for Skyline Heights

```
https://realtyengine.app/p/skyline-heights-pune
  ?utm_source=google
  &utm_medium=cpc
  &utm_campaign=skyline-heights-pune-premium-evergreen
  &utm_content=<campaigns.id UUID>
  &utm_term=2bhk+hinjewadi
```

### 99acres listing referral

```
https://realtyengine.app/p/green-acres-lonavala
  ?utm_source=99acres
  &utm_medium=referral
  &utm_campaign=green-acres-lonavala-plot-evergreen
  &utm_content=<campaigns.id UUID>
```

### WhatsApp broadcast (campaign re-targeting)

```
https://realtyengine.app/p/the-crest-worli
  ?utm_source=whatsapp_broadcast
  &utm_medium=organic
  &utm_campaign=the-crest-worli-luxury-launch
  &utm_content=<campaigns.id UUID>
```

## How it flows into the DB

1. User clicks ad → lands on `/p/[slug]` with UTMs in the querystring.
2. `LeadForm` reads the querystring on submit and includes the UTMs in
   `source_meta` along with the slug.
3. `/api/leads/intake` writes `source = 'organic'` (the DB check constraint
   restricts the enum) and stores `{ source_type: 'landing', slug, utm_* }`
   in `source_meta`.
4. Reports / pipeline views read `source_meta -> utm_*` to attribute the lead.

> If we ever want to add `landing` as a first-class `source`, update the
> `leads` table check constraint in a new migration and tighten the Zod
> `IntakeSchema` enum accordingly.

## Operational rules

- Campaign UUIDs go in `utm_content`. Never put the campaign name there — it
  changes when copy is edited, but the UUID is immutable.
- `utm_campaign` is always lowercase, hyphen-separated, in the shape
  `{slug}-{segment}-{launch|evergreen}`. No spaces, no underscores.
- For paid social, always set `utm_medium=cpc` even when buying CPM —
  reporting tools treat `cpc` as paid; `cpm` is reserved for true brand
  campaigns where we explicitly want to mark it as awareness-only.
