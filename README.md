# SecurePulse

Secure web application for monitoring, managing, and auditing OpenVPN telemetry data.

## Default Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `password123` | Admin |

> **Security:** On first login, you will be required to change the default password before accessing the portal.

## Features

- **Dashboard** — Real-time SIEM-style overview: active sessions, VPN user stats, and certificate status breakdown (Valid/Expired/Revoked).
- **Accounting** — Session history with Duration monitoring, Server ID auditing, advanced time-based/user-based filtering, and CSV export for compliance.
- **Active Sessions** — Live VPN session monitor with user details and real-time connection status.
- **VPN User Management** — Manage metadata for VPN clients (Full Name, Email, Contact, Type). Color-coded status badges for account and connection states.
- **Portal User Management** — RBAC with two roles: Admin and Operator. Forced password change on first login for all new users.
- **Audit Logs** — Comprehensive tracking of all administrative actions.
- **VPN Server Management** — Register multiple OpenVPN servers, manage API keys for telemetry ingestion.
- **Global Context** — Real-time digital clock and high-precision connection durations (including seconds).
- **Responsive Design** — Fluid layouts optimized for 14" laptop screens and mobile devices.

## User Roles (RBAC)

| Role | Permissions |
|------|------------|
| **Admin** | Full access: user management, VPN server management, all views |
| **Operator** | Read-only access to all monitoring and management pages |

## API Documentation for Telemetry Agent

The telemetry agent sends session events to the following endpoint:

### POST /api/v1/events (Telemetry Agent)

**Endpoint:** `POST /api/v1/events`
**Authentication:** `Authorization: Bearer <VPN_SERVER_API_KEY>`

The `server_id` in the body must match the `server_id` associated with the API Key.

**Supported Event Types:**
- `SESSION_CONNECTED` — VPN user connected
- `SESSION_DISCONNECTED` — VPN user disconnected
- `USERS_UPDATE` — Bulk or single certificate status sync (VALID/EXPIRED/REVOKED)
- `CCD_INFO` — Client-specific configuration (static IP, routes)

**Telemetry Ingestion Rules:**

The portal enforces strict VPN user identification to prevent data pollution from unregistered clients:

1.  **User Creation**: New VPN users are automatically created **ONLY** when a `USERS_UPDATE` event is received with an `action` of `INITIAL` or `ADDED`.
2.  **Existence enforced**: Events of type `SESSION_CONNECTED`, `SESSION_DISCONNECTED`, and `CCD_INFO` require the VPN user to already exist in the database.
3.  **Identity Isolation**: User identity is globally unique per OpenVPN server. The system supports the same `common_name` across different `server_id` environments without data collision.
4.  **Filtered Updates**: `USERS_UPDATE` events with actions like `REVOKED` or `EXPIRED` will be ignored if the user does not already exist.
5.  **Acknowledgment**: The API returns HTTP `202 Accepted` for all structurally valid payloads, even if individual events within the payload are skipped due to missing users (these are logged as warnings on the server).

**Payload Examples:**

#### 1. Session Events (Connected/Disconnected)

```json
{
  "server_id": "vpn-node-01",
  "sent_at": "2026-02-13T12:00:00Z",
  "events": [
    {
      "event_id": "uuid-1",
      "type": "SESSION_CONNECTED",
      "common_name": "jdoe@company.com",
      "real_ip": "203.0.113.5",
      "virtual_ip": "10.8.0.2",
      "event_time_vpn": "2026-02-13T12:00:00Z"
    },
    {
      "event_id": "uuid-2",
      "type": "SESSION_DISCONNECTED",
      "common_name": "jdoe@company.com",
      "event_time_vpn": "2026-02-13T12:30:00Z"
    }
  ]
}
```

#### 2. User/Certificate Status Sync (`USERS_UPDATE`)

