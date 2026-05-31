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
        <p className="py-8 text-center text-[13px] text-gray-600">No messages sent yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {channels.map((c) => (
            <div
              key={c.channel}
              className="rounded-xl border p-4"
              style={{
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderColor: 'rgba(255,255,255,0.05)',
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                {labelFor[c.channel] ?? c.channel}
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-white">
                {c.sent.toLocaleString('en-IN')}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-600">sent</p>
              <div
                className="mt-3 flex items-center gap-4 border-t pt-3 text-[12px]"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}
              >
                <span className="text-gray-500">
                  <span className="font-mono font-bold text-emerald-400">{c.deliveredPct}%</span>{' '}
                  delivered
                </span>
                <span className="text-gray-500">
                  <span className="font-mono font-bold" style={{ color: '#D4AF37' }}>
                    {c.readPct}%
                  </span>{' '}
                  read
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
    <Card
      title="Social Engine"
      subtitle={`${social.total.toLocaleString('en-IN')} posts in pipeline`}
    >
      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatTile label="Draft" value={String(social.draft)} />
        <StatTile label="Scheduled" value={String(social.scheduled)} />
        <StatTile label="Posted" value={String(social.posted)} />
      </div>

      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
        Posts by platform
      </p>
      {social.platforms.length === 0 ? (
        <p className="text-[13px] text-gray-600">No posts generated yet.</p>
      ) : (
        <div
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {social.platforms.map((p, idx) => (
            <div
              key={p.platform}
              className="flex items-center justify-between px-4 py-2.5 text-[13px]"
              style={
                idx > 0
                  ? { borderTop: '1px solid rgba(255,255,255,0.04)' }
                  : undefined
              }
            >
              <span className="flex items-center gap-2 capitalize text-gray-300">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${PLATFORM_DOT[p.platform] ?? 'bg-gray-500'}`}
                />
                {p.platform}
              </span>
              <span className="font-mono font-semibold text-gray-400">{p.count}</span>
            </div>
          ))}
        </div>
      )}

      {campaignLeads.length > 0 && (
        <div
          className="mt-5 border-t pt-5"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
            Leads acquired by ad platform
          </p>
          <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            {campaignLeads.map((c, idx) => (
              <div
                key={c.platform}
                className="flex items-center justify-between px-4 py-2.5 text-[13px]"
                style={
                  idx > 0
                    ? { borderTop: '1px solid rgba(255,255,255,0.04)' }
                    : undefined
                }
              >
                <span className="flex items-center gap-2 capitalize text-gray-300">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${PLATFORM_DOT[c.platform] ?? 'bg-gray-500'}`}
                  />
                  {c.platform}
                </span>
                <span className="font-mono font-bold" style={{ color: '#D4AF37' }}>
                  {c.leads.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
