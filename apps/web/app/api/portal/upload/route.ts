import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { getSupabaseServer } from '@realty-engine/core';

const BUCKET = 'project-assets';
const MAX_SIZE = 15 * 1024 * 1024; // 15MB

const ALLOWED: Record<string, string[]> = {
  brochure: ['application/pdf'],
  hero: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};

export async function POST(request: NextRequest) {
  // Verify authenticated session (client or admin)
  const authClient = createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const type = (formData.get('type') as string | null) ?? 'hero';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 15 MB)' }, { status: 400 });
  }

  const allowed = ALLOWED[type];
  if (!allowed) {
    return NextResponse.json({ error: 'Unknown file type' }, { status: 400 });
  }
  if (!allowed.includes(file.type)) {
    const exts = type === 'brochure' ? 'PDF' : 'JPEG, PNG, or WebP';
    return NextResponse.json({ error: `Please upload a ${exts} file` }, { status: 400 });
  }

  const db = getSupabaseServer();

  // Create bucket if it doesn't exist (idempotent)
  await db.storage.createBucket(BUCKET, { public: true }).catch(() => { /* already exists */ });

  const ext = file.name.split('.').pop()?.toLowerCase() ?? (type === 'brochure' ? 'pdf' : 'jpg');
  const path = `${type}s/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadErr } = await db.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