**Initial Bulk Sync (Agent Startup):**
```json
{
  "server_id": "vpn-node-01",
  "sent_at": "2026-02-13T12:00:00Z",
  "events": [
    {
      "event_id": "uuid-3",
      "type": "USERS_UPDATE",
      "action": "INITIAL",
      "source": "index.txt",
      "users": [
        { "common_name": "alice", "status": "VALID", "expires_at_index": "290124060904Z" },
        { "common_name": "bob", "status": "EXPIRED", "expires_at_index": "240112065432Z" }
      ],
      "event_time_agent": "2026-02-13T12:00:00Z"
    }
  ]
}
```

**Individual Incremental Update (Existing User):**
```json
{
  "server_id": "vpn-node-01",
  "sent_at": "2026-02-13T12:05:00Z",
  "events": [
    {
      "event_id": "uuid-4",
      "type": "USERS_UPDATE",
      "common_name": "charlie",
      "status": "REVOKED",
      "action": "REVOKED",
      "revoked_at_index": "221206054507Z",
      "event_time_agent": "2026-02-13T12:05:00Z"
    }
  ]
}
```

**New User Discovery (Periodic Scan with ADDED action):**
```json
{
  "server_id": "vpn-node-01",
  "sent_at": "2026-02-13T12:10:00Z",
  "events": [
    {
      "event_id": "b0ca3d8f-3f81-41cb-8e23-18cdbed4f5bb",
      "type": "USERS_UPDATE",
      "action": "ADDED",
      "source": "index.txt",
      "event_time_agent": "2026-02-13T12:10:05Z",
      "users": [
        {
          "common_name": "alice",
          "status": "VALID",
          "expires_at_index": "290124060904Z"
        },
        {
          "common_name": "bob",
          "status": "VALID",
          "expires_at_index": "290124092711Z"
        }
      ]
    }
  ]
}
```

#### 3. Client Configuration Information (`CCD_INFO`)

```json
{
  "server_id": "vpn-node-01",
  "sent_at": "2026-02-13T12:10:00Z",
  "events": [
    {
      "event_id": "uuid-5",
      "type": "CCD_INFO",
      "common_name": "alice",
      "ccd_path": "/etc/openvpn/ccd/alice",
      "ccd_content_b64": "aWZjb25maWctcHVzaCAxMC44LjAuNiAyNTUuMjU1LjI1NS4w",
      "event_time_agent": "2026-02-13T12:10:00Z"
    }
  ]
}
```

**Idempotency:** Duplicate events with the same `event_id` are ignored.

## Docker Deployment

### Prerequisites

- Docker & Docker Compose
- SSL Certificate and Key files

### Step 1: Configuration

Create a `.env` file based on `.env.example`:

```env
POSTGRES_USER=securepulse_user
POSTGRES_PASSWORD=your_secure_db_password
POSTGRES_DB=telemetry
SESSION_SECRET=your_random_secret_here
```

*(The `DATABASE_URL` is automatically generated by docker-compose using the database variables)*

### Step 2: SSL Configuration

Place your valid `.crt` and `.key` files in the `ssl/` folder:
- `ssl/server.crt`
- `ssl/server.key`

### Step 3: Build and Start

```bash
docker compose up -d --build
```

This launches a 3-tier architecture securely:
1. **Nginx** (SecurePulse-Nginx) — Reverse proxy, handles SSL offloading, forwards traffic to the application. Only exposes ports 80/443. Access and error logs are stored in `logs/nginx/`.
2. **Web App** (SecurePulse) — Node.js/Express + React backend. Directly runs source code and requires no local bind mounts for the app post-build.
3. **Database** (SecurePulse-DB) — PostgreSQL 16 database utilizing a persistent Docker volume (`db_data`).

## Technology Stack

- **Frontend**: React, Tailwind CSS, Shadcn UI, TanStack Query, Recharts
- **Backend**: Node.js, Express, Passport.js, Drizzle ORM
- **Database**: PostgreSQL
