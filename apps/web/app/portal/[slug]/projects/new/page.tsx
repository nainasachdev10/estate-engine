import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@realty-engine/core';
import PortalProjectForm from './portal-project-form';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getClient(slug: string) {
  const db = getSupabaseServer();
  const { data: bySlug } = await db.from('clients').select('id, name, brand_name').eq('slug', slug).maybeSingle();
  if (bySlug) return bySlug;
  if (!UUID_RE.test(slug)) return null;
  const { data: byId } = await db.from('clients').select('id, name, brand_name').eq('id', slug).maybeSingle();
  return byId ?? null;
}

export default async function PortalNewProjectPage({ params }: { params: { slug: string } }) {
  const client = await getClient(params.slug);
  if (!client) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 border-b border-white/10 pb-8">
        <p className="mb-2 text-[10px] uppercase tracking-[0.35em] text-[#d4af37]">
          {client.brand_name ?? client.name}
        </p>
        <h1
          className="font-serif text-4xl font-bold text-[#d4af37]"
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
        >
          Submit a New Project
        </h1>
        <p className="mt-3 text-sm text-white/50">
          Fill in your project details. Our team will review and activate the listing — your leads,
          landing page, and AI follow-up sequences will go live automatically.
        </p>
      </header>

      <PortalProjectForm slug={params.slug} />
    </div>
  );
}
