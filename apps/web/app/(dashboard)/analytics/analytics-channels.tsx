import { Card, StatTile, PLATFORM_DOT } from './analytics-primitives';
import type { ChannelRow, SocialPlatformRow } from './analytics-primitives';

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

export function MessagingSection({ channels }: { channels: ChannelRow[] }) {
  const labelFor: Record<string, string> = {
    whatsapp: 'WhatsApp',
    email: 'Email',
    sms: 'SMS',
  };
  return (
    <Card title="Messaging Engine" subtitle="WhatsApp · Email · SMS delivery">
      {channels.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">No messages sent yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {channels.map((c) => (
            <div key={c.channel} className="rounded-lg border border-dark-tertiary bg-dark-bg p-4">
              <p className="text-sm font-medium text-gray-200">{labelFor[c.channel] ?? c.channel}</p>
              <p className="mt-1 text-2xl font-bold text-gold">{c.sent.toLocaleString('en-IN')}</p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-gray-500">sent</p>
              <div className="mt-3 flex gap-4 text-xs">
                <span className="text-gray-400">
                  <span className="font-mono text-green-400">{c.deliveredPct}%</span> delivered
                </span>
                <span className="text-gray-400">
                  <span className="font-mono text-blue-400">{c.readPct}%</span> read
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Social + campaign attribution
// ---------------------------------------------------------------------------

export function SocialSection({
  social,
  campaignLeads,
}: {
  social: {
    platforms: SocialPlatformRow[];
    draft: number;
    scheduled: number;
    posted: number;
    total: number;
  };
  campaignLeads: { platform: string; leads: number }[];
}) {
  return (
    <Card title="Social Engine" subtitle={`${social.total.toLocaleString('en-IN')} posts in pipeline`}>
      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatTile label="Draft" value={String(social.draft)} />
        <StatTile label="Scheduled" value={String(social.scheduled)} />
        <StatTile label="Posted" value={String(social.posted)} />
      </div>

      <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-gray-500">Posts by platform</p>
      {social.platforms.length === 0 ? (
        <p className="text-sm text-gray-500">No posts generated yet.</p>
      ) : (
        <div className="space-y-1.5">
          {social.platforms.map((p) => (
            <div key={p.platform} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 capitalize text-gray-300">
                <span className={`h-2 w-2 rounded-full ${PLATFORM_DOT[p.platform] ?? 'bg-gray-500'}`} />
                {p.platform}
              </span>
              <span className="font-mono text-gray-400">{p.count}</span>
            </div>
          ))}
        </div>
      )}

      {campaignLeads.length > 0 && (
        <div className="mt-5 border-t border-dark-tertiary pt-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-gray-500">
            Leads acquired by ad platform
          </p>
          <div className="space-y-1.5">
            {campaignLeads.map((c) => (
              <div key={c.platform} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 capitalize text-gray-300">
                  <span className={`h-2 w-2 rounded-full ${PLATFORM_DOT[c.platform] ?? 'bg-gray-500'}`} />
                  {c.platform}
                </span>
                <span className="font-mono text-gold">{c.leads.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
