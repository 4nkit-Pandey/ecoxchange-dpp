import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/server-auth";

// CampusKartt Supabase project (public credentials — already in CampusKartt's JS source)
const CK_SUPABASE_URL = "https://edzicxebgtiosahshvgi.supabase.co";
const CK_ANON_KEY =
  process.env.CAMPUSKARTT_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkemljeGViZ3Rpb3NhaHNodmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDIxMzIsImV4cCI6MjA5MDYxODEzMn0._gV35IiY97ufGvHMGDEZHiT0zISIaugK8tk90IJiJDE";

// Deterministic SSO password — user never sees or types this
// Changes when CAMPUSKARTT_WEBHOOK_SECRET rotates
function deriveSSOPassword(email: string): string {
  const secret = process.env.CAMPUSKARTT_WEBHOOK_SECRET || "ck-eco-webhook-secret-2024";
  // Simple deterministic derivation — sufficient since user never uses this password directly
  const base = Buffer.from(`${secret}::${email.toLowerCase()}`).toString("base64");
  return `EcoSSO_${base.slice(0, 20)}`;
}

async function signInToKartt(email: string, password: string) {
  const res = await fetch(
    `${CK_SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: CK_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ? data : null;
}

async function signUpToKartt(email: string, password: string, fullName: string) {
  const res = await fetch(`${CK_SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: CK_ANON_KEY,
    },
    body: JSON.stringify({
      email,
      password,
      data: { full_name: fullName },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  // If email confirmation is disabled → access_token is returned immediately
  // If required → access_token is absent (null returned → caller handles gracefully)
  return data.access_token ? data : null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated on EcoXchange" }, { status: 401 });
  }

  const email    = session.user.email;
  const fullName = session.user.name ?? email.split("@")[0];
  const password = deriveSSOPassword(email);

  // 1. Try sign-in (user already has a CampusKartt account)
  let ckSession = await signInToKartt(email, password);

  // 2. If no account yet → sign up
  if (!ckSession) {
    ckSession = await signUpToKartt(email, password, fullName);
  }

  if (!ckSession) {
    // Email confirmation may be required — return a flag so client can show manual login UI
    return NextResponse.json(
      { error: "sso_requires_confirmation", email },
      { status: 202 } // 202 = accepted but not completed (not a hard error)
    );
  }

  return NextResponse.json({
    accessToken:  ckSession.access_token,
    refreshToken: ckSession.refresh_token,
    email,
    name: fullName,
  });
}
