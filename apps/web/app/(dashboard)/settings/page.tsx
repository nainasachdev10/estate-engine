import { getSupabaseServer } from '@realty-engine/core';
import CopyButton from './copy-button';
import ClientRow, { type ClientLite } from './client-row';
import EnvChecklist from './env-checklist';
import InngestStatus from './inngest-status';

export const dynamic = 'force-dynamic';

async function getClients(): Promise<ClientLite[]> {
  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from('clients')
      .select(
        'id, name, slug, brand_name, contact_email, status, monthly_fee_paise, portal_allowed_emails, bolna_agent_id, bolna_from_number, aisensy_api_key, aisensy_sender_id, brevo_sender_email, brevo_sender_name',
      )
      .order('created_at', { ascending: true });
    return (data ?? []) as ClientLite[];
  } catch {
    return [];
  }
}

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    'http://localhost:3000'
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <div
        className="px-6 py-4 border-b"
        style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <h3 className="text-[13px] font-bold text-white">{title}</h3>
        {description && <p className="mt-0.5 text-[12px] text-gray-500">{description}</p>}
      </div>
      <div style={{ backgroundColor: '#090909' }}>{children}</div>
    </section>
  );
}

function WebhookRow({ name, url }: { name: string; url: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
    >
      <span className="w-20 flex-none text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
        {name}
      </span>
      <code className="flex-1 truncate font-mono text-[12px] text-gray-300">{url}</code>
      <CopyButton value={url} label={`${name} URL`} />
    </div>
  );
}

export default async function SettingsPage() {
  const clients = await getClients();
  const appUrl = getAppUrl();

  const webhooks = [
    { name: 'Bolna', url: `${appUrl}/api/voice/webhook` },
    { name: 'AiSensy', url: `${appUrl}/api/messaging/whatsapp-webhook` },
    { name: 'Brevo', url: `${appUrl}/api/messaging/email-webhook` },
    { name: 'Meta Leads', url: `${appUrl}/api/leads/meta-lead-ads-webhook` },
    { name: 'Inngest', url: `${appUrl}/api/inngest` },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: '#D4AF37' }}>Admin</p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white">Settings</h1>
          <p className="mt-1 text-[14px] text-gray-500">
            Platform configuration, client roster, and environment health
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* PLATFORM */}
        <Section
          title="Platform"
          description="Webhook URLs and integration sync status"
        >
          <div className="p-6 space-y-3">
            <div
              className="rounded-xl px-4 py-3"
              style={{ backgroundColor: 'rgba(212,175,55,0.06)', borderColor: 'rgba(212,175,55,0.18)', borderWidth: 1, borderStyle: 'solid' }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: '#D4AF37' }}
              >
                App URL
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 truncate font-mono text-[13px] text-white">{appUrl}</code>
                <CopyButton value={appUrl} label="App URL" />
              </div>
            </div>

            <div
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <div>
                <p className="text-[13px] font-semibold text-white">Inngest sync</p>
                <p className="text-[11px] text-gray-500">Background jobs &amp; sequences</p>
              </div>
              <InngestStatus />
            </div>

            <div className="pt-2">
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                Webhook endpoints
              </p>
              <div className="space-y-2">
                {webhooks.map((w) => (
                  <WebhookRow key={w.name} name={w.name} url={w.url} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ENVIRONMENT */}
        <Section
          title="Environment"
          description="Required env vars — only configured/missing is shown, never the values"
        >
          <EnvChecklist />
        </Section>
      </div>

      {/* CLIENTS — full width below */}
      <div className="mt-6">
        <Section
          title="Clients"
          description={`${clients.length} client${clients.length === 1 ? '' : 's'} on the platform`}
        >
          {clients.length === 0 ? (
            <div className="p-6">
              <p
                className="rounded-xl border border-dashed p-8 text-center text-[13px] text-gray-500"
                style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                No clients yet. Add one via the database to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <tr className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    <th className="px-6 py-3 text-left">Client</th>
                    <th className="px-6 py-3 text-left">Contact &amp; Portal</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Fee</th>
                    <th className="px-6 py-3 text-right">&nbsp;</th>
                  </tr>
                </thead>
                <tbody
                  className="divide-y"
                  style={{ ['--tw-divide-opacity' as string]: 1 }}
                >
                  {clients.map((c) => (
                    <ClientRow key={c.id} client={c} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
