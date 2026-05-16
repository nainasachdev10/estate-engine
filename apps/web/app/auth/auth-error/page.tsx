export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="text-center">
        <h1 className="font-serif text-3xl text-[#d4af37] mb-3">Login link expired</h1>
        <p className="text-white/60 mb-6">Magic links expire after 1 hour. Please request a new one.</p>
        <a href="/" className="text-sm text-[#d4af37] hover:underline">← Back to home</a>
      </div>
    </div>
  );
}
