import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/server-auth";

const CK_SUPABASE_URL = "https://edzicxebgtiosahshvgi.supabase.co";
const CK_ANON_KEY =
  process.env.CAMPUSKARTT_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkemljeGViZ3Rpb3NhaHNodmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDIxMzIsImV4cCI6MjA5MDYxODEzMn0._gV35IiY97ufGvHMGDEZHiT0zISIaugK8tk90IJiJDE";
const CK_SERVICE_KEY =
  process.env.CAMPUSKARTT_SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkemljeGViZ3Rpb3NhaHNodmdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA0MjEzMiwiZXhwIjoyMDkwNjE4MTMyfQ.lfY4hfhi784dGrbVWwwi_ALYIKkZV_mOCQVuoamkGB4";

// Deterministic SSO password
function deriveSSOPassword(email: string): string {
  const secret = process.env.CAMPUSKARTT_WEBHOOK_SECRET || "ck-eco-webhook-secret-2024";
  const base = Buffer.from(`${secret}::${email.toLowerCase()}`).toString("base64");
  return `EcoSSO_${base.slice(0, 20)}`;
}

// ── Strategy 1: sign-in with deterministic SSO password (returning SSO users) ──
async function signInToKartt(email: string, password: string) {
  const res = await fetch(`${CK_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: CK_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ? data : null;
}

// ── Strategy 2: admin create confirmed user (brand-new users) ──
// Returns: "created" | "exists" | "error"
async function adminCreateUser(email: string, password: string, fullName: string) {
  const res = await fetch(`${CK_SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: CK_SERVICE_KEY,
      Authorization: `Bearer ${CK_SERVICE_KEY}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    }),
  });
  if (res.status === 422) return "exists";   // User already registered
  if (!res.ok) return "error";
  return "created";
}

// ── Strategy 3: generate server-side magic link + exchange for session ──
// Works for ANY existing user regardless of their current password.
// The admin generate_link endpoint does NOT send an email — we get the link directly.
async function generateSessionViaMagicLink(email: string): Promise<{ access_token: string; refresh_token: string } | null> {
  // Step A: Generate magic link (server-side, no email sent)
  const genRes = await fetch(`${CK_SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: CK_SERVICE_KEY,
      Authorization: `Bearer ${CK_SERVICE_KEY}`,
    },
    body: JSON.stringify({
      type: "magiclink",
      email,
    }),
  });

  if (!genRes.ok) return null;
  const genData = await genRes.json();

  // Extract token hash from the action_link URL
  // action_link = https://.../auth/v1/verify?token=HASH&type=magiclink&...
  const actionLink: string = genData.properties?.action_link ?? genData.action_link ?? "";
  if (!actionLink) return null;

  let token: string | null = null;
  try {
    token = new URL(actionLink).searchParams.get("token");
  } catch {
    return null;
  }
  if (!token) return null;

  // Step B: Exchange the token for a session
  // /auth/v1/verify redirects with access_token + refresh_token in the Location hash
  const verifyRes = await fetch(
    `${CK_SUPABASE_URL}/auth/v1/verify?token=${encodeURIComponent(token)}&type=magiclink&redirect_to=https://www.campuskartt.in`,
    { redirect: "manual" }
  );

  const location = verifyRes.headers.get("location") ?? "";
  if (!location) return null;

  // Parse fragment from Location header: #access_token=...&refresh_token=...
  const hashIdx = location.indexOf("#");
  if (hashIdx === -1) return null;
  const params = new URLSearchParams(location.slice(hashIdx + 1));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (access_token && refresh_token) return { access_token, refresh_token };

  return null;
}

// ── Strategy 4: anon signup fallback (works when email confirmation is disabled) ──
async function signUpToKartt(email: string, password: string, fullName: string) {
  const res = await fetch(`${CK_SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: CK_ANON_KEY },
    body: JSON.stringify({ email, password, data: { full_name: fullName } }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ? data : null;
}

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated on EcoXchange" }, { status: 401 });
  }

  const email    = session.user.email;
  const fullName = session.user.name ?? email.split("@")[0];
  const password = deriveSSOPassword(email);

  // ── Step 1: Fastest path — returning SSO users already have the right password
  let ckSession = await signInToKartt(email, password);
  if (ckSession) {
    return NextResponse.json({ accessToken: ckSession.access_token, refreshToken: ckSession.refresh_token });
  }

  // ── Step 2: Try to create a new CampusKartt account (brand-new user)
  const createResult = await adminCreateUser(email, password, fullName);
  if (createResult === "created") {
    ckSession = await signInToKartt(email, password);
    if (ckSession) {
      return NextResponse.json({ accessToken: ckSession.access_token, refreshToken: ckSession.refresh_token });
    }
  }

  // ── Step 3: User already exists with their own password — generate a magic link
  //    session server-side (no email sent, works with any existing account)
  const magicSession = await generateSessionViaMagicLink(email);
  if (magicSession) {
    return NextResponse.json({ accessToken: magicSession.access_token, refreshToken: magicSession.refresh_token });
  }

  // ── Step 4: Fallback — anon signup (works if email confirmation is disabled)
  ckSession = await signUpToKartt(email, password, fullName);
  if (ckSession) {
    return NextResponse.json({ accessToken: ckSession.access_token, refreshToken: ckSession.refresh_token });
  }

  // ── Step 5: Everything failed — user must sign in manually on CampusKartt
  return NextResponse.json({ error: "sso_requires_manual_login", email }, { status: 202 });
}
