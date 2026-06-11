-- Track rank snapshots per entry
ALTER TABLE "RankSnapshot" ADD COLUMN "entry" INTEGER NOT NULL DEFAULT 1;
DROP INDEX "RankSnapshot_userId_date_key";
CREATE UNIQUE INDEX "RankSnapshot_userId_entry_date_key" ON "RankSnapshot"("userId", "entry", "date");
