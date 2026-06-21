// ─── Function B: voice.completed → trigger WhatsApp template if qualified ────
//
// Listens for voice/completed events emitted by the Bolna webhook handler.
// If the call qualified (outcome === 'qualified' OR score >= 65), send the
// brochure WhatsApp template and kick off the qualified drip via lead/qualified.
//
// Idempotent: each step.run is a checkpoint — Inngest will not re-execute
// successful steps on replay. We re-fetch lead state inside step.run to ensure
// we read consistent data even if the function is re-invoked.

import { inngest } from '../../inngest-client';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { sendTemplate } from '@realty-engine/messaging';

interface VoiceCompletedEvent {
  data: {
    leadId: string;
    outcome: string;
    score: number;
  };
}

export const whatsappOnVoiceCompleted = inngest.createFunction(
  { id: 'whatsapp-on-voice-completed', name: 'WhatsApp on Voice Completed' },
  { event: 'voice/completed' },
  async ({ event, step }: { event: VoiceCompletedEvent; step: any }) => {
    const { leadId, outcome, score } = event.data;

    // Step 1: gate on qualification — short-circuit non-qualified calls
    const qualifies = await step.run('check-qualification', async () => {
      const ok = outcome === 'qualified' || score >= 65;
      await logEvent(
        'voice_completed_qualification_check',
        { outcome, score, qualifies: ok },
        { leadId },
      );
      return ok;
    });

    if (!qualifies) {
      return { status: 'not_qualified', leadId };
    }

    // Step 2: fetch full context (lead + project + client) for templating
    const context = await step.run('fetch-context', async () => {
      const supabase = getSupabaseServer();
      const { data: lead, error } = await supabase
        .from('leads')
        .select('id, full_name, phone_e164, status, projects(id, name, brochure_url, clients(id, brand_name, name, aisensy_api_key, aisensy_sender_id, messaging_paused))')
        .eq('id', leadId)
        .single();

      if (error || !lead) {
        throw new Error(`Lead ${leadId} not found for voice/completed processing`);
      }

      const project = Array.isArray(lead.projects) ? lead.projects[0] : (lead.projects as any);
      const client = project ? (Array.isArray(project.clients) ? project.clients[0] : project.clients) : null;

      return {
        fullName: lead.full_name as string,
        phone: lead.phone_e164 as string,
        status: lead.status as string,
        projectName: (project?.name ?? '') as string,
        brochureUrl: (project?.brochure_url ?? null) as string | null,
        brandName: (client?.brand_name ?? client?.name ?? '') as string,
        aisensyApiKey: (client?.aisensy_api_key ?? null) as string | null,
        aisensySenderId: (client?.aisensy_sender_id ?? null) as string | null,
        messagingPaused: Boolean(client?.messaging_paused),
      };
    });

    // Honor client-level pause (operator stop button)
    if (context.messagingPaused) {
      await logEvent('voice_completed_messaging_paused', {}, { leadId });
      return { status: 'messaging_paused', leadId };
    }

    // Step 3: send the brochure followup template — the post-call standard touch
    await step.run('send-whatsapp-template', async () => {
      try {
        await sendTemplate({
          phone: context.phone,
          templateName: 'brochure_followup',
          params: [context.fullName, context.brandName, context.projectName],
          mediaUrl: context.brochureUrl ?? undefined,
          leadId,
          creds: {
            apiKey: context.aisensyApiKey ?? undefined,
            senderId: context.aisensySenderId ?? undefined,
          },
        });
      } catch (err) {
        // Sendtemplate already logged via aisensy module — re-throw to let
        // Inngest retry per its policy (idempotent: messages table dedup happens
        // upstream in sendTemplate via daily rate limit).
        await logEvent(
          'whatsapp_on_voice_completed_send_failed',
          { error: err instanceof Error ? err.message : String(err) },
          { leadId },
        );
        throw err;
      }
    });

    // Step 4: schedule the qualified drip via event — Function C picks this up.
    // This is idempotent because Inngest dedupes by step id, and the drip itself
    // checkpoints each step.
    await step.run('schedule-followup-drip', async () => {
      await inngest.send({
        name: 'lead/qualified',
        data: { leadId },
      });
      await logEvent('voice_completed_drip_scheduled', { score, outcome }, { leadId });
    });

    return { status: 'qualified_drip_started', leadId };
  },
);
