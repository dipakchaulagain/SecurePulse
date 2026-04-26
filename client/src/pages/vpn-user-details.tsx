import { useVpnUser, useActiveSessions, useSessionHistory, useVpnUserAuditLogs } from "@/hooks/use-data";
import { useRoute, Link } from "wouter";
import { format, formatDuration, intervalToDuration } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    Loader2,
    User,
    Mail,
    Phone,
    Server,
    Clock,
    Calendar,
    Network,
    Route,
    ShieldCheck,
    ShieldX,
    ShieldAlert,
    Activity,
    History,
    Settings2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Wifi,
    WifiOff,
} from "lucide-react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AccountStatusBadge, ConnectionBadge, TypeBadge } from "./vpn-users";

// ─── Duration helper ──────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, mono = false }: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    mono?: boolean;
}) {
    return (
        <div className="flex items-start gap-3 py-2.5">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                <div className={`mt-0.5 text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</div>
            </div>
        </div>
    );
}

function SectionHeading({ icon: Icon, title, description }: {
    icon: React.ElementType;
    title: string;
    description?: string;
}) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
                <h3 className="text-sm font-semibold leading-tight">{title}</h3>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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

    // ── Avatar color based on first char ──────────────────────────────────────
    const avatarColor = useMemo(() => {
        const colors = [
            "from-violet-500 to-purple-600",
            "from-blue-500 to-cyan-600",
            "from-emerald-500 to-teal-600",
            "from-amber-500 to-orange-600",
            "from-rose-500 to-pink-600",
            "from-indigo-500 to-blue-600",
        ];
        if (!user) return colors[0];
        const idx = user.commonName.charCodeAt(0) % colors.length;
        return colors[idx];
    }, [user]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <User className="h-16 w-16 text-muted-foreground/30" />
                <h2 className="text-xl font-semibold">User not found</h2>
                <Link href="/vpn-users">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Directory
                    </Button>
                </Link>
            </div>
        );
    }

    const isOnline = user.status === "online";

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-5"
        >
            {/* ── Back nav ─────────────────────────────────────────────────── */}
            <Link href="/vpn-users">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-1">
                    <ArrowLeft className="h-4 w-4" />
                    VPN Users
                </Button>
            </Link>

            {/* ── Profile Hero Card ─────────────────────────────────────────── */}
            <Card className="overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
                <CardContent className="pt-6 pb-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                        {/* Avatar */}
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center shrink-0 shadow-lg`}>
                            <span className="text-2xl font-bold text-white">
                                {user.commonName.slice(0, 2).toUpperCase()}
                            </span>
                        </div>

                        {/* Identity */}
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h1 className="text-xl font-bold font-mono truncate">{user.commonName}</h1>
                                <ConnectionBadge status={user.status} />
                                <AccountStatusBadge status={user.accountStatus} />
                                <TypeBadge type={user.type} />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {user.fullName || <span className="italic">No display name set</span>}
                                {user.email && (
                                    <span className="ml-2 text-primary/70">· {user.email}</span>
                                )}
                            </p>
                        </div>

                        {/* Right stats */}
                        <div className="flex flex-wrap sm:flex-col gap-3 sm:text-right shrink-0">
                            <div className="flex items-center gap-2 text-sm">
                                <Server className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium text-muted-foreground">{user.vpnServer?.name || user.serverId || "—"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                    {user.lastConnected
                                        ? format(new Date(user.lastConnected), "MMM d, yyyy HH:mm")
                                        : "Never connected"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                    Added {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "—"}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Main Grid ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Left col – Identity + Account */}
                <div className="lg:col-span-1 space-y-5">

                    {/* Identity */}
                    <Card>
                        <CardContent className="pt-5 pb-3">
                            <SectionHeading icon={User} title="Identity" />
                            <Separator className="mb-2" />
                            <InfoRow icon={User} label="Full Name" value={user.fullName || <span className="text-muted-foreground/60 italic">Not set</span>} />
                            <InfoRow icon={Mail} label="Email" value={
                                user.email
                                    ? <a href={`mailto:${user.email}`} className="text-primary hover:underline break-all">{user.email}</a>
                                    : <span className="text-muted-foreground/60 italic">Not set</span>
                            } />
                            <InfoRow icon={Phone} label="Contact" value={user.contact || <span className="text-muted-foreground/60 italic">Not set</span>} />
                        </CardContent>
                    </Card>

                    {/* Account */}
                    <Card>
                        <CardContent className="pt-5 pb-3">
                            <SectionHeading icon={ShieldCheck} title="Account" />
                            <Separator className="mb-2" />
                            <InfoRow icon={
                                user.accountStatus === "VALID" ? CheckCircle2 :
                                    user.accountStatus === "REVOKED" ? XCircle : AlertCircle
                            } label="Certificate Status" value={<AccountStatusBadge status={user.accountStatus} />} />
                            <InfoRow icon={isOnline ? Wifi : WifiOff} label="Connection" value={<ConnectionBadge status={user.status} />} />
                            {user.expirationDate && (
                                <InfoRow
                                    icon={Calendar}
                                    label={user.accountStatus === "EXPIRED" ? "Expired On" : "Expires On"}
                                    value={
                                        <span className={`font-mono text-xs px-2 py-0.5 rounded ${user.accountStatus === "EXPIRED"
                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                            : "bg-muted text-muted-foreground"
                                            }`}>
                                            {format(new Date(user.expirationDate), "PP HH:mm")}
                                        </span>
                                    }
                                />
                            )}
                            {user.revocationDate && (
                                <InfoRow
                                    icon={XCircle}
                                    label="Revoked On"
                                    value={
                                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400">
                                            {format(new Date(user.revocationDate), "PP HH:mm")}
                                        </span>
                                    }
                                />
                            )}
                            <InfoRow icon={Server} label="VPN Server" value={
                                <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">
                                    {user.vpnServer?.name || user.serverId || "—"}
                                </span>
                            } />
                        </CardContent>
                    </Card>
                </div>

                {/* Right col – Sessions + CCD */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Active / Last Session */}
                    <Card>
                        <CardContent className="pt-5 pb-4">
                            <SectionHeading
                                icon={Activity}
                                title={isOnline ? "Active Session" : "Last Session"}
                                description={isOnline ? "Currently connected" : "Most recent connection"}
                            />
                            <Separator className="mb-4" />
                            {currentSession ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <SessionStat label="Remote IP" value={currentSession.remoteIp} mono />
                                    <SessionStat label="VPN IP" value={currentSession.virtualIp || "—"} mono />
                                    <SessionStat label="Connected At" value={format(new Date(currentSession.startTime), "MMM d HH:mm")} />
                                    <SessionStat
                                        label="Duration"
                                        value={sessionDuration(currentSession.startTime)}
                                        highlight
                                    />
                                </div>
                            ) : lastSession ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <SessionStat label="Remote IP" value={lastSession.remoteIp} mono />
                                    <SessionStat label="VPN IP" value={lastSession.virtualIp || "—"} mono />
                                    <SessionStat label="Connected" value={format(new Date(lastSession.startTime), "MMM d HH:mm")} />
                                    <SessionStat
                                        label="Duration"
                                        value={lastSession.endTime ? sessionDuration(lastSession.startTime, lastSession.endTime) : "—"}
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-6 gap-2 text-muted-foreground">
                                    <WifiOff className="h-8 w-8 opacity-30" />
                                    <p className="text-sm">No session data available yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* CCD Configuration */}
                    <Card>
                        <CardContent className="pt-5 pb-4">
                            <SectionHeading
                                icon={Settings2}
                                title="Network Configuration"
                                description="Client-specific config (CCD) static IP and route directives"
                            />
                            <Separator className="mb-4" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Static IP</p>
                                    {user.ccdStaticIp ? (
                                        <code className="block font-mono text-sm bg-muted px-3 py-2 rounded-lg">
                                            {user.ccdStaticIp}
                                        </code>
                                    ) : (
                                        <p className="text-sm text-muted-foreground/60 italic px-1">Not configured</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Pushed Routes</p>
                                    {user.ccdRoutes ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {user.ccdRoutes.split(",").filter(Boolean).map((r: string, i: number) => (
                                                <code key={i} className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md border border-primary/20">
                                                    {r.trim()}
                                                </code>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground/60 italic px-1">No custom routes</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ── Session History Table ─────────────────────────────────────── */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <History className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Session History</CardTitle>
                            <CardDescription>
                                {userHistory.length > 0
                                    ? `${userHistory.length} recorded session${userHistory.length === 1 ? "" : "s"}`
                                    : "No sessions recorded yet"}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoadingHistory ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : userHistory.length === 0 ? (
                        <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
                            <History className="h-8 w-8 opacity-25" />
                            <p className="text-sm">No session history available.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">#</th>
                                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Remote IP</th>
                                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">VPN IP</th>
                                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Connected</th>
                                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Disconnected</th>
                                        <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Duration</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {userHistory.slice(0, 50).map((s: any, i: number) => (
                                        <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-2.5 text-muted-foreground tabular-nums text-xs">{i + 1}</td>
                                            <td className="px-4 py-2.5 font-mono text-xs">{s.remoteIp || "—"}</td>
                                            <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{s.virtualIp || "—"}</td>
                                            <td className="px-4 py-2.5 tabular-nums text-xs">
                                                {format(new Date(s.startTime), "MMM d, yyyy HH:mm")}
                                            </td>
                                            <td className="px-4 py-2.5 tabular-nums text-xs text-muted-foreground">
                                                {s.endTime ? format(new Date(s.endTime), "MMM d, yyyy HH:mm") : "—"}
                                            </td>
                                            <td className="px-4 py-2.5 text-right tabular-nums text-xs font-medium">
                                                {s.endTime ? sessionDuration(s.startTime, s.endTime) : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {userHistory.length > 50 && (
                                <div className="px-4 py-2.5 text-xs text-center text-muted-foreground border-t bg-muted/30">
                                    Showing 50 most recent of {userHistory.length} sessions
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Audit / Change Log ────────────────────────────────────────── */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <ShieldAlert className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Change Log</CardTitle>
                            <CardDescription>Audit trail of configuration and metadata changes</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoadingAudit ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : auditLogs && auditLogs.length > 0 ? (
                        <div className="relative">
                            {/* vertical line */}
                            <div className="absolute left-[17px] top-0 bottom-0 w-px bg-border" />
                            <div className="space-y-1">
                                {auditLogs.map((log: any, i: number) => (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.04, duration: 0.2 }}
                                        className="flex gap-4 pl-1"
                                    >
                                        {/* dot */}
                                        <div className="relative flex items-start pt-3 shrink-0">
                                            <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center z-10 shadow-sm">
                                                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                                            </div>
                                        </div>
                                        {/* content */}
                                        <div className="flex-1 pb-4 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1 pt-2.5">
                                                <Badge variant="outline" className="text-[10px] uppercase tracking-wide font-mono px-1.5 py-0">
                                                    {log.action.replace(/_/g, " ")}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(log.timestamp), "MMM d, yyyy · HH:mm")}
                                                </span>
                                                {log.user?.username && (
                                                    <span className="text-xs text-muted-foreground/70">
                                                        by <span className="font-medium text-foreground/80">{log.user.username}</span>
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-foreground/70 leading-relaxed">{log.details}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
                            <ShieldAlert className="h-8 w-8 opacity-25" />
                            <p className="text-sm">No configuration changes recorded.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}

// ─── SessionStat helper ───────────────────────────────────────────────────────

function SessionStat({ label, value, mono = false, highlight = false }: {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
    highlight?: boolean;
}) {
    return (
        <div className="bg-muted/40 rounded-lg px-3 py-2.5 border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
            <p className={`text-sm font-semibold truncate ${mono ? "font-mono" : ""} ${highlight ? "text-primary" : ""}`}>
                {value}
            </p>
        </div>
    );
}
