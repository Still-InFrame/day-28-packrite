import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import { getTelemetry, type Telemetry } from "@/lib/telemetry";
import { LineChart } from "@/components/admin/LineChart";
import { RangeChart } from "@/components/admin/RangeChart";
import { CountryPie } from "@/components/admin/CountryPie";
import { UserList } from "@/components/admin/UserList";
import { Wordmark } from "@/components/Brand";

export const dynamic = "force-dynamic";

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => {
  const period = h < 12 ? "a" : "p";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${period}`;
});

function fmtSeconds(s: number | null): string {
  if (s === null) return "—";
  if (s < 1) return `${Math.round(s * 1000)}ms`;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${(s / 60).toFixed(1)}m`;
}

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/");

  let data: Telemetry | null = null;
  try {
    data = await getTelemetry();
  } catch {
    data = null;
  }

  return (
    <div className="flex-1 px-4 pb-28 pt-8">
      <header className="mb-6 flex items-center justify-between">
        <Wordmark />
        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          Admin
        </span>
      </header>

      <h1 className="text-2xl font-semibold tracking-tight">Telemetry</h1>
      <p className="mt-1 text-sm text-muted">The heartbeat of packrite.</p>

      {!data ? (
        <SetupNeeded />
      ) : (
        <Dashboard data={data} adminId={admin.id} />
      )}
    </div>
  );
}

function Dashboard({ data, adminId }: { data: Telemetry; adminId: string }) {
  const { totals, active, catalogSeconds } = data;
  const keyPct = totals.users
    ? Math.round((totals.usersWithKey / totals.users) * 100)
    : 0;

  return (
    <>
      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Kpi label="Users" value={totals.users} sub={`${active.d7} active this week`} />
        <Kpi
          label="Items cataloged"
          value={totals.done}
          sub={`${totals.items} captured total`}
        />
        <Kpi
          label="Claude key adoption"
          value={`${keyPct}%`}
          sub={`${totals.usersWithKey}/${totals.users} users`}
        />
        <Kpi
          label="Avg catalog time"
          value={fmtSeconds(catalogSeconds.avg)}
          sub={`med ${fmtSeconds(catalogSeconds.median)} · p90 ${fmtSeconds(catalogSeconds.p90)}`}
        />
        <Kpi
          label="In progress"
          value={totals.pending + totals.processing}
          sub={`${active.d30} active this month`}
        />
        <Kpi
          label="Errors"
          value={totals.error}
          sub={`${totals.catalogs} buckets`}
          danger={totals.error > 0}
        />
      </div>

      {/* Charts */}
      <div className="mt-4 flex flex-col gap-4">
        <RangeChart title="Signups" series={data.signups} color="#4f46e5" />
        <RangeChart title="Captures" series={data.scans} color="#7c3aed" />

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <h3 className="text-sm font-semibold">When scans come in</h3>
          <p className="mb-3 text-xs text-muted">Captures by hour of day (ET)</p>
          <LineChart labels={HOUR_LABELS} data={data.scansByHour} color="#0891b2" />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Where users are</h3>
          <p className="mb-3 text-xs text-muted">By IP country</p>
          {data.countries.data.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              No location data yet.
            </p>
          ) : (
            <CountryPie
              labels={data.countries.labels}
              data={data.countries.data}
            />
          )}
        </div>
      </div>

      {/* Users */}
      <div className="mt-7">
        <h2 className="mb-3 text-base font-semibold">
          Users <span className="text-muted">({data.users.length})</span>
        </h2>
        <UserList users={data.users} adminId={adminId} />
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  sub,
  danger = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tracking-tight ${
          danger ? "text-red-600" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function SetupNeeded() {
  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="text-base font-semibold text-amber-900">
        Couldn&apos;t load telemetry
      </h2>
      <p className="mt-1 text-sm leading-6 text-amber-800">
        The admin data function didn&apos;t return. Make sure your account is in
        the <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">packrite_admins</code>{" "}
        allowlist, then reload.
      </p>
    </div>
  );
}
