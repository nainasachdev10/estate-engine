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
        'id, name, slug, brand_name, contact_email, status, monthly_fee_paise, portal_allowed_emails',
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
    <section className="rounded-lg border border-dark-tertiary bg-dark-secondary p-6">
      <div className="mb-5 border-b border-dark-tertiary pb-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function WebhookRow({ name, url }: { name: string; url: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2">
      <span className="w-24 flex-none text-[11px] uppercase tracking-wider text-gray-500">
        {name}
      </span>
      <code className="flex-1 truncate font-mono text-xs text-gray-300">{url}</code>
      <CopyButton value={url} label={`${name} URL`} />
    </div>
  );
}

export default async function SettingsPage() {
  const clients = await getClients();
  const appUrl = getAppUrl();

  const webhooks = [
    { name: 'Bolna', url: `${appUrl}/api/voice/webhook` },
    { name: 'AiSensy', url: `${appUrl}/api/messaging/whatsapp` },
    { name: 'Brevo', url: `${appUrl}/api/messaging/email` },
    { name: 'Inngest', url: `${appUrl}/api/inngest` },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">
          Platform configuration, client roster, and environment health
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* PLATFORM */}
        <Section
          title="Platform"
          description="Webhook URLs and integration sync status"
        >
          <div className="mb-4 rounded-md border border-dark-tertiary bg-dark-bg p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">App URL</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 truncate font-mono text-sm text-gold">{appUrl}</code>
              <CopyButton value={appUrl} label="App URL" />
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2">
            <div>
              <p className="text-xs text-gray-300">Inngest sync</p>
              <p className="text-[10px] text-gray-500">Background jobs &amp; sequences</p>
            </div>
            <InngestStatus />
          </div>

          <p className="mb-2 text-[10px] uppercase tracking-wider text-gray-500">
            Webhook endpoints
          </p>
          <div className="space-y-2">
            {webhooks.map((w) => (
              <WebhookRow key={w.name} name={w.name} url={w.url} />
            ))}
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
            <p className="rounded-md border border-dashed border-dark-tertiary bg-dark-bg p-6 text-center text-sm text-gray-500">
              No clients yet. Add one via the database to get started.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-dark-tertiary">
              <table className="w-full text-sm">
                <thead className="bg-dark-bg text-[11px] uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Client</th>
                    <th className="px-4 py-3 text-left font-medium">Contact &amp; Portal</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Fee</th>
                    <th className="px-4 py-3 text-right font-medium">&nbsp;</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-tertiary">
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
