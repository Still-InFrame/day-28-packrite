import { createClient } from "@/lib/supabase/server";

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
  scans: { day: Series; week: Series; month: Series };
  scansByHour: number[];
  users: AdminUserRow[];
}

// Shape returned by the packrite_admin_overview() SECURITY DEFINER function.
interface OverviewRow {
  catalogs: number;
  users: Array<{
    id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    banned: boolean;
    items: number;
    has_key: boolean;
    last_item_at: string | null;
  }>;
  items: Array<{
    status: string;
    created_at: string;
    cataloged_at: string | null;
  }>;
}

const DAY = 86_400_000;

// All time-of-day / calendar bucketing is done in Eastern Time, regardless of
// where the server runs (Vercel runs in UTC).
const TZ = "America/New_York";
const ET_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const ET_HOUR = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour: "2-digit",
  hour12: false,
  hourCycle: "h23",
});
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const etDateKey = (d: Date) => ET_DATE.format(d); // "YYYY-MM-DD" in ET
const etHour = (d: Date) => parseInt(ET_HOUR.format(d), 10) % 24;
const mdLabel = (key: string) => {
  const [, m, d] = key.split("-");
  return `${+m}/${+d}`;
};

// No service-role key: the admin-gated SECURITY DEFINER RPC reads auth.users for
// us and returns the raw data; we aggregate the time-series here.
export async function getTelemetry(): Promise<Telemetry> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("packrite_admin_overview");
  if (error || !data) throw error ?? new Error("no telemetry");

  const o = data as OverviewRow;
  const now = new Date();
  const users = o.users ?? [];
  const items = o.items ?? [];

  const totals = {
    users: users.length,
    items: items.length,
    done: items.filter((i) => i.status === "done").length,
    processing: items.filter((i) => i.status === "processing").length,
    pending: items.filter((i) => i.status === "pending").length,
    error: items.filter((i) => i.status === "error").length,
    usersWithKey: users.filter((u) => u.has_key).length,
    catalogs: o.catalogs ?? 0,
  };

  let d7 = 0;
  let d30 = 0;
  for (const u of users) {
    const last = Math.max(
      u.last_item_at ? new Date(u.last_item_at).getTime() : 0,
      u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0,
    );
    if (!last) continue;
    const age = now.getTime() - last;
    if (age <= 7 * DAY) d7 += 1;
    if (age <= 30 * DAY) d30 += 1;
  }

  const durations: number[] = [];
  for (const i of items) {
    if (i.status === "done" && i.cataloged_at) {
      const s =
        (new Date(i.cataloged_at).getTime() - new Date(i.created_at).getTime()) /
        1000;
      if (s >= 0 && s < 3600) durations.push(s);
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

  const signupDates = users.map((u) => new Date(u.created_at));
  const captureDates = items.map((i) => new Date(i.created_at));
  const scansByHour = new Array(24).fill(0) as number[];
  for (const d of captureDates) scansByHour[etHour(d)] += 1;

  return {
    totals,
    active: { d7, d30 },
    catalogSeconds,
    signups: {
      day: bucketDaily(signupDates, now, 30),
      week: bucketWeekly(signupDates, now, 12),
      month: bucketMonthly(signupDates, now, 12),
    },
    scans: {
      day: bucketDaily(captureDates, now, 30),
      week: bucketWeekly(captureDates, now, 12),
      month: bucketMonthly(captureDates, now, 12),
    },
    scansByHour,
    users: users
      .map((u) => ({
        id: u.id,
        email: u.email ?? "—",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        banned: u.banned,
        items: u.items,
        hasKey: u.has_key,
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
    const key = etDateKey(new Date(now.getTime() - i * DAY));
    if (index.has(key)) continue; // DST edge — merge the rare duplicate day
    index.set(key, labels.length);
    labels.push(mdLabel(key));
    data.push(0);
  }
  for (const d of dates) {
    const idx = index.get(etDateKey(d));
    if (idx !== undefined) data[idx] += 1;
  }
  return { labels, data };
}

function bucketWeekly(dates: Date[], now: Date, weeks: number): Series {
  const labels: string[] = [];
  const data: number[] = [];
  const starts: number[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = now.getTime() - i * 7 * DAY - 7 * DAY;
    starts.push(start);
    labels.push(mdLabel(etDateKey(new Date(start))));
    data.push(0);
  }
  for (const d of dates) {
    const t = d.getTime();
    for (let w = 0; w < starts.length; w++) {
      if (t > starts[w] && t <= starts[w] + 7 * DAY) {
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
  const nowKey = etDateKey(now); // YYYY-MM-DD in ET
  const y = Number(nowKey.slice(0, 4));
  const m = Number(nowKey.slice(5, 7)); // 1-12
  for (let i = months - 1; i >= 0; i--) {
    let mm = m - i;
    let yy = y;
    while (mm <= 0) {
      mm += 12;
      yy -= 1;
    }
    const key = `${yy}-${String(mm).padStart(2, "0")}`;
    index.set(key, labels.length);
    labels.push(MONTHS[mm - 1]);
    data.push(0);
  }
  for (const d of dates) {
    const idx = index.get(etDateKey(d).slice(0, 7));
    if (idx !== undefined) data[idx] += 1;
  }
  return { labels, data };
}
