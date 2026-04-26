import { useStats, useActiveSessions, useVpnUsers } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Activity, Shield, ShieldAlert, ShieldX, Wifi } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { format } from "date-fns";
import { Link } from "wouter";

const CARD = "shadow-sm border-border/40 bg-card";

function StatCard({ title, value, icon: Icon, description, accent = "primary" }: any) {
  const accentColors: Record<string, string> = {
    primary: "bg-blue-500/10 text-blue-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    amber: "bg-amber-500/10 text-amber-500",
    red: "bg-red-500/10 text-red-500",
  };
  return (
    <Card className={`${CARD} hover:shadow-md transition-shadow duration-200`}>
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold tabular-nums mt-0.5">{value}</p>
            {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${accentColors[accent] || accentColors.primary}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: sessions } = useActiveSessions();

  const sessionChartData = sessions?.reduce((acc: Record<string, { time: string; sessions: number }>, s: any) => {
    const hour = format(new Date(s.startTime), "HH:00");
    if (!acc[hour]) acc[hour] = { time: hour, sessions: 0 };
    acc[hour].sessions += 1;
    return acc;
  }, {}) ?? {};

  const chartSeries = Object.values(sessionChartData).sort((a, b) => a.time.localeCompare(b.time));

  const statusData = stats?.vpnUsersByStatus ? [
    { name: "Valid", count: stats.vpnUsersByStatus.valid, color: "#10b981" },
    { name: "Expired", count: stats.vpnUsersByStatus.expired, color: "#f59e0b" },
    { name: "Revoked", count: stats.vpnUsersByStatus.revoked, color: "#ef4444" },
  ] : [];

  if (statsLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Active Sessions" value={stats?.activeSessions ?? 0} icon={Activity} description="Live tunnels" accent="emerald" />
        <StatCard title="Total VPN Users" value={stats?.totalVpnUsers ?? 0} icon={Users} description="Certificates" accent="primary" />
        <StatCard title="Valid" value={stats?.vpnUsersByStatus?.valid ?? 0} icon={Shield} accent="emerald" />
        <StatCard title="Expired / Revoked" value={(stats?.vpnUsersByStatus?.expired ?? 0) + (stats?.vpnUsersByStatus?.revoked ?? 0)} icon={ShieldAlert} accent="amber" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className={`lg:col-span-2 ${CARD}`}>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-semibold">Session Timeline</CardTitle>
            <CardDescription className="text-[11px]">Active sessions grouped by start hour</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 h-56">
            {chartSeries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No active session data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartSeries}>
                  <defs>
                    <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "6px", fontSize: "11px" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
                  <Area type="monotone" dataKey="sessions" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSessions)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className={CARD}>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-semibold">Certificate Status</CardTitle>
            <CardDescription className="text-[11px]">Breakdown by validity</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 h-56">
            {statusData.every(d => d.count === 0) ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No VPN users</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" width={60} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "6px", fontSize: "11px" }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live connections */}
      <Card className={CARD}>
        <CardHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Live Connections</CardTitle>
              <CardDescription className="text-[11px]">Currently connected VPN users</CardDescription>
            </div>
            {sessions && sessions.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                {sessions.length} active
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {sessions && sessions.length > 0 ? (
            <div className="divide-y divide-border/30">
              {sessions.slice(0, 8).map((session: any) => (
                <div key={session.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Wifi className="h-3 w-3 text-emerald-500" />
                    </div>
                    <div>
                      <Link href={`/vpn-users/${session.vpnUser?.id}`}>
                        <p className="text-xs font-medium hover:text-primary transition-colors cursor-pointer">
                          {session.vpnUser?.commonName || "Unknown"}
                        </p>
                      </Link>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {session.remoteIp} → {session.virtualIp || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {format(new Date(session.startTime), "HH:mm")}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 font-mono">
                      {session.vpnServer?.name || session.serverId}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-6 w-6 mx-auto mb-2 opacity-25" />
              <p className="text-xs">No active sessions</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
