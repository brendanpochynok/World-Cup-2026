-- CreateTable
CREATE TABLE "PoolConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "entryFeePerPlayer" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PoolConfig_pkey" PRIMARY KEY ("id")
);

-- Seed the single config row
INSERT INTO "PoolConfig" ("id", "entryFeePerPlayer") VALUES (1, 0);
