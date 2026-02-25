import type { Express } from "express";
import { type Server } from "http";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";
import { User } from "@shared/schema";

function generateServerId(): string {
  return `vpn-${crypto.randomBytes(6).toString("hex")}`;
}

function generateApiKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // ==========================================
  // CHANGE PASSWORD (forced on first login)
  // ==========================================
  app.post("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }
    const user = req.user as User;
    const valid = await comparePasswords(currentPassword, user.password);
    if (!valid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    const hashed = await hashPassword(newPassword);
    await storage.updateUser(user.id, { password: hashed, mustChangePassword: false } as any);
    await storage.createAuditLog({
      userId: user.id,
      action: "CHANGE_PASSWORD",
      entityType: "user",
      entityId: String(user.id),
      details: "Password changed (forced on first login)"
    });
    // Re-fetch user after update to get fresh data
    const updatedUser = await storage.getUser(user.id);
    if (updatedUser) {
      const { password: _, ...userWithoutPassword } = updatedUser;
      return res.json(userWithoutPassword);
    }
    res.json({ message: "Password changed successfully" });
  });

  app.get(api.users.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const users = await storage.getUsers();
    res.json(users);
  });

  app.post(api.users.create.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') return res.sendStatus(401);
    try {
      const input = api.users.create.input.parse(req.body);
      const user = await storage.createUser(input);
      await storage.createAuditLog({
        userId: req.user.id,
        action: "CREATE",
        entityType: "user",
        entityId: String(user.id),
        details: `Created user ${user.username}`
      });
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json(err);
      throw err;
    }
  });

  app.patch(api.users.update.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const input = api.users.update.input.parse(req.body);
    const user = await storage.updateUser(id, input);
    await storage.createAuditLog({
      userId: req.user.id,
      action: "UPDATE",
      entityType: "user",
      entityId: String(user.id),
      details: `Updated user ${user.username}`
    });
    res.json(user);
  });

  app.get(api.vpnUsers.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const vpnUsers = await storage.getVpnUsers();
    res.json(vpnUsers);
  });

  app.get(api.vpnUsers.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = await storage.getVpnUser(parseInt(req.params.id));
    if (!user) return res.sendStatus(404);
    res.json(user);
  });

  app.patch(api.vpnUsers.update.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') {
      return res.sendStatus(403);
    }
    const id = parseInt(req.params.id);
    try {
      const input = api.vpnUsers.update.input.parse(req.body);
      const user = await storage.updateVpnUser(id, input);
      await storage.createAuditLog({
        userId: req.user.id,
        action: "UPDATE_VPN_USER",
        entityType: "vpn_user",
        entityId: String(id),
        details: `Updated VPN user info for ${user.commonName}`,
      });
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error" });
      }
      throw err;
    }
  });

  app.get(api.sessions.active.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const sessions = await storage.getActiveSessions();
    res.json(sessions);
  });

  app.get(api.sessions.history.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const history = await storage.getSessionHistory();
    res.json(history);
  });

  app.get("/api/accounting", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const sessions = await storage.getAllSessions();
    res.json(sessions);
  });


  app.get(api.stats.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const active = await storage.getActiveSessions();
    const allVpnUsers = await storage.getVpnUsers();

    // User status breakdown
    const validCount = allVpnUsers.filter(u => u.accountStatus === "VALID").length;
    const expiredCount = allVpnUsers.filter(u => u.accountStatus === "EXPIRED").length;
    const revokedCount = allVpnUsers.filter(u => u.accountStatus === "REVOKED").length;

    res.json({
      activeSessions: active.length,
      totalVpnUsers: allVpnUsers.length,
      vpnUsersByStatus: { valid: validCount, expired: expiredCount, revoked: revokedCount },
      serverStatus: "Online"
    });
  });

  app.get(api.vpnUsers.auditLogs.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const logs = await storage.getAuditLogsByEntity("vpn_user", String(id));
    res.json(logs);
  });

  app.get(api.audit.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const logs = await storage.getAuditLogs();
    res.json(logs);
  });

  // ==========================================
  // VPN SERVER MANAGEMENT
  // ==========================================

  app.get(api.vpnServers.list.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') return res.sendStatus(403);
    const servers = await storage.getVpnServers();
    res.json(servers);
  });

  app.post(api.vpnServers.create.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') return res.sendStatus(403);
    try {
      const input = api.vpnServers.create.input.parse(req.body);
      const server = await storage.createVpnServer({
        ...input,
        serverId: generateServerId(),
        apiKey: generateApiKey(),
      });
      await storage.createAuditLog({
        userId: req.user.id,
        action: "CREATE_VPN_SERVER",
        entityType: "vpn_server",
        entityId: String(server.id),
        details: `Registered VPN server "${server.name}" (${server.serverId})`,
      });
      res.status(201).json(server);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error" });
      }
      throw err;
    }
  });

  app.delete(api.vpnServers.delete.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') return res.sendStatus(403);
    const id = parseInt(req.params.id);
    const server = await storage.getVpnServer(id);
    if (!server) return res.status(404).json({ message: "Server not found" });
    await storage.deleteVpnServer(id);
    await storage.createAuditLog({
      userId: req.user.id,
      action: "DELETE_VPN_SERVER",
      entityType: "vpn_server",
      entityId: String(id),
      details: `Removed VPN server "${server.name}" (${server.serverId})`,
    });
    res.json({ message: "Server deleted" });
  });

  app.post(api.vpnServers.regenerateKey.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') return res.sendStatus(403);
    const id = parseInt(req.params.id);
    const server = await storage.getVpnServer(id);
    if (!server) return res.status(404).json({ message: "Server not found" });
    const updated = await storage.updateVpnServer(id, { apiKey: generateApiKey() });
    await storage.createAuditLog({
      userId: req.user.id,
      action: "REGENERATE_VPN_SERVER_KEY",
      entityType: "vpn_server",
      entityId: String(id),
      details: `Regenerated API key for VPN server "${server.name}" (${server.serverId})`,
    });
    res.json(updated);
  });

  // Telemetry ingestion endpoint for OpenVPN agent
  app.post(api.telemetry.ingest.path, async (req, res, next) => {
    try {
      // Auth: check per-server key first, then fall back to global key
      const auth = req.header("authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      let authenticated = false;

      // Try per-server API key authentication
      if (token && req.body?.server_id) {
        const server = await storage.getVpnServerByServerId(req.body.server_id);
        if (server && server.isActive && server.apiKey === token) {
          authenticated = true;
        }
      }

      // Fall back to global TELEMETRY_API_KEY
      if (!authenticated) {
        const globalKey = process.env.TELEMETRY_API_KEY;
        if (globalKey && token === globalKey) {
          authenticated = true;
        }
      }

      if (!authenticated) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const payload = api.telemetry.ingest.input.parse(req.body);

      for (const event of payload.events) {
        // Idempotency check: if event_id already exists, skip
        if (event.event_id) {
          const existingSession = await storage.getSessionByEventId(event.event_id);
          if (existingSession) {
            console.log(`Skipping duplicate event ${event.event_id}`);
            continue;
          }
        }

        const serverId = payload.server_id;
        const commonName = event.common_name;
        let vpnUser = (serverId && commonName) ? await storage.getVpnUserByCommonNameAndServer(
          serverId,
          commonName,
        ) : undefined;

        const eventDateStr = event.event_time_agent || event.event_time_vpn;
        const eventTime = eventDateStr ? new Date(eventDateStr) : new Date();

        if (event.type === "SESSION_CONNECTED") {
          if (!vpnUser) {
            console.warn(`[Telemetry] Skipping SESSION_CONNECTED: VPN user ${commonName} from ${serverId} not found.`);
            continue;
          }
          await storage.createSession({
            vpnUserId: vpnUser.id,
            startTime: eventTime,
            remoteIp: event.real_ip || "",
            virtualIp: event.virtual_ip || null,
            status: "active",
            serverId,
            eventId: event.event_id,
          });

          await storage.updateVpnUser(vpnUser.id, {
            status: "online",
            lastConnected: eventTime,
          });
        } else if (event.type === "SESSION_DISCONNECTED") {
          if (!commonName) continue;
          if (!vpnUser) {
            console.warn(`[Telemetry] Skipping SESSION_DISCONNECTED: VPN user ${commonName} from ${serverId} not found.`);
            continue;
          }

          const activeSessions = await storage.getActiveSessions();
          const userActive = activeSessions
            .filter((s) => s.vpnUser.id === vpnUser?.id)
            .sort(
              (a, b) =>
                new Date(b.startTime).getTime() -
                new Date(a.startTime).getTime(),
            );

          const latest = userActive[0];
          if (latest) {
            await storage.endSession(latest.id);
          }

          await storage.updateVpnUser(vpnUser.id, {
            status: "offline",
          });
        } else if (event.type === "USERS_UPDATE") {
          // Handle Bulk Update (Creation allowed for INITIAL or ADDED)
          if ((event.action === "INITIAL" || event.action === "ADDED") && event.users) {
            for (const user of event.users) {
              let u = await storage.getVpnUserByCommonNameAndServer(serverId, user.common_name);
              const data = {
                accountStatus: user.status,
                expirationDate: user.expires_at_index ? parseOpenVpnDate(user.expires_at_index) : undefined,
                serverId,
              };

              if (!u) {
                await storage.createVpnUser({
                  commonName: user.common_name,
                  type: "Others",
                  status: "offline",
                  ...data,
                });
              } else {
                await storage.updateVpnUser(u.id, data);
              }
            }
          }
          // Handle Single User Update
          else if (commonName) {
            const expirationDate = event.expires_at_index ? parseOpenVpnDate(event.expires_at_index) : undefined;
            const revocationDate = event.revoked_at_index ? parseOpenVpnDate(event.revoked_at_index) : undefined;

            // vpnUser might be null, create ONLY if action is ADDED
            if (!vpnUser) {
              if (event.action === "ADDED" || event.action === "INITIAL") {
                vpnUser = await storage.createVpnUser({
                  commonName,
                  type: "Others",
                  status: "offline",
                  serverId,
                });
              } else {
                console.warn(`[Telemetry] Skipping USERS_UPDATE (${event.action}): VPN user ${commonName} from ${serverId} not found.`);
                continue;
              }
            }

            await storage.updateVpnUser(vpnUser.id, {
              accountStatus: event.status || "VALID",
              expirationDate,
              revocationDate,
            });
          }
        } else if (event.type === "CCD_INFO") {
          if (commonName && event.ccd_content_b64) {
            if (!vpnUser) {
              console.warn(`[Telemetry] Skipping CCD_INFO: VPN user ${commonName} from ${serverId} not found.`);
              continue;
            }

            const decoded = Buffer.from(event.ccd_content_b64, 'base64').toString('utf-8');
            const ifconfigMatch = decoded.match(/ifconfig-push\s+([\d.]+)\s+([\d.]+)/);
            let ccdStaticIp = ifconfigMatch ? ifconfigMatch[1] : null;

            const routeMatches = [...decoded.matchAll(/push\s+"route\s+([\d.]+)\s+([\d.]+)"/g)];
            const routes = routeMatches.map(m => `${m[1]}/${netmaskToCidr(m[2])}`).join(",");

            // Detect changes for auditing
            const changes: string[] = [];
            if (ccdStaticIp !== vpnUser.ccdStaticIp) {
              changes.push(`Static IP: ${vpnUser.ccdStaticIp || "none"} → ${ccdStaticIp || "none"}`);
            }

            if (routes !== vpnUser.ccdRoutes) {
              const oldRoutes = vpnUser.ccdRoutes ? vpnUser.ccdRoutes.split(",").filter(r => r) : [];
              const newRoutes = routes ? routes.split(",").filter(r => r) : [];

              const added = newRoutes.filter(r => !oldRoutes.includes(r));
              const removed = oldRoutes.filter(r => !newRoutes.includes(r));

              if (added.length > 0) {
                changes.push(`Added routes: ${added.join(", ")}`);
              }
              if (removed.length > 0) {
                changes.push(`Removed routes: ${removed.join(", ")}`);
              }
            }

            if (changes.length > 0) {
              await storage.createAuditLog({
                action: "CCD_CONFIGURATION_UPDATE",
                entityType: "vpn_user",
                entityId: String(vpnUser.id),
                details: `CCD detected via telemetry from ${serverId}: ${changes.join("; ")}`,
              });
            }

            await storage.updateVpnUser(vpnUser.id, {
              ccdStaticIp: ccdStaticIp || undefined,
              ccdRoutes: routes || undefined,
            });
          }
        }
      }

      res.status(202).json({ received: payload.events.length });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid telemetry payload" });
      }
      return next(err);
    }
  });

  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingUsers = await storage.getUsers();
  if (existingUsers.length === 0) {
    const hashedPassword = await hashPassword("password123");
    await storage.createUser({
      username: "admin",
      password: hashedPassword,
      role: "admin",
      isActive: true,
      mustChangePassword: true,
      email: "admin@example.com",
      fullName: "System Admin"
    });
  }
}

function parseOpenVpnDate(dateStr: string): Date | undefined {
  // Format: YYMMDDHHmmssZ e.g. 290124060904Z
  if (!dateStr || dateStr.length < 12) return undefined;
  // allow for explicit ISO strings just in case
  if (dateStr.includes('-')) return new Date(dateStr);

  const year = parseInt(dateStr.substring(0, 2));
  const month = parseInt(dateStr.substring(2, 4)) - 1;
  const day = parseInt(dateStr.substring(4, 6));
  const hour = parseInt(dateStr.substring(6, 8));
  const minute = parseInt(dateStr.substring(8, 10));
  const second = parseInt(dateStr.substring(10, 12));

  // Assume 20xx for year
  const fullYear = 2000 + year;
  return new Date(Date.UTC(fullYear, month, day, hour, minute, second));
}

function netmaskToCidr(netmask: string): number {
  return netmask.split('.').map(Number)
    .map(part => (part >>> 0).toString(2))
    .join('')
    .split('1').length - 1;
}
