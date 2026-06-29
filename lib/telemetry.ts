import { createAdminClient } from "@/lib/supabase/admin";

export interface Series {
  labels: string[];
  data: number[];
}

export interface AdminUserRow {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  banned: boolean;
  items: number;
  hasKey: boolean;
}

export interface Telemetry {
  totals: {
    users: number;
    items: number;
    done: number;
    processing: number;
    pending: number;
    error: number;
    usersWithKey: number;
    catalogs: number;
  };
  active: { d7: number; d30: number };
  catalogSeconds: { avg: number | null; median: number | null; p90: number | null };
  signups: { day: Series; week: Series; month: Series };
  scansByHour: number[]; // 24 buckets, by capture time
  scansByDay: Series; // last 30 days, captures/day
  users: AdminUserRow[];
}

const DAY = 86_400_000;

export async function getTelemetry(): Promise<Telemetry> {
  const admin = createAdminClient();
  const now = new Date();

  // --- Auth users (paginated) ---------------------------------------------
  type AuthUser = {
    id: string;
    email?: string;
    created_at: string;
    last_sign_in_at?: string | null;
    banned_until?: string | null;
  };
  const authUsers: AuthUser[] = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    authUsers.push(...(data.users as unknown as AuthUser[]));
    if (data.users.length < 1000) break;
  }

  // --- App data (service role bypasses RLS) -------------------------------
  const { data: itemRows } = await admin
    .from("packrite_catalog_items")
    .select("user_id, status, created_at, cataloged_at");
  const items = itemRows ?? [];

  const { data: keyRows } = await admin
    .from("packrite_user_api_keys")
    .select("user_id");
  const keyedUsers = new Set((keyRows ?? []).map((k) => k.user_id));

  const { count: catalogCount } = await admin
    .from("packrite_catalogs")
    .select("id", { count: "exact", head: true });

  // --- Totals --------------------------------------------------------------
  const totals = {
    users: authUsers.length,
    items: items.length,
    done: items.filter((i) => i.status === "done").length,
    processing: items.filter((i) => i.status === "processing").length,
    pending: items.filter((i) => i.status === "pending").length,
    error: items.filter((i) => i.status === "error").length,
    usersWithKey: keyedUsers.size,
    catalogs: catalogCount ?? 0,
  };

  // --- Items per user + activity ------------------------------------------
  const itemsByUser = new Map<string, number>();
  const activeBy7 = new Set<string>();
  const activeBy30 = new Set<string>();
  for (const i of items) {
    itemsByUser.set(i.user_id, (itemsByUser.get(i.user_id) ?? 0) + 1);
    const age = now.getTime() - new Date(i.created_at).getTime();
    if (age <= 7 * DAY) activeBy7.add(i.user_id);
    if (age <= 30 * DAY) activeBy30.add(i.user_id);
  }
  for (const u of authUsers) {
    if (!u.last_sign_in_at) continue;
    const age = now.getTime() - new Date(u.last_sign_in_at).getTime();
    if (age <= 7 * DAY) activeBy7.add(u.id);
    if (age <= 30 * DAY) activeBy30.add(u.id);
  }

  // --- Cataloging time -----------------------------------------------------
  const durations: number[] = [];
  for (const i of items) {
    if (i.status === "done" && i.cataloged_at) {
      const s =
        (new Date(i.cataloged_at).getTime() - new Date(i.created_at).getTime()) /
        1000;
      if (s >= 0 && s < 3600) durations.push(s); // ignore outliers > 1h
    }
  }
  durations.sort((a, b) => a - b);
  const catalogSeconds = {
    avg: durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null,
    median: durations.length ? durations[Math.floor(durations.length / 2)] : null,
    p90: durations.length
      ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.9))]
      : null,
  };

  // --- Time series ---------------------------------------------------------
  const signupDates = authUsers.map((u) => new Date(u.created_at));
  const captureDates = items.map((i) => new Date(i.created_at));

  const scansByHour = new Array(24).fill(0) as number[];
  for (const d of captureDates) scansByHour[d.getHours()] += 1;

  return {
    totals,
    active: { d7: activeBy7.size, d30: activeBy30.size },
    catalogSeconds,
    signups: {
      day: bucketDaily(signupDates, now, 30),
      week: bucketWeekly(signupDates, now, 12),
      month: bucketMonthly(signupDates, now, 12),
    },
    scansByHour,
    scansByDay: bucketDaily(captureDates, now, 30),
    users: authUsers
      .map((u) => ({
        id: u.id,
        email: u.email ?? "—",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        banned: Boolean(
          u.banned_until && new Date(u.banned_until).getTime() > now.getTime(),
        ),
        items: itemsByUser.get(u.id) ?? 0,
        hasKey: keyedUsers.has(u.id),
      }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  };
}

// --- bucketing helpers -----------------------------------------------------

function bucketDaily(dates: Date[], now: Date, days: number): Series {
  const labels: string[] = [];
  const data: number[] = [];
  const index = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY);
    const key = d.toISOString().slice(0, 10);
    index.set(key, labels.length);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    data.push(0);
  }
  for (const d of dates) {
    const key = d.toISOString().slice(0, 10);
    const idx = index.get(key);
    if (idx !== undefined) data[idx] += 1;
  }
  return { labels, data };
}

function bucketWeekly(dates: Date[], now: Date, weeks: number): Series {
  const labels: string[] = [];
  const data: number[] = [];
  const starts: number[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = now.getTime() - i * 7 * DAY;
    const start = end - 7 * DAY;
    starts.push(start);
    const d = new Date(start);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    data.push(0);
  }
  for (const d of dates) {
    const t = d.getTime();
    for (let w = 0; w < starts.length; w++) {
      const lo = starts[w];
      const hi = lo + 7 * DAY;
      if (t > lo && t <= hi) {
        data[w] += 1;
        break;
      }
    }
  }
  return { labels, data };
}

function bucketMonthly(dates: Date[], now: Date, months: number): Series {
  const labels: string[] = [];
  const data: number[] = [];
  const index = new Map<string, number>();
  const fmt = new Intl.DateTimeFormat("en", { month: "short" });
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    index.set(key, labels.length);
    labels.push(fmt.format(d));
    data.push(0);
  }
  for (const d of dates) {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const idx = index.get(key);
    if (idx !== undefined) data[idx] += 1;
  }
  return { labels, data };
}
