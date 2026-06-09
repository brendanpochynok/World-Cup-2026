-- CreateTable
CREATE TABLE "PoolWin" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "poolName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 1,
    "trophyImage" TEXT,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoolWin_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PoolWin" ADD CONSTRAINT "PoolWin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
