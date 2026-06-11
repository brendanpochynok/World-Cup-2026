-- Add multiple entries support to User, MatchPick, BracketPick

ALTER TABLE "User" ADD COLUMN "entriesCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "User" ADD COLUMN "announcementAckedAt" TIMESTAMP(3);

ALTER TABLE "MatchPick" ADD COLUMN "entry" INTEGER NOT NULL DEFAULT 1;
DROP INDEX "MatchPick_userId_matchId_key";
CREATE UNIQUE INDEX "MatchPick_userId_entry_matchId_key" ON "MatchPick"("userId", "entry", "matchId");

ALTER TABLE "BracketPick" ADD COLUMN "entry" INTEGER NOT NULL DEFAULT 1;
DROP INDEX "BracketPick_userId_round_slot_key";
CREATE UNIQUE INDEX "BracketPick_userId_entry_round_slot_key" ON "BracketPick"("userId", "entry", "round", "slot");
