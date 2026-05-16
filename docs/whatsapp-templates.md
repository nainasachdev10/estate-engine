# WhatsApp Templates — Submit for Meta Approval

> Submit these in AiSensy → Templates → New Template. Meta approval takes 24-48 hours.
> UTILITY templates approve faster. Avoid emojis, CTAs like "click here", and superlatives.

---

## Template 1: `lead_intro_hi` (UTILITY)

**Language:** Hindi  
**Category:** UTILITY  
**Use:** First message to any new lead (within 24hr window)

```
Namaste {{1}}, {{2}} ki taraf se main bol rahi hun. Aapne {{3}} ke baare mein enquire kiya tha. Bohot shukriya! Kya main aapko quick brochure bhej sakti hun? Reply *YES* karein.
```

**Variables:**
1. Lead name (e.g. Rajesh)
2. Brand name (e.g. Orchid Developers)
3. Project name (e.g. Orchid Heights)

**Sample:** Namaste Rajesh, Orchid Developers ki taraf se main bol rahi hun. Aapne Orchid Heights ke baare mein enquire kiya tha. Bohot shukriya! Kya main aapko quick brochure bhej sakti hun? Reply YES karein.

---

## Template 2: `lead_intro_en` (UTILITY)

**Language:** English  
**Category:** UTILITY  
**Use:** First message for English-preference leads

```
Hi {{1}}, this is {{2}} from {{3}}. You had enquired about {{4}} — thank you for your interest! May I send you a quick brochure? Reply YES to receive it.
```

**Variables:**
1. Lead name
2. Agent name (e.g. Priya)
3. Brand name
4. Project name

**Sample:** Hi Rajesh, this is Priya from Orchid Developers. You had enquired about Orchid Heights — thank you for your interest! May I send you a quick brochure? Reply YES to receive it.

---

## Template 3: `brochure_followup` (UTILITY)

**Language:** Hindi  
**Category:** UTILITY  
**Use:** Sent after lead replies YES to lead_intro

```
Namaste {{1}} ji! Yahan {{2}} ka brochure hai: {{3}}

Koi bhi sawaal ho toh zaroor poochein. Main yahan hun!
```

**Variables:**
1. Lead name
2. Project name
3. Brochure URL

**Sample:** Namaste Rajesh ji! Yahan Orchid Heights ka brochure hai: https://... Koi bhi sawaal ho toh zaroor poochein. Main yahan hun!

---

## Template 4: `site_visit_invite` (MARKETING)

**Language:** Hindi  
**Category:** MARKETING  
**Use:** Inviting lead for site visit after qualification

```
Hi {{1}}, kya aap is weekend {{2}} site visit ke liye available hain? {{3}} mein ek brand new model flat ready hai. Koi commitment nahi — bas ek baar dekh lo. Kaunsa din suit karega?
```

**Variables:**
1. Lead name
2. Project name
3. Project location

**Sample:** Hi Rajesh, kya aap is weekend Orchid Heights site visit ke liye available hain? Andheri West mein ek brand new model flat ready hai. Koi commitment nahi — bas ek baar dekh lo. Kaunsa din suit karega?

---

## Template 5: `callback_confirm` (UTILITY)

**Language:** Hindi  
**Category:** UTILITY  
**Use:** Confirming a callback time the lead requested

```
Namaste {{1}} ji, {{2}} ki taraf se — humne note kar liya hai ki aap {{3}} pe baat karna chahte hain. Hum tab zaroor call karenge. Shukriya!
```

**Variables:**
1. Lead name
2. Brand name
3. Callback time (e.g. "kal 11 baje")

**Sample:** Namaste Rajesh ji, Orchid Developers ki taraf se — humne note kar liya hai ki aap kal 11 baje pe baat karna chahte hain. Hum tab zaroor call karenge. Shukriya!

---

## Template 6: `gentle_intro` (UTILITY)

**Language:** Hindi  
**Category:** UTILITY  
**Use:** First WhatsApp to a lead who didn't answer the call

```
Namaste {{1}} ji! Main {{2}} ki taraf se bol rahi hun. Aapne {{3}} mein property mein interest dikhaya tha. Koi bhi sawaal ho — main yahan hun, reply karein!
```

**Variables:**
1. Lead name
2. Brand name
3. Project name

**Sample:** Namaste Rajesh ji! Main Orchid Developers ki taraf se bol rahi hun. Aapne Orchid Heights mein interest dikhaya tha. Koi bhi sawaal ho — main yahan hun, reply karein!

---

## Submission Checklist

- [ ] Submit all 6 templates in AiSensy dashboard
- [ ] Set category correctly (UTILITY vs MARKETING)
- [ ] Set language correctly (hi vs en)
- [ ] Add sample values for each variable
- [ ] Wait 24-48 hours for Meta approval
- [ ] Once approved, set `approved = true` in `wa_templates` table in Supabase

## Tips for Faster Approval

- UTILITY templates approve in ~24 hours, MARKETING takes up to 48 hours
- Avoid: "click here", "limited time", "exclusive offer", "guaranteed"
- Avoid emojis in UTILITY templates
- Keep it factual and service-oriented for UTILITY
- For MARKETING, ensure clear opt-out path exists in your privacy policy
