import { serve } from 'inngest/next';
import { inngest } from '@/inngest-client';
import { functions } from '@/inngest-functions';

// Inngest steps (Claude generation, Higgsfield polling, provider sends) execute
// inside this route — the platform default timeout truncates them mid-step.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
