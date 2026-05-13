import { inngest } from './inngest-client';
import { triggerCall } from '@realty-engine/voice';

// IST is UTC+5:30
function isQuietHoursIST(): boolean {
  const now = new Date();
  const istHour = (now.getUTCHours() + 5) % 24 + (now.getUTCMinutes() >= 30 ? 0.5 : 0);
  // Quiet: 9pm (21:00) to 9am (9:00) IST
  return istHour >= 21 || istHour < 9;
}

function next10amIST(): Date {
  const now = new Date();
  // IST offset from UTC in minutes
  const istOffset = 5 * 60 + 30;
  const istMs = now.getTime() + istOffset * 60 * 1000;
  const istDate = new Date(istMs);

  const tomorrow = new Date(istDate);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(4, 30, 0, 0); // 10:00 IST = 04:30 UTC

  return tomorrow;
}

export const autoCallNewLead = inngest.createFunction(
  { id: 'auto-call-new-lead', name: 'Auto Call New Lead' },
  { event: 'lead/created' },
  async ({ event, step }: { event: { data: { leadId: string } }; step: any }) => {
    const { leadId } = event.data;

    // Wait 90 seconds — gives the lead time to put their phone down
    await step.sleep('wait-before-call', '90s');

    // Respect quiet hours — don't call between 9pm-9am IST
    if (isQuietHoursIST()) {
      const wakeAt = next10amIST();
      await step.sleepUntil('wait-for-business-hours', wakeAt);
    }

    await step.run('trigger-initial-call', async () => {
      return triggerCall(leadId);
    });
  }
);

export const retryNoAnswerLead = inngest.createFunction(
  { id: 'retry-no-answer-lead', name: 'Retry No Answer Lead' },
  { event: 'lead/no-answer' },
  async ({ event, step }: { event: { data: { leadId: string; attempt?: number } }; step: any }) => {
    const { leadId, attempt = 0 } = event.data;

    if (attempt >= 3) return { status: 'max_retries_reached' };

    const delays = ['30m', '4h'];
    if (attempt < delays.length) {
      await step.sleep(`wait-before-retry-${attempt}`, delays[attempt]);
    } else {
      // Third attempt: next day at 11am IST
      const target = next10amIST();
      target.setUTCHours(5, 30, 0, 0); // 11:00 IST = 05:30 UTC
      await step.sleepUntil('wait-for-next-day', target);
    }

    if (isQuietHoursIST()) {
      const wakeAt = next10amIST();
      await step.sleepUntil('wait-for-business-hours', wakeAt);
    }

    await step.run(`retry-call-${attempt + 1}`, async () => {
      return triggerCall(leadId);
    });
  }
);

export const functions = [autoCallNewLead, retryNoAnswerLead];
