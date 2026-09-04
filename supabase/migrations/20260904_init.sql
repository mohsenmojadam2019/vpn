-- Paydar production schema for Supabase/PostgreSQL
-- This file intentionally contains no credentials or secrets.

DO $$ BEGIN
  CREATE TYPE "NodeStatus" AS ENUM ('UNKNOWN', 'ONLINE', 'DEGRADED', 'OFFLINE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Node" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "country" TEXT,
  "host" TEXT NOT NULL,
  "port" INTEGER NOT NULL DEFAULT 443,
  "transport" TEXT NOT NULL DEFAULT 'raw',
  "security" TEXT NOT NULL DEFAULT 'reality',
  "flow" TEXT DEFAULT 'xtls-rprx-vision',
  "sni" TEXT,
  "fingerprint" TEXT DEFAULT 'chrome',
  "publicKey" TEXT,
  "shortId" TEXT,
  "path" TEXT,
  "serviceName" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "status" "NodeStatus" NOT NULL DEFAULT 'UNKNOWN',
  "latencyMs" INTEGER,
  "lastCheckedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Plan" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "trafficGb" INTEGER,
  "priceTomans" BIGINT,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Customer" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "email" TEXT UNIQUE,
  "phone" TEXT UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT PRIMARY KEY,
  "token" TEXT NOT NULL UNIQUE,
  "vlessUuid" TEXT NOT NULL UNIQUE,
  "customerId" TEXT,
  "planId" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "trafficLimitBytes" BIGINT,
  "trafficUsedBytes" BIGINT NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Subscription_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL,
  CONSTRAINT "Subscription_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "Order" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "planId" TEXT NOT NULL,
  "customerId" TEXT,
  "subscriptionId" TEXT UNIQUE,
  "customerName" TEXT,
  "email" TEXT,
  "phone" TEXT NOT NULL,
  "amountTomans" BIGINT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Order_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT,
  CONSTRAINT "Order_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL,
  CONSTRAINT "Order_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "Node_enabled_priority_idx"
  ON "Node" ("enabled", "priority");

CREATE INDEX IF NOT EXISTS "Subscription_enabled_expiresAt_idx"
  ON "Subscription" ("enabled", "expiresAt");

CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx"
  ON "Order" ("status", "createdAt");

CREATE INDEX IF NOT EXISTS "Order_phone_idx"
  ON "Order" ("phone");

-- Keep the public PostgREST API closed for control-plane tables.
ALTER TABLE "Node" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated RLS policies are created on purpose.
-- The Next.js control plane accesses PostgreSQL through Prisma using the server-side DATABASE_URL.
