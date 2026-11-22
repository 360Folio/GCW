import { connection } from "next/server";

// Used by the uptime monitor and to confirm a deploy is live.
export async function GET() {
  await connection(); // always answer at request time, never from the build
  return Response.json(
    { status: "ok", time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
