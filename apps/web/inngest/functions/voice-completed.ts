// ─── Function B: voice.completed → start qualified drip if call qualified ────
//
// Listens for voice/completed events emitted by the Bolna webhook handler.
// If the call qualified (outcome === 'qualified' OR score >= 65), kick off the
// qualified drip via lead/qualified. This is the SINGLE place lead/qualified is
// emitted from the voice pipeline — the drip's first step (brochure_send, +5m)
// delivers the brochure WhatsApp, so this function must not also send one.
//
// Idempotent: each step.run is a checkpoint — Inngest will not re-execute
// successful steps on replay. We re-fetch lead state inside step.run to ensure
// we read consistent data even if the function is re-invoked.

import { inngest } from '../../inngest-client';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { refreshNextBestAction } from '../../utils/next-best-action';

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

    // Step 0: every completed call refreshes the lead's Next Best Action so
    // the operator board answers "what do I do with this lead" immediately.
    await step.run('refresh-next-best-action', async () => {
      await refreshNextBestAction(leadId);
    });

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

    // Step 2: verify the lead still exists and the client hasn't paused messaging
    const context = await step.run('fetch-context', async () => {
      const supabase = getSupabaseServer();
      const { data: lead, error } = await supabase
        .from('leads')
        .select('id, status, projects(id, clients(id, messaging_paused))')
        .eq('id', leadId)
        .single();

      if (error || !lead) {
        throw new Error(`Lead ${leadId} not found for voice/completed processing`);
      }

      const project = Array.isArray(lead.projects) ? lead.projects[0] : (lead.projects as any);
      const client = project ? (Array.isArray(project.clients) ? project.clients[0] : project.clients) : null;

      return {
        status: lead.status as string,
        messagingPaused: Boolean(client?.messaging_paused),
      };
    });

    // Honor client-level pause (operator stop button)
    if (context.messagingPaused) {
      await logEvent('voice_completed_messaging_paused', {}, { leadId });
      return { status: 'messaging_paused', leadId };
    }

    // Step 3: schedule the qualified drip via event — Function C picks this up.
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
