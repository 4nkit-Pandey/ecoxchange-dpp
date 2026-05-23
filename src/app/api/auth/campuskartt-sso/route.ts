import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/server-auth";

// CampusKartt Supabase project (anon key is already public in CampusKartt's JS source)
const CK_SUPABASE_URL = "https://edzicxebgtiosahshvgi.supabase.co";
const CK_ANON_KEY =
  process.env.CAMPUSKARTT_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkemljeGViZ3Rpb3NhaHNodmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDIxMzIsImV4cCI6MjA5MDYxODEzMn0._gV35IiY97ufGvHMGDEZHiT0zISIaugK8tk90IJiJDE";
const CK_SERVICE_KEY = process.env.CAMPUSKARTT_SUPABASE_SERVICE_KEY ?? "";

// Deterministic SSO password — user never sees or types this
function deriveSSOPassword(email: string): string {
  const secret = process.env.CAMPUSKARTT_WEBHOOK_SECRET || "ck-eco-webhook-secret-2024";
  const base = Buffer.from(`${secret}::${email.toLowerCase()}`).toString("base64");
  return `EcoSSO_${base.slice(0, 20)}`;
}

// Try normal password sign-in
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

// Sign up as a brand-new user (works when email confirmation is disabled)
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

// Admin: find existing user by email
async function adminGetUser(email: string) {
  if (!CK_SERVICE_KEY) return null;
  const res = await fetch(
    `${CK_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}&page=1&per_page=1`,
    {
      headers: {
        apikey: CK_SERVICE_KEY,
        Authorization: `Bearer ${CK_SERVICE_KEY}`,
      },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.users?.[0] ?? null;
}

// Admin: reset user's password to our deterministic SSO password
async function adminResetPassword(userId: string, password: string) {
  if (!CK_SERVICE_KEY) return false;
  const res = await fetch(`${CK_SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      apikey: CK_SERVICE_KEY,
      Authorization: `Bearer ${CK_SERVICE_KEY}`,
    },
    body: JSON.stringify({ password }),
  });
  return res.ok;
}

// Admin: create a new confirmed user directly
async function adminCreateUser(email: string, password: string, fullName: string) {
  if (!CK_SERVICE_KEY) return null;
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
      email_confirm: true,               // skip confirmation entirely
      user_metadata: { full_name: fullName },
    }),
  });
  if (!res.ok) return null;
  return res.json(); // returns created user object (no session — must sign in after)
}

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated on EcoXchange" }, { status: 401 });
  }

  const email    = session.user.email;
  const fullName = session.user.name ?? email.split("@")[0];
  const password = deriveSSOPassword(email);

  // ── Step 1: Try sign-in with SSO password (fastest path — works for returning SSO users)
  let ckSession = await signInToKartt(email, password);
  if (ckSession) {
    return NextResponse.json({ accessToken: ckSession.access_token, refreshToken: ckSession.refresh_token });
  }

  // ── Step 2: Check if user already exists in CampusKartt (signed up with their own password)
  if (CK_SERVICE_KEY) {
    const existingUser = await adminGetUser(email);

    if (existingUser) {
      // User exists but with a different password — reset it to our SSO password
      const reset = await adminResetPassword(existingUser.id, password);
      if (reset) {
        ckSession = await signInToKartt(email, password);
        if (ckSession) {
          return NextResponse.json({ accessToken: ckSession.access_token, refreshToken: ckSession.refresh_token });
        }
      }
    } else {
      // Brand new user — create directly with email confirmed
      await adminCreateUser(email, password, fullName);
      ckSession = await signInToKartt(email, password);
      if (ckSession) {
        return NextResponse.json({ accessToken: ckSession.access_token, refreshToken: ckSession.refresh_token });
      }
    }
  }

  // ── Step 3: Fallback — try anon signup (works when email confirmation is disabled)
  ckSession = await signUpToKartt(email, password, fullName);
  if (ckSession) {
    return NextResponse.json({ accessToken: ckSession.access_token, refreshToken: ckSession.refresh_token });
  }

  // ── Step 4: Nothing worked — tell client to show manual login
  return NextResponse.json(
    { error: "sso_requires_confirmation", email },
    { status: 202 }
  );
}
