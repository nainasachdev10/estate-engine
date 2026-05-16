'use client';

import { useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';

export default function LandingPageView({ slug, projectName, variant }: {
  slug: string;
  projectName: string;
  variant: string;
}) {
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.capture('landing_page_view', {
      slug,
      project_name: projectName,
      variant,
      url: window.location.href,
      referrer: document.referrer,
    });
  }, [slug, projectName, variant, posthog]);

  return null;
}
