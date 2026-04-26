import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  buildUrl,
  type CreateUserRequest,
  type UpdateUserRequest,
  type CreateVpnServerRequest,
} from "@shared/routes";
import { toast } from "@/hooks/use-toast";

// ==========================================
// SYSTEM STATS
// ==========================================
export function useStats() {
  return useQuery({
    queryKey: [api.stats.get.path],
    queryFn: async () => {
      const res = await fetch(api.stats.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 5000, // Poll every 5s
  });
}

// ==========================================
// SESSIONS
// ==========================================
export function useActiveSessions() {
  return useQuery({
    queryKey: [api.sessions.active.path],
    queryFn: async () => {
      const res = await fetch(api.sessions.active.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch active sessions");
      return api.sessions.active.responses[200].parse(await res.json());
    },
    refetchInterval: 2000, // Fast polling for live data
  });
}

export function useSessionHistory() {
  return useQuery({
    queryKey: [api.sessions.history.path],
    queryFn: async () => {
      const res = await fetch(api.sessions.history.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch session history");
      return api.sessions.history.responses[200].parse(await res.json());
    },
  });
}


// ==========================================
// VPN USERS
// ==========================================
export function useVpnUsers() {
  return useQuery({
    queryKey: [api.vpnUsers.list.path],
    queryFn: async () => {
      const res = await fetch(api.vpnUsers.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch VPN users");
      return api.vpnUsers.list.responses[200].parse(await res.json());
    },
  });
}

export function useVpnUser(id: number) {
  return useQuery({
    queryKey: [api.vpnUsers.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.vpnUsers.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch VPN user");
      return api.vpnUsers.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useUpdateVpnUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: number;
      fullName?: string | null;
      email?: string | null;
      contact?: string | null;
      type?: string;
    }) => {
      const url = buildUrl(api.vpnUsers.update.path, { id });
      const res = await fetch(url, {
        method: api.vpnUsers.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to update VPN user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vpnUsers.list.path] });
      toast({ title: "VPN user updated successfully" });
    },
    onError: (err) => {
      toast({
        title: "Failed to update VPN user",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    },
  });
}

// ==========================================
// PORTAL USERS (ADMINS)
// ==========================================
export function usePortalUsers() {
  return useQuery({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      const res = await fetch(api.users.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch portal users");
      return api.users.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreatePortalUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateUserRequest) => {
      const res = await fetch(api.users.create.path, {
        method: api.users.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create user");
      return api.users.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "User created successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to create user", description: err.message, variant: "destructive" });
    }
  });
}

export function useUpdatePortalUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & UpdateUserRequest) => {
      const url = buildUrl(api.users.update.path, { id });
      const res = await fetch(url, {
        method: api.users.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update user");
      return api.users.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "User updated successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to update user", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });
}

export function useDeletePortalUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.users.delete.path, { id });
      const res = await fetch(url, {
        method: api.users.delete.method,
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to delete user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "User deleted successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to delete user", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });
}

export function useResetPortalUserPassword() {
  return useMutation({
    mutationFn: async ({ id, newPassword }: { id: number; newPassword: string }) => {
      const url = buildUrl(api.users.resetPassword.path, { id });
      const res = await fetch(url, {
        method: api.users.resetPassword.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to reset password");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password reset successfully", description: "User will be required to change password on next login." });
    },
    onError: (err) => {
      toast({ title: "Failed to reset password", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    },
  });
}

// ==========================================
// AUDIT LOGS
// ==========================================
export function useAuditLogs() {
  return useQuery({
    queryKey: [api.audit.list.path],
    queryFn: async () => {
      const res = await fetch(api.audit.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return api.audit.list.responses[200].parse(await res.json());
    },
  });
}

// ==========================================
// VPN SERVERS
// ==========================================
export function useVpnServers() {
  return useQuery({
    queryKey: [api.vpnServers.list.path],
    queryFn: async () => {
      const res = await fetch(api.vpnServers.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch VPN servers");
      return api.vpnServers.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateVpnServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateVpnServerRequest) => {
      const res = await fetch(api.vpnServers.create.path, {
        method: api.vpnServers.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create VPN server");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vpnServers.list.path] });
      toast({ title: "VPN server registered successfully" });
    },
    onError: (err) => {
      toast({
        title: "Failed to register VPN server",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteVpnServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.vpnServers.delete.path, { id });
      const res = await fetch(url, {
        method: api.vpnServers.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete VPN server");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vpnServers.list.path] });
      toast({ title: "VPN server removed" });
    },
    onError: (err) => {
      toast({
        title: "Failed to remove VPN server",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    },
  });
}

export function useRegenerateVpnServerKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.vpnServers.regenerateKey.path, { id });
      const res = await fetch(url, {
        method: api.vpnServers.regenerateKey.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to regenerate API key");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vpnServers.list.path] });
      toast({ title: "API key regenerated" });
    },
    onError: (err) => {
      toast({
        title: "Failed to regenerate API key",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    },
  });
}

export function useVpnUserAuditLogs(id: number) {
  const url = buildUrl(api.vpnUsers.auditLogs.path, { id });
  return useQuery({
    queryKey: [url],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
    enabled: !!id,
  });
}
