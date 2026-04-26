import { useVpnUsers, useUpdateVpnUser, useVpnServers } from "@/hooks/use-data";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Search,
  User,
  Eye,
  Pencil,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  WifiOff,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

// ─── CSV Export Helper ────────────────────────────────────────────────────────

function exportToCsv(users: any[], servers: any[]) {
  const serverMap: Record<string, string> = {};
  servers?.forEach((s: any) => { serverMap[s.serverId] = s.name; });

  const headers = [
    "Common Name",
    "Full Name",
    "Email",
    "Contact",
    "Type",
    "Account Status",
    "VPN Server",
    "Connection",
    "Last Connected",
    "Expiration Date",
    "Revocation Date",
  ];

  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const rows = users.map((u) => [
    escape(u.commonName),
    escape(u.fullName),
    escape(u.email),
    escape(u.contact),
    escape(u.type),
    escape(u.accountStatus),
    escape(serverMap[u.serverId] || u.serverId || ""),
    escape(u.status),
    escape(u.lastConnected ? format(new Date(u.lastConnected), "yyyy-MM-dd HH:mm") : "Never"),
    escape(u.expirationDate ? format(new Date(u.expirationDate), "yyyy-MM-dd HH:mm") : ""),
    escape(u.revocationDate ? format(new Date(u.revocationDate), "yyyy-MM-dd HH:mm") : ""),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vpn-users-${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VpnUsersPage() {
  const { data: users, isLoading } = useVpnUsers();
  const { data: servers } = useVpnServers();
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [neverConnected, setNeverConnected] = useState(false);
  const [serverFilter, setServerFilter] = useState("all");
  const [accountStatusFilter, setAccountStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const updateMutation = useUpdateVpnUser();

  const filteredUsers = users?.filter((u: any) => {
    const matchesSearch =
      u.commonName.toLowerCase().includes(search.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesOnline = onlineOnly ? u.status === "online" : true;
    const matchesNever = neverConnected ? !u.lastConnected : true;
    const matchesServer = serverFilter === "all" || u.serverId === serverFilter;
    const matchesAccountStatus =
      accountStatusFilter === "all" || u.accountStatus === accountStatusFilter;
    const matchesType = typeFilter === "all" || u.type === typeFilter;

    // mutually exclusive: online-only and never-connected
    if (onlineOnly && neverConnected) return false;

    return matchesSearch && matchesOnline && matchesNever && matchesServer && matchesAccountStatus && matchesType;
  });

  const totalPages = Math.ceil((filteredUsers?.length || 0) / pageSize);
  const paginatedUsers = filteredUsers?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, onlineOnly, neverConnected, serverFilter, accountStatusFilter, typeFilter]);

  // mutually-exclusive toggles
  const handleOnlineOnly = (v: boolean) => {
    setOnlineOnly(v);
    if (v) setNeverConnected(false);
  };
  const handleNeverConnected = (v: boolean) => {
    setNeverConnected(v);
    if (v) setOnlineOnly(false);
  };

  const activeFilters =
    (onlineOnly ? 1 : 0) +
    (neverConnected ? 1 : 0) +
    (serverFilter !== "all" ? 1 : 0) +
    (accountStatusFilter !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (search ? 1 : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-4"
    >
      <Card className="shadow-sm border-border/40">
        <CardHeader className="px-4 pt-4 pb-3 border-b border-border/30">
          <div className="flex flex-col gap-3">
            {/* Title row */}
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">User Directory</CardTitle>
                <CardDescription className="text-[11px]">
                  Historical usage stats and current status for all VPN users.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                disabled={!filteredUsers?.length}
                onClick={() => exportToCsv(filteredUsers ?? [], servers ?? [])}
              >
                <Download className="h-4 w-4" />
                Export CSV
                {activeFilters > 0 && filteredUsers && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
                    {filteredUsers.length}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Online Only */}
              <div className="flex items-center space-x-2 bg-muted/50 px-3 py-1.5 rounded-lg border">
                <Switch
                  id="online-mode"
                  checked={onlineOnly}
                  onCheckedChange={handleOnlineOnly}
                />
                <Label htmlFor="online-mode" className="text-xs font-medium cursor-pointer whitespace-nowrap">
                  Online Only
                </Label>
              </div>

              {/* Never Connected */}
              <div className="flex items-center space-x-2 bg-muted/50 px-3 py-1.5 rounded-lg border">
                <Switch
                  id="never-mode"
                  checked={neverConnected}
                  onCheckedChange={handleNeverConnected}
                />
                <Label htmlFor="never-mode" className="text-xs font-medium cursor-pointer whitespace-nowrap flex items-center gap-1.5">
                  <WifiOff className="h-3 w-3 text-muted-foreground" />
                  Never Connected
                </Label>
              </div>

              {/* Server filter */}
              <Select value={serverFilter} onValueChange={setServerFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
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

              {/* Account status filter */}
              <Select value={accountStatusFilter} onValueChange={setAccountStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="VALID">Valid</SelectItem>
                  <SelectItem value="REVOKED">Revoked</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>

              {/* Type filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Employee">Employee</SelectItem>
                  <SelectItem value="Vendor">Vendor</SelectItem>
                  <SelectItem value="Client">Client</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search name, email…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Clear filters */}
              {activeFilters > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground text-xs"
                  onClick={() => {
                    setSearch("");
                    setOnlineOnly(false);
                    setNeverConnected(false);
                    setServerFilter("all");
                    setAccountStatusFilter("all");
                    setTypeFilter("all");
                  }}
                >
                  Clear ({activeFilters})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/40 border-b border-border/30">
                  {["Common Name","Full Name","Type","Account Status","VPN Server","Connection","Last Connected","Actions"].map((h,i) => (
                    <TableHead key={h} className={`text-[10px] font-semibold uppercase tracking-wider text-muted-foreground h-9 ${i===7?"text-right":""}`}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-muted-foreground text-sm">Loading directory…</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedUsers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <WifiOff className="h-8 w-8 opacity-30" />
                        <span className="text-sm">No users match the current filters.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers?.map((user: any) => (
                    <TableRow key={user.id} className="group">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="font-mono text-sm">{user.commonName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.fullName || "—"}
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={user.type} />
                      </TableCell>
                      <TableCell>
                        <AccountStatusBadge status={user.accountStatus} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {user.vpnServer?.name || user.serverId || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ConnectionBadge status={user.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm tabular-nums">
                        {user.lastConnected
                          ? format(new Date(user.lastConnected), "MMM d, yyyy HH:mm")
                          : <span className="italic text-muted-foreground/60">Never</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/vpn-users/${user.id}`}>
                            <Button
                              size="xs"
                              variant="ghost"
                              className="gap-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all duration-200"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          </Link>
                          {(currentUser?.role === "admin" || currentUser?.role === "operator") && (
                            <Button
                              size="xs"
                              variant="ghost"
                              className="gap-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 transition-all duration-200"
                              onClick={() =>
                                setEditingUser({
                                  id: user.id,
                                  fullName: user.fullName || "",
                                  email: user.email || "",
                                  contact: user.contact || "",
                                  type: user.type,
                                })
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {(filteredUsers?.length ?? 0) > 0 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                {totalPages > 1
                  ? `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredUsers?.length || 0)} of ${filteredUsers?.length} users`
                  : `${filteredUsers?.length} user${filteredUsers?.length === 1 ? "" : "s"}`}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="text-sm font-medium px-2 tabular-nums">
                    {currentPage} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingUser && (
          <motion.div
            key="edit-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-md rounded-xl bg-card shadow-xl border p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Edit VPN User</h2>
                  <p className="text-xs text-muted-foreground">
                    Common Name is immutable; update metadata only.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1 text-sm">
                  <label className="text-muted-foreground">Full Name</label>
                  <Input
                    value={editingUser.fullName}
                    onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-1 text-sm">
                  <label className="text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1 text-sm">
                  <label className="text-muted-foreground">User Type</label>
                  <Select
                    value={editingUser.type}
                    onValueChange={(val) => setEditingUser({ ...editingUser, type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Employee">Employee</SelectItem>
                      <SelectItem value="Vendor">Vendor</SelectItem>
                      <SelectItem value="Client">Client</SelectItem>
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 text-sm">
                  <label className="text-muted-foreground">Contact (optional)</label>
                  <Input
                    value={editingUser.contact}
                    onChange={(e) => setEditingUser({ ...editingUser, contact: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={updateMutation.isPending}
                  onClick={() => {
                    updateMutation.mutate(
                      {
                        id: editingUser.id,
                        fullName: editingUser.fullName || null,
                        email: editingUser.email || null,
                        contact: editingUser.contact || null,
                        type: editingUser.type,
                      },
                      { onSuccess: () => setEditingUser(null) }
                    );
                  }}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : null}
                  Save Changes
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Shared Badge Components ──────────────────────────────────────────────────

export function AccountStatusBadge({ status }: { status: string | null | undefined }) {
  const color =
    status === "VALID"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : status === "REVOKED"
        ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
        : status === "EXPIRED"
          ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : "border-muted text-muted-foreground";
  const dot =
    status === "VALID" ? "bg-emerald-500" :
      status === "REVOKED" ? "bg-red-500" :
        status === "EXPIRED" ? "bg-amber-500" : "bg-muted-foreground";

  return (
    <Badge variant="outline" className={`${color} text-[11px]`}>
      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
      {status || "Unknown"}
    </Badge>
  );
}

export function ConnectionBadge({ status }: { status: string }) {
  const online = status === "online";
  return (
    <Badge
      variant="outline"
      className={`capitalize text-[11px] ${online
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        : "border-muted bg-muted/30 text-muted-foreground"
        }`}
    >
      <span
        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
          }`}
      />
      {status}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: string | null | undefined }) {
  const color =
    type === "Employee" ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400" :
      type === "Vendor" ? "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400" :
        type === "Client" ? "border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400" :
          "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400";
  return (
    <Badge variant="outline" className={`${color} text-[10px]`}>
      {type || "Others"}
    </Badge>
  );
}
