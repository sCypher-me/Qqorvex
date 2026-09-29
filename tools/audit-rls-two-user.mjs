#!/usr/bin/env node

/**
 * Read-only RLS contract check.
 *
 * Required environment variables:
 *   SUPABASE_URL
 *   SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY)
 *   RLS_AUDIT_USER_A_TOKEN
 *   RLS_AUDIT_USER_B_TOKEN
 *
 * The tokens must be short-lived access tokens for two different users. The
 * script never logs them, never writes data, and only tests rows exposed by
 * PostgREST plus the app_secrets deny contract.
 */

const baseUrl = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const apiKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
const userAToken = process.env.RLS_AUDIT_USER_A_TOKEN ?? "";
const userBToken = process.env.RLS_AUDIT_USER_B_TOKEN ?? "";

if (!baseUrl || !apiKey || !userAToken || !userBToken) {
  console.error(
    "Missing SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY/SUPABASE_ANON_KEY, " +
      "RLS_AUDIT_USER_A_TOKEN or RLS_AUDIT_USER_B_TOKEN.",
  );
  process.exit(2);
}

const tablesWithUserId = [
  "tasks",
  "events",
  "goals",
  "habits",
  "notebooks",
  "library_items",
  "documents",
  "accounts",
  "transactions",
  "daily_checkins",
  "pomodoro_sessions",
  "vex_conversations",
  "gamification_stats",
  "user_badges",
];

function tokenSubject(token) {
  try {
    const [, encodedPayload] = token.split(".");
    if (!encodedPayload) throw new Error("malformed JWT");
    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(normalized, "base64url").toString("utf8"));
    if (typeof payload.sub !== "string" || !payload.sub) throw new Error("JWT has no subject");
    return payload.sub;
  } catch {
    throw new Error("RLS audit tokens must be valid JWT access tokens");
  }
}

const subjectA = tokenSubject(userAToken);
const subjectB = tokenSubject(userBToken);
if (subjectA === subjectB) {
  throw new Error("RLS audit requires two different user access tokens");
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15_000);

async function request(path, token, init = {}) {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...init,
    signal: controller.signal,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  return response;
}

async function assertUserOwnedRows(table, token, subject) {
  const response = await request(`${table}?select=user_id&limit=200`, token);
  if (!response.ok) throw new Error(`${table}: expected readable user-owned table, got ${response.status}`);
  const rows = await response.json();
  const foreignRows = rows.filter((row) => row.user_id !== subject);
  if (foreignRows.length > 0) {
    throw new Error(`${table}: returned ${foreignRows.length} row(s) owned by another user`);
  }
  return rows.length;
}

async function assertProfileRows(token, subject) {
  const response = await request("profiles?select=id&limit=200", token);
  if (!response.ok) throw new Error(`profiles: expected readable profile table, got ${response.status}`);
  const rows = await response.json();
  const foreignRows = rows.filter((row) => row.id !== subject);
  if (foreignRows.length > 0) throw new Error("profiles: returned another user's profile");
  return rows.length;
}

async function assertCannotReadOtherUser(table, token, otherSubject) {
  const response = await request(`${table}?select=user_id&user_id=eq.${encodeURIComponent(otherSubject)}`, token);
  if (!response.ok) throw new Error(`${table}: cross-user query returned HTTP ${response.status}`);
  const rows = await response.json();
  if (rows.length > 0) throw new Error(`${table}: cross-user query returned ${rows.length} row(s)`);
}

async function assertCannotReadOtherProfile(token, otherSubject) {
  const response = await request(`profiles?select=id&id=eq.${encodeURIComponent(otherSubject)}`, token);
  if (!response.ok) throw new Error(`profiles: cross-user query returned HTTP ${response.status}`);
  const rows = await response.json();
  if (rows.length > 0) throw new Error("profiles: cross-user query returned another user's profile");
}

async function assertSecretsDenied(token) {
  const response = await request("app_secrets?select=key&limit=1", token);
  if (response.status !== 401 && response.status !== 403) {
    throw new Error(`app_secrets: expected 401/403, got ${response.status}`);
  }
}

try {
  const principals = [
    { label: "user A", token: userAToken, subject: subjectA, otherSubject: subjectB },
    { label: "user B", token: userBToken, subject: subjectB, otherSubject: subjectA },
  ];

  for (const principal of principals) {
    const ownProfileRows = await assertProfileRows(principal.token, principal.subject);
    await assertCannotReadOtherProfile(principal.token, principal.otherSubject);

    const counts = [];
    for (const table of tablesWithUserId) {
      counts.push(`${table}=${await assertUserOwnedRows(table, principal.token, principal.subject)}`);
      await assertCannotReadOtherUser(table, principal.token, principal.otherSubject);
    }

    await assertSecretsDenied(principal.token);
    console.log(`${principal.label}: profile=${ownProfileRows}; ${counts.join(", ")}; app_secrets=denied`);
  }

  console.log("two-user RLS isolation audit passed (read-only)");
} finally {
  clearTimeout(timeout);
}
