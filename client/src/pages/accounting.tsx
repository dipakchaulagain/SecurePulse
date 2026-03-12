import { useState, useMemo } from "react";
import { useSessionHistory } from "@/hooks/use-data";
import { format, differenceInMinutes, differenceInHours, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowUpDown, Clock, Search, Download, Calendar as CalendarIcon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

function formatDuration(startTime: string, endTime: string | null) {
  if (!endTime) return "—";
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const diff = end - start;

  if (diff < 0) return "0s";

  const totalSeconds = Math.floor(diff / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours % 24}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes % 60}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}

export default function AccountingPage() {
  const { data: sessions, isLoading } = useSessionHistory();
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];

    return sessions.filter((s: any) => {
      // User/IP Filter
      const term = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm.trim() ||
        s.vpnUser?.commonName?.toLowerCase().includes(term) ||
        s.remoteIp?.toLowerCase().includes(term);

      if (!matchesSearch) return false;

      // Date Range Filter
      if (startDate || endDate) {
        const sessionDate = new Date(s.startTime);
        const start = startDate ? startOfDay(startDate) : new Date(0);
        const end = endDate ? endOfDay(endDate) : new Date(8640000000000000); // Max date

        if (!isWithinInterval(sessionDate, { start, end })) {
          return false;
        }
      }

      return true;
    });
  }, [sessions, searchTerm, startDate, endDate]);

  // Summary stats
  const totalSessionsCount = filteredSessions.length;
  const avgDurationMinutes = useMemo(() => {
    if (filteredSessions.length === 0) return 0;
    const withEnd = filteredSessions.filter((s: any) => s.endTime);
    if (withEnd.length === 0) return 0;
    const totalMin = withEnd.reduce((acc: number, s: any) => {
      return acc + differenceInMinutes(new Date(s.endTime), new Date(s.startTime));
    }, 0);
    return Math.round(totalMin / withEnd.length);
  }, [filteredSessions]);

  // CSV Export
  const exportToCsv = () => {
    if (filteredSessions.length === 0) return;

    const headers = ["Common Name", "Remote IP", "Virtual IP", "VPN Server", "Start Time", "End Time", "Duration"];
    const rows = filteredSessions.map((s: any) => [
      s.vpnUser?.commonName || "Unknown",
      s.remoteIp || "",
      s.virtualIp || "",
      s.vpnServer?.name || s.serverId || "Global",
      format(new Date(s.startTime), "yyyy-MM-dd HH:mm:ss"),
      s.endTime ? format(new Date(s.endTime), "yyyy-MM-dd HH:mm:ss") : "Active",
      formatDuration(s.startTime, s.endTime),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `vpn_sessions_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Sessions (Filtered)</p>
                <p className="text-2xl font-bold tracking-tight">{totalSessionsCount}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                <ArrowUpDown className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Duration</p>
                <p className="text-2xl font-bold tracking-tight">{avgDurationMinutes > 60 ? `${Math.floor(avgDurationMinutes / 60)}h ${avgDurationMinutes % 60}m` : `${avgDurationMinutes}m`}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b border-border/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Accounting Controls</CardTitle>
              <CardDescription className="text-xs">
                Filter by user, IP, or date range and export records.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                onClick={exportToCsv}
                disabled={filteredSessions.length === 0}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="User or IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-sm bg-background/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 w-full justify-start text-left font-normal text-xs",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Start Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {startDate && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStartDate(undefined)}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 w-full justify-start text-left font-normal text-xs",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "End Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {endDate && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEndDate(undefined)}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Table */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/30">
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider px-4 h-10">User</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10">Remote IP</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10">VPN Server</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10">Started</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10">Ended</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right px-4 h-10">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                        Loading history...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredSessions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No sessions found for selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSessions.map((session: any) => {
                    return (
                      <TableRow key={session.id} className="hover:bg-muted/30 border-b border-border/5">
                        <TableCell className="font-semibold text-xs px-4">
                          {session.vpnUser?.commonName || "Unknown"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {session.remoteIp || "—"}
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-muted-foreground/70">
                          {session.vpnServer?.name || session.serverId || "Global"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(session.startTime), "MMM d, HH:mm:ss")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {session.endTime
                            ? format(new Date(session.endTime), "MMM d, HH:mm:ss")
                            : <Badge variant="outline" className="text-[9px] h-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs px-4">
                          {formatDuration(session.startTime, session.endTime)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
