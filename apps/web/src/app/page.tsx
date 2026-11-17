export default async function Home() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const status = await fetch(`${api}/health`, { cache: "no-store" })
    .then((r) => r.json())
    .catch(() => null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-b from-slate-900 to-slate-800 p-8">
      <h1 className="text-5xl font-bold text-white">File Sharer</h1>
      <p
        className={`text-lg font-medium ${status?.ok ? "text-green-400" : "text-red-400"}`}
      >
        API: {status?.ok ? "✓ connected" : "✗ unreachable"}
      </p>
    </main>
  );
}
