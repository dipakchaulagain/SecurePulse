import { useState, useMemo } from "react";
import { useSessionHistory } from "@/hooks/use-data";
import { format, differenceInMinutes, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Download, Calendar as CalendarIcon, X, ArrowUpDown, Clock, History } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

function fmt(startTime: string, endTime: string | null): string {
  if (!endTime) return "—";
  const diff = new Date(endTime).getTime() - new Date(startTime).getTime();
  if (diff < 0) return "0s";
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h % 24}h`);
  if (m || h || d) parts.push(`${m % 60}m`);
  parts.push(`${s % 60}s`);
  return parts.join(" ");
}

export default function AccountingPage() {
  const { data: sessions, isLoading } = useSessionHistory();
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const filtered = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s: any) => {
      const term = searchTerm.toLowerCase();
      if (searchTerm && !s.vpnUser?.commonName?.toLowerCase().includes(term) && !s.remoteIp?.toLowerCase().includes(term)) return false;
      if (startDate || endDate) {
        const d = new Date(s.startTime);
        const start = startDate ? startOfDay(startDate) : new Date(0);
        const end = endDate ? endOfDay(endDate) : new Date(8640000000000000);
        if (!isWithinInterval(d, { start, end })) return false;
      }
      return true;
    });
  }, [sessions, searchTerm, startDate, endDate]);

  const avgMin = useMemo(() => {
    const withEnd = filtered.filter((s: any) => s.endTime);
    if (!withEnd.length) return 0;
    return Math.round(withEnd.reduce((a: number, s: any) => a + differenceInMinutes(new Date(s.endTime), new Date(s.startTime)), 0) / withEnd.length);
  }, [filtered]);

  const exportCsv = () => {
    if (!filtered.length) return;
    const rows = [
      ["Common Name", "Remote IP", "Virtual IP", "VPN Server", "Start", "End", "Duration"],
      ...filtered.map((s: any) => [
        s.vpnUser?.commonName || "Unknown", s.remoteIp || "", s.virtualIp || "",
        s.vpnServer?.name || s.serverId || "—",
        format(new Date(s.startTime), "yyyy-MM-dd HH:mm:ss"),
        s.endTime ? format(new Date(s.endTime), "yyyy-MM-dd HH:mm:ss") : "Active",
        fmt(s.startTime, s.endTime),
      ]),
    ];
    const blob = new Blob([rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sessions_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Sessions (filtered)", value: filtered.length, icon: ArrowUpDown, color: "text-blue-500 bg-blue-500/10" },
          { label: "Avg Duration", value: avgMin > 60 ? `${Math.floor(avgMin / 60)}h ${avgMin % 60}m` : `${avgMin}m`, icon: Clock, color: "text-amber-500 bg-amber-500/10" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="shadow-sm border-border/40">
            <CardContent className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-2xl font-bold tabular-nums mt-0.5">{value}</p>
                </div>
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-border/40">
        <CardContent className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="User or IP…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-7 h-8 text-xs w-44" />
            </div>

            {/* Start date */}
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-8 text-xs gap-1.5 font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {startDate ? format(startDate, "MMM d") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
              {startDate && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStartDate(undefined)}><X className="h-3 w-3" /></Button>}
            </div>

            {/* End date */}
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-8 text-xs gap-1.5 font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {endDate ? format(endDate, "MMM d") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
              {endDate && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEndDate(undefined)}><X className="h-3 w-3" /></Button>}
            </div>

            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 ml-auto" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
              <Badge variant="secondary" className="text-[10px] px-1 ml-0.5">{filtered.length}</Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm border-border/40">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border/30">
                <tr>
                  {["User", "Remote IP", "VPN Server", "Started", "Ended", "Duration"].map((h, i) => (
                    <th key={h} className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-left ${i === 5 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <History className="h-6 w-6 opacity-20" />
                        <p>No sessions found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((session: any) => (
                    <tr key={session.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{session.vpnUser?.commonName || "Unknown"}</td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">{session.remoteIp || "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{session.vpnServer?.name || session.serverId || "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{format(new Date(session.startTime), "MMM d, HH:mm:ss")}</td>
                      <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                        {session.endTime
                          ? format(new Date(session.endTime), "MMM d, HH:mm:ss")
                          : <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Active</Badge>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium tabular-nums">{fmt(session.startTime, session.endTime)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
