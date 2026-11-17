export default async function Home() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const status = await fetch(`${api}/health`, { cache: "no-store" })
    .then((r) => r.json())
    .catch(() => null);

  return (
    <main>
      <h1>File Sharer</h1>
      <p>API: {status?.ok ? "connected" : "unreachable"}</p>
    </main>
  );
}
