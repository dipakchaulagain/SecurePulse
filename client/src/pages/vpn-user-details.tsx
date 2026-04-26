import { useVpnUser, useActiveSessions, useSessionHistory, useVpnUserAuditLogs } from "@/hooks/use-data";
import { useRoute, Link } from "wouter";
import { format, intervalToDuration } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft, Loader2, User, Mail, Phone, Server, Clock,
    Calendar, Network, Activity, History, Settings2,
    CheckCircle2, XCircle, AlertCircle, Wifi, WifiOff, ShieldAlert,
} from "lucide-react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AccountStatusBadge, ConnectionBadge, TypeBadge } from "./vpn-users";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sessionDuration(start: string | Date, end?: string | Date | null): string {
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    const dur = intervalToDuration({ start: s, end: e });
    const parts: string[] = [];
    if (dur.days) parts.push(`${dur.days}d`);
    if (dur.hours) parts.push(`${dur.hours}h`);
    if (dur.minutes) parts.push(`${dur.minutes}m`);
    if (!parts.length) parts.push(`${dur.seconds ?? 0}s`);
    return parts.join(" ");
}

function InfoRow({ icon: Icon, label, value }: {
    icon: React.ElementType; label: string; value: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-3 py-2">
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
            <span className="text-xs font-medium flex-1 min-w-0">{value}</span>
        </div>
    );
}

