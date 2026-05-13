import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'realty-engine',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
