import { db, pool } from "./db";
import {
  users,
  vpnUsers,
  vpnServers,
  sessions,
  auditLogs,
  type User,
  type InsertUser,
  type VpnUser,
  type InsertVpnUser,
  type VpnServer,
  type InsertVpnServer,
  type Session,
  type InsertSession,
  type AuditLog,
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  getVpnUserByCommonNameAndServer(
    serverId: string,
    cn: string,
  ): Promise<VpnUser | undefined>;
  getVpnUsers(): Promise<(VpnUser & { vpnServer: VpnServer | null })[]>;
  getVpnUser(id: number): Promise<(VpnUser & { vpnServer: VpnServer | null }) | undefined>;
  createVpnUser(user: InsertVpnUser): Promise<VpnUser>;
  updateVpnUser(id: number, user: Partial<InsertVpnUser>): Promise<VpnUser>;
  getActiveSessions(): Promise<(Session & { vpnUser: VpnUser, vpnServer: VpnServer | null })[]>;
  getSessionHistory(): Promise<(Session & { vpnUser: VpnUser, vpnServer: VpnServer | null })[]>;
  getAllSessions(): Promise<(Session & { vpnUser: VpnUser, vpnServer: VpnServer | null })[]>;
  createSession(session: InsertSession): Promise<Session>;
  endSession(id: number): Promise<void>;
  createAuditLog(log: { userId?: number, action: string, entityType: string, entityId?: string, details?: string }): Promise<AuditLog>;
  getAuditLogs(): Promise<(AuditLog & { user: User | null })[]>;
  getAuditLogsByEntity(entityType: string, entityId: string): Promise<(AuditLog & { user: User | null })[]>;
  getVpnServers(): Promise<VpnServer[]>;
  getVpnServer(id: number): Promise<VpnServer | undefined>;
  getVpnServerByServerId(serverId: string): Promise<VpnServer | undefined>;
  getSessionByEventId(eventId: string): Promise<Session | undefined>;
  createVpnServer(server: InsertVpnServer & { serverId: string; apiKey: string }): Promise<VpnServer>;
  updateVpnServer(id: number, updates: Partial<VpnServer>): Promise<VpnServer>;
  deleteVpnServer(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async getVpnUsers(): Promise<(VpnUser & { vpnServer: VpnServer | null })[]> {
    return await db.query.vpnUsers.findMany({
      with: { vpnServer: true },
      orderBy: desc(vpnUsers.lastConnected),
    });
  }

  async getVpnUserByCommonNameAndServer(
    serverId: string,
    commonName: string,
  ): Promise<VpnUser | undefined> {
    const [user] = await db
      .select()
      .from(vpnUsers)
      .where(
        and(
          eq(vpnUsers.commonName, commonName),
          eq(vpnUsers.serverId, serverId),
        ),
      );
    return user;
  }

  async getVpnUser(id: number): Promise<(VpnUser & { vpnServer: VpnServer | null }) | undefined> {
    return await db.query.vpnUsers.findFirst({
      where: eq(vpnUsers.id, id),
      with: { vpnServer: true },
    });
  }

  async createVpnUser(user: InsertVpnUser): Promise<VpnUser> {
    const [newUser] = await db.insert(vpnUsers).values(user).returning();
    return newUser;
  }

  async updateVpnUser(id: number, updates: Partial<InsertVpnUser>): Promise<VpnUser> {
    const [user] = await db.update(vpnUsers).set(updates).where(eq(vpnUsers.id, id)).returning();
    return user;
  }

  async getActiveSessions(): Promise<(Session & { vpnUser: VpnUser, vpnServer: VpnServer | null })[]> {
    return await db.query.sessions.findMany({
      where: eq(sessions.status, "active"),
      with: { vpnUser: true, vpnServer: true },
      orderBy: desc(sessions.startTime),
    });
  }

  async getSessionHistory(): Promise<(Session & { vpnUser: VpnUser, vpnServer: VpnServer | null })[]> {
    return await db.query.sessions.findMany({
      where: eq(sessions.status, "closed"),
      with: { vpnUser: true, vpnServer: true },
      orderBy: desc(sessions.endTime),
      limit: 500,
    });
  }

  async getAllSessions(): Promise<(Session & { vpnUser: VpnUser, vpnServer: VpnServer | null })[]> {
    return await db.query.sessions.findMany({
      with: { vpnUser: true, vpnServer: true },
      orderBy: desc(sessions.startTime),
    });
  }

  async getSessionByEventId(eventId: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.eventId, eventId));
    return session;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [newSession] = await db.insert(sessions).values(session).returning();
    return newSession;
  }

  async endSession(id: number): Promise<void> {
    await db.update(sessions)
      .set({ status: "closed", endTime: new Date() })
      .where(eq(sessions.id, id));
  }

  async createAuditLog(log: { userId?: number, action: string, entityType: string, entityId?: string, details?: string }): Promise<AuditLog> {
    const [entry] = await db.insert(auditLogs).values(log).returning();
    return entry;
  }

  async getAuditLogs(): Promise<(AuditLog & { user: User | null })[]> {
    return await db.query.auditLogs.findMany({
      with: { user: true },
      orderBy: desc(auditLogs.timestamp),
    });
  }
  async getAuditLogsByEntity(entityType: string, entityId: string): Promise<(AuditLog & { user: User | null })[]> {
    return await db.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.entityType, entityType),
        eq(auditLogs.entityId, entityId)
      ),
      with: { user: true },
      orderBy: desc(auditLogs.timestamp),
    });
  }

  async getVpnServers(): Promise<VpnServer[]> {
    return await db.select().from(vpnServers).orderBy(desc(vpnServers.createdAt));
  }

  async getVpnServer(id: number): Promise<VpnServer | undefined> {
    const [server] = await db.select().from(vpnServers).where(eq(vpnServers.id, id));
    return server;
  }

  async getVpnServerByServerId(serverId: string): Promise<VpnServer | undefined> {
    const [server] = await db.select().from(vpnServers).where(eq(vpnServers.serverId, serverId));
    return server;
  }

  async createVpnServer(server: InsertVpnServer & { serverId: string; apiKey: string }): Promise<VpnServer> {
    const [newServer] = await db.insert(vpnServers).values(server).returning();
    return newServer;
  }

  async updateVpnServer(id: number, updates: Partial<VpnServer>): Promise<VpnServer> {
    const [server] = await db.update(vpnServers).set(updates).where(eq(vpnServers.id, id)).returning();
    return server;
  }

  async deleteVpnServer(id: number): Promise<void> {
    await db.delete(vpnServers).where(eq(vpnServers.id, id));
  }
}

export const storage = new DatabaseStorage();
