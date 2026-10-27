export function DemoBanner() {
  return (
    <div className="border-b border-[#eadbb8] bg-gold-soft text-[0.8125rem] text-[#6e5016]">
      <p className="container-page py-2">
        <strong className="font-semibold">Demo mode</strong> — sample data kept in memory; it resets when the dev server
        restarts. Configure Supabase in <code className="rounded bg-white/60 px-1">.env.local</code> to use a real database.
      </p>
    </div>
  );
}
