import { useState, useEffect } from "react";
import { useActiveSessions, useVpnServers } from "@/hooks/use-data";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Search, Filter, ChevronLeft, ChevronRight, Wifi } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";

function calculateDuration(startTime: string) {
  const diff = Date.now() - new Date(startTime).getTime();
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

export default function ActiveSessionsPage() {
  const { data: sessions, isLoading, refetch, isRefetching } = useActiveSessions();
  const { data: servers } = useVpnServers();
  const [search, setSearch] = useState("");
  const [serverFilter, setServerFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const filtered = sessions?.filter((s: any) => {
    const q = search.toLowerCase();
    return (
      (!search || s.vpnUser?.commonName?.toLowerCase().includes(q) || s.remoteIp?.includes(q) || s.virtualIp?.includes(q)) &&
      (serverFilter === "all" || s.serverId === serverFilter)
    );
  });

  const totalPages = Math.ceil((filtered?.length || 0) / pageSize);
  const paginated = filtered?.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [search, serverFilter]);

  return (
    <div className="space-y-4">
      <Card className="shadow-sm border-border/40">
        <CardHeader className="px-4 pt-4 pb-3 border-b border-border/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Live Connections
                {sessions && sessions.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5">{sessions.length}</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">Real-time established VPN tunnels</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="pl-7 h-8 text-xs w-48" />
              </div>
              <Select value={serverFilter} onValueChange={setServerFilter}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <Filter className="mr-1.5 h-3 w-3 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="All Servers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Servers</SelectItem>
                  {servers?.map((s: any) => <SelectItem key={s.serverId} value={s.serverId}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => refetch()} disabled={isRefetching}>
                <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/30 border-b border-border/30">
                {["Common Name", "VPN Server", "Remote IP", "Virtual IP", "Connected At", "Duration"].map(h => (
                  <TableHead key={h} className="text-[10px] font-semibold uppercase tracking-wider h-9 text-muted-foreground">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : paginated?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center">
                    <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                      <Wifi className="h-5 w-5 opacity-25" />
                      <p className="text-xs">No active sessions</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated?.map((session: any) => (
                  <TableRow key={session.id} className="hover:bg-muted/20 border-b border-border/20">
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <Link href={`/vpn-users/${session.vpnUser?.id}`}>
                          <span className="text-xs font-medium hover:text-primary transition-colors cursor-pointer">
                            {session.vpnUser?.commonName || "Unknown"}
                          </span>
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {session.vpnServer?.name || session.serverId}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 font-mono text-xs text-muted-foreground">{session.remoteIp}</TableCell>
                    <TableCell className="py-2.5 font-mono text-xs text-muted-foreground">{session.virtualIp || "—"}</TableCell>
                    <TableCell className="py-2.5 text-xs text-muted-foreground tabular-nums">{format(new Date(session.startTime), "MMM d, HH:mm:ss")}</TableCell>
                    <TableCell className="py-2.5 font-mono text-xs font-medium tabular-nums">{calculateDuration(session.startTime)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30 bg-muted/20">
              <span className="text-xs text-muted-foreground">
                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered?.length || 0)} of {filtered?.length}
              </span>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-medium tabular-nums px-1">{currentPage}/{totalPages}</span>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