function StatTile({ label, value, mono = false, accent = false }: {
    label: string; value: React.ReactNode; mono?: boolean; accent?: boolean;
}) {
    return (
        <div className="bg-muted/40 rounded-md px-3 py-2.5 border border-border/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
            <p className={`text-sm font-semibold truncate ${mono ? "font-mono" : ""} ${accent ? "text-primary" : ""}`}>
                {value}
            </p>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VpnUserDetailsPage() {
    const [, params] = useRoute("/vpn-users/:id");
    const id = params?.id ? parseInt(params.id) : 0;

    const { data: user, isLoading: isLoadingUser } = useVpnUser(id);
    const { data: activeSessions, isLoading: isLoadingActive } = useActiveSessions();
    const { data: historySessions, isLoading: isLoadingHistory } = useSessionHistory();
    const { data: auditLogs, isLoading: isLoadingAudit } = useVpnUserAuditLogs(id);

    const currentSession = activeSessions?.find((s: any) => s.vpnUser.id === id);

    const userHistory = useMemo(() => {
        if (!historySessions) return [];
        return [...historySessions.filter((s: any) => s.vpnUser.id === id)].sort(
            (a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
    }, [historySessions, id]);

    const lastSession = userHistory[0];
    const isLoading = isLoadingUser || isLoadingActive || isLoadingHistory;

    const avatarColor = useMemo(() => {
        const colors = ["from-violet-500 to-purple-600", "from-blue-500 to-cyan-600",
            "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600",
            "from-rose-500 to-pink-600", "from-indigo-500 to-blue-600"];
        if (!user) return colors[0];
        return colors[user.commonName.charCodeAt(0) % colors.length];
    }, [user]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-72">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-72 gap-3">
                <User className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">User not found</p>
                <Link href="/vpn-users">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="mr-2 h-3.5 w-3.5" />Back to Directory
                    </Button>
                </Link>
            </div>
        );
    }

    const isOnline = user.status === "online";

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-4"
        >
            {/* Back */}
            <Link href="/vpn-users">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground h-8 -ml-1 px-2">
                    <ArrowLeft className="h-3.5 w-3.5" />VPN Users
                </Button>
            </Link>

            {/* ── Profile Card ──────────────────────────────────────────────── */}
            <Card className="shadow-sm border-border/40">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {/* Avatar */}
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarColor} flex items-center justify-center shrink-0 shadow-md`}>
                            <span className="text-lg font-bold text-white">
                                {user.commonName.slice(0, 2).toUpperCase()}
                            </span>
                        </div>

                        {/* Name + badges */}
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <h1 className="text-base font-bold font-mono">{user.commonName}</h1>
                                <ConnectionBadge status={user.status} />
                                <AccountStatusBadge status={user.accountStatus} />
                                <TypeBadge type={user.type} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {user.fullName || <span className="italic">No display name</span>}
                                {user.email && <span className="ml-2">· {user.email}</span>}
                            </p>
                        </div>

                        {/* Right meta */}
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground shrink-0">
                            <span className="flex items-center gap-1.5">
                                <Server className="h-3 w-3" />
                                {user.vpnServer?.name || user.serverId || "—"}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                {user.lastConnected
                                    ? format(new Date(user.lastConnected), "MMM d, yyyy HH:mm")
                                    : "Never connected"}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" />
                                Added {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "—"}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Info Grid ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Identity + Account */}
                <div className="space-y-4">
                    <Card className="shadow-sm border-border/40">
                        <CardContent className="px-4 pt-4 pb-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Identity</p>
                            <Separator className="mb-2" />
                            <InfoRow icon={User} label="Full Name" value={user.fullName || <span className="text-muted-foreground/50 italic">Not set</span>} />
                            <InfoRow icon={Mail} label="Email" value={
                                user.email
                                    ? <a href={`mailto:${user.email}`} className="text-primary hover:underline break-all">{user.email}</a>
                                    : <span className="text-muted-foreground/50 italic">Not set</span>
                            } />
                            <InfoRow icon={Phone} label="Contact" value={user.contact || <span className="text-muted-foreground/50 italic">Not set</span>} />
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-border/40">
                        <CardContent className="px-4 pt-4 pb-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Account</p>
                            <Separator className="mb-2" />
                            <InfoRow icon={
                                user.accountStatus === "VALID" ? CheckCircle2 :
                                user.accountStatus === "REVOKED" ? XCircle : AlertCircle
                            } label="Certificate" value={<AccountStatusBadge status={user.accountStatus} />} />
                            <InfoRow icon={isOnline ? Wifi : WifiOff} label="Connection" value={<ConnectionBadge status={user.status} />} />
                            <InfoRow icon={Server} label="VPN Server" value={
                                <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">
                                    {user.vpnServer?.name || user.serverId || "—"}
                                </code>
                            } />
                            {user.expirationDate && (
                                <InfoRow icon={Calendar} label={user.accountStatus === "EXPIRED" ? "Expired" : "Expires"} value={
                                    <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${user.accountStatus === "EXPIRED"
                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                        : "bg-muted text-muted-foreground"}`}>
                                        {format(new Date(user.expirationDate), "PP")}
                                    </span>
                                } />
                            )}
                            {user.revocationDate && (
                                <InfoRow icon={XCircle} label="Revoked" value={
                                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400">
                                        {format(new Date(user.revocationDate), "PP")}
                                    </span>
                                } />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Session + CCD */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Current / Last Session */}
                    <Card className="shadow-sm border-border/40">
                        <CardContent className="px-4 pt-4 pb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {isOnline ? "Active Session" : "Last Session"}
                                </p>
                                {isOnline && (
                                    <span className="relative flex h-1.5 w-1.5 ml-0.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                    </span>
                                )}
                            </div>
                            <Separator className="mb-3" />
                            {currentSession ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <StatTile label="Remote IP" value={currentSession.remoteIp} mono />
                                    <StatTile label="VPN IP" value={currentSession.virtualIp || "—"} mono />
                                    <StatTile label="Connected" value={format(new Date(currentSession.startTime), "MMM d HH:mm")} />
                                    <StatTile label="Duration" value={sessionDuration(currentSession.startTime)} accent />
                                </div>
                            ) : lastSession ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <StatTile label="Remote IP" value={lastSession.remoteIp} mono />
                                    <StatTile label="VPN IP" value={lastSession.virtualIp || "—"} mono />
                                    <StatTile label="Connected" value={format(new Date(lastSession.startTime), "MMM d HH:mm")} />
                                    <StatTile label="Duration"
                                        value={lastSession.endTime ? sessionDuration(lastSession.startTime, lastSession.endTime) : "—"} />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-5 gap-2 text-muted-foreground">
                                    <WifiOff className="h-6 w-6 opacity-25" />
                                    <p className="text-xs">No session data available.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* CCD */}
                    <Card className="shadow-sm border-border/40">
                        <CardContent className="px-4 pt-4 pb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Network Config (CCD)</p>
                            </div>
                            <Separator className="mb-3" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Static IP</p>
                                    {user.ccdStaticIp ? (
                                        <code className="block font-mono text-xs bg-muted px-2.5 py-1.5 rounded border border-border/40">
                                            {user.ccdStaticIp}
                                        </code>
                                    ) : (
                                        <p className="text-xs text-muted-foreground/50 italic">Not configured</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Pushed Routes</p>
                                    {user.ccdRoutes ? (
                                        <div className="flex flex-wrap gap-1">
                                            {user.ccdRoutes.split(",").filter(Boolean).map((r: string, i: number) => (
                                                <code key={i} className="font-mono text-[11px] bg-primary/8 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                                                    {r.trim()}
                                                </code>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground/50 italic">No custom routes</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ── Session History ────────────────────────────────────────────── */}
            <Card className="shadow-sm border-border/40">
                <CardHeader className="px-4 py-3 border-b border-border/30">
                    <div className="flex items-center gap-2">
                        <History className="h-3.5 w-3.5 text-muted-foreground" />
                        <CardTitle className="text-sm font-semibold">Session History</CardTitle>
                        {userHistory.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 ml-1">
                                {userHistory.length}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoadingHistory ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    ) : userHistory.length === 0 ? (
                        <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
                            <History className="h-6 w-6 opacity-20" />
                            <p className="text-xs">No session history.</p>
                        </div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="bg-muted/40 border-b border-border/30">
                                <tr>
                                    {["#", "Remote IP", "VPN IP", "Connected", "Disconnected", "Duration"].map((h, i) => (
                                        <th key={h} className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ${i === 5 ? "text-right" : "text-left"}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {userHistory.slice(0, 50).map((s: any, i: number) => (
                                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-4 py-2 text-muted-foreground tabular-nums">{i + 1}</td>
                                        <td className="px-4 py-2 font-mono">{s.remoteIp || "—"}</td>
                                        <td className="px-4 py-2 font-mono text-muted-foreground">{s.virtualIp || "—"}</td>
                                        <td className="px-4 py-2 tabular-nums text-muted-foreground">{format(new Date(s.startTime), "MMM d, yyyy HH:mm")}</td>
                                        <td className="px-4 py-2 tabular-nums text-muted-foreground">{s.endTime ? format(new Date(s.endTime), "MMM d, yyyy HH:mm") : "—"}</td>
                                        <td className="px-4 py-2 text-right font-medium tabular-nums">{s.endTime ? sessionDuration(s.startTime, s.endTime) : "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {userHistory.length > 50 && (
                        <div className="px-4 py-2 text-[11px] text-center text-muted-foreground border-t border-border/30 bg-muted/20">
                            Showing 50 of {userHistory.length} sessions
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Change Log ────────────────────────────────────────────────── */}
            <Card className="shadow-sm border-border/40">
                <CardHeader className="px-4 py-3 border-b border-border/30">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                        <CardTitle className="text-sm font-semibold">Change Log</CardTitle>
                        {auditLogs && auditLogs.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 ml-1">{auditLogs.length}</Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="px-4 py-3">
                    {isLoadingAudit ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    ) : auditLogs && auditLogs.length > 0 ? (
                        <div className="space-y-3">
                            {auditLogs.map((log: any, i: number) => (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03, duration: 0.18 }}
                                    className="flex gap-3 text-xs"
                                >
                                    <div className="flex flex-col items-center shrink-0 pt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-border mt-1" />
                                        {i < auditLogs.length - 1 && <div className="w-px flex-1 bg-border/50 mt-1" />}
                                    </div>
                                    <div className="pb-3 min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                            <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                                                {log.action.replace(/_/g, " ")}
                                            </Badge>
                                            <span className="text-muted-foreground tabular-nums">
                                                {format(new Date(log.timestamp), "MMM d, yyyy · HH:mm")}
                                            </span>
                                            {log.user?.username && (
                                                <span className="text-muted-foreground/60">
                                                    by <span className="font-medium text-foreground/70">{log.user.username}</span>
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed">{log.details}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-6 gap-2 text-muted-foreground">
                            <ShieldAlert className="h-6 w-6 opacity-20" />
                            <p className="text-xs">No changes recorded.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
