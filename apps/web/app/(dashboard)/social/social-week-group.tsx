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
      <div className="mb-4 flex items-center">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-600">
          {week}
        </h3>
        <div
          className="ml-3 h-px flex-1"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
        />
        <span
          className="ml-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {posts.length} post{posts.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
