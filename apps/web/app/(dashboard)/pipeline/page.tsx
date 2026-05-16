import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// Pipeline lives on the root page (/). Redirect here so the sidebar link works.
export default function Pipeline() {
  redirect('/');
}
