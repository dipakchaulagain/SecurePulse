import { pgTable, text, serial, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  fullName: text("full_name"),
  role: text("role", { enum: ["admin", "operator"] }).notNull().default("operator"),
  isActive: boolean("is_active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vpnUsers = pgTable("vpn_users", {
  id: serial("id").primaryKey(),
  commonName: text("common_name").notNull(),
  email: text("email"),
  fullName: text("full_name"),
  contact: text("contact"),
  type: text("type", { enum: ["Employee", "Vendor", "Client", "Others"] }).notNull().default("Others"),
  status: text("status").notNull().default("offline"),
  lastConnected: timestamp("last_connected"),
  ccdStaticIp: text("ccd_static_ip"),
  ccdRoutes: text("ccd_routes"),
  accountStatus: text("account_status").default("VALID"),
  expirationDate: timestamp("expiration_date"),
  revocationDate: timestamp("revocation_date"),
  serverId: text("server_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  nameServerIdx: uniqueIndex("vpn_users_common_name_server_unique").on(table.commonName, table.serverId),
}));

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  vpnUserId: integer("vpn_user_id").notNull(),
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  remoteIp: text("remote_ip").notNull(),
  virtualIp: text("virtual_ip"),
  status: text("status", { enum: ["active", "closed"] }).notNull().default("active"),
  serverId: text("server_id"),
  eventId: text("event_id").unique(),
});

export const vpnServers = pgTable("vpn_servers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  serverId: text("server_id").notNull().unique(),
  apiKey: text("api_key").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// === RELATIONS ===

export const sessionsRelations = relations(sessions, ({ one }) => ({
  vpnUser: one(vpnUsers, {
    fields: [sessions.vpnUserId],
    references: [vpnUsers.id],
  }),
}));

export const vpnUsersRelations = relations(vpnUsers, ({ many }) => ({
  sessions: many(sessions),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// === ZOD SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertVpnUserSchema = createInsertSchema(vpnUsers).omit({ id: true, createdAt: true, lastConnected: true, accountStatus: true, expirationDate: true, revocationDate: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, startTime: true, endTime: true });
export const insertVpnServerSchema = createInsertSchema(vpnServers).omit({ id: true, createdAt: true, serverId: true, apiKey: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });

// === TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type VpnUser = typeof vpnUsers.$inferSelect;
export type InsertVpnUser = z.infer<typeof insertVpnUserSchema>;
export type VpnServer = typeof vpnServers.$inferSelect;
export type InsertVpnServer = z.infer<typeof insertVpnServerSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type UserResponse = Omit<User, "password">;
export type SessionWithUser = Session & { vpnUser: VpnUser };
