import { redirect } from 'next/navigation';

export default function PortalLoginPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { redirectTo?: string };
}) {
  const redirectTo = searchParams.redirectTo ?? `/portal/${params.slug}`;
  redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
}
