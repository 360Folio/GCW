import { getAuth } from "@/lib/auth";

// All login, logout and two-factor requests go through Better Auth.
export async function GET(request: Request) {
  return getAuth().handler(request);
}

export async function POST(request: Request) {
  return getAuth().handler(request);
}
