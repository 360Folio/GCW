// Temporary holding page so the first deploy can be checked end to end.
// Replaced in Phase 1 by the real home page.
export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="max-w-xl text-center">
        <p className="text-sm uppercase tracking-[0.2em] opacity-60">Acquire · Analyse · Act</p>
        <h1 className="mt-4 text-4xl font-bold">Global Conflict Watch</h1>
        <p className="mt-4 text-lg opacity-80">
          A new Global Conflict Watch is on the way, in English and Urdu.
        </p>
        <p className="mt-2 text-lg opacity-80" lang="ur" dir="rtl">
          گلوبل کنفلکٹ واچ کا نیا ورژن جلد آ رہا ہے۔
        </p>
      </div>
    </main>
  );
}
