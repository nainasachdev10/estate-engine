// Landing pages render without the internal sidebar / dashboard chrome.
// This layout intentionally returns the children directly inside a full-bleed wrapper.
export default function PublicLandingLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen w-full">{children}</div>;
}
