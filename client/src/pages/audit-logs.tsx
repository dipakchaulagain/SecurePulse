import { useAuditLogs } from "@/hooks/use-data";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, User, Terminal } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const ACTION_COLOR: Record<string, string> = {
  CREATE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  DELETE: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  UPDATE: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  RESET_PASSWORD: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  CHANGE_PASSWORD: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export default function AuditLogsPage() {
  const { data: logs, isLoading } = useAuditLogs();
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-medium">Access Denied</p>
        <p className="text-xs text-muted-foreground max-w-xs">Only administrators can view system audit logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-sm border-border/40">
        <CardHeader className="px-4 pt-4 pb-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm font-semibold">System Activity</CardTitle>
              <CardDescription className="text-[11px]">Chronological record of user actions and system events</CardDescription>
            </div>
            {logs && <Badge variant="secondary" className="text-[10px] px-1.5 ml-auto">{logs.length}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border/30">
                <tr>
                  {["Timestamp", "User", "Action", "Entity", "Details"].map((h, i) => (
                    <th key={h} className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-left ${i === 4 ? "w-1/3" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {logs?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted-foreground text-xs">No log entries found.</td>
                  </tr>
                ) : (
                  logs?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-muted-foreground tabular-nums whitespace-nowrap">
                        {log.timestamp ? format(new Date(log.timestamp), "MMM d, HH:mm:ss") : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {log.user ? (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="font-medium">{log.user.username}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">System</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={`text-[10px] font-mono uppercase px-1.5 ${ACTION_COLOR[log.action] || "border-border text-muted-foreground"}`}>
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-muted-foreground">{log.entityType}</span>
                        {log.entityId && <span className="text-muted-foreground/50 ml-1">#{log.entityId}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate" title={log.details}>{log.details}</td>
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
