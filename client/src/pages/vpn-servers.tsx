import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useVpnServers,
  useCreateVpnServer,
  useDeleteVpnServer,
  useRegenerateVpnServerKey,
} from "@/hooks/use-data";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Server, Copy, Plus, Loader2, Trash2, RefreshCw, Eye, EyeOff, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Your browser may have blocked clipboard access.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function ApiKeyCell({ apiKey }: { apiKey: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <code className="text-xs bg-muted px-2 py-1 rounded font-mono max-w-[200px] truncate">
        {revealed ? apiKey : `${apiKey.slice(0, 8)}${"•".repeat(24)}`}
      </code>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => setRevealed(!revealed)}
      >
        {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
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

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [serverName, setServerName] = useState("");
  const [serverDescription, setServerDescription] = useState("");

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4 pt-20">
        <Shield className="h-16 w-16 text-muted-foreground/50" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          You do not have permission to view this page. Only administrators can manage VPN servers.
        </p>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!serverName.trim()) return;
    await createServer.mutateAsync({
      name: serverName.trim(),
      description: serverDescription.trim() || undefined,
    });
    setServerName("");
    setServerDescription("");
    setAddDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-none border-0 bg-transparent">
        <CardHeader className="px-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Configured Servers
              </CardTitle>
              <CardDescription className="mt-1">
                List of VPN servers sending telemetry to this portal.
              </CardDescription>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-lg shadow-primary/20">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Server
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register VPN Server</DialogTitle>
                  <DialogDescription>
                    Add a new OpenVPN server. A unique Server ID and API Key will be generated automatically.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="server-name">Server Name *</Label>
                    <Input
                      id="server-name"
                      placeholder="e.g. Office-VPN-Primary"
                      value={serverName}
                      onChange={(e) => setServerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="server-desc">Description (optional)</Label>
                    <Input
                      id="server-desc"
                      placeholder="e.g. Main office OpenVPN server"
                      value={serverDescription}
                      onChange={(e) => setServerDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!serverName.trim() || createServer.isPending}
                  >
                    {createServer.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Register Server
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Server ID</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servers && servers.length > 0 ? (
                  servers.map((server: any) => (
                    <TableRow key={server.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{server.name}</p>
                          {server.description && (
                            <p className="text-xs text-muted-foreground">{server.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {server.serverId}
                          </code>
                          <CopyButton text={server.serverId} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <ApiKeyCell apiKey={server.apiKey} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={server.isActive ? "default" : "secondary"}>
                          {server.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {server.createdAt
                          ? format(new Date(server.createdAt), "MMM dd, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Regenerate API Key">
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Regenerate API Key?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will generate a new API key for "{server.name}". The old key will stop working
                                  immediately. You'll need to update the telemetry agent configuration.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => regenerateKey.mutate(server.id)}>
                                  Regenerate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete Server">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete VPN Server?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove "{server.name}" ({server.serverId}). The telemetry agent
                                  using this server's credentials will no longer be able to send data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteServer.mutate(server.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No VPN servers registered yet. Click "Add Server" to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
