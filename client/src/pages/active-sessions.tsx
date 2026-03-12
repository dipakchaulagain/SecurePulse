import { useState, useEffect } from "react";
import { useActiveSessions } from "@/hooks/use-data";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, RefreshCw, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVpnServers } from "@/hooks/use-data";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

function calculateDuration(startTime: string) {
  const start = new Date(startTime).getTime();
  const now = new Date().getTime();
  const diff = now - start;

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

export default function ActiveSessionsPage() {
  const { data: sessions, isLoading, refetch, isRefetching } = useActiveSessions();
  const { data: servers } = useVpnServers();
  const [search, setSearch] = useState("");
  const [serverFilter, setServerFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Force re-render every second to update duration
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t: number) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredSessions = sessions?.filter((s: any) => {
    const matchesSearch =
      s.vpnUser?.commonName?.toLowerCase().includes(search.toLowerCase()) ||
      s.remoteIp?.includes(search) ||
      s.virtualIp?.includes(search);

    const matchesServer = serverFilter === "all" || s.serverId === serverFilter;

    return matchesSearch && matchesServer;
  });

  const totalPages = Math.ceil((filteredSessions?.length || 0) / pageSize);
  const paginatedSessions = filteredSessions?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, serverFilter]);

  return (
    <div className="space-y-6">
      <Card className="shadow-none border-0 bg-transparent">
        <CardHeader className="px-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Live Connections</CardTitle>
              <CardDescription className="mt-1">
                Real-time list of established tunnels.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sessions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={serverFilter} onValueChange={setServerFilter}>
                <SelectTrigger className="w-[140px] md:w-[180px]">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="All Servers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Servers</SelectItem>
                  {servers?.map((server: any) => (
                    <SelectItem key={server.serverId} value={server.serverId}>
                      {server.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw className={`mr-1 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Common Name</TableHead>
                  <TableHead>VPN Server</TableHead>
                  <TableHead>Remote IP</TableHead>
                  <TableHead>Virtual IP</TableHead>
                  <TableHead>Connected At</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                        Loading sessions...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedSessions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No active sessions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSessions?.map((session: any) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                          <Link href={`/vpn-users/${session.vpnUser?.id}`} className="hover:underline">
                            {session.vpnUser?.commonName || "Unknown"}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {session.vpnServer?.name || session.serverId}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{session.remoteIp}</TableCell>
                      <TableCell className="font-mono text-xs">{session.virtualIp || "N/A"}</TableCell>
                      <TableCell>{format(new Date(session.startTime), "MMM d, HH:mm:ss")}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {calculateDuration(session.startTime)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredSessions?.length || 0)} of {filteredSessions?.length} sessions
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm font-medium px-2">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
