export type SequenceKind =
  | 'brochure_send'
  | 'site_visit_nudge'
  | 'developer_credibility'
  | 'social_proof'
  | 'urgency_inventory'
  | 'last_chance'
  | 'gentle_intro'
  | 'value_prop'
  | 'final_followup'
  | 'confirm_callback_time'
  | 'visit_confirmed'
  | 'visit_reminder'
  | 'post_visit_followup';

export type SequenceChannel = 'whatsapp' | 'email';

export interface SequenceStep {
  delay_minutes: number;
  channel: SequenceChannel;
  kind: SequenceKind;
}

export type SequenceName = keyof typeof SEQUENCES;

export const SEQUENCES: Record<string, SequenceStep[]> = {
  qualified_warm: [
    { delay_minutes: 5,     channel: 'whatsapp', kind: 'brochure_send' },
    { delay_minutes: 60,    channel: 'whatsapp', kind: 'site_visit_nudge' },
    { delay_minutes: 1440,  channel: 'email',    kind: 'developer_credibility' },
    { delay_minutes: 2880,  channel: 'whatsapp', kind: 'social_proof' },
    { delay_minutes: 5760,  channel: 'whatsapp', kind: 'urgency_inventory' },
    { delay_minutes: 10080, channel: 'email',    kind: 'last_chance' },
  ],
  callback_requested: [
    { delay_minutes: 10, channel: 'whatsapp', kind: 'confirm_callback_time' },
  ],
  no_answer: [
    { delay_minutes: 5,    channel: 'whatsapp', kind: 'gentle_intro' },
    { delay_minutes: 1440, channel: 'whatsapp', kind: 'value_prop' },
    { delay_minutes: 4320, channel: 'email',    kind: 'final_followup' },
  ],
  site_visit_booked: [
    { delay_minutes: 5,    channel: 'whatsapp', kind: 'visit_confirmed' },
    { delay_minutes: 1440, channel: 'whatsapp', kind: 'visit_reminder' },
    { delay_minutes: 2880, channel: 'whatsapp', kind: 'post_visit_followup' },
  ],
};
