export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fff8fb] px-6 py-10 text-[#25161d]">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col justify-center gap-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a83f62]">
            3D Tulip Memory Gallery
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-6xl">
            Six memories, arranged as a rotating tulip.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#6f4c5c] sm:text-lg">
            Phase 1 setup is in place. The next task will build on this
            foundation one feature at a time.
          </p>
        </div>
      </section>
    </main>
  );
}
