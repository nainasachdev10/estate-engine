'use client';

import SocialPostCard, { type SocialPost } from './social-post-card';

export default function SocialWeekGroup({
  week,
  posts,
  busy,
  onApprove,
  onSkip,
}: {
  week: string;
  posts: SocialPost[];
  busy: Record<string, boolean>;
  onApprove: (id: string) => void;
  onSkip: (id: string) => void;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between border-l-2 border-gold pl-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">{week}</h3>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Week</p>
        </div>
        <span className="rounded-full bg-dark-secondary px-2.5 py-0.5 text-[11px] text-gray-400">
          {posts.length} post{posts.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((p) => (
          <SocialPostCard
            key={p.id}
            post={p}
            busy={!!busy[p.id]}
            onApprove={() => onApprove(p.id)}
            onSkip={() => onSkip(p.id)}
          />
        ))}
      </div>
    </section>
  );
}
