import { useVpnUsers, useUpdateVpnUser } from "@/hooks/use-data";
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
import { Loader2, Search, User, Eye, Pencil, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useVpnServers } from "@/hooks/use-data";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function VpnUsersPage() {
  const { data: users, isLoading } = useVpnUsers();
  const { data: servers } = useVpnServers();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [serverFilter, setServerFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const updateMutation = useUpdateVpnUser();

  const filteredUsers = users?.filter((u: any) => {
    const matchesSearch = u.commonName.toLowerCase().includes(search.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(search.toLowerCase());
    const matchesOnline = onlineOnly ? u.status === "online" : true;
    const matchesServer = serverFilter === "all" || u.serverId === serverFilter;

    return matchesSearch && matchesOnline && matchesServer;
  });

  const totalPages = Math.ceil((filteredUsers?.length || 0) / pageSize);
  const paginatedUsers = filteredUsers?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useState(() => {
    setCurrentPage(1);
  }, [search, onlineOnly, serverFilter]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>User Directory</CardTitle>
              <CardDescription className="mt-1">
                Historical usage stats and current status for all users.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2 bg-muted/50 px-3 py-1.5 rounded-lg border">
                <Switch
                  id="online-mode"
                  checked={onlineOnly}
                  onCheckedChange={setOnlineOnly}
                />
                <Label htmlFor="online-mode" className="text-xs font-medium cursor-pointer">Online Only</Label>
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

              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search users..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Common Name</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead>Connection</TableHead>
                  <TableHead>Last Connected</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                        Loading directory...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedUsers?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers?.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          {user.commonName}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.fullName || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {user.type || "Others"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize ${user.accountStatus === "VALID"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : user.accountStatus === "REVOKED"
                              ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
                              : user.accountStatus === "EXPIRED"
                                ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "border-muted text-muted-foreground"
                            }`}
                        >
                          <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${user.accountStatus === "VALID" ? "bg-emerald-500" :
                            user.accountStatus === "REVOKED" ? "bg-red-500" :
                              user.accountStatus === "EXPIRED" ? "bg-amber-500" : "bg-muted-foreground"
                            }`} />
                          {user.accountStatus || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize ${user.status === "online"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-muted bg-muted/30 text-muted-foreground"
                            }`}
                        >
                          <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${user.status === "online" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                            }`} />
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.lastConnected
                          ? format(
                            new Date(user.lastConnected),
                            "MMM d, yyyy HH:mm",
                          )
                          : "Never"}
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
                          {currentUser?.role === "admin" && (
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredUsers?.length || 0)} of {filteredUsers?.length} users
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

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-card shadow-lg border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Edit VPN User</h2>
                <p className="text-xs text-muted-foreground">
                  Common Name is immutable; update metadata only.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1 text-sm">
                <label className="text-muted-foreground">Full Name</label>
                <Input
                  value={editingUser.fullName}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      fullName: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-muted-foreground">Email</label>
                <Input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      email: e.target.value,
                    })
                  }
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
                <label className="text-muted-foreground">
                  Contact (optional)
                </label>
                <Input
                  value={editingUser.contact}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      contact: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingUser(null)}
              >
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
                    {
                      onSuccess: () => setEditingUser(null),
                    },
                  );
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
