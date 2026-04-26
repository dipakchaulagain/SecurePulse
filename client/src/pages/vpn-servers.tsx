import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useVpnServers, useCreateVpnServer, useDeleteVpnServer, useRegenerateVpnServerKey } from "@/hooks/use-data";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Server, Copy, Plus, Loader2, Trash2, RefreshCw, Eye, EyeOff, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;left:-9999px;top:0";
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast({ title: "Copied" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handle}>
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function ApiKeyCell({ apiKey }: { apiKey: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <code className="text-[11px] bg-muted px-2 py-0.5 rounded font-mono max-w-[180px] truncate border border-border/30">
        {shown ? apiKey : `${apiKey.slice(0, 8)}${"•".repeat(20)}`}
      </code>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShown(!shown)}>
        {shown ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </Button>
      <CopyButton text={apiKey} />
    </div>
  );
}

export default function VpnServersPage() {
  const { user } = useAuth();
  const { data: servers, isLoading } = useVpnServers();
  const createServer = useCreateVpnServer();
  const deleteServer = useDeleteVpnServer();
  const regenerateKey = useRegenerateVpnServerKey();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3 text-center">
        <Shield className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-medium">Access Denied</p>
        <p className="text-xs text-muted-foreground max-w-xs">Only administrators can manage VPN servers.</p>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createServer.mutateAsync({ name: name.trim(), description: desc.trim() || undefined });
    setName(""); setDesc(""); setOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Card className="shadow-sm border-border/40">
          <CardContent className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-sm border-border/40">
        <CardHeader className="px-4 pt-4 pb-3 border-b border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-sm font-semibold">VPN Servers</CardTitle>
                <CardDescription className="text-[11px]">Servers sending telemetry to this portal</CardDescription>
              </div>
              {servers && <Badge variant="secondary" className="text-[10px] px-1.5 ml-1">{servers.length}</Badge>}
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs gap-1.5">
                  <Plus className="h-3.5 w-3.5" />Add Server
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register VPN Server</DialogTitle>
                  <DialogDescription>A unique Server ID and API Key will be generated automatically.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="sname" className="text-xs">Server Name *</Label>
                    <Input id="sname" placeholder="e.g. Office-VPN-Primary" value={name} onChange={e => setName(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sdesc" className="text-xs">Description (optional)</Label>
                    <Input id="sdesc" placeholder="e.g. Main office OpenVPN server" value={desc} onChange={e => setDesc(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleCreate} disabled={!name.trim() || createServer.isPending}>
                    {createServer.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Register
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b border-border/30">
              <tr>
                {["Name", "Server ID", "API Key", "Status", "Created", "Actions"].map((h, i) => (
                  <th key={h} className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-left ${i === 5 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {servers && servers.length > 0 ? servers.map((server: any) => (
                <tr key={server.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{server.name}</p>
                    {server.description && <p className="text-[11px] text-muted-foreground">{server.description}</p>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <code className="text-[11px] bg-muted px-2 py-0.5 rounded font-mono border border-border/30">{server.serverId}</code>
                      <CopyButton text={server.serverId} />
                    </div>
                  </td>
                  <td className="px-4 py-2.5"><ApiKeyCell apiKey={server.apiKey} /></td>
                  <td className="px-4 py-2.5">
                    <Badge variant={server.isActive ? "default" : "secondary"} className="text-[10px]">
                      {server.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                    {server.createdAt ? format(new Date(server.createdAt), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Regenerate API Key">
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Regenerate API Key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will invalidate the current key for "{server.name}" immediately. You'll need to update the telemetry agent.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => regenerateKey.mutate(server.id)}>Regenerate</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Delete Server">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete VPN Server?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Permanently removes "{server.name}" ({server.serverId}). The agent using this server's key can no longer send data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteServer.mutate(server.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Server className="h-6 w-6 opacity-20" />
                      <p>No servers registered yet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
